import { DuplexConversationRuntime } from "../packages/main/src/runtime/duplex-runtime.js";
import { OpenAICompatibleLlmAdapter } from "../packages/main/src/model/llm-adapter.js";
import { PipelineDuplexModelProvider } from "../packages/main/src/model/pipeline-duplex-provider.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const llm = new OpenAICompatibleLlmAdapter({
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "qwen2.5:3b",
    temperature: 0.3,
    maxTokens: 80
  });
  const provider = new PipelineDuplexModelProvider(llm);
  const runtime = new DuplexConversationRuntime({ sessionId: "real-edge", provider });

  const events: any[] = [];
  runtime.on((event) => events.push(event));

  console.log("[real-edge] 启动真实 LLM 边缘测试（qwen2.5:3b）");

  // 1. 正常完整一轮
  console.log("\n[case 1] 正常完整一轮");
  await runtime.submitUtterance("你好");
  await delay(2000);
  let snapshot = runtime.getSnapshot();
  console.log(`state=${snapshot.runtimeState}, turns=${snapshot.turns.length}, lastAssistant="${snapshot.turns.filter((t) => t.role === "assistant").at(-1)?.text.slice(0, 40)}"`);

  // 2. 首句中途 VAD bargeIn
  console.log("\n[case 2] 首句中途 bargeIn");
  const first = runtime.submitUtterance("请介绍一下太阳系");
  await delay(600); // 等 AI 开口
  const bargeStart = performance.now();
  runtime.bargeIn("好的，"); // 假设用户只听到了"好的，"
  const bargeElapsed = performance.now() - bargeStart;
  await first;
  snapshot = runtime.getSnapshot();
  const lastInterrupted = snapshot.turns.filter((t) => t.role === "assistant" && t.interrupted).at(-1);
  console.log(`bargeIn 发出延迟=${bargeElapsed.toFixed(1)}ms`);
  console.log(`被打断 assistant 文本="${lastInterrupted?.text}"`);

  // 3. 被打断后再说新请求，验证 history 截断
  console.log("\n[case 3] 打断后继续新请求");
  await runtime.submitUtterance("那换成英语");
  await delay(2000);
  snapshot = runtime.getSnapshot();
  console.log(`state=${snapshot.runtimeState}, turns=${snapshot.turns.length}`);
  for (const turn of snapshot.turns) {
    console.log(`  ${turn.role}${turn.interrupted ? " [interrupted]" : ""}: "${turn.text.slice(0, 60)}"`);
  }

  // 4. 控制词抢占
  console.log("\n[case 4] AI 说话时控制词抢占");
  const third = runtime.submitUtterance("请详细说明一下");
  await delay(800);
  const stopStart = performance.now();
  await runtime.submitUtterance("停");
  const stopElapsed = performance.now() - stopStart;
  await third;
  snapshot = runtime.getSnapshot();
  console.log(`stop 延迟=${stopElapsed.toFixed(1)}ms, state=${snapshot.runtimeState}, paused=${snapshot.paused}`);
}

main().catch((error) => {
  console.error("[real-edge] 失败：", error);
  process.exit(1);
});
