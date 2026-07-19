import type { ModelBackendKind, ModelBackendStatus, OllamaModelInfo } from "@ai-cursor-v2/shared";

/** 后端检测结果：状态 + 版本 + 已知模型 + 面向用户的中文说明。 */
export interface BackendDetectResult {
  status: ModelBackendStatus;
  version?: string;
  installedModels: OllamaModelInfo[];
  message: string;
}

/**
 * 统一的模型后端接口。所有后端都对外暴露一个 OpenAI 兼容 `/v1` 端点，
 * 供既有方案 B 管线 Provider 连接；差异只在「如何检测 / 是否能在 App 内下载」。
 *
 * - Ollama：可在 App 内 `ollama pull` 下载（supportsPull=true）。
 * - LM Studio / 自定义端点：下载/加载由其自身负责（supportsPull=false），App 只连接。
 */
export interface ModelBackend {
  readonly kind: ModelBackendKind;
  readonly supportsPull: boolean;
  /** 原生/管理 API 根地址（用于展示）。 */
  readonly baseUrl: string;
  /** OpenAI 兼容地址（.../v1）。 */
  readonly openaiEndpoint: string;
  /** 安装/使用引导链接。 */
  readonly installGuidanceUrl: string;
  detect(signal?: AbortSignal): Promise<BackendDetectResult>;
  health(signal?: AbortSignal): Promise<boolean>;
  listModels(signal?: AbortSignal): Promise<OllamaModelInfo[]>;
}

interface OpenAiModelsResponse {
  data?: Array<{ id?: string; [key: string]: unknown }>;
}

/**
 * 解析 OpenAI 兼容 `/v1/models` 响应为模型列表。
 * LM Studio / vLLM / llama.cpp server 等均返回 `{ data: [{ id }] }`，不含体积信息。
 */
export function parseOpenAiModels(body: OpenAiModelsResponse): OllamaModelInfo[] {
  if (!Array.isArray(body.data)) {
    return [];
  }
  const models: OllamaModelInfo[] = [];
  for (const entry of body.data) {
    if (!entry?.id) {
      continue;
    }
    models.push({ name: entry.id, sizeBytes: 0 });
  }
  return models;
}

/** 请求任意 OpenAI 兼容端点的 `/models`，返回模型列表；不可达则抛错。 */
export async function fetchOpenAiModels(openaiEndpoint: string, signal?: AbortSignal): Promise<OllamaModelInfo[]> {
  const url = `${openaiEndpoint.replace(/\/$/, "")}/models`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return parseOpenAiModels((await response.json()) as OpenAiModelsResponse);
}
