import { join } from "node:path";
import {
  appendChunk,
  createSession,
  type ActionProposal,
  type ActionResult,
  type DesktopBrowserRuntimeState,
  type ResearchSource,
  type SessionSummary,
  type DesktopModelDownloadState,
  type DesktopModelHealthCheck,
  type DesktopRuntimeActionState,
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
import type { BrowserService } from "../browser/browser-service.js";
import { ActionPlanner } from "../planner/action-planner.js";
import type { LlmAdapter } from "../model/llm-adapter.js";
import * as sessionPersistence from "./session-persistence.js";
import type { PersistedSession } from "./session-persistence.js";

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

export interface DesktopRuntimeOptions {
  browserService?: BrowserService;
  getPlannerLlm?: () => LlmAdapter | undefined;
}

export class DesktopRuntime {
  private runtimeState: ModelRuntimeState = "listening";
  private modelStorageRoot = "";
  private connectedAudio = false;
  private session: SessionRun = createSession("desktop_session");
  private downloads: DesktopModelDownloadState[] = [];
  private healthChecks: DesktopModelHealthCheck[] = [];
  private browserService?: BrowserService;
  private getPlannerLlm?: () => LlmAdapter | undefined;
  private currentProposal?: ActionProposal;
  private lastResult?: ActionResult;
  private executionController?: AbortController;
  private listeners = new Set<(snapshot: DesktopUiSnapshot) => void>();

  constructor(options: DesktopRuntimeOptions = {}) {
    this.browserService = options.browserService;
    this.getPlannerLlm = options.getPlannerLlm;
  }

  setPlannerLlm(getLlm: () => LlmAdapter | undefined): void {
    this.getPlannerLlm = getLlm;
  }

  onUpdate(listener: (snapshot: DesktopUiSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

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
      browser: this.getBrowserSnapshot(),
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
    this.executionController?.abort();
    this.browserService?.pause();
    this.appendState("用户暂停 AI 执行");
    this.emit();
    return this.getSnapshot();
  }

  cancelSession(): DesktopUiSnapshot {
    this.runtimeState = "interrupted";
    this.session = { ...this.session, status: "interrupted", updated_at: new Date().toISOString() };
    this.executionController?.abort();
    this.browserService?.close();
    this.currentProposal = undefined;
    this.lastResult = undefined;
    this.appendState("用户取消当前步骤");
    this.emit();
    return this.getSnapshot();
  }

  async bargeIn(heardText?: string): Promise<DesktopUiSnapshot> {
    this.executionController?.abort();
    this.browserService?.close();
    this.currentProposal = undefined;
    this.lastResult = undefined;
    this.runtimeState = "interrupted";
    this.appendState(`语音插话：${heardText ?? ""}`);
    this.emit();
    if (heardText && isResearchIntent(heardText)) {
      return this.startResearch(heardText);
    }
    return this.getSnapshot();
  }

  async startResearch(goal: string): Promise<DesktopUiSnapshot> {
    this.runtimeState = "thinking";
    this.appendState(`开始规划研究任务：${goal}`);
    const llm = this.getPlannerLlm?.();
    if (!llm) {
      this.runtimeState = "interrupted";
      this.currentProposal = undefined;
      this.appendState("没有可用的执行大脑，无法生成动作提案");
      return this.getSnapshot();
    }

    const planner = new ActionPlanner({ llm });
    this.executionController?.abort();
    this.executionController = new AbortController();
    const proposal = await planner.plan(goal, this.executionController.signal);
    this.currentProposal = proposal;
    this.runtimeState = proposal.safety === "blocked" ? "interrupted" : "acting";
    this.appendState(
      `生成提案 ${proposal.proposal_id}，安全等级 ${proposal.safety}，预期结果：${proposal.expected_result}`
    );
    this.emit();
    return this.getSnapshot();
  }

  async executeRuntimeAction(): Promise<DesktopUiSnapshot> {
    if (!this.currentProposal) {
      this.appendState("当前没有待执行的动作提案");
      return this.getSnapshot();
    }
    if (!this.browserService) {
      this.appendState("BrowserService 未初始化，无法执行浏览器动作");
      return this.getSnapshot();
    }

    this.runtimeState = "acting";
    this.executionController?.abort();
    this.executionController = new AbortController();
    const proposal = this.currentProposal;
    this.currentProposal = undefined;
    const results = await this.browserService.execute(proposal, this.executionController.signal);
    this.lastResult = results[results.length - 1];
    this.runtimeState = this.lastResult?.ok ? "thinking" : "interrupted";
    this.appendState(
      `执行结果：${this.lastResult?.ok ? "成功" : "失败"} - ${this.lastResult?.message ?? ""}`
    );
    this.emit();
    return this.getSnapshot();
  }

  async finalizeResearch(): Promise<DesktopUiSnapshot> {
    const sources = this.browserService?.getState().sources ?? [];
    if (sources.length === 0) {
      this.appendState("暂无来源，无法生成结论");
      this.emit();
      return this.getSnapshot();
    }
    this.runtimeState = "thinking";
    this.appendState("正在汇总来源并生成结论");
    this.emit();

    const llm = this.getPlannerLlm?.();
    if (!llm) {
      this.runtimeState = "interrupted";
      this.appendState("没有可用的执行大脑，无法生成结论");
      this.emit();
      return this.getSnapshot();
    }

    const prompt = buildConclusionPrompt(sources);
    const conclusion = await llm.complete(
      [
        { role: "system", content: CONCLUSION_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      this.executionController?.signal
    );

    this.runtimeState = "complete";
    this.session = appendChunk(this.session, {
      id: `chunk-${this.session.chunks.length + 1}`,
      type: "conclusion",
      summary: conclusion,
      payload: { sources: sources.map((s) => s.id) }
    });
    this.appendState("结论已生成");
    this.emit();
    return this.getSnapshot();
  }

  saveSession(): DesktopUiSnapshot {
    const snapshot = this.getSnapshot();
    sessionPersistence.saveSession(snapshot);
    this.runtimeState = "complete";
    this.appendState(`会话已保存：${snapshot.session.id}`);
    this.emit();
    return this.getSnapshot();
  }

  listSessions(): SessionSummary[] {
    return sessionPersistence.listSessions();
  }

  async loadSession(id: string): Promise<DesktopUiSnapshot> {
    const persisted = sessionPersistence.loadSession(id);
    if (!persisted) {
      this.runtimeState = "interrupted";
      this.appendState(`找不到会话：${id}`);
      this.emit();
      return this.getSnapshot();
    }

    this.executionController?.abort();
    this.currentProposal = undefined;
    this.lastResult = undefined;
    this.session = persisted.session;
    this.browserService?.setSources(persisted.sources);
    if (persisted.lastUrl) {
      await this.browserService?.open(persisted.lastUrl);
    } else {
      this.browserService?.close();
    }
    this.runtimeState = "paused";
    this.appendState(`恢复会话：${persisted.title}`);
    this.emit();
    return this.getSnapshot();
  }

  deleteSession(id: string): DesktopUiSnapshot {
    const ok = sessionPersistence.deleteSession(id);
    this.appendState(ok ? `已删除会话：${id}` : `删除会话失败：${id}`);
    this.emit();
    return this.getSnapshot();
  }

  private getBrowserSnapshot(): DesktopBrowserRuntimeState {
    const browser = this.browserService?.getState() ?? {
      url: "",
      title: "",
      nextAction: this.buildNextAction(),
      lastResult: this.lastResult,
      sources: []
    };
    return {
      ...browser,
      nextAction: this.buildNextAction(),
      lastResult: this.lastResult ?? browser.lastResult
    };
  }

  private buildNextAction(): DesktopRuntimeActionState {
    if (!this.currentProposal) {
      return {
        actionType: "",
        targetLabel: "",
        value: "",
        reason: "",
        riskLevel: "safe"
      };
    }
    const first = this.currentProposal.actions[0];
    const type = first ? first.action : "";
    const value = first?.params?.query ?? first?.params?.url ?? "";
    return {
      actionType: type,
      targetLabel: this.currentProposal.expected_result,
      value: String(value),
      reason: `proposal ${this.currentProposal.proposal_id}（confidence ${this.currentProposal.confidence ?? 0}）`,
      riskLevel: this.currentProposal.safety
    };
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

const RESEARCH_INTENT_RE = /查|搜索|搜|研究|调研|打开|找|维基|百科|google|duckduckgo|bing|百度/i;

export function isResearchIntent(text: string): boolean {
  return RESEARCH_INTENT_RE.test(text);
}

const CONCLUSION_SYSTEM_PROMPT = `你是一名严谨的研究助手。请根据用户提供的来源摘录，用中文生成一段带引用标记的研究结论。

要求：
- 结论控制在 200 字以内；
- 关键事实后使用 [1]、[2] 等编号引用来源；
- 只使用提供的来源，不要编造；
- 即使信息不完整，也尝试基于摘录给出简短总结，并在引用处说明信息有限；
- 除非完全没有任何相关信息，否则不要回答「现有来源不足以得出结论」；
- 输出格式示例："太阳系有 8 颗行星[1]，地球是其中之一[1]。"`;

function buildConclusionPrompt(sources: ResearchSource[]): string {
  const body = sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\n摘录：${source.excerpt}`
    )
    .join("\n\n");
  return `当前共有 ${sources.length} 个来源。请只使用编号 [1] 到 [${sources.length}] 的引用，禁止引用不存在的来源。\n\n${body}`;
}
