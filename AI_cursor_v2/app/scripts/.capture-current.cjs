const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.commandLine.appendSwitch("force-device-scale-factor", "1");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    show: false,
    backgroundColor: "#fafbf9",
    webPreferences: { contextIsolation: true, backgroundThrottling: false }
  });
  await win.loadURL("http://127.0.0.1:4173/");
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const dashboard = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, ".current-dashboard.png"), dashboard.toPNG());

  await win.webContents.executeJavaScript(`document.querySelector('nav button:nth-child(5)')?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const models = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, ".current-models.png"), models.toPNG());

  console.log("Current screenshots saved");
  app.quit();
});
