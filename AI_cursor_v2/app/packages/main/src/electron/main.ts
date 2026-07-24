import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, screen, session, shell } from "electron";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type {
  CustomEndpointConfig,
  DuplexProviderKind,
  DuplexRuntimeEvent,
  ModelBackendKind,
  ModelCenterSnapshot,
  ModelRole,
  SafetyPreemptionIntent
} from "@ai-cursor-v2/shared";
import { MockDesktopRuntime } from "../desktop/mock-desktop-runtime.js";
import { DuplexConversationRuntime } from "../runtime/duplex-runtime.js";
import { createProvider } from "../model/provider-registry.js";
import { defaultPipelineProviderConfig, findExecutionBrain } from "../model/dual-role-config.js";
import { ModelCenterService } from "../model/model-center-service.js";
import { JsonlSessionStorage } from "../session/jsonl-storage.js";
import { initAutoUpdater, checkForUpdatesManually } from "./auto-updater.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
// currentDir = <app>/packages/main/dist/packages/main/src/electron → up 7 = <app>
// 打包后 currentDir 位于 resources/app.asar 内，同样的向上层级指向 asar 根，
// 渲染层与图标资源仍能从 asar 内读取；仅可写的用户数据目录需要改用系统标准位置。
const appRoot = resolve(currentDir, "../../../../../../..");
const runtime = new MockDesktopRuntime();

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
const modelCenter = new ModelCenterService({ runtime: duplexRuntime });
function broadcastModelCenter(snapshot: ModelCenterSnapshot): void {
  for (const window of [mainWindow, overlayWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send("model:snapshot", snapshot);
    }
  }
}
modelCenter.on(broadcastModelCenter);

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

ipcMain.handle("desktop:getSnapshot", () => runtime.getSnapshot());

ipcMain.handle("desktop:chooseModelStorageRoot", async () => {
  const result = await dialog.showOpenDialog({
    title: "选择 AI Cursor V2 模型下载目录",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return runtime.getSnapshot();
  }
  return runtime.selectModelStorageRoot(result.filePaths[0]);
});

ipcMain.handle("desktop:startModelDownload", (_event, role: ModelRole) => runtime.startModelDownload(role));
ipcMain.handle("desktop:runHealthCheck", (_event, role: ModelRole) => runtime.runHealthCheck(role));
ipcMain.handle("desktop:connectAudio", () => runtime.connectAudio());
ipcMain.handle("desktop:pauseSession", () => runtime.pauseSession());
ipcMain.handle("desktop:cancelSession", () => runtime.cancelSession());
ipcMain.handle("desktop:executeRuntimeAction", () => runtime.executeRuntimeAction());

// ── Cycle 1 会话通道 ────────────────────────────────────────────────
ipcMain.handle("conversation:snapshot", () => duplexRuntime.getSnapshot());
ipcMain.handle("conversation:connect", () => duplexRuntime.connect());
ipcMain.handle("conversation:utterance", (_event, text: string) => duplexRuntime.submitUtterance(text));
ipcMain.handle("conversation:bargeIn", (_event, heardText?: string) => duplexRuntime.bargeIn(heardText));
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
  const result = await dialog.showOpenDialog({
    title: "选择模型下载目录（将通过 OLLAMA_MODELS 生效）",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return modelCenter.getSnapshot();
  }
  return modelCenter.setStorageRoot(result.filePaths[0]);
});
ipcMain.handle("model:pull", (_event, model: string) => modelCenter.pull(model));
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

ipcMain.handle("model:installOllama", async () => {
  const result = await dialog.showOpenDialog({
    title: "选择 Ollama 安装位置（留空则用默认目录）",
    properties: ["openDirectory", "createDirectory"]
  });
  const installDir = result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths[0];
  return modelCenter.installOllama(installDir);
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
