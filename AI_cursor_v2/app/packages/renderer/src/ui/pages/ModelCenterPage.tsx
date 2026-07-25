import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useModelCenter } from "../../runtime/useModelCenter.js";
import { WhisperTranscriber } from "../../runtime/audio-io.js";
import { FeatureSection } from "../../app/feature-status.js";
import {
  ArrowLeft,
  BoltIcon,
  BrainIcon,
  CheckIcon,
  ChevronDown,
  ChevronRight,
  CubeIcon,
  MonitorIcon,
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
  SpeakerIcon,
  TrashIcon
} from "../icons.js";
import {
  Button,
  cn,
  StatusDot,
  ListRow,
  KeyValueRow,
  DensityProvider,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  List,
} from "../../design-system/index.js";
import type { ModelBackendKind, ModelBackendState } from "@ai-cursor-v2/shared";
import { intentTemplates, modelCatalog } from "./model-catalog.js";
import {
  deviceFromProbe,
  rankSlot,
  resolvePreset,
  type Capability,
  type DeviceProfile,
  type IntentTemplate,
  type RankedModel,
  type ResolvedSlot,
  type Runnability
} from "./model-resolver.js";

type Tab = "config" | "library";

type Tone = "ok" | "warn" | "bad";

interface SelectOption {
  name: string;
  tag: string;
  note?: string;
  tone?: Tone;
}

interface ConfigRow {
  id: string;
  name: string;
  desc: string;
  current?: boolean;
  custom?: boolean;
}

/** 自定义配置：不是官方模板，取向沿用均衡，作为"改出来的"方案的落点。 */
const customTemplate: IntentTemplate = {
  id: "custom",
  name: "我的自定义配置",
  description: "由你亲自调整的模型组合。",
  official: false,
  weights: { quality: 5, speed: 3.5, chinese: 1.5 },
  requireLocal: false,
  allowCloudFallback: true,
  perf: "由你亲自调整的模型组合",
  privacy: "取决于你所选择的模型",
  scene: "根据你的偏好定制的使用场景"
};

const configRows: ConfigRow[] = [
  ...intentTemplates.map((t) => ({ id: t.id, name: t.name, desc: t.description, current: t.id === "balanced" })),
  { id: "custom", name: customTemplate.name, desc: "上次使用：2 天前", custom: true }
];

function templateById(id: string): IntentTemplate {
  if (id === "custom") {
    return customTemplate;
  }
  return intentTemplates.find((t) => t.id === id) ?? intentTemplates[0];
}

function toneOf(runnability: Runnability): Tone {
  if (runnability === "smooth") {
    return "ok";
  }
  return runnability === "insufficient" ? "bad" : "warn";
}

const TONE_DOT: Record<Tone, string> = {
  ok: "bg-brand-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500"
};

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-brand-700",
  warn: "text-amber-700",
  bad: "text-rose-600"
};

function toSelectOptions(ranked: RankedModel[]): SelectOption[] {
  return ranked.map((r) => ({
    name: r.model.name,
    tag: r.model.local ? r.model.quant ?? "本地" : "云端",
    note: r.annotation,
    tone: toneOf(r.runnability)
  }));
}

function deviceSummary(device: DeviceProfile): string {
  if (!device.hasGpu) {
    return `CPU 运行 · ${device.ramGB}GB 内存`;
  }
  const vramGB = Math.round(device.vramMB / 1024);
  return `${device.gpuName ?? "独立显卡"} · ${vramGB}GB 显存 · ${device.ramGB}GB 内存`;
}

function perfSummary(template: IntentTemplate): string {
  const { quality, speed, chinese } = template.weights;
  if (template.requireLocal) return "本地优先";
  if (speed > quality && speed > chinese) return "速度优先";
  if (quality > speed && quality > chinese) return "质量优先";
  if (chinese > quality && chinese > speed) return "中文优先";
  return "均衡";
}

function sceneSummary(template: IntentTemplate): string {
  const raw = template.scene.split(/[,，、]/)[0].trim();
  if (raw.length > 8) return raw.slice(0, 8) + "…";
  return raw || "自定义";
}

