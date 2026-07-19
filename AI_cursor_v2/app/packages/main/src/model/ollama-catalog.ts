import type { GpuInfo, ModelCatalogEntry } from "@ai-cursor-v2/shared";

/**
 * 方案 B 可通过 `ollama pull` 获取的本地文本模型目录。
 *
 * 只列 Ollama 官方库中存在的 tag（下载/运行由 Ollama 负责），执行大脑默认 Qwen2.5 7B，
 * 记录笔记本用更轻的 3B。语音/全双工原生模型不在此目录——它们走独立的 VoiceServerBackend。
 */
export const ollamaModelCatalog: ModelCatalogEntry[] = [
  {
    id: "qwen2.5:7b-instruct",
    displayName: "Qwen2.5 7B Instruct",
    badge: "推荐",
    feature: "中文高性价比",
    description: "优秀的中文理解与生成能力，作为执行大脑可实时对话、理解目标并提出动作。",
    approxSizeGB: 4.7,
    recommendedRamGB: 8,
    role: "duplex_execution_brain"
  },
  {
    id: "qwen2.5:3b-instruct",
    displayName: "Qwen2.5 3B Instruct",
    badge: "可选",
    feature: "低配可跑 / 记录引擎",
    description: "更轻量，适合作为记录笔记本或在显存/内存有限的设备上作为执行大脑。",
    approxSizeGB: 1.9,
    recommendedRamGB: 6,
    role: "session_record_engine"
  },
  {
    id: "llama3.1:8b",
    displayName: "Llama 3.1 8B",
    badge: "可选",
    feature: "开源可控",
    description: "开源模型，可完全本地化部署，数据更私密，作为执行大脑的备选。",
    approxSizeGB: 4.9,
    recommendedRamGB: 8,
    role: "duplex_execution_brain"
  }
];

export interface ResourceRecommendation {
  presetId: string;
  brainModel: string;
  reason: string;
  canRunRealModel: boolean;
}

/**
 * 依据显存与内存给出推荐（纯函数，便于单测）。
 * - ≥6GB 显存：7B 执行大脑；
 * - ≥4GB 显存：3B；
 * - 无独显但 ≥16GB 内存：CPU 上跑 3B（较慢但可用）；
 * - 否则：开发测试(mock)，不声称可跑真实模型。
 */
export function recommendFromResources(gpus: GpuInfo[], totalRamGB: number): ResourceRecommendation {
  const maxVramGB = gpus.reduce((max, gpu) => Math.max(max, gpu.vramTotalMB / 1024), 0);

  if (maxVramGB >= 6) {
    return {
      presetId: "zh-real-time-supervision",
      brainModel: "qwen2.5:7b-instruct",
      reason: `检测到约 ${maxVramGB.toFixed(1)}GB 显存，可流畅运行 7B 执行大脑。`,
      canRunRealModel: true
    };
  }
  if (maxVramGB >= 4) {
    return {
      presetId: "zh-real-time-supervision",
      brainModel: "qwen2.5:3b-instruct",
      reason: `检测到约 ${maxVramGB.toFixed(1)}GB 显存，建议先跑 3B 执行大脑。`,
      canRunRealModel: true
    };
  }
  if (totalRamGB >= 16) {
    return {
      presetId: "zh-real-time-supervision",
      brainModel: "qwen2.5:3b-instruct",
      reason: `未检测到足够显存，但有约 ${totalRamGB.toFixed(0)}GB 内存，可在 CPU 上跑 3B（延迟较高）。`,
      canRunRealModel: true
    };
  }
  if (totalRamGB >= 8) {
    return {
      presetId: "zh-real-time-supervision",
      brainModel: "qwen2.5:3b-instruct",
      reason: `内存约 ${totalRamGB.toFixed(0)}GB，仅建议在 CPU 上尝试 3B，实时性有限。`,
      canRunRealModel: true
    };
  }
  return {
    presetId: "developer-mock",
    brainModel: "qwen2.5:3b-instruct",
    reason: `资源有限（内存约 ${totalRamGB.toFixed(0)}GB、无可用显存），建议先用开发测试模式体验交互。`,
    canRunRealModel: false
  };
}
