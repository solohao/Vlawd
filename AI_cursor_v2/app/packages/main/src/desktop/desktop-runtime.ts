import { join } from "node:path";
import {
  appendChunk,
  createSession,
  type ActionProposal,
  type ActionResult,
  type DesktopBrowserRuntimeState,
  type DesktopModelDownloadState,
  type DesktopModelHealthCheck,
  type DesktopRuntimeActionState,
  type DesktopUiSnapshot,
  type EvidenceSummary,
  type ModelRole,
  type ModelRuntimeState,
  type ResearchSource,
  type ResumeAnchor,
  type SessionGraphSnapshot,
  type SessionLineage,
  type SessionPayload,
  type SessionRun,
  type SessionStatus,
  type SessionSummary,
  type TaskPlan
} from "@ai-cursor-v2/shared";
import {
  bindPresetToWorkflow,
  defaultModelStorageConfig,
  validateModelStorageConfig
} from "../model/dual-role-config.js";
import type { BrowserService } from "../browser/browser-service.js";
import { TaskPlanner, proposalFromPlan } from "./task-planner.js";
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
  private session: SessionRun = createSession(`session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  private downloads: DesktopModelDownloadState[] = [];
  private healthChecks: DesktopModelHealthCheck[] = [];
  private browserService?: BrowserService;
  private getPlannerLlm?: () => LlmAdapter | undefined;
  private taskPlanner?: TaskPlanner;
  private currentProposal?: ActionProposal;
  private currentPlan?: TaskPlan;
  private lastResult?: ActionResult;
  private executionController?: AbortController;
  private listeners = new Set<(snapshot: DesktopUiSnapshot) => void>();

  constructor(options: DesktopRuntimeOptions = {}) {
    this.browserService = options.browserService;
    this.getPlannerLlm = options.getPlannerLlm;
  }

  setPlannerLlm(getLlm: () => LlmAdapter | undefined): void {
    this.getPlannerLlm = getLlm;
    const llm = getLlm();
    if (llm) {
      this.taskPlanner = new TaskPlanner({ llm });
    }
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
    this.session = this.withStatus("paused");
    this.executionController?.abort();
    this.browserService?.pause();
    this.appendState("用户暂停 AI 执行");
    this.emit();
    return this.getSnapshot();
  }

  cancelSession(): DesktopUiSnapshot {
    this.runtimeState = "interrupted";
    this.session = this.withStatus("interrupted");
    this.executionController?.abort();
    this.browserService?.close();
    this.currentProposal = undefined;
    this.currentPlan = undefined;
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
      // 在开启新研究前保存并 fork 当前 Session
      this.forkCurrentSession(heardText);
      return this.startResearch(heardText);
    }
    return this.getSnapshot();
  }

  async startResearch(goal: string): Promise<DesktopUiSnapshot> {
    this.runtimeState = "thinking";

    // 如果当前 Session 已有研究目标或来源，fork 出一个新分支继续，旧分支保留
    const hasSources = this.browserService ? this.browserService.getState().sources.length > 0 : false;
    if (this.session.payload?.goal || hasSources) {
      this.forkCurrentSession(goal);
    }

    this.setPayload({ goal });
    this.appendState(`开始规划研究任务：${goal}`);
    this.emit();

    const llm = this.getPlannerLlm?.();
    if (!llm) {
      this.runtimeState = "interrupted";
      this.currentProposal = undefined;
      this.currentPlan = undefined;
      this.appendState("没有可用的执行大脑，无法生成动作提案");
      this.emit();
      return this.getSnapshot();
    }

    if (!this.taskPlanner) {
      this.taskPlanner = new TaskPlanner({ llm });
    }

    this.executionController?.abort();
    this.executionController = new AbortController();
    const plan = await this.taskPlanner.plan(goal, this.executionController.signal);
    this.currentPlan = plan;
    this.setPayload({ plan });
    this.appendTodoChunk(plan);

    const proposal = proposalFromPlan(plan);
    this.currentProposal = proposal;
    this.runtimeState = proposal && proposal.safety !== "blocked" ? "acting" : "interrupted";
    this.appendState(
      `生成任务计划 ${plan.steps.length} 步；下一步：${proposal?.expected_result ?? "无可用步骤"}`
    );
    this.emit();
    return this.getSnapshot();
  }

  async executeRuntimeAction(): Promise<DesktopUiSnapshot> {
    if (!this.currentProposal) {
      this.appendState("当前没有待执行的动作提案");
      this.emit();
      return this.getSnapshot();
    }
    if (!this.browserService) {
      this.appendState("BrowserService 未初始化，无法执行浏览器动作");
      this.emit();
      return this.getSnapshot();
    }

    this.runtimeState = "acting";
    this.executionController?.abort();
    this.executionController = new AbortController();
    const proposal = this.currentProposal;
    this.currentProposal = undefined;
    const results = await this.browserService.execute(proposal, this.executionController.signal);
    this.lastResult = results[results.length - 1];

    // 推进任务计划
    this.advancePlan(proposal, this.lastResult?.ok ?? false);

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
    const raw = await llm.complete(
      [
        { role: "system", content: CONCLUSION_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      this.executionController?.signal
    );

    const parsed = parseConclusionJson(raw);
    const conclusion = parsed.conclusion || raw;
    const unresolved = parsed.unresolved_questions ?? [];

    this.runtimeState = "complete";
    this.session = appendChunk(this.session, {
      id: `chunk-${this.session.chunks.length + 1}`,
      type: "conclusion",
      summary: conclusion,
      payload: { sources: sources.map((s) => s.id) }
    });
    this.session = appendChunk(this.session, {
      id: `chunk-${this.session.chunks.length + 1}`,
      type: "evidence",
      summary: `Evidence Summary: ${sources.length} 个来源，${unresolved.length} 个未解决问题`,
      payload: { unresolved_questions: unresolved }
    });

    this.setPayload({
      evidence: this.buildEvidenceSummary(conclusion, unresolved),
      recovery: this.buildRecoveryAnchor(sources)
    });

    this.appendState("结论已生成");
    this.emit();
    return this.getSnapshot();
  }

  saveSession(): DesktopUiSnapshot {
    const snapshot = this.getSnapshot();
    const evidence = this.session.payload?.evidence ?? this.buildEvidenceSummaryFromSnapshot(snapshot);
    const recovery = this.session.payload?.recovery ?? this.buildRecoveryAnchor(snapshot.browser.sources);
    const plan = this.session.payload?.plan;
    sessionPersistence.saveSession(snapshot, { evidence, recovery, plan });
    this.runtimeState = "paused";
    this.session = this.withStatus("paused");
    this.appendState(`会话已保存：${this.session.id}`);
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
    this.currentPlan = undefined;
    this.lastResult = undefined;
    this.session = {
      ...persisted.session,
      payload: {
        ...(persisted.session.payload || {}),
        evidence: persisted.evidenceSummary ?? persisted.session.payload?.evidence,
        recovery: persisted.recovery ?? persisted.session.payload?.recovery,
        plan: persisted.plan ?? persisted.session.payload?.plan
      }
    };
    this.browserService?.setSources(persisted.sources);
    if (persisted.lastUrl) {
      await this.browserService?.open(persisted.lastUrl);
    } else {
      this.browserService?.close();
    }
    this.runtimeState = "paused";
    this.appendState(`恢复会话：${persisted.title}`);

    // 重新验证页面：若标题或关键摘录已变，提示并生成搜索提案
    await this.revalidateSession(persisted);
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
    const value = first?.params?.query ?? first?.params?.url ?? first?.params?.text ?? "";
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

  private appendTodoChunk(plan: TaskPlan): void {
    this.session = appendChunk(this.session, {
      id: `chunk-${this.session.chunks.length + 1}`,
      type: "todo",
      summary: `任务计划：${plan.goal}（${plan.steps.length} 步）`,
      payload: { plan }
    });
  }

  private withStatus(status: SessionStatus): SessionRun {
    return { ...this.session, status, updated_at: new Date().toISOString() };
  }

  private setPayload(patch: Partial<SessionPayload>): void {
    this.session = {
      ...this.session,
      payload: { ...this.session.payload, ...patch },
      updated_at: new Date().toISOString()
    };
  }

  private forkCurrentSession(reason: string): void {
    // 先保存当前会话，保留旧分支
    const snapshot = this.getSnapshot();
    sessionPersistence.saveSession(snapshot, {
      evidence: this.session.payload?.evidence ?? this.buildEvidenceSummaryFromSnapshot(snapshot),
      recovery: this.session.payload?.recovery ?? this.buildRecoveryAnchor(snapshot.browser.sources),
      plan: this.session.payload?.plan
    });

    const oldId = this.session.id;
    const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newSession = createSession(newId, oldId);
    const lineage: SessionLineage = {
      parent_id: oldId,
      fork_from: oldId,
      fork_reason: reason
    };
    newSession.payload = { lineage };
    this.session = newSession;
    this.currentPlan = undefined;
    this.currentProposal = undefined;
    this.lastResult = undefined;
    this.appendState(`从会话 ${oldId} 分叉：${reason}`);
    this.session = appendChunk(this.session, {
      id: `chunk-${this.session.chunks.length + 1}`,
      type: "branch",
      summary: `分支起点：${reason}`,
      payload: { parent_id: oldId, fork_reason: reason }
    });
  }

  private advancePlan(proposal: ActionProposal, ok: boolean): void {
    if (!this.currentPlan) return;
    const steps = [...this.currentPlan.steps];
    let consumed = 0;
    for (const proposalAction of proposal.actions) {
      const next = steps.find((s) => s.status === "pending" && s.tool === proposalAction.action);
      if (next) {
        next.status = ok ? "done" : "failed";
        consumed++;
      }
    }
    // 如果 proposal 一次性执行了多个只读动作，把同类型的后续 pending step 也标记完成
    if (consumed === 0) {
      for (const action of proposal.actions) {
        const next = steps.find((s) => s.status === "pending");
        if (next) next.status = ok ? "done" : "failed";
      }
    }
    const nextPlan: TaskPlan = { ...this.currentPlan, steps };
    this.currentPlan = nextPlan;
    this.setPayload({ plan: nextPlan });
    this.currentProposal = proposalFromPlan(nextPlan);
  }

  private buildEvidenceSummary(conclusion: string, unresolved: string[]): EvidenceSummary {
    const sources = this.browserService?.getState().sources ?? [];
    return {
      goal: this.session.payload?.goal,
      status: this.session.status,
      conclusions: [conclusion],
      source_refs: sources.map((s) => s.id),
      corrections: this.correctionChunks(),
      failed_attempts: this.failedAttemptChunks(),
      unresolved_questions: unresolved,
      next_recommended_step: unresolved.length > 0 ? `继续研究：${unresolved[0]}` : undefined,
      environment: `BrowserView: ${this.browserService?.getState().url ?? ""}`,
      model_and_provider: "local-qwen2.5-3b"
    };
  }

  private buildEvidenceSummaryFromSnapshot(snapshot: DesktopUiSnapshot): EvidenceSummary {
    const conclusion = [...snapshot.session.chunks]
      .reverse()
      .find((c) => c.type === "conclusion")?.summary;
    const unresolved = (snapshot.session.payload?.evidence?.unresolved_questions as string[]) ?? [];
    return {
      goal: snapshot.session.payload?.goal,
      status: snapshot.session.status,
      conclusions: conclusion ? [conclusion] : [],
      source_refs: snapshot.browser.sources.map((s) => s.id),
      corrections: this.correctionChunks(snapshot.session),
      failed_attempts: this.failedAttemptChunks(snapshot.session),
      unresolved_questions: unresolved,
      environment: `BrowserView: ${snapshot.browser.url}`
    };
  }

  private buildRecoveryAnchor(sources: ResearchSource[]): ResumeAnchor {
    const last = sources[sources.length - 1];
    return {
      query: this.session.payload?.goal,
      active_constraints: [],
      last_successful_step: this.currentPlan?.steps.find((s) => s.status === "done")?.description,
      required_permissions: ["network"],
      last_verified_url: last?.url,
      last_verified_title: last?.title,
      last_verified_at: new Date().toISOString(),
      expected_excerpt: last?.excerpt?.slice(0, 400)
    };
  }

  private async revalidateSession(persisted: PersistedSession): Promise<void> {
    const recovery = (persisted.recovery ?? persisted.session.payload?.recovery) as ResumeAnchor | undefined;
    if (!this.browserService || !persisted.lastUrl) return;

    await new Promise((resolve) => setTimeout(resolve, 1500)); // 等页面 settle
    const text = await this.browserService.readVisibleText();
    const title = this.browserService.getState().title;
    const excerpt = text.trim().slice(0, 400);
    const expectedExcerpt = recovery?.expected_excerpt ?? persisted.sources[persisted.sources.length - 1]?.excerpt?.slice(0, 400);
    const titleChanged = recovery?.last_verified_title && title !== recovery.last_verified_title;
    const excerptChanged = expectedExcerpt && !text.toLowerCase().includes(expectedExcerpt.toLowerCase().slice(0, 100));

    if (titleChanged || excerptChanged) {
      const query = recovery?.query ?? persisted.goal ?? persisted.session.payload?.goal ?? persisted.title;
      this.appendState(`页面已变化，需要重新搜索：${query}`);
      this.session = appendChunk(this.session, {
        id: `chunk-${this.session.chunks.length + 1}`,
        type: "revalidation",
        summary: `页面重新验证失败：标题或内容与保存时不符`,
        payload: { expected_title: recovery?.last_verified_title, actual_title: title, query }
      });
      this.currentProposal = {
        proposal_id: `revalidate_${Date.now()}`,
        type: "sequence",
        visibility: "visible_virtual",
        target_view: "browser_view_main",
        actions: [
          { action: "browser.search", params: { query: String(query) } },
          { action: "browser.read", params: {} }
        ],
        safety: "safe",
        expected_result: `页面变化，重新搜索 "${query}"`,
        confidence: 0.7
      };
      this.runtimeState = "acting";
    } else {
      this.appendState(`页面重新验证通过：${title}`);
    }
  }

  private correctionChunks(session: SessionRun = this.session): string[] {
    return session.chunks
      .filter((c) => c.type === "correction" || (c.type === "branch" && c.payload?.fork_reason))
      .map((c) => c.summary);
  }

  private failedAttemptChunks(session: SessionRun = this.session): string[] {
    return session.chunks
      .filter((c) => c.type === "action_result" && c.payload?.ok === false)
      .map((c) => c.summary);
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
- 请同时输出 1-3 个「未解决问题」，作为 JSON 字段 unresolved_questions 数组；
- 输出格式必须是可被 JSON.parse 解析的 JSON：
{
  "conclusion": "太阳系有 8 颗行星[1]，地球是其中之一[1]。",
  "unresolved_questions": ["冥王星为何被降级？", "太阳系行星定义的历史变化是？"]
}`;

function buildConclusionPrompt(sources: ResearchSource[]): string {
  const body = sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\n摘录：${source.excerpt}`
    )
    .join("\n\n");
  return `当前共有 ${sources.length} 个来源。请只使用编号 [1] 到 [${sources.length}] 的引用，禁止引用不存在的来源。请用 JSON 输出结论和未解决问题。\n\n${body}`;
}

function parseConclusionJson(raw: string): { conclusion: string; unresolved_questions: string[] } {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.conclusion === "string") {
      return {
        conclusion: parsed.conclusion,
        unresolved_questions: Array.isArray(parsed.unresolved_questions) ? parsed.unresolved_questions : []
      };
    }
  } catch {
    // fall through
  }
  return { conclusion: raw, unresolved_questions: [] };
}
