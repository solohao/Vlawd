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
import { isAbsolute, resolve } from "node:path";

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

/** Cycle 1 默认的方案 B 流式管线 Provider（Qwen2.5 via 本地 OpenAI 兼容端点）。 */
export const defaultPipelineProviderConfig: ProviderConfig = {
  kind: "pipeline",
  device: "cuda",
  // Ollama 默认地址；用户可在模型中心改写。未连通时运行时回退离线 Echo。
  endpoint: "http://127.0.0.1:11434/v1",
  pipeline: {
    llmBaseUrl: "http://127.0.0.1:11434/v1",
    llmModel: "qwen2.5:7b-instruct"
  }
};

export const executionBrainCatalog: ProviderConfig[] = [
  defaultPipelineProviderConfig,
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

export function findExecutionBrain(kind: ProviderConfig["kind"]): ProviderConfig {
  const config = executionBrainCatalog.find((candidate) => candidate.kind === kind);
  if (!config) {
    throw new Error(`Unknown execution brain provider: ${kind}`);
  }
  return config;
}

export const desktopModelPresets: DesktopModelPreset[] = [
  {
    id: "zh-real-time-supervision",
    name: "Cycle 1 · 中文流式管线（推荐）",
    description: "方案 B 流式管线（Qwen2.5 via 本地 OpenAI 兼容端点）作为执行大脑，标准记录引擎负责 Session 留痕，4060 可跑。",
    recommendedFor: ["中文语音监督", "Cycle 1 真实全双工入口", "本地优先 MVP"],
    binding: {
      workflow_id: "default",
      executionBrain: findExecutionBrain("pipeline"),
      recordEngine: recordEngineCatalog[0],
      safetyPreemption: defaultSafetyPreemptionConfig,
      modelStorage: defaultModelStorageConfig,
      conversationEndpoint: defaultConversationEndpointPreference
    }
  },
  {
    id: "zh-native-fullduplex",
    name: "方案 A · 原生全双工（候选）",
    description: "BayLing-Duplex 原生全双工作为可切换候选；spike 达标后再设为日常 Baseline。",
    recommendedFor: ["原生 barge-in 验证", "FullDuplexBench 对照", "候选择优"],
    binding: {
      workflow_id: "default",
      executionBrain: findExecutionBrain("bayling-duplex"),
      recordEngine: recordEngineCatalog[0],
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
      executionBrain: findExecutionBrain("mock"),
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
  // 独立于运行平台判断 Windows 系统盘：node:path 在 POSIX 上不会把 "C:/..." 视为盘符根，
  // 因此直接匹配盘符前缀，保证在 Linux/CI 上也能给出正确告警。
  return /^c:[\\/]/i.test(rootDir.trim());
}
