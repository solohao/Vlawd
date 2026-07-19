import type { ReactNode } from "react";
import { AiEmployeeMascot } from "../Brand.js";
import { dashboardData } from "../demo-data.js";
import type { SessionRow } from "../demo-data.js";
import {
  ArrowRight,
  BrainIcon,
  CheckIcon,
  ChevronDown,
  DocIcon,
  DotsIcon,
  FileIcon,
  GearIcon,
  GlobeIcon,
  HeadphonesIcon,
  ImportIcon,
  MailIcon,
  MicIcon,
  MonitorIcon,
  NotebookIcon,
  PlusIcon,
  ShieldIcon,
  SparkIcon,
  SunIcon,
  TableIcon,
  WorkflowIcon
} from "../icons.js";

const card = "rounded-2xl border border-slate-200 bg-white";
const sessionIcons = { mail: MailIcon, globe: GlobeIcon, table: TableIcon, doc: DocIcon, file: FileIcon };
const monitorIcons = { monitor: MonitorIcon, chrome: GlobeIcon, excel: TableIcon, gmail: MailIcon, file: FileIcon };
const quickIcons = { spark: SparkIcon, import: ImportIcon, workflow: WorkflowIcon, mic: MicIcon };

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-400/15 px-2.5 py-1 text-[11px] font-medium text-brand-700">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      {children}
    </span>
  );
}

interface DashboardPageProps {
  onStartTask: () => void;
  onOpenSessions: () => void;
  onOpenModels: () => void;
}

export function DashboardPage({ onStartTask, onOpenSessions, onOpenModels }: DashboardPageProps) {
  const d = dashboardData;
  return (
    <div className="flex gap-6 px-8 py-7">
      {/* main column */}
      <div className="min-w-0 flex-1">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[26px] font-bold text-slate-900">
              {d.greeting}
              <SunIcon className="text-brand-500" />
            </h1>
            <p className="mt-1.5 text-[13.5px] text-slate-500">{d.subtitle}</p>
          </div>
          <button onClick={onOpenModels}>
            <Pill>{d.readiness}</Pill>
          </button>
        </header>

        {/* execution capsule */}
        <section className={`${card} relative overflow-hidden p-6`}>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(164,209,0,0.35),transparent_70%)]" />
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[12px] text-slate-500">
                对话入口
                <GearIcon className="text-slate-400" />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-700">
                <HeadphonesIcon className="text-brand-600" />
                {d.endpoint.device}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-brand-600">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {d.endpoint.state}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <AiEmployeeMascot size={132} />
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-400/15 px-3 py-1 text-[11.5px] font-medium text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                执行舱在线
              </span>
              <p className="mt-2 text-[12px] text-slate-400">{d.capsuleCaption}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[12px] text-slate-500">
                当前模式
                <ChevronDown className="text-slate-400" />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-700">
                <SparkIcon className="text-brand-600" />
                {d.mode.name}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-brand-600">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {d.mode.hint}
              </div>
            </div>
          </div>

          {/* steps */}
          <div className="relative mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            {d.steps.map((step, i) => (
              <div key={step.label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${
                      step.state === "done"
                        ? "bg-brand-500 text-white"
                        : step.state === "current"
                          ? "border border-brand-500 text-brand-600"
                          : "border border-slate-300 text-slate-400"
                    }`}
                  >
                    {step.state === "done" ? <CheckIcon width={13} height={13} /> : i + 1}
                  </span>
                  <span className={`text-[11.5px] ${step.state === "todo" ? "text-slate-400" : "text-slate-600"}`}>
                    {step.label}
                  </span>
                </div>
                {i < d.steps.length - 1 && <div className="mx-2 h-px flex-1 bg-slate-200" />}
              </div>
            ))}
          </div>
        </section>

        {/* monitor row */}
        <section className={`${card} mt-4 flex items-center gap-4 p-4`}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-400/15 text-brand-600">
              <MonitorIcon width={18} height={18} />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-medium text-slate-800">桌面监控中</p>
              <p className="text-[11px] text-slate-400">AI 仅在受控环境中操作</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {d.monitorApps.map((app, i) => {
              const Icon = monitorIcons[app as keyof typeof monitorIcons];
              return (
                <span
                  key={app}
                  className={`grid h-9 w-9 place-items-center rounded-lg border ${
                    i === 0
                      ? "border-brand-400/60 bg-brand-400/15 text-brand-600"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Icon width={17} height={17} />
                </span>
              );
            })}
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400">
              <PlusIcon width={16} height={16} />
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-right">
            <div className="leading-tight">
              <p className="text-[12px] font-medium text-slate-700">本地安全防护已激活</p>
              <p className="text-[11px] text-slate-400">高风险动作需确认</p>
            </div>
            <ArrowRight className="text-slate-400" />
          </div>
        </section>

        {/* quick actions */}
        <section className="mt-4 grid grid-cols-4 gap-3">
          {d.quickActions.map((q) => {
            const Icon = quickIcons[q.icon as keyof typeof quickIcons];
            return (
              <button
                key={q.title}
                onClick={q.title === "开始新任务" ? onStartTask : undefined}
                className={`${card} flex items-center gap-3 p-3.5 text-left transition-colors hover:border-brand-400/50`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-400/15 text-brand-600">
                  <Icon width={18} height={18} />
                </span>
                <span className="leading-tight">
                  <span className="block text-[13px] font-medium text-slate-800">{q.title}</span>
                  <span className="block text-[11px] text-slate-400">{q.desc}</span>
                </span>
              </button>
            );
          })}
        </section>

        {/* session list */}
        <section className={`${card} mt-4 overflow-hidden`}>
          {d.sessions.map((s) => (
            <SessionItem key={s.id} session={s} />
          ))}
          <button
            onClick={onOpenSessions}
            className="flex w-full items-center justify-center gap-1.5 py-3.5 text-[13px] font-medium text-brand-600 hover:text-brand-700"
          >
            查看全部 Session <ArrowRight width={15} height={15} />
          </button>
        </section>
      </div>

      {/* right rail */}
      <aside className="w-[320px] shrink-0 space-y-4">
        <SafetyCard />
        <BrainCard />
        <NotebookCard />
        <AuditCard />
        <WorkflowsCard />
      </aside>
    </div>
  );
}

