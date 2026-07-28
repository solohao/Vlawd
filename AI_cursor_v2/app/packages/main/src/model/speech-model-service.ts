import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { totalmem } from "node:os";
import pkg from "sherpa-onnx-node";
import { loadSettings, saveSettings, type ModelSettings } from "../settings.js";
import { downloadWithResume, type DownloadProgress } from "./download-resume.js";
import { SPEECH_CATALOG } from "./speech-catalog.js";

const { OfflineRecognizer, OfflineTts, OnlineRecognizer } = pkg;

type SpeechRole = "stt" | "tts";

export type SpeechSttType = "whisper" | "paraformer" | "senseVoice" | "zipformerCtc" | "transducer";

export interface SpeechTransducerConfig {
  encoder: string;
  decoder: string;
  joiner: string;
}

export interface SpeechSttConfig {
  type: SpeechSttType;
  /** 是否为流式（Online）模型；true 时走 OnlineRecognizer，false 或省略时走 OfflineRecognizer。 */
  streaming?: boolean;
  /** 流式 transducer 编码器/解码器/joiner 路径。 */
  transducer?: SpeechTransducerConfig;
  /** Whisper 编码器路径（相对 extractedDirName）。 */
  encoder?: string;
  /** Whisper 解码器路径（相对 extractedDirName）。 */
  decoder?: string;
  /** paraformer / senseVoice / zipformerCtc 模型路径（相对 extractedDirName）。 */
  model?: string;
  tokens: string;
  /** Whisper 指定语言，空字符串表示自动检测。 */
  language?: string;
  /** Whisper 任务，"transcribe" 或 "translate"。 */
  task?: string;
  tailPaddings?: number;
}

export type SpeechTtsType = "vits" | "kokoro";

export interface SpeechTtsConfig {
  type: SpeechTtsType;
  model: string;
  tokens: string;
  lexicon?: string;
  dataDir?: string;
  voices?: string;
  language?: string;
  ruleFsts?: string[];
  numThreads?: number;
}

export interface SpeechCatalogItem {
  id: string;
  name: string;
  role: SpeechRole;
  language: string;
  quality: "low" | "medium" | "high";
  archiveUrl: string;
  archiveSizeBytes: number;
  extractedDirName: string;
  approxSizeGB: number;
  memoryRecommendedGB: number;
  description?: string;
  tags?: string[];
  sttConfig?: SpeechSttConfig;
  ttsConfig?: SpeechTtsConfig;
}

export interface SpeechModelStatus extends SpeechCatalogItem {
  installed: boolean;
  downloading: boolean;
  paused?: boolean;
  recommended?: boolean;
  progress?: number; // 0-100
  error?: string;
}

export interface SpeechActiveConfig {
  stt?: string;
  tts?: string;
}

export interface SpeechDownloadProgress {
  modelId: string;
  downloadedBytes: number;
  totalBytes?: number;
}

const QUALITY_RANK: Record<"low" | "medium" | "high", number> = {
  low: 1,
  medium: 2,
  high: 3
};

export class SpeechModelService {
  private modelsDir = "";
  private active: SpeechActiveConfig = {};
  private downloadProgress = new Map<string, SpeechDownloadProgress>();
  private downloadControllers = new Map<string, AbortController>();
  private pausedDownloads = new Set<string>();
  private recognizers = new Map<string, InstanceType<typeof OfflineRecognizer>>();
  private onlineRecognizers = new Map<string, InstanceType<typeof OnlineRecognizer>>();
  private ttsEngines = new Map<string, InstanceType<typeof OfflineTts>>();

  constructor() {
    this.applySettings();
  }

  setModelsDir(dir: string): void {
    if (this.modelsDir === dir) return;
    this.modelsDir = dir;
    this.recognizers.clear();
    this.onlineRecognizers.clear();
    this.ttsEngines.clear();
  }

  /** 预热当前激活的 STT/TTS 模型，避免把模型加载时间算进延迟。 */
  warmUp(): void {
    if (this.active.stt) {
      const modelDir = this.getSttModelDir();
      if (modelDir) {
        if (this.getCatalogItem(this.active.stt)?.sttConfig?.streaming) {
          this.loadStreamingRecognizer(modelDir);
        } else {
          this.loadRecognizer(modelDir);
        }
      }
    }
    if (this.active.tts) {
      const modelDir = this.getTtsModelDir();
      if (modelDir) this.loadTts(modelDir);
    }
  }

