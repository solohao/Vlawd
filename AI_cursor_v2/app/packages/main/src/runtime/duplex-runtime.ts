import {
  appendChunk,
  createSession,
  type ConversationTurn,
  type DuplexConversationSnapshot,
  type DuplexHistoryTurn,
  type DuplexLatencySample,
  type DuplexModelProvider,
  type DuplexProviderKind,
  type DuplexRuntimeEvent,
  type ModelRuntimeState,
  type SafetyPreemptionIntent,
  type SessionRun
} from "@ai-cursor-v2/shared";
import { detectSafetyPreemption } from "../safety/preemption.js";
import type { JsonlSessionStorage } from "../session/jsonl-storage.js";

export interface DuplexRuntimeOptions {
  sessionId?: string;
  provider: DuplexModelProvider;
  candidateProviders?: DuplexModelProvider[];
  storage?: JsonlSessionStorage;
  now?: () => number;
}

export type DuplexRuntimeListener = (event: DuplexRuntimeEvent) => void;

/**
 * Cycle 1 真实全双工入口的运行时单链路。
 *
 * 统一编排：用户输入（文字/ASR 转写）→ 本地抢占检测 → Provider 流式生成 →
 * 可被自然插话取消的输出 → Runtime 状态事件 → 最小记录与延迟指标。
 * 事件通过 listener 投影到所有窗口（主界面 + 悬浮 Overlay）。
 */
export class DuplexConversationRuntime {
  private readonly listeners = new Set<DuplexRuntimeListener>();
  private readonly now: () => number;
  private readonly storage?: JsonlSessionStorage;

  private provider: DuplexModelProvider;
  private candidateProviderKinds: DuplexProviderKind[];
  private readonly providersByKind = new Map<DuplexProviderKind, DuplexModelProvider>();

  private session: SessionRun;
  private runtimeState: ModelRuntimeState = "listening";
  private paused = false;
  private providerConnected = false;
  private lastError?: string;

  private turns: ConversationTurn[] = [];
  private latency: DuplexLatencySample[] = [];

  private turnCounter = 0;
  private activeGeneration: AbortController | null = null;
  private speakingStartedAt = 0;

  constructor(options: DuplexRuntimeOptions) {
    this.now = options.now ?? (() => Date.now());
    this.storage = options.storage;
    this.provider = options.provider;
    this.session = createSession(options.sessionId ?? `duplex_${this.now()}`);

    this.providersByKind.set(options.provider.kind, options.provider);
    for (const candidate of options.candidateProviders ?? []) {
      this.providersByKind.set(candidate.kind, candidate);
    }
    this.candidateProviderKinds = [...this.providersByKind.keys()].filter(
      (kind) => kind !== options.provider.kind
    );
  }

  on(listener: DuplexRuntimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): DuplexConversationSnapshot {
    return {
      sessionId: this.session.id,
      runtimeState: this.runtimeState,
      activeProviderKind: this.provider.kind,
      candidateProviderKinds: [...this.candidateProviderKinds],
      providerConnected: this.providerConnected,
      paused: this.paused,
      turns: this.turns.map((turn) => ({ ...turn })),
      latency: this.latency.map((sample) => ({ ...sample })),
      lastError: this.lastError,
      usingRealInference: this.provider.usingRealInference ?? false
    };
  }

  getSession(): SessionRun {
    return this.session;
  }

  /** 连接对话入口：进入 listening 并广播快照。 */
  connect(): DuplexConversationSnapshot {
    this.paused = false;
    this.setState("listening");
    this.emitSnapshot();
    return this.getSnapshot();
  }

  /**
   * 用户一段发言（来自文字输入或 ASR 转写）。
   * - 若命中本地安全控制词（停/暂停/取消/退回/继续）→ 本地抢占，不进 Provider。
   * - 若 AI 正在说话 → 视为自然插话：取消当前输出并按新约束继续。
   */
  async submitUtterance(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const preemption = detectSafetyPreemption(trimmed);
    if (preemption) {
      if (preemption.intent === "resume") {
        this.resume();
        return;
      }
      this.applyLocalPreemption(preemption.intent, preemption.matched);
      return;
    }

    const wasSpeaking = this.runtimeState === "speaking";
    if (this.activeGeneration) {
      // 自然插话：先停旧回答，再按新约束继续。
      this.cancelActiveGeneration({ interrupted: true });
      this.emit({ type: "correction", text: trimmed, at: this.timestamp() });
      this.appendSessionChunk("safety", "自然插话：更新约束", { text: trimmed });
    }

    if (this.paused) {
      this.paused = false;
    }

    // 在写入本轮用户回合之前快照历史：barge-in 已把上一助手回合标记为 interrupted，
    // 因此历史里会带上“用户实际听到的部分 + 被打断”标记（对齐 Open-LLM-VTuber）。
    const history = this.buildHistory();

    const userTurn = this.pushTurn("user", trimmed);
    this.emit({ type: "user_utterance", turnId: userTurn.id, text: trimmed, at: this.timestamp() });
    this.appendSessionChunk("user", trimmed, { utterance: trimmed, bargeIn: wasSpeaking });

    await this.runGeneration(trimmed, history);
  }

