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
  executeRuntimeAction(): Promise<DesktopUiSnapshot>;
  openMainWindow(): Promise<void>;
  hideMainWindow(): Promise<void>;
  resizeOverlay(size: OverlaySize): Promise<void>;
  quitApp(): Promise<void>;

  conversationSnapshot(): Promise<DuplexConversationSnapshot>;
  conversationConnect(): Promise<DuplexConversationSnapshot>;
  conversationUtterance(text: string): Promise<void>;
  conversationBargeIn(): Promise<void>;
  conversationPreempt(intent: SafetyPreemptionIntent): Promise<void>;
  conversationResume(): Promise<void>;
  conversationSetProvider(kind: DuplexProviderKind): Promise<DuplexConversationSnapshot>;
  conversationCheckHealth(): Promise<boolean>;
  onConversationEvent(listener: (event: DuplexRuntimeEvent) => void): () => void;

  modelSnapshot(): Promise<ModelCenterSnapshot>;
  modelProbeEnvironment(): Promise<ModelCenterSnapshot>;
  modelRefreshBackend(): Promise<ModelCenterSnapshot>;
  modelChooseStorageRoot(): Promise<ModelCenterSnapshot>;
  modelPull(model: string): Promise<ModelCenterSnapshot>;
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
  onModelSnapshot(listener: (snapshot: ModelCenterSnapshot) => void): () => void;
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
