import type { ActionProposal } from "./action.js";
import type { ConversationEndpointPreference } from "./audio.js";

export type DuplexModelKind = "mock" | "pipeline" | "glm-4-voice" | "bayling-duplex" | "personaplex" | "moshi" | "cloud-planner";
export type RecordEngineKind = "rule-jsonl" | "local-lightweight" | "cloud-assisted";
export type ModelRole = "duplex_execution_brain" | "session_record_engine" | "safety_preemption";
export type ModelArtifactSource = "huggingface" | "modelscope" | "local";
export type ModelArtifactTarget = "modelPath" | "speechTokenizerPath" | "speechDecoderPath";
export type ModelRuntimeState = "listening" | "speaking" | "thinking" | "acting" | "waiting_confirm" | "paused" | "interrupted" | "complete";

/** 一轮已完成的对话，作为多轮上下文喂给 Provider。 */
export interface DuplexHistoryTurn {
  role: "user" | "assistant";
  content: string;
  /** 该助手回合是否被用户自然插话打断（只保留“用户实际听到的部分”）。 */
  interrupted?: boolean;
}

export interface DuplexModelInput {
  session_id: string;
  user_utterance: string;
  /** 之前回合的对话历史（不含本次 user_utterance），用于多轮连续与“按新约束继续”。 */
  history?: DuplexHistoryTurn[];
  screen_summary?: string;
  candidates?: string[];
}

export type DuplexModelEvent =
  | {
      type: "speech";
      text: string;
    }
  | {
      type: "state";
      state: ModelRuntimeState;
    }
  | {
      type: "action_proposal";
      proposal: ActionProposal;
    }
  | {
      type: "uncertainty";
      reason: string;
      confidence: number;
    };

export interface DuplexModelProvider {
  readonly kind: DuplexModelKind;
  /**
   * `signal` 允许运行时在用户自然插话或本地抢占时取消当前生成；实现应把它透传到
   * 底层推理请求。未实现取消的 Provider 可忽略该参数。
   */
  generate(input: DuplexModelInput, signal?: AbortSignal): AsyncIterable<DuplexModelEvent>;
  /** 可选：轻量连通性检查，用于模型中心的健康检查/运行按钮。 */
  healthCheck?(signal?: AbortSignal): Promise<boolean>;
  /** 可选：Provider 是否连接真实推理（false = 离线回退，不能作为 Cycle 1 通过证据）。 */
  readonly usingRealInference?: boolean;
}

export interface ProviderConfig {
  kind: DuplexModelKind;
  endpoint?: string;
  modelPath?: string;
  speechTokenizerPath?: string;
  speechDecoderPath?: string;
  device?: "cpu" | "cuda" | "metal";
  downloads?: ModelDownloadArtifact[];
  /**
   * 方案 B 流式管线的子组件配置。LLM 走 OpenAI 兼容本地端点（Ollama / LM Studio /
   * llama.cpp server），ASR/TTS 可选外挂本地服务；未填写则运行时使用离线回退。
   */
  pipeline?: PipelineProviderConfig;
}

export interface PipelineProviderConfig {
  /** OpenAI 兼容的 chat/completions 基础地址，例如 http://127.0.0.1:11434/v1 (Ollama)。 */
  llmBaseUrl?: string;
  llmModel?: string;
  llmApiKey?: string;
  systemPrompt?: string;
  /** 可选：本地流式 ASR（whisper 服务）地址，Cycle 1 未配置时 mic 走浏览器识别或文字。 */
  asrEndpoint?: string;
  /** 可选：本地 TTS（piper 等）地址，未配置时渲染层使用系统 SpeechSynthesis 发声。 */
  ttsEndpoint?: string;
}

export interface RecordEngineConfig {
  kind: RecordEngineKind;
  modelPath?: string;
  endpoint?: string;
  device?: "cpu" | "cuda" | "metal";
  storage: "jsonl" | "sqlite";
  enableWorkflowMining: boolean;
  downloads?: ModelDownloadArtifact[];
}

export interface ModelDownloadArtifact {
  source: ModelArtifactSource;
  repo: string;
  target: ModelArtifactTarget;
  localSubdir: string;
  requiresLicenseAcceptance?: boolean;
}

export interface ModelStorageConfig {
  rootDir: string;
  managedSubdir: string;
  preferNonSystemDrive: boolean;
  source: "user-selected" | "environment" | "default";
}

export interface SafetyPreemptionConfig {
  role: "safety_preemption";
  engine: "local-rule-engine";
  locked: true;
  keywords: string[];
}

export interface WorkflowModelBinding {
  workflow_id: string;
  executionBrain: ProviderConfig;
  recordEngine: RecordEngineConfig;
  safetyPreemption: SafetyPreemptionConfig;
  modelStorage?: ModelStorageConfig;
  conversationEndpoint?: ConversationEndpointPreference;
}

export interface DesktopModelPreset {
  id: string;
  name: string;
  description: string;
  recommendedFor: string[];
  binding: WorkflowModelBinding;
}
