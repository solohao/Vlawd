import type {
  AudioDeviceDescriptor,
  ConversationEndpointRoute,
  DuplexAudioSessionEvent
} from "./audio.js";
import type { ModelRole, ModelRuntimeState, WorkflowModelBinding } from "./model.js";
import type { ActionResult, SafetyLevel } from "./action.js";
import type { SessionGraphSnapshot, SessionRun } from "./session.js";

export type DesktopModelDownloadStatus =
  | "not_selected"
  | "ready_to_download"
  | "downloading"
  | "downloaded"
  | "healthy"
  | "failed";

export interface DesktopModelDownloadState {
  role: ModelRole;
  label: string;
  provider: string;
  status: DesktopModelDownloadStatus;
  progress: number;
  localPath?: string;
  message: string;
}

export type DesktopHealthState = "not_checked" | "checking" | "healthy" | "failed";

export interface DesktopModelHealthCheck {
  role: ModelRole;
  state: DesktopHealthState;
  endpoint?: string;
  lastCheckedAt?: string;
  message: string;
}

export interface DesktopAudioRuntimeState {
  devices: AudioDeviceDescriptor[];
  route: ConversationEndpointRoute;
  sessionEvents: DuplexAudioSessionEvent[];
  connected: boolean;
  message: string;
}

export interface DesktopRuntimeActionState {
  actionType: string;
  targetLabel: string;
  value: string;
  reason: string;
  riskLevel: SafetyLevel;
  countdownSeconds?: number;
}

export interface DesktopBrowserRuntimeState {
  url: string;
  title: string;
  nextAction: DesktopRuntimeActionState;
  lastResult?: ActionResult;
}

export interface DesktopUiSnapshot {
  generatedAt: string;
  theme: "light" | "dark";
  runtimeState: ModelRuntimeState;
  modelBinding: WorkflowModelBinding;
  modelDownloads: DesktopModelDownloadState[];
  healthChecks: DesktopModelHealthCheck[];
  audio: DesktopAudioRuntimeState;
  browser: DesktopBrowserRuntimeState;
  session: SessionRun;
  graph: SessionGraphSnapshot;
}
