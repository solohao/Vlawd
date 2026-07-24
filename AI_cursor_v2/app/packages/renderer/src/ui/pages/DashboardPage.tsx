import { useEffect, type ReactNode } from "react";
import { useConversation } from "../../runtime/useConversation.js";
import {
  BoltIcon,
  CheckIcon,
  ChevronDown,
  ChevronRight,
  DocIcon,
  GearIcon,
  GridIcon,
  HelpIcon,
  LockIcon,
  MicIcon,
  MonitorIcon,
  PencilIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon
} from "../icons.js";
import { cn, ListRow, KeyValueRow, DensityProvider, Card } from "../../design-system/index.js";

interface DashboardPageProps {
  onStartTask: () => void;
  onOpenSessions: () => void;
  onOpenModels: () => void;
}

export function DashboardPage({ onStartTask, onOpenSessions, onOpenModels }: DashboardPageProps) {
  const convo = useConversation();

  const startVoice = () => {
    void convo.toggleMic();
    onStartTask();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.code === "Space" && !typing) {
        e.preventDefault();
        startVoice();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DensityProvider density="compact">
      <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50/40">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1320px] px-8 py-7">
            {/* 顶部状态条 */}
            <div className="flex justify-end gap-2.5">
              <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                本地运行中
                <ChevronDown width={14} className="text-slate-400" />
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600">
                <ShieldIcon width={15} className="text-slate-500" /> 隐私保护
              </span>
              <button
                onClick={onOpenModels}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              >
                <GearIcon width={16} />
              </button>
            </div>

            {/* 问候 */}
            <div className="mt-4">
              <h1 className="text-[26px] font-bold tracking-tight text-slate-900">上午好，张明</h1>
              <p className="mt-1.5 text-[13px] text-slate-500">随时为您待命，您说目标，我来完成。</p>
            </div>

            {/* 语音区 + 助手状态 */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
              <section className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-7">
                <button
                  onClick={startVoice}
                  className="relative grid h-[120px] w-[120px] shrink-0 place-items-center"
                >
                  <span className="absolute inset-0 rounded-full border border-dashed border-brand-300/70" />
                  <span className="absolute inset-3 rounded-full border border-dashed border-brand-200/60" />
                  <span className="grid h-[80px] w-[80px] place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-transform hover:scale-105">
                    <MicIcon width={28} className="text-slate-700" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[22px] font-bold text-slate-900">请说出您的目标</h2>
                  <p className="mt-2 text-[13px] text-slate-500">例时：帮我整理上周会议纪要并生成报告</p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Chip icon={<MicIcon width={13} />} label="语音输入为主" />
                    <Chip icon={<BoltIcon width={13} />} label="自动规划与执行" />
                    <Chip icon={<CheckIcon width={13} />} label="完成后汇报结果" />
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col gap-2 border-l border-slate-100 pl-5 lg:flex">
                  <p className="text-[11px] font-semibold text-slate-600">快捷键</p>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">Space 说话</span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">Esc 取消</span>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-slate-900">助手状态</h3>
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-brand-700">
                    <span className="h-2 w-2 rounded-full bg-brand-500" /> 随时待命
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <StatusRow icon={<MonitorIcon width={15} />} label="运行环境" value="本地运行" />
                  <StatusRow icon={<LockIcon width={15} />} label="数据隐私" value="完全本地存储" />
                  <StatusRow icon={<CheckIcon width={15} />} label="响应状态" value="随时可用" />
                  <StatusRow icon={<RefreshIcon width={15} />} label="上次活跃" value="2 分钟前" />
                </div>
                <button
                  onClick={onOpenModels}
                  className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-[12.5px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  查看安全与隐私
                </button>
              </section>
            </div>

            {/* 常用操作 */}
            <div className="mt-7 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-slate-900">常用操作</h3>
              <button className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-600">
                更多 <ChevronRight width={14} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
              <ActionCard icon={<DocIcon width={18} />} title="整理会议纪要" desc="提炼要点并生成报告" onClick={onStartTask} />
              <ActionCard icon={<GridIcon width={18} />} title="数据分析" desc="分析数据并生成图表" onClick={onStartTask} />
              <ActionCard icon={<SearchIcon width={18} />} title="信息调研" desc="搜索并总结关键信息" onClick={onStartTask} />
              <ActionCard icon={<PencilIcon width={18} />} title="内容撰写" desc="撰写文档与方案" onClick={onStartTask} />
              <ActionCard icon={<CheckIcon width={18} />} title="待办管理" desc="整理并跟进待办事项" onClick={onStartTask} />
            </div>

            {/* 当前任务 + 最近使用 */}
            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
              <CurrentTaskPanel />
              <RecentUsePanel onOpenSessions={onOpenSessions} />
            </div>
          </div>
        </div>

        {/* 底部语音提示 */}
        <div className="relative flex shrink-0 items-center justify-center border-t border-slate-200/70 bg-white/70 py-3.5 text-[12px] text-slate-500 backdrop-blur">
          按住
          <kbd className="mx-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Space
          </kbd>
          开始语音输入
          <button className="absolute right-6 grid h-8 w-8 place-items-center rounded-full text-slate-300 hover:text-slate-500">
            <HelpIcon width={18} />
          </button>
        </div>
      </div>
    </DensityProvider>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] text-slate-600">
      <span className="text-slate-400">{icon}</span>
      {label}
    </span>
  );
}

function StatusRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <KeyValueRow
      icon={<span className="text-slate-400">{icon}</span>}
      label={label}
      value={<span className="font-medium text-slate-800">{value}</span>}
    />
  );
}

