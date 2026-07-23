/**
 * Cycle 1 渲染层音频 I/O。
 *
 * 语音输入（mic 采集 + 能量 VAD + 可选浏览器 ASR）与语音输出（系统 SpeechSynthesis）
 * 都是浏览器 API，只能在渲染层运行。主进程通过 IPC 收到转写文本、发出打断信号，
 * 并驱动 Runtime 状态。所有能力都做特性检测，缺失时安全降级为纯文字体验。
 */

export interface TtsPlayerOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

/** 把流式文本增量按句朗读；取消时立刻静音（barge-in / 本地抢占的音频停止）。 */
export class TtsPlayer {
  private buffer = "";
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
    window.speechSynthesis.speak(utterance);
  }
}

export interface MicVadOptions {
  /** RMS 阈值（0-1），超过视为用户开口。 */
  threshold?: number;
  /** 连续超过阈值的帧数，去抖动。 */
  triggerFrames?: number;
}

/** 能量 VAD：检测用户开口用于即时 barge-in（不依赖模型）。 */
export class MicVad {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private aboveCount = 0;
  private readonly threshold: number;
  private readonly triggerFrames: number;

  constructor(options: MicVadOptions = {}) {
    this.threshold = options.threshold ?? 0.06;
    this.triggerFrames = options.triggerFrames ?? 3;
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== "undefined" &&
      "AudioContext" in window
    );
  }

  async start(onSpeech: () => void, onLevel?: (level: number) => void): Promise<void> {
    if (!MicVad.isSupported()) {
      throw new Error("当前环境不支持麦克风采集");
    }
    // 开启回声消除/降噪/自动增益：外放场景下抑制“AI 自己的 TTS 被麦克风采到又触发 barge-in”
    // 的自打断问题（对齐 pipecat 的自打断防护关注点）。耳机场景本就无此问题。
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    this.context = new AudioContext();
    const source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    source.connect(this.analyser);

    const data = new Uint8Array(this.analyser.fftSize);
    const loop = (): void => {
      if (!this.analyser) {
        return;
      }
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const sample of data) {
        const centered = (sample - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / data.length);
      onLevel?.(rms);
      if (rms > this.threshold) {
        this.aboveCount += 1;
        if (this.aboveCount === this.triggerFrames) {
          onSpeech();
        }
      } else {
        this.aboveCount = 0;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.aboveCount = 0;
    this.analyser = null;
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
