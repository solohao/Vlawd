/**
 * 端到端语音延迟测试脚本。
 *
 * 输入：一个 16kHz mono WAV 文件（或任意被 ffmpeg 支持的音频文件）。
 * 输出：从音频完整输入系统到 TTS 首句可播放的真实耗时，以及 STT/LLM/TTS 各阶段耗时。
 *
 * 用法（在项目根目录 app/ 下）：
 *   npx tsx scripts/latency-test.ts --audio sample.wav \
 *     --models-dir ./models \
 *     --stt-model paraformer-zh-small \
 *     --tts-model vits-zh-ll \
 *     --llm-base-url http://127.0.0.1:11434/v1 \
 *     --llm-model qwen2.5:3b-instruct
 *
 * 批量对比不同模型组合：
 *   npx tsx scripts/latency-test.ts --benchmark
 *
 * API Key 优先从环境变量 OPENAI_API_KEY 读取，也可通过 --llm-api-key 传入。
 * 如果不提供 --llm-base-url，则使用 EchoLlmAdapter（只测 STT+TTS 机械耗时）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SpeechModelService } from "../packages/main/src/model/speech-model-service.js";
import { OpenAICompatibleLlmAdapter, EchoLlmAdapter, FastEchoLlmAdapter, type LlmAdapter } from "../packages/main/src/model/llm-adapter.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

interface Arguments {
  audioPath?: string;
  modelsDir: string;
  sttModel: string;
  ttsModel: string;
  llmBaseUrl?: string;
  llmModel?: string;
  llmApiKey?: string;
  genAudioText?: string;
  benchmark: boolean;
  streamingTts: boolean;
  fastLlm: boolean;
  minTtsLength: number;
  maxTtsLength: number;
}

function parseArgs(): Arguments {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };
  const has = (flag: string): boolean => args.includes(flag);

  return {
    audioPath: get("--audio") ? resolve(get("--audio")!) : undefined,
    modelsDir: resolve(get("--models-dir") ?? resolve(currentDir, "..", "models")),
    sttModel: get("--stt-model") ?? "paraformer-zh-small",
    ttsModel: get("--tts-model") ?? "vits-zh-ll",
    llmBaseUrl: get("--llm-base-url"),
    llmModel: get("--llm-model"),
    llmApiKey: process.env.OPENAI_API_KEY ?? get("--llm-api-key"),
    genAudioText: get("--gen-audio-text"),
    benchmark: has("--benchmark"),
    streamingTts: has("--streaming-tts"),
    fastLlm: has("--fast-llm"),
    // 中文里 4-6 个字即可构成一个可朗读短句，越短触发 TTS 越早（去气泡）。
    minTtsLength: Number(get("--min-tts-length") ?? 4),
    maxTtsLength: Number(get("--max-tts-length") ?? 120)
  };
}

/**
 * 解析 PCM16 WAV 文件并返回 16kHz mono Float32Array。
 * 只处理常见 PCM16/单声道或立体声 WAV；其他格式需要先用 ffmpeg 转换。
 */
