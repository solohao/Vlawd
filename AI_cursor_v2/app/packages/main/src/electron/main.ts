import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, screen, session, shell } from "electron";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type {
  CustomEndpointConfig,
  DesktopUiSnapshot,
  DuplexProviderKind,
  DuplexRuntimeEvent,
  ModelBackendKind,
  ModelCenterSnapshot,
  ModelRole,
  SafetyPreemptionIntent
} from "@ai-cursor-v2/shared";
import { DesktopRuntime, isResearchIntent } from "../desktop/desktop-runtime.js";
import { DuplexConversationRuntime } from "../runtime/duplex-runtime.js";
import { createProvider } from "../model/provider-registry.js";
import { defaultPipelineProviderConfig, findExecutionBrain } from "../model/dual-role-config.js";
import { ModelCenterService } from "../model/model-center-service.js";
import { SpeechModelService } from "../model/speech-model-service.js";
import { JsonlSessionStorage } from "../session/jsonl-storage.js";
import { initAutoUpdater, checkForUpdatesManually } from "./auto-updater.js";
import { BrowserService } from "../browser/browser-service.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
// currentDir = <app>/packages/main/dist/packages/main/src/electron → up 7 = <app>
// 打包后 currentDir 位于 resources/app.asar 内，同样的向上层级指向 asar 根，
// 渲染层与图标资源仍能从 asar 内读取；仅可写的用户数据目录需要改用系统标准位置。
const appRoot = resolve(currentDir, "../../../../../../..");
const browserService = new BrowserService();
const runtime = new DesktopRuntime({ browserService });

if (!app.isPackaged) {
  // 开发模式：把用户数据放在仓库内，便于查看生成的 Session JSONL。
  app.setPath("userData", join(appRoot, ".electron-user-data"));
}
// 打包运行时沿用 Electron 默认 userData（系统可写目录）。
const userDataDir = app.getPath("userData");
mkdirSync(userDataDir, { recursive: true });

// ── Cycle 1 真实全双工入口运行时 ─────────────────────────────────────
// 方案 B（pipeline）作为固定 Provider 先跑；方案 A（bayling-duplex）登记为可切换候选。
const sessionLogPath = join(userDataDir, "sessions", `duplex_${Date.now()}.jsonl`);
const duplexRuntime = new DuplexConversationRuntime({
  provider: createProvider(defaultPipelineProviderConfig),
  candidateProviders: [createProvider(findExecutionBrain("bayling-duplex"))],
  storage: new JsonlSessionStorage(sessionLogPath)
});

function broadcastConversationEvent(event: DuplexRuntimeEvent): void {
  for (const window of [mainWindow, overlayWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send("conversation:event", event);
    }
  }
}
duplexRuntime.on(broadcastConversationEvent);

// ── 模型中心：包装版 Ollama 后端 + 环境探测 + 存储配置 ─────────────────
const managedBinaryDir = join(userDataDir, "ollama-bin");
const modelCenter = new ModelCenterService({ runtime: duplexRuntime, managedBinaryDir });
function broadcastModelCenter(snapshot: ModelCenterSnapshot): void {
  for (const window of [mainWindow, overlayWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send("model:snapshot", snapshot);
    }
  }
}
modelCenter.on(broadcastModelCenter);
runtime.setPlannerLlm(() => modelCenter.getActiveBrainLlm());
// 启动后自动刷新后端并尝试恢复上一次选中的执行大脑。
setTimeout(() => void modelCenter.refreshBackend().catch(() => undefined), 2000);

// ── 本地语音模型（STT/TTS）服务 ───────────────────────────────────────
const speechService = new SpeechModelService();
function refreshSpeechModelsDir(): void {
  speechService.setModelsDir(modelCenter.getModelsDir() ?? "");
}
refreshSpeechModelsDir();

const OVERLAY_MARGIN = 24;
const OVERLAY_DEFAULT = { width: 208, height: 84 };

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayDragTimer: ReturnType<typeof setInterval> | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function preloadPath(): string {
  return join(currentDir, "preload.js");
}

async function loadView(window: BrowserWindow, view: "main" | "runtime"): Promise<void> {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    const base = devUrl.endsWith("/") ? devUrl : `${devUrl}/`;
    await window.loadURL(`${base}#/${view}`);
  } else {
    await window.loadFile(join(appRoot, "dist/renderer/index.html"), { hash: `/${view}` });
  }
}

