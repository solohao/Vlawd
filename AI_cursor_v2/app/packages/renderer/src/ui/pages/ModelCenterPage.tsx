import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useModelCenter } from "../../runtime/useModelCenter.js";
import {
  ArrowLeft,
  BoltIcon,
  BrainIcon,
  CheckIcon,
  ChevronDown,
  ChevronRight,
  DotsIcon,
  EarIcon,
  GlobeIcon,
  InfoIcon,
  LockIcon,
  NotebookIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SlidersIcon,
  SparkIcon,
  SpeakerIcon
} from "../icons.js";
import { Button, cn } from "../../design-system/index.js";

type Tab = "config" | "library";

interface Preset {
  id: string;
  name: string;
  desc: string;
  current?: boolean;
  custom?: boolean;
  lastUsed?: string;
  stt: string;
  llm: string;
  tts: string;
  perf: string;
  perfDesc: string;
  privacy: string;
  privacyDesc: string;
  scene: string;
  sceneDesc: string;
}

const presets: Preset[] = [
  {
    id: "balanced",
    name: "推荐 · 均衡模式",
    desc: "速度与质量的平衡，适合大多数日常使用。",
    current: true,
    stt: "Whisper Large v3",
    llm: "Aurora 7B Instruct",
    tts: "CosyVoice 2",
    perf: "均衡",
    perfDesc: "在响应速度与回答质量之间取得良好平衡",
    privacy: "较高",
    privacyDesc: "部分使用本地模型，聊天内容加密传输",
    scene: "通用",
    sceneDesc: "日常问答、写作、翻译、信息查询等"
  },
  {
    id: "speed",
    name: "极速模式",
    desc: "响应更快，适合快速问答与效率优先任务。",
    stt: "Whisper Small",
    llm: "Qwen 2.5 3B Instruct",
    tts: "Edge TTS",
    perf: "极速",
    perfDesc: "以更低延迟优先，响应速度最快",
    privacy: "中等",
    privacyDesc: "混合本地与云端，兼顾速度与效果",
    scene: "快问快答",
    sceneDesc: "简短问答、指令执行、效率优先场景"
  },
  {
    id: "quality",
    name: "高质量模式",
    desc: "更深入的思考与更高质量的回答。",
    stt: "Whisper Large v3",
    llm: "Llama 3.1 70B Instruct",
    tts: "CosyVoice 2",
    perf: "高质量",
    perfDesc: "以更强的理解与更高质量输出为优先",
    privacy: "较高",
    privacyDesc: "部分使用本地模型，聊天内容加密传输",
    scene: "创作与深度交流",
    sceneDesc: "写作、分析、复杂任务与深度对话"
  },
  {
    id: "local",
    name: "本地隐私模式",
    desc: "主要使用本地模型，数据不离开你的设备。",
    stt: "Whisper Large v3",
    llm: "Qwen 2.5 14B Instruct",
    tts: "Fish Speech 1.4",
    perf: "偏均衡",
    perfDesc: "全本地运行，性能取决于本机设备",
    privacy: "最高",
    privacyDesc: "全部本地处理，数据不离开你的设备",
    scene: "隐私敏感场景",
    sceneDesc: "机密资料、离线环境、隐私优先场景"
  },
  {
    id: "chinese",
    name: "中文优化模式",
    desc: "针对中文理解与表达进行了优化。",
    stt: "Paraformer v2",
    llm: "Qwen 2.5 14B Instruct",
    tts: "CosyVoice 2",
    perf: "均衡",
    perfDesc: "面向中文优化，兼顾速度与效果",
    privacy: "较高",
    privacyDesc: "部分使用本地模型，聊天内容加密传输",
    scene: "中文办公",
    sceneDesc: "中文写作、翻译、会议与办公场景"
  },
  {
    id: "custom",
    name: "我的自定义配置",
    desc: "上次使用：2 天前",
    custom: true,
    lastUsed: "2 天前",
    stt: "Whisper Large v3",
    llm: "Llama 3.1 70B Instruct",
    tts: "Azure Neural TTS",
    perf: "自定义",
    perfDesc: "由你亲自调整的模型组合",
    privacy: "较高",
    privacyDesc: "部分使用本地模型，聊天内容加密传输",
    scene: "个性化",
    sceneDesc: "根据你的偏好定制的使用场景"
  }
];

