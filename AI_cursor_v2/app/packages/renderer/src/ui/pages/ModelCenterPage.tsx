import { useState, type ReactNode } from "react";
import { useModelCenter } from "../../runtime/useModelCenter.js";
import { useConversation } from "../../runtime/useConversation.js";
import type { ModelBackendKind, ModelCatalogItem } from "@ai-cursor-v2/shared";
import {
  CheckIcon,
  ChevronDown,
  CubeIcon,
  DownloadIcon,
  GearIcon,
  HeadphonesIcon,
  MicIcon,
  RefreshIcon,
  SparkIcon
} from "../icons.js";

const surface = "rounded-xl border border-slate-200/80 bg-white shadow-sm";
const interactive = "outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-400/40";

function StateDot({ active }: { active: boolean }) {
  return <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-brand-500" : "bg-slate-300"}`} />;
}

const backendLabels: Record<ModelBackendKind, string> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  custom: "自定义接口"
};

const formatGB = (gb: number) => `${gb.toFixed(1)} GB`;

export function ModelCenterPage() {
  const model = useModelCenter();
  const convo = useConversation();
  const [architecture, setArchitecture] = useState<"pipeline" | "duplex">("pipeline");
  const [selectedPreset, setSelectedPreset] = useState("balanced");
  const [selectedStt, setSelectedStt] = useState("whisper-large-v3");
  const [selectedLlm, setSelectedLlm] = useState("qwen-2.5-7b");
  const [selectedTts, setSelectedTts] = useState("cosyvoice-2");
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const voiceReady = convo.micSupported && convo.sttSupported && convo.ttsSupported;
  const realLocal = model.snapshot.backend.status === "running" && voiceReady;

  const oneClickReady = async () => {
    if (model.snapshot.backend.status !== "running") {
      await model.installOllama();
    }
    await model.refreshBackend();
  };

  const presets = [
    {
      id: "speed",
      name: "极速模式",
      desc: "响应最快，资源占用低\n适合轻量对话与快速响应",
      feature: "低延迟 · 低占用",
      recommended: false
    },
    {
      id: "balanced",
      name: "均衡模式",
      desc: "性能与效果兼顾平衡\n适合大多数日常使用场景",
      feature: "均衡性能 · 稳定可靠",
      recommended: true
    },
    {
      id: "quality",
      name: "高质量模式",
      desc: "更强理解与更高质量\n适合复杂对话与深度交流",
      feature: "高质量 · 高表现",
      recommended: false
    },
    {
      id: "offline",
      name: "完全本地模式",
      desc: "全本地运行，数据私密\n适合机密场合与隐私需要",
      feature: "隐私安全 · 离线可用",
      recommended: false
    },
    {
      id: "chinese",
      name: "中文优先模式",
      desc: "针对中文优化的模型组合\n更适合中文理解与表达",
      feature: "中文化 · 本达更自然",
      recommended: false
    }
  ];

  const sttModels = [
    { id: "whisper-large-v3", name: "Whisper Large V3", tags: ["中英全能"], feature: "本地高效", size: "8.1 GB", recommended: true },
    { id: "paraformer-v2", name: "Paraformer v2", tags: ["中文"], feature: "高准确度", size: "1.2 GB", recommended: false },
    { id: "whisper-small", name: "Whisper Small", tags: ["多语言"], feature: "轻量快速", size: "244 MB", recommended: false }
  ];

  const llmModels = [
    { id: "qwen-2.5-7b", name: "Qwen 2.5 7B Instruct", tags: ["中文优质"], feature: "通用理解", size: "4.7 GB", recommended: true },
    { id: "llama-3.1-8b", name: "Llama 3.1 8B Instruct", tags: ["多语言"], feature: "轻量高效", size: "4.9 GB", recommended: false },
    { id: "phi-3.5-mini", name: "Phi-3.5 Mini Instruct", tags: ["多语言"], feature: "轻量高效", size: "2.2 GB", recommended: false }
  ];

  const ttsModels = [
    { id: "cosyvoice-2", name: "CosyVoice 2", tags: ["中文自然"], feature: "情感丰富", size: "1.6 GB", recommended: true },
    { id: "edge-tts", name: "Edge TTS", tags: ["中英品质"], feature: "音质优良", size: "0.6 GB", recommended: false },
    { id: "fish-speech-1.4", name: "Fish Speech 1.4", tags: ["多语言"], feature: "高保真", size: "2.5 GB", recommended: false }
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50/30">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1420px] px-6 py-5">
          {/* 页面标题 */}
          <header className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="flex items-center gap-2.5 text-[24px] font-bold text-slate-950">
                模型中心 <CubeIcon className="text-brand-600" width={26} />
              </h1>
              <p className="mt-1.5 text-[12.5px] text-slate-600">
                一键配置语音模型栈，无需技术知识，立即开始对话。
              </p>
            </div>
            <span className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${voiceReady ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-400"}`}>
              <StateDot active={voiceReady} />
              {voiceReady ? "AI 员工已就绪" : "等待配置"}
            </span>
          </header>

          {/* 一键就绪横幅 */}
          <section className={`${surface} mb-4 flex items-center gap-5 overflow-hidden bg-[linear-gradient(110deg,rgba(245,251,227,.85),rgba(255,255,255,.95))] px-5 py-4`}>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-brand-300 bg-brand-50 text-[30px] font-bold text-brand-700 shadow-[inset_0_0_0_8px_white]">
              ⚡
            </span>
            <div className="w-[260px] shrink-0">
              <h2 className="text-[17px] font-bold text-slate-950">一键就绪，立即开始</h2>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                AI Cursor 自动检测您的设备与语言偏好，为您配置最佳语音模型栈。
              </p>
            </div>
            <div className="flex h-[64px] min-w-0 flex-1 items-center gap-4 rounded-xl border border-slate-200 bg-white/90 px-4 text-[10px]">
              <DeviceFact icon={<HeadphonesIcon width={18} />} title="NVIDIA GeForce RTX 4060 Laptop GPU" detail="GPU · 8.0 GB 显存" />
              <DeviceFact icon={<GearIcon width={18} />} title="代存 16.0 GB" detail="系统内存" />
              <DeviceFact icon={<SparkIcon width={18} />} title="语言 中文（简体）" detail="界面语言" last />
            </div>
            <button
              disabled={model.busy}
              onClick={() => void oneClickReady()}
              className={`${interactive} h-12 w-[140px] shrink-0 rounded-xl bg-brand-600 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(101,127,18,.2)] hover:bg-brand-700 disabled:translate-y-0 disabled:opacity-50`}
            >
              {model.busy ? "配置中..." : "一键就绪"}
            </button>
          </section>

          {/* 预设模式选择 */}
          <SectionLabel>选择预设模式</SectionLabel>
          <div className="mb-4 grid grid-cols-5 gap-3">
            {presets.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedPreset(item.id)}
                className={`${surface} ${interactive} relative flex flex-col items-start justify-between p-4 text-left ${
                  selectedPreset === item.id
                    ? "border-brand-500 bg-brand-50/30 shadow-[0_4px_16px_rgba(101,127,18,.1)] ring-2 ring-brand-200"
                    : "hover:border-brand-300 hover:bg-brand-50/10"
                } min-h-[140px]`}
              >
                {item.recommended && (
                  <span className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-brand-600 px-3 py-1 text-[10px] font-semibold text-white">
                    推荐
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                    selectedPreset === item.id ? "border-brand-600 bg-white" : "border-slate-300 bg-white"
                  }`}>
                    {selectedPreset === item.id && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
                  </span>
                  <b className="text-[13px] text-slate-900">{item.name}</b>
                </div>
                <p className="mt-2 whitespace-pre-line text-[10px] leading-[1.6] text-slate-600">{item.desc}</p>
                <span className="mt-2 inline-block rounded-md bg-brand-100 px-2.5 py-1 text-[9px] font-medium text-brand-700">
                  {item.feature}
                </span>
              </button>
            ))}
          </div>

          {/* 架构选择 */}
          <SectionLabel>选择架构</SectionLabel>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <ArchitectureCard
              selected={architecture === "pipeline"}
              onClick={() => setArchitecture("pipeline")}
              title="流水线架构（分离式）"
              subtitle="听（语音识别）→ 想（语言模型）→ 说（语音合成）"
              detail="模块可独立验证与调试，灵活性高度"
            />
            <ArchitectureCard
              selected={architecture === "duplex"}
              onClick={() => setArchitecture("duplex")}
              title="原生全双工架构（端到端）"
              subtitle="单一模型驱动架构，超低延迟，对话实时性更佳"
              detail="需要专用 Provider（如 OpenAI Realtime API）"
            />
          </div>

          {/* 高级配置 */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-[13px] font-semibold text-slate-950">
              高级配置 <span className="font-normal text-slate-500">（可选）</span>
            </h2>
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-700"
            >
              {advancedOpen ? "收起" : "展开"} <ChevronDown width={14} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {advancedOpen && architecture === "pipeline" && (
            <div className="mb-4 grid grid-cols-3 gap-4">
              <ModelSlot
                title="听（语音识别 STT）"
                models={sttModels}
                selected={selectedStt}
                onSelect={setSelectedStt}
              />
              <ModelSlot
                title="想（语音模型 LLM）"
                models={llmModels}
                selected={selectedLlm}
                onSelect={setSelectedLlm}
              />
              <ModelSlot
                title="说（语音合成 TTS）"
                models={ttsModels}
                selected={selectedTts}
                onSelect={setSelectedTts}
              />
            </div>
          )}

          {advancedOpen && architecture === "duplex" && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-[12px] text-slate-600">
                原生全双工架构需要专用 Provider 支持，如 OpenAI Realtime API。
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                当前暂未配置，流水线架构仍可继续使用。
              </p>
            </div>
          )}

          {/* 底部状态区 */}
          <div className={`${surface} grid grid-cols-[1.2fr_1fr_280px] divide-x divide-slate-200 overflow-hidden`}>
            <StoragePanel model={model} />
            <DownloadPanel model={model} />
            <section className="p-4">
              <h3 className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-950">
                <MicIcon width={15} className="text-brand-700" />
                语音引擎状态
              </h3>
              <div className={`mt-3 rounded-lg border p-3 ${realLocal ? "border-brand-300 bg-brand-50/40" : "border-slate-200 bg-slate-50"}`}>
                <p className={`flex items-center gap-2 text-[11px] font-semibold ${realLocal ? "text-brand-700" : "text-slate-600"}`}>
                  <StateDot active={realLocal} />
                  {realLocal ? "本地模型运行中" : "等待配置"}
                </p>
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-slate-500">
                  {realLocal ? "端到端语音对话已就绪，无需连接云端服务" : "本地端到端语音对话待配置"}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-950">
      {children}
    </h2>
  );
}

function DeviceFact({ icon, title, detail, last = false }: { icon: ReactNode; title: string; detail: string; last?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${last ? "" : "border-r border-slate-200 pr-4"}`}>
      <span className="text-slate-500">{icon}</span>
      <span className="min-w-0">
        <b className="block truncate text-[11px] font-semibold text-slate-700">{title}</b>
        <small className="block truncate text-[9.5px] text-slate-500">{detail}</small>
      </span>
    </div>
  );
}

function ArchitectureCard({
  selected,
  onClick,
  title,
  subtitle,
  detail
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`${surface} ${interactive} flex items-start gap-3 p-4 text-left ${
        selected ? "border-brand-500 bg-brand-50/30 ring-2 ring-brand-200" : "hover:border-brand-300"
      }`}
    >
      <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-brand-600" : "border-slate-300"}`}>
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
      </span>
      <span className="min-w-0">
        <b className="block text-[13px] text-slate-900">{title}</b>
        <span className="mt-1.5 block text-[10.5px] leading-relaxed text-slate-600">{subtitle}</span>
        <small className="mt-1 block text-[9.5px] text-slate-500">{detail}</small>
      </span>
    </button>
  );
}

