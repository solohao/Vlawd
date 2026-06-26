import type {
  DesktopModelPreset,
  ProviderConfig,
  RecordEngineConfig,
  SafetyPreemptionConfig,
  WorkflowModelBinding
} from "@ai-cursor-v2/shared";

export const defaultSafetyPreemptionConfig: SafetyPreemptionConfig = {
  role: "safety_preemption",
  engine: "local-rule-engine",
  locked: true,
  keywords: ["停", "暂停", "取消", "不要", "停下来", "我来", "退回"]
};

export const executionBrainCatalog: ProviderConfig[] = [
  {
    kind: "bayling-duplex",
    modelPath: "models/bayling_duplex_model",
    speechTokenizerPath: "models/speech_tokenizer",
    speechDecoderPath: "models/speech_decoder",
    device: "cuda"
  },
  {
    kind: "personaplex",
    endpoint: "http://127.0.0.1:10001",
    device: "cuda"
  },
  {
    kind: "moshi",
    endpoint: "http://127.0.0.1:10003",
    device: "cuda"
  },
  {
    kind: "mock",
    device: "cpu"
  }
];

export const recordEngineCatalog: RecordEngineConfig[] = [
  {
    kind: "rule-jsonl",
    storage: "jsonl",
    device: "cpu",
    enableWorkflowMining: false
  },
  {
    kind: "local-lightweight",
    modelPath: "models/record_engine_qwen2_5_3b_int4",
    storage: "sqlite",
    device: "cuda",
    enableWorkflowMining: true
  },
  {
    kind: "cloud-assisted",
    endpoint: "http://127.0.0.1:10002",
    storage: "sqlite",
    device: "cpu",
    enableWorkflowMining: true
  }
];

export const desktopModelPresets: DesktopModelPreset[] = [
  {
    id: "zh-real-time-supervision",
    name: "中文实时监督",
    description: "BayLing-Duplex 负责实时对话与执行，规则 JSONL 记录引擎负责最低成本留痕。",
    recommendedFor: ["中文语音监督", "浏览器求职筛选", "本地优先 MVP"],
    binding: {
      workflow_id: "default",
      executionBrain: executionBrainCatalog[0],
      recordEngine: recordEngineCatalog[0],
      safetyPreemption: defaultSafetyPreemptionConfig
    }
  },
  {
    id: "english-low-latency",
    name: "英文低延迟验证",
    description: "PersonaPlex 负责英文 full-duplex 体验，轻量记录引擎提取 Session 摘要和工作流候选。",
    recommendedFor: ["英文演示", "低延迟打断验证", "FullDuplexBench 对照"],
    binding: {
      workflow_id: "default",
      executionBrain: executionBrainCatalog[1],
      recordEngine: recordEngineCatalog[1],
      safetyPreemption: defaultSafetyPreemptionConfig
    }
  },
  {
    id: "developer-mock",
    name: "开发与低配测试",
    description: "Mock 执行大脑配合规则记录引擎，不需要 GPU，用于开发、CI 和无模型环境验证。",
    recommendedFor: ["开发测试", "CI", "无 GPU 电脑"],
    binding: {
      workflow_id: "default",
      executionBrain: executionBrainCatalog[3],
      recordEngine: recordEngineCatalog[0],
      safetyPreemption: defaultSafetyPreemptionConfig
    }
  }
];

export function bindPresetToWorkflow(presetId: string, workflowId: string): WorkflowModelBinding {
  const preset = desktopModelPresets.find((candidate) => candidate.id === presetId);
  if (!preset) {
    throw new Error(`Unknown desktop model preset: ${presetId}`);
  }
  return {
    ...preset.binding,
    workflow_id: workflowId
  };
}

export function assertSafetyPreemptionLocked(binding: WorkflowModelBinding): void {
  if (!binding.safetyPreemption.locked || binding.safetyPreemption.engine !== "local-rule-engine") {
    throw new Error("Safety preemption must stay on the local locked rule engine.");
  }
}
