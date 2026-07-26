import type { DuplexModelEvent, DuplexModelInput, DuplexModelProvider, ProviderConfig } from "@ai-cursor-v2/shared";
import { MockDuplexModelProvider } from "./mock-duplex-provider.js";
import { executionBrainCatalog } from "./dual-role-config.js";
import { AnthropicLlmAdapter, OpenAICompatibleLlmAdapter, type LlmAdapter } from "./llm-adapter.js";
import { DEFAULT_SYSTEM_PROMPT, PipelineDuplexModelProvider } from "./pipeline-duplex-provider.js";

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
    const apiKey = pipeline?.llmApiKey;
    if (pipeline?.llmProtocol === "anthropic") {
      return new AnthropicLlmAdapter({ baseUrl, model, apiKey });
    }
    return new OpenAICompatibleLlmAdapter({ baseUrl, model, apiKey });
  }
  throw new Error(`Provider ${config.kind} 未配置本地 OpenAI 兼容端点（baseUrl + model）。`);
}

export function createProvider(config: ProviderConfig): DuplexModelProvider {
  if (config.kind === "mock") {
    return new MockDuplexModelProvider();
  }
  if (config.kind === "pipeline") {
    const model = config.pipeline?.llmModel ?? "未知模型";
    const protocol = config.pipeline?.llmProtocol === "anthropic" ? "Anthropic (Claude)" : "OpenAI 兼容";
    const baseUrl = config.pipeline?.llmBaseUrl ?? "";
    const modelIntro = `当前由 ${protocol} 模型 ${model}（${baseUrl}）驱动。`;
    const systemPrompt =
      config.pipeline?.systemPrompt ??
      [
        modelIntro,
        "在每次回复开头，先用一句话说明你当前使用的模型名称和来源，例如：“我是 gpt-4o-mini，由 OpenAI 官方接口提供。”",
        DEFAULT_SYSTEM_PROMPT
      ].join("\n");
    return new PipelineDuplexModelProvider(createLlmAdapter(config), systemPrompt, [], null);
  }
  return new StubDuplexModelProvider(config);
}

export const recommendedLocalProviderConfigs: ProviderConfig[] = executionBrainCatalog.filter(
  (config) => config.kind !== "mock"
);