function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: "AI Cursor V2",
    backgroundColor: "#0e1210",
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  void loadView(window, "main");

  // 把浏览器视图服务绑定到主窗口，由渲染层通过 bounds 消息定位
  browserService.setMainWindow(window);

  // 主窗口与悬浮窗是互斥的两种形态：最小化 / 关闭主窗口都收起到浅色胶囊悬浮窗，
  // 而不是让两个窗口同时可见。真正退出走托盘。
  window.on("minimize", () => {
    // 'minimize' 不可取消：先让系统最小化，再隐藏主窗口并切到浅色胶囊悬浮窗，
    // 两者互斥可见，避免留在任务栏。
    if (!isQuitting) {
      showOverlay();
    }
  });
  window.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      showOverlay();
    }
  });
  window.on("closed", () => {
    mainWindow = null;
  });

  mainWindow = window;
  return window;
}

/** 显示主窗口并收起悬浮窗（两者互斥）。 */
function showMainWindow(): BrowserWindow {
  const window = createMainWindow();
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
  return window;
}

/** 显示浅色胶囊悬浮窗并隐藏主窗口（两者互斥）。 */
function showOverlay(): BrowserWindow {
  const overlay = createOverlayWindow();
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    mainWindow.hide();
  }
  overlay.show();
  return overlay;
}

function positionOverlayTopRight(window: BrowserWindow): void {
  const { workArea } = screen.getPrimaryDisplay();
  const [width, height] = window.getSize();
  window.setPosition(
    workArea.x + workArea.width - width - OVERLAY_MARGIN,
    workArea.y + OVERLAY_MARGIN
  );
}

