/**
 * Cycle 1 渲染层音频 I/O。
 *
 * 语音输入（mic 采集 + 能量 VAD + 可选浏览器 ASR）与语音输出（系统 SpeechSynthesis）
 * 都是浏览器 API，只能在渲染层运行。主进程通过 IPC 收到转写文本、发出打断信号，
 * 并驱动 Runtime 状态。所有能力都做特性检测，缺失时安全降级为纯文字体验。
 */
import type {
  WhisperTranscribeRequest,
  WhisperWorkerRequest,
  WhisperWorkerResponse
} from "./whisper-worker.js";

export interface TtsPlayerOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

/** 把流式文本增量按句朗读；取消时立刻静音（barge-in / 本地抢占的音频停止）。 */
export class TtsPlayer {
  private buffer = "";
  /** 已朗读完（onend 触发）的句子拼接，用作 barge-in 时上报的“用户实际听到的文本”。 */
  private spokenText = "";
  private readonly options: Required<TtsPlayerOptions>;

  constructor(options: TtsPlayerOptions = {}) {
    this.options = {
      lang: options.lang ?? "zh-CN",
      rate: options.rate ?? 1.05,
      pitch: options.pitch ?? 1
    };
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
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
    if (TtsPlayer.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  private enqueue(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.options.lang;
    utterance.rate = this.options.rate;
    utterance.pitch = this.options.pitch;
    // 句子真正朗读完毕才计入“已听到”，barge-in 上报时只含用户确实听到的部分。
    utterance.onend = () => {
      this.spokenText += text;
    };
    window.speechSynthesis.speak(utterance);
  }
}

export interface MicVadOptions {
  /** RMS 阈值（0-1），超过视为用户开口。 */
  threshold?: number;
  /** 连续超过阈值的帧数才判定开口，去抖动（barge-in 触发）。 */
  triggerFrames?: number;
  /** 判定“说话结束”所需的连续静音帧数（endpointing 的赎回帧）。 */
  redemptionFrames?: number;
  /** 一段有效语音的最小帧数，过滤咳嗽/杂音等极短音。 */
  minSpeechFrames?: number;
  /** 单段语音最长秒数，防止无限累积。 */
  maxUtteranceSeconds?: number;
}

export interface MicVadHandlers {
  /** 用户开口（转写就绪前的即时 barge-in 信号）。 */
  onSpeechStart: () => void;
  /** 一段语音结束，返回 16kHz 单声道 PCM，供 Whisper 等 ASR 转写。 */
  onSpeechEnd?: (audio: Float32Array) => void;
  /** 实时能量电平（0-1），用于 UI 反馈。 */
  onLevel?: (level: number) => void;
}

const VAD_SAMPLE_RATE = 16000;
const VAD_BUFFER_SIZE = 2048;

/**
 * 能量 VAD + endpointing + PCM 采集：
 * - 连续能量超阈值 → 即时 `onSpeechStart`（barge-in，不等转写）；
 * - 连续静音达赎回帧 → `onSpeechEnd(16kHz PCM)`，交给 Whisper 转写；
 * 不依赖模型资产，可后续替换为 Silero（@ricky0123/vad-web）。
 */
export class MicVad {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private aboveCount = 0;
  private silenceCount = 0;
  private speaking = false;
  private speechFrames = 0;
  private chunks: Float32Array[] = [];
  private readonly threshold: number;
  private readonly triggerFrames: number;
  private readonly redemptionFrames: number;
  private readonly minSpeechFrames: number;
  private readonly maxFrames: number;

  constructor(options: MicVadOptions = {}) {
    this.threshold = options.threshold ?? 0.02;
    this.triggerFrames = options.triggerFrames ?? 1;
    this.redemptionFrames = options.redemptionFrames ?? 6;
    this.minSpeechFrames = options.minSpeechFrames ?? 3;
    const framesPerSecond = VAD_SAMPLE_RATE / VAD_BUFFER_SIZE;
    this.maxFrames = Math.round((options.maxUtteranceSeconds ?? 20) * framesPerSecond);
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
    // 开启回声消除/降噪/自动增益：外放场景下抑制“AI 自己的 TTS 被麦克风采到又触发 barge-in”
    // 的自打断问题（对齐 pipecat 的自打断防护关注点）。耳机场景本就无此问题。
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    // 强制 16kHz 上下文：MediaStream 会被重采样到 16k，直接得到 Whisper 所需的采样率。
    this.context = new AudioContext({ sampleRate: VAD_SAMPLE_RATE });
    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(VAD_BUFFER_SIZE, 1, 1);
    this.source.connect(this.processor);
    // 连到 destination 才会持续触发 onaudioprocess；输出缓冲默认全 0，不会产生外放回授。
    this.processor.connect(this.context.destination);

    this.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (const sample of input) {
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / input.length);
      handlers.onLevel?.(rms);

      const active = rms > this.threshold;
      if (active) {
        this.aboveCount += 1;
        this.silenceCount = 0;
        if (!this.speaking && this.aboveCount >= this.triggerFrames) {
          this.speaking = true;
          this.speechFrames = 0;
          this.chunks = [];
          handlers.onSpeechStart();
        }
      } else {
        this.aboveCount = 0;
        this.silenceCount += 1;
      }

      if (this.speaking) {
        this.chunks.push(new Float32Array(input));
        this.speechFrames += 1;
        const ended = this.silenceCount >= this.redemptionFrames;
        if (ended || this.speechFrames >= this.maxFrames) {
          this.finishUtterance(handlers.onSpeechEnd);
        }
      }
    };
  }

  private finishUtterance(onSpeechEnd?: (audio: Float32Array) => void): void {
    const captured = this.chunks;
    const frames = this.speechFrames;
    this.speaking = false;
    this.speechFrames = 0;
    this.silenceCount = 0;
    this.chunks = [];
    if (!onSpeechEnd || frames < this.minSpeechFrames) {
      return;
    }
    const total = captured.reduce((sum, chunk) => sum + chunk.length, 0);
    const audio = new Float32Array(total);
    let offset = 0;
    for (const chunk of captured) {
      audio.set(chunk, offset);
      offset += chunk.length;
    }
    onSpeechEnd(audio);
  }

  stop(): void {
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
    }
    this.processor = null;
    this.source?.disconnect();
    this.source = null;
    this.aboveCount = 0;
    this.silenceCount = 0;
    this.speaking = false;
    this.speechFrames = 0;
    this.chunks = [];
    void this.context?.close().catch(() => undefined);
    this.context = null;
    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }
    this.stream = null;
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
  private readonly pending = new Map<number, { resolve: (text: string) => void; reject: (error: Error) => void }>();
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

  transcribe(audio: Float32Array, language = "chinese"): Promise<string> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
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
