import type {
  ConversationEndpointPreference,
  DesktopModelPreset,
  ModelDownloadArtifact,
  ModelStorageConfig,
  ProviderConfig,
  RecordEngineConfig,
  SafetyPreemptionConfig,
  WorkflowModelBinding
} from "@ai-cursor-v2/shared";
import { isAbsolute, parse, resolve } from "node:path";

export const defaultSafetyPreemptionConfig: SafetyPreemptionConfig = {
  role: "safety_preemption",
  engine: "local-rule-engine",
  locked: true,
  keywords: ["停", "暂停", "取消", "不要", "停下来", "我来", "退回"]
};

export const defaultModelStorageConfig: ModelStorageConfig = {
  rootDir: "",
  managedSubdir: "ai-cursor-v2-models",
  preferNonSystemDrive: true,
  source: "user-selected"
};

export const defaultConversationEndpointPreference: ConversationEndpointPreference = {
  mode: "headset-preferred",
  preferBluetoothHandsFree: true,
  allowComputerMicFallback: true
};

export const executionBrainCatalog: ProviderConfig[] = [
  {
    kind: "bayling-duplex",
    device: "cuda",
    downloads: [
      {
        source: "huggingface",
        repo: "BayLing-Models/BayLing-Duplex",
        target: "modelPath",
        localSubdir: "execution-brain/bayling-duplex"
      },
      {
        source: "huggingface",
        repo: "zai-org/glm-4-voice-tokenizer",
        target: "speechTokenizerPath",
        localSubdir: "components/glm-4-voice-tokenizer"
      },
      {
        source: "huggingface",
        repo: "zai-org/glm-4-voice-decoder",
        target: "speechDecoderPath",
        localSubdir: "components/glm-4-voice-decoder"
      }
    ]
  },
  {
    kind: "personaplex",
    endpoint: "http://127.0.0.1:10001",
    device: "cuda",
    downloads: [
      {
        source: "huggingface",
        repo: "nvidia/personaplex-7b-v1",
        target: "modelPath",
        localSubdir: "execution-brain/personaplex-7b-v1",
        requiresLicenseAcceptance: true
      }
    ]
  },
  {
    kind: "moshi",
    endpoint: "http://127.0.0.1:10003",
    device: "cuda",
    downloads: [
      {
        source: "huggingface",
        repo: "kyutai/moshiko-pytorch-bf16",
        target: "modelPath",
        localSubdir: "execution-brain/moshi"
      }
    ]
  },
  {
    kind: "mock",
    endpoint: "mock://local",
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
    storage: "sqlite",
    device: "cuda",
    enableWorkflowMining: true,
    downloads: [
      {
        source: "huggingface",
        repo: "Qwen/Qwen2.5-3B-Instruct",
        target: "modelPath",
        localSubdir: "record-engine/qwen2_5_3b_instruct"
      }
    ]
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
    name: "中文实时监督推荐",
    description: "BayLing-Duplex 作为执行大脑，标准记录引擎负责 Session 留痕，适合本地优先 MVP。",
    recommendedFor: ["中文语音监督", "浏览器求职筛选", "本地优先 MVP"],
    binding: {
      workflow_id: "default",
      executionBrain: executionBrainCatalog[0],
      recordEngine: recordEngineCatalog[0],
      safetyPreemption: defaultSafetyPreemptionConfig,
      modelStorage: defaultModelStorageConfig,
      conversationEndpoint: defaultConversationEndpointPreference
    }
  },
  {
    id: "english-low-latency",
    name: "英文低延迟验证",
    description: "PersonaPlex 负责英文 full-duplex 体验，轻量记录引擎负责 Session 摘要和工作流候选。",
    recommendedFor: ["英文演示", "低延迟打断验证", "FullDuplexBench 对照"],
    binding: {
      workflow_id: "default",
      executionBrain: executionBrainCatalog[1],
      recordEngine: recordEngineCatalog[1],
      safetyPreemption: defaultSafetyPreemptionConfig,
      modelStorage: defaultModelStorageConfig,
      conversationEndpoint: defaultConversationEndpointPreference
    }
  },
  {
    id: "developer-mock",
    name: "开发测试模式",
    description: "Mock 执行大脑 + 标准记录引擎，不需要 GPU，用于开发、CI 和无模型环境验证。",
    recommendedFor: ["开发测试", "CI", "无 GPU 电脑"],
    binding: {
      workflow_id: "default",
      executionBrain: executionBrainCatalog[3],
      recordEngine: recordEngineCatalog[0],
      safetyPreemption: defaultSafetyPreemptionConfig,
      modelStorage: defaultModelStorageConfig,
      conversationEndpoint: defaultConversationEndpointPreference
    }
  }
];

