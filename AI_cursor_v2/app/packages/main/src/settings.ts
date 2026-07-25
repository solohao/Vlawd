import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CustomEndpointConfig,
  ModelBackendKind,
  ModelStorageConfig
} from "@ai-cursor-v2/shared";

export interface ModelSettings {
  storage?: ModelStorageConfig;
  activeBackend?: ModelBackendKind;
  activeBrainModel?: string;
  customEndpoint?: CustomEndpointConfig;
  sttModelId?: string;
  ttsModelId?: string;
}

export interface AppSettings {
  model?: ModelSettings;
}

function settingsFile(): string {
  const userData = typeof app !== "undefined" && app.getPath ? app.getPath("userData") : process.cwd();
  return join(userData, "settings.json");
}

export function loadSettings(): AppSettings {
  const file = settingsFile();
  if (!existsSync(file)) {
    return {};
  }
  try {
    const data = readFileSync(file, "utf8");
    return JSON.parse(data) as AppSettings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: AppSettings): void {
  const file = settingsFile();
  try {
    writeFileSync(file, JSON.stringify(settings, null, 2), "utf8");
  } catch {
    // 配置保存失败不应阻塞业务；静默忽略。
  }
}
