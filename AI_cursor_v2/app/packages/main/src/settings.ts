import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import type {
  CustomEndpointConfig,
  ModelBackendKind,
  ModelStorageConfig
} from "@ai-cursor-v2/shared";

const require = createRequire(import.meta.url);
let app: { getPath(name: string): string } | undefined;
let safeStorage: {
  isEncryptionAvailable(): boolean;
  encryptString(plaintext: string): Buffer;
  decryptString(encrypted: Buffer): string;
} | undefined;

try {
  const electron = require("electron");
  app = electron?.app;
  safeStorage = electron?.safeStorage;
} catch {
  // 非 Electron 运行时（如单元测试或命令行脚本）使用默认降级。
}

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

const ENCRYPTED_PREFIX = "encrypted:";

function canEncrypt(): boolean {
  if (!safeStorage) return false;
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function encryptApiKeys(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(encryptApiKeys);
  }
  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "apiKey" && typeof value === "string" && value && safeStorage && canEncrypt()) {
      try {
        const encrypted = safeStorage.encryptString(value);
        result[key] = `${ENCRYPTED_PREFIX}${encrypted.toString("base64")}`;
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = encryptApiKeys(value);
    }
  }
  return result;
}

function decryptApiKeys(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(decryptApiKeys);
  }
  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "apiKey" && typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX) && safeStorage) {
      try {
        const b64 = value.slice(ENCRYPTED_PREFIX.length);
        const buffer = Buffer.from(b64, "base64");
        result[key] = safeStorage.decryptString(buffer);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = decryptApiKeys(value);
    }
  }
  return result;
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
    const parsed = JSON.parse(data) as AppSettings;
    return decryptApiKeys(parsed) as AppSettings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: AppSettings): void {
  const file = settingsFile();
  try {
    const encrypted = encryptApiKeys(settings) as AppSettings;
    writeFileSync(file, JSON.stringify(encrypted, null, 2), "utf8");
  } catch {
    // 配置保存失败不应阻塞业务；静默忽略。
  }
}