  /** 把已完成的对话回合映射为 Provider 多轮上下文（丢弃空回合）。 */
  private buildHistory(): DuplexHistoryTurn[] {
    const history: DuplexHistoryTurn[] = [];
    for (const turn of this.turns) {
      const content = turn.text.trim();
      if (!content) {
        continue;
      }
      history.push(
        turn.interrupted ? { role: turn.role, content, interrupted: true } : { role: turn.role, content }
      );
    }
    return history;
  }

  /**
   * VAD 检测到用户开口（转写尚未就绪）时的即时打断信号：立刻掐断 AI 语音输出。
   * 用于满足 barge-in → 输出停止 < 200ms 的目标。
   */
  bargeIn(): void {
    if (!this.activeGeneration) {
      return;
    }
    const start = this.now();
    this.cancelActiveGeneration({ interrupted: true });
    this.setState("listening");
    this.recordLatency("barge_in_to_output_stop", this.now() - start);
    this.emitSnapshot();
  }

  /**
   * 本地硬抢占（悬浮窗按钮或安全控制词）：停/暂停/取消/退回。
   * 不依赖 Provider 正常响应，直接影响输出与调度器状态。
   */
  preempt(intent: SafetyPreemptionIntent, matched = intent): void {
    if (intent === "resume") {
      this.resume();
      return;
    }
    this.applyLocalPreemption(intent, matched);
  }

  resume(): void {
    this.paused = false;
    this.setState("listening");
    this.emit({ type: "preemption", intent: "resume", matched: "resume", at: this.timestamp() });
    this.appendSessionChunk("state", "用户恢复对话", { runtimeState: this.runtimeState });
    this.emitSnapshot();
  }

  /** 切换当前热路径 Provider（先 B 后 A，一次只跑一个）。 */
  async setActiveProvider(kind: DuplexProviderKind): Promise<DuplexConversationSnapshot> {
    const next = this.providersByKind.get(kind);
    if (!next) {
      this.lastError = `未注册的 Provider: ${kind}`;
      this.emit({ type: "error", message: this.lastError, at: this.timestamp() });
      return this.getSnapshot();
    }
    this.cancelActiveGeneration({ interrupted: true });
    this.provider = next;
    this.candidateProviderKinds = [...this.providersByKind.keys()].filter((candidate) => candidate !== kind);
    this.providerConnected = false;
    this.setState("listening");
    this.appendSessionChunk("state", `切换执行大脑 Provider → ${kind}`, { provider: kind });
    await this.checkProviderHealth();
    this.emitSnapshot();
    return this.getSnapshot();
  }

  registerProvider(provider: DuplexModelProvider): void {
    this.providersByKind.set(provider.kind, provider);
    if (provider.kind !== this.provider.kind && !this.candidateProviderKinds.includes(provider.kind)) {
      this.candidateProviderKinds.push(provider.kind);
    }
  }

  /** 模型中心健康检查/运行按钮：探测当前 Provider 连通性。 */
  async checkProviderHealth(): Promise<boolean> {
    let connected = false;
    try {
      connected = this.provider.healthCheck ? await this.provider.healthCheck() : true;
    } catch (error) {
      connected = false;
      this.lastError = describeError(error);
    }
    this.providerConnected = connected;
    this.emit({
      type: "provider",
      kind: this.provider.kind,
      connected,
      usingRealInference: this.provider.usingRealInference ?? false,
      at: this.timestamp()
    });
    this.emitSnapshot();
    return connected;
  }

