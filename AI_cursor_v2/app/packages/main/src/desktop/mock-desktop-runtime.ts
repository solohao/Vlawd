import { join } from "node:path";
import {
  appendChunk,
  createSession,
  type DesktopHealthState,
  type DesktopModelDownloadState,
  type DesktopModelHealthCheck,
  type DesktopUiSnapshot,
  type ModelRole,
  type ModelRuntimeState,
  type SessionGraphSnapshot,
  type SessionRun
} from "@ai-cursor-v2/shared";
import {
  createMockDuplexAudioSession,
  mockAudioDevices,
  selectConversationEndpoint
} from "../audio/conversation-endpoint.js";
import {
  bindPresetToWorkflow,
  defaultModelStorageConfig,
  validateModelStorageConfig
} from "../model/dual-role-config.js";

export class MockDesktopRuntime {
  private runtimeState: ModelRuntimeState = "listening";
  private modelStorageRoot = "";
  private connectedAudio = false;
  private session: SessionRun = appendChunk(createSession("desktop_mock_session"), {
    id: "chunk-user-plan",
    type: "user",
    summary: "整理 Q2 市场调研与出差计划",
    payload: { source: "runtime_mock" }
  });

  private readonly downloads: DesktopModelDownloadState[] = [
    {
      role: "duplex_execution_brain",
      label: "Execution Brain",
      provider: "BayLing-Duplex",
      status: "not_selected",
      progress: 0,
      message: "选择模型下载目录后可开始准备执行大脑"
    },
    {
      role: "session_record_engine",
      label: "Record Notebook",
      provider: "Rule JSONL + local lightweight",
      status: "not_selected",
      progress: 0,
      message: "记录引擎将维护 Session chunks 与 compact graph"
    },
    {
      role: "safety_preemption",
      label: "Safety Engine",
      provider: "Local rule engine",
      status: "downloaded",
      progress: 100,
      message: "本地安全抢占规则已锁定"
    }
  ];

  private readonly healthChecks: DesktopModelHealthCheck[] = [
    {
      role: "duplex_execution_brain",
      state: "not_checked",
      endpoint: "ws://127.0.0.1:10001/duplex",
      message: "等待模型下载或本地 server 启动"
    },
    {
      role: "session_record_engine",
      state: "not_checked",
      endpoint: "sqlite://session-record-engine",
      message: "等待记录引擎初始化"
    },
    {
      role: "safety_preemption",
      state: "healthy",
      endpoint: "local-rule-engine://locked",
      lastCheckedAt: new Date().toISOString(),
      message: "硬抢占关键词可用"
    }
  ];

  getSnapshot(): DesktopUiSnapshot {
    const modelStorage = this.modelStorageRoot
      ? {
          ...defaultModelStorageConfig,
          rootDir: this.modelStorageRoot
        }
      : defaultModelStorageConfig;
    const binding = bindPresetToWorkflow("zh-real-time-supervision", "desktop_e2e_mock", modelStorage);
    const route = selectConversationEndpoint(mockAudioDevices, binding.conversationEndpoint);

    return {
      generatedAt: new Date().toISOString(),
      theme: "light",
      runtimeState: this.runtimeState,
      modelBinding: binding,
      modelDownloads: this.downloads.map((download) => ({ ...download })),
      healthChecks: this.healthChecks.map((check) => ({ ...check })),
      audio: {
        devices: mockAudioDevices,
        route,
        sessionEvents: createMockDuplexAudioSession(route),
        connected: this.connectedAudio,
        message: this.connectedAudio ? "耳机/电脑麦克风对话入口已连接" : "等待连接对话入口"
      },
      browser: {
        url: "browser-view://q2-market-plan",
        title: "Q2 市场调研与出差计划",
        nextAction: {
          actionType: "form.fill",
          targetLabel: "预算预估 / 北京调研",
          value: "8,500",
          reason: "依据行程天数 × 城市预算标准补齐草稿表格",
          riskLevel: "safe",
          countdownSeconds: 3
        }
      },
      session: this.session,
      graph: this.createGraph()
    };
  }