export function ModelCenterPage() {
  const model = useModelCenter();
  const [tab, setTab] = useState<Tab>("config");
  const [editing, setEditing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("balanced");
  const device = useMemo(() => deviceFromProbe(model.snapshot.environment), [model.snapshot.environment]);

  return (
    <DensityProvider density="compact">
      {editing ? (
        <FeatureSection id="model-center.edit" title="编辑配置" className="h-full">
          <EditConfigView templateId={selectedPreset} device={device} onBack={() => setEditing(false)} />
        </FeatureSection>
      ) : (
        <div className="flex h-screen flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-6 py-4">
              <FeatureSection id="model-center.header" title="模型中心头部" className="h-full">
                <header className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h1 className="text-[20px] font-semibold text-slate-900">模型中心</h1>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      根据你的设备推荐最佳配置
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-[11px]" animated={false}>
                    <PlusIcon width={14} /> 新建
                  </Button>
                </header>
              </FeatureSection>

              <FeatureSection id="model-center.tabs" title="配置/模型库切换" className="h-full">
                <div className="mt-3 flex items-center gap-6 border-b border-slate-100">
                  <TabButton active={tab === "config"} onClick={() => setTab("config")}>
                    配置
                  </TabButton>
                  <TabButton active={tab === "library"} onClick={() => setTab("library")}>
                    模型库
                  </TabButton>
                </div>
              </FeatureSection>

              <div className="pt-4">
                {tab === "config" ? (
                  <FeatureSection id="model-center.config" title="运行配置" className="h-full">
                    <ConfigView
                      model={model}
                      selectedPreset={selectedPreset}
                      device={device}
                      onSelect={setSelectedPreset}
                      onEdit={() => setEditing(true)}
                    />
                  </FeatureSection>
                ) : (
                  <FeatureSection id="model-center.library" title="模型库" className="h-full">
                    <LibraryView model={model} />
                  </FeatureSection>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DensityProvider>
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

function BrainSelector({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const snapshot = model.snapshot;
  const backend = snapshot.backend;
  const [selected, setSelected] = useState(snapshot.activeBrainModel || "");

  useEffect(() => {
    setSelected(snapshot.activeBrainModel || "");
  }, [snapshot.activeBrainModel]);

  if (backend.status !== "running") {
    return null;
  }

  const options = snapshot.catalog.filter((m) => m.installed && m.role === "duplex_execution_brain");
  const activeOption = options.find((o) => o.id === snapshot.activeBrainModel);
  const connected = snapshot.providerConnected && selected === snapshot.activeBrainModel;

  if (options.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
        <p className="text-[12.5px] font-medium text-amber-800">尚未安装执行大脑</p>
        <p className="mt-0.5 text-[11px] text-amber-700">
          请先切换到「模型库」下载一个语言模型，再回这里选择作为执行大脑。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-900">执行大脑</h3>
        {connected && activeOption ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckIcon width={12} /> 已连接：{activeOption.displayName}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">选择已下载的模型并应用</span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={model.busy}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-brand-400 disabled:opacity-60"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.displayName}
            </option>
          ))}
        </select>
        <Button
          variant="primary"
          size="sm"
          disabled={!selected || model.busy || connected}
          onClick={() => void model.useAsBrain(selected)}
        >
          应用为执行大脑
        </Button>
      </div>
      {snapshot.activePull?.phase === "error" && snapshot.activePull.model === selected && (
        <p className="mt-2 text-[11px] text-rose-600">{snapshot.activePull.message}</p>
      )}
    </div>
  );
}

function ConfigView({
  model,
  selectedPreset,
  device,
  onSelect,
  onEdit
}: {
  model: ReturnType<typeof useModelCenter>;
  selectedPreset: string;
  device: DeviceProfile;
  onSelect: (id: string) => void;
  onEdit: () => void;
}) {
  const template = templateById(selectedPreset);
  const resolved = useMemo(
    () => resolvePreset(template, modelCatalog, device, "pipeline"),
    [template, device]
  );
  const hearing = resolved.slots.hearing;
  const brain = resolved.slots.executionBrain;
  const speaking = resolved.slots.speaking;

  const activeBrainName = useMemo(() => {
    const active = model.snapshot.catalog.find((m) => m.id === model.snapshot.activeBrainModel);
    return active?.displayName ?? model.snapshot.activeBrainModel ?? brain.model?.name ?? "暂无";
  }, [model.snapshot.catalog, model.snapshot.activeBrainModel, brain.model?.name]);

  return (
    <div className="space-y-4">
      <RunningBackendSection model={model} />
      <BrainSelector model={model} />

      {/* 配置选择 + 概览 - 合并为一个卡片 */}
      <div className="border border-slate-100 rounded-lg overflow-hidden">
        {/* 配置选择 - 改为导航栏 */}
        <div className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
            {configRows.slice(0, -1).map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors shrink-0",
                  selectedPreset === p.id
                    ? "bg-brand-500 text-white"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                )}
              >
                {selectedPreset === p.id && <CheckIcon width={12} />}
                {p.name.replace(/^推荐\s*·\s*/, "")}
              </button>
            ))}
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-500 hover:bg-white hover:text-slate-900 transition-colors shrink-0 ml-auto"
            >
              <SlidersIcon width={12} />
              管理
            </button>
          </div>
        </div>

        {/* 设备信息 */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100">
          <span className="text-[11px] text-slate-500">当前设备</span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <BoltIcon width={12} className="text-slate-400" />
            {deviceSummary(device)}
          </span>
        </div>

        {/* 三个能力 - 横向 3 列 */}
        <div className="grid grid-cols-3 gap-px bg-slate-100">
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <EarIcon width={14} />
              </span>
              <span className="text-[11px] font-semibold text-slate-900">听见你</span>
            </div>
            <div className="text-[11px] text-slate-600 truncate">{hearing.model?.name ?? "暂无"}</div>
            <div className="mt-2">
              <StatusBadge tone={hearing.needsCloud ? "warn" : toneOf(hearing.runnability)} label={hearing.annotation} />
            </div>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <BrainIcon width={14} />
              </span>
              <span className="text-[11px] font-semibold text-slate-900">理解与思考</span>
            </div>
            <div className="text-[11px] text-slate-600 truncate">{activeBrainName}</div>
            <div className="mt-2">
              <StatusBadge tone={brain.needsCloud ? "warn" : toneOf(brain.runnability)} label={brain.annotation} />
            </div>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <SpeakerIcon width={14} />
              </span>
              <span className="text-[11px] font-semibold text-slate-900">回应你</span>
            </div>
            <div className="text-[11px] text-slate-600 truncate">{speaking.model?.name ?? "暂无"}</div>
            <div className="mt-2">
              <StatusBadge tone={speaking.needsCloud ? "warn" : toneOf(speaking.runnability)} label={speaking.annotation} />
            </div>
          </div>
        </div>

        {/* 配置详情 - 横向 3 列 */}
        <div className="grid grid-cols-3 gap-px bg-slate-100">
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BoltIcon width={12} className="text-slate-400" />
              <span className="text-[10px] text-slate-500">性能</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-900 mb-1">{perfSummary(template)}</div>
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{template.perf}</p>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <LockIcon width={12} className="text-slate-400" />
              <span className="text-[10px] text-slate-500">隐私</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-900 mb-1">{template.requireLocal ? "完全本地" : "混合"}</div>
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{template.privacy}</p>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <GlobeIcon width={12} className="text-slate-400" />
              <span className="text-[10px] text-slate-500">场景</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-900 mb-1">{sceneSummary(template)}</div>
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{template.scene}</p>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/30 border-t border-slate-100">
          <p className="text-[10px] text-slate-600">
            {resolved.notes[0] ?? "模型能力受本机硬件限制，具体以「模型库」中的可运行状态为准。"}
          </p>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[9px] font-medium ml-3",
              resolved.notes.length > 0 ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"
            )}
          >
            <CheckIcon width={10} /> {resolved.notes.length > 0 ? "可运行" : "就绪"}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium",
        tone === "ok"
          ? "border-brand-200 bg-brand-50 text-brand-700"
          : tone === "warn"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} /> {label}
    </span>
  );
}