export function ModelCenterPage() {
  const model = useModelCenter();
  const [tab, setTab] = useState<Tab>("config");
  const [editing, setEditing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("balanced");

  if (editing) {
    return <EditConfigView presetName="均衡模式" onBack={() => setEditing(false)} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50/40">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1320px] px-8 py-7">
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900">模型中心</h1>
              <p className="mt-1.5 text-[12.5px] text-slate-500">
                选择最适合你的模型配置，助手已根据你的设备为你准备好推荐方案。
              </p>
            </div>
            <Button variant="secondary" size="sm" className="h-9 gap-1.5" animated={false}>
              <PlusIcon width={15} /> 新建配置
            </Button>
          </header>

          <div className="mt-5 flex items-center gap-6 border-b border-slate-200">
            <TabButton active={tab === "config"} onClick={() => setTab("config")}>
              配置
            </TabButton>
            <TabButton active={tab === "library"} onClick={() => setTab("library")}>
              模型库
            </TabButton>
          </div>

          <div className="pt-6">
            {tab === "config" ? (
              <ConfigView
                selectedPreset={selectedPreset}
                onSelect={setSelectedPreset}
                onEdit={() => setEditing(true)}
              />
            ) : (
              <LibraryView model={model} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative -mb-px pb-2.5 text-[14px] font-medium transition-colors",
        active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {children}
      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />}
    </button>
  );
}

/* ------------------------------------------------------------------ 配置 */

function ConfigView({
  selectedPreset,
  onSelect,
  onEdit
}: {
  selectedPreset: string;
  onSelect: (id: string) => void;
  onEdit: () => void;
}) {
  const preset = presets.find((p) => p.id === selectedPreset) ?? presets[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,480px)_1fr]">
      {/* 选择配置 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[15px] font-semibold text-slate-900">选择配置</h2>
        <p className="mt-1 text-[12px] text-slate-500">选择一种配置以应用到你的助手</p>

        <div className="mt-4 space-y-2.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                selectedPreset === p.id
                  ? "border-brand-400 bg-brand-50/40 ring-1 ring-brand-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <Radio checked={selectedPreset === p.id} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <b className="text-[13.5px] font-semibold text-slate-900">{p.name}</b>
                  {p.current && (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      当前使用
                    </span>
                  )}
                  {p.custom && (
                    <span className="ml-auto text-slate-300">
                      <DotsIcon width={16} />
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-slate-500">{p.desc}</span>
              </span>
            </button>
          ))}

          <button
            onClick={onEdit}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="min-w-0 flex-1">
              <b className="block text-[13px] font-semibold text-slate-800">管理配置</b>
              <span className="mt-0.5 block text-[11px] text-slate-500">重命名、编辑或恢复配置</span>
            </span>
            <ChevronRight width={16} className="text-slate-400" />
          </button>
        </div>
      </section>

      {/* 当前配置概览 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">当前配置概览</h2>
        <p className="mt-1 text-[12px] text-slate-500">助手将使用以下模型为你提供最佳体验</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CapabilitySummary icon={<EarIcon width={18} />} title="听见你" kind="语音识别模型" model={preset.stt} />
          <CapabilitySummary icon={<BrainIcon width={18} />} title="理解与思考" kind="语言模型" model={preset.llm} />
          <CapabilitySummary icon={<SpeakerIcon width={18} />} title="回应你" kind="语音合成模型" model={preset.tts} />
        </div>

        <div className="my-5 h-px bg-slate-100" />

        <h3 className="text-[13.5px] font-semibold text-slate-900">关于当前配置</h3>
        <div className="mt-3 space-y-1">
          <AboutRow icon={<BoltIcon width={16} />} label="性能" desc={preset.perfDesc} value={preset.perf} />
          <AboutRow icon={<LockIcon width={16} />} label="隐私" desc={preset.privacyDesc} value={preset.privacy} />
          <AboutRow icon={<GlobeIcon width={16} />} label="适用场景" desc={preset.sceneDesc} value={preset.scene} />
        </div>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[13.5px] font-semibold text-slate-900">切换配置后</h3>
            <p className="mt-1 max-w-md text-[12px] leading-relaxed text-slate-500">
              系统会自动检查并准备所需模型，无需手动下载或设置。
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[11.5px] font-medium text-brand-700">
            <CheckIcon width={14} /> 准备就绪
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-5">
          <Button variant="secondary" size="sm" className="h-9 gap-1.5" animated={false}>
            <PencilIcon width={14} /> 重命名
          </Button>
          <Button variant="secondary" size="sm" className="h-9 gap-1.5" animated={false} onClick={onEdit}>
            <SlidersIcon width={14} /> 编辑配置
          </Button>
          <Button variant="secondary" size="sm" className="h-9 gap-1.5" animated={false}>
            <RefreshIcon width={14} /> 恢复默认
          </Button>
          <Button variant="primary" size="sm" className="h-9 gap-1.5" animated={false}>
            <CheckIcon width={14} /> 应用此配置
          </Button>
        </div>
      </section>
    </div>
  );
}

function CapabilitySummary({
  icon,
  title,
  kind,
  model
}: {
  icon: ReactNode;
  title: string;
  kind: string;
  model: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-600">
        <span className="text-slate-500">{icon}</span>
        <span className="text-[13px] font-semibold text-slate-900">{title}</span>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">{kind}</p>
      <p className="mt-1 text-[13px] font-medium text-slate-800">{model}</p>
      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-medium text-brand-700">
        <CheckIcon width={14} /> 就绪
      </p>
    </div>
  );
}

function AboutRow({
  icon,
  label,
  desc,
  value
}: {
  icon: ReactNode;
  label: string;
  desc: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
      </div>
      <span className="text-[12.5px] font-medium text-slate-700">{value}</span>
    </div>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border-2",
        checked ? "border-brand-600" : "border-slate-300"
      )}
      style={{ height: 18, width: 18 }}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-brand-600" />}
    </span>
  );
}

/* ------------------------------------------------------------------ 编辑配置 */

const sttOptions = [
  { name: "Whisper Large-V3", tag: "高精度" },
  { name: "Paraformer v2", tag: "中文" },
  { name: "Whisper Small", tag: "轻量" }
];
const brainOptions = [
  { name: "Llama 3.1 70B Instruct", tag: "强大" },
  { name: "Qwen 2.5 14B Instruct", tag: "均衡" },
  { name: "Qwen 2.5 7B Instruct", tag: "轻量" }
];
const notebookOptions = [
  { name: "Qwen 2.5 14B Instruct", tag: "轻量" },
  { name: "Phi-3.5 Mini Instruct", tag: "极轻" },
  { name: "Llama 3.1 8B Instruct", tag: "均衡" }
];
const ttsOptions = [
  { name: "Azure Neural TTS (Xiaoxiao)", tag: "自然" },
  { name: "CosyVoice 2", tag: "情感" },
  { name: "Edge TTS", tag: "轻量" }
];

function EditConfigView({ presetName, onBack }: { presetName: string; onBack: () => void }) {
  const [mode, setMode] = useState<"pipeline" | "duplex">("pipeline");
  const [stt, setStt] = useState(sttOptions[0].name);
  const [brain, setBrain] = useState(brainOptions[0].name);
  const [notebook, setNotebook] = useState(notebookOptions[0].name);
  const [tts, setTts] = useState(ttsOptions[0].name);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50/40">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1320px] px-8 py-7">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ArrowLeft width={18} />
            </button>
            <h1 className="text-[20px] font-bold tracking-tight text-slate-900">编辑配置</h1>
          </div>

          {/* 头部信息 */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-slate-200 text-slate-400">
                <NotebookIcon width={24} />
              </span>
              <div>
                <p className="text-[11.5px] text-slate-400">正在编辑（已创建个人副本）</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <h2 className="text-[19px] font-bold text-slate-900">{presetName}（我的副本）</h2>
                  <PencilIcon width={15} className="text-slate-400" />
                </div>
                <p className="mt-1 text-[11.5px] text-slate-500">
                  基于官方推荐配置「{presetName}」创建的个人副本
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="space-y-1.5 text-[11.5px] text-slate-500">
                <p className="flex items-center gap-1.5">
                  <CheckIcon width={14} className="text-brand-600" /> 官方推荐配置的个人副本
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckIcon width={14} className="text-brand-600" /> 原始配置保持不变
                </p>
              </div>
              <Button variant="secondary" size="sm" className="h-9 gap-1.5" animated={false} onClick={onBack}>
                <RefreshIcon width={14} /> 重置为推荐配置
              </Button>
            </div>
          </div>

          {/* 处理方式 */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-slate-900">处理方式</h3>
                <p className="mt-0.5 text-[12px] text-slate-500">选择助手处理请求的整体方式</p>
              </div>
              <InfoIcon className="text-slate-300" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <ModeCard
                selected={mode === "pipeline"}
                onClick={() => setMode("pipeline")}
                title="分步处理（听 → 想 → 说）"
                desc="依次使用听觉模型、思考模型、发声模型，适合复杂任务与高质量回复"
              />
              <ModeCard
                selected={mode === "duplex"}
                onClick={() => setMode("duplex")}
                title="端到端处理（一步到位）"
                desc="单一模型直接处理全部流程，适合快速响应与简单场景"
              />
            </div>
          </div>

          {/* 听 / 想 / 说 */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <CapabilityCard icon={<EarIcon width={20} />} title="听（Hearing）" subtitle="将语音转换为文本">
              <ModelSelect label="听觉模型" options={sttOptions} value={stt} onChange={setStt} />
              <StatusLine />
              <AutoPrepareNote />
            </CapabilityCard>

            <CapabilityCard
              icon={<BrainIcon width={20} />}
              title="想（Thinking）"
              subtitle="由两个协同大脑共同思考与记录"
              info
            >
              <ModelSelect
                label="执行大脑（Execution Brain）"
                labelDesc="负责规划、推理与执行任务"
                options={brainOptions}
                value={brain}
                onChange={setBrain}
              />
              <StatusLine />
              <div className="my-4 h-px bg-slate-100" />
              <ModelSelect
                label="记录笔记本（Record Notebook）"
                labelDesc="负责记忆、整理与检索信息"
                options={notebookOptions}
                value={notebook}
                onChange={setNotebook}
              />
              <StatusLine />
              <AutoPrepareNote />
            </CapabilityCard>

            <CapabilityCard icon={<SpeakerIcon width={20} />} title="说（Speaking）" subtitle="将文本转换为语音">
              <ModelSelect label="发声模型" options={ttsOptions} value={tts} onChange={setTts} />
              <StatusLine />
              <AutoPrepareNote />
            </CapabilityCard>
          </div>

          {/* 底部操作 */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
            <p className="flex items-center gap-2 text-[12px] text-slate-500">
              <span className="text-brand-600">
                <CheckIcon width={15} />
              </span>
              所有更改将保存到你的个人配置，不会影响原始推荐配置
            </p>
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" size="sm" className="h-9 px-5" animated={false} onClick={onBack}>
                取消
              </Button>
              <Button variant="primary" size="sm" className="h-9 px-6" animated={false} onClick={onBack}>
                保存并应用
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  selected,
  onClick,
  title,
  desc
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-4 text-left transition-all",
        selected ? "border-brand-400 bg-brand-50/40 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <Radio checked={selected} />
      <span>
        <b className="block text-[13.5px] font-semibold text-slate-900">{title}</b>
        <span className="mt-1 block text-[11.5px] leading-relaxed text-slate-500">{desc}</span>
      </span>
    </button>
  );
}

function CapabilityCard({
  icon,
  title,
  subtitle,
  info = false,
  children
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  info?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500">{icon}</span>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-[11.5px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        {info && <InfoIcon className="text-slate-300" />}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ModelSelect({
  label,
  labelDesc,
  options,
  value,
  onChange
}: {
  label: string;
  labelDesc?: string;
  options: { name: string; tag: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.name === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div>
      <p className="text-[12.5px] font-medium text-slate-700">{label}</p>
      {labelDesc && <p className="mt-0.5 text-[11px] text-slate-400">{labelDesc}</p>}
      <div ref={ref} className="relative mt-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-300"
        >
          <span className="text-slate-400">
            <SparkIcon width={16} />
          </span>
          <span className="text-[12.5px] font-medium text-slate-800">{current.name}</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
            {current.tag}
          </span>
          <ChevronDown width={16} className={cn("ml-auto text-slate-400 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button
                key={o.name}
                onClick={() => {
                  onChange(o.name);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50",
                  o.name === value && "bg-brand-50/50"
                )}
              >
                <span className="text-[12.5px] text-slate-800">{o.name}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{o.tag}</span>
                {o.name === value && <CheckIcon width={14} className="ml-auto text-brand-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLine() {
  return (
    <div className="mt-3">
      <p className="text-[11px] text-slate-400">状态</p>
      <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-brand-700">
        <span className="h-2 w-2 rounded-full bg-brand-500" /> 已就绪
      </p>
    </div>
  );
}

function AutoPrepareNote() {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-3">
      <span className="mt-0.5 text-brand-600">
        <SparkIcon width={16} />
      </span>
      <span>
        <b className="block text-[11.5px] font-medium text-slate-700">如未安装，将在需要时自动准备</b>
        <span className="mt-0.5 block text-[10.5px] text-slate-400">无需手动下载或管理存储空间</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ 模型库 */

type ModelStatus =
  | { kind: "ready" }
  | { kind: "downloading"; progress: number }
  | { kind: "update"; from: string; to: string }
  | { kind: "missing" };

interface LibModel {
  name: string;
  size: string;
  version: string;
  status: ModelStatus;
  usedBy: string;
}

interface LibGroup {
  id: string;
  title: string;
  models: LibModel[];
}

const libGroups: LibGroup[] = [
  {
    id: "stt",
    title: "负责听 · 语音识别",
    models: [
      { name: "Whisper Large v3", size: "1.55 GB", version: "3.2.1", status: { kind: "ready" }, usedBy: "默认助手, 客服助手" },
      { name: "Paraformer SenseTime", size: "420 MB", version: "2.1.0", status: { kind: "downloading", progress: 68 }, usedBy: "会议助手" },
      { name: "FunASR Paraformer v2", size: "312 MB", version: "1.0.6", status: { kind: "update", from: "1.0.6", to: "1.1.0" }, usedBy: "智能家居助手" },
      { name: "Vosk Small CN", size: "48 MB", version: "0.3.45", status: { kind: "missing" }, usedBy: "–" }
    ]
  },
  {
    id: "llm",
    title: "负责想 · 语言模型",
    models: [
      { name: "Qwen2.5-7B-Instruct", size: "4.68 GB", version: "1.2.0", status: { kind: "ready" }, usedBy: "默认助手, 编程助手" },
      { name: "ChatGLM3-6B", size: "3.62 GB", version: "1.0.4", status: { kind: "downloading", progress: 35 }, usedBy: "学术助手" },
      { name: "Llama-3.1-8B-Instruct", size: "4.92 GB", version: "1.0.1", status: { kind: "update", from: "1.0.1", to: "1.1.0" }, usedBy: "创作助手" }
    ]
  },
  {
    id: "tts",
    title: "负责说 · 语音合成",
    models: [
      { name: "CosyVoice 2", size: "1.6 GB", version: "2.0.1", status: { kind: "ready" }, usedBy: "默认助手" },
      { name: "Edge TTS", size: "0.6 GB", version: "1.4.0", status: { kind: "ready" }, usedBy: "客服助手" },
      { name: "Fish Speech 1.4", size: "2.5 GB", version: "1.4.0", status: { kind: "missing" }, usedBy: "–" }
    ]
  }
];

type LibFilter = "all" | "installed" | "downloadable" | "update";

const filters: { id: LibFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "installed", label: "已安装" },
  { id: "downloadable", label: "可下载" },
  { id: "update", label: "有更新" }
];

function matchesFilter(status: ModelStatus, filter: LibFilter): boolean {
  switch (filter) {
    case "installed":
      return status.kind === "ready" || status.kind === "update";
    case "downloadable":
      return status.kind === "missing";
    case "update":
      return status.kind === "update";
    default:
      return true;
  }
}

function LibraryView({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const [filter, setFilter] = useState<LibFilter>("all");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ tts: true });

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libGroups
      .map((g) => ({
        ...g,
        models: g.models.filter((m) => matchesFilter(m.status, filter) && (q === "" || m.name.toLowerCase().includes(q)))
      }))
      .filter((g) => g.models.length > 0);
  }, [filter, query]);

  const rootDir = model.snapshot.storage.rootDir || "D:\\AI\\VoiceAssistant\\Models";

  return (
    <div className="space-y-5">
      {/* 顶部：存储 + 筛选 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-[13px] font-semibold text-slate-900">存储空间</h3>
          <div className="mt-3 flex items-center gap-4">
            <StorageRing percent={62} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-slate-600">
                已使用 <b className="text-slate-900">198.7 GB</b>
                <span className="text-slate-400"> / 共 320 GB</span>
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: "62%" }} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">存储位置</p>
                  <p className="truncate text-[11.5px] text-slate-600">{rootDir}</p>
                </div>
                <button
                  onClick={() => void model.chooseStorageRoot()}
                  className="shrink-0 text-[11.5px] font-medium text-brand-700 hover:underline"
                >
                  更改位置
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  filter === f.id
                    ? "border-brand-400 bg-brand-50/50 text-brand-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
            <SearchIcon className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索模型名称"
              className="w-40 bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300">
            <SlidersIcon width={16} />
          </button>
        </div>
      </div>

      {/* 分组表格 */}
      <div className="space-y-4">
        {groups.map((g) => {
          const isCollapsed = collapsed[g.id];
          return (
            <div key={g.id} className="rounded-2xl border border-slate-200 bg-white">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                className="flex w-full items-center gap-2 px-5 py-4 text-left"
              >
                <ChevronDown
                  width={16}
                  className={cn("text-slate-400 transition-transform", isCollapsed && "-rotate-90")}
                />
                <h3 className="text-[13.5px] font-semibold text-slate-900">{g.title}</h3>
                <span className="text-[13px] text-slate-400">({g.models.length})</span>
              </button>

              {!isCollapsed && (
                <div className="px-5 pb-4">
                  <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr_1.3fr_1.4fr_auto] items-center gap-4 border-b border-slate-100 pb-2 text-[11px] font-medium text-slate-400">
                    <span>模型名称</span>
                    <span>大小</span>
                    <span>版本</span>
                    <span className="flex items-center gap-1">状态 <InfoIcon width={13} className="text-slate-300" /></span>
                    <span className="flex items-center gap-1">被使用于 <InfoIcon width={13} className="text-slate-300" /></span>
                    <span className="text-right">操作</span>
                  </div>
                  {g.models.map((m) => (
                    <LibRow key={m.name} m={m} model={model} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-2 pt-1 text-[11.5px] text-slate-400">
        <InfoIcon width={14} /> 模型被使用时无法卸载。请先在配置中移除引用后再操作。
      </p>
    </div>
  );
}

function LibRow({ m, model }: { m: LibModel; model: ReturnType<typeof useModelCenter> }) {
  return (
    <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr_1.3fr_1.4fr_auto] items-center gap-4 border-b border-slate-50 py-3.5 last:border-b-0">
      <span className="text-[12.5px] font-medium text-slate-800">{m.name}</span>
      <span className="text-[12px] text-slate-500">{m.size}</span>
      <span className="text-[12px] text-slate-500">{m.version}</span>
      <StatusCell status={m.status} />
      <span className="truncate text-[12px] text-slate-500">{m.usedBy}</span>
      <div className="flex items-center justify-end gap-2">
        <RowAction m={m} model={model} />
        <button className="text-slate-300 hover:text-slate-500">
          <DotsIcon width={16} />
        </button>
      </div>
    </div>
  );
}

function StatusCell({ status }: { status: ModelStatus }) {
  switch (status.kind) {
    case "ready":
      return (
        <span className="flex items-center gap-1.5 text-[12px] text-slate-600">
          <span className="h-2 w-2 rounded-full bg-brand-500" /> 已就绪
        </span>
      );
    case "downloading":
      return (
        <div className="pr-4">
          <p className="text-[11.5px] text-slate-600">下载中 {status.progress}%</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${status.progress}%` }} />
          </div>
        </div>
      );
    case "update":
      return (
        <span className="text-[12px]">
          <span className="flex items-center gap-1.5 font-medium text-sky-600">
            <RefreshIcon width={13} /> 有更新
          </span>
          <span className="mt-0.5 block text-[10.5px] text-slate-400">
            {status.from} → {status.to}
          </span>
        </span>
      );
    case "missing":
      return (
        <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
          <span className="h-2 w-2 rounded-full border border-slate-300" /> 未下载
        </span>
      );
  }
}

function RowAction({ m, model }: { m: LibModel; model: ReturnType<typeof useModelCenter> }) {
  switch (m.status.kind) {
    case "ready":
      return (
        <button
          onClick={() => void model.removeModel(m.name)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11.5px] font-medium text-slate-600 hover:border-slate-300"
        >
          卸载
        </button>
      );
    case "downloading":
      return (
        <button
          onClick={() => void model.cancelPull()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11.5px] font-medium text-slate-600 hover:border-slate-300"
        >
          暂停
        </button>
      );
    case "update":
      return (
        <button
          onClick={() => void model.pull(m.name)}
          className="rounded-lg border border-brand-400 px-3 py-1.5 text-[11.5px] font-medium text-brand-700 hover:bg-brand-50"
        >
          更新
        </button>
      );
    case "missing":
      return (
        <button
          onClick={() => void model.pull(m.name)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11.5px] font-medium text-slate-600 hover:border-slate-300"
        >
          下载
        </button>
      );
  }
}

function StorageRing({ percent }: { percent: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="#a3d100"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[14px] font-bold text-slate-700">{percent}%</span>
    </div>
  );
}
