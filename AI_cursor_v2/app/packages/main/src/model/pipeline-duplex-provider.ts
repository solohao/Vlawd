import type {
  DuplexModelEvent,
  DuplexModelInput,
  DuplexModelProvider
} from "@ai-cursor-v2/shared";
import { EchoLlmAdapter, type LlmAdapter, type LlmMessage } from "./llm-adapter.js";

const DEFAULT_SYSTEM_PROMPT = [
  "你是 Vlawd 的本地全双工桌面助手。",
  "用简洁自然的中文口语回答，适合语音朗读，不要输出 Markdown 符号或代码块。",
  "回答尽量分点、简短；用户随时可能插话改需求，你要立刻按新的约束回答。",
  "当前处于 Cycle 1（只做语音对话），不要声称你能操作浏览器或电脑。"
].join("");

/**
 * 方案 B：流式管线 Provider。
 *
 * Cycle 1 只需要"脑"（LLM）产出可朗读的流式文本；语音输入（ASR/VAD）在渲染层采集、
 * 语音输出（TTS）在渲染层播报。因此本 Provider 聚焦把 LLM 增量映射为统一的
 * DuplexModelEvent 事件流，取消由 AbortSignal 透传给底层推理。
 */
export class PipelineDuplexModelProvider implements DuplexModelProvider {
  readonly kind = "pipeline" as const;
  private realInference: boolean;
  private readonly fallback: LlmAdapter;

  constructor(
    private readonly llm: LlmAdapter,
    private readonly systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
    private readonly history: LlmMessage[] = [],
    fallback?: LlmAdapter
  ) {
    this.realInference = llm.usingRealInference;
    this.fallback = fallback ?? new EchoLlmAdapter();
  }

  /** 反映最近一次生成实际走的是真实端点还是离线回退。 */
  get usingRealInference(): boolean {
    return this.realInference;
  }

  async *generate(input: DuplexModelInput, signal?: AbortSignal): AsyncIterable<DuplexModelEvent> {
    yield { type: "state", state: "thinking" };

    const messages: LlmMessage[] = [
      { role: "system", content: this.systemPrompt },
      ...this.history,
      { role: "user", content: input.user_utterance }
    ];

    let spoke = false;
    let realFailed = false;
    if (this.llm.usingRealInference) {
      try {
        for await (const delta of this.llm.stream(messages, signal)) {
          if (signal?.aborted) {
            return;
          }
          if (!delta) {
            continue;
          }
          if (!spoke) {
            spoke = true;
            yield { type: "state", state: "speaking" };
          }
          yield { type: "speech", text: delta };
        }
        this.realInference = true;
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        realFailed = true;
      }
    }

    // 未配置真实端点，或真实端点在开口前不可用：回退到离线 Echo（明确标注非真实推理）。
    if (!spoke) {
      this.realInference = false;
      if (realFailed) {
        yield {
          type: "uncertainty",
          reason: "本地推理端点不可用，已切到离线回退语气（非真实推理）。配置并运行本地 Qwen2.5 后即为真实推理。",
          confidence: 0.2
        };
      }
      try {
        for await (const delta of this.fallback.stream(messages, signal)) {
          if (signal?.aborted) {
            return;
          }
          if (!delta) {
            continue;
          }
          if (!spoke) {
            spoke = true;
            yield { type: "state", state: "speaking" };
          }
          yield { type: "speech", text: delta };
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
      }
    } else if (realFailed) {
      // 已经开口后真实端点中断：不重复回退，仅提示。
      yield { type: "uncertainty", reason: "本地推理连接中断。", confidence: 0.2 };
    }

    if (!signal?.aborted) {
      yield { type: "state", state: "complete" };
    }
  }

  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    const connected = await this.llm.healthCheck(signal);
    this.realInference = connected && this.llm.usingRealInference;
    return connected;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
