/**
 * 模型目录（含硬件需求元数据）与意图模板。
 *
 * 目录是"能力层"的真源：每个模型带最低/推荐显存、磁盘占用、CPU 内存、以及
 * 质量/速度/中文三维能力分。量化档作为独立条目（共享 baseId），让解析器可以
 * 为了塞进显存自动降级。模板只描述取向意图，不写死模型。
 */

import type { IntentTemplate, ResolverModel } from "./model-resolver.js";

export const modelCatalog: ResolverModel[] = [
  // 听 · 语音识别
  { id: "whisper-large-v3", name: "Whisper Large v3", capability: "hearing", baseId: "whisper-large-v3", sizeGB: 3.1, minVramMB: 2000, recVramMB: 4000, minRamGB: 6, quality: 92, speed: 55, chinese: 80, local: true },
  { id: "paraformer-zh-v2", name: "Paraformer 中文 v2", capability: "hearing", baseId: "paraformer-zh", sizeGB: 0.9, minVramMB: 800, recVramMB: 1500, minRamGB: 3, quality: 84, speed: 80, chinese: 96, local: true },
  { id: "whisper-medium", name: "Whisper Medium", capability: "hearing", baseId: "whisper-medium", sizeGB: 1.5, minVramMB: 1200, recVramMB: 2500, minRamGB: 4, quality: 82, speed: 72, chinese: 70, local: true },
  { id: "whisper-small", name: "Whisper Small", capability: "hearing", baseId: "whisper-small", sizeGB: 0.5, minVramMB: 600, recVramMB: 1200, minRamGB: 2, quality: 68, speed: 90, chinese: 55, local: true },

  // 想 · 语言模型（含量化档）
  { id: "qwen2.5-72b-q4", name: "Qwen2.5 72B Instruct", capability: "thinking", baseId: "qwen2.5-72b", quant: "Q4", sizeGB: 40, minVramMB: 42000, recVramMB: 48000, minRamGB: 64, quality: 97, speed: 30, chinese: 95, local: true },
  { id: "llama3.1-70b-q4", name: "Llama 3.1 70B Instruct", capability: "thinking", baseId: "llama3.1-70b", quant: "Q4", sizeGB: 40, minVramMB: 42000, recVramMB: 48000, minRamGB: 64, quality: 96, speed: 30, chinese: 78, local: true },
  { id: "qwen2.5-32b-q4", name: "Qwen2.5 32B Instruct", capability: "thinking", baseId: "qwen2.5-32b", quant: "Q4", sizeGB: 20, minVramMB: 22000, recVramMB: 26000, minRamGB: 40, quality: 92, speed: 42, chinese: 93, local: true },
  { id: "qwen2.5-14b-q4", name: "Qwen2.5 14B Instruct", capability: "thinking", baseId: "qwen2.5-14b", quant: "Q4", sizeGB: 9, minVramMB: 10000, recVramMB: 12000, minRamGB: 20, quality: 86, speed: 58, chinese: 90, local: true },
  { id: "qwen2.5-7b-q8", name: "Qwen2.5 7B Instruct (Q8)", capability: "thinking", baseId: "qwen2.5-7b", quant: "Q8", sizeGB: 8, minVramMB: 9000, recVramMB: 11000, minRamGB: 16, quality: 82, speed: 65, chinese: 88, local: true },
  { id: "qwen2.5-7b-q4", name: "Qwen2.5 7B Instruct (Q4)", capability: "thinking", baseId: "qwen2.5-7b", quant: "Q4", sizeGB: 4.7, minVramMB: 6000, recVramMB: 8000, minRamGB: 12, quality: 78, speed: 75, chinese: 88, local: true },
  { id: "llama3.1-8b-q4", name: "Llama 3.1 8B Instruct", capability: "thinking", baseId: "llama3.1-8b", quant: "Q4", sizeGB: 4.9, minVramMB: 6200, recVramMB: 8200, minRamGB: 12, quality: 76, speed: 74, chinese: 66, local: true },
  { id: "qwen2.5-3b-q4", name: "Qwen2.5 3B Instruct", capability: "thinking", baseId: "qwen2.5-3b", quant: "Q4", sizeGB: 2.2, minVramMB: 3000, recVramMB: 4500, minRamGB: 8, quality: 66, speed: 90, chinese: 82, local: true },
  { id: "phi3.5-mini-q4", name: "Phi-3.5 Mini Instruct", capability: "thinking", baseId: "phi3.5-mini", quant: "Q4", sizeGB: 2.4, minVramMB: 3200, recVramMB: 4800, minRamGB: 8, quality: 64, speed: 92, chinese: 55, local: true },
  { id: "gpt-4o-cloud", name: "GPT-4o（云端 / 中转）", capability: "thinking", baseId: "gpt-4o", sizeGB: 0, minVramMB: 0, recVramMB: 0, minRamGB: 1, quality: 98, speed: 80, chinese: 92, local: false },

  // 说 · 语音合成
  { id: "cosyvoice-2", name: "CosyVoice 2", capability: "speaking", baseId: "cosyvoice-2", sizeGB: 1.6, minVramMB: 1500, recVramMB: 3000, minRamGB: 4, quality: 90, speed: 70, chinese: 95, local: true },
  { id: "fish-speech-1.4", name: "Fish Speech 1.4", capability: "speaking", baseId: "fish-speech", sizeGB: 2.5, minVramMB: 2200, recVramMB: 3800, minRamGB: 6, quality: 88, speed: 62, chinese: 80, local: true },
  { id: "piper-zh", name: "Piper 中文", capability: "speaking", baseId: "piper", sizeGB: 0.1, minVramMB: 0, recVramMB: 500, minRamGB: 1, quality: 70, speed: 96, chinese: 85, local: true },
  { id: "edge-tts", name: "Edge TTS（云端）", capability: "speaking", baseId: "edge-tts", sizeGB: 0.05, minVramMB: 0, recVramMB: 0, minRamGB: 1, quality: 80, speed: 95, chinese: 82, local: false }
];

