import type { CustomEndpointConfig, OllamaModelInfo } from "@ai-cursor-v2/shared";
import { type BackendDetectResult, type ModelBackend, fetchOpenAiModels } from "./model-backend.js";

const GUIDANCE_URL = "https://platform.openai.com/docs/api-reference/models";

/** 归一化用户填写的 baseUrl 为 OpenAI 兼容 `/v1` 端点。 */
export function normalizeCustomEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }
  return /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

/**
 * 自定义 OpenAI 兼容后端：连接任意本地/自建的 OpenAI 兼容服务器
 * （vLLM / llama.cpp server / Jan / LocalAI 等），由用户手填 baseUrl 与模型名。
 * App 只连接，不负责下载或启动。
 */
export class CustomEndpointBackend implements ModelBackend {
  readonly kind = "custom" as const;
  readonly supportsPull = false;
  readonly installGuidanceUrl = GUIDANCE_URL;

  private config: CustomEndpointConfig;

  constructor(config: CustomEndpointConfig) {
    this.config = config;
  }

  configure(config: CustomEndpointConfig): void {
    this.config = config;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  get openaiEndpoint(): string {
    return normalizeCustomEndpoint(this.config.baseUrl);
  }

  async detect(signal?: AbortSignal): Promise<BackendDetectResult> {
    if (!this.openaiEndpoint) {
      return {
        status: "not_installed",
        installedModels: [],
        message: "尚未配置自定义端点。填入 OpenAI 兼容地址（如 http://127.0.0.1:8000/v1）与模型名后连接。"
      };
    }
    try {
      const installedModels = await this.listModels(signal);
      return {
        status: "running",
        installedModels,
        message: `已连接自定义端点 ${this.openaiEndpoint}，可用模型 ${installedModels.length} 个。`
      };
    } catch {
      return {
        status: "not_installed",
        installedModels: [],
        message: `无法连接自定义端点 ${this.openaiEndpoint}，请确认服务已启动且地址正确。`
      };
    }
  }

  async listModels(signal?: AbortSignal): Promise<OllamaModelInfo[]> {
    if (!this.openaiEndpoint) {
      return [];
    }
    return fetchOpenAiModels(this.openaiEndpoint, signal);
  }

  async health(signal?: AbortSignal): Promise<boolean> {
    try {
      await this.listModels(signal);
      return true;
    } catch {
      return false;
    }
  }
}