  selectModelStorageRoot(rootDir: string): DesktopUiSnapshot {
    this.modelStorageRoot = rootDir;
    const warnings = validateModelStorageConfig({
      ...defaultModelStorageConfig,
      rootDir
    });
    for (const download of this.downloads) {
      if (download.role !== "safety_preemption" && download.status === "not_selected") {
        download.status = "ready_to_download";
        download.localPath = join(rootDir, defaultModelStorageConfig.managedSubdir, download.role);
        download.message = warnings[0] ?? "目录已选择，可以开始下载";
      }
    }
    this.appendState("选择模型下载目录");
    return this.getSnapshot();
  }

  startModelDownload(role: ModelRole): DesktopUiSnapshot {
    const download = this.findDownload(role);
    if (download.status === "not_selected") {
      download.message = "请先选择模型下载目录";
      return this.getSnapshot();
    }
    download.status = "downloaded";
    download.progress = 100;
    download.message = "开发阶段已准备 mock artifact；真实权重下载器将在该接口后接入";
    this.appendState(`${download.label} 下载状态已就绪`);
    return this.getSnapshot();
  }

  runHealthCheck(role: ModelRole): DesktopUiSnapshot {
    const check = this.findHealthCheck(role);
    check.state = "healthy";
    check.lastCheckedAt = new Date().toISOString();
    check.message =
      role === "duplex_execution_brain"
        ? "Mock PCM/WebSocket bridge healthy；等待替换为真实模型 server"
        : "本地记录/安全通道 healthy";
    this.findDownload(role).status = "healthy";
    this.runtimeState = "thinking";
    this.appendState(`${role} 健康检查通过`);
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
    this.appendState("填写预算预估单元格：8,500");
    return this.getSnapshot();
  }

  private findDownload(role: ModelRole): DesktopModelDownloadState {
    const download = this.downloads.find((candidate) => candidate.role === role);
    if (!download) {
      throw new Error(`Unknown model role: ${role}`);
    }
    return download;
  }

  private findHealthCheck(role: ModelRole): DesktopModelHealthCheck {
    const check = this.healthChecks.find((candidate) => candidate.role === role);
    if (!check) {
      throw new Error(`Unknown model role: ${role}`);
    }
    return check;
  }

  private appendState(summary: string): void {
    this.session = appendChunk(this.session, {
      id: `chunk-${this.session.chunks.length + 1}`,
      type: "state",
      summary,
      payload: { runtimeState: this.runtimeState }
    });
  }

  private createGraph(): SessionGraphSnapshot {
    return {
      session_id: this.session.id,
      current_node_id: "fill-budget",
      nodes: [
        {
          id: "user-plan",
          label: "用户指令：整理 Q2 调研计划",
          type: "user_instruction",
          status: "completed",
          branch_id: "main"
        },
        {
          id: "ai-plan",
          label: "AI 计划：补齐城市/预算/日程",
          type: "ai_plan",
          status: "completed",
          branch_id: "main"
        },
        {
          id: "budget-correction",
          label: "用户纠正：预算标准调整",
          type: "correction",
          status: "merged",
          branch_id: "correction-budget"
        },
        {
          id: "merge-budget",
          label: "合并：预算规则更新完成",
          type: "merge",
          status: "merged",
          branch_id: "main"
        },
        {
          id: "fill-budget",
          label: "当前：填写预算预估",
          type: "action",
          status: this.runtimeState === "paused" ? "waiting_confirmation" : "active",
          branch_id: "main"
        }
      ],
      edges: [
        { from: "user-plan", to: "ai-plan", relation: "next" },
        { from: "ai-plan", to: "budget-correction", relation: "fork" },
        { from: "budget-correction", to: "merge-budget", relation: "merge" },
        { from: "merge-budget", to: "fill-budget", relation: "next" }
      ]
    };
  }
}