export const intentTemplates: IntentTemplate[] = [
  {
    id: "balanced",
    name: "推荐 · 均衡模式",
    description: "速度与质量的平衡，适合大多数日常使用。",
    official: true,
    weights: { quality: 5, speed: 3.5, chinese: 1.5 },
    requireLocal: false,
    allowCloudFallback: true,
    perf: "在响应速度与回答质量之间取得良好平衡",
    privacy: "部分使用本地模型，聊天内容加密传输",
    scene: "日常问答、写作、翻译、信息查询等"
  },
  {
    id: "speed",
    name: "极速模式",
    description: "响应更快，适合快速问答与效率优先任务。",
    official: true,
    weights: { quality: 2, speed: 7, chinese: 1 },
    requireLocal: false,
    allowCloudFallback: true,
    perf: "以更低延迟优先，响应速度最快",
    privacy: "混合本地与云端，兼顾速度与效果",
    scene: "简短问答、指令执行、效率优先场景"
  },
  {
    id: "quality",
    name: "高质量模式",
    description: "更深入的思考与更高质量的回答。",
    official: true,
    weights: { quality: 8, speed: 1, chinese: 1 },
    requireLocal: false,
    allowCloudFallback: true,
    perf: "以更强的理解与更高质量输出为优先",
    privacy: "部分使用本地模型，聊天内容加密传输",
    scene: "写作、分析、复杂任务与深度对话"
  },
  {
    id: "local",
    name: "本地隐私模式",
    description: "主要使用本地模型，数据不离开你的设备。",
    official: true,
    weights: { quality: 5, speed: 3, chinese: 2 },
    requireLocal: true,
    allowCloudFallback: false,
    perf: "全本地运行，性能取决于本机设备",
    privacy: "全部本地处理，数据不离开你的设备",
    scene: "机密资料、离线环境、隐私优先场景"
  },
  {
    id: "chinese",
    name: "中文优化模式",
    description: "针对中文理解与表达进行了优化。",
    official: true,
    weights: { quality: 4, speed: 2.5, chinese: 3.5 },
    requireLocal: false,
    allowCloudFallback: true,
    perf: "面向中文优化，兼顾速度与效果",
    privacy: "部分使用本地模型，聊天内容加密传输",
    scene: "中文写作、翻译、会议与办公场景"
  }
];