function readWavAsFloat32(path: string, targetSampleRate = 16000): { samples: Float32Array; durationMs: number; originalSampleRate: number } {
  const buffer = readFileSync(path);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let offset = 0;
  const readString = (length: number): string => {
    let s = "";
    for (let i = 0; i < length; i++) {
      s += String.fromCharCode(view.getUint8(offset++));
    }
    return s;
  };

  if (readString(4) !== "RIFF") throw new Error("不是 WAV 文件");
  offset += 4; // file size
  if (readString(4) !== "WAVE") throw new Error("不是 WAVE");

  let fmtOffset = -1;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset < buffer.byteLength) {
    const chunkId = readString(4);
    const chunkSize = view.getUint32(offset, true);
    offset += 4;
    if (chunkId === "fmt ") {
      fmtOffset = offset;
      offset += chunkSize;
    } else if (chunkId === "data") {
      dataOffset = offset;
      dataSize = chunkSize;
      break;
    } else {
      offset += chunkSize;
    }
  }

  if (fmtOffset === -1 || dataOffset === -1) throw new Error("WAV 缺少 fmt 或 data chunk");

  const fmtView = new DataView(buffer.buffer, buffer.byteOffset + fmtOffset, dataSize > 0 ? 16 : 0);
  const audioFormat = fmtView.getUint16(0, true);
  const numChannels = fmtView.getUint16(2, true);
  const sampleRate = fmtView.getUint32(4, true);
  const bitsPerSample = fmtView.getUint16(14, true);

  if (audioFormat !== 1) throw new Error(`只支持 PCM 格式，当前 ${audioFormat}`);
  if (bitsPerSample !== 16) throw new Error(`只支持 16-bit PCM，当前 ${bitsPerSample}`);

  const samplesCount = Math.floor(dataSize / (numChannels * 2));
  const raw = new Float32Array(samplesCount);
  let dataViewOffset = dataOffset;
  for (let i = 0; i < samplesCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sum += view.getInt16(dataViewOffset, true) / 32768;
      dataViewOffset += 2;
    }
    raw[i] = sum / numChannels;
  }

  const resampled = resampleLinear(raw, sampleRate, targetSampleRate);
  const durationMs = (samplesCount / sampleRate) * 1000;
  return { samples: resampled, durationMs, originalSampleRate: sampleRate };
}

function writeWav(path: string, samples: Float32Array, sampleRate: number): void {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset++, s.charCodeAt(i));
    }
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, Math.round(s * 32767), true);
    offset += 2;
  }

  writeFileSync(path, new Uint8Array(buffer));
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input.slice();
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

async function ensureModels(speech: SpeechModelService, args: Arguments): Promise<void> {
  mkdirSync(args.modelsDir, { recursive: true });
  speech.setModelsDir(args.modelsDir);

  const status = speech.getStatus();
  const sttItem = status.find((m) => m.id === args.sttModel);
  const ttsItem = status.find((m) => m.id === args.ttsModel);
  if (!sttItem) throw new Error(`未知 STT 模型：${args.sttModel}`);
  if (!ttsItem) throw new Error(`未知 TTS 模型：${args.ttsModel}`);

  if (!sttItem.installed) {
    console.log(`[latency-test] 下载 STT 模型 ${args.sttModel} ...`);
    await speech.download(args.sttModel);
  }
  if (!ttsItem.installed) {
    console.log(`[latency-test] 下载 TTS 模型 ${args.ttsModel} ...`);
    await speech.download(args.ttsModel);
  }

  speech.setActive("stt", args.sttModel);
  speech.setActive("tts", args.ttsModel);
}

function createLlm(args: Arguments): LlmAdapter {
  if (args.llmBaseUrl && args.llmModel) {
    return new OpenAICompatibleLlmAdapter({
      baseUrl: args.llmBaseUrl,
      model: args.llmModel,
      apiKey: args.llmApiKey,
      temperature: 0.3,
      maxTokens: 80
    });
  }
  if (args.fastLlm) {
    return new FastEchoLlmAdapter(10);
  }
  return new EchoLlmAdapter(20);
}

async function generateTestAudio(speech: SpeechModelService, args: Arguments): Promise<string> {
  const text = args.genAudioText ?? "你好，请介绍一下太阳系。";
  const path = resolve(args.modelsDir, "..", "latency-test-input.wav");
  console.log(`[latency-test] 使用 TTS 生成测试音频："${text}" -> ${path}`);
  const { samples, sampleRate } = speech.synthesize(text);
  writeWav(path, samples, sampleRate);
  return path;
}

interface LatencyResult {
  stt: number;
  llmFirstToken: number;
  llmFirstSentence: number;
  tts: number;
  total: number;
  text: string;
  firstSentence: string;
}

