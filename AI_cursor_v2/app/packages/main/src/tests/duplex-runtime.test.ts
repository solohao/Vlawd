import { describe, expect, it } from "vitest";
import type { DuplexRuntimeEvent } from "@ai-cursor-v2/shared";
import { DuplexConversationRuntime } from "../runtime/duplex-runtime.js";
import { EchoLlmAdapter } from "../model/llm-adapter.js";
import { PipelineDuplexModelProvider } from "../model/pipeline-duplex-provider.js";
import { StubDuplexModelProvider } from "../model/provider-registry.js";

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
});
