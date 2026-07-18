/**
 * Cycle 1 大脑（brain）适配层。
 *
 * 方案 B 流式管线的 LLM 组件只暴露一个"给定对话历史，流式返回文本增量"的接口，
 * 具体后端可切换：
 *   - OpenAICompatibleLlmAdapter：连接本地 OpenAI 兼容端点（Ollama / LM Studio /
 *     llama.cpp server）跑 Qwen2.5 等模型，是用户机器上的真实推理路径。
 *   - EchoLlmAdapter：纯离线确定性回退，用于 CI、无模型环境与单元测试，
 *     不能作为 Cycle 1 通过证据。
 */

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmAdapter {
  readonly label: string;
  /** 是否为真实推理（false = 离线回退）。 */
  readonly usingRealInference: boolean;
  /** 流式返回文本增量（token/词/句片段皆可）。 */
  stream(messages: LlmMessage[], signal?: AbortSignal): AsyncIterable<string>;
  /** 轻量连通性检查。 */
  healthCheck(signal?: AbortSignal): Promise<boolean>;
}

export interface OpenAICompatibleOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
}

interface OpenAiStreamChunk {
  choices?: Array<{ delta?: { content?: string } }>;
}

interface OpenAiModelsResponse {
  data?: Array<{ id?: string }>;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * 与任意 OpenAI 兼容的本地推理服务对接（Ollama 默认 http://127.0.0.1:11434/v1）。
 */
export class OpenAICompatibleLlmAdapter implements LlmAdapter {
  readonly label: string;
  readonly usingRealInference = true;
  private readonly baseUrl: string;

  constructor(private readonly options: OpenAICompatibleOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.label = `${options.model} @ ${this.baseUrl}`;
  }

  async *stream(messages: LlmMessage[], signal?: AbortSignal): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        ...(this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.options.model,
        stream: true,
        temperature: this.options.temperature ?? 0.6,
        messages
      })
    });

    if (!response.ok || !response.body) {
      throw new Error(`LLM endpoint responded ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) {
            continue;
          }
          const payload = line.slice("data:".length).trim();
          if (payload === "[DONE]") {
            return;
          }
          const delta = extractDelta(payload);
          if (delta) {
            yield delta;
          }
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }

  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        signal,
        headers: this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : undefined
      });
      if (!response.ok) {
        return false;
      }
      const body = (await response.json()) as OpenAiModelsResponse;
      if (!Array.isArray(body.data) || body.data.length === 0) {
        // 端点在线但未报告模型列表；仍视为可用。
        return true;
      }
      return body.data.some((entry) => entry.id === this.options.model) || body.data.length > 0;
    } catch {
      return false;
    }
  }
}

function extractDelta(payload: string): string {
  try {
    const chunk = JSON.parse(payload) as OpenAiStreamChunk;
    return chunk.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

/**
 * 离线确定性回退：无需任何模型即可跑通整条 Cycle 1 状态机（插话/抢占/取消/恢复/延迟），
 * 供开发、CI 与单测使用。真实体验必须切到 OpenAICompatibleLlmAdapter。
 */
export class EchoLlmAdapter implements LlmAdapter {
  readonly label = "offline-echo (无真实推理)";
  readonly usingRealInference = false;

  constructor(private readonly chunkDelayMs = 60) {}

  async *stream(messages: LlmMessage[], signal?: AbortSignal): AsyncIterable<string> {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const utterance = lastUser?.content ?? "";
    const reply = buildOfflineReply(utterance);
    const segments = reply.match(/[^，。！？,.!?]+[，。！？,.!?]?/g) ?? [reply];
    for (const segment of segments) {
      await delay(this.chunkDelayMs, signal);
      yield segment;
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

function buildOfflineReply(utterance: string): string {
  const trimmed = utterance.trim();
  if (!trimmed) {
    return "我在听，请说出你的目标。";
  }
  return `收到，你说的是「${trimmed}」。我会先复述目标再分点回答；这是离线回退语气，配置本地 Qwen2.5 后即为真实推理。你可以随时插话改需求，或说“停”来暂停。`;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
