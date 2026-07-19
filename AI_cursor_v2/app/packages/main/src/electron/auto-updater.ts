import { app, dialog, Notification, type BrowserWindow, type MessageBoxOptions } from "electron";
import electronUpdater from "electron-updater";

// electron-updater 是 CJS 包，NodeNext 下用默认导入再解构。
const { autoUpdater } = electronUpdater;

type WindowGetter = () => BrowserWindow | null;

/** 推送给渲染层的更新状态，供前端展示自动下载进度（LM Studio 式体验）。 */
export interface UpdaterStatus {
  phase: "checking" | "available" | "downloading" | "downloaded" | "up-to-date" | "error";
  version?: string;
  percent?: number;
  transferredBytes?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
  message?: string;
}

let initialized = false;
// 手动“检查更新”时才弹“已是最新/失败”等反馈；自动后台检查保持静默。
let manualCheck = false;

function resolveParent(getWindow: WindowGetter): BrowserWindow | undefined {
  const window = getWindow();
  return window && !window.isDestroyed() ? window : undefined;
}

function showBox(getWindow: WindowGetter, options: MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> {
  const parent = resolveParent(getWindow);
  return parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options);
}

/** 广播更新状态到渲染层，并在任务栏图标上显示原生进度条。 */
function emitStatus(getWindow: WindowGetter, status: UpdaterStatus): void {
  const window = getWindow();
  if (window && !window.isDestroyed()) {
    window.webContents.send("update:status", status);
    // 任务栏原生进度：下载中显示比例，其余清除。
    if (status.phase === "downloading" && typeof status.percent === "number") {
      window.setProgressBar(Math.max(0, Math.min(1, status.percent / 100)));
    } else {
      window.setProgressBar(-1);
    }
  }
}

function notify(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

/**
 * 初始化自动更新：仅在打包安装后启用。
 * 启动时后台静默检查，发现新版本自动下载，下载完成后提示用户重启安装。
 */
export function initAutoUpdater(getWindow: WindowGetter): void {
  if (!app.isPackaged || initialized) {
    return;
  }
  initialized = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    emitStatus(getWindow, { phase: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    emitStatus(getWindow, { phase: "available", version: info?.version });
    // 无论自动/手动，都告知用户「已开始后台自动下载」（LM Studio 式：无需手动点下载）。
    notify("发现新版本", `AI Cursor V2 ${info?.version ?? ""} 正在后台自动下载，完成后提示重启。`);
  });

  autoUpdater.on("download-progress", (progress) => {
    emitStatus(getWindow, {
      phase: "downloading",
      percent: Math.round(progress.percent),
      transferredBytes: progress.transferred,
      totalBytes: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  });

  autoUpdater.on("update-not-available", () => {
    emitStatus(getWindow, { phase: "up-to-date" });
    if (manualCheck) {
      manualCheck = false;
      void showBox(getWindow, {
        type: "info",
        title: "检查更新",
        message: "当前已是最新版本。",
        buttons: ["好"]
      });
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    emitStatus(getWindow, { phase: "downloaded", version: info?.version, percent: 100 });
    const result = await showBox(getWindow, {
      type: "info",
      title: "更新已就绪",
      message: `AI Cursor V2 ${info.version} 已下载完成`,
      detail: "点“立即重启更新”完成安装，或稍后退出应用时自动安装。",
      buttons: ["立即重启更新", "稍后"],
      defaultId: 0,
      cancelId: 1
    });
    if (result.response === 0) {
      // 让对话框先关闭，再退出安装。
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  });

  autoUpdater.on("error", (error) => {
    emitStatus(getWindow, { phase: "error", message: error == null ? "未知错误" : String(error) });
    if (manualCheck) {
      manualCheck = false;
      void showBox(getWindow, {
        type: "error",
        title: "检查更新失败",
        message: "无法检查更新，请稍后再试。",
        detail: error == null ? "未知错误" : (error.stack ?? String(error)),
        buttons: ["好"]
      });
    }
    console.error("[auto-updater]", error);
  });

  void autoUpdater.checkForUpdates().catch((error) => {
    console.error("[auto-updater] 启动检查失败", error);
  });
}

/** 托盘“检查更新…”触发：带用户反馈的手动检查。 */
export function checkForUpdatesManually(getWindow: WindowGetter): void {
  if (!app.isPackaged) {
    void showBox(getWindow, {
      type: "info",
      title: "检查更新",
      message: "开发模式下不检查更新。",
      detail: "打包安装后（发行版）才会启用自动更新。",
      buttons: ["好"]
    });
    return;
  }
  manualCheck = true;
  void autoUpdater.checkForUpdates().catch((error) => {
    manualCheck = false;
    console.error("[auto-updater] 手动检查失败", error);
  });
}
