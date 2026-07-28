import {
  type DuplexModelEvent,
  type DuplexModelInput,
  type DuplexModelProvider,
  type DuplexRuntimeEvent,
  type DuplexHistoryTurn
} from "@ai-cursor-v2/shared";
import { DuplexConversationRuntime } from "../packages/main/src/runtime/duplex-runtime.js";

interface EdgeCase {
  name: string;
  run: () => Promise<EdgeResult>;
}

interface EdgeResult {
  name: string;
  passed: boolean;
  errors: string[];
  latency: Array<{ kind: string; ms: number }>;
  state: string;
  snapshot?: string;
}

class SlowMockProvider implements DuplexModelProvider {
  readonly kind = "pipeline" as const;
  readonly usingRealInference = false;
  readonly inputs: DuplexModelInput[] = [];
  readonly histories: DuplexHistoryTurn[][] = [];

  constructor(
    private readonly chunks: string[],
    private readonly chunkDelayMs = 100
  ) {}

  async *generate(input: DuplexModelInput, signal?: AbortSignal): AsyncIterable<DuplexModelEvent> {
    this.inputs.push({ ...input, history: input.history?.map((turn) => ({ ...turn })) });
    this.histories.push(input.history?.map((turn) => ({ ...turn })) ?? []);
    yield { type: "state", state: "thinking" };
    await delay(50); // simulate first-token latency
    if (signal?.aborted) return;
    yield { type: "state", state: "speaking" };
    for (const chunk of this.chunks) {
      if (signal?.aborted) return;
      yield { type: "speech", text: chunk };
      await delay(this.chunkDelayMs);
    }
    if (!signal?.aborted) {
      yield { type: "state", state: "complete" };
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function recordEvents(runtime: DuplexConversationRuntime): DuplexRuntimeEvent[] {
  const events: DuplexRuntimeEvent[] = [];
  runtime.on((event) => events.push(event));
  return events;
}

function latencyMs(events: DuplexRuntimeEvent[], kind: string): number | undefined {
  const sample = events.find((event) => event.type === "latency" && event.sample.kind === kind)?.sample;
  return sample?.ms;
}

const THRESHOLDS = {
  barge_in_to_output_stop: 200,
  stop_signal_to_paused: 50,
  utterance_to_first_speech: 1200
};

async function runEdgeTests(): Promise<EdgeResult[]> {
  const results: EdgeResult[] = [];

  // 1. 正常完整一轮
  results.push(await runCase("正常完整一轮", async () => {
    const provider = new SlowMockProvider(["好的", "，", "我来", "回答。"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case1", provider });
    const events = recordEvents(runtime);
    const start = performance.now();
    await runtime.submitUtterance("你好");
    const elapsed = performance.now() - start;
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (snapshot.runtimeState !== "listening") errors.push(`最终状态不是 listening，而是 ${snapshot.runtimeState}`);
    if (snapshot.turns.length !== 2) errors.push(`回合数应为 2，实际 ${snapshot.turns.length}`);
    if (snapshot.turns.at(-1)?.interrupted) errors.push("完整回合不应标记 interrupted");
    if (elapsed > THRESHOLDS.utterance_to_first_speech) errors.push(`首句总耗时 ${elapsed.toFixed(0)}ms 超过阈值 ${THRESHOLDS.utterance_to_first_speech}ms`);
    const firstSpeech = latencyMs(events, "utterance_to_first_speech");
    return { passed: errors.length === 0, errors, latency: firstSpeech ? [{ kind: "utterance_to_first_speech", ms: firstSpeech }] : [], state: snapshot.runtimeState };
  }));

  // 2. 首句中途自然插话（新 utterance）
  results.push(await runCase("首句中途自然插话（新 utterance）", async () => {
    const provider = new SlowMockProvider(["好的", "，", "我来", "详细说明一下。"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case2", provider });
    const events: DuplexRuntimeEvent[] = [];
    let correctionAt = 0;
    const unsubscribe = runtime.on((event) => {
      events.push(event);
      if (event.type === "correction" && correctionAt === 0) {
        correctionAt = performance.now();
      }
    });
    const first = runtime.submitUtterance("讲考研数学");
    await delay(160); // 已经输出 "好的，我来"，进入第三 chunk 前
    const bargeStart = performance.now();
    const submitPromise = runtime.submitUtterance("换成英语");
    // 等待 correction 事件发出，即运行时已取消旧生成并发出输出停止信号。
    await new Promise<void>((resolve) => {
      const check = () => {
        if (correctionAt > 0 || events.some((event) => event.type === "correction")) {
          resolve();
        } else {
          setTimeout(check, 5);
        }
      };
      check();
    });
    const correctionElapsed = (correctionAt || performance.now()) - bargeStart;
    await submitPromise;
    unsubscribe();
    await first;
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (!events.some((event) => event.type === "correction")) errors.push("未触发 correction 事件");
    const assistantEnd = events.find((event) => event.type === "assistant_end" && event.interrupted);
    if (!assistantEnd) errors.push("未产生被打断的 assistant_end");
    if (snapshot.runtimeState !== "listening") errors.push(`最终状态不是 listening，而是 ${snapshot.runtimeState}`);
    const secondHistory = provider.inputs.at(-1)?.history ?? [];
    const interruptedAssistant = secondHistory.find((turn) => turn.role === "assistant" && turn.interrupted);
    if (!interruptedAssistant) errors.push("第二轮 history 中没有被打断的 assistant turn");
    if (correctionElapsed > THRESHOLDS.barge_in_to_output_stop) errors.push(`correction 发出延迟 ${correctionElapsed.toFixed(0)}ms 超过阈值 ${THRESHOLDS.barge_in_to_output_stop}ms`);
    return { passed: errors.length === 0, errors, latency: [{ kind: "correction_to_output_stop", ms: correctionElapsed }], state: snapshot.runtimeState };
  }));

  // 3. VAD bargeIn 带 heardText
  results.push(await runCase("VAD bargeIn 带 heardText", async () => {
    const provider = new SlowMockProvider(["好的", "，", "我来", "详细说明一下。"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case3", provider });
    const events = recordEvents(runtime);
    const first = runtime.submitUtterance("讲考研数学");
    await delay(160);
    const bargeStart = performance.now();
    runtime.bargeIn("只听到了这一句");
    const bargeElapsed = performance.now() - bargeStart;
    await first;
    // 再发一条用户话语，验证 history 中截断内容是否被正确传给下一轮。
    await runtime.submitUtterance("换成英语");
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (snapshot.runtimeState !== "listening") errors.push(`最终状态不是 listening，而是 ${snapshot.runtimeState}`);
    const interruptedAssistants = snapshot.turns.filter((turn) => turn.role === "assistant" && turn.interrupted);
    const lastInterrupted = interruptedAssistants.at(-1);
    if (!lastInterrupted) errors.push("没有被打断的 assistant turn");
    if (lastInterrupted?.text !== "只听到了这一句") errors.push(` heardText 截断失败：实际 "${lastInterrupted?.text}"`);
    if (bargeElapsed > THRESHOLDS.barge_in_to_output_stop) errors.push(`bargeIn 发出延迟 ${bargeElapsed.toFixed(0)}ms 超过阈值 ${THRESHOLDS.barge_in_to_output_stop}ms`);
    const secondHistory = provider.inputs.at(-1)?.history ?? [];
    const histAssistant = secondHistory.find((turn) => turn.role === "assistant" && turn.interrupted);
    if (!histAssistant) errors.push("第二轮 history 里没有被打断的 assistant");
    if (histAssistant?.content !== "只听到了这一句") errors.push(`history 截断内容错误："${histAssistant?.content}"`);
    const lat = latencyMs(events, "barge_in_to_output_stop") ?? bargeElapsed;
    return { passed: errors.length === 0, errors, latency: [{ kind: "barge_in_to_output_stop", ms: lat }], state: snapshot.runtimeState };
  }));

  // 4. 思考阶段被打断
  results.push(await runCase("思考阶段被打断", async () => {
    const provider = new SlowMockProvider(["好的"], 500);
    const runtime = new DuplexConversationRuntime({ sessionId: "case4", provider });
    const events = recordEvents(runtime);
    const first = runtime.submitUtterance("讲考研数学");
    await delay(30); // 还在 thinking
    await runtime.submitUtterance("换成英语");
    await first;
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (!events.some((event) => event.type === "correction")) errors.push("未触发 correction 事件");
    // 原 generation 被打断，可能留下空 assistant turn 或没有；关键是第二轮能正常开始
    const assistantTurns = snapshot.turns.filter((turn) => turn.role === "assistant");
    if (assistantTurns.length < 1) errors.push("至少应有一个 assistant turn（可能是空）");
    if (snapshot.runtimeState !== "listening") errors.push(`最终状态不是 listening，而是 ${snapshot.runtimeState}`);
    return { passed: errors.length === 0, errors, latency: [], state: snapshot.runtimeState };
  }));

  // 5. AI 说话时控制词“停”
  results.push(await runCase("AI 说话时控制词“停”", async () => {
    const provider = new SlowMockProvider(["好的", "，", "我来", "详细说明一下。"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case5", provider });
    const events = recordEvents(runtime);
    const first = runtime.submitUtterance("讲考研数学");
    await delay(160);
    const stopStart = performance.now();
    await runtime.submitUtterance("停");
    const stopElapsed = performance.now() - stopStart;
    await first;
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (!events.some((event) => event.type === "preemption" && event.intent === "pause")) errors.push("未触发 pause 抢占事件");
    if (snapshot.runtimeState !== "paused") errors.push(`最终状态不是 paused，而是 ${snapshot.runtimeState}`);
    if (snapshot.paused !== true) errors.push("paused 标记应为 true");
    if (stopElapsed > THRESHOLDS.stop_signal_to_paused) errors.push(`抢占延迟 ${stopElapsed.toFixed(0)}ms 超过阈值 ${THRESHOLDS.stop_signal_to_paused}ms`);
    const lat = latencyMs(events, "stop_signal_to_paused") ?? stopElapsed;
    return { passed: errors.length === 0, errors, latency: [{ kind: "stop_signal_to_paused", ms: lat }], state: snapshot.runtimeState };
  }));

  // 6. 控制词取消/继续
  results.push(await runCase("控制词取消后继续", async () => {
    const provider = new SlowMockProvider(["收到"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case6", provider });
    await runtime.submitUtterance("取消");
    const cancelSnapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (cancelSnapshot.runtimeState !== "interrupted") errors.push(`取消后状态不是 interrupted，而是 ${cancelSnapshot.runtimeState}`);
    if (!cancelSnapshot.paused) errors.push("取消后 paused 应为 true");
    await runtime.submitUtterance("继续");
    const resumeSnapshot = runtime.getSnapshot();
    if (resumeSnapshot.runtimeState !== "listening") errors.push(`继续后状态不是 listening，而是 ${resumeSnapshot.runtimeState}`);
    if (resumeSnapshot.paused) errors.push("继续后 paused 应为 false");
    return { passed: errors.length === 0, errors, latency: [], state: resumeSnapshot.runtimeState };
  }));

  // 7. 800ms 内重复 utterance 去重
  results.push(await runCase("800ms 内重复 utterance 去重", async () => {
    const provider = new SlowMockProvider(["收到"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case7", provider });
    const events = recordEvents(runtime);
    await runtime.submitUtterance("你好");
    await runtime.submitUtterance("你好");
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (provider.inputs.length !== 1) errors.push(`provider 被调用次数应为 1，实际 ${provider.inputs.length}`);
    const userTurns = snapshot.turns.filter((turn) => turn.role === "user");
    if (userTurns.length !== 1) errors.push(`user turn 数量应为 1，实际 ${userTurns.length}`);
    return { passed: errors.length === 0, errors, latency: [], state: snapshot.runtimeState };
  }));

  // 8. 空/纯空格输入
  results.push(await runCase("空/纯空格输入", async () => {
    const provider = new SlowMockProvider(["收到"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case8", provider });
    await runtime.submitUtterance("");
    await runtime.submitUtterance("   ");
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (provider.inputs.length !== 0) errors.push(`空输入不应调用 provider，实际调用 ${provider.inputs.length} 次`);
    if (snapshot.turns.length !== 0) errors.push(`空输入不应产生 turn，实际 ${snapshot.turns.length}`);
    return { passed: errors.length === 0, errors, latency: [], state: snapshot.runtimeState };
  }));

  // 9. Provider 切换时取消当前生成
  results.push(await runCase("Provider 切换时取消当前生成", async () => {
    const provider = new SlowMockProvider(["好的", "，", "我来", "详细说明一下。"]);
    const stub = new (class implements DuplexModelProvider {
      readonly kind = "bayling-duplex" as const;
      readonly usingRealInference = false;
      async *generate(input: DuplexModelInput): AsyncIterable<DuplexModelEvent> {
        yield { type: "state", state: "thinking" };
        yield { type: "state", state: "speaking" };
        yield { type: "speech", text: "切换后回答。" };
      }
      async healthCheck(): Promise<boolean> {
        return true;
      }
    })();
    const runtime = new DuplexConversationRuntime({ sessionId: "case9", provider, candidateProviders: [stub] });
    const first = runtime.submitUtterance("讲考研数学");
    await delay(100);
    await runtime.setActiveProvider("bayling-duplex");
    await first;
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    if (snapshot.activeProviderKind !== "bayling-duplex") errors.push(`当前 provider 未切换为 bayling-duplex：${snapshot.activeProviderKind}`);
    if (snapshot.runtimeState !== "listening") errors.push(`最终状态不是 listening，而是 ${snapshot.runtimeState}`);
    return { passed: errors.length === 0, errors, latency: [], state: snapshot.runtimeState };
  }));

  // 10. 多轮反复打断后的上下文截断
  results.push(await runCase("多轮反复打断后的上下文截断", async () => {
    const provider = new SlowMockProvider(["第一步", "，", "第二步", "，第三步。"]);
    const runtime = new DuplexConversationRuntime({ sessionId: "case10", provider });
    const first = runtime.submitUtterance("讲流程");
    await delay(170);
    runtime.bargeIn("第一步");
    await first;
    const second = runtime.submitUtterance("下一步");
    await delay(220);
    runtime.bargeIn("第一步，第二步");
    await second;
    const snapshot = runtime.getSnapshot();
    const errors: string[] = [];
    const interruptedAssistants = snapshot.turns.filter((turn) => turn.role === "assistant" && turn.interrupted);
    if (interruptedAssistants.length !== 2) errors.push(`应有 2 个被打断的 assistant turn，实际 ${interruptedAssistants.length}`);
    if (interruptedAssistants[0]?.text !== "第一步") errors.push(`第一次截断文本应为 "第一步"，实际 "${interruptedAssistants[0]?.text}"`);
    if (interruptedAssistants[1]?.text !== "第一步，第二步") errors.push(`第二次截断文本应为 "第一步，第二步"，实际 "${interruptedAssistants[1]?.text}"`);
    return { passed: errors.length === 0, errors, latency: [], state: snapshot.runtimeState };
  }));

  return results;
}

async function runCase(name: string, fn: () => Promise<Omit<EdgeResult, "name">>): Promise<EdgeResult> {
  try {
    const result = await fn();
    return { name, ...result };
  } catch (error) {
    return {
      name,
      passed: false,
      errors: [error instanceof Error ? error.message : String(error)],
      latency: [],
      state: "unknown"
    };
  }
}

async function main() {
  console.log("=== Vlawd 全双工边缘测试 ===\n");
  const results = await runEdgeTests();
  let passed = 0;
  let failed = 0;
  for (const result of results) {
    console.log(`[${result.passed ? "PASS" : "FAIL"}] ${result.name}`);
    console.log(`  state=${result.state}`);
    for (const { kind, ms } of result.latency) {
      const threshold = THRESHOLDS[kind as keyof typeof THRESHOLDS];
      const ok = threshold === undefined || ms <= threshold;
      console.log(`  latency ${kind}: ${ms.toFixed(1)}ms ${threshold !== undefined ? `(threshold ${threshold}ms ${ok ? "OK" : "OVER"})` : ""}`);
    }
    if (result.errors.length) {
      failed++;
      for (const error of result.errors) {
        console.log(`  ERROR: ${error}`);
      }
    } else {
      passed++;
    }
  }
  console.log(`\n=== 结果：通过 ${passed} / ${results.length}，失败 ${failed} ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
