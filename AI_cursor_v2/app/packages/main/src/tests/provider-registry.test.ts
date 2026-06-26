import { describe, expect, it } from "vitest";
import { createSession } from "@ai-cursor-v2/shared";
import { runAgentTurn } from "../agent-loop/loop.js";
import { MockSystemExecutor } from "../executors/mock-system.js";
import {
  assertSafetyPreemptionLocked,
  bindPresetToWorkflow,
  defaultModelStorageConfig,
  desktopModelPresets,
  recordEngineCatalog,
  validateModelStorageConfig
} from "../model/dual-role-config.js";
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
      "bayling-duplex",
      "personaplex",
      "moshi"
    ]);
    const provider = createProvider(recommendedLocalProviderConfigs[0]);
    const events = [];
    for await (const event of provider.generate({ session_id: "stub", user_utterance: "测试" })) {
      events.push(event.type);
    }
    expect(events).toContain("uncertainty");
  });

  it("binds the two desktop model roles while keeping safety local and locked", () => {
    const binding = bindPresetToWorkflow("zh-real-time-supervision", "job_search");

    expect(desktopModelPresets).toHaveLength(3);
    expect(binding.workflow_id).toBe("job_search");
    expect(binding.executionBrain.kind).toBe("bayling-duplex");
    expect(binding.recordEngine.kind).toBe("rule-jsonl");
    expect(recordEngineCatalog.map((config) => config.kind)).toEqual([
      "rule-jsonl",
      "local-lightweight",
      "cloud-assisted"
    ]);
    expect(() => assertSafetyPreemptionLocked(binding)).not.toThrow();
  });

  it("resolves downloadable model artifacts under a user-selected storage root", () => {
    const binding = bindPresetToWorkflow("zh-real-time-supervision", "job_search", {
      ...defaultModelStorageConfig,
      rootDir: "D:/ai-models"
    });

    const storage = binding.modelStorage;
    if (!storage) {
      throw new Error("Expected model storage to be attached to the workflow binding.");
    }
    expect(storage.rootDir).toBe("D:/ai-models");
    expect(binding.executionBrain.modelPath).toContain("ai-cursor-v2-models");
    expect(binding.executionBrain.modelPath).toContain("bayling-duplex");
    expect(binding.executionBrain.speechTokenizerPath).toContain("glm-4-voice-tokenizer");
    expect(validateModelStorageConfig(storage)).toEqual([]);
  });

  it("warns when real model downloads would use the Windows system drive", () => {
    expect(
      validateModelStorageConfig({
        ...defaultModelStorageConfig,
        rootDir: "C:/Users/Administrator/models"
      })
    ).toContain("C: drive is selected; choose another drive when system disk space is limited.");
  });
});