  private async runGeneration(utterance: string, history: DuplexHistoryTurn[] = []): Promise<void> {
    const controller = new AbortController();
    this.activeGeneration = controller;
    const assistantTurn = this.pushTurn("assistant", "");
    this.setState("thinking");

    const utteranceAt = this.now();
    let firstSpeechRecorded = false;

    try {
      for await (const event of this.provider.generate(
        { session_id: this.session.id, user_utterance: utterance, history },
        controller.signal
      )) {
        if (controller.signal.aborted) {
          break;
        }
        if (event.type === "state") {
          this.setState(event.state);
        } else if (event.type === "speech") {
          if (!firstSpeechRecorded) {
            firstSpeechRecorded = true;
            this.speakingStartedAt = this.now();
            this.recordLatency("utterance_to_first_speech", this.speakingStartedAt - utteranceAt);
          }
          if (this.runtimeState !== "speaking") {
            this.setState("speaking");
          }
          assistantTurn.text += event.text;
          this.emit({ type: "assistant_delta", turnId: assistantTurn.id, text: event.text, at: this.timestamp() });
        } else if (event.type === "uncertainty") {
          this.lastError = event.reason;
          this.emit({ type: "error", message: event.reason, at: this.timestamp() });
          this.appendSessionChunk("safety", event.reason, { confidence: event.confidence });
        }
      }
    } catch (error) {
      if (!isAbortError(error)) {
        this.lastError = describeError(error);
        this.emit({ type: "error", message: this.lastError, at: this.timestamp() });
      }
    }

    const interrupted = controller.signal.aborted;
    if (this.activeGeneration === controller) {
      this.activeGeneration = null;
    }
    assistantTurn.interrupted = interrupted || undefined;
    this.emit({ type: "assistant_end", turnId: assistantTurn.id, interrupted, at: this.timestamp() });

    if (assistantTurn.text.trim()) {
      this.appendSessionChunk("model", assistantTurn.text, { text: assistantTurn.text, interrupted });
    }

    if (!interrupted) {
      this.setState("listening");
    }
    this.emitSnapshot();
  }

  private applyLocalPreemption(intent: SafetyPreemptionIntent, matched: string): void {
    const start = this.now();
    this.cancelActiveGeneration({ interrupted: true });
    this.paused = intent === "pause" || intent === "cancel" || intent === "rollback";
    this.setState(intent === "cancel" ? "interrupted" : "paused");
    this.recordLatency("stop_signal_to_paused", this.now() - start);
    this.session = { ...this.session, status: "paused", updated_at: this.timestamp() };
    this.emit({ type: "preemption", intent, matched, at: this.timestamp() });
    this.appendSessionChunk("safety", `本地抢占：${intent}`, { intent, matched });
    this.emitSnapshot();
  }

  private cancelActiveGeneration(options: { interrupted: boolean }): void {
    const controller = this.activeGeneration;
    if (!controller) {
      return;
    }
    this.activeGeneration = null;
    controller.abort();
    if (options.interrupted) {
      const last = this.turns.at(-1);
      if (last && last.role === "assistant" && !last.interrupted) {
        last.interrupted = true;
      }
    }
  }

  private pushTurn(role: ConversationTurn["role"], text: string): ConversationTurn {
    const turn: ConversationTurn = {
      id: `${this.session.id}_turn_${this.turnCounter++}`,
      role,
      text,
      at: this.timestamp()
    };
    this.turns.push(turn);
    return turn;
  }

  private setState(state: ModelRuntimeState): void {
    if (this.runtimeState === state) {
      return;
    }
    this.runtimeState = state;
    this.emit({ type: "state", state, at: this.timestamp() });
  }

  private recordLatency(kind: DuplexLatencySample["kind"], ms: number): void {
    const sample: DuplexLatencySample = { kind, ms: Math.max(0, Math.round(ms)), at: this.timestamp() };
    this.latency.push(sample);
    this.emit({ type: "latency", sample, at: sample.at });
  }

  private appendSessionChunk(
    type: Parameters<typeof appendChunk>[1]["type"],
    summary: string,
    payload: Record<string, unknown>
  ): void {
    this.session = appendChunk(this.session, {
      id: `${this.session.id}_chunk_${this.session.chunks.length}`,
      type,
      summary,
      payload
    });
    const latest = this.session.chunks.at(-1);
    if (latest && this.storage) {
      void this.storage.append(latest).catch(() => undefined);
    }
  }

  private emitSnapshot(): void {
    this.emit({ type: "snapshot", snapshot: this.getSnapshot(), at: this.timestamp() });
  }

  private emit(event: DuplexRuntimeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private timestamp(): string {
    return new Date(this.now()).toISOString();
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
