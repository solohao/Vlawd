/**
 * Cycle 1 渲染层音频 I/O。
 *
 * 语音输入（mic 采集 + Silero VAD + 可选浏览器 ASR）与语音输出（系统 SpeechSynthesis）
 * 都是浏览器 API，只能在渲染层运行。主进程通过 IPC 收到转写文本、发出打断信号，
 * 并驱动 Runtime 状态。所有能力都做特性检测，缺失时安全降级为纯文字体验。
 */
import { MicVAD } from "@ricky0123/vad-web";
import type {
  WhisperTranscribeRequest,
  WhisperWorkerRequest,
  WhisperWorkerResponse
} from "./whisper-worker.js";

export interface TtsPlayerOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  /** 可选的音频输出设备 sinkId；当前 speechSynthesis 不支持路由，保留给未来音频播放器。 */
  sinkId?: string;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
}

/** 把流式文本增量按句朗读；取消时立刻静音（barge-in / 本地抢占的音频停止）。 */
export class TtsPlayer {
  private buffer = "";
  /** 已朗读完（onend 触发）的句子拼接，用作 barge-in 时上报的“用户实际听到的文本”。 */
  private spokenText = "";
  private sinkId: string | undefined;
  private pending = 0;
  private speaking = false;
  private voice: SpeechSynthesisVoice | undefined;
  private readonly options: Required<Omit<TtsPlayerOptions, "sinkId" | "onSpeakingStart" | "onSpeakingEnd">>;
  private readonly onSpeakingStart?: () => void;
  private readonly onSpeakingEnd?: () => void;

  constructor(options: TtsPlayerOptions = {}) {
    this.options = {
      lang: options.lang ?? "zh-CN",
      rate: options.rate ?? 1.05,
      pitch: options.pitch ?? 1
    };
    this.sinkId = options.sinkId;
    this.onSpeakingStart = options.onSpeakingStart;
    this.onSpeakingEnd = options.onSpeakingEnd;
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  setSinkId(sinkId: string): void {
    this.sinkId = sinkId;
  }

  /** 新一轮助手回答开始：清空上一轮的缓冲与“已听到”累计。 */
  beginResponse(): void {
    this.buffer = "";
    this.spokenText = "";
  }

  /** 返回本轮已朗读完的文本（不含正在朗读、尚未结束的当前句，保守偏“确实听到”）。 */
  getSpokenText(): string {
    return this.spokenText;
  }

  feed(delta: string): void {
    if (!TtsPlayer.isSupported()) {
      return;
    }
    this.buffer += delta;
    const boundary = /[。！？!?\n]/;
    let match = boundary.exec(this.buffer);
    while (match) {
      const end = match.index + 1;
      const sentence = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end);
      if (sentence) {
        this.enqueue(sentence);
      }
      match = boundary.exec(this.buffer);
    }
  }

  flush(): void {
    const remaining = this.buffer.trim();
    this.buffer = "";
    if (remaining) {
      this.enqueue(remaining);
    }
  }

  cancel(): void {
    this.buffer = "";
    this.pending = 0;
    const wasSpeaking = this.speaking;
    this.speaking = false;
    if (TtsPlayer.isSupported()) {
      window.speechSynthesis.cancel();
    }
    if (wasSpeaking) {
      this.onSpeakingEnd?.();
    }
  }

  private pickVoice(): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices();
    const lang = this.options.lang.toLowerCase();
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
      voices.find((v) => v.lang.toLowerCase().includes("zh"))
    );
  }

  private enqueue(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.options.lang;
    utterance.rate = this.options.rate;
    utterance.pitch = this.options.pitch;
    if (!this.voice) {
      this.voice = this.pickVoice();
    }
    if (this.voice) {
      utterance.voice = this.voice;
    }
    this.pending += 1;
    utterance.onstart = () => {
      if (!this.speaking) {
        this.speaking = true;
        this.onSpeakingStart?.();
      }
    };
    // 句子真正朗读完毕才计入“已听到”，barge-in 上报时只含用户确实听到的部分。
    utterance.onend = () => {
      this.spokenText += text;
      this.pending -= 1;
      if (this.pending <= 0) {
        this.pending = 0;
        this.speaking = false;
        this.onSpeakingEnd?.();
      }
    };
    utterance.onerror = () => {
      this.pending = Math.max(0, this.pending - 1);
      if (this.pending <= 0) {
        this.speaking = false;
        this.onSpeakingEnd?.();
      }
    };
    window.speechSynthesis.speak(utterance);
  }
}

export interface MicVadOptions {
  /** 可选的麦克风 deviceId；留空使用系统默认输入。 */
  deviceId?: string;
}

export interface MicVadHandlers {
  /** 用户开口（转写就绪前的即时 barge-in 信号）。 */
  onSpeechStart: () => void;
  /** 一段语音结束，返回 16kHz 单声道 PCM，供 Whisper 等 ASR 转写。 */
  onSpeechEnd?: (audio: Float32Array) => void;
  /** 实时语音概率（0-1），用于 UI 反馈。 */
  onLevel?: (level: number) => void;
}

const VAD_ASSET_PATH =
  typeof location !== "undefined" ? new URL("./vad/", location.href).href : "./vad/";

