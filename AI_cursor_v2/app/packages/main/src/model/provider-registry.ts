import type { DuplexModelEvent, DuplexModelInput, DuplexModelProvider, ProviderConfig } from "@ai-cursor-v2/shared";
import { MockDuplexModelProvider } from "./mock-duplex-provider.js";
import { executionBrainCatalog } from "./dual-role-config.js";

export class StubDuplexModelProvider implements DuplexModelProvider {
  readonly kind: ProviderConfig["kind"];

  constructor(readonly config: ProviderConfig) {
    this.kind = config.kind;
  }

  async *generate(input: DuplexModelInput): AsyncIterable<DuplexModelEvent> {
    yield { type: "state", state: "thinking" };
    yield {
      type: "uncertainty",
      reason: `${this.kind} provider is configured but not connected to a local inference process yet.`,
      confidence: 0.2
    };
    yield {
      type: "speech",
      text: `已收到任务“${input.user_utterance}”，当前使用 ${this.kind} 适配骨架。`
    };
    yield { type: "state", state: "waiting_confirm" };
  }
}

export function createProvider(config: ProviderConfig): DuplexModelProvider {
  if (config.kind === "mock") {
    return new MockDuplexModelProvider();
  }
  return new StubDuplexModelProvider(config);
}

export const recommendedLocalProviderConfigs: ProviderConfig[] = executionBrainCatalog.filter(
  (config) => config.kind !== "mock"
);
