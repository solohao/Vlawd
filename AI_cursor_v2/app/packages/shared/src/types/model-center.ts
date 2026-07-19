import type { ModelRole, ModelStorageConfig } from "./model.js";
import type { DuplexProviderKind } from "./runtime.js";

/**
 * 模型中心运行时类型。
 *
 * 设计对齐技文/10（MODEL.CONFIG / MODEL.PROBE / ModelStorageConfig）：环境自检 →
 * 推荐 → 选下载目录 → 下载 → 健康检查 → 运行。首个后端为"包装版 Ollama"——
 * 用生态自带的下载器（ollama pull 流式进度）+ 用环境变量把模型目录指到用户选的路径，
 * 语音全双工后端（Python 模型 server）作为 Phase 5.4 的独立实现留位。
 */

export type ModelBackendKind = "ollama";

export type OllamaBackendStatus =
  | "unknown"
  | "not_installed"
  | "installed_not_running"
  | "running";

export interface GpuInfo {
  name: string;
  vramTotalMB: number;
  vramFreeMB: number;
}

export interface DiskInfo {
  path: string;
  freeGB: number;
  totalGB: number;
}

export interface EnvironmentProbe {
  probedAt: string;
  platform: string;
  arch: string;
  cpuCores: number;
  totalRamGB: number;
  freeRamGB: number;
  gpus: GpuInfo[];
  disk: DiskInfo | null;
  /** 推荐的 preset id（对应 desktopModelPresets）。 */
  recommendedPresetId: string;
  /** 推荐给执行大脑的 Ollama 模型 tag。 */
  recommendedBrainModel: string;
  recommendationReason: string;
  /** 是否具备运行真实本地模型的最低条件（有足够显存或内存）。 */
  canRunRealModel: boolean;
}

export interface OllamaModelInfo {
  name: string;
  sizeBytes: number;
  modifiedAt?: string;
}

export interface ModelBackendState {
  backend: ModelBackendKind;
  status: OllamaBackendStatus;
  version?: string;
  /** 原生 API 根地址（127.0.0.1:11434）。 */
  endpoint: string;
  /** OpenAI 兼容地址（.../v1），供方案 B 管线连接。 */
  openaiEndpoint: string;
  /** 已知的模型下载目录（由本 App 通过 OLLAMA_MODELS 管理时可靠）。 */
  modelsDir?: string;
  /** 后端进程是否由本 App 启动（决定能否强制指定下载目录）。 */
  managedByApp: boolean;
  installedModels: OllamaModelInfo[];
  installGuidanceUrl: string;
  message: string;
  checkedAt: string;
}

export type ModelPullPhase =
  | "idle"
  | "resolving"
  | "downloading"
  | "verifying"
  | "success"
  | "error"
  | "cancelled";

export interface ModelPullProgress {
  model: string;
  phase: ModelPullPhase;
  /** Ollama 原始 status 文本，便于运行日志展示。 */
  status: string;
  completedBytes: number;
  totalBytes: number;
  percent: number;
  message?: string;
  updatedAt: string;
}

export interface ModelCatalogEntry {
  /** Ollama 模型 tag，例如 "qwen2.5:7b-instruct"。 */
  id: string;
  displayName: string;
  badge: "推荐" | "可选";
  feature: string;
  description: string;
  approxSizeGB: number;
  recommendedRamGB: number;
  role: ModelRole;
}

export interface ModelCatalogItem extends ModelCatalogEntry {
  installed: boolean;
  active: boolean;
  recommended: boolean;
}

export interface ModelCenterSnapshot {
  generatedAt: string;
  environment: EnvironmentProbe | null;
  backend: ModelBackendState;
  storage: ModelStorageConfig;
  storageWarnings: string[];
  activePull: ModelPullProgress | null;
  catalog: ModelCatalogItem[];
  activeProviderKind: DuplexProviderKind;
  activeBrainModel: string;
  providerConnected: boolean;
  usingRealInference: boolean;
}