export function bindPresetToWorkflow(
  presetId: string,
  workflowId: string,
  modelStorage?: ModelStorageConfig
): WorkflowModelBinding {
  const preset = desktopModelPresets.find((candidate) => candidate.id === presetId);
  if (!preset) {
    throw new Error(`Unknown desktop model preset: ${presetId}`);
  }

  const binding: WorkflowModelBinding = {
    ...preset.binding,
    executionBrain: { ...preset.binding.executionBrain },
    recordEngine: { ...preset.binding.recordEngine },
    safetyPreemption: preset.binding.safetyPreemption,
    modelStorage: modelStorage ?? preset.binding.modelStorage,
    conversationEndpoint: preset.binding.conversationEndpoint,
    workflow_id: workflowId
  };

  return binding.modelStorage ? applyModelStorage(binding, binding.modelStorage) : binding;
}

export function assertSafetyPreemptionLocked(binding: WorkflowModelBinding): void {
  if (!binding.safetyPreemption.locked || binding.safetyPreemption.engine !== "local-rule-engine") {
    throw new Error("Safety preemption must stay locked to the local rule engine.");
  }
}

export function validateModelStorageConfig(storage: ModelStorageConfig): string[] {
  const warnings: string[] = [];

  if (!storage.rootDir.trim()) {
    warnings.push("Model storage root must be selected before downloading real models.");
    return warnings;
  }

  if (storage.preferNonSystemDrive && isWindowsSystemDrive(storage.rootDir)) {
    warnings.push("C: drive is selected; choose another drive when system disk space is limited.");
  }

  const normalized = storage.rootDir.replaceAll("\\", "/").toLowerCase();
  if (normalized.includes("/ai_cursor_v2/app") || normalized.endsWith("/ai_cursor_v2")) {
    warnings.push("Repository directory is not recommended for large model downloads.");
  }

  return warnings;
}

export function resolveModelArtifactPath(storage: ModelStorageConfig, artifact: ModelDownloadArtifact): string {
  if (!storage.rootDir.trim()) {
    return "";
  }
  if (isAbsolute(artifact.localSubdir)) {
    return artifact.localSubdir;
  }
  return resolve(storage.rootDir, storage.managedSubdir, artifact.localSubdir);
}

export function applyModelStorage(
  binding: WorkflowModelBinding,
  storage: ModelStorageConfig
): WorkflowModelBinding {
  return {
    ...binding,
    executionBrain: applyDownloadsToProvider(binding.executionBrain, storage),
    recordEngine: applyDownloadsToRecordEngine(binding.recordEngine, storage),
    modelStorage: storage
  };
}

function applyDownloadsToProvider(config: ProviderConfig, storage: ModelStorageConfig): ProviderConfig {
  const next: ProviderConfig = { ...config };
  for (const artifact of config.downloads ?? []) {
    next[artifact.target] = resolveModelArtifactPath(storage, artifact);
  }
  return next;
}

function applyDownloadsToRecordEngine(
  config: RecordEngineConfig,
  storage: ModelStorageConfig
): RecordEngineConfig {
  const next: RecordEngineConfig = { ...config };
  for (const artifact of config.downloads ?? []) {
    if (artifact.target === "modelPath") {
      next.modelPath = resolveModelArtifactPath(storage, artifact);
    }
  }
  return next;
}

function isWindowsSystemDrive(rootDir: string): boolean {
  return parse(rootDir).root.toLowerCase().startsWith("c:");
}
