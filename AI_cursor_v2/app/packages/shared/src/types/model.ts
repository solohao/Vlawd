import type { ActionProposal } from "./action.js";

export type DuplexModelKind = "mock" | "glm-4-voice" | "bayling-duplex" | "personaplex" | "cloud-planner";
export type ModelRuntimeState = "listening" | "speaking" | "thinking" | "acting" | "waiting_confirm" | "paused" | "interrupted" | "complete";

export interface DuplexModelInput {
  session_id: string;
  user_utterance: string;
  screen_summary?: string;
  candidates?: string[];
}

export type DuplexModelEvent =
  | {
      type: "speech";
      text: string;
    }
  | {
      type: "state";
      state: ModelRuntimeState;
    }
  | {
      type: "action_proposal";
      proposal: ActionProposal;
    }
  | {
      type: "uncertainty";
      reason: string;
      confidence: number;
    };

export interface DuplexModelProvider {
  readonly kind: DuplexModelKind;
  generate(input: DuplexModelInput): AsyncIterable<DuplexModelEvent>;
}

export interface ProviderConfig {
  kind: DuplexModelKind;
  endpoint?: string;
  modelPath?: string;
  speechTokenizerPath?: string;
  speechDecoderPath?: string;
  device?: "cpu" | "cuda" | "metal";
}
