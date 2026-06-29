import type { DesktopUiSnapshot, ModelRole } from "@ai-cursor-v2/shared";

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
