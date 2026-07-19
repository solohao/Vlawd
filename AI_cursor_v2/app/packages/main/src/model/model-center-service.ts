import { join } from "node:path";
import type {
  CustomEndpointConfig,
  EnvironmentProbe,
  ModelBackendKind,
  ModelBackendState,
  ModelCatalogItem,
  ModelCenterSnapshot,
  ModelPullProgress,
  ModelStorageConfig,
  OllamaInstallState,
  OllamaModelInfo
} from "@ai-cursor-v2/shared";
import type { DuplexConversationRuntime } from "../runtime/duplex-runtime.js";
import { CustomEndpointBackend } from "./custom-backend.js";
import { defaultModelStorageConfig, validateModelStorageConfig } from "./dual-role-config.js";
import { probeEnvironment } from "./environment-probe.js";
import { LMStudioBackend } from "./lmstudio-backend.js";
import type { BackendDetectResult, ModelBackend } from "./model-backend.js";
import { OllamaBackend } from "./ollama-backend.js";
import { ollamaModelCatalog } from "./ollama-catalog.js";
import { createProvider } from "./provider-registry.js";

export type ModelCenterListener = (snapshot: ModelCenterSnapshot) => void;

export interface ModelCenterServiceOptions {
  runtime: DuplexConversationRuntime;
  backend?: OllamaBackend;
}

const BACKEND_ORDER: ModelBackendKind[] = ["ollama", "lmstudio", "custom"];
const DEFAULT_CUSTOM_ENDPOINT: CustomEndpointConfig = { baseUrl: "", model: "" };

/**
 * 模型中心主进程编排器。
 *
 * 拥有：模型存储配置、环境探测缓存、多个后端（Ollama / LM Studio / 自定义端点）的状态、
 * 当前 pull 进度、以及"设为执行大脑"时对会话运行时 Provider 的重建。
 * 各后端命令细节封装在各自 Backend 内，不散落到 IPC 或 React 页面。
 * 语音全双工后端（VoiceServerBackend）作为后续实现留位。
 */
export class ModelCenterService {
  private readonly runtime: DuplexConversationRuntime;
  private readonly ollama: OllamaBackend;
  private readonly lmstudio: LMStudioBackend;
  private readonly custom: CustomEndpointBackend;
  private readonly backends: Record<ModelBackendKind, ModelBackend>;
  private readonly listeners = new Set<ModelCenterListener>();

  private storage: ModelStorageConfig = { ...defaultModelStorageConfig, rootDir: "" };
  private environment: EnvironmentProbe | null = null;
  private activeBackend: ModelBackendKind = "ollama";
  private customEndpoint: CustomEndpointConfig = { ...DEFAULT_CUSTOM_ENDPOINT };
  private backendStates: Record<ModelBackendKind, ModelBackendState>;
  private ollamaManagedByApp = false;
  private activePull: ModelPullProgress | null = null;
  private pullController: AbortController | null = null;
  private activeBrainModel = "";
  private ollamaInstall: OllamaInstallState = {
    supported: process.platform === "win32",
    installed: false,
    installerFound: false,
    phase: "idle",
    updatedAt: new Date().toISOString()
  };

