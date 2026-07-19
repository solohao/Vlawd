import { useEffect, useState } from "react";
import type {
  ModelBackendKind,
  ModelBackendState,
  ModelCatalogItem,
  ModelPullProgress
} from "@ai-cursor-v2/shared";
import { modelCenterData } from "../demo-data.js";
import { useConversation } from "../../runtime/useConversation.js";
import { useModelCenter } from "../../runtime/useModelCenter.js";
import {
  ArrowRight,
  BrainIcon,
  CheckIcon,
  ChevronRight,
  CompatIcon,
  CubeIcon,
  DotsIcon,
  GearIcon,
  HelpIcon,
  ImportIcon,
  NotebookIcon,
  RefreshIcon,
  ShieldIcon
} from "../icons.js";

const panel = "rounded-2xl border border-slate-200 bg-white";
const roleIcon = { brain: BrainIcon, notebook: NotebookIcon, safety: ShieldIcon };

type Tone = "running" | "available" | "idle" | "always";

function StateDot({ tone, label }: { tone: Tone; label: string }) {
  const color =
    tone === "running"
      ? "bg-brand-500"
      : tone === "available"
        ? "bg-amber-400"
        : tone === "always"
          ? "bg-brand-500"
          : "bg-slate-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  pipeline: "方案 B · Qwen2.5 流式管线",
  "bayling-duplex": "方案 A · BayLing 原生全双工",
  personaplex: "方案 A · PersonaPlex",
  moshi: "方案 A · Moshi",
  mock: "Mock（开发）"
};

const BACKEND_LABELS: Record<ModelBackendKind, string> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  custom: "自定义端点"
};

const BACKEND_HINTS: Record<ModelBackendKind, string> = {
  ollama: "本地下载器 + 自选目录（OLLAMA_MODELS）",
  lmstudio: "连接 LM Studio 本地服务器（:1234）",
  custom: "任意 OpenAI 兼容端点（vLLM / llama.cpp / Jan）"
};

function backendState(backend: ModelBackendState): { label: string; tone: Tone } {
  const notRunningLabel = backend.backend === "ollama" ? "未安装" : "未连接";
  switch (backend.status) {
    case "running":
      return { label: backend.backend === "ollama" ? "运行中" : "已连接", tone: "running" };
    case "installed_not_running":
      return { label: "未启动", tone: "available" };
    case "not_installed":
      return { label: notRunningLabel, tone: "idle" };
    default:
      return { label: "检测中", tone: "idle" };
  }
}

function formatGB(value: number): string {
  return `${value.toFixed(value < 10 ? 1 : 0)} GB`;
}