function InfoRow({ icon, label, value, desc }: { icon: ReactNode; label: string; value: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] text-slate-500">{label}</span>
          <span className="text-[12px] font-medium text-slate-900">{value}</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{desc}</p>
      </div>
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

function EditConfigView({
  templateId,
  device,
  onBack
}: {
  templateId: string;
  device: DeviceProfile;
  onBack: () => void;
}) {
  const template = templateById(templateId);
  const presetName = template.name.replace(/^推荐\s*·\s*/, "");
  const [mode, setMode] = useState<"pipeline" | "duplex">("pipeline");

  // 每个角色的候选列表都由同一解析引擎按设备排序 + 标注（手动选取出口）。
  const sttOptions = useMemo(() => toSelectOptions(rankSlot("hearing", modelCatalog, template, device)), [template, device]);
  const brainOptions = useMemo(() => toSelectOptions(rankSlot("thinking", modelCatalog, template, device)), [template, device]);
  const notebookOptions = brainOptions;
  const ttsOptions = useMemo(() => toSelectOptions(rankSlot("speaking", modelCatalog, template, device)), [template, device]);

  const [stt, setStt] = useState(sttOptions[0]?.name ?? "");
  const [brain, setBrain] = useState(brainOptions[0]?.name ?? "");
  const [notebook, setNotebook] = useState(brainOptions[1]?.name ?? brainOptions[0]?.name ?? "");
  const [tts, setTts] = useState(ttsOptions[0]?.name ?? "");

  const findOption = (options: SelectOption[], name: string) => options.find((o) => o.name === name);

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
              <StatusLine option={findOption(sttOptions, stt)} />
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
              <StatusLine option={findOption(brainOptions, brain)} />
              <div className="my-4 h-px bg-slate-100" />
              <ModelSelect
                label="记录笔记本（Record Notebook）"
                labelDesc="负责记忆、整理与检索信息"
                options={notebookOptions}
                value={notebook}
                onChange={setNotebook}
              />
              <StatusLine option={findOption(notebookOptions, notebook)} />
              <AutoPrepareNote />
            </CapabilityCard>

            <CapabilityCard icon={<SpeakerIcon width={20} />} title="说（Speaking）" subtitle="将文本转换为语音">
              <ModelSelect label="发声模型" options={ttsOptions} value={tts} onChange={setTts} />
              <StatusLine option={findOption(ttsOptions, tts)} />
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
  options: SelectOption[];
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
          <span className={cn("h-2 w-2 rounded-full", TONE_DOT[current?.tone ?? "ok"])} />
          <span className="text-[12.5px] font-medium text-slate-800">{current?.name ?? "无可用模型"}</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
            {current?.tag}
          </span>
          <ChevronDown width={16} className={cn("ml-auto text-slate-400 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
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
                <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[o.tone ?? "ok"])} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] text-slate-800">{o.name}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{o.tag}</span>
                  </span>
                  {o.note && <span className={cn("mt-0.5 block text-[10.5px]", TONE_TEXT[o.tone ?? "ok"])}>{o.note}</span>}
                </span>
                {o.name === value && <CheckIcon width={14} className="ml-auto shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLine({ option }: { option?: SelectOption }) {
  const tone = option?.tone ?? "ok";
  return (
    <div className="mt-3">
      <p className="text-[11px] text-slate-400">状态</p>
      <p className={cn("mt-1 flex items-center gap-1.5 text-[12px] font-medium", TONE_TEXT[tone])}>
        <span className={cn("h-2 w-2 rounded-full", TONE_DOT[tone])} /> {option?.note ?? "已就绪"}
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
        <b className="block text-[11.5px] font-medium text-slate-700">模型准备依赖「运行后端」</b>
        <span className="mt-0.5 block text-[10.5px] text-slate-400">未安装 Ollama 时，请先在配置页安装并启动。</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ 模型库 */

type ModelStatus =
  | { kind: "ready" }
  | { kind: "downloading"; progress: number }
  | { kind: "update"; from: string; to: string }
  | { kind: "error"; message: string }
  | { kind: "cancelled" }
  | { kind: "missing" };

interface LibModel {
  id: string;
  catalogId: string;
  name: string;
  size: string;
  version: string;
  status: ModelStatus;
  usedBy: string;
  capability: Capability;
  active: boolean;
  tag: string;
  pullable: boolean;
}

interface LibGroup {
  id: string;
  title: string;
  models: LibModel[];
}

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

function formatSize(gb: number): string {
  if (gb >= 1) {
    return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
  }
  return `${(gb * 1024).toFixed(0)} MB`;
}

function toWhisperTag(id: string): string | null {
  if (id.startsWith("whisper-")) {
    return `Xenova/${id}`;
  }
  return null;
}

function buildLibraryGroups(
  model: ReturnType<typeof useModelCenter>,
  whisperStates: Record<string, ModelStatus>
): LibGroup[] {
  const catalog = model.snapshot.catalog;
  const activePull = model.snapshot.activePull;

  const thinking: LibModel[] = catalog.map((m) => {
    let status: ModelStatus = m.installed ? { kind: "ready" } : { kind: "missing" };
    if (activePull && activePull.model === m.id) {
      if (activePull.phase === "error") {
        status = { kind: "error", message: activePull.message || activePull.status };
      } else if (activePull.phase === "cancelled") {
        status = { kind: "cancelled" };
      } else if (activePull.phase === "success") {
        status = { kind: "ready" };
      } else if (
        activePull.phase === "resolving" ||
        activePull.phase === "downloading" ||
        activePull.phase === "verifying"
      ) {
        status = { kind: "downloading", progress: activePull.percent };
      }
    }
    return {
      id: `llm-${m.id}`,
      catalogId: m.id,
      name: m.displayName,
      size: formatSize(m.approxSizeGB),
      version: "—",
      status,
      usedBy: m.active ? "执行大脑" : m.recommended ? "推荐" : "—",
      capability: "thinking",
      active: m.active,
      tag: m.id,
      pullable: true
    };
  });

  const hearing: LibModel[] = modelCatalog
    .filter((m) => m.capability === "hearing")
    .map((m) => {
      const tag = toWhisperTag(m.id);
      const state = whisperStates[m.id];
      return {
        id: `stt-${m.id}`,
        catalogId: m.id,
        name: m.name,
        size: formatSize(m.sizeGB),
        version: "—",
        status: state ?? { kind: "missing" },
        usedBy: "语音识别",
        capability: "hearing",
        active: false,
        tag: tag ?? m.id,
        pullable: tag !== null
      };
    });

  const speaking: LibModel[] = [
    {
      id: "tts-system",
      catalogId: "system-tts",
      name: "系统语音合成",
      size: "—",
      version: "—",
      status: { kind: "ready" },
      usedBy: "语音输出",
      capability: "speaking",
      active: false,
      tag: "system-tts",
      pullable: false
    }
  ];

  return [
    { id: "stt", title: "负责听 · 语音识别", models: hearing },
    { id: "llm", title: "负责想 · 语言模型", models: thinking },
    { id: "tts", title: "负责说 · 语音合成", models: speaking }
  ];
}

function LibraryView({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const [filter, setFilter] = useState<LibFilter>("all");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ tts: true });
  const [whisperStates, setWhisperStates] = useState<Record<string, ModelStatus>>({});
  const whisper = useRef<WhisperTranscriber | null>(null);
  const currentWhisperId = useRef<string | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buildLibraryGroups(model, whisperStates)
      .map((g) => ({
        ...g,
        models: g.models.filter((m) => matchesFilter(m.status, filter) && (q === "" || m.name.toLowerCase().includes(q)))
      }))
      .filter((g) => g.models.length > 0);
  }, [filter, query, model, whisperStates]);

  const ensureWhisper = useCallback(() => {
    if (!whisper.current) {
      whisper.current = new WhisperTranscriber({
        onProgress: (_status, progress) => {
          const id = currentWhisperId.current;
          if (!id) return;
          const pct = progress == null ? 0 : progress < 1 ? Math.round(progress * 100) : Math.round(progress);
          setWhisperStates((prev) => ({ ...prev, [id]: { kind: "downloading", progress: pct } }));
        }
      });
    }
    return whisper.current;
  }, []);

  const warmupWhisper = useCallback(
    (id: string, tag: string) => {
      if (!tag) return;
      setWhisperStates((prev) => ({ ...prev, [id]: { kind: "downloading", progress: 0 } }));
      currentWhisperId.current = id;
      ensureWhisper()
        .warmup(tag)
        .then(() => {
          setWhisperStates((prev) => ({ ...prev, [id]: { kind: "ready" } }));
        })
        .catch((error: Error) => {
          console.error("[Whisper] warmup failed", error);
          setWhisperStates((prev) => ({ ...prev, [id]: { kind: "missing" } }));
        })
        .finally(() => {
          currentWhisperId.current = null;
        });
    },
    [ensureWhisper]
  );

  const cancelWarmup = useCallback(() => {
    whisper.current?.stop();
    currentWhisperId.current = null;
    setWhisperStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k]?.kind === "downloading") {
          next[k] = { kind: "missing" };
        }
      });
      return next;
    });
  }, []);

  const rootDir = model.snapshot.storage.rootDir || "未选择存储位置";
  const disk = model.snapshot.environment?.disk;
  const usedGB = disk ? disk.totalGB - disk.freeGB : 0;
  const totalGB = disk ? disk.totalGB : 0;
  const storagePercent = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* 顶部：存储 + 筛选 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-[13px] font-semibold text-slate-900">存储空间</h3>
          <div className="mt-3 flex items-center gap-4">
            <StorageRing percent={storagePercent} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-slate-600">
                {disk ? (
                  <>
                    已使用 <b className="text-slate-900">{usedGB.toFixed(1)} GB</b>
                    <span className="text-slate-400"> / 共 {totalGB.toFixed(1)} GB</span>
                  </>
                ) : (
                  <span className="text-slate-400">尚未探测存储信息</span>
                )}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${storagePercent}%` }} />
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
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <Table hoverable className="table-fixed">
                      <TableHead>
                        <TableRow>
                          <TableHeader className="w-2/5">模型名称</TableHeader>
                          <TableHeader className="w-24">大小</TableHeader>
                          <TableHeader className="w-24">版本</TableHeader>
                          <TableHeader className="w-32">
                            <span className="flex items-center gap-1">状态 <InfoIcon width={13} className="text-slate-300" /></span>
                          </TableHeader>
                          <TableHeader className="w-1/4">
                            <span className="flex items-center gap-1">被使用于 <InfoIcon width={13} className="text-slate-300" /></span>
                          </TableHeader>
                          <TableHeader className="w-24 text-right">操作</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {g.models.map((m) => (
                          <LibRow
                            key={m.id}
                            m={m}
                            model={model}
                            onWarmup={warmupWhisper}
                            onCancelWarmup={cancelWarmup}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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

function LibRow({
  m,
  model,
  onWarmup,
  onCancelWarmup
}: {
  m: LibModel;
  model: ReturnType<typeof useModelCenter>;
  onWarmup: (id: string, tag: string) => void;
  onCancelWarmup: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="w-2/5">
        <span className="block truncate text-[12.5px] font-medium text-slate-800">{m.name}</span>
      </TableCell>
      <TableCell className="w-24 text-[12px] text-slate-500">{m.size}</TableCell>
      <TableCell className="w-24 text-[12px] text-slate-500">{m.version}</TableCell>
      <TableCell className="w-32"><StatusCell m={m} /></TableCell>
      <TableCell className="w-1/4">
        <span className="block truncate text-[12px] text-slate-500">{m.usedBy}</span>
      </TableCell>
      <TableCell align="right" className="w-24">
        <div className="flex items-center justify-end gap-2">
          <RowAction m={m} model={model} onWarmup={onWarmup} onCancelWarmup={onCancelWarmup} />
          <button className="text-slate-300 hover:text-slate-500">
            <DotsIcon width={16} />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function StatusCell({ m }: { m: LibModel }) {
  switch (m.status.kind) {
    case "ready":
      return (
        <span className="flex items-center gap-1.5 text-[12px] text-slate-600">
          <span className="h-2 w-2 rounded-full bg-brand-500" /> {m.active ? "已应用" : "已就绪"}
        </span>
      );
    case "downloading":
      return (
        <div className="pr-4">
          <p className="text-[11.5px] text-slate-600">下载中 {m.status.progress}%</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${m.status.progress}%` }} />
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
            {m.status.from} → {m.status.to}
          </span>
        </span>
      );
    case "error":
      return (
        <span className="flex items-start gap-1.5 text-[12px] text-rose-600" title={m.status.message}>
          <span className="mt-0.5 h-2 w-2 rounded-full bg-rose-500" />
          <span className="line-clamp-2">{m.status.message}</span>
        </span>
      );
    case "cancelled":
      return (
        <span className="flex items-center gap-1.5 text-[12px] text-amber-600">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 已取消
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

function RowAction({
  m,
  model,
  onWarmup,
  onCancelWarmup
}: {
  m: LibModel;
  model: ReturnType<typeof useModelCenter>;
  onWarmup: (id: string, tag: string) => void;
  onCancelWarmup: () => void;
}) {
  const base = "rounded-lg border px-3 py-1.5 text-[11.5px] font-medium transition-colors";
  const disabledCls = " opacity-50 cursor-not-allowed";
  const busy = model.busy;

  const startDownload = () => {
    if (m.capability === "hearing") {
      onWarmup(m.catalogId, m.tag);
    } else if (m.capability === "thinking") {
      void model.pull(m.tag);
    }
  };

  switch (m.status.kind) {
    case "ready":
      if (m.capability === "thinking") {
        if (m.active) {
          return (
            <button disabled className={cn(base, "border-slate-200 text-slate-400", disabledCls)}>
              已应用
            </button>
          );
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => void model.useAsBrain(m.tag)}
              disabled={busy}
              className={cn(base, "border-brand-400 text-brand-700 hover:bg-brand-50", busy && disabledCls)}
            >
              应用
            </button>
            <button
              title="删除本地模型"
              disabled={busy}
              onClick={() => void model.removeModel(m.tag)}
              className={cn(
                "rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-rose-300 hover:text-rose-600",
                busy && disabledCls
              )}
            >
              <TrashIcon width={14} />
            </button>
          </div>
        );
      }
      return (
        <button disabled className={cn(base, "border-slate-200 text-slate-400", disabledCls)}>
          {m.capability === "speaking" ? "使用中" : "已就绪"}
        </button>
      );
    case "downloading":
      return (
        <button
          onClick={() => void (m.capability === "hearing" ? onCancelWarmup() : model.cancelPull())}
          disabled={busy && m.capability !== "hearing"}
          className={cn(base, "border-slate-200 text-slate-600 hover:border-slate-300")}
        >
          取消
        </button>
      );
    case "error":
    case "cancelled":
    case "missing":
      if (!m.pullable) {
        return (
          <button disabled className={cn(base, "border-slate-200 text-slate-400", disabledCls)}>
            暂不支持
          </button>
        );
      }
      return (
        <button
          onClick={startDownload}
          disabled={busy}
          className={cn(
            base,
            m.status.kind === "error" || m.status.kind === "cancelled"
              ? "border-amber-400 text-amber-700 hover:bg-amber-50"
              : "border-slate-200 text-slate-600 hover:border-slate-300",
            busy && disabledCls
          )}
        >
          {m.status.kind === "error" ? "重试" : m.status.kind === "cancelled" ? "重新下载" : "下载"}
        </button>
      );
    case "update":
      return (
        <button
          onClick={() => void (m.capability === "thinking" ? model.pull(m.tag) : onWarmup(m.catalogId, m.tag))}
          disabled={busy || !m.pullable}
          className={cn(base, "border-brand-400 text-brand-700 hover:bg-brand-50", (busy || !m.pullable) && disabledCls)}
        >
          更新
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

function RunningBackendSection({ model }: { model: ReturnType<typeof useModelCenter> }) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50/50 px-4 py-2 border-b border-slate-100">
        <span className="text-[12px] font-medium text-slate-700">运行后端</span>
        <button
          className="text-[11px] text-slate-500 hover:text-slate-700 disabled:opacity-50 flex items-center gap-1"
          disabled={model.busy}
          onClick={() => void model.refreshBackend()}
        >
          <RefreshIcon width={12} />
          刷新
        </button>
      </div>

      {/* 横向卡片 */}
      <div className="grid grid-cols-3 gap-px bg-slate-100">
        <BackendCard kind="ollama" title="Ollama" icon={<CubeIcon width={18} />} model={model} />
        <BackendCard kind="lmstudio" title="LM Studio" icon={<MonitorIcon width={18} />} model={model} />
        <BackendCard kind="custom" title="自定义端点" icon={<GlobeIcon width={18} />} model={model} />
      </div>

      <div className="border-t border-slate-100">
        <BackendDetailPanel model={model} />
      </div>
    </div>
  );
}

function BackendCard({
  kind,
  title,
  icon,
  model
}: {
  kind: ModelBackendKind;
  title: string;
  icon: ReactNode;
  model: ReturnType<typeof useModelCenter>;
}) {
  const state = model.snapshot.backends.find((b) => b.backend === kind);
  const active = model.snapshot.activeBackend === kind;
  const color =
    state?.status === "running" ? "success" :
    state?.status === "not_installed" ? "error" :
    state?.status === "installed_not_running" ? "warning" : "neutral";
  const disabled = model.busy;

  return (
    <button
      onClick={disabled ? undefined : () => void model.setBackend(kind)}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-2 bg-white px-4 py-3 text-left transition-all",
        active ? "ring-2 ring-inset ring-brand-500 bg-brand-50/20" : "hover:bg-slate-50",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
          {icon}
        </span>
        <span className="text-[11px] font-semibold text-slate-900 truncate">{title}</span>
      </div>
      <div className="flex items-center gap-1.5 w-full">
        <StatusDot active={active || state?.status === "running"} color={color} size="sm" />
        <span className="text-[10px] text-slate-600 truncate">{state?.message ?? "检测中"}</span>
      </div>
    </button>
  );
}

function BackendDetailPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  switch (model.snapshot.activeBackend) {
    case "ollama":
      return <OllamaPanel model={model} />;
    case "lmstudio":
      return <LMStudioPanel model={model} />;
    case "custom":
      return <CustomEndpointPanel model={model} />;
    default:
      return null;
  }
}

function OllamaPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const backend = model.snapshot.backend;
  if (backend.status === "running") {
    return <OllamaReadyPanel model={model} />;
  }
  if (backend.status === "installed_not_running" || model.snapshot.ollamaInstall.installed) {
    return <OllamaStartPanel model={model} />;
  }
  return <OllamaInstallFlow model={model} />;
}

function OllamaStartPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
      <div className="flex items-start gap-3">
        <StatusDot active color="warning" size="md" />
        <div className="flex-1">
          <h3 className="text-[13px] font-semibold text-amber-800">Ollama 已安装但未运行</h3>
          <p className="mt-0.5 text-[11.5px] text-amber-700">{model.snapshot.backend.message}</p>
        </div>
        <Button variant="secondary" size="sm" disabled={model.busy} onClick={() => void model.refreshBackend()}>
          启动并检测
        </Button>
      </div>
    </div>
  );
}

function OllamaReadyPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const backend = model.snapshot.backend;
  const env = model.snapshot.environment;
  const hasModels = backend.installedModels.length > 0;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
      <div className="flex items-start gap-3">
        <StatusDot active color="success" size="md" />
        <div className="flex-1">
          <h3 className="text-[13px] font-semibold text-emerald-800">Ollama 运行中</h3>
          <p className="mt-0.5 text-[11.5px] text-emerald-700">{backend.message}</p>
          {env && (
            <p className="mt-2 text-[11px] text-emerald-600">
              {env.gpus.length > 0 ? `GPU: ${env.gpus[0].name} · ` : ""}
              内存: {env.totalRamGB.toFixed(1)} GB · 已安装模型 {backend.installedModels.length} 个
            </p>
          )}
          {!hasModels && (
            <p className="mt-2 text-[11px] text-emerald-700">
              引擎已就绪，请切换到「模型库」下载语言模型。
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" disabled={model.busy} onClick={() => void model.refreshBackend()}>
            <RefreshIcon width={14} /> 重新检测
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void model.openStorageLocation()}>
            打开目录
          </Button>
        </div>
      </div>
    </div>
  );
}

