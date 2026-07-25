import { createWriteStream, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import pkg from "sherpa-onnx-node";
import { loadSettings, saveSettings, type ModelSettings } from "../settings.js";

const { OfflineRecognizer, OfflineTts } = pkg;

type SpeechRole = "stt" | "tts";

export interface SpeechCatalogItem {
  id: string;
  name: string;
  role: SpeechRole;
  archiveUrl: string;
  archiveSizeBytes: number;
  extractedDirName: string;
  approxSizeGB: number;
}

export interface SpeechModelStatus extends SpeechCatalogItem {
  installed: boolean;
  downloading: boolean;
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

const CATALOG: SpeechCatalogItem[] = [
  {
    id: "whisper-tiny",
    name: "Whisper Tiny (多语言)",
    role: "stt",
    archiveUrl: "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.tar.bz2",
    archiveSizeBytes: 110_800_000,
    extractedDirName: "sherpa-onnx-whisper-tiny",
    approxSizeGB: 0.24
  },
  {
    id: "vits-zh-ll",
    name: "VITS 中文 (zh-ll)",
    role: "tts",
    archiveUrl: "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-vits-zh-ll.tar.bz2",
    archiveSizeBytes: 121_000_000,
    extractedDirName: "sherpa-onnx-vits-zh-ll",
    approxSizeGB: 0.25
  }
];

export class SpeechModelService {
  private modelsDir = "";
  private active: SpeechActiveConfig = {};
  private downloadProgress = new Map<string, SpeechDownloadProgress>();
  private downloadControllers = new Map<string, AbortController>();
  private recognizers = new Map<string, InstanceType<typeof OfflineRecognizer>>();
  private ttsEngines = new Map<string, InstanceType<typeof OfflineTts>>();

  constructor() {
    this.applySettings();
  }

  setModelsDir(dir: string): void {
    if (this.modelsDir === dir) return;
    this.modelsDir = dir;
    this.recognizers.clear();
    this.ttsEngines.clear();
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

  private isInstalled(item: SpeechCatalogItem): boolean {
    if (!this.modelsDir) return false;
    const dir = this.modelDir(item);
    if (!existsSync(dir)) return false;
    try {
      const files = ["model.onnx", "tiny-encoder.int8.onnx"];
      // Whisper has tiny-encoder, TTS has model.onnx. We just check dir exists.
      return statSync(dir).isDirectory();
    } catch {
      return false;
    }
  }

  getCatalog(): SpeechCatalogItem[] {
    return CATALOG.map((item) => ({ ...item }));
  }

  getStatus(): SpeechModelStatus[] {
    return CATALOG.map((item) => {
      const downloading = this.downloadProgress.has(item.id);
      const progress = this.downloadProgress.get(item.id);
      return {
        ...item,
        installed: this.isInstalled(item),
        downloading,
        progress: progress?.totalBytes ? Math.round((progress.downloadedBytes / progress.totalBytes) * 100) : undefined
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

  private async downloadFile(url: string, dest: string, modelId: string, signal: AbortSignal): Promise<void> {
    const response = await fetch(url, { signal });
    if (!response.ok || !response.body) {
      throw new Error(`下载失败：HTTP ${response.status}`);
    }
    const totalHeader = response.headers.get("content-length");
    const totalBytes = totalHeader ? parseInt(totalHeader, 10) : undefined;
    const stream = createWriteStream(dest);
    const reader = response.body.getReader();
    let downloadedBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        stream.write(value);
        downloadedBytes += value.length;
        this.downloadProgress.set(modelId, { modelId, downloadedBytes, totalBytes });
      }
    } finally {
      reader.releaseLock();
      stream.end();
      await new Promise<void>((resolve, reject) => {
        stream.on("finish", () => resolve());
        stream.on("error", (err) => reject(err));
      });
    }
  }

  private async extractArchive(archive: string, destDir: string): Promise<void> {
    mkdirSync(destDir, { recursive: true });
    return new Promise((resolve, reject) => {
      const child = spawn("tar", ["-xjf", archive, "-C", destDir], { stdio: "pipe" });
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
    const item = CATALOG.find((m) => m.id === modelId);
    if (!item) throw new Error(`未知语音模型：${modelId}`);
    if (!this.modelsDir) throw new Error("模型存储目录未设置");
    if (this.downloadControllers.has(modelId)) {
      throw new Error("该模型正在下载中");
    }

    const controller = new AbortController();
    this.downloadControllers.set(modelId, controller);
    this.downloadProgress.set(modelId, { modelId, downloadedBytes: 0, totalBytes: item.archiveSizeBytes });

    const cacheDir = join(this.modelsDir, ".cache");
    mkdirSync(cacheDir, { recursive: true });
    const archivePath = join(cacheDir, `${modelId}.tar.bz2`);
    const destDir = this.roleDir(item.role);

    try {
      await this.downloadFile(item.archiveUrl, archivePath, modelId, controller.signal);
      await this.extractArchive(archivePath, destDir);
    } finally {
      this.downloadControllers.delete(modelId);
      this.downloadProgress.delete(modelId);
      try {
        rmSync(archivePath, { force: true });
      } catch {
        // ignore cleanup failure
      }
    }
  }

  cancelDownload(modelId: string): void {
    this.downloadControllers.get(modelId)?.abort();
    this.downloadControllers.delete(modelId);
    this.downloadProgress.delete(modelId);
  }

  async remove(modelId: string): Promise<void> {
    const item = CATALOG.find((m) => m.id === modelId);
    if (!item) throw new Error(`未知语音模型：${modelId}`);
    if (this.active[item.role] === modelId) {
      this.active = { ...this.active, [item.role]: undefined };
      this.persistActive();
    }
    this.recognizers.delete(modelId);
    this.ttsEngines.delete(modelId);
    const dir = this.modelDir(item);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  private getSttModelDir(): string | undefined {
    const id = this.active.stt;
    if (!id) return undefined;
    const item = CATALOG.find((m) => m.id === id);
    if (!item || item.role !== "stt") return undefined;
    return this.modelDir(item);
  }

  private getTtsModelDir(): string | undefined {
    const id = this.active.tts;
    if (!id) return undefined;
    const item = CATALOG.find((m) => m.id === id);
    if (!item || item.role !== "tts") return undefined;
    return this.modelDir(item);
  }

  private loadRecognizer(modelDir: string): InstanceType<typeof OfflineRecognizer> {
    const cached = this.recognizers.get(this.active.stt!);
    if (cached) return cached;
    const config = {
      modelConfig: {
        whisper: {
          encoder: join(modelDir, "tiny-encoder.int8.onnx"),
          decoder: join(modelDir, "tiny-decoder.int8.onnx"),
          language: "",
          task: "transcribe",
          tailPaddings: -1
        },
        tokens: join(modelDir, "tiny-tokens.txt")
      }
    };
    const recognizer = new OfflineRecognizer(config);
    this.recognizers.set(this.active.stt!, recognizer);
    return recognizer;
  }

  private loadTts(modelDir: string): InstanceType<typeof OfflineTts> {
    const cached = this.ttsEngines.get(this.active.tts!);
    if (cached) return cached;
    const config = {
      model: {
        vits: {
          model: join(modelDir, "model.onnx"),
          lexicon: join(modelDir, "lexicon.txt"),
          tokens: join(modelDir, "tokens.txt")
        }
      },
      ruleFsts: ["date.fst", "phone.fst", "number.fst"]
        .map((f) => join(modelDir, f))
        .join(","),
      maxNumSentences: 1,
      numThreads: 1,
      provider: "cpu",
      debug: false
    };
    const tts = new OfflineTts(config);
    this.ttsEngines.set(this.active.tts!, tts);
    return tts;
  }

  async transcribe(samples: Float32Array, sampleRate: number): Promise<string> {
    const modelDir = this.getSttModelDir();
    if (!modelDir) throw new Error("未选择或未安装本地 STT 模型");
    if (sampleRate !== 16000) {
      // 简单重采样到 16kHz（线性插值）
      samples = this.resample(samples, sampleRate, 16000);
      sampleRate = 16000;
    }
    const recognizer = this.loadRecognizer(modelDir);
    const stream = recognizer.createStream();
    stream.acceptWaveform({ samples, sampleRate });
    recognizer.decode(stream);
    const result = recognizer.getResult(stream);
    stream.free?.();
    return result.text ?? "";
  }

  synthesize(text: string): { samples: Float32Array; sampleRate: number } {
    const modelDir = this.getTtsModelDir();
    if (!modelDir) throw new Error("未选择或未安装本地 TTS 模型");
    const tts = this.loadTts(modelDir);
    return tts.generate({ text, sid: 0, speed: 1.0, enableExternalBuffer: false });
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
