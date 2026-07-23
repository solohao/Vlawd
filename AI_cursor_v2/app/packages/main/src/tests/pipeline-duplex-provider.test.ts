import { describe, expect, it } from "vitest";
import type { DuplexModelEvent } from "@ai-cursor-v2/shared";
import { PipelineDuplexModelProvider } from "../model/pipeline-duplex-provider.js";
import type { LlmAdapter, LlmMessage } from "../model/llm-adapter.js";

/** 捕获传给 LLM 的完整消息，用于断言系统提示 + 历史 + 本轮用户输入的拼装。 */
class CapturingLlmAdapter implements LlmAdapter {
  readonly label = "capturing";
  readonly usingRealInference = true;
  lastMessages: LlmMessage[] = [];
  // eslint-disable-next-line require-yield
  async *stream(messages: LlmMessage[]): AsyncIterable<string> {
    this.lastMessages = messages;
    return;
  }
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

async function drain(iterable: AsyncIterable<DuplexModelEvent>): Promise<void> {
  for await (const _event of iterable) {
    void _event;
  }
}

describe("PipelineDuplexModelProvider history", () => {
  it("appends multi-turn history between system prompt and the current utterance", async () => {
    const llm = new CapturingLlmAdapter();
    const provider = new PipelineDuplexModelProvider(llm);
    await drain(
      provider.generate({
        session_id: "s",
        user_utterance: "我叫什么",
        history: [
          { role: "user", content: "我叫小明" },
          { role: "assistant", content: "你好小明" }
        ]
      })
    );

    expect(llm.lastMessages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(llm.lastMessages.at(-1)?.content).toBe("我叫什么");
    expect(llm.lastMessages[2]?.content).toBe("你好小明");
  });

  it("annotates an interrupted assistant turn so the model knows it was cut off", async () => {
    const llm = new CapturingLlmAdapter();
    const provider = new PipelineDuplexModelProvider(llm);
    await drain(
      provider.generate({
        session_id: "s",
        user_utterance: "换成英语",
        history: [
          { role: "user", content: "讲讲考研数学" },
          { role: "assistant", content: "考研数学分三部分", interrupted: true }
        ]
      })
    );

    const assistant = llm.lastMessages.find((m) => m.role === "assistant");
    expect(assistant?.content).toContain("被用户打断");
  });
});