async function runOnce(args: Arguments): Promise<LatencyResult> {
  const speech = new SpeechModelService();
  await ensureModels(speech, args);

  // 预热：把模型加载时间排除在延迟测量之外（真实运行时模型通常在启动时就已加载）。
  speech.warmUp();
  speech.synthesize("啊"); // 强制 TTS 后端完成首次初始化

  const audioPath = args.audioPath ?? (await generateTestAudio(speech, args));

  if (!existsSync(audioPath)) {
    throw new Error(`音频文件不存在：${audioPath}`);
  }

  const { samples } = readWavAsFloat32(audioPath);

  const llm = createLlm(args);

  // 音频完整进入系统（STT 开始处理）的时刻作为 "用户说完" 的基准。
  // 这样计算出的延迟等于：从用户说完到 TTS 首句合成完成的真实耗时。
  const sttStart = performance.now();
  const text = await speech.transcribe(samples, 16000);
  const sttEnd = performance.now();
  const audioEndAt = sttStart;
  console.log(`[latency-test] STT 结果："${text}" （${(sttEnd - sttStart).toFixed(1)}ms）`);

  if (!text.trim()) {
    throw new Error("STT 未识别到文本，无法继续");
  }

  const systemPrompt = "你是 Vlawd 的本地全双工桌面助手。用简洁自然的中文口语回答，适合语音朗读。";
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: text }
  ];

  console.log("[latency-test] 开始 LLM 流式生成 ...");
  const llmStart = performance.now();
  const BREAK_PUNCTUATION = /[。！？!?？.．，,；;：:\n]/;
  let firstTokenAt: number | undefined;
  let sentenceEndAt: number | undefined;
  let sentenceEndIndex = 0;
  let reply = "";
  for await (const delta of llm.stream(messages)) {
    if (firstTokenAt === undefined) {
      firstTokenAt = performance.now();
    }
    reply += delta;
    // 拿到第一个可朗读短句就准备 TTS（去气泡：不等后续句子）。
    // 强句末标点（。！？）立刻切；逗号/分号等软停顿只在长度足够时切，避免只拿到"收到"这类语气词。
    if (sentenceEndAt === undefined) {
      const hasStrongEnding = /[。！？!?？.．\n]/.test(reply);
      const hasSoftPause = /[，,；;：:]/.test(reply);
      const ready = hasStrongEnding
        ? reply.length >= args.minTtsLength
        : hasSoftPause && reply.length >= args.minTtsLength;
      if (ready) {
        const match = BREAK_PUNCTUATION.exec(reply);
        sentenceEndIndex = match ? match.index : reply.length;
        sentenceEndAt = performance.now();
        if (!args.streamingTts) {
          break;
        }
      }
    }
    // 流式模式下限制单句最大长度，避免过度聚合。
    if (args.streamingTts && reply.length >= args.maxTtsLength) {
      break;
    }
  }
  const llmEnd = performance.now();
  console.log(`[latency-test] LLM 首 token：${firstTokenAt ? (firstTokenAt - llmStart).toFixed(1) : "N/A"}ms, 已收集文本："${reply.trim()}"`);

  const firstSentence = reply.slice(0, sentenceEndIndex || reply.length).trim() || reply.trim();
  console.log(`[latency-test] 选中的首句："${firstSentence}"`);
  if (!firstSentence) {
    throw new Error("LLM 未返回可朗读文本");
  }

  console.log(`[latency-test] 开始 TTS（${args.streamingTts ? "流式首块" : "整句"}） ...`);
  let ttsEnd: number;
  let firstTtsChunkAt: number | undefined;
  let audioResult: { samples: Float32Array; sampleRate: number } | undefined;
  if (args.streamingTts) {
    const ttsStart = performance.now();
    audioResult = await speech.synthesizeStreaming(firstSentence, (chunk) => {
      if (firstTtsChunkAt === undefined) {
        firstTtsChunkAt = performance.now();
        console.log(`[latency-test] TTS 首块到达（${chunk.samples.length} samples @ ${chunk.sampleRate}Hz, progress ${(chunk.progress * 100).toFixed(0)}%）`);
      }
    });
    ttsEnd = firstTtsChunkAt ?? performance.now();
  } else {
    const ttsStart = performance.now();
    audioResult = speech.synthesize(firstSentence);
    ttsEnd = performance.now();
    console.log(`[latency-test] TTS 首句合成完成（${audioResult.samples.length} samples @ ${audioResult.sampleRate}Hz, ${(ttsEnd - ttsStart).toFixed(1)}ms）`);
  }

  const playableAt = args.streamingTts ? (firstTtsChunkAt ?? ttsEnd) : ttsEnd;

  console.log("\n--- 延迟报告 ---");
  console.log(`音频结束基准 (audioEnd)：        ${(sttStart - audioEndAt).toFixed(1)}ms`);
  console.log(`STT 完成：                       +${(sttEnd - audioEndAt).toFixed(1)}ms`);
  if (firstTokenAt) {
    console.log(`LLM 首 token：                   +${(firstTokenAt - audioEndAt).toFixed(1)}ms`);
  }
  if (sentenceEndAt) {
    console.log(`LLM 首句完成：                   +${(sentenceEndAt - audioEndAt).toFixed(1)}ms`);
  }
  if (args.streamingTts && firstTtsChunkAt) {
    console.log(`TTS 首块可播放：                 +${(firstTtsChunkAt - audioEndAt).toFixed(1)}ms`);
  }
  console.log(`TTS 首句可播放：                 +${(playableAt - audioEndAt).toFixed(1)}ms`);
  console.log(`全程（音频结束 → 可播放）：      ${(playableAt - audioEndAt).toFixed(1)}ms`);
  console.log("------------------");

  return {
    stt: sttEnd - sttStart,
    llmFirstToken: firstTokenAt ? firstTokenAt - llmStart : 0,
    llmFirstSentence: sentenceEndAt ? sentenceEndAt - llmStart : 0,
    tts: ttsEnd - sentenceEndAt!,
    total: playableAt - audioEndAt,
    text,
    firstSentence
  };
}