function SessionItem({ session }: { session: SessionRow }) {
  const Icon = sessionIcons[session.icon];
  const done = session.status === "completed";
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon width={17} height={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-medium ${done ? "text-slate-800" : "text-slate-400"}`}>
          {session.title}
        </p>
        <p className="truncate text-[11.5px] text-slate-400">{session.desc}</p>
      </div>
      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-500">{session.category}</span>
      <span className="w-[72px] text-right text-[11.5px] text-slate-400">{session.time}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-[11.5px] ${
          done ? "text-brand-600" : "text-slate-400"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-brand-500" : "bg-slate-300"}`} />
        {done ? "已完成" : "已取消"}
      </span>
      <button className="text-slate-400 hover:text-slate-600">
        <DotsIcon />
      </button>
    </div>
  );
}

function RailCard({
  icon,
  title,
  state,
  children
}: {
  icon: ReactNode;
  title: string;
  state: string;
  children: ReactNode;
}) {
  return (
    <section className={`${card} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-400/15 text-brand-600">{icon}</span>
          <span className="text-[13.5px] font-semibold text-slate-800">{title}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-brand-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {state}
          <ArrowRight width={13} height={13} />
        </span>
      </div>
      {children}
    </section>
  );
}

function SafetyCard() {
  const s = dashboardData.statusCards.safety;
  return (
    <RailCard icon={<ShieldIcon width={16} height={16} />} title={s.title} state={s.state}>
      <p className="mb-3 text-[12px] text-slate-500">{s.heading}</p>
      <div className="grid grid-cols-3 gap-2">
        {s.items.map((it) => (
          <div key={it.label} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
            <ShieldIcon width={15} height={15} className="mx-auto mb-1 text-brand-600" />
            <p className="text-[10.5px] text-slate-500">{it.label}</p>
            <p className="text-[10.5px] text-slate-400">{it.value}</p>
          </div>
        ))}
      </div>
    </RailCard>
  );
}

function KeyVals({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <p className="text-[11px] text-slate-400">{r.label}</p>
          <p className="text-[12.5px] font-medium text-slate-800">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function BrainCard() {
  const s = dashboardData.statusCards.brain;
  return (
    <RailCard icon={<BrainIcon width={16} height={16} />} title={s.title} state={s.state}>
      <KeyVals rows={s.rows} />
    </RailCard>
  );
}

function NotebookCard() {
  const s = dashboardData.statusCards.notebook;
  return (
    <RailCard icon={<NotebookIcon width={16} height={16} />} title={s.title} state={s.state}>
      <KeyVals rows={s.rows} />
    </RailCard>
  );
}

function AuditCard() {
  const a = dashboardData.audit;
  return (
    <section className={`${card} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-slate-800">审计轨迹</p>
          <p className="text-[11px] text-slate-400">本地记录，完整可追溯</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-brand-600">
          查看全部 <ArrowRight width={13} height={13} />
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-[30px] font-bold leading-none text-brand-600">{a.total}</p>
          <p className="mt-1 text-[11px] text-slate-400">{a.totalLabel}</p>
          <p className="text-[11px] text-slate-400">{a.sub}</p>
        </div>
        <div className="flex h-12 flex-1 items-end gap-[3px]">
          {a.bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-brand-500/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1.5 border-t border-slate-100 pt-3">
        {a.legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11.5px]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                l.tone === "brand" ? "bg-brand-500" : l.tone === "soft" ? "bg-brand-300" : "bg-slate-300"
              }`}
            />
            <span className="text-slate-500">{l.label}</span>
            <span className="ml-auto pr-3 font-medium text-slate-600">{l.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowsCard() {
  const ws = dashboardData.workflows;
  return (
    <section className={`${card} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-slate-800">我的工作流</p>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-brand-600">
          查看全部 <ArrowRight width={13} height={13} />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ws.map((w) => (
          <div
            key={w.id}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
              w.enabled ? "bg-slate-50" : "bg-slate-50/60"
            }`}
          >
            <WorkflowIcon width={15} height={15} className={w.enabled ? "text-brand-600" : "text-slate-300"} />
            <span className={`text-[12px] ${w.enabled ? "text-slate-700" : "text-slate-400"}`}>{w.title}</span>
          </div>
        ))}
      </div>
      <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-[12px] text-slate-500 hover:border-brand-400/50 hover:text-brand-600">
        <PlusIcon width={14} height={14} /> 创建新的工作流
      </button>
    </section>
  );
}