/**
 * 基于 Silero VAD（@ricky0123/vad-web）的语音活动检测：
 * - 模型化检测，带 preSpeechPad / redemption / misfire 机制；
 * - 返回 16kHz 单声道 PCM，直接交给 Whisper 转写；
 * - 支持指定 deviceId，便于后续蓝牙耳机 HFP 入口路由。
 */
type MicVadInstance = Awaited<ReturnType<typeof MicVAD.new>>;

export class MicVad {
  private vad: MicVadInstance | null = null;
  private readonly deviceId: string | undefined;

  constructor(options: MicVadOptions = {}) {
    this.deviceId = options.deviceId;
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== "undefined" &&
      "AudioContext" in window
    );
  }

  async start(handlers: MicVadHandlers): Promise<void> {
    if (!MicVad.isSupported()) {
      throw new Error("当前环境不支持麦克风采集");
    }

    const getStream = async (): Promise<MediaStream> => {
      const audioConstraints: MediaTrackConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      if (this.deviceId) {
        audioConstraints.deviceId = { exact: this.deviceId };
      }
      return navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    };

    try {
      this.vad = await MicVAD.new({
        baseAssetPath: VAD_ASSET_PATH,
        onnxWASMBasePath: VAD_ASSET_PATH,
        model: "v5",
        startOnLoad: false,
        processorType: "auto",
        getStream,
        onSpeechStart: () => handlers.onSpeechStart(),
        onSpeechEnd: (audio) => handlers.onSpeechEnd?.(audio),
        onVADMisfire: () => undefined,
        onSpeechRealStart: () => undefined,
        onFrameProcessed: (probs) => handlers.onLevel?.(probs.isSpeech)
      });
    } catch (err) {
      console.error("[MicVad] failed to initialize Silero VAD", err);
      throw err;
    }
    await this.vad.start();
  }

  stop(): void {
    void this.vad?.destroy();
    this.vad = null;
  }
}

// ── 可选浏览器语音识别（Electron/Chromium 不一定可用，缺失时回退文字） ──
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export class BrowserSpeechRecognizer {
  private recognition: SpeechRecognitionLike | null = null;

  static isSupported(): boolean {
    return getSpeechRecognitionCtor() !== undefined;
  }

  start(handlers: {
    onInterim?: (text: string) => void;
    onFinal: (text: string) => void;
    onError?: (message: string) => void;
  }): boolean {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      return false;
    }
    const recognition = new Ctor();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          handlers.onFinal(transcript);
        } else {
          handlers.onInterim?.(transcript);
        }
      }
    };
    recognition.onerror = () => handlers.onError?.("语音识别出错");
    recognition.onend = () => {
      this.recognition = null;
    };
    recognition.start();
    this.recognition = recognition;
    return true;
  }

  stop(): void {
    this.recognition?.stop();
    this.recognition = null;
  }
}

// ── Whisper 转写（transformers.js Web Worker，Electron 内离线 ASR，优先于浏览器识别） ──
/**
 * 在 Web Worker 里跑 Whisper（transformers.js）。`onSpeechEnd` 得到的 16kHz PCM 送进来转写。
 * 模型首次使用时下载并缓存；无 WebGPU 回退 WASM；任何失败都 reject，由上层降级。
 */
export class WhisperTranscriber {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {
      resolve: (text: string) => void;
      reject: (error: Error) => void;
      onPartial?: (text: string) => void;
    }
  >();
  private onProgress?: (status: string, progress?: number) => void;

  static isSupported(): boolean {
    return typeof Worker !== "undefined";
  }

  constructor(options: { onProgress?: (status: string, progress?: number) => void } = {}) {
    this.onProgress = options.onProgress;
  }

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }
    const worker = new Worker(new URL("./whisper-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WhisperWorkerResponse>) => {
      const message = event.data;
      if (message.type === "progress") {
        this.onProgress?.(message.status, message.progress);
        return;
      }
      if (message.type === "partial") {
        this.pending.get(message.id)?.onPartial?.(message.text);
        return;
      }
      if (message.type === "result") {
        this.pending.get(message.id)?.resolve(message.text);
        this.pending.delete(message.id);
        return;
      }
      if (message.type === "error" && message.id !== null) {
        this.pending.get(message.id)?.reject(new Error(message.message));
        this.pending.delete(message.id);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || "Whisper worker 出错");
      for (const [, handlers] of this.pending) {
        handlers.reject(error);
      }
      this.pending.clear();
    };
    this.worker = worker;
    return worker;
  }

  /** 预热：提前加载模型，缩短首次转写延迟。 */
  warmup(): void {
    const request: WhisperWorkerRequest = { type: "init" };
    this.ensureWorker().postMessage(request);
  }

  transcribe(
    audio: Float32Array,
    language = "chinese",
    onPartial?: (text: string) => void
  ): Promise<string> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onPartial });
      const request: WhisperTranscribeRequest = { type: "transcribe", id, audio, language };
      // 传所有权避免拷贝大数组。
      worker.postMessage(request, [audio.buffer]);
    });
  }

  stop(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const [, handlers] of this.pending) {
      handlers.reject(new Error("已停止"));
    }
    this.pending.clear();
  }
}