async function runBenchmark(args: Arguments): Promise<void> {
  const combos = [
    { stt: "paraformer-zh-small", tts: "vits-zh-ll" },
    { stt: "whisper-tiny", tts: "vits-zh-ll" },
    { stt: "streaming-zipformer-zh-14m", tts: "vits-zh-ll" },
    { stt: "streaming-zipformer-bilingual-zh-en", tts: "vits-zh-ll" }
  ];

  const results: Array<{ stt: string; tts: string; total: number; sttMs: number; ttsMs: number; text: string; firstSentence: string }> = [];

  for (const combo of combos) {
    console.log(`\n[benchmark] 组合：STT=${combo.stt}, TTS=${combo.tts}`);
    const runArgs = { ...args, sttModel: combo.stt, ttsModel: combo.tts, benchmark: false, fastLlm: true };
    try {
      const result = await runOnce(runArgs);
      results.push({
        stt: combo.stt,
        tts: combo.tts,
        total: result.total,
        sttMs: result.stt,
        ttsMs: result.tts,
        text: result.text,
        firstSentence: result.firstSentence
      });
    } catch (err) {
      console.error(`[benchmark] 组合 ${combo.stt}/${combo.tts} 失败：`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log("\n=== 模型组合延迟对比 ===");
  console.table(results.map((r) => ({
    STT: r.stt,
    TTS: r.tts,
    "STT ms": r.sttMs.toFixed(0),
    "TTS ms": r.ttsMs.toFixed(0),
    "Total ms": r.total.toFixed(0),
    "识别文本": r.text,
    "首句": r.firstSentence.slice(0, 30)
  })));
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.benchmark) {
    return runBenchmark(args);
  }

  console.log(`[latency-test] 模型目录：${args.modelsDir}`);
  console.log(`[latency-test] STT：${args.sttModel}，TTS：${args.ttsModel}`);
  let llmLabel = args.llmBaseUrl ? `${args.llmModel} @ ${args.llmBaseUrl}` : (args.fastLlm ? "FastEcho (short first sentence)" : "Echo (mock)");
  console.log(`[latency-test] LLM：${llmLabel}`);

  await runOnce(args);
}

main().catch((err) => {
  console.error("[latency-test] 失败：", err);
  process.exit(1);
});
