import type { ActionProposal } from "./action.js";

export type DuplexModelKind = "mock" | "glm-4-voice" | "bayling-duplex" | "personaplex" | "moshi" | "cloud-planner";
export type RecordEngineKind = "rule-jsonl" | "local-lightweight" | "cloud-assisted";
export type ModelRole = "duplex_execution_brain" | "session_record_engine" | "safety_preemption";
export type ModelArtifactSource = "huggingface" | "modelscope" | "local";
export type ModelArtifactTarget = "modelPath" | "speechTokenizerPath" | "speechDecoderPath";
export type ModelRuntimeState = "listening" | "speaking" | "thinking" | "acting" | "waiting_confirm" | "paused" | "interrupted" | "complete";

export interface DuplexModelInput {
  session_id: string;
  user_utterance: string;
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
  generate(input: DuplexModelInput): AsyncIterable<DuplexModelEvent>;
}

export interface ProviderConfig {
  kind: DuplexModelKind;
  endpoint?: string;
  modelPath?: string;
  speechTokenizerPath?: string;
  speechDecoderPath?: string;
  device?: "cpu" | "cuda" | "metal";
  downloads?: ModelDownloadArtifact[];
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
}

export interface DesktopModelPreset {
  id: string;
  name: string;
  description: string;
  recommendedFor: string[];
  binding: WorkflowModelBinding;
}
