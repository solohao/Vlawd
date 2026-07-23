/**
 * Whisper ASR Web Worker（借鉴 xenova/whisper-web：pipeline 单例 + 放 Worker 不阻塞 UI）。
 *
 * 在 renderer 内用 transformers.js 离线跑 Whisper，替代 Electron 里不可用的
 * webkitSpeechRecognition。模型首次使用时从 Hugging Face 拉取并缓存；无 WebGPU 时
 * 回退到 WASM。任何环节失败都会回传 error，由上层优雅降级。
 */
import {
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
  type ProgressCallback
} from "@huggingface/transformers";

export interface WhisperInitRequest {
  type: "init";
  model?: string;
}

export interface WhisperTranscribeRequest {
  type: "transcribe";
  id: number;
  audio: Float32Array;
  language?: string;
}

export type WhisperWorkerRequest = WhisperInitRequest | WhisperTranscribeRequest;

export type WhisperWorkerResponse =
  | { type: "ready" }
  | { type: "progress"; status: string; progress?: number }
  | { type: "result"; id: number; text: string }
  | { type: "error"; id: number | null; message: string };

const DEFAULT_MODEL = "Xenova/whisper-tiny";

let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function post(message: WhisperWorkerResponse): void {
  (self as unknown as Worker).postMessage(message);
}

async function loadPipeline(model: string): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!pipelinePromise) {
    const onProgress: ProgressCallback = (report) => {
      const progress = "progress" in report ? report.progress : undefined;
      post({ type: "progress", status: report.status, progress });
    };
    pipelinePromise = (async () => {
      try {
        return await pipeline("automatic-speech-recognition", model, {
          device: "webgpu",
          progress_callback: onProgress
        });
      } catch {
        // 无 WebGPU / 初始化失败时回退 WASM。
        return pipeline("automatic-speech-recognition", model, {
          device: "wasm",
          progress_callback: onProgress
        });
      }
    })();
  }
  return pipelinePromise;
}

self.addEventListener("message", (event: MessageEvent<WhisperWorkerRequest>) => {
  const request = event.data;
  if (request.type === "init") {
    loadPipeline(request.model ?? DEFAULT_MODEL)
      .then(() => post({ type: "ready" }))
      .catch((error: unknown) => post({ type: "error", id: null, message: describe(error) }));
    return;
  }
  if (request.type === "transcribe") {
    loadPipeline(DEFAULT_MODEL)
      .then(async (asr) => {
        const output = await asr(request.audio, {
          language: request.language ?? "chinese",
          task: "transcribe"
        });
        const text = Array.isArray(output)
          ? output.map((part) => part.text).join(" ")
          : output.text;
        post({ type: "result", id: request.id, text: text.trim() });
      })
      .catch((error: unknown) => post({ type: "error", id: request.id, message: describe(error) }));
  }
});

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
