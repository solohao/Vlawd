import type { DesktopModelPreset, ModelStorageConfig, WorkflowModelBinding } from "@ai-cursor-v2/shared";

export interface ModelSlotRow {
  slot: "执行大脑" | "记录笔记本" | "安全抢占";
  current: string;
  description: string;
  locked: boolean;
}

export interface ModelStorageRow {
  label: "模型下载位置";
  currentRoot: string;
  requiresSelection: boolean;
  preferNonSystemDrive: boolean;
  action: "choose_directory";
}

export function toModelSlotRows(binding: WorkflowModelBinding): ModelSlotRow[] {
  return [
    {
      slot: "执行大脑",
      current: binding.executionBrain.kind,
      description: "负责实时对话、理解用户纠正并提出动作指令。",
      locked: false
    },
    {
      slot: "记录笔记本",
      current: binding.recordEngine.kind,
      description: "负责记录动作、更新 Session 日志并沉淀工作流候选。",
      locked: false
    },
    {
      slot: "安全抢占",
      current: binding.safetyPreemption.engine,
      description: `本地规则引擎，关键词：${binding.safetyPreemption.keywords.join("、")}`,
      locked: true
    }
  ];
}

export function toModelStorageRow(storage?: ModelStorageConfig): ModelStorageRow {
  return {
    label: "模型下载位置",
    currentRoot: storage?.rootDir || "未选择",
    requiresSelection: !storage?.rootDir,
    preferNonSystemDrive: storage?.preferNonSystemDrive ?? true,
    action: "choose_directory"
  };
}

export function toPresetOptions(presets: DesktopModelPreset[]): string[] {
  return presets.map((preset) => `${preset.name}：${preset.description}`);
}