function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }
  const window = new BrowserWindow({
    width: OVERLAY_DEFAULT.width,
    height: OVERLAY_DEFAULT.height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // 默认整窗鼠标穿透（forward 保留 hover 事件）：只有光标落在吉祥物不规则区域内时，
  // 渲染层才通过 overlay:setInteractive 临时关闭穿透，从而实现"只有精灵本体可交互"。
  window.setIgnoreMouseEvents(true, { forward: true });
  void loadView(window, "runtime");
  window.once("ready-to-show", () => positionOverlayTopRight(window));
  window.on("closed", () => {
    overlayWindow = null;
  });

  overlayWindow = window;
  return window;
}

function createTray(): void {
  let image = nativeImage.createEmpty();
  const iconPath = join(appRoot, "packages/renderer/assets/ai-employee-avatar-compact.png");
  if (existsSync(iconPath)) {
    const loaded = nativeImage.createFromPath(iconPath);
    if (!loaded.isEmpty()) {
      image = loaded.resize({ width: 18, height: 18 });
    }
  }
  tray = new Tray(image);
  tray.setToolTip("AI Cursor V2");
  const showMain = (): void => {
    showMainWindow();
  };
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开主界面", click: showMain },
      { label: "收起到悬浮窗", click: () => showOverlay() },
      { type: "separator" },
      {
        label: "检查更新…",
        click: () => checkForUpdatesManually(() => mainWindow)
      },
      { type: "separator" },
      {
        label: "退出 AI Cursor",
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
  tray.on("click", showMain);
}

function broadcastDesktopSnapshot(snapshot: DesktopUiSnapshot): void {
  for (const window of [mainWindow, overlayWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send("desktop:snapshot", snapshot);
    }
  }
}

browserService.onUpdate(() => broadcastDesktopSnapshot(runtime.getSnapshot()));
runtime.onUpdate((snapshot) => broadcastDesktopSnapshot(snapshot));

async function handleDesktop<T>(action: () => T | Promise<T>): Promise<T> {
  const result = await action();
  if (result && typeof result === "object" && "generatedAt" in result) {
    broadcastDesktopSnapshot((result as unknown) as DesktopUiSnapshot);
  }
  return result;
}

ipcMain.handle("desktop:getSnapshot", () => handleDesktop(() => runtime.getSnapshot()));

ipcMain.handle("desktop:chooseModelStorageRoot", async () => {
  const result = await dialog.showOpenDialog({
    title: "选择 AI Cursor V2 模型下载目录",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return handleDesktop(() => runtime.getSnapshot());
  }
  return handleDesktop(() => runtime.selectModelStorageRoot(result.filePaths[0]));
});

ipcMain.handle("desktop:startModelDownload", (_event, role: ModelRole) =>
  handleDesktop(() => runtime.startModelDownload(role))
);
ipcMain.handle("desktop:runHealthCheck", (_event, role: ModelRole) =>
  handleDesktop(() => runtime.runHealthCheck(role))
);
ipcMain.handle("desktop:connectAudio", () => handleDesktop(() => runtime.connectAudio()));
ipcMain.handle("desktop:pauseSession", () => handleDesktop(() => runtime.pauseSession()));
ipcMain.handle("desktop:cancelSession", () => handleDesktop(() => runtime.cancelSession()));
ipcMain.handle("desktop:startResearch", (_event, goal: string) =>
  handleDesktop(() => runtime.startResearch(goal))
);
ipcMain.handle("desktop:executeRuntimeAction", () => handleDesktop(() => runtime.executeRuntimeAction()));

// ── BrowserView 研究任务通道 ───────────────────────────────────────
ipcMain.handle("browser:open", (_event, url: string) => {
  void browserService.open(url).catch(() => undefined);
  return runtime.getSnapshot();
});
ipcMain.handle("browser:search", (_event, query: string) => {
  void browserService.search(query).catch(() => undefined);
  return runtime.getSnapshot();
});
ipcMain.handle("browser:pause", () => {
  browserService.pause();
  return runtime.getSnapshot();
});
ipcMain.handle("browser:close", () => {
  browserService.close();
  return runtime.getSnapshot();
});
ipcMain.handle("browser:setBounds", (_event, bounds: { x: number; y: number; width: number; height: number }) => {
  browserService.setBounds(bounds);
  return runtime.getSnapshot();
});
ipcMain.handle("browser:read", async () => {
  const text = await browserService.readVisibleText().catch(() => "");
  return { text };
});

// ── Cycle 1 会话通道 ────────────────────────────────────────────────
ipcMain.handle("conversation:snapshot", () => duplexRuntime.getSnapshot());
ipcMain.handle("conversation:connect", () => duplexRuntime.connect());
ipcMain.handle("conversation:utterance", async (_event, text: string) => {
  // 先完成对话回合，若属于研究意图再取消当前研究并重新规划。
  await duplexRuntime.submitUtterance(text);
  if (isResearchIntent(text)) {
    await runtime.bargeIn(text);
  }
});
ipcMain.handle("conversation:bargeIn", async (_event, heardText?: string) => {
  // 插话时同时中断桌面研究任务的当前动作，并允许根据新指令重新规划。
  await runtime.bargeIn(heardText);
  return duplexRuntime.bargeIn(heardText);
});
ipcMain.handle("conversation:preempt", (_event, intent: SafetyPreemptionIntent) => duplexRuntime.preempt(intent));
ipcMain.handle("conversation:resume", () => duplexRuntime.resume());
ipcMain.handle("conversation:setProvider", (_event, kind: DuplexProviderKind) =>
  duplexRuntime.setActiveProvider(kind)
);
ipcMain.handle("conversation:checkHealth", () => duplexRuntime.checkProviderHealth());

// ── 模型中心通道 ────────────────────────────────────────────────────
ipcMain.handle("model:snapshot", () => modelCenter.getSnapshot());
ipcMain.handle("model:probe", () => modelCenter.probe());
ipcMain.handle("model:refreshBackend", () => modelCenter.refreshBackend());
ipcMain.handle("model:chooseStorageRoot", async () => {
  const currentRoot = modelCenter.getSnapshot().storage.rootDir;
  const result = await dialog.showOpenDialog({
    title: "选择模型存储父目录（将在其下自动创建 models 文件夹）",
    defaultPath: currentRoot || undefined,
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return modelCenter.getSnapshot();
  }
  return modelCenter.setStorageRoot(result.filePaths[0]);
});
ipcMain.handle("model:pull", (_event, model: string) => modelCenter.pull(model));
ipcMain.handle("model:pausePull", (_event, model: string) => modelCenter.pausePull(model));
ipcMain.handle("model:resumePull", (_event, model: string) => modelCenter.resumePull(model));
ipcMain.handle("model:cancelPull", () => modelCenter.cancelPull());
ipcMain.handle("model:remove", (_event, model: string) => modelCenter.removeModel(model));
ipcMain.handle("model:useAsBrain", (_event, model: string) => modelCenter.useModelAsBrain(model));
ipcMain.handle("model:setBackend", (_event, kind: ModelBackendKind) => modelCenter.setBackend(kind));
ipcMain.handle("model:setCustomEndpoint", (_event, config: CustomEndpointConfig) =>
  modelCenter.setCustomEndpoint(config)
);
ipcMain.handle("model:openStorageLocation", async () => {
  const dir = modelCenter.getModelsDir();
  if (dir) {
    await shell.openPath(dir);
  }
});
ipcMain.handle("model:openInstallGuide", () => shell.openExternal(modelCenter.getInstallGuidanceUrl()));

ipcMain.handle("model:detectInstaller", () => modelCenter.detectOllamaInstaller());

ipcMain.handle("model:locateInstaller", async () => {
  const result = await dialog.showOpenDialog({
    title: "选择 Ollama 安装器（OllamaSetup.exe）",
    properties: ["openFile"],
    filters: [{ name: "安装程序", extensions: ["exe"] }]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return modelCenter.getSnapshot();
  }
  return modelCenter.setInstallerPath(result.filePaths[0]);
});

ipcMain.handle("model:installOllama", () => modelCenter.installOllama());
ipcMain.handle("model:pauseInstallOllama", () => modelCenter.pauseInstallOllama());
ipcMain.handle("model:resumeInstallOllama", () => modelCenter.resumeInstallOllama());

// ── 本地语音模型（STT/TTS）通道 ────────────────────────────────────────
function ensureSpeechModelsDir(): void {
  refreshSpeechModelsDir();
}

ipcMain.handle("speech:getCatalog", () => {
  ensureSpeechModelsDir();
  return speechService.getCatalog();
});
ipcMain.handle("speech:getStatus", () => {
  ensureSpeechModelsDir();
  return speechService.getStatus();
});
ipcMain.handle("speech:getActive", () => {
  ensureSpeechModelsDir();
  return speechService.getActive();
});
ipcMain.handle("speech:setActive", (_event, role: "stt" | "tts", modelId: string | undefined) => {
  ensureSpeechModelsDir();
  speechService.setActive(role, modelId);
  return speechService.getStatus();
});
ipcMain.handle("speech:download", async (_event, modelId: string) => {
  ensureSpeechModelsDir();
  await speechService.download(modelId);
  return speechService.getStatus();
});
ipcMain.handle("speech:cancelDownload", (_event, modelId: string) => {
  speechService.cancelDownload(modelId);
  return speechService.getStatus();
});
ipcMain.handle("speech:remove", async (_event, modelId: string) => {
  ensureSpeechModelsDir();
  await speechService.remove(modelId);
  return speechService.getStatus();
});
ipcMain.handle("speech:transcribe", async (_event, samples: Float32Array, sampleRate: number) => {
  ensureSpeechModelsDir();
  // IPC 结构克隆可能把 Float32Array 恢复为普通对象，保险起见重建。
  if (Array.isArray(samples)) {
    samples = new Float32Array(samples);
  } else if (samples && !(samples instanceof Float32Array) && (samples as any).length !== undefined) {
    samples = new Float32Array(Object.values(samples));
  }
  return speechService.transcribe(samples, sampleRate);
});
ipcMain.handle("speech:synthesize", async (_event, text: string) => {
  ensureSpeechModelsDir();
  return speechService.synthesize(text);
});

ipcMain.handle("window:openMain", () => {
  showMainWindow();
});

ipcMain.handle("window:hideMain", () => {
  showOverlay();
});

ipcMain.handle("overlay:resize", (_event, size: { width: number; height: number }) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }
  const bounds = overlayWindow.getBounds();
  const width = Math.max(80, Math.round(size.width));
  const height = Math.max(48, Math.round(size.height));
  // keep the window anchored by its right edge so it grows toward the screen interior
  overlayWindow.setBounds({ x: bounds.x + bounds.width - width, y: bounds.y, width, height });
});

// 光标进入/离开吉祥物本体时切换鼠标穿透：true=可点击，false=穿透到桌面。
ipcMain.handle("overlay:setInteractive", (_event, interactive: boolean) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }
  overlayWindow.setIgnoreMouseEvents(!interactive, { forward: true });
});

// 自定义拖拽：按下后主进程用系统光标坐标定时跟随移动悬浮窗。
// 不依赖渲染层转发的 mousemove（一旦穿透切换会丢事件），可拖到桌面任意位置。
function stopOverlayDrag(): void {
  if (overlayDragTimer) {
    clearInterval(overlayDragTimer);
    overlayDragTimer = null;
  }
}

ipcMain.handle("overlay:dragStart", () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }
  const cursor = screen.getCursorScreenPoint();
  const bounds = overlayWindow.getBounds();
  const offsetX = cursor.x - bounds.x;
  const offsetY = cursor.y - bounds.y;
  stopOverlayDrag();
  overlayDragTimer = setInterval(() => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      stopOverlayDrag();
      return;
    }
    const point = screen.getCursorScreenPoint();
    overlayWindow.setPosition(point.x - offsetX, point.y - offsetY);
  }, 16);
});

ipcMain.handle("overlay:dragEnd", () => {
  stopOverlayDrag();
});

ipcMain.handle("overlay:getBounds", () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return null;
  }
  return overlayWindow.getBounds();
});

ipcMain.handle("app:quit", () => {
  isQuitting = true;
  app.quit();
});

app.whenReady().then(() => {
  // 允许渲染层请求麦克风/摄像头权限，否则 getUserMedia 会被默认拒绝。
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media" || permission === "mediaKeySystem");
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  createTray();
  // 主窗口是启动时可见的形态；悬浮窗预创建但保持隐藏，最小化时才切过去。
  showMainWindow();
  createOverlayWindow();

  // 打包安装后启用自动更新：启动静默检查，发现新版本后台下载并提示重启。
  initAutoUpdater(() => mainWindow);

  if (process.env.AI_CURSOR_DEV_SMOKE === "1") {
    showMainWindow();
    setTimeout(() => {
      isQuitting = true;
      app.quit();
    }, 1500);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showMainWindow();
      createOverlayWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  tray?.destroy();
  tray = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
