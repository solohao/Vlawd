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
import { cn, ListRow, KeyValueRow, DensityProvider, Card, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, List } from "../../design-system/index.js";

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
      <div className="flex h-screen flex-col overflow-hidden bg-white">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-4">
            {/* 顶部栏 - 极简化 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h1 className="text-[20px] font-semibold text-slate-900">工作台</h1>
                <p className="mt-0.5 text-[12px] text-slate-500">您说目标，我来完成</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  本地运行
                </span>
                <span className="h-4 w-px bg-slate-200" />
                <button
                  onClick={onOpenModels}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <GearIcon width={16} />
                </button>
              </div>
            </div>

            {/* 主操作区 - 极简紧凑 */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
              {/* 语音输入 */}
              <div className="flex items-center gap-4 border border-slate-100 bg-slate-50/30 px-5 py-4 rounded-lg">
                <button
                  onClick={startVoice}
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-transform hover:scale-105"
                >
                  <MicIcon width={22} />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-slate-900">按 Space 开始</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">例：帮我整理上周会议纪要并生成报告</p>
                </div>
              </div>

              {/* 助手状态 - 横向紧凑卡片 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-slate-100 rounded-lg px-3 py-2.5 bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                    <MonitorIcon width={12} className="text-slate-400" />
                    <span>运行</span>
                  </div>
                  <div className="text-[12px] font-semibold text-slate-900">本地</div>
                </div>
                <div className="border border-slate-100 rounded-lg px-3 py-2.5 bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                    <LockIcon width={12} className="text-slate-400" />
                    <span>隐私</span>
                  </div>
                  <div className="text-[12px] font-semibold text-slate-900">本地存储</div>
                </div>
                <div className="border border-slate-100 rounded-lg px-3 py-2.5 bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span>状态</span>
                  </div>
                  <div className="text-[12px] font-semibold text-slate-900">就绪</div>
                </div>
              </div>
            </div>

            {/* 常用操作 - 横向网格 */}
            <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50/50 px-4 py-2 border-b border-slate-100">
                <span className="text-[12px] font-medium text-slate-700">常用操作</span>
                <button className="text-[11px] text-slate-400 hover:text-slate-600">
                  更多 <ChevronRight width={12} className="inline" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100">
                <button
                  onClick={onStartTask}
                  className="flex items-center gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <DocIcon width={16} className="text-slate-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[12px] font-medium text-slate-900 truncate">整理会议纪要</div>
                    <div className="text-[10px] text-slate-500 truncate">提炼要点并生成报告</div>
                  </div>
                </button>
                <button
                  onClick={onStartTask}
                  className="flex items-center gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <GridIcon width={16} className="text-slate-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[12px] font-medium text-slate-900 truncate">数据分析</div>
                    <div className="text-[10px] text-slate-500 truncate">分析数据并生成图表</div>
                  </div>
                </button>
                <button
                  onClick={onStartTask}
                  className="flex items-center gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <SearchIcon width={16} className="text-slate-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[12px] font-medium text-slate-900 truncate">信息调研</div>
                    <div className="text-[10px] text-slate-500 truncate">搜索并总结关键信息</div>
                  </div>
                </button>
                <button
                  onClick={onStartTask}
                  className="flex items-center gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <PencilIcon width={16} className="text-slate-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[12px] font-medium text-slate-900 truncate">内容撰写</div>
                    <div className="text-[10px] text-slate-500 truncate">撰写文档与方案</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 当前任务 + 最近使用 */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <CurrentTaskPanel />
              <RecentUsePanel onOpenSessions={onOpenSessions} />
            </div>
          </div>
        </div>

        {/* 底部语音提示 - 极简 */}
        <div className="flex shrink-0 items-center justify-center border-t border-slate-100 bg-slate-50/40 py-2.5 text-[11px] text-slate-500">
          按 <kbd className="mx-1.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Space</kbd> 开始语音输入
        </div>
      </div>
    </DensityProvider>
  );
}


function CurrentTaskPanel() {
  const steps = [
    { icon: <MicIcon width={16} />, label: "理解", state: "done" as const },
    { icon: <GridIcon width={16} />, label: "执行", state: "current" as const },
    { icon: <CheckIcon width={16} />, label: "完成", state: "todo" as const }
  ];
  const plan = [
    { label: "收集上周所有会议记录", state: "done" as const },
    { label: "提炼关键信息与行动项", state: "current" as const },
    { label: "生成结构化报告", state: "todo" as const },
    { label: "汇总并准备汇报", state: "todo" as const }
  ];

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100">
        <p className="text-[11px] text-slate-500">当前任务</p>
        <h3 className="text-[13px] font-semibold text-slate-900">整理上周会议纪要并生成报告</h3>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-[12px] font-medium",
                    s.state === "done"
                      ? "bg-brand-500 text-white"
                      : s.state === "current"
                        ? "border-2 border-brand-500 bg-white text-brand-600"
                        : "border border-slate-200 bg-white text-slate-300"
                  )}
                >
                  {s.icon}
                </span>
                <p className={cn("mt-1 text-[11px]", s.state === "todo" ? "text-slate-400" : "text-slate-700")}>
                  {s.label}
                </p>
              </div>
              {i < steps.length - 1 && <div className="mx-4 h-px w-12 bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>进度</span>
            <span>65%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: "65%" }} />
          </div>
        </div>
      </div>

      <List>
        {plan.map((p) => (
          <ListRow
            key={p.label}
            leading={
              <span
                className={cn(
                  "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full",
                  p.state === "done"
                    ? "bg-brand-500 text-white"
                    : p.state === "current"
                      ? "border-2 border-brand-500"
                      : "border border-slate-300"
                )}
              >
                {p.state === "done" && <CheckIcon width={8} />}
                {p.state === "current" && <span className="h-1 w-1 rounded-full bg-brand-500" />}
              </span>
            }
            title={p.label}
            trailing={
              <span className={cn("text-[10px]", p.state === "current" ? "text-brand-600" : "text-slate-400")}>
                {p.state === "done" ? "完成" : p.state === "current" ? "进行中" : "待执行"}
              </span>
            }
          />
        ))}
      </List>
    </div>
  );
}

function RecentUsePanel({ onOpenSessions }: { onOpenSessions: () => void }) {
  const items = [
    { icon: <DocIcon width={14} />, title: "整理上周会议纪要并生成报告", time: "今天 09:30", status: "进行中" as const },
    { icon: <SearchIcon width={14} />, title: "调研 AI 助手产品竞品", time: "昨天 16:45", status: "已完成" as const },
    { icon: <GridIcon width={14} />, title: "汇总销售数据并生成图表", time: "昨天 10:20", status: "已完成" as const },
    { icon: <MonitorIcon width={14} />, title: "准备产品发布会资料", time: "5月26日", status: "已完成" as const },
    { icon: <CheckIcon width={14} />, title: "分析用户反馈", time: "5月25日", status: "已完成" as const }
  ];

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50/50 px-4 py-2 border-b border-slate-100">
        <span className="text-[12px] font-medium text-slate-700">最近使用</span>
        <button onClick={onOpenSessions} className="text-[11px] text-slate-400 hover:text-slate-600">
          查看全部
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-100">
        {items.map((it) => (
          <button
            key={it.title}
            onClick={onOpenSessions}
            className="flex items-start gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-slate-500 mt-0.5 shrink-0">{it.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-slate-900 truncate">{it.title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500">{it.time}</span>
                <span
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium",
                    it.status === "进行中"
                      ? "border-brand-200 bg-brand-50 text-brand-600"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  {it.status}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
