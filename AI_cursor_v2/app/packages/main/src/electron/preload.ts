import { contextBridge, ipcRenderer } from "electron";
import type { SessionSummary } from "@ai-cursor-v2/shared";
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
  /** 根据研究目标生成只读动作提案。 */
  startResearch(goal: string): Promise<DesktopUiSnapshot>;
  executeRuntimeAction(): Promise<DesktopUiSnapshot>;
  finalizeResearch(): Promise<DesktopUiSnapshot>;
  saveSession(): Promise<DesktopUiSnapshot>;
  listSessions(): Promise<SessionSummary[]>;
  loadSession(id: string): Promise<DesktopUiSnapshot>;
  deleteSession(id: string): Promise<DesktopUiSnapshot>;
  /** 在 Task Workspace 的浏览器容器里打开指定 URL。 */
  browserOpen(url: string): Promise<DesktopUiSnapshot>;
  /** 用默认搜索引擎打开查询词。 */
  browserSearch(query: string): Promise<DesktopUiSnapshot>;
  /** 停止当前 BrowserView 加载。 */
  browserPause(): Promise<DesktopUiSnapshot>;
  /** 关闭 BrowserView。 */
  browserClose(): Promise<DesktopUiSnapshot>;
  /** 设置 BrowserView 在窗口中的位置与大小（来自渲染层 DOM 边界）。 */
  browserSetBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<DesktopUiSnapshot>;
  /** 提取当前页面可见文本。 */
  browserRead(): Promise<{ text: string }>;
  openMainWindow(): Promise<void>;
  hideMainWindow(): Promise<void>;
  resizeOverlay(size: OverlaySize): Promise<void>;
  /** 光标进入/离开吉祥物本体时切换鼠标穿透（true=可点击，false=穿透到桌面）。 */
  setOverlayInteractive(interactive: boolean): Promise<void>;
  /** 开始拖拽：主进程用系统光标坐标定时跟随移动悬浮窗。 */
  startOverlayDrag(): Promise<void>;
  /** 结束拖拽。 */
  endOverlayDrag(): Promise<void>;
  /** 读取悬浮窗当前屏幕边界（拖拽起点用）。 */
  getOverlayBounds(): Promise<{ x: number; y: number; width: number; height: number } | null>;
  quitApp(): Promise<void>;

  // ── Cycle 1 真实全双工入口 ──────────────────────────────────────────
  conversationSnapshot(): Promise<DuplexConversationSnapshot>;
  conversationConnect(): Promise<DuplexConversationSnapshot>;
  /** 用户一段发言（文字输入或 ASR 转写）。 */
  conversationUtterance(text: string): Promise<void>;
  /** VAD 检测到用户开口的即时打断信号（掐断 AI 语音输出）；heardText=已听到文本。 */
  conversationBargeIn(heardText?: string): Promise<void>;
  /** 本地硬抢占：停/暂停/取消/退回。 */
  conversationPreempt(intent: SafetyPreemptionIntent): Promise<void>;
  conversationResume(): Promise<void>;
  /** 切换热路径 Provider（先 B 后 A）。 */
  conversationSetProvider(kind: DuplexProviderKind): Promise<DuplexConversationSnapshot>;
  /** 探测当前 Provider 连通性（模型中心健康检查/运行）。 */
  conversationCheckHealth(): Promise<boolean>;
  /** 订阅实时 Runtime 事件；返回取消订阅函数。 */
  onConversationEvent(listener: (event: DuplexRuntimeEvent) => void): () => void;

  /** 报告当前麦克风输入强度（VAD 语音概率）到主进程，由主进程广播给悬浮窗。 */
  setMicLevel(level: number): Promise<void>;
  /** 订阅麦克风输入强度；返回取消订阅函数。 */
  onMicLevel(listener: (level: number) => void): () => void;

  /** 订阅桌面运行时快照；返回取消订阅函数。 */
  onDesktopSnapshot(listener: (snapshot: DesktopUiSnapshot) => void): () => void;

  // ── 模型中心（包装版 Ollama 后端）────────────────────────────────────
  modelSnapshot(): Promise<ModelCenterSnapshot>;
  modelProbeEnvironment(): Promise<ModelCenterSnapshot>;
  modelRefreshBackend(): Promise<ModelCenterSnapshot>;
  /** 重新扫描当前模型存储目录，App 托管的 Ollama 会重启以读取新位置。 */
  modelRescanStorage(): Promise<ModelCenterSnapshot>;
  modelChooseStorageRoot(): Promise<ModelCenterSnapshot>;
  modelPull(model: string): Promise<ModelCenterSnapshot>;
  modelPausePull(model: string): Promise<ModelCenterSnapshot>;
  modelResumePull(model: string): Promise<ModelCenterSnapshot>;
  modelCancelPull(): Promise<ModelCenterSnapshot>;
  modelRemove(model: string): Promise<ModelCenterSnapshot>;
  modelUseAsBrain(model: string): Promise<ModelCenterSnapshot>;
  /** 切换当前激活的模型后端（ollama / lmstudio / custom）。 */
  modelSetBackend(kind: ModelBackendKind): Promise<ModelCenterSnapshot>;
  /** 配置并检测自定义 OpenAI 兼容端点。 */
  modelSetCustomEndpoint(config: CustomEndpointConfig): Promise<ModelCenterSnapshot>;
  modelOpenStorageLocation(): Promise<void>;
  modelOpenInstallGuide(): Promise<void>;
  /** 检测代管安装 Ollama 的状态（是否已安装 / 本机是否已有安装器）。 */
  modelDetectOllamaInstaller(): Promise<ModelCenterSnapshot>;
  /** 让用户手动指定 Ollama 安装器（OllamaSetup.exe）。 */
  modelLocateOllamaInstaller(): Promise<ModelCenterSnapshot>;
  /** 选择安装目录并静默安装 Ollama（一键安装）。 */
  modelInstallOllama(): Promise<ModelCenterSnapshot>;
  modelPauseInstallOllama(): Promise<ModelCenterSnapshot>;
  modelResumeInstallOllama(): Promise<ModelCenterSnapshot>;
  /** 订阅模型中心快照（含下载进度）；返回取消订阅函数。 */
  onModelSnapshot(listener: (snapshot: ModelCenterSnapshot) => void): () => void;

  // ── 本地语音模型（STT/TTS）──────────────────────────────────────────
  speechGetCatalog(): Promise<any>;
  speechGetStatus(): Promise<any>;
  speechGetActive(): Promise<any>;
  speechSetActive(role: "stt" | "tts", modelId: string | undefined): Promise<any>;
  speechDownload(modelId: string): Promise<any>;
  speechCancelDownload(modelId: string): Promise<any>;
  speechRemove(modelId: string): Promise<any>;
  speechTranscribe(samples: Float32Array, sampleRate: number): Promise<string>;
  speechSynthesize(text: string): Promise<{ samples: Float32Array; sampleRate: number }>;
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
  startResearch: (goal: string) => ipcRenderer.invoke("desktop:startResearch", goal) as Promise<DesktopUiSnapshot>,
  executeRuntimeAction: () => ipcRenderer.invoke("desktop:executeRuntimeAction") as Promise<DesktopUiSnapshot>,
  finalizeResearch: () => ipcRenderer.invoke("desktop:finalizeResearch") as Promise<DesktopUiSnapshot>,
  saveSession: () => ipcRenderer.invoke("desktop:saveSession") as Promise<DesktopUiSnapshot>,
  listSessions: () => ipcRenderer.invoke("desktop:listSessions") as Promise<SessionSummary[]>,
  loadSession: (id: string) => ipcRenderer.invoke("desktop:loadSession", id) as Promise<DesktopUiSnapshot>,
  deleteSession: (id: string) => ipcRenderer.invoke("desktop:deleteSession", id) as Promise<DesktopUiSnapshot>,
  browserOpen: (url: string) => ipcRenderer.invoke("browser:open", url) as Promise<DesktopUiSnapshot>,
  browserSearch: (query: string) => ipcRenderer.invoke("browser:search", query) as Promise<DesktopUiSnapshot>,
  browserPause: () => ipcRenderer.invoke("browser:pause") as Promise<DesktopUiSnapshot>,
  browserClose: () => ipcRenderer.invoke("browser:close") as Promise<DesktopUiSnapshot>,
  browserSetBounds: (bounds) => ipcRenderer.invoke("browser:setBounds", bounds) as Promise<DesktopUiSnapshot>,
  browserRead: () => ipcRenderer.invoke("browser:read") as Promise<{ text: string }>,
  openMainWindow: () => ipcRenderer.invoke("window:openMain") as Promise<void>,
  hideMainWindow: () => ipcRenderer.invoke("window:hideMain") as Promise<void>,
  resizeOverlay: (size) => ipcRenderer.invoke("overlay:resize", size) as Promise<void>,
  setOverlayInteractive: (interactive) =>
    ipcRenderer.invoke("overlay:setInteractive", interactive) as Promise<void>,
  startOverlayDrag: () => ipcRenderer.invoke("overlay:dragStart") as Promise<void>,
  endOverlayDrag: () => ipcRenderer.invoke("overlay:dragEnd") as Promise<void>,
  getOverlayBounds: () =>
    ipcRenderer.invoke("overlay:getBounds") as Promise<
      { x: number; y: number; width: number; height: number } | null
    >,
  quitApp: () => ipcRenderer.invoke("app:quit") as Promise<void>,

  conversationSnapshot: () =>
    ipcRenderer.invoke("conversation:snapshot") as Promise<DuplexConversationSnapshot>,
  conversationConnect: () =>
    ipcRenderer.invoke("conversation:connect") as Promise<DuplexConversationSnapshot>,
  conversationUtterance: (text) => ipcRenderer.invoke("conversation:utterance", text) as Promise<void>,
  conversationBargeIn: (heardText) => ipcRenderer.invoke("conversation:bargeIn", heardText) as Promise<void>,
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
  setMicLevel: (level) => ipcRenderer.invoke("mic:level", level) as Promise<void>,
  onMicLevel: (listener) => {
    const channel = "mic:level";
    const handler = (_event: unknown, level: number): void => listener(level);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onDesktopSnapshot: (listener) => {
    const channel = "desktop:snapshot";
    const handler = (_event: unknown, payload: DesktopUiSnapshot): void => listener(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  modelSnapshot: () => ipcRenderer.invoke("model:snapshot") as Promise<ModelCenterSnapshot>,
  modelProbeEnvironment: () => ipcRenderer.invoke("model:probe") as Promise<ModelCenterSnapshot>,
  modelRefreshBackend: () => ipcRenderer.invoke("model:refreshBackend") as Promise<ModelCenterSnapshot>,
  modelRescanStorage: () => ipcRenderer.invoke("model:rescanStorage") as Promise<ModelCenterSnapshot>,
  modelChooseStorageRoot: () => ipcRenderer.invoke("model:chooseStorageRoot") as Promise<ModelCenterSnapshot>,
  modelPull: (model) => ipcRenderer.invoke("model:pull", model) as Promise<ModelCenterSnapshot>,
  modelPausePull: (model) => ipcRenderer.invoke("model:pausePull", model) as Promise<ModelCenterSnapshot>,
  modelResumePull: (model) => ipcRenderer.invoke("model:resumePull", model) as Promise<ModelCenterSnapshot>,
  modelCancelPull: () => ipcRenderer.invoke("model:cancelPull") as Promise<ModelCenterSnapshot>,
  modelRemove: (model) => ipcRenderer.invoke("model:remove", model) as Promise<ModelCenterSnapshot>,
  modelUseAsBrain: (model) => ipcRenderer.invoke("model:useAsBrain", model) as Promise<ModelCenterSnapshot>,
  modelSetBackend: (kind) => ipcRenderer.invoke("model:setBackend", kind) as Promise<ModelCenterSnapshot>,
  modelSetCustomEndpoint: (config) =>
    ipcRenderer.invoke("model:setCustomEndpoint", config) as Promise<ModelCenterSnapshot>,
  modelOpenStorageLocation: () => ipcRenderer.invoke("model:openStorageLocation") as Promise<void>,
  modelOpenInstallGuide: () => ipcRenderer.invoke("model:openInstallGuide") as Promise<void>,
  modelDetectOllamaInstaller: () =>
    ipcRenderer.invoke("model:detectInstaller") as Promise<ModelCenterSnapshot>,
  modelLocateOllamaInstaller: () =>
    ipcRenderer.invoke("model:locateInstaller") as Promise<ModelCenterSnapshot>,
  modelInstallOllama: () => ipcRenderer.invoke("model:installOllama") as Promise<ModelCenterSnapshot>,
  modelPauseInstallOllama: () => ipcRenderer.invoke("model:pauseInstallOllama") as Promise<ModelCenterSnapshot>,
  modelResumeInstallOllama: () => ipcRenderer.invoke("model:resumeInstallOllama") as Promise<ModelCenterSnapshot>,
  onModelSnapshot: (listener) => {
    const channel = "model:snapshot";
    const handler = (_event: unknown, payload: ModelCenterSnapshot): void => listener(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // ── 本地语音模型（STT/TTS）──────────────────────────────────────────
  speechGetCatalog: () => ipcRenderer.invoke("speech:getCatalog") as Promise<any>,
  speechGetStatus: () => ipcRenderer.invoke("speech:getStatus") as Promise<any>,
  speechGetActive: () => ipcRenderer.invoke("speech:getActive") as Promise<any>,
  speechSetActive: (role, modelId) =>
    ipcRenderer.invoke("speech:setActive", role, modelId) as Promise<any>,
  speechDownload: (modelId) => ipcRenderer.invoke("speech:download", modelId) as Promise<any>,
  speechCancelDownload: (modelId) => ipcRenderer.invoke("speech:cancelDownload", modelId) as Promise<any>,
  speechRemove: (modelId) => ipcRenderer.invoke("speech:remove", modelId) as Promise<any>,
  speechTranscribe: (samples, sampleRate) =>
    ipcRenderer.invoke("speech:transcribe", samples, sampleRate) as Promise<string>,
  speechSynthesize: (text) =>
    ipcRenderer.invoke("speech:synthesize", text) as Promise<{ samples: Float32Array; sampleRate: number }>
};

contextBridge.exposeInMainWorld("aiCursorDesktop", api);
