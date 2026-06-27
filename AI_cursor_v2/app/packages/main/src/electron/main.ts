import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { ModelRole } from "@ai-cursor-v2/shared";
import { MockDesktopRuntime } from "../desktop/mock-desktop-runtime.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "../../../../../..");
const runtime = new MockDesktopRuntime();
const userDataDir = join(appRoot, ".electron-user-data");
const cacheDir = join(userDataDir, "Cache");

mkdirSync(userDataDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });
app.setPath("userData", userDataDir);
app.commandLine.appendSwitch("disk-cache-dir", cacheDir);
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

function preloadPath(): string {
  return join(currentDir, "preload.js");
}

async function createWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: "AI Cursor V2",
    backgroundColor: "#eef3eb",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    await window.loadURL(devUrl);
  } else {
    await window.loadFile(join(appRoot, "dist/renderer/index.html"));
  }

  if (process.env.AI_CURSOR_DEV_SMOKE === "1") {
    setTimeout(() => {
      window.close();
    }, 1500);
  }

  return window;
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

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
