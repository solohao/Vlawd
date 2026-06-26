import { rm } from "node:fs/promises";
import { join } from "node:path";
import { createSession } from "@ai-cursor-v2/shared";
import { runAgentTurn } from "./agent-loop/loop.js";
import { VirtualBrowserViewExecutor } from "./executors/browser-mvp.js";
import { MockSystemExecutor } from "./executors/mock-system.js";
import type { Executor } from "./executors/types.js";
import { bindPresetToWorkflow } from "./model/dual-role-config.js";
import { MockDuplexModelProvider } from "./model/mock-duplex-provider.js";
import { JsonlSessionStorage } from "./session/jsonl-storage.js";

const session = createSession("demo_session");
const system = new MockSystemExecutor();
const browser = new VirtualBrowserViewExecutor();
const executors = new Map<string, Executor>([
  ["system", system],
  ["browser_view_main", browser]
]);
const logPath = join(process.cwd(), ".session-logs", "demo.jsonl");
await rm(logPath, { force: true });

const storage = new JsonlSessionStorage(logPath);
const provider = new MockDuplexModelProvider();
const modelBinding = bindPresetToWorkflow("developer-mock", "browser_mvp_demo");

const searchResult = await runAgentTurn(session, "帮我搜索 AI Cursor 全双工语音监督", provider, executors, {
  storage,
  autoConfirm: true
});
const pausedResult = await runAgentTurn(searchResult.session, "停，先别继续", provider, executors, {
  storage,
  autoConfirm: true
});
const chunks = await storage.readAll();

console.log(
  JSON.stringify(
    {
      phase0: "workspace loaded",
      modelConfig: {
        executionBrain: modelBinding.executionBrain.kind,
        recordEngine: modelBinding.recordEngine.kind,
        safetyPreemptionLocked: modelBinding.safetyPreemption.locked
      },
      phase1: {
        proposals: searchResult.proposals.length,
        actions: searchResult.action_results.length
      },
      phase2: {
        paused: pausedResult.paused_by_preemption,
        status: pausedResult.session.status
      },
      phase4: {
        browserQuery: browser.state.query,
        labels: browser.state.labels.length
      },
      sessionChunks: chunks.length
    },
    null,
    2
  )
);