function ActionCard({
  icon,
  title,
  desc,
  onClick
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <Card padding="sm" variant="default" hoverable onClick={onClick} className="text-left">
      <ListRow
        flush
        leading={<span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600">{icon}</span>}
        title={title}
        description={desc}
        trailing={<ChevronRight width={16} className="text-slate-400" />}
      />
    </Card>
  );
}

function CurrentTaskPanel() {
  const steps = [
    { icon: <MicIcon width={18} />, label: "理解目标", desc: "语义理解与目标拆解", state: "done" as const },
    { icon: <GridIcon width={18} />, label: "执行中", desc: "正在处理相关资料", state: "current" as const },
    { icon: <CheckIcon width={18} />, label: "即将完成", desc: "生成报告并汇报结果", state: "todo" as const }
  ];
  const plan = [
    { label: "收集上周所有会议记录", state: "done" as const, time: "已完成 09:12" },
    { label: "提炼关键信息与行动项", state: "current" as const, time: "进行中" },
    { label: "生成结构化报告", state: "todo" as const, time: "待执行" },
    { label: "汇总并准备汇报", state: "todo" as const, time: "待执行" }
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[12px] text-slate-400">当前任务</p>
      <h3 className="mt-1 text-[15px] font-semibold text-slate-900">整理上周会议纪要并生成报告</h3>

      <div className="mt-5 flex items-center">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center text-center">
              <span
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full",
                  s.state === "done"
                    ? "bg-brand-50 text-brand-600"
                    : s.state === "current"
                      ? "border-2 border-brand-500 bg-white text-brand-600"
                      : "border border-slate-200 bg-white text-slate-300"
                )}
              >
                {s.icon}
              </span>
              <p className={cn("mt-2 text-[12px] font-medium", s.state === "todo" ? "text-slate-400" : "text-slate-800")}>
                {s.label}
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">{s.desc}</p>
            </div>
            {i < steps.length - 1 && <div className="mx-3 h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span />
          <span>65%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: "65%" }} />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <p className="text-[12px] font-medium text-slate-600">任务计划（自动生成）</p>
        <div className="mt-3">
          {plan.map((p) => (
            <ListRow
              key={p.label}
              flush
              leading={
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full",
                    p.state === "done"
                      ? "bg-brand-500 text-white"
                      : p.state === "current"
                        ? "border-2 border-brand-500"
                        : "border border-slate-300"
                  )}
                >
                  {p.state === "done" && <CheckIcon width={10} />}
                  {p.state === "current" && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                </span>
              }
              title={p.label}
              trailing={
                <span className={cn("text-[11px]", p.state === "current" ? "text-brand-700" : "text-slate-400")}>
                  {p.time}
                </span>
              }
            />
          ))}
        </div>
        <button className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-[12px] font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50">
          查看详情
        </button>
      </div>
    </section>
  );
}

function RecentUsePanel({ onOpenSessions }: { onOpenSessions: () => void }) {
  const items = [
    { icon: <DocIcon width={16} />, title: "整理上周会议纪要并生成报告", time: "今天 09:30", status: "进行中" as const },
    { icon: <SearchIcon width={16} />, title: "调研 AI 助手产品竞品", time: "昨天 16:45", status: "已完成" as const },
    { icon: <GridIcon width={16} />, title: "汇总销售数据并生成图表", time: "昨天 10:20", status: "已完成" as const },
    { icon: <MonitorIcon width={16} />, title: "准备产品发布会资料", time: "5月26日 14:10", status: "已完成" as const },
    { icon: <CheckIcon width={16} />, title: "分析用户反馈", time: "5月25日 11:05", status: "已完成" as const }
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-900">最近使用</h3>
        <button onClick={onOpenSessions} className="text-[12px] text-slate-400 hover:text-slate-600">
          查看全部
        </button>
      </div>
      <div className="mt-4 space-y-1">
        {items.map((it) => (
          <ListRow
            key={it.title}
            onClick={onOpenSessions}
            leading={
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
                {it.icon}
              </span>
            }
            title={it.title}
            description={it.time}
            trailing={
              <span
                className={cn(
                  "shrink-0 rounded-md border px-2 py-0.5 text-[10.5px] font-medium",
                  it.status === "进行中"
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                {it.status}
              </span>
            }
          />
        ))}
      </div>
    </section>
  );
}
