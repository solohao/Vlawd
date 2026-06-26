import { describe, expect, it } from "vitest";
import type { WorkflowModelBinding } from "@ai-cursor-v2/shared";
import { toModelSlotRows, toModelStorageRow, toPresetOptions } from "../panel/model-configuration-view.js";

const binding: WorkflowModelBinding = {
  workflow_id: "browser_job_search",
  executionBrain: {
    kind: "bayling-duplex",
    modelPath: "D:/ai-models/ai-cursor-v2-models/execution-brain/bayling-duplex",
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
  },
  modelStorage: {
    rootDir: "D:/ai-models",
    managedSubdir: "ai-cursor-v2-models",
    preferNonSystemDrive: true,
    source: "user-selected"
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

  it("renders model storage directory selection state", () => {
    expect(toModelStorageRow()).toEqual({
      label: "模型下载位置",
      currentRoot: "未选择",
      requiresSelection: true,
      preferNonSystemDrive: true,
      action: "choose_directory"
    });

    expect(toModelStorageRow(binding.modelStorage)).toEqual({
      label: "模型下载位置",
      currentRoot: "D:/ai-models",
      requiresSelection: false,
      preferNonSystemDrive: true,
      action: "choose_directory"
    });
  });

  it("turns presets into concise desktop selector labels", () => {
    expect(
      toPresetOptions([
        {
          id: "developer-mock",
          name: "开发测试",
          description: "Mock 执行大脑配置",
          recommendedFor: ["开发"],
          binding
        }
      ])
    ).toEqual(["开发测试：Mock 执行大脑配置"]);
  });
});
