import { modelCenterData } from "../demo-data.js";
import type { RecommendCard, RoleModelCard } from "../demo-data.js";
import { useConversation } from "../../runtime/useConversation.js";
import {
  ArrowRight,
  BrainIcon,
  CheckIcon,
  ChevronDown,
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
const quickIcon = { refresh: RefreshIcon, import: ImportIcon, compat: CompatIcon };

function StateDot({ tone, label }: { tone: string; label: string }) {
  const color =
    tone === "running" ? "bg-brand-500" : tone === "available" ? "bg-amber-400" : "bg-slate-400";
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

export function ModelCenterPage() {
  const m = modelCenterData;
  const convo = useConversation();
  const { snapshot } = convo;

  const brainState = !convo.available
    ? { state: "未连接", tone: "idle" }
    : snapshot.providerConnected && snapshot.usingRealInference
      ? { state: "运行中", tone: "running" }
      : snapshot.providerConnected
        ? { state: "离线回退", tone: "available" }
        : { state: "未连接", tone: "idle" };

  const overview = m.overview.map((o) =>
    o.label === "Execution Brain" ? { ...o, state: brainState.state, tone: brainState.tone } : o
  );

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
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            AI 员工已就绪
          </span>
        </header>

        {/* tabs */}
        <div className="mb-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex gap-6">
            {m.tabs.map((tab, i) => (
              <button
                key={tab}
                className={`-mb-px border-b-2 pb-2.5 text-[13.5px] font-medium ${
                  i === 0
                    ? "border-brand-500 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-1 pb-2 text-[12.5px] text-slate-500 hover:text-slate-700">
            模型使用指南 <ArrowRight width={13} height={13} />
          </button>
        </div>

        <h2 className="mb-3 text-[14px] font-semibold text-slate-800">核心角色模型</h2>
        <div className="space-y-3">
          {m.roleModels.map((r) => (
            <RoleCard
              key={r.role}
              role={
                r.role === "brain" && convo.available
                  ? {
                      ...r,
                      state: brainState.state,
                      stateTone: brainState.tone === "running" ? "running" : "available",
                      model: PROVIDER_LABELS[snapshot.activeProviderKind] ?? r.model,
                      strip: {
                        ...r.strip,
                        text: snapshot.usingRealInference
                          ? "已连接真实本地推理端点"
                          : "离线回退语气（非真实推理）"
                      }
                    }
                  : r
              }
              onTest={r.role === "brain" ? () => void convo.checkHealth() : undefined}
            />
          ))}
        </div>

        <h2 className="mb-3 mt-7 text-[14px] font-semibold text-slate-800">模型推荐</h2>
        <div className="grid grid-cols-3 gap-3">
          {m.recommends.map((r) => (
            <RecommendItem
              key={r.name}
              item={r}
              onSelect={
                convo.available && /qwen/i.test(r.name)
                  ? () => void convo.setProvider("pipeline")
                  : convo.available && /llama|bayling/i.test(r.name)
                    ? () => void convo.setProvider("bayling-duplex")
                    : undefined
              }
            />
          ))}
        </div>
        <p className="mt-4 text-[12px] text-slate-400">{m.footerNote}</p>
      </div>

      {/* right rail */}
      <aside className="w-[300px] shrink-0 space-y-4">
        <section className={`${panel} p-4`}>
          <p className="mb-3 text-[13px] font-semibold text-slate-800">模型状态总览</p>
          <div className="space-y-2.5">
            {overview.map((o) => {
              const Icon = roleIcon[o.label === "Execution Brain" ? "brain" : o.label === "Record Notebook" ? "notebook" : "safety"];
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

        <section className={`${panel} p-4`}>
          <p className="mb-1.5 text-[13px] font-semibold text-slate-800">模型存储位置</p>
          <p className="mb-3 text-[11.5px] text-slate-400">{m.storage.note}</p>
          <button className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">
            {m.storage.path}
            <ChevronDown className="text-slate-400" />
          </button>
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-slate-500">
            <span>已用空间</span>
            <span>
              {m.storage.used} / {m.storage.total}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${m.storage.usedPct}%` }} />
          </div>
        </section>

        <section className={`${panel} p-4`}>
          <p className="mb-3 text-[13px] font-semibold text-slate-800">快速操作</p>
          <div className="space-y-1">
            {m.quickActions.map((q) => {
              const Icon = quickIcon[q.icon as keyof typeof quickIcon];
              return (
                <button
                  key={q.title}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                >
                  <Icon width={17} height={17} className="text-slate-500" />
                  <span className="leading-tight">
                    <span className="block text-[12.5px] font-medium text-slate-700">{q.title}</span>
                    <span className="block text-[11px] text-slate-400">{q.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`${panel} bg-slate-50/60 p-4`}>
          <div className="mb-1.5 flex items-center gap-2">
            <HelpIcon width={16} height={16} className="text-brand-600" />
            <span className="text-[13px] font-semibold text-slate-800">了解更多</span>
          </div>
          <p className="text-[12.5px] font-medium text-slate-600">如何选择合适的模型？</p>
          <p className="mt-1 text-[11.5px] text-slate-400">不同模型在能力、性能和资源占用上有所不同。</p>
          <button className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-600">
            了解更多选择建议 <ArrowRight width={13} height={13} />
          </button>
        </section>
      </aside>
    </div>
  );
}

function RoleCard({ role, onTest }: { role: RoleModelCard; onTest?: () => void }) {
  const Icon = roleIcon[role.role];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-4 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-400/15 text-brand-600">
          <Icon width={22} height={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900">{role.title}</span>
            <StateDot tone={role.stateTone} label={role.state} />
          </div>
          <p className="mt-0.5 text-[12px] text-slate-500">{role.desc}</p>
          <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            {role.tag}
          </span>
        </div>
        <div className="text-right">
          <button className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {role.model}
            <ChevronRight width={14} height={14} className="text-slate-400" />
          </button>
          {role.usage ? (
            <div className="mt-2 flex gap-3 text-[11.5px] text-slate-400">
              <span>CPU {role.usage.cpu}</span>
              <span>RAM {role.usage.ram}</span>
              <span>GPU {role.usage.gpu}</span>
            </div>
          ) : (
            <div className="mt-2 text-[11.5px] text-slate-400">{role.meta.join(" | ")}</div>
          )}
        </div>
        <div className="flex items-center gap-2 pl-2">
          {role.locked ? (
            <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-[12.5px] text-slate-400">已启用</button>
          ) : (
            <>
              <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-50">
                配置
              </button>
              <button
                onClick={onTest}
                className="rounded-lg bg-brand-400/20 px-3 py-1.5 text-[12.5px] font-medium text-brand-700 hover:bg-brand-400/30"
              >
                测试
              </button>
            </>
          )}
          <button className="text-slate-400 hover:text-slate-600">
            <DotsIcon />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-[12px] text-slate-500">
          <CheckIcon width={14} height={14} className="text-brand-600" />
          {role.strip.text}
        </span>
        <span className="inline-flex items-center gap-2 text-[11.5px] text-slate-400">
          {role.strip.time}
          <span className="inline-flex items-center gap-0.5 text-slate-500">
            查看详情 <ChevronRight width={12} height={12} />
          </span>
        </span>
      </div>
    </section>
  );
}

function RecommendItem({ item, onSelect }: { item: RecommendCard; onSelect?: () => void }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${item.selected ? "border-brand-400" : "border-slate-200"}`}>
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
      <p className="text-[14px] font-semibold text-slate-900">{item.name}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{item.desc}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
          <GearIcon width={13} height={13} />
          {item.size} · {item.ram}
        </div>
        {item.selected ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600">
            <CheckIcon width={13} height={13} /> 已选择
          </span>
        ) : (
          <button
            onClick={onSelect}
            className="rounded-lg border border-slate-200 px-3 py-1 text-[12px] text-slate-600 hover:bg-slate-50"
          >
            选择
          </button>
        )}
      </div>
    </div>
  );
}
