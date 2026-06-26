import { describe, expect, it } from "vitest";
import type { WorkflowModelBinding } from "@ai-cursor-v2/shared";
import { toModelSlotRows, toPresetOptions } from "../panel/model-configuration-view.js";

const binding: WorkflowModelBinding = {
  workflow_id: "browser_job_search",
  executionBrain: {
    kind: "bayling-duplex",
    modelPath: "models/bayling_duplex_model",
    device: "cuda"
  },
  recordEngine: {
    kind: "rule-jsonl",
    storage: "jsonl",
    device: "cpu",
    enableWorkflowMining: false
  },
  safetyPreemption: {
    role: "safety_preemption",
    engine: "local-rule-engine",
    locked: true,
    keywords: ["停", "暂停"]
  }
};

describe("model configuration view model", () => {
  it("renders the two configurable roles plus locked safety", () => {
    const rows = toModelSlotRows(binding);

    expect(rows.map((row) => row.slot)).toEqual(["执行大脑", "记录笔记本", "安全抢占"]);
    expect(rows[0]?.current).toBe("bayling-duplex");
    expect(rows[1]?.current).toBe("rule-jsonl");
    expect(rows[2]?.locked).toBe(true);
  });

  it("turns presets into concise desktop selector labels", () => {
    expect(
      toPresetOptions([
        {
          id: "developer-mock",
          name: "开发与低配测试",
          description: "Mock 执行大脑配合规则记录引擎。",
          recommendedFor: ["CI"],
          binding
        }
      ])
    ).toEqual(["开发与低配测试：Mock 执行大脑配合规则记录引擎。"]);
  });
});
