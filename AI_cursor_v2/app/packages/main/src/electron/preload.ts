import { contextBridge, ipcRenderer } from "electron";
import type { DesktopUiSnapshot, ModelRole } from "@ai-cursor-v2/shared";

export interface AiCursorDesktopApi {
  getSnapshot(): Promise<DesktopUiSnapshot>;
  chooseModelStorageRoot(): Promise<DesktopUiSnapshot>;
  startModelDownload(role: ModelRole): Promise<DesktopUiSnapshot>;
  runHealthCheck(role: ModelRole): Promise<DesktopUiSnapshot>;
  connectAudio(): Promise<DesktopUiSnapshot>;
  pauseSession(): Promise<DesktopUiSnapshot>;
  cancelSession(): Promise<DesktopUiSnapshot>;
  executeRuntimeAction(): Promise<DesktopUiSnapshot>;
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
  executeRuntimeAction: () => ipcRenderer.invoke("desktop:executeRuntimeAction") as Promise<DesktopUiSnapshot>
};

contextBridge.exposeInMainWorld("aiCursorDesktop", api);