  constructor(options: ModelCenterServiceOptions) {
    this.runtime = options.runtime;
    this.ollama = options.backend ?? new OllamaBackend();
    this.lmstudio = new LMStudioBackend();
    this.custom = new CustomEndpointBackend(this.customEndpoint);
    this.backends = { ollama: this.ollama, lmstudio: this.lmstudio, custom: this.custom };
    this.backendStates = {
      ollama: this.emptyState("ollama", "尚未检测本地 Ollama。"),
      lmstudio: this.emptyState("lmstudio", "尚未检测 LM Studio 本地服务器。"),
      custom: this.emptyState("custom", "尚未配置自定义端点。")
    };
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
      ollamaInstall: this.ollamaInstall,
      backend: this.backendStates[this.activeBackend],
      activeBackend: this.activeBackend,
      backends: BACKEND_ORDER.map((kind) => this.backendStates[kind]),
      customEndpoint: this.customEndpoint,
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

  /** 检测全部后端的实时状态。 */
  async refreshBackend(): Promise<ModelCenterSnapshot> {
    await Promise.all(BACKEND_ORDER.map((kind) => this.detectBackend(kind)));
    return this.publish();
  }

  /** 切换当前激活的后端；切换后重新检测该后端。 */
  async setBackend(kind: ModelBackendKind): Promise<ModelCenterSnapshot> {
    this.activeBackend = kind;
    await this.detectBackend(kind);
    return this.publish();
  }

  /** 配置并检测自定义 OpenAI 兼容端点。 */
  async setCustomEndpoint(config: CustomEndpointConfig): Promise<ModelCenterSnapshot> {
    this.customEndpoint = { baseUrl: config.baseUrl.trim(), model: config.model.trim() };
    this.custom.configure(this.customEndpoint);
    await this.detectBackend("custom");
    return this.publish();
  }

  private async detectBackend(kind: ModelBackendKind): Promise<void> {
    const backend = this.backends[kind];
    const result: BackendDetectResult = await backend.detect().catch((error) => ({
      status: "not_installed" as const,
      version: undefined,
      installedModels: [] as OllamaModelInfo[],
      message: error instanceof Error ? error.message : String(error)
    }));
    this.backendStates[kind] = {
      backend: kind,
      status: result.status,
      supportsPull: backend.supportsPull,
      version: result.version,
      endpoint: backend.baseUrl,
      openaiEndpoint: backend.openaiEndpoint,
      modelsDir: kind === "ollama" ? this.modelsDir() : undefined,
      managedByApp: kind === "ollama" ? this.ollamaManagedByApp : false,
      installedModels: result.installedModels,
      installGuidanceUrl: backend.installGuidanceUrl,
      message: result.message,
      checkedAt: new Date().toISOString()
    };
  }

  async setStorageRoot(rootDir: string): Promise<ModelCenterSnapshot> {
    this.storage = { ...this.storage, rootDir, source: "user-selected" };
    // 选目录后若 Ollama 已安装但未运行，尝试用该目录启动，使 OLLAMA_MODELS 生效。
    if (this.backendStates.ollama.status !== "running") {
      const started = await this.ollama.ensureServing(this.modelsDir());
      if (started) {
        this.ollamaManagedByApp = true;
      }
    }
    await this.probe();
    return this.refreshBackend();
  }

  /**
   * 检测代管安装 Ollama 的当前状态：是否已安装、本机是否已有安装器。
   * 单入口自动分支的第一步，UI 依据结果决定展示"直接可用 / 选盘安装 / 指定安装器"。
   */
  async detectOllamaInstaller(): Promise<ModelCenterSnapshot> {
    this.setInstallState({ phase: "detecting", message: "正在检测 Ollama 与本机安装器…" });
    const supported = process.platform === "win32";
    const installed = await this.ollama.binaryInstalled();
    const extra = this.storage.rootDir.trim() ? [this.storage.rootDir] : [];
    const found = supported && !installed ? this.ollama.findInstaller(extra) : null;
    const installerPath = found ?? this.ollamaInstall.installerPath;
    this.setInstallState({
      supported,
      installed,
      installerFound: !!installerPath,
      installerPath,
      phase: installed ? "installed" : "idle",
      message: installed
        ? "已检测到 Ollama，可直接使用。"
        : !supported
          ? "当前系统不支持代管安装，请前往官网手动安装。"
          : installerPath
            ? `已找到安装器：${installerPath}`
            : "未找到已下载的安装器，可手动指定或前往官网下载。"
    });
    return this.refreshBackend();
  }

  /** 记录用户手动指定的安装器路径。 */
  setInstallerPath(installerPath: string): ModelCenterSnapshot {
    this.setInstallState({
      installerPath,
      installerFound: true,
      phase: "idle",
      message: `已选择安装器：${installerPath}`
    });
    return this.getSnapshot();
  }

  /**
   * 一键安装：用本机已有（或用户指定）的安装器，把 Ollama 静默安装到 `installDir`。
   * 装完自动检测后端，并在配置了模型目录时尝试用 `OLLAMA_MODELS` 启动。
   */
  async installOllama(installDir?: string): Promise<ModelCenterSnapshot> {
    if (process.platform !== "win32") {
      this.setInstallState({ phase: "error", message: "代管安装当前仅支持 Windows。" });
      return this.getSnapshot();
    }
    if (await this.ollama.binaryInstalled()) {
      this.setInstallState({ installed: true, phase: "installed", message: "Ollama 已安装，无需重复安装。" });
      return this.refreshBackend();
    }
    const extra = this.storage.rootDir.trim() ? [this.storage.rootDir] : [];
    const installerPath = this.ollamaInstall.installerPath ?? this.ollama.findInstaller(extra);
    if (!installerPath) {
      this.setInstallState({
        installerFound: false,
        phase: "error",
        message: "未找到 Ollama 安装器，请先指定安装器文件或前往官网下载。"
      });
      return this.getSnapshot();
    }
    this.setInstallState({
      installerPath,
      installerFound: true,
      installDir,
      phase: "installing",
      message: installDir ? `正在静默安装到 ${installDir}…` : "正在静默安装（默认目录）…"
    });
    try {
      await this.ollama.installSilently(installerPath, installDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setInstallState({ phase: "error", message: `安装失败：${message}` });
      return this.getSnapshot();
    }
    this.setInstallState({
      installed: true,
      installDir,
      phase: "installed",
      message: installDir ? `已安装到 ${installDir}。` : "安装完成。"
    });
    // 装完尝试用当前模型目录启动，使 OLLAMA_MODELS 生效。
    const started = await this.ollama.ensureServing(this.modelsDir());
    if (started) {
      this.ollamaManagedByApp = true;
    }
    return this.refreshBackend();
  }

  private setInstallState(patch: Partial<OllamaInstallState>): void {
    this.ollamaInstall = { ...this.ollamaInstall, ...patch, updatedAt: new Date().toISOString() };
    this.publish();
  }

  async pull(model: string): Promise<ModelCenterSnapshot> {
    if (this.activeBackend !== "ollama") {
      throw new Error(
        this.activeBackend === "lmstudio"
          ? "LM Studio 的模型请在 LM Studio 应用内下载/加载；本 App 只负责连接。"
          : "自定义端点的模型由该服务自行管理，本 App 只负责连接。"
      );
    }
    if (this.pullController) {
      throw new Error("已有下载任务进行中，请先等待或取消。");
    }
    // 确保后端可用；未运行则尝试用当前目录启动。
    if (this.backendStates.ollama.status !== "running") {
      const started = await this.ollama.ensureServing(this.modelsDir());
      if (started) {
        this.ollamaManagedByApp = true;
      }
      await this.detectBackend("ollama");
      if (!this.isRunning("ollama")) {
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
      const final = await this.ollama.pull(
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
    if (this.activeBackend !== "ollama") {
      throw new Error("只有 Ollama 后端支持在本 App 内删除模型。");
    }
    await this.ollama.remove(model);
    if (this.activeBrainModel === model) {
      this.activeBrainModel = "";
    }
    return this.refreshBackend();
  }

  /**
   * 设为执行大脑：用选定模型 + 当前激活后端的 OpenAI 端点重建方案 B 管线 Provider，
   * 切到热路径并做健康检查。三个后端共用同一套推理流，不重复造。
   */
  async useModelAsBrain(model: string): Promise<ModelCenterSnapshot> {
    const backend = this.backends[this.activeBackend];
    const provider = createProvider({
      kind: "pipeline",
      endpoint: backend.openaiEndpoint,
      device: this.environment?.gpus.length ? "cuda" : "cpu",
      pipeline: {
        llmBaseUrl: backend.openaiEndpoint,
        llmModel: model
      }
    });
    this.runtime.registerProvider(provider);
    await this.runtime.setActiveProvider("pipeline");
    this.activeBrainModel = model;
    return this.publish();
  }

  getInstallGuidanceUrl(): string {
    return this.backends[this.activeBackend].installGuidanceUrl;
  }

  getModelsDir(): string | undefined {
    return this.modelsDir();
  }

  private isRunning(kind: ModelBackendKind): boolean {
    return this.backendStates[kind].status === "running";
  }

  private modelsDir(): string | undefined {
    if (!this.storage.rootDir.trim()) {
      return undefined;
    }
    return join(this.storage.rootDir, this.storage.managedSubdir, "ollama");
  }

  private buildCatalog(): ModelCatalogItem[] {
    // 内置推荐目录仅对 Ollama 有意义；其余后端由 installedModels 驱动 UI。
    const installed = new Set(this.backendStates.ollama.installedModels.map((m) => m.name));
    const recommended = this.environment?.recommendedBrainModel;
    return ollamaModelCatalog.map((entry) => ({
      ...entry,
      installed: installed.has(entry.id),
      active: this.activeBrainModel === entry.id,
      recommended: entry.id === recommended
    }));
  }

  private emptyState(kind: ModelBackendKind, message: string): ModelBackendState {
    const backend = this.backends?.[kind] ?? this.resolveBackendForInit(kind);
    return {
      backend: kind,
      status: "unknown",
      supportsPull: backend.supportsPull,
      endpoint: backend.baseUrl,
      openaiEndpoint: backend.openaiEndpoint,
      managedByApp: false,
      installedModels: [],
      installGuidanceUrl: backend.installGuidanceUrl,
      message,
      checkedAt: new Date().toISOString()
    };
  }

  private resolveBackendForInit(kind: ModelBackendKind): ModelBackend {
    if (kind === "ollama") {
      return this.ollama;
    }
    if (kind === "lmstudio") {
      return this.lmstudio;
    }
    return this.custom;
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
