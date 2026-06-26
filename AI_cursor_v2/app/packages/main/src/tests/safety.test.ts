import { describe, expect, it } from "vitest";
import { createSession } from "@ai-cursor-v2/shared";
import { runAgentTurn } from "../agent-loop/loop.js";
import { MockSystemExecutor } from "../executors/mock-system.js";
import { MockDuplexModelProvider } from "../model/mock-duplex-provider.js";
import { AudioSupervisionRuntime } from "../safety/audio-supervision.js";
import { detectSafetyPreemption } from "../safety/preemption.js";

describe("safety preemption", () => {
  it("detects hard safety commands without using VAD turn-taking", () => {
    expect(detectSafetyPreemption("停，先别点")).toMatchObject({ intent: "pause" });
    expect(detectSafetyPreemption("撤销刚才那步")).toMatchObject({ intent: "rollback" });
    expect(detectSafetyPreemption("继续")).toMatchObject({ intent: "resume" });
  });

  it("keeps supervision as safety preemption, not turn-taking control", () => {
    const runtime = new AudioSupervisionRuntime();
    expect(runtime.ingestUserAudioTranscript("我还在说一个复杂需求").state).toBe("listening");
    expect(runtime.ingestUserAudioTranscript("暂停，先别动").state).toBe("paused");
    expect(runtime.ingestUserAudioTranscript("继续").state).toBe("listening");
  });

  it("pauses executors before model actions are generated", async () => {
    const executor = new MockSystemExecutor();
    const result = await runAgentTurn(
      createSession("safety_session"),
      "停，先别继续",
      new MockDuplexModelProvider(),
      new Map([["system", executor]]),
      { autoConfirm: true }
    );

    expect(result.paused_by_preemption).toBe(true);
    expect(result.action_results).toHaveLength(0);
    expect(executor.state.paused).toBe(true);
    expect(result.session.status).toBe("paused");
  });
});