interface ModelItem {
  id: string;
  name: string;
  tags: string[];
  feature: string;
  size: string;
  recommended: boolean;
}

function ModelSlot({
  title,
  models,
  selected,
  onSelect
}: {
  title: string;
  models: ModelItem[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className={`${surface} flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-[11.5px] font-semibold text-slate-950">{title}</h3>
        <ChevronDown width={14} className="text-slate-400" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <p className="px-4 pt-2 text-[9px] font-medium text-brand-700">推荐</p>
        <div className="space-y-1.5 p-2">
          {models.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`${interactive} flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left ${
                selected === item.id ? "border-brand-500 bg-brand-50/30" : "border-slate-100 hover:border-brand-200"
              }`}
            >
              <span
                className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                  selected === item.id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
                }`}
              >
                {selected === item.id && <CheckIcon width={10} />}
              </span>
              <span className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <b className="text-[11px] font-semibold text-slate-900">{item.name}</b>
                  <span className="text-[9.5px] text-slate-500">{item.size}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[8.5px] text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[9px] text-slate-500">{item.feature}</p>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoragePanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const { storage } = model.snapshot;
  const usedGB = 38.6;
  const totalGB = 200;
  const pct = Math.round((usedGB / totalGB) * 100);

  return (
    <section className="p-4">
      <h3 className="mb-2 flex items-center gap-2 text-[11.5px] font-semibold text-slate-950">
        <FileIcon width={15} className="text-slate-600" />
        模型存储位置
      </h3>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void model.chooseStorageRoot()}
          className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10.5px] text-slate-600 hover:border-slate-300"
        >
          {storage.rootDir || "D:\\AI Cursor\\Models"}
        </button>
        {storage.rootDir && (
          <button onClick={() => void model.openStorageLocation()} className="text-[10px] text-brand-700 hover:underline">
            打开
          </button>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[9.5px] text-slate-500">
        <span>已用空间：{usedGB} GB / {totalGB} GB</span>
        <span>{pct}% 可用</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function DownloadPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const pull = model.snapshot.activePull;
  const downloading = true; // Demo state
  const downloadModel = "Qwen 2.5 7B Instruct";
  const downloadProgress = 45;
  const downloadSpeed = "19.6 MB/s";
  const downloadSize = "2.1 GB / 4.7 GB";

  return (
    <section className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-950">
          <DownloadIcon width={15} className="text-slate-600" />
          下载进度
        </h3>
        <button onClick={() => void model.refreshBackend()} title="刷新状态">
          <RefreshIcon width={14} className="text-slate-400 hover:text-slate-600" />
        </button>
      </div>
      {downloading ? (
        <div>
          <p className="truncate text-[10.5px] text-slate-700">
            正在下载 {downloadModel}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full bg-brand-500 transition-all"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[9.5px] text-slate-500">
            <span>{downloadSize}</span>
            <span>{downloadProgress}%</span>
          </div>
          <div className="mt-1 flex justify-between text-[9.5px] text-slate-500">
            <span>{downloadSpeed}</span>
            <button onClick={() => void model.cancelPull()} className="text-rose-500 hover:underline">
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[10.5px] text-slate-400">当前没有下载任务</p>
      )}
    </section>
  );
}

function FileIcon({ width, className }: { width: number; className?: string }) {
  return (
    <svg width={width} height={width} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 2v7h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
