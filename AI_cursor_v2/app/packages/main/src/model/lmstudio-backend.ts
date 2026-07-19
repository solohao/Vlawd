import type { OllamaModelInfo } from "@ai-cursor-v2/shared";
import { type BackendDetectResult, type ModelBackend, fetchOpenAiModels } from "./model-backend.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:1234";
const GUIDANCE_URL = "https://lmstudio.ai/docs/app/api";

/**
 * LM Studio 后端：连接 LM Studio 内置的本地 OpenAI 兼容服务器（默认 127.0.0.1:1234）。
 *
 * 模型的下载与加载由 LM Studio 应用自身负责（App 不重复实现下载器）；
 * 本后端只做「检测服务器是否在跑 / 列出已加载模型 / 健康检查」，并把 `/v1` 端点交给方案 B 管线连接。
 * 若已装 LM Studio 但未开本地服务器，需在 LM Studio 里启动（或 `lms server start`）。
 */
export class LMStudioBackend implements ModelBackend {
  readonly kind = "lmstudio" as const;
  readonly supportsPull = false;
  readonly baseUrl = DEFAULT_BASE_URL;
  readonly openaiEndpoint = `${DEFAULT_BASE_URL}/v1`;
  readonly installGuidanceUrl = GUIDANCE_URL;

  async detect(signal?: AbortSignal): Promise<BackendDetectResult> {
    try {
      const installedModels = await this.listModels(signal);
      return {
        status: "running",
        installedModels,
        message:
          installedModels.length > 0
            ? `LM Studio 服务器运行中，已加载 ${installedModels.length} 个模型。`
            : "LM Studio 服务器运行中，但尚未加载模型（请在 LM Studio 里加载一个模型）。"
      };
    } catch {
      return {
        status: "not_installed",
        installedModels: [],
        message: "未连接到 LM Studio 本地服务器（默认 127.0.0.1:1234）。请在 LM Studio 中启动本地服务器。"
      };
    }
  }

  async listModels(signal?: AbortSignal): Promise<OllamaModelInfo[]> {
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
