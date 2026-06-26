import type { DesktopModelPreset, WorkflowModelBinding } from "@ai-cursor-v2/shared";

export interface ModelSlotRow {
  slot: "执行大脑" | "记录笔记本" | "安全抢占";
  current: string;
  description: string;
  locked: boolean;
}

export function toModelSlotRows(binding: WorkflowModelBinding): ModelSlotRow[] {
  return [
    {
      slot: "执行大脑",
      current: binding.executionBrain.kind,
      description: "负责实时听说、理解意图、输出动作指令。",
      locked: false
    },
    {
      slot: "记录笔记本",
      current: binding.recordEngine.kind,
      description: "负责写入 Session chunk、更新任务面板、沉淀工作流候选。",
      locked: false
    },
    {
      slot: "安全抢占",
      current: binding.safetyPreemption.engine,
      description: `负责 ${binding.safetyPreemption.keywords.join("/")} 等硬中断词。`,
      locked: true
    }
  ];
}

export function toPresetOptions(presets: DesktopModelPreset[]): string[] {
  return presets.map((preset) => `${preset.name}：${preset.description}`);
}
