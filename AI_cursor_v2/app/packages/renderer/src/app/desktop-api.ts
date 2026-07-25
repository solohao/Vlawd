import type {
  CustomEndpointConfig,
  DesktopUiSnapshot,
  DuplexConversationSnapshot,
  DuplexProviderKind,
  DuplexRuntimeEvent,
  ModelBackendKind,
  ModelCenterSnapshot,
  ModelRole,
  SafetyPreemptionIntent
} from "@ai-cursor-v2/shared";

export interface OverlaySize {
  width: number;
  height: number;
}

export interface AiCursorDesktopApi {
  getSnapshot(): Promise<DesktopUiSnapshot>;
  chooseModelStorageRoot(): Promise<DesktopUiSnapshot>;
  startModelDownload(role: ModelRole): Promise<DesktopUiSnapshot>;
  runHealthCheck(role: ModelRole): Promise<DesktopUiSnapshot>;
  connectAudio(): Promise<DesktopUiSnapshot>;
  pauseSession(): Promise<DesktopUiSnapshot>;
  cancelSession(): Promise<DesktopUiSnapshot>;
  startResearch(goal: string): Promise<DesktopUiSnapshot>;
  executeRuntimeAction(): Promise<DesktopUiSnapshot>;
  finalizeResearch(): Promise<DesktopUiSnapshot>;
  browserOpen(url: string): Promise<DesktopUiSnapshot>;
  browserSearch(query: string): Promise<DesktopUiSnapshot>;
  browserPause(): Promise<DesktopUiSnapshot>;
  browserClose(): Promise<DesktopUiSnapshot>;
  browserSetBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<DesktopUiSnapshot>;
  browserRead(): Promise<{ text: string }>;
  openMainWindow(): Promise<void>;
  hideMainWindow(): Promise<void>;
  resizeOverlay(size: OverlaySize): Promise<void>;
  setOverlayInteractive(interactive: boolean): Promise<void>;
  startOverlayDrag(): Promise<void>;
  endOverlayDrag(): Promise<void>;
  getOverlayBounds(): Promise<{ x: number; y: number; width: number; height: number } | null>;
  quitApp(): Promise<void>;

  conversationSnapshot(): Promise<DuplexConversationSnapshot>;
  conversationConnect(): Promise<DuplexConversationSnapshot>;
  conversationUtterance(text: string): Promise<void>;
  conversationBargeIn(heardText?: string): Promise<void>;
  conversationPreempt(intent: SafetyPreemptionIntent): Promise<void>;
  conversationResume(): Promise<void>;
  conversationSetProvider(kind: DuplexProviderKind): Promise<DuplexConversationSnapshot>;
  conversationCheckHealth(): Promise<boolean>;
  onConversationEvent(listener: (event: DuplexRuntimeEvent) => void): () => void;

  onDesktopSnapshot(listener: (snapshot: DesktopUiSnapshot) => void): () => void;

  modelSnapshot(): Promise<ModelCenterSnapshot>;
  modelProbeEnvironment(): Promise<ModelCenterSnapshot>;
  modelRefreshBackend(): Promise<ModelCenterSnapshot>;
  modelChooseStorageRoot(): Promise<ModelCenterSnapshot>;
  modelPull(model: string): Promise<ModelCenterSnapshot>;
  modelPausePull(model: string): Promise<ModelCenterSnapshot>;
  modelResumePull(model: string): Promise<ModelCenterSnapshot>;
  modelCancelPull(): Promise<ModelCenterSnapshot>;
  modelRemove(model: string): Promise<ModelCenterSnapshot>;
  modelUseAsBrain(model: string): Promise<ModelCenterSnapshot>;
  modelSetBackend(kind: ModelBackendKind): Promise<ModelCenterSnapshot>;
  modelSetCustomEndpoint(config: CustomEndpointConfig): Promise<ModelCenterSnapshot>;
  modelOpenStorageLocation(): Promise<void>;
  modelOpenInstallGuide(): Promise<void>;
  modelDetectOllamaInstaller(): Promise<ModelCenterSnapshot>;
  modelLocateOllamaInstaller(): Promise<ModelCenterSnapshot>;
  modelInstallOllama(): Promise<ModelCenterSnapshot>;
  modelPauseInstallOllama(): Promise<ModelCenterSnapshot>;
  modelResumeInstallOllama(): Promise<ModelCenterSnapshot>;
  onModelSnapshot(listener: (snapshot: ModelCenterSnapshot) => void): () => void;

  // ── 本地语音模型（STT/TTS）──────────────────────────────────────────
  speechGetCatalog(): Promise<SpeechCatalogItem[]>;
  speechGetStatus(): Promise<SpeechModelStatus[]>;
  speechGetActive(): Promise<SpeechActiveConfig>;
  speechSetActive(role: "stt" | "tts", modelId: string | undefined): Promise<SpeechModelStatus[]>;
  speechDownload(modelId: string): Promise<SpeechModelStatus[]>;
  speechCancelDownload(modelId: string): Promise<SpeechModelStatus[]>;
  speechRemove(modelId: string): Promise<SpeechModelStatus[]>;
  speechTranscribe(samples: Float32Array, sampleRate: number): Promise<string>;
  speechSynthesize(text: string): Promise<{ samples: Float32Array; sampleRate: number }>;
}

export type SpeechQuality = "low" | "medium" | "high";

export interface SpeechSttConfig {
  type: "whisper" | "paraformer" | "senseVoice" | "zipformerCtc";
  encoder?: string;
  decoder?: string;
  model?: string;
  tokens: string;
  language?: string;
  task?: string;
  tailPaddings?: number;
}

export interface SpeechTtsConfig {
  type: "vits" | "kokoro";
  model: string;
  tokens: string;
  lexicon?: string;
  dataDir?: string;
  voices?: string;
  ruleFsts?: string[];
  numThreads?: number;
}

export interface SpeechCatalogItem {
  id: string;
  name: string;
  role: "stt" | "tts";
  language: string;
  quality: SpeechQuality;
  archiveUrl: string;
  archiveSizeBytes: number;
  extractedDirName: string;
  approxSizeGB: number;
  memoryRecommendedGB: number;
  description?: string;
  tags?: string[];
  sttConfig?: SpeechSttConfig;
  ttsConfig?: SpeechTtsConfig;
}

export interface SpeechModelStatus extends SpeechCatalogItem {
  installed: boolean;
  downloading: boolean;
  paused?: boolean;
  recommended?: boolean;
  progress?: number;
  error?: string;
}

export interface SpeechActiveConfig {
  stt?: string;
  tts?: string;
}

declare global {
  interface Window {
    aiCursorDesktop: AiCursorDesktopApi;
  }
}

export function desktopApi(): AiCursorDesktopApi {
  if (!window.aiCursorDesktop) {
    throw new Error("AI Cursor desktop preload API is unavailable");
  }
  return window.aiCursorDesktop;
}
