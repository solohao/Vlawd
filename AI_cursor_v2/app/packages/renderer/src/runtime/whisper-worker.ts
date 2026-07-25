/**
 * Whisper ASR Web Worker（借鉴 xenova/whisper-web：pipeline 单例 + 放 Worker 不阻塞 UI）。
 *
 * 在 renderer 内用 transformers.js 离线跑 Whisper，替代 Electron 里不可用的
 * webkitSpeechRecognition。模型首次使用时从 Hugging Face 拉取并缓存；无 WebGPU 时
 * 回退到 WASM。任何环节失败都会回传 error，由上层优雅降级。
 */
import {
  pipeline,
  WhisperTextStreamer,
  env,
  type AutomaticSpeechRecognitionPipeline,
  type ProgressCallback
} from "@huggingface/transformers";

// 在 Electron/Vite 环境中明确指向 onnxruntime-web 的 wasm/mjs 资源，避免后端初始化失败。
const onnxWasm = env.backends.onnx.wasm!;
onnxWasm.numThreads = 1;
// dev 模式下 Vite 不会自动 serve node_modules 里的 .mjs，手动指向 copyVadAssets 拷贝到 assets/vad/ 的文件。
if ((import.meta as any).env?.DEV) {
  onnxWasm.wasmPaths = new URL("/vad/", self.location.href).href;
}

export interface WhisperInitRequest {
  type: "init";
  model?: string;
}

export interface WhisperTranscribeRequest {
  type: "transcribe";
  id: number;
  audio: Float32Array;
  language?: string;
  model?: string;
}

export type WhisperWorkerRequest = WhisperInitRequest | WhisperTranscribeRequest;

export type WhisperWorkerResponse =
  | { type: "ready" }
  | { type: "progress"; status: string; progress?: number }
  | { type: "partial"; id: number; text: string }
  | { type: "result"; id: number; text: string }
  | { type: "error"; id: number | null; message: string };

const DEFAULT_MODEL = "Xenova/whisper-tiny";

const pipelines = new Map<string, Promise<AutomaticSpeechRecognitionPipeline>>();

function post(message: WhisperWorkerResponse): void {
  (self as unknown as Worker).postMessage(message);
}

async function loadPipeline(model: string): Promise<AutomaticSpeechRecognitionPipeline> {
  const cached = pipelines.get(model);
  if (cached) {
    return cached;
  }
  const onProgress: ProgressCallback = (report) => {
    const progress = "progress" in report ? report.progress : undefined;
    post({ type: "progress", status: report.status, progress });
  };
  const promise = pipeline("automatic-speech-recognition", model, {
    device: "wasm",
    dtype: "fp32",
    progress_callback: onProgress
  });
  pipelines.set(model, promise);
  return promise;
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
    loadPipeline(request.model ?? DEFAULT_MODEL)
      .then(async (asr) => {
        const tokenizer = (asr as { tokenizer?: unknown }).tokenizer;
        const options = {
          language: request.language ?? "chinese",
          task: "transcribe",
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: true
        };

        let output: { text: string } | Array<{ text: string }>;
        if (tokenizer && typeof WhisperTextStreamer !== "undefined") {
          let partialText = "";
          const streamer = new WhisperTextStreamer(tokenizer as any, {
            skip_prompt: true,
            skip_special_tokens: true,
            callback_function: (text: string) => {
              partialText += text;
              post({ type: "partial", id: request.id, text: partialText.trim() });
            }
          });
          output = await asr(request.audio, { ...options, streamer });
        } else {
          output = await asr(request.audio, options);
        }

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
