import type { DuplexModelKind, ModelRuntimeState } from "./model.js";

/**
 * Cycle 1 (真实全双工入口) runtime contracts.
 *
 * These types describe the *live* conversation runtime that replaces the static
 * mock snapshot for the duplex voice entry. They are intentionally transport
 * agnostic: the Electron main process owns a DuplexConversationRuntime and
 * projects the events below to every window (main + overlay).
 */

export type SafetyPreemptionIntent = "pause" | "cancel" | "rollback" | "resume";

/** Which conversation Provider is currently on the hot path. */
export type DuplexProviderKind = DuplexModelKind;

export type DuplexLatencyKind =
  /** 用户说完 → AI 第一段语音，反映首包体验。 */
  | "utterance_to_first_speech"
  /** 用户自然插话 → AI 语音输出停止，目标 < 200ms。 */
  | "barge_in_to_output_stop"
  /** 本地控制词/按钮 → 调度器进入 paused，目标 < 50ms。 */
  | "stop_signal_to_paused";

export interface DuplexLatencySample {
  kind: DuplexLatencyKind;
  ms: number;
  at: string;
}

export type ConversationTurnRole = "user" | "assistant";

export interface ConversationTurn {
  id: string;
  role: ConversationTurnRole;
  text: string;
  /** assistant turn 被自然插话或本地抢占中断。 */
  interrupted?: boolean;
  at: string;
}

export interface DuplexConversationSnapshot {
  sessionId: string;
  runtimeState: ModelRuntimeState;
  activeProviderKind: DuplexProviderKind;
  /** 已登记但当前未启用的可切换候选 Provider（如原生全双工方案 A）。 */
  candidateProviderKinds: DuplexProviderKind[];
  providerConnected: boolean;
  paused: boolean;
  turns: ConversationTurn[];
  latency: DuplexLatencySample[];
  lastError?: string;
  /** 说明当前 Provider 是否为真实推理（false = 离线回退，不能作为 Cycle 1 通过证据）。 */
  usingRealInference: boolean;
}

export type DuplexRuntimeEvent =
  | { type: "state"; state: ModelRuntimeState; at: string }
  | { type: "user_utterance"; turnId: string; text: string; at: string }
  | { type: "assistant_delta"; turnId: string; text: string; at: string }
  | { type: "assistant_end"; turnId: string; interrupted: boolean; at: string }
  | { type: "preemption"; intent: SafetyPreemptionIntent; matched: string; at: string }
  | { type: "correction"; text: string; at: string }
  | { type: "latency"; sample: DuplexLatencySample; at: string }
  | { type: "provider"; kind: DuplexProviderKind; connected: boolean; usingRealInference: boolean; at: string }
  | { type: "error"; message: string; at: string }
  | { type: "snapshot"; snapshot: DuplexConversationSnapshot; at: string };
