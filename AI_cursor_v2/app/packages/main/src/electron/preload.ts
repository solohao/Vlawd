import { contextBridge, ipcRenderer } from "electron";
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

  // ── Cycle 1 真实全双工入口 ──────────────────────────────────────────
  conversationSnapshot(): Promise<DuplexConversationSnapshot>;
  conversationConnect(): Promise<DuplexConversationSnapshot>;
  /** 用户一段发言（文字输入或 ASR 转写）。 */
  conversationUtterance(text: string): Promise<void>;
  /** VAD 检测到用户开口的即时打断信号（掐断 AI 语音输出）。 */
  conversationBargeIn(): Promise<void>;
  /** 本地硬抢占：停/暂停/取消/退回。 */
  conversationPreempt(intent: SafetyPreemptionIntent): Promise<void>;
  conversationResume(): Promise<void>;
  /** 切换热路径 Provider（先 B 后 A）。 */
  conversationSetProvider(kind: DuplexProviderKind): Promise<DuplexConversationSnapshot>;
  /** 探测当前 Provider 连通性（模型中心健康检查/运行）。 */
  conversationCheckHealth(): Promise<boolean>;
  /** 订阅实时 Runtime 事件；返回取消订阅函数。 */
  onConversationEvent(listener: (event: DuplexRuntimeEvent) => void): () => void;

  // ── 模型中心（包装版 Ollama 后端）────────────────────────────────────
  modelSnapshot(): Promise<ModelCenterSnapshot>;
  modelProbeEnvironment(): Promise<ModelCenterSnapshot>;
  modelRefreshBackend(): Promise<ModelCenterSnapshot>;
  modelChooseStorageRoot(): Promise<ModelCenterSnapshot>;
  modelPull(model: string): Promise<ModelCenterSnapshot>;
  modelCancelPull(): Promise<ModelCenterSnapshot>;
  modelRemove(model: string): Promise<ModelCenterSnapshot>;
  modelUseAsBrain(model: string): Promise<ModelCenterSnapshot>;
  /** 切换当前激活的模型后端（ollama / lmstudio / custom）。 */
  modelSetBackend(kind: ModelBackendKind): Promise<ModelCenterSnapshot>;
  /** 配置并检测自定义 OpenAI 兼容端点。 */
  modelSetCustomEndpoint(config: CustomEndpointConfig): Promise<ModelCenterSnapshot>;
  modelOpenStorageLocation(): Promise<void>;
  modelOpenInstallGuide(): Promise<void>;
  /** 订阅模型中心快照（含下载进度）；返回取消订阅函数。 */
  onModelSnapshot(listener: (snapshot: ModelCenterSnapshot) => void): () => void;
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
  quitApp: () => ipcRenderer.invoke("app:quit") as Promise<void>,

  conversationSnapshot: () =>
    ipcRenderer.invoke("conversation:snapshot") as Promise<DuplexConversationSnapshot>,
  conversationConnect: () =>
    ipcRenderer.invoke("conversation:connect") as Promise<DuplexConversationSnapshot>,
  conversationUtterance: (text) => ipcRenderer.invoke("conversation:utterance", text) as Promise<void>,
  conversationBargeIn: () => ipcRenderer.invoke("conversation:bargeIn") as Promise<void>,
  conversationPreempt: (intent) => ipcRenderer.invoke("conversation:preempt", intent) as Promise<void>,
  conversationResume: () => ipcRenderer.invoke("conversation:resume") as Promise<void>,
  conversationSetProvider: (kind) =>
    ipcRenderer.invoke("conversation:setProvider", kind) as Promise<DuplexConversationSnapshot>,
  conversationCheckHealth: () => ipcRenderer.invoke("conversation:checkHealth") as Promise<boolean>,
  onConversationEvent: (listener) => {
    const channel = "conversation:event";
    const handler = (_event: unknown, payload: DuplexRuntimeEvent): void => listener(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  modelSnapshot: () => ipcRenderer.invoke("model:snapshot") as Promise<ModelCenterSnapshot>,
  modelProbeEnvironment: () => ipcRenderer.invoke("model:probe") as Promise<ModelCenterSnapshot>,
  modelRefreshBackend: () => ipcRenderer.invoke("model:refreshBackend") as Promise<ModelCenterSnapshot>,
  modelChooseStorageRoot: () => ipcRenderer.invoke("model:chooseStorageRoot") as Promise<ModelCenterSnapshot>,
  modelPull: (model) => ipcRenderer.invoke("model:pull", model) as Promise<ModelCenterSnapshot>,
  modelCancelPull: () => ipcRenderer.invoke("model:cancelPull") as Promise<ModelCenterSnapshot>,
  modelRemove: (model) => ipcRenderer.invoke("model:remove", model) as Promise<ModelCenterSnapshot>,
  modelUseAsBrain: (model) => ipcRenderer.invoke("model:useAsBrain", model) as Promise<ModelCenterSnapshot>,
  modelSetBackend: (kind) => ipcRenderer.invoke("model:setBackend", kind) as Promise<ModelCenterSnapshot>,
  modelSetCustomEndpoint: (config) =>
    ipcRenderer.invoke("model:setCustomEndpoint", config) as Promise<ModelCenterSnapshot>,
  modelOpenStorageLocation: () => ipcRenderer.invoke("model:openStorageLocation") as Promise<void>,
  modelOpenInstallGuide: () => ipcRenderer.invoke("model:openInstallGuide") as Promise<void>,
  onModelSnapshot: (listener) => {
    const channel = "model:snapshot";
    const handler = (_event: unknown, payload: ModelCenterSnapshot): void => listener(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
};

contextBridge.exposeInMainWorld("aiCursorDesktop", api);
