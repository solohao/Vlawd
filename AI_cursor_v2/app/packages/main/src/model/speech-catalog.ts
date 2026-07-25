import type { SpeechCatalogItem } from "./speech-model-service.js";

export const SPEECH_CATALOG: SpeechCatalogItem[] = [
  {
    id: "whisper-tiny",
    name: "Whisper Tiny（多语言）",
    role: "stt",
    language: "multilingual",
    quality: "low",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.tar.bz2",
    archiveSizeBytes: 116_204_861,
    extractedDirName: "sherpa-onnx-whisper-tiny",
    approxSizeGB: 0.11,
    memoryRecommendedGB: 2,
    description: "OpenAI Whisper tiny，适合低配置，支持多语言自动识别",
    tags: ["multilingual", "quantized"],
    sttConfig: {
      type: "whisper",
      encoder: "tiny-encoder.int8.onnx",
      decoder: "tiny-decoder.int8.onnx",
      tokens: "tiny-tokens.txt",
      language: "",
      task: "transcribe",
      tailPaddings: -1
    }
  },
  {
    id: "paraformer-zh-small",
    name: "Paraformer 中文 Small",
    role: "stt",
    language: "zh",
    quality: "low",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2",
    archiveSizeBytes: 77_920_048,
    extractedDirName: "sherpa-onnx-paraformer-zh-small-2024-03-09",
    approxSizeGB: 0.07,
    memoryRecommendedGB: 2,
    description: "中文特化，支持普通话/方言，体积小",
    tags: ["chinese", "quantized"],
    sttConfig: {
      type: "paraformer",
      model: "model.int8.onnx",
      tokens: "tokens.txt"
    }
  },
  {
    id: "whisper-base",
    name: "Whisper Base（多语言）",
    role: "stt",
    language: "multilingual",
    quality: "medium",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-base.tar.bz2",
    archiveSizeBytes: 207_557_382,
    extractedDirName: "sherpa-onnx-whisper-base",
    approxSizeGB: 0.19,
    memoryRecommendedGB: 4,
    description: "OpenAI Whisper base，速度与精度更均衡",
    tags: ["multilingual", "quantized"],
    sttConfig: {
      type: "whisper",
      encoder: "base-encoder.int8.onnx",
      decoder: "base-decoder.int8.onnx",
      tokens: "base-tokens.txt",
      language: "",
      task: "transcribe",
      tailPaddings: -1
    }
  },
  {
    id: "whisper-small",
    name: "Whisper Small（多语言）",
    role: "stt",
    language: "multilingual",
    quality: "high",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2",
    archiveSizeBytes: 639_387_718,
    extractedDirName: "sherpa-onnx-whisper-small",
    approxSizeGB: 0.6,
    memoryRecommendedGB: 8,
    description: "OpenAI Whisper small，识别质量更高，需要 8GB 以上内存",
    tags: ["multilingual", "quantized"],
    sttConfig: {
      type: "whisper",
      encoder: "small-encoder.int8.onnx",
      decoder: "small-decoder.int8.onnx",
      tokens: "small-tokens.txt",
      language: "",
      task: "transcribe",
      tailPaddings: -1
    }
  },
  {
    id: "vits-piper-en_US-lessac-low",
    name: "Piper 英语 Lessac Low",
    role: "tts",
    language: "en",
    quality: "low",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-low.tar.bz2",
    archiveSizeBytes: 67_097_098,
    extractedDirName: "vits-piper-en_US-lessac-low",
    approxSizeGB: 0.06,
    memoryRecommendedGB: 2,
    description: "Piper 英语男声 Low，适合低配",
    tags: ["english", "piper"],
    ttsConfig: {
      type: "vits",
      model: "en_US-lessac-low.onnx",
      tokens: "tokens.txt",
      dataDir: "espeak-ng-data",
      numThreads: 1
    }
  },
  {
    id: "vits-zh-ll",
    name: "VITS 中文（zh-ll）",
    role: "tts",
    language: "zh",
    quality: "medium",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-vits-zh-ll.tar.bz2",
    archiveSizeBytes: 118_810_709,
    extractedDirName: "sherpa-onnx-vits-zh-ll",
    approxSizeGB: 0.11,
    memoryRecommendedGB: 2,
    description: "中文多说话人女声，基础版",
    tags: ["chinese", "vits"],
    ttsConfig: {
      type: "vits",
      model: "model.onnx",
      lexicon: "lexicon.txt",
      tokens: "tokens.txt",
      ruleFsts: ["date.fst", "phone.fst", "number.fst"],
      numThreads: 1
    }
  },
  {
    id: "vits-piper-en_US-lessac-medium",
    name: "Piper 英语 Lessac Medium",
    role: "tts",
    language: "en",
    quality: "medium",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-medium.tar.bz2",
    archiveSizeBytes: 67_230_653,
    extractedDirName: "vits-piper-en_US-lessac-medium",
    approxSizeGB: 0.06,
    memoryRecommendedGB: 2,
    description: "Piper 英语男声 Medium",
    tags: ["english", "piper"],
    ttsConfig: {
      type: "vits",
      model: "en_US-lessac-medium.onnx",
      tokens: "tokens.txt",
      dataDir: "espeak-ng-data",
      numThreads: 1
    }
  },
  {
    id: "vits-melo-tts-zh_en",
    name: "VITS 中英混合（MeloTTS）",
    role: "tts",
    language: "zh",
    quality: "medium",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-melo-tts-zh_en.tar.bz2",
    archiveSizeBytes: 167_006_755,
    extractedDirName: "vits-melo-tts-zh_en",
    approxSizeGB: 0.16,
    memoryRecommendedGB: 4,
    description: "中英双语，发音自然，适合 4GB 内存以上",
    tags: ["chinese", "english", "vits"],
    ttsConfig: {
      type: "vits",
      model: "model.onnx",
      lexicon: "lexicon.txt",
      tokens: "tokens.txt",
      ruleFsts: ["date.fst", "phone.fst", "number.fst"],
      numThreads: 2
    }
  },
  {
    id: "vits-piper-en_US-lessac-high",
    name: "Piper 英语 Lessac High",
    role: "tts",
    language: "en",
    quality: "high",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-high.tar.bz2",
    archiveSizeBytes: 115_545_841,
    extractedDirName: "vits-piper-en_US-lessac-high",
    approxSizeGB: 0.11,
    memoryRecommendedGB: 4,
    description: "Piper 英语男声 High",
    tags: ["english", "piper"],
    ttsConfig: {
      type: "vits",
      model: "en_US-lessac-high.onnx",
      tokens: "tokens.txt",
      dataDir: "espeak-ng-data",
      numThreads: 2
    }
  },
  {
    id: "kokoro-multi-lang-v1_0",
    name: "Kokoro 多语言 v1.0",
    role: "tts",
    language: "multilingual",
    quality: "high",
    archiveUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2",
    archiveSizeBytes: 349_418_188,
    extractedDirName: "kokoro-multi-lang-v1_0",
    approxSizeGB: 0.33,
    memoryRecommendedGB: 6,
    description: "Kokoro 多语言 53 说话人，推荐 6GB 内存以上",
    tags: ["multilingual", "kokoro"],
    ttsConfig: {
      type: "kokoro",
      model: "model.onnx",
      voices: "voices.bin",
      tokens: "tokens.txt",
      dataDir: "espeak-ng-data",
      numThreads: 2
    }
  }
];
