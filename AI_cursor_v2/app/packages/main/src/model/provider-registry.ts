import type { DuplexModelEvent, DuplexModelInput, DuplexModelProvider, ProviderConfig } from "@ai-cursor-v2/shared";
import { MockDuplexModelProvider } from "./mock-duplex-provider.js";
import { executionBrainCatalog } from "./dual-role-config.js";
import { OpenAICompatibleLlmAdapter, type LlmAdapter } from "./llm-adapter.js";
import { PipelineDuplexModelProvider } from "./pipeline-duplex-provider.js";

export class StubDuplexModelProvider implements DuplexModelProvider {
  readonly kind: ProviderConfig["kind"];
  readonly usingRealInference = false;

  constructor(readonly config: ProviderConfig) {
    this.kind = config.kind;
  }

  async *generate(input: DuplexModelInput, signal?: AbortSignal): AsyncIterable<DuplexModelEvent> {
    if (signal?.aborted) {
      return;
    }
    yield { type: "state", state: "thinking" };
    yield {
      type: "uncertainty",
      reason: `${this.kind} provider is configured but not connected to a local inference process yet.`,
      confidence: 0.2
    };
    yield { type: "state", state: "waiting_confirm" };
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}

/**
 * 从 ProviderConfig 构造 LLM 适配器：必须配置本地 OpenAI 兼容端点（baseUrl + model）。
 * 未配置时直接抛出错误，避免静默回退到离线 Echo 造成模拟数据。
 */
export function createLlmAdapter(config: ProviderConfig): LlmAdapter {
  const pipeline = config.pipeline;
  const baseUrl = pipeline?.llmBaseUrl ?? config.endpoint;
  const model = pipeline?.llmModel;
  if (baseUrl && model) {
    return new OpenAICompatibleLlmAdapter({
      baseUrl,
      model,
      apiKey: pipeline?.llmApiKey
    });
  }
  throw new Error(`Provider ${config.kind} 未配置本地 OpenAI 兼容端点（baseUrl + model）。`);
}

export function createProvider(config: ProviderConfig): DuplexModelProvider {
  if (config.kind === "mock") {
    return new MockDuplexModelProvider();
  }
  if (config.kind === "pipeline") {
    return new PipelineDuplexModelProvider(createLlmAdapter(config), config.pipeline?.systemPrompt, [], null);
  }
  return new StubDuplexModelProvider(config);
}

export const recommendedLocalProviderConfigs: ProviderConfig[] = executionBrainCatalog.filter(
  (config) => config.kind !== "mock"
);