function OllamaInstallFlow({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const { snapshot, busy } = model;
  const rootDir = snapshot.storage.rootDir;
  const install = snapshot.ollamaInstall;

  const handleInstall = async () => {
    await model.installOllama();
  };

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4">
      <div className="mb-3 flex items-start gap-2.5 text-rose-800">
        <InfoIcon width={16} className="mt-0.5 shrink-0" />
        <p className="text-[12.5px]">未检测到 Ollama 引擎。选择位置后安装，再去「模型库」下载模型。</p>
      </div>
      <div className="space-y-4">
        <Step number={1} title="选择安装 / 模型存储位置">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="min-w-0 truncate text-[12px] text-slate-600">{rootDir || "D:\\AI\\VoiceAssistant\\Models"}</span>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void model.chooseStorageRoot()}>
              更改...
            </Button>
          </div>
          <p className="mt-1 text-[10.5px] text-slate-400">建议非系统盘、空间充足的目录</p>
        </Step>
        <Step number={2} title="安装 Ollama 引擎">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={busy || install.phase === "installing"} onClick={() => void handleInstall()}>
              安装 Ollama
            </Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void model.locateOllamaInstaller()}>
              手动定位安装器...
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void model.openInstallGuide()}>
              查看安装指南 →
            </Button>
          </div>
          {install.phase === "installing" && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 rounded-full bg-brand-500 animate-pulse" />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600">{install.message}</p>
            </div>
          )}
          {install.phase === "error" && (
            <p className="mt-2 text-[11px] text-rose-600">{install.message}</p>
          )}
        </Step>
        <Step number={3} title="前往模型库下载模型">
          <p className="text-[11.5px] text-slate-500">引擎安装完成后，切换到「模型库」下载并应用执行大脑。</p>
        </Step>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
        {number}
      </span>
      <div className="flex-1">
        <p className="text-[12.5px] font-medium text-slate-800">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function LMStudioPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const backend = model.snapshot.backend;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
      <div className="flex items-start gap-3">
        <StatusDot active color={backend.status === "running" ? "success" : "warning"} size="md" />
        <div className="flex-1">
          <h3 className="text-[13px] font-semibold text-slate-900">LM Studio</h3>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            {backend.message || "请在 LM Studio 中启动本地服务器（默认端口 1234）。"}
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled={model.busy} onClick={() => void model.refreshBackend()}>
          重新检测
        </Button>
      </div>
    </div>
  );
}

function CustomEndpointPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const [baseUrl, setBaseUrl] = useState(model.snapshot.customEndpoint.baseUrl);
  const [modelName, setModelName] = useState(model.snapshot.customEndpoint.model);
  const backend = model.snapshot.backend;

  const apply = async () => {
    await model.setCustomEndpoint({ baseUrl, model: modelName });
    if (modelName.trim()) {
      await model.useAsBrain(modelName);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
      <div className="space-y-3">
        <div>
          <label className="text-[12px] font-medium text-slate-700">Base URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://127.0.0.1:11434/v1"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-brand-400"
          />
        </div>
        <div>
          <label className="text-[12px] font-medium text-slate-700">Model</label>
          <input
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="qwen2.5:7b-instruct"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" disabled={model.busy || !baseUrl.trim() || !modelName.trim()} onClick={() => void apply()}>
            设置并应用
          </Button>
          <Button variant="secondary" size="sm" disabled={model.busy} onClick={() => void model.refreshBackend()}>
            重新检测
          </Button>
        </div>
        <p className="text-[11px] text-slate-500">{backend.message}</p>
      </div>
    </div>
  );
}


