import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { detectSafetyPreemption, type PreemptionSignal } from "./preemption.js";

export interface SupervisionFrame {
  utterance: string;
  state: ModelRuntimeState;
  preemption?: PreemptionSignal;
}

export class AudioSupervisionRuntime {
  private state: ModelRuntimeState = "listening";

  ingestUserAudioTranscript(utterance: string): SupervisionFrame {
    const preemption = detectSafetyPreemption(utterance);
    if (preemption?.intent === "pause" || preemption?.intent === "cancel" || preemption?.intent === "rollback") {
      this.state = "paused";
    } else if (preemption?.intent === "resume") {
      this.state = "listening";
    }
    return {
      utterance,
      state: this.state,
      preemption
    };
  }

  getState(): ModelRuntimeState {
    return this.state;
  }
}