  getModelsDir(): string {
    return this.modelsDir;
  }

  private applySettings(): void {
    const settings = loadSettings();
    this.active = {
      stt: settings.model?.sttModelId,
      tts: settings.model?.ttsModelId
    };
  }

  private persistActive(): void {
    const settings = loadSettings();
    const next: ModelSettings = {
      ...settings.model,
      sttModelId: this.active.stt,
      ttsModelId: this.active.tts
    };
    saveSettings({ ...settings, model: next });
  }

  private roleDir(role: SpeechRole): string {
    return join(this.modelsDir, role);
  }

  private modelDir(item: SpeechCatalogItem): string {
    return join(this.roleDir(item.role), item.extractedDirName);
  }

  private getCatalogItem(modelId: string): SpeechCatalogItem | undefined {
    return SPEECH_CATALOG.find((m) => m.id === modelId);
  }

  private totalMemoryGB(): number {
    return Math.round(totalmem() / (1024 * 1024 * 1024));
  }

  private recommendedForRole(role: SpeechRole): string | undefined {
    const totalGB = this.totalMemoryGB();
    const candidates = SPEECH_CATALOG.filter((m) => m.role === role && m.memoryRecommendedGB <= totalGB);
    if (candidates.length === 0) {
      // 连最低配置都不满足时返回最低要求的模型
      const lowest = SPEECH_CATALOG
        .filter((m) => m.role === role)
        .sort((a, b) => a.memoryRecommendedGB - b.memoryRecommendedGB)[0];
      return lowest?.id;
    }
    // 优先选更高 quality 等级的；同级选体积最大的（通常效果最好）
    return candidates.sort((a, b) => {
      const rankDiff = QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality];
      if (rankDiff !== 0) return rankDiff;
      return b.approxSizeGB - a.approxSizeGB;
    })[0]?.id;
  }

  private isInstalled(item: SpeechCatalogItem): boolean {
    if (!this.modelsDir) return false;
    const dir = this.modelDir(item);
    if (!existsSync(dir)) return false;
    try {
      if (item.role === "stt" && item.sttConfig) {
        const cfg = item.sttConfig;
        const files = [cfg.tokens];
        if (cfg.type === "whisper") {
          files.push(cfg.encoder!, cfg.decoder!);
        } else if (cfg.transducer) {
          files.push(cfg.transducer.encoder, cfg.transducer.decoder, cfg.transducer.joiner);
        } else {
          files.push(cfg.model!);
        }
        return files.every((f) => existsSync(join(dir, f)));
      }
      if (item.role === "tts" && item.ttsConfig) {
        const cfg = item.ttsConfig;
        const files = [cfg.model, cfg.tokens];
        if (cfg.type === "kokoro") files.push(cfg.voices!);
        return files.every((f) => existsSync(join(dir, f)));
      }
      return statSync(dir).isDirectory();
    } catch {
      return false;
    }
  }

  private catalogWithRecommended(): SpeechCatalogItem[] {
    const recommendedStt = this.recommendedForRole("stt");
    const recommendedTts = this.recommendedForRole("tts");
    return SPEECH_CATALOG.map((item) => ({
      ...item,
      recommended: item.role === "stt" ? item.id === recommendedStt : item.id === recommendedTts
    }));
  }

  getCatalog(): SpeechCatalogItem[] {
    return this.catalogWithRecommended();
  }

  getStatus(): SpeechModelStatus[] {
    return this.catalogWithRecommended().map((item) => {
      const progress = this.downloadProgress.get(item.id);
      return {
        ...item,
        installed: this.isInstalled(item),
        downloading: this.downloadControllers.has(item.id),
        paused: this.pausedDownloads.has(item.id),
        progress: progress?.totalBytes
          ? Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100))
          : undefined
      };
    });
  }

  getActive(): SpeechActiveConfig {
    return { ...this.active };
  }

  setActive(role: SpeechRole, modelId: string | undefined): void {
    this.active = { ...this.active, [role]: modelId };
    this.persistActive();
  }

  private async extractArchive(archive: string, destDir: string): Promise<void> {
    mkdirSync(destDir, { recursive: true });
    return new Promise((resolve, reject) => {
      const child = spawn("tar", ["-xjf", archive, "-C", destDir], { stdio: "pipe", windowsHide: true });
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`解压失败：tar 退出码 ${code} ${stderr}`));
        }
      });
      child.on("error", (err) => reject(err));
    });
  }

  async download(modelId: string): Promise<void> {
    const item = this.getCatalogItem(modelId);
    if (!item) throw new Error(`未知语音模型：${modelId}`);
    if (!this.modelsDir) throw new Error("模型存储目录未设置");
    if (this.downloadControllers.has(modelId)) {
      throw new Error("该模型正在下载中");
    }

    const controller = new AbortController();
    this.downloadControllers.set(modelId, controller);
    this.pausedDownloads.delete(modelId);
    this.downloadProgress.set(modelId, {
      modelId,
      downloadedBytes: 0,
      totalBytes: item.archiveSizeBytes
    });

    const cacheDir = join(this.modelsDir, ".cache");
    mkdirSync(cacheDir, { recursive: true });
    const archivePath = join(cacheDir, `${modelId}.tar.bz2`);
    const destDir = this.roleDir(item.role);

    const onProgress = (p: DownloadProgress) => {
      this.downloadProgress.set(modelId, { modelId, downloadedBytes: p.downloadedBytes, totalBytes: p.totalBytes });
    };

    let success = false;
    try {
      await downloadWithResume(item.archiveUrl, archivePath, onProgress, controller.signal, item.archiveSizeBytes);
      await this.extractArchive(archivePath, destDir);
      success = true;
    } finally {
      this.downloadControllers.delete(modelId);
      this.pausedDownloads.delete(modelId);
      if (success) {
        this.downloadProgress.delete(modelId);
        try {
          rmSync(archivePath, { force: true });
        } catch {
          // ignore cleanup failure
        }
      }
    }
  }

  cancelDownload(modelId: string): void {
    this.pausedDownloads.add(modelId);
    this.downloadControllers.get(modelId)?.abort();
    this.downloadControllers.delete(modelId);
    // 保留 downloadProgress 中的进度，让 UI 显示“已暂停/可继续”；
    // 文件保留在缓存目录，下次下载会自动断点续传。
  }

  async remove(modelId: string): Promise<void> {
    const item = this.getCatalogItem(modelId);
    if (!item) throw new Error(`未知语音模型：${modelId}`);
    if (this.active[item.role] === modelId) {
      this.active = { ...this.active, [item.role]: undefined };
      this.persistActive();
    }
    this.recognizers.delete(modelId);
    this.ttsEngines.delete(modelId);
    this.pausedDownloads.delete(modelId);
    this.downloadProgress.delete(modelId);
    this.downloadControllers.delete(modelId);
    const dir = this.modelDir(item);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
    const cacheDir = join(this.modelsDir, ".cache");
    const archivePath = join(cacheDir, `${modelId}.tar.bz2`);
    if (existsSync(archivePath)) {
      rmSync(archivePath, { force: true });
    }
  }

  private getSttModelDir(): string | undefined {
    const id = this.active.stt;
    if (!id) return undefined;
    const item = this.getCatalogItem(id);
    if (!item || item.role !== "stt") return undefined;
    return this.modelDir(item);
  }

  private getTtsModelDir(): string | undefined {
    const id = this.active.tts;
    if (!id) return undefined;
    const item = this.getCatalogItem(id);
    if (!item || item.role !== "tts") return undefined;
    return this.modelDir(item);
  }

  private loadRecognizer(modelDir: string): InstanceType<typeof OfflineRecognizer> {
    const id = this.active.stt!;
    const cached = this.recognizers.get(id);
    if (cached) return cached;

    const item = this.getCatalogItem(id);
    if (!item || !item.sttConfig) {
      throw new Error("STT 模型配置不存在");
    }
    const cfg = item.sttConfig;

    const modelConfig: any = {
      tokens: join(modelDir, cfg.tokens),
      numThreads: 2,
      provider: "cpu",
      debug: 0
    };

    if (cfg.type === "whisper") {
      modelConfig.whisper = {
        encoder: join(modelDir, cfg.encoder!),
        decoder: join(modelDir, cfg.decoder!),
        language: cfg.language ?? "",
        task: cfg.task ?? "transcribe",
        tailPaddings: cfg.tailPaddings ?? -1
      };
    } else if (cfg.type === "paraformer") {
      modelConfig.paraformer = { model: join(modelDir, cfg.model!) };
    } else if (cfg.type === "senseVoice") {
      modelConfig.senseVoice = { model: join(modelDir, cfg.model!), useItn: true };
    } else if (cfg.type === "zipformerCtc") {
      modelConfig.zipformerCtc = { model: join(modelDir, cfg.model!) };
    }

    const config = {
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig
    };

    const recognizer = new OfflineRecognizer(config);
    this.recognizers.set(id, recognizer);
    return recognizer;
  }

  private loadTts(modelDir: string): InstanceType<typeof OfflineTts> {
    const id = this.active.tts!;
    const cached = this.ttsEngines.get(id);
    if (cached) return cached;

    const item = this.getCatalogItem(id);
    if (!item || !item.ttsConfig) {
      throw new Error("TTS 模型配置不存在");
    }
    const cfg = item.ttsConfig;

    const model: any = {};
    if (cfg.type === "vits") {
      model.vits = {
        model: join(modelDir, cfg.model),
        lexicon: cfg.lexicon ? join(modelDir, cfg.lexicon) : "",
        tokens: join(modelDir, cfg.tokens),
        dataDir: cfg.dataDir ? join(modelDir, cfg.dataDir) : ""
      };
    } else if (cfg.type === "kokoro") {
      model.kokoro = {
        model: join(modelDir, cfg.model),
        voices: join(modelDir, cfg.voices!),
        tokens: join(modelDir, cfg.tokens),
        dataDir: cfg.dataDir ? join(modelDir, cfg.dataDir) : "",
        lexicon: cfg.lexicon ? join(modelDir, cfg.lexicon) : "",
        lang: cfg.language ?? "zh"
      };
    }

    const ruleFsts = (cfg.ruleFsts ?? [])
      .map((f) => join(modelDir, f))
      .filter((f) => existsSync(f))
      .join(",");

    const config = {
      model,
      ruleFsts,
      maxNumSentences: 1,
      numThreads: cfg.numThreads ?? 2,
      provider: "cpu",
      debug: false
    };

    const tts = new OfflineTts(config);
    this.ttsEngines.set(id, tts);
    return tts;
  }

  async transcribe(samples: Float32Array, sampleRate: number): Promise<string> {
    const modelDir = this.getSttModelDir();
    if (!modelDir) throw new Error("未选择或未安装本地 STT 模型");
    if (sampleRate !== 16000) {
      samples = this.resample(samples, sampleRate, 16000);
      sampleRate = 16000;
    }
    const item = this.getCatalogItem(this.active.stt!);
    if (item?.sttConfig?.streaming) {
      return this.transcribeStreaming(samples, sampleRate, modelDir);
    }
    const recognizer = this.loadRecognizer(modelDir);
    const stream = recognizer.createStream();
    stream.acceptWaveform({ samples, sampleRate });
    recognizer.decode(stream);
    const result = recognizer.getResult(stream);
    stream.free?.();
    return result.text ?? "";
  }

  private loadStreamingRecognizer(modelDir: string): InstanceType<typeof OnlineRecognizer> {
    const id = this.active.stt!;
    const cached = this.onlineRecognizers.get(id);
    if (cached) return cached;

    const item = this.getCatalogItem(id);
    if (!item || !item.sttConfig) {
      throw new Error("STT 模型配置不存在");
    }
    const cfg = item.sttConfig;

    const modelConfig: any = {
      tokens: join(modelDir, cfg.tokens),
      numThreads: 2,
      provider: "cpu",
      debug: 0
    };

    if (cfg.transducer) {
      modelConfig.transducer = {
        encoder: join(modelDir, cfg.transducer.encoder),
        decoder: join(modelDir, cfg.transducer.decoder),
        joiner: join(modelDir, cfg.transducer.joiner)
      };
    } else if (cfg.type === "paraformer" && cfg.model) {
      modelConfig.paraformer = {
        encoder: join(modelDir, cfg.model),
        decoder: ""
      };
    }

    const config = {
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig,
      decodingMethod: "greedy_search",
      maxActivePaths: 4,
      endpointConfig: {
        rule1MinTrailingSilence: 0.5,
        rule2MinTrailingSilence: 1.0,
        rule3MinUtteranceLength: 20.0
      },
      enableEndpoint: true
    };

    const recognizer = new OnlineRecognizer(config);
    this.onlineRecognizers.set(id, recognizer);
    return recognizer;
  }

  /**
   * 流式转写：分块喂入音频，endpoint 触发后返回最终文本。
   * 用于模拟真实麦克风采集+VAD场景，显著缩短"用户说完→文本可用"的延迟。
   */
  private async transcribeStreaming(samples: Float32Array, sampleRate: number, modelDir: string): Promise<string> {
    if (sampleRate !== 16000) {
      samples = this.resample(samples, sampleRate, 16000);
      sampleRate = 16000;
    }

    const recognizer = this.loadStreamingRecognizer(modelDir);
    const stream = recognizer.createStream();

    const chunkSize = Math.floor(0.5 * sampleRate); // 500ms 一喂
    for (let offset = 0; offset < samples.length; offset += chunkSize) {
      const chunk = samples.subarray(offset, Math.min(offset + chunkSize, samples.length));
      stream.acceptWaveform({ samples: chunk, sampleRate });
      while (recognizer.isReady(stream)) {
        recognizer.decode(stream);
      }
    }

    stream.inputFinished();
    // 音频结束后反复解码，确保 transducer 把所有状态都刷出来。
    for (let i = 0; i < 50 && recognizer.isReady(stream); i++) {
      recognizer.decode(stream);
    }

    const result = recognizer.getResult(stream);
    stream.free?.();
    return result.text ?? "";
  }

  synthesize(text: string): { samples: Float32Array; sampleRate: number } {
    const modelDir = this.getTtsModelDir();
    if (!modelDir) throw new Error("未选择或未安装本地 TTS 模型");
    const tts = this.loadTts(modelDir);
    // vits-zh-ll 只能稳定朗读中文，连续英文字母会导致 sherpa-onnx 崩溃；
    // 先过滤拉丁字母，至少保留中/数/标点，避免整段音频中断。
    const safeText = text.replace(/[a-zA-Z]+/g, " ").trim();
    if (!safeText) {
      throw new Error("text contains only unsupported characters for local TTS");
    }
    return tts.generate({ text: safeText, sid: 0, speed: 1.0, enableExternalBuffer: false });
  }

  /**
   * 流式 TTS：边合成边回调音频块，拿到第一块即可播放。
   * onProgress 回调 { samples, sampleRate, progress }，其中 progress 是 0-1。
   */
  async synthesizeStreaming(
    text: string,
    onProgress: (info: { samples: Float32Array; sampleRate: number; progress: number }) => void
  ): Promise<{ samples: Float32Array; sampleRate: number }> {
    const modelDir = this.getTtsModelDir();
    if (!modelDir) throw new Error("未选择或未安装本地 TTS 模型");
    const tts = this.loadTts(modelDir);
    const safeText = text.replace(/[a-zA-Z]+/g, " ").trim();
    if (!safeText) {
      throw new Error("text contains only unsupported characters for local TTS");
    }
    let finalResult: { samples: Float32Array; sampleRate: number } | undefined;
    await tts.generateAsync({
      text: safeText,
      sid: 0,
      speed: 1.0,
      enableExternalBuffer: false,
      onProgress: (info: { samples: Float32Array; progress: number }) => {
        finalResult = { samples: info.samples, sampleRate: tts.sampleRate };
        onProgress({ samples: info.samples, sampleRate: tts.sampleRate, progress: info.progress });
      }
    });
    if (!finalResult) {
      throw new Error("TTS 流式合成未返回音频");
    }
    return finalResult;
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = toRate / fromRate;
    const outputLength = Math.floor(input.length * ratio);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i / ratio;
      const index0 = Math.floor(srcIndex);
      const index1 = Math.min(index0 + 1, input.length - 1);
      const fraction = srcIndex - index0;
      output[i] = input[index0] * (1 - fraction) + input[index1] * fraction;
    }
    return output;
  }
}
