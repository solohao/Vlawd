import { join } from "node:path";
import type {
  EnvironmentProbe,
  ModelBackendState,
  ModelCatalogItem,
  ModelCenterSnapshot,
  ModelPullProgress,
  ModelStorageConfig,
  OllamaModelInfo
} from "@ai-cursor-v2/shared";
import type { DuplexConversationRuntime } from "../runtime/duplex-runtime.js";
import { defaultModelStorageConfig, validateModelStorageConfig } from "./dual-role-config.js";
import { probeEnvironment } from "./environment-probe.js";
import { OllamaBackend } from "./ollama-backend.js";
import { ollamaModelCatalog } from "./ollama-catalog.js";
import { createProvider } from "./provider-registry.js";

export type ModelCenterListener = (snapshot: ModelCenterSnapshot) => void;

export interface ModelCenterServiceOptions {
  runtime: DuplexConversationRuntime;
  backend?: OllamaBackend;
}

/**
 * 模型中心主进程编排器。
 *
 * 拥有：模型存储配置、环境探测缓存、Ollama 后端状态、当前 pull 进度、以及"设为执行大脑"
 * 时对会话运行时 Provider 的重建。所有 Ollama 命令细节封装在 OllamaBackend 内，
 * 不散落到 IPC 或 React 页面。语音全双工后端（VoiceServerBackend）作为后续实现留位。
 */
export class ModelCenterService {
  private readonly runtime: DuplexConversationRuntime;
  private readonly backend: OllamaBackend;
  private readonly listeners = new Set<ModelCenterListener>();

  private storage: ModelStorageConfig = { ...defaultModelStorageConfig, rootDir: "" };
  private environment: EnvironmentProbe | null = null;
  private backendState: ModelBackendState;
  private activePull: ModelPullProgress | null = null;
  private pullController: AbortController | null = null;
  private activeBrainModel = "";

  constructor(options: ModelCenterServiceOptions) {
    this.runtime = options.runtime;
    this.backend = options.backend ?? new OllamaBackend();
    this.backendState = this.emptyBackendState("尚未检测本地 Ollama。");
  }

  on(listener: ModelCenterListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): ModelCenterSnapshot {
    const convo = this.runtime.getSnapshot();
    return {
      generatedAt: new Date().toISOString(),
      environment: this.environment,
      backend: this.backendState,
      storage: this.storage,
      storageWarnings: this.storage.rootDir.trim() ? validateModelStorageConfig(this.storage) : [],
      activePull: this.activePull,
      catalog: this.buildCatalog(),
      activeProviderKind: convo.activeProviderKind,
      activeBrainModel: this.activeBrainModel,
      providerConnected: convo.providerConnected,
      usingRealInference: convo.usingRealInference
    };
  }

  async probe(): Promise<ModelCenterSnapshot> {
    this.environment = await probeEnvironment(this.modelsDir());
    return this.publish();
  }

  async refreshBackend(): Promise<ModelCenterSnapshot> {
    const result = await this.backend.detect();
    const message =
      result.status === "running"
        ? `Ollama 运行中（v${result.version}），已安装 ${result.installedModels.length} 个模型。`
        : result.status === "installed_not_running"
          ? "已安装 Ollama 但未运行，选择下载目录后可由本 App 启动。"
          : "未检测到 Ollama，请先安装。";
    this.backendState = {
      backend: "ollama",
      status: result.status,
      version: result.version,
      endpoint: this.backend.baseUrl,
      openaiEndpoint: this.backend.openaiEndpoint,
      modelsDir: this.modelsDir(),
      managedByApp: this.backendState.managedByApp,
      installedModels: result.installedModels,
      installGuidanceUrl: this.backend.installGuidanceUrl,
      message,
      checkedAt: new Date().toISOString()
    };
    return this.publish();
  }

  async setStorageRoot(rootDir: string): Promise<ModelCenterSnapshot> {
    this.storage = { ...this.storage, rootDir, source: "user-selected" };
    // 选目录后若 Ollama 已安装但未运行，尝试用该目录启动，使 OLLAMA_MODELS 生效。
    if (this.backendState.status !== "running") {
      const started = await this.backend.ensureServing(this.modelsDir());
      if (started) {
        this.backendState = { ...this.backendState, managedByApp: true };
      }
    }
    await this.probe();
    return this.refreshBackend();
  }

