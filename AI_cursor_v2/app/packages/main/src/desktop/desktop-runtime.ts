import { join } from "node:path";
import {
  appendChunk,
  createSession,
  type DesktopModelDownloadState,
  type DesktopModelHealthCheck,
  type DesktopUiSnapshot,
  type ModelRole,
  type ModelRuntimeState,
  type SessionGraphSnapshot,
  type SessionRun
} from "@ai-cursor-v2/shared";
import {
  bindPresetToWorkflow,
  defaultModelStorageConfig,
  validateModelStorageConfig
} from "../model/dual-role-config.js";

const emptyGraph: SessionGraphSnapshot = {
  session_id: "",
  current_node_id: "",
  nodes: [],
  edges: []
};

const emptyRoute = {
  config: {
    mode: "headset-preferred" as const,
    input: { deviceId: "", label: "" },
    output: { deviceId: "", label: "" },
    preferBluetoothHandsFree: true,
    allowComputerMicFallback: true
  },
  warnings: ["尚未检测到真实音频设备；连接音频后将使用系统枚举设备。"],
  safetyPreemptionEnabled: true as const
};

export class DesktopRuntime {
  private runtimeState: ModelRuntimeState = "listening";
  private modelStorageRoot = "";
  private connectedAudio = false;
  private session: SessionRun = createSession("desktop_session");
  private downloads: DesktopModelDownloadState[] = [];
  private healthChecks: DesktopModelHealthCheck[] = [];

  getSnapshot(): DesktopUiSnapshot {
    const modelStorage = this.modelStorageRoot
      ? { ...defaultModelStorageConfig, rootDir: this.modelStorageRoot }
      : defaultModelStorageConfig;
    const binding = bindPresetToWorkflow("zh-real-time-supervision", "desktop", modelStorage);

    return {
      generatedAt: new Date().toISOString(),
      theme: "light",
      runtimeState: this.runtimeState,
      modelBinding: binding,
      modelDownloads: this.downloads.map((download) => ({ ...download })),
      healthChecks: this.healthChecks.map((check) => ({ ...check })),
      audio: {
        devices: [],
        route: emptyRoute,
        sessionEvents: [],
        connected: this.connectedAudio,
        message: this.connectedAudio ? "对话入口已连接（等待真实音频流）" : "等待连接真实音频设备"
      },
      browser: {
        url: "",
        title: "",
        nextAction: {
          actionType: "",
          targetLabel: "",
          value: "",
          reason: "",
          riskLevel: "safe"
        }
      },
      session: this.session,
      graph: emptyGraph
    };
  }

  selectModelStorageRoot(rootDir: string): DesktopUiSnapshot {
    this.modelStorageRoot = rootDir;
    const warnings = validateModelStorageConfig({ ...defaultModelStorageConfig, rootDir });
    this.appendState(`选择模型下载目录：${rootDir}`);
    return this.getSnapshot();
  }

  startModelDownload(role: ModelRole): DesktopUiSnapshot {
    let download = this.downloads.find((candidate) => candidate.role === role);
    if (!download) {
      download = {
        role,
        label: role,
        provider: "待配置",
        status: "not_selected",
        progress: 0,
        message: "真实模型下载器尚未接入"
      };
      this.downloads.push(download);
    }
    if (download.status === "not_selected" && !this.modelStorageRoot) {
      download.message = "请先选择模型下载目录";
      return this.getSnapshot();
    }
    download.status = "downloaded";
    download.progress = 100;
    download.localPath = this.modelStorageRoot
      ? join(this.modelStorageRoot, defaultModelStorageConfig.managedSubdir, role)
      : "";
    download.message = "已触发下载占位（真实权重下载器待接入）";
    this.appendState(`${download.label} 下载占位完成`);
    return this.getSnapshot();
  }

  runHealthCheck(role: ModelRole): DesktopUiSnapshot {
    let check = this.healthChecks.find((candidate) => candidate.role === role);
    if (!check) {
      check = {
        role,
        state: "not_checked",
        endpoint: "",
        message: "真实健康检查器尚未接入"
      };
      this.healthChecks.push(check);
    }
    check.state = "healthy";
    check.lastCheckedAt = new Date().toISOString();
    check.message = "已触发健康检查占位（真实检查器待接入）";
    this.runtimeState = "thinking";
    this.appendState(`${role} 健康检查占位完成`);
    return this.getSnapshot();
  }

  connectAudio(): DesktopUiSnapshot {
    this.connectedAudio = true;
    this.runtimeState = "listening";
    this.appendState("连接对话入口");
    return this.getSnapshot();
  }

  pauseSession(): DesktopUiSnapshot {
    this.runtimeState = "paused";
    this.session = { ...this.session, status: "paused", updated_at: new Date().toISOString() };
    this.appendState("用户暂停 AI 执行");
    return this.getSnapshot();
  }

  cancelSession(): DesktopUiSnapshot {
    this.runtimeState = "interrupted";
    this.session = { ...this.session, status: "interrupted", updated_at: new Date().toISOString() };
    this.appendState("用户取消当前步骤");
    return this.getSnapshot();
  }

  executeRuntimeAction(): DesktopUiSnapshot {
    this.runtimeState = "acting";
    this.appendState("用户执行运行时动作");
    return this.getSnapshot();
  }

  private appendState(summary: string): void {
    this.session = appendChunk(this.session, {
      id: `chunk-${this.session.chunks.length + 1}`,
      type: "state",
      summary,
      payload: { runtimeState: this.runtimeState }
    });
  }
}