export function ModelCenterPage() {
  const m = modelCenterData;
  const convo = useConversation();
  const model = useModelCenter();
  const snap = model.snapshot;
  const backend = snap.backend;
  const [tab, setTab] = useState(0);

  const backendInfo = backendState(backend);

  const brainState: { state: string; tone: Tone } = !convo.available
    ? { state: "未连接", tone: "idle" }
    : convo.snapshot.providerConnected && convo.snapshot.usingRealInference
      ? { state: "运行中", tone: "running" }
      : convo.snapshot.providerConnected
        ? { state: "离线回退", tone: "available" }
        : { state: "未连接", tone: "idle" };

  const brainModelLabel = snap.activeBrainModel
    ? snap.activeBrainModel
    : PROVIDER_LABELS[convo.snapshot.activeProviderKind] ?? "未选择";

  const overview: { label: string; state: string; tone: Tone }[] = [
    { label: "Execution Brain", state: brainState.state, tone: brainState.tone },
    { label: "Record Notebook", state: backend.status === "running" ? "可用" : "待就绪", tone: backend.status === "running" ? "available" : "idle" },
    { label: "Safety Engine", state: "始终开启", tone: "always" }
  ];

  return (
    <div className="flex gap-6 px-8 py-7">
      <div className="min-w-0 flex-1">
        <header className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[24px] font-bold text-slate-900">
              {m.title}
              <CubeIcon className="text-brand-500" />
            </h1>
            <p className="mt-1.5 text-[13.5px] text-slate-500">{m.subtitle}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${backendInfo.tone === "running" ? "bg-brand-500" : "bg-slate-300"}`} />
            {BACKEND_LABELS[snap.activeBackend]} {backendInfo.label}
          </span>
        </header>

        <BackendSelector snap={snap} model={model} />

        <BackendBanner backend={backend} model={model} />

        {/* tabs */}
        <div className="mb-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex gap-6">
            {m.tabs.map((label, i) => (
              <button
                key={label}
                onClick={() => setTab(i)}
                className={`-mb-px border-b-2 pb-2.5 text-[13.5px] font-medium ${
                  i === tab
                    ? "border-brand-500 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void model.openInstallGuide()}
            className="inline-flex items-center gap-1 pb-2 text-[12.5px] text-slate-500 hover:text-slate-700"
          >
            模型使用指南 <ArrowRight width={13} height={13} />
          </button>
        </div>

        {tab === 0 && (
          <ConfigTab
            brain={{ state: brainState.state, tone: brainState.tone, model: brainModelLabel }}
            onTestBrain={() => void convo.checkHealth()}
            onConfigure={() => setTab(1)}
            onLogs={() => setTab(2)}
            catalog={snap.catalog}
            activePull={snap.activePull}
            busy={model.busy}
            onPull={(id) => void model.pull(id)}
            onUse={(id) => void model.useAsBrain(id)}
            footerNote={m.footerNote}
            showCatalog={backend.supportsPull}
            backendLabel={BACKEND_LABELS[snap.activeBackend]}
          />
        )}

        {tab === 1 && (
          <DownloadTab
            backend={backend}
            catalog={snap.catalog}
            activePull={snap.activePull}
            busy={model.busy}
            customEndpoint={snap.customEndpoint}
            onPull={(id) => void model.pull(id)}
            onCancel={() => void model.cancelPull()}
            onRemove={(id) => void model.removeModel(id)}
            onUse={(id) => void model.useAsBrain(id)}
            onInstall={() => void model.openInstallGuide()}
            onSaveCustomEndpoint={(cfg) => void model.setCustomEndpoint(cfg)}
          />
        )}

        {tab === 2 && <LogsTab model={model} />}
      </div>

      {/* right rail */}
      <aside className="w-[300px] shrink-0 space-y-4">
        <section className={`${panel} p-4`}>
          <p className="mb-3 text-[13px] font-semibold text-slate-800">模型状态总览</p>
          <div className="space-y-2.5">
            {overview.map((o) => {
              const Icon =
                roleIcon[o.label === "Execution Brain" ? "brain" : o.label === "Record Notebook" ? "notebook" : "safety"];
              return (
                <div key={o.label} className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-400/15 text-brand-600">
                    <Icon width={15} height={15} />
                  </span>
                  <span className="text-[12.5px] text-slate-600">{o.label}</span>
                  <span className="ml-auto">
                    <StateDot tone={o.tone} label={o.state} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <StoragePanel model={model} />

        <section className={`${panel} p-4`}>
          <p className="mb-3 text-[13px] font-semibold text-slate-800">快速操作</p>
          <div className="space-y-1">
            <QuickAction
              icon={RefreshIcon}
              title="检查模型状态"
              desc="重新检测全部后端与已安装模型"
              onClick={() => void model.refreshBackend()}
            />
            <QuickAction
              icon={ImportIcon}
              title={
                snap.activeBackend === "ollama"
                  ? "安装 / 更新 Ollama"
                  : snap.activeBackend === "lmstudio"
                    ? "LM Studio 使用指南"
                    : "OpenAI 兼容端点文档"
              }
              desc={
                snap.activeBackend === "ollama"
                  ? "自动检测并静默安装到指定目录"
                  : snap.activeBackend === "lmstudio"
                    ? "如何开启本地服务器"
                    : "自定义端点接入说明"
              }
              onClick={() =>
                snap.activeBackend === "ollama"
                  ? void model.installOllama()
                  : void model.openInstallGuide()
              }
            />
            <QuickAction
              icon={CompatIcon}
              title="设备兼容性检测"
              desc="探测 GPU / 显存 / 内存 / 磁盘"
              onClick={() => void model.probe()}
            />
          </div>
        </section>

        <section className={`${panel} bg-slate-50/60 p-4`}>
          <div className="mb-1.5 flex items-center gap-2">
            <HelpIcon width={16} height={16} className="text-brand-600" />
            <span className="text-[13px] font-semibold text-slate-800">了解更多</span>
          </div>
          <p className="text-[12.5px] font-medium text-slate-600">如何选择合适的模型？</p>
          <p className="mt-1 text-[11.5px] text-slate-400">
            {snap.environment?.recommendationReason ?? "不同模型在能力、性能和资源占用上有所不同。"}
          </p>
          <button
            onClick={() => void model.openInstallGuide()}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-600"
          >
            了解更多选择建议 <ArrowRight width={13} height={13} />
          </button>
        </section>
      </aside>
    </div>
  );
}

function BackendBanner({ backend, model }: { backend: ModelBackendState; model: ReturnType<typeof useModelCenter> }) {
  const env = model.snapshot.environment;
  const running = backend.status === "running";
  const notInstalled = backend.status === "not_installed";
  return (
    <div
      className={`mb-5 rounded-2xl border p-4 ${
        running ? "border-brand-200 bg-brand-400/5" : notInstalled ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800">{backend.message}</p>
          <p className="mt-1 text-[11.5px] text-slate-500">
            {env
              ? `${env.platform} · ${env.cpuCores} 核 · 内存 ${formatGB(env.totalRamGB)}${
                  env.gpus.length ? ` · GPU ${env.gpus[0].name}（${formatGB(env.gpus[0].vramTotalMB / 1024)}）` : " · 未检测到独显"
                }`
              : "正在探测本机环境…"}
          </p>
          {env && !env.canRunRealModel ? (
            <p className="mt-1 text-[11.5px] text-amber-600">{env.recommendationReason}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => void model.refreshBackend()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-50"
          >
            重新检测
          </button>
        </div>
      </div>

      {notInstalled && backend.backend === "ollama" ? <OllamaInstallPanel model={model} /> : null}
    </div>
  );
}

function OllamaInstallPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const install = model.snapshot.ollamaInstall;
  const installing = install.phase === "installing";
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[12.5px] font-medium text-slate-700">一键准备 Ollama</p>
      <p className="mt-0.5 text-[11.5px] text-slate-400">
        {!install.supported
          ? "当前系统暂不支持代管安装，请前往官网手动安装。"
          : install.installerFound
            ? `已找到安装器：${install.installerPath}。点击安装并选择目标盘（如 D:\\Ollama），本 App 会静默安装。`
            : "未在下载目录找到 OllamaSetup.exe。可手动指定安装器，或前往官网下载后再来安装。"}
      </p>
      {install.message && (install.phase === "installing" || install.phase === "error") ? (
        <p className={`mt-1.5 text-[11.5px] ${install.phase === "error" ? "text-rose-600" : "text-slate-500"}`}>
          {install.message}
        </p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          disabled={!install.supported || installing}
          onClick={() => void model.installOllama()}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-brand-600 disabled:opacity-40"
        >
          {installing ? "安装中…" : "选择目录并安装"}
        </button>
        <button
          disabled={installing}
          onClick={() => void model.locateOllamaInstaller()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          指定安装器
        </button>
        <button
          onClick={() => void model.openInstallGuide()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-50"
        >
          官网下载
        </button>
      </div>
    </div>
  );
}

function BackendSelector({
  snap,
  model
}: {
  snap: ReturnType<typeof useModelCenter>["snapshot"];
  model: ReturnType<typeof useModelCenter>;
}) {
  const kinds: ModelBackendKind[] = ["ollama", "lmstudio", "custom"];
  return (
    <div className="mb-4">
      <p className="mb-2 text-[12px] font-medium text-slate-500">运行后端（选择模型来源，只需保持一个引擎在跑）</p>
      <div className="grid grid-cols-3 gap-2">
        {kinds.map((kind) => {
          const state = snap.backends.find((b) => b.backend === kind);
          const info = state ? backendState(state) : { label: "检测中", tone: "idle" as Tone };
          const active = snap.activeBackend === kind;
          return (
            <button
              key={kind}
              onClick={() => void model.setBackend(kind)}
              className={`rounded-xl border p-3 text-left transition ${
                active ? "border-brand-400 bg-brand-400/5" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-800">{BACKEND_LABELS[kind]}</span>
                <StateDot tone={info.tone} label={info.label} />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-400">{BACKEND_HINTS[kind]}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomEndpointForm({
  customEndpoint,
  onSave
}: {
  customEndpoint: { baseUrl: string; model: string };
  onSave: (cfg: { baseUrl: string; model: string }) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(customEndpoint.baseUrl);
  const [modelName, setModelName] = useState(customEndpoint.model);
  useEffect(() => {
    setBaseUrl(customEndpoint.baseUrl);
    setModelName(customEndpoint.model);
  }, [customEndpoint.baseUrl, customEndpoint.model]);
  return (
    <section className={`${panel} p-4`}>
      <p className="mb-1 text-[13px] font-semibold text-slate-800">自定义 OpenAI 兼容端点</p>
      <p className="mb-3 text-[11.5px] text-slate-400">
        填入本地/自建服务地址（会自动补 /v1）与模型名，连接后可在下方设为执行大脑。
      </p>
      <div className="space-y-2">
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://127.0.0.1:8000/v1"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700 outline-none focus:border-brand-400"
        />
        <input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="模型名，例如 qwen2.5-7b-instruct"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700 outline-none focus:border-brand-400"
        />
        <button
          onClick={() => onSave({ baseUrl, model: modelName })}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-brand-600"
        >
          连接并检测
        </button>
      </div>
    </section>
  );
}

function ConfigTab({
  brain,
  onTestBrain,
  onConfigure,
  onLogs,
  catalog,
  activePull,
  busy,
  onPull,
  onUse,
  footerNote,
  showCatalog,
  backendLabel
}: {
  brain: { state: string; tone: Tone; model: string };
  onTestBrain: () => void;
  onConfigure: () => void;
  onLogs: () => void;
  catalog: ModelCatalogItem[];
  activePull: ModelPullProgress | null;
  busy: boolean;
  onPull: (id: string) => void;
  onUse: (id: string) => void;
  footerNote: string;
  showCatalog: boolean;
  backendLabel: string;
}) {
  return (
    <>
      <h2 className="mb-3 text-[14px] font-semibold text-slate-800">核心角色模型</h2>
      <div className="space-y-3">
        <RoleCard
          role="brain"
          title="Execution Brain"
          desc="负责实时对话、理解目标、提出动作并执行任务。"
          tag="对话与执行"
          modelLabel={brain.model}
          state={brain.state}
          tone={brain.tone}
          stripText={brain.tone === "running" ? "已连接真实本地推理端点" : "尚未连接真实推理端点（离线回退语气）"}
          onConfigure={onConfigure}
          onTest={onTestBrain}
          onMore={onLogs}
        />
        <RoleCard
          role="notebook"
          title="Record Notebook"
          desc="负责记录 Session、生成摘要、沉淀工作流与知识。"
          tag="记录与沉淀"
          modelLabel="规则 JSONL + 本地轻量模型"
          state="可用"
          tone="available"
          stripText="记录引擎维护 Session chunks 与安全留痕"
          onConfigure={onConfigure}
          onMore={onLogs}
        />
        <RoleCard
          role="safety"
          title="Safety Engine"
          desc="本地安全引擎，实时拦截高风险操作，保护你的设备安全。"
          tag="安全防护"
          modelLabel="本地安全引擎（规则锁定）"
          state="始终开启"
          tone="always"
          stripText="硬抢占关键词已锁定：停 / 暂停 / 取消 / 退回"
          locked
        />
      </div>

      {showCatalog ? (
        <>
          <h2 className="mb-3 mt-7 text-[14px] font-semibold text-slate-800">模型推荐</h2>
          <div className="grid grid-cols-3 gap-3">
            {catalog.map((item) => (
              <RecommendItem
                key={item.id}
                item={item}
                progress={activePull && activePull.model === item.id ? activePull : null}
                busy={busy}
                onPull={() => onPull(item.id)}
                onUse={() => onUse(item.id)}
              />
            ))}
          </div>
          <p className="mt-4 text-[12px] text-slate-400">{footerNote}</p>
        </>
      ) : (
        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-[12.5px] text-slate-600">
          {backendLabel} 的模型由其自身管理，本 App 不在此下载。请在「下载管理」标签查看已加载的模型并「设为大脑」。
        </div>
      )}
    </>
  );
}

function DownloadTab({
  backend,
  catalog,
  activePull,
  busy,
  customEndpoint,
  onPull,
  onCancel,
  onRemove,
  onUse,
  onInstall,
  onSaveCustomEndpoint
}: {
  backend: ModelBackendState;
  catalog: ModelCatalogItem[];
  activePull: ModelPullProgress | null;
  busy: boolean;
  customEndpoint: { baseUrl: string; model: string };
  onPull: (id: string) => void;
  onCancel: () => void;
  onRemove: (id: string) => void;
  onUse: (id: string) => void;
  onInstall: () => void;
  onSaveCustomEndpoint: (cfg: { baseUrl: string; model: string }) => void;
}) {
  const downloading = activePull && (activePull.phase === "downloading" || activePull.phase === "resolving" || activePull.phase === "verifying");
  const supportsPull = backend.supportsPull;
  const installedLabel = supportsPull ? "已安装模型" : "已加载 / 可用模型";
  return (
    <div className="space-y-4">
      {backend.backend === "custom" ? (
        <CustomEndpointForm customEndpoint={customEndpoint} onSave={onSaveCustomEndpoint} />
      ) : null}

      {backend.status !== "running" && supportsPull ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-[12.5px] text-amber-700">
          Ollama 未运行，无法下载模型。请先在右侧「安装 / 更新 Ollama」，或选择模型下载目录后由本 App 自动启动。
          <button onClick={onInstall} className="ml-2 font-medium underline">
            前往安装
          </button>
        </div>
      ) : null}

      {backend.status !== "running" && backend.backend === "lmstudio" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-[12.5px] text-amber-700">
          未连接到 LM Studio 本地服务器（默认 127.0.0.1:1234）。请在 LM Studio 中启动本地服务器并加载模型。
          <button onClick={onInstall} className="ml-2 font-medium underline">
            查看指南
          </button>
        </div>
      ) : null}

      {activePull ? (
        <section className={`${panel} p-4`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-800">下载进度 · {activePull.model}</span>
            {downloading ? (
              <button onClick={onCancel} className="text-[12px] text-slate-500 hover:text-rose-600">
                取消
              </button>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <span
              className={`block h-full rounded-full ${activePull.phase === "error" ? "bg-rose-500" : "bg-brand-500"}`}
              style={{ width: `${activePull.percent}%` }}
            />
          </div>
          <p className="mt-2 text-[11.5px] text-slate-500">
            {activePull.phase === "error"
              ? `下载失败：${activePull.message ?? activePull.status}`
              : activePull.phase === "success"
                ? "下载完成，可设为执行大脑。"
                : activePull.phase === "cancelled"
                  ? "已取消下载。"
                  : `${activePull.status} · ${activePull.percent}%（${formatGB(activePull.completedBytes / 1024 ** 3)} / ${formatGB(activePull.totalBytes / 1024 ** 3)}）`}
          </p>
        </section>
      ) : null}

      <section className={`${panel} p-4`}>
        <p className="mb-3 text-[13px] font-semibold text-slate-800">
          {installedLabel}（{backend.installedModels.length}）
        </p>
        {backend.installedModels.length === 0 ? (
          <p className="text-[12px] text-slate-400">
            {supportsPull
              ? "暂无已下载模型，从下方目录选择模型开始下载。"
              : "未发现可用模型。请在该后端中加载 / 启动一个模型后点击「重新检测」。"}
          </p>
        ) : (
          <div className="space-y-2">
            {backend.installedModels.map((installed) => (
              <div key={installed.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <span className="text-[12.5px] text-slate-700">{installed.name}</span>
                <div className="flex items-center gap-3">
                  {installed.sizeBytes > 0 ? (
                    <span className="text-[11.5px] text-slate-400">{formatGB(installed.sizeBytes / 1024 ** 3)}</span>
                  ) : null}
                  <button onClick={() => onUse(installed.name)} className="text-[12px] font-medium text-brand-600 hover:text-brand-700">
                    设为大脑
                  </button>
                  {supportsPull ? (
                    <button onClick={() => onRemove(installed.name)} className="text-[12px] text-slate-400 hover:text-rose-600">
                      删除
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {supportsPull ? (
      <section className={`${panel} p-4`}>
        <p className="mb-3 text-[13px] font-semibold text-slate-800">可下载模型</p>
        <div className="space-y-2">
          {catalog.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-slate-800">{item.displayName}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{item.id}</span>
                  {item.recommended ? <span className="rounded bg-brand-400/20 px-1.5 py-0.5 text-[10.5px] text-brand-700">推荐</span> : null}
                </div>
                <p className="mt-0.5 text-[11.5px] text-slate-400">
                  约 {item.approxSizeGB} GB · 建议 {item.recommendedRamGB}GB+ 内存
                </p>
              </div>
              {item.installed ? (
                <button onClick={() => onUse(item.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50">
                  {item.active ? "使用中" : "设为大脑"}
                </button>
              ) : (
                <button
                  disabled={busy || !!downloading}
                  onClick={() => onPull(item.id)}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand-600 disabled:opacity-40"
                >
                  下载
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      ) : null}
    </div>
  );
}

function LogsTab({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const snap = model.snapshot;
  const env = snap.environment;
  const backend = snap.backend;
  const rows: { label: string; value: string }[] = [
    { label: "激活后端", value: BACKEND_LABELS[snap.activeBackend] },
    { label: "后端状态", value: backend.message },
    { label: "端点", value: backend.endpoint },
    { label: "OpenAI 兼容端点", value: backend.openaiEndpoint || "（未配置）" }
  ];
  if (backend.backend === "ollama") {
    rows.push(
      { label: "模型目录", value: backend.modelsDir ?? "（跟随已运行的 Ollama 默认目录）" },
      { label: "进程管理", value: backend.managedByApp ? "由本 App 启动（OLLAMA_MODELS 生效）" : "外部/默认" }
    );
  }
  rows.push(
    { label: "活动 Provider", value: PROVIDER_LABELS[snap.activeProviderKind] ?? snap.activeProviderKind },
    { label: "真实推理", value: snap.providerConnected && snap.usingRealInference ? "是（已验证连接）" : "否（离线回退，未验证连接）" }
  );
  if (env) {
    rows.push(
      { label: "平台", value: `${env.platform} / ${env.arch} · ${env.cpuCores} 核` },
      { label: "内存", value: `${formatGB(env.totalRamGB)}（空闲 ${formatGB(env.freeRamGB)}）` },
      { label: "GPU", value: env.gpus.length ? env.gpus.map((g) => `${g.name}（${formatGB(g.vramTotalMB / 1024)}）`).join("；") : "未检测到" },
      { label: "磁盘", value: env.disk ? `${env.disk.path} 空闲 ${formatGB(env.disk.freeGB)} / ${formatGB(env.disk.totalGB)}` : "未知" }
    );
  }
  if (snap.activePull) {
    rows.push({ label: "最近下载", value: `${snap.activePull.model} · ${snap.activePull.status} · ${snap.activePull.percent}%` });
  }
  return (
    <section className={`${panel} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-slate-800">运行日志与环境</p>
        <button onClick={() => void model.probe()} className="text-[12px] text-brand-600 hover:text-brand-700">
          重新探测
        </button>
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 border-b border-slate-50 py-1.5 text-[12px] last:border-0">
            <span className="shrink-0 text-slate-400">{row.label}</span>
            <span className="text-right text-slate-700">{row.value}</span>
          </div>
        ))}
      </div>
      {snap.storageWarnings.length ? (
        <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-[11.5px] text-amber-700">
          {snap.storageWarnings.map((warning) => (
            <p key={warning}>· {warning}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StoragePanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  const { storage, environment } = model.snapshot;
  const disk = environment?.disk ?? null;
  const usedPct = disk && disk.totalGB > 0 ? Math.round(((disk.totalGB - disk.freeGB) / disk.totalGB) * 100) : 0;
  return (
    <section className={`${panel} p-4`}>
      <p className="mb-1.5 text-[13px] font-semibold text-slate-800">模型存储位置</p>
      <p className="mb-3 text-[11.5px] text-slate-400">为模型文件选择合适的存储位置（通过 OLLAMA_MODELS 生效），避免占用系统盘空间。</p>
      <button
        onClick={() => void model.chooseStorageRoot()}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[12.5px] text-slate-700 hover:bg-slate-100"
      >
        <span className="truncate">{storage.rootDir || "点击选择模型下载目录"}</span>
        <ChevronRight width={14} height={14} className="shrink-0 text-slate-400" />
      </button>
      {storage.rootDir ? (
        <button
          onClick={() => void model.openStorageLocation()}
          className="mt-2 text-[11.5px] text-brand-600 hover:text-brand-700"
        >
          打开目录
        </button>
      ) : null}
      {disk ? (
        <>
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-slate-500">
            <span>磁盘可用</span>
            <span>
              {formatGB(disk.freeGB)} / {formatGB(disk.totalGB)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${usedPct}%` }} />
          </div>
        </>
      ) : null}
    </section>
  );
}

function QuickAction({
  icon: Icon,
  title,
  desc,
  onClick
}: {
  icon: (props: { width?: number; height?: number; className?: string }) => JSX.Element;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
      <Icon width={17} height={17} className="text-slate-500" />
      <span className="leading-tight">
        <span className="block text-[12.5px] font-medium text-slate-700">{title}</span>
        <span className="block text-[11px] text-slate-400">{desc}</span>
      </span>
    </button>
  );
}

function RoleCard({
  role,
  title,
  desc,
  tag,
  modelLabel,
  state,
  tone,
  stripText,
  locked,
  onConfigure,
  onTest,
  onMore
}: {
  role: "brain" | "notebook" | "safety";
  title: string;
  desc: string;
  tag: string;
  modelLabel: string;
  state: string;
  tone: Tone;
  stripText: string;
  locked?: boolean;
  onConfigure?: () => void;
  onTest?: () => void;
  onMore?: () => void;
}) {
  const Icon = roleIcon[role];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-4 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-400/15 text-brand-600">
          <Icon width={22} height={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900">{title}</span>
            <StateDot tone={tone} label={state} />
          </div>
          <p className="mt-0.5 text-[12px] text-slate-500">{desc}</p>
          <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{tag}</span>
        </div>
        <div className="max-w-[220px] text-right">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span className="truncate">{modelLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 pl-2">
          {locked ? (
            <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-[12.5px] text-slate-400">已锁定</button>
          ) : (
            <>
              <button
                onClick={onConfigure}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-50"
              >
                配置
              </button>
              {onTest ? (
                <button
                  onClick={onTest}
                  className="rounded-lg bg-brand-400/20 px-3 py-1.5 text-[12.5px] font-medium text-brand-700 hover:bg-brand-400/30"
                >
                  测试
                </button>
              ) : null}
            </>
          )}
          {onMore ? (
            <button onClick={onMore} className="text-slate-400 hover:text-slate-600">
              <DotsIcon />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-[12px] text-slate-500">
          <CheckIcon width={14} height={14} className="text-brand-600" />
          {stripText}
        </span>
      </div>
    </section>
  );
}

function RecommendItem({
  item,
  progress,
  busy,
  onPull,
  onUse
}: {
  item: ModelCatalogItem;
  progress: ModelPullProgress | null;
  busy: boolean;
  onPull: () => void;
  onUse: () => void;
}) {
  const downloading = progress && (progress.phase === "downloading" || progress.phase === "resolving" || progress.phase === "verifying");
  return (
    <div className={`rounded-2xl border bg-white p-4 ${item.active ? "border-brand-400" : "border-slate-200"}`}>
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
            item.badge === "推荐" ? "bg-brand-400/20 text-brand-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {item.badge}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {item.feature}
        </span>
      </div>
      <p className="text-[14px] font-semibold text-slate-900">{item.displayName}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{item.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
          <GearIcon width={13} height={13} />
          {item.approxSizeGB} GB · 建议 {item.recommendedRamGB}GB+
        </div>
        {downloading ? (
          <span className="text-[12px] font-medium text-brand-600">{progress!.percent}%</span>
        ) : item.active ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600">
            <CheckIcon width={13} height={13} /> 使用中
          </span>
        ) : item.installed ? (
          <button onClick={onUse} className="rounded-lg border border-brand-200 px-3 py-1 text-[12px] font-medium text-brand-600 hover:bg-brand-400/10">
            设为大脑
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={onPull}
            className="rounded-lg border border-slate-200 px-3 py-1 text-[12px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            下载
          </button>
        )}
      </div>
      {downloading ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full rounded-full bg-brand-500" style={{ width: `${progress!.percent}%` }} />
        </div>
      ) : null}
    </div>
  );
}
