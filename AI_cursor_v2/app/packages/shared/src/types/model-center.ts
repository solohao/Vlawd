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

/**
 * 支持的模型后端：
 * - `ollama`：包装版 Ollama（本地下载器 + OLLAMA_MODELS）。
 * - `lmstudio`：LM Studio 本地 OpenAI 兼容服务器（默认 :1234）；下载/加载由 LM Studio 自身负责。
 * - `custom`：任意 OpenAI 兼容端点（vLLM / llama.cpp server / Jan / LocalAI 等），手填地址与模型名。
 */
export type ModelBackendKind = "ollama" | "lmstudio" | "custom";

export type OllamaBackendStatus =
  | "unknown"
  | "not_installed"
  | "installed_not_running"
  | "running";

/** 后端状态与通用能力标识，统一 Ollama / LM Studio / 自定义端点。 */
export type ModelBackendStatus = OllamaBackendStatus;

export interface CustomEndpointConfig {
  baseUrl: string;
  model: string;
}

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
  status: ModelBackendStatus;
  /** 该后端是否支持在 App 内直接下载模型（仅 Ollama 为 true）。 */
  supportsPull: boolean;
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

/** 代管安装 Ollama 的流程阶段。 */
export type OllamaInstallPhase =
  | "idle"
  | "detecting"
  | "installing"
  | "installed"
  | "error";

/**
 * "一键准备 Ollama" 的状态。
 *
 * 单入口自动分支：已安装 → 直接可用；未安装但本机已有安装器 → 只选盘静默安装；
 * 未安装且没有安装器 → 需用户指定安装器或前往官网下载。
 */
export interface OllamaInstallState {
  /** 是否支持由本 App 代管安装（当前仅 Windows）。 */
  supported: boolean;
  /** 是否已检测到 Ollama 可执行文件（已安装）。 */
  installed: boolean;
  /** 是否在本机常见目录/用户指定处找到 OllamaSetup 安装器。 */
  installerFound: boolean;
  /** 找到或用户指定的安装器绝对路径。 */
  installerPath?: string;
  /** 上次静默安装到的目录（供展示）。 */
  installDir?: string;
  phase: OllamaInstallPhase;
  message?: string;
  updatedAt: string;
}

export interface ModelCenterSnapshot {
  generatedAt: string;
  environment: EnvironmentProbe | null;
  /** 代管安装 Ollama 的检测/安装状态。 */
  ollamaInstall: OllamaInstallState;
  /** 当前选中的后端状态（= backends 中 activeBackend 对应项）。 */
  backend: ModelBackendState;
  /** 当前选中的后端类型。 */
  activeBackend: ModelBackendKind;
  /** 全部后端的实时状态，供 UI 展示可用性与选择。 */
  backends: ModelBackendState[];
  /** 自定义 OpenAI 兼容端点配置。 */
  customEndpoint: CustomEndpointConfig;
  storage: ModelStorageConfig;
  storageWarnings: string[];
  activePull: ModelPullProgress | null;
  catalog: ModelCatalogItem[];
  activeProviderKind: DuplexProviderKind;
  activeBrainModel: string;
  providerConnected: boolean;
  usingRealInference: boolean;
}