  async pull(model: string): Promise<ModelCenterSnapshot> {
    if (this.pullController) {
      throw new Error("已有下载任务进行中，请先等待或取消。");
    }
    // 确保后端可用；未运行则尝试用当前目录启动。
    if (this.backendState.status !== "running") {
      const started = await this.backend.ensureServing(this.modelsDir());
      if (started) {
        this.backendState = { ...this.backendState, managedByApp: true };
      }
      await this.refreshBackend();
      if (this.backendState.status !== "running") {
        throw new Error("Ollama 未运行，无法下载。请先安装并启动 Ollama。");
      }
    }

    const controller = new AbortController();
    this.pullController = controller;
    this.activePull = {
      model,
      phase: "resolving",
      status: "准备下载",
      completedBytes: 0,
      totalBytes: 0,
      percent: 0,
      updatedAt: new Date().toISOString()
    };
    this.publish();

    try {
      const final = await this.backend.pull(
        model,
        (progress) => {
          this.activePull = progress;
          this.publish();
        },
        controller.signal
      );
      this.activePull = final;
    } catch (error) {
      if (controller.signal.aborted) {
        this.activePull = this.activePull
          ? { ...this.activePull, phase: "cancelled", status: "已取消", updatedAt: new Date().toISOString() }
          : null;
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.activePull = {
          model,
          phase: "error",
          status: message,
          completedBytes: 0,
          totalBytes: 0,
          percent: 0,
          message,
          updatedAt: new Date().toISOString()
        };
      }
    } finally {
      this.pullController = null;
    }
    return this.refreshBackend();
  }

  cancelPull(): ModelCenterSnapshot {
    this.pullController?.abort();
    return this.getSnapshot();
  }

  async removeModel(model: string): Promise<ModelCenterSnapshot> {
    await this.backend.remove(model);
    if (this.activeBrainModel === model) {
      this.activeBrainModel = "";
    }
    return this.refreshBackend();
  }

  /**
   * 设为执行大脑：用选定的已下载模型重建方案 B 管线 Provider，切到热路径并做健康检查。
   */
  async useModelAsBrain(model: string): Promise<ModelCenterSnapshot> {
    const provider = createProvider({
      kind: "pipeline",
      endpoint: this.backend.openaiEndpoint,
      device: this.environment?.gpus.length ? "cuda" : "cpu",
      pipeline: {
        llmBaseUrl: this.backend.openaiEndpoint,
        llmModel: model
      }
    });
    this.runtime.registerProvider(provider);
    await this.runtime.setActiveProvider("pipeline");
    this.activeBrainModel = model;
    return this.publish();
  }

  getInstallGuidanceUrl(): string {
    return this.backend.installGuidanceUrl;
  }

  getModelsDir(): string | undefined {
    return this.modelsDir();
  }

  private modelsDir(): string | undefined {
    if (!this.storage.rootDir.trim()) {
      return undefined;
    }
    return join(this.storage.rootDir, this.storage.managedSubdir, "ollama");
  }

  private buildCatalog(): ModelCatalogItem[] {
    const installed = new Set(this.backendState.installedModels.map((m) => m.name));
    const recommended = this.environment?.recommendedBrainModel;
    return ollamaModelCatalog.map((entry) => ({
      ...entry,
      installed: installed.has(entry.id),
      active: this.activeBrainModel === entry.id,
      recommended: entry.id === recommended
    }));
  }

  private emptyBackendState(message: string): ModelBackendState {
    return {
      backend: "ollama",
      status: "unknown",
      endpoint: this.backend.baseUrl,
      openaiEndpoint: this.backend.openaiEndpoint,
      managedByApp: false,
      installedModels: [],
      installGuidanceUrl: this.backend.installGuidanceUrl,
      message,
      checkedAt: new Date().toISOString()
    };
  }

  private publish(): ModelCenterSnapshot {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
    return snapshot;
  }
}

export type { OllamaModelInfo };
