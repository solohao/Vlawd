import type {
  DuplexModelEvent,
  DuplexModelInput,
  DuplexModelProvider
} from "@ai-cursor-v2/shared";
import type { LlmAdapter, LlmMessage } from "./llm-adapter.js";

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
  readonly usingRealInference: boolean;

  constructor(
    private readonly llm: LlmAdapter,
    private readonly systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
    private readonly history: LlmMessage[] = []
  ) {
    this.usingRealInference = llm.usingRealInference;
  }

  async *generate(input: DuplexModelInput, signal?: AbortSignal): AsyncIterable<DuplexModelEvent> {
    yield { type: "state", state: "thinking" };

    const messages: LlmMessage[] = [
      { role: "system", content: this.systemPrompt },
      ...this.history,
      { role: "user", content: input.user_utterance }
    ];

    let spoke = false;
    try {
      for await (const delta of this.llm.stream(messages, signal)) {
        if (signal?.aborted) {
          break;
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
      yield {
        type: "uncertainty",
        reason: `本地推理端点不可用：${describeError(error)}`,
        confidence: 0.1
      };
      return;
    }

    if (!signal?.aborted) {
      yield { type: "state", state: "complete" };
    }
  }

  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    return this.llm.healthCheck(signal);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
