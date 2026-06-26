import { describe, expect, it } from "vitest";
import { createSession } from "@ai-cursor-v2/shared";
import { runAgentTurn } from "../agent-loop/loop.js";
import { MockSystemExecutor } from "../executors/mock-system.js";
import { createProvider, recommendedLocalProviderConfigs } from "../model/provider-registry.js";

describe("duplex model providers", () => {
  it("creates a mock provider for local execution tests", async () => {
    const provider = createProvider({ kind: "mock" });
    const result = await runAgentTurn(
      createSession("provider_session"),
      "帮我搜索资料",
      provider,
      new Map([["system", new MockSystemExecutor()]]),
      { autoConfirm: true }
    );
    expect(result.proposals).toHaveLength(1);
  });

  it("keeps real full-duplex model providers behind replaceable stubs", async () => {
    expect(recommendedLocalProviderConfigs.map((config) => config.kind)).toEqual([
      "glm-4-voice",
      "bayling-duplex",
      "personaplex"
    ]);
    const provider = createProvider(recommendedLocalProviderConfigs[0]);
    const events = [];
    for await (const event of provider.generate({ session_id: "stub", user_utterance: "测试" })) {
      events.push(event.type);
    }
    expect(events).toContain("uncertainty");
  });
});
