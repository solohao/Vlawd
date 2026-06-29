import { contextBridge, ipcRenderer } from "electron";
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

const api: AiCursorDesktopApi = {
  getSnapshot: () => ipcRenderer.invoke("desktop:getSnapshot") as Promise<DesktopUiSnapshot>,
  chooseModelStorageRoot: () =>
    ipcRenderer.invoke("desktop:chooseModelStorageRoot") as Promise<DesktopUiSnapshot>,
  startModelDownload: (role) =>
    ipcRenderer.invoke("desktop:startModelDownload", role) as Promise<DesktopUiSnapshot>,
  runHealthCheck: (role) => ipcRenderer.invoke("desktop:runHealthCheck", role) as Promise<DesktopUiSnapshot>,
  connectAudio: () => ipcRenderer.invoke("desktop:connectAudio") as Promise<DesktopUiSnapshot>,
  pauseSession: () => ipcRenderer.invoke("desktop:pauseSession") as Promise<DesktopUiSnapshot>,
  cancelSession: () => ipcRenderer.invoke("desktop:cancelSession") as Promise<DesktopUiSnapshot>,
  executeRuntimeAction: () => ipcRenderer.invoke("desktop:executeRuntimeAction") as Promise<DesktopUiSnapshot>,
  openMainWindow: () => ipcRenderer.invoke("window:openMain") as Promise<void>,
  hideMainWindow: () => ipcRenderer.invoke("window:hideMain") as Promise<void>,
  resizeOverlay: (size) => ipcRenderer.invoke("overlay:resize", size) as Promise<void>,
  quitApp: () => ipcRenderer.invoke("app:quit") as Promise<void>
};

contextBridge.exposeInMainWorld("aiCursorDesktop", api);
