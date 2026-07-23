import { describe, expect, it } from "vitest";
import type {
  DuplexModelEvent,
  DuplexModelInput,
  DuplexModelProvider,
  DuplexRuntimeEvent
} from "@ai-cursor-v2/shared";
import { DuplexConversationRuntime } from "../runtime/duplex-runtime.js";
import { EchoLlmAdapter } from "../model/llm-adapter.js";
import { PipelineDuplexModelProvider } from "../model/pipeline-duplex-provider.js";
import { StubDuplexModelProvider } from "../model/provider-registry.js";

/** 记录每次 generate 收到的 input，用于断言多轮上下文。 */
class RecordingProvider implements DuplexModelProvider {
  readonly kind = "pipeline" as const;
  readonly inputs: DuplexModelInput[] = [];
  constructor(private readonly delayMs = 0) {}
  async *generate(input: DuplexModelInput, signal?: AbortSignal): AsyncIterable<DuplexModelEvent> {
    this.inputs.push({ ...input, history: input.history?.map((turn) => ({ ...turn })) });
    yield { type: "state", state: "speaking" };
    for (const segment of ["好的", "，", "我来回答。"]) {
      if (this.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
      if (signal?.aborted) {
        return;
      }
      yield { type: "speech", text: segment };
    }
    yield { type: "state", state: "complete" };
  }
}

function makeRuntime() {
  const provider = new PipelineDuplexModelProvider(new EchoLlmAdapter(0));
  const events: DuplexRuntimeEvent[] = [];
  const runtime = new DuplexConversationRuntime({
    sessionId: "test_session",
    provider,
    candidateProviders: [new StubDuplexModelProvider({ kind: "bayling-duplex" })]
  });
  runtime.on((event) => events.push(event));
  return { runtime, events };
}

describe("DuplexConversationRuntime (Cycle 1)", () => {
  it("streams a real reply as assistant deltas and returns to listening", async () => {
    const { runtime, events } = makeRuntime();
    await runtime.submitUtterance("帮我整理今天的计划");

    const deltas = events.filter((event) => event.type === "assistant_delta");
    expect(deltas.length).toBeGreaterThan(0);

    const snapshot = runtime.getSnapshot();
    expect(snapshot.runtimeState).toBe("listening");
    expect(snapshot.turns.at(0)?.role).toBe("user");
    expect(snapshot.turns.at(-1)?.role).toBe("assistant");
    expect(snapshot.turns.at(-1)?.text.length).toBeGreaterThan(0);
    expect(snapshot.turns.at(-1)?.interrupted).toBeUndefined();
  });

  it("records an utterance_to_first_speech latency sample", async () => {
    const { runtime } = makeRuntime();
    await runtime.submitUtterance("你好");
    const sample = runtime.getSnapshot().latency.find((s) => s.kind === "utterance_to_first_speech");
    expect(sample).toBeDefined();
  });

  it("treats a control word as a local preemption without calling the provider", async () => {
    const { runtime, events } = makeRuntime();
    await runtime.submitUtterance("停");

    expect(events.some((event) => event.type === "preemption" && event.intent === "pause")).toBe(true);
    expect(events.some((event) => event.type === "assistant_delta")).toBe(false);
    const snapshot = runtime.getSnapshot();
    expect(snapshot.paused).toBe(true);
    expect(snapshot.runtimeState).toBe("paused");
    expect(snapshot.latency.some((s) => s.kind === "stop_signal_to_paused")).toBe(true);
  });

  it("interrupts an in-flight reply when the user naturally barges in", async () => {
    const provider = new PipelineDuplexModelProvider(new EchoLlmAdapter(40));
    const events: DuplexRuntimeEvent[] = [];
    const runtime = new DuplexConversationRuntime({ sessionId: "barge", provider });
    runtime.on((event) => events.push(event));

    const first = runtime.submitUtterance("给我讲讲考研数学的复习顺序");
    await new Promise((resolve) => setTimeout(resolve, 50));
    await runtime.submitUtterance("换成英语的复习顺序");
    await first;

    expect(events.some((event) => event.type === "correction")).toBe(true);
    const interruptedEnd = events.find((event) => event.type === "assistant_end" && event.interrupted);
    expect(interruptedEnd).toBeDefined();
  });

  it("bargeIn() stops output fast and records barge_in_to_output_stop", async () => {
    const provider = new PipelineDuplexModelProvider(new EchoLlmAdapter(40));
    const runtime = new DuplexConversationRuntime({ sessionId: "vad", provider });
    const pending = runtime.submitUtterance("请慢慢地详细说明一下这个流程的每一步");
    await new Promise((resolve) => setTimeout(resolve, 50));
    runtime.bargeIn();
    await pending;

    const snapshot = runtime.getSnapshot();
    expect(snapshot.latency.some((s) => s.kind === "barge_in_to_output_stop")).toBe(true);
    expect(snapshot.runtimeState).toBe("listening");
  });

  it("resumes after a pause", async () => {
    const { runtime } = makeRuntime();
    await runtime.submitUtterance("暂停");
    expect(runtime.getSnapshot().paused).toBe(true);
    runtime.resume();
    expect(runtime.getSnapshot().paused).toBe(false);
    expect(runtime.getSnapshot().runtimeState).toBe("listening");
  });

  it("switches to the candidate provider on the hot path (方案 A/B 可切换)", async () => {
    const { runtime } = makeRuntime();
    expect(runtime.getSnapshot().activeProviderKind).toBe("pipeline");
    expect(runtime.getSnapshot().candidateProviderKinds).toContain("bayling-duplex");
    await runtime.setActiveProvider("bayling-duplex");
    expect(runtime.getSnapshot().activeProviderKind).toBe("bayling-duplex");
    expect(runtime.getSnapshot().candidateProviderKinds).toContain("pipeline");
  });

  it("marks offline echo as not-real inference for Cycle 1 evidence gating", () => {
    const { runtime } = makeRuntime();
    expect(runtime.getSnapshot().usingRealInference).toBe(false);
  });

  it("carries prior turns into the provider as multi-turn history", async () => {
    const provider = new RecordingProvider(0);
    const runtime = new DuplexConversationRuntime({ sessionId: "history", provider });
    await runtime.submitUtterance("我叫小明");
    await runtime.submitUtterance("我叫什么");

    expect(provider.inputs).toHaveLength(2);
    // 第一轮没有历史；第二轮应带上第一轮的 user + assistant。
    expect(provider.inputs[0]?.history ?? []).toHaveLength(0);
    const secondHistory = provider.inputs[1]?.history ?? [];
    expect(secondHistory.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(secondHistory[0]?.content).toBe("我叫小明");
    expect(secondHistory[1]?.content.length).toBeGreaterThan(0);
  });

  it("truncates the interrupted turn to the renderer-reported heard text", async () => {
    const provider = new RecordingProvider(40);
    const runtime = new DuplexConversationRuntime({ sessionId: "heard", provider });

    const first = runtime.submitUtterance("讲讲考研数学的复习顺序");
    await new Promise((resolve) => setTimeout(resolve, 50));
    runtime.bargeIn("只听到了这一句");
    await first;

    await runtime.submitUtterance("换成英语");
    const secondHistory = provider.inputs[1]?.history ?? [];
    const interruptedAssistant = secondHistory.find((turn) => turn.role === "assistant" && turn.interrupted);
    expect(interruptedAssistant?.content).toBe("只听到了这一句");
  });

  it("keeps only the heard part and marks the interrupted assistant turn in history", async () => {
    const provider = new RecordingProvider(40);
    const runtime = new DuplexConversationRuntime({ sessionId: "interrupt-history", provider });

    const first = runtime.submitUtterance("给我讲讲考研数学的复习顺序");
    await new Promise((resolve) => setTimeout(resolve, 50));
    await runtime.submitUtterance("换成英语");
    await first;

    const secondHistory = provider.inputs[1]?.history ?? [];
    const interruptedAssistant = secondHistory.find((turn) => turn.role === "assistant" && turn.interrupted);
    expect(interruptedAssistant).toBeDefined();
    expect(interruptedAssistant?.content.length).toBeGreaterThan(0);
  });
});
