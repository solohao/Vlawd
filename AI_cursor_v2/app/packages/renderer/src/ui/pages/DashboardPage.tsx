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
              <CurrentTaskPanel onOpenSessions={onOpenSessions} />
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


function CurrentTaskPanel({ onOpenSessions }: { onOpenSessions: () => void }) {
  // 模拟多个任务数据
  const tasks = [
    {
      id: 1,
      name: "整理上周会议纪要并生成报告",
      currentStep: 2,
      totalSteps: 3,
      progress: 65,
      status: "running" as const
    },
    {
      id: 2,
      name: "调研 AI 助手产品竞品",
      currentStep: 1,
      totalSteps: 3,
      progress: 20,
      status: "running" as const
    },
    {
      id: 3,
      name: "准备产品发布会资料",
      currentStep: 3,
      totalSteps: 3,
      progress: 100,
      status: "completed" as const
    }
  ];

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50/50 px-4 py-2 border-b border-slate-100">
        <span className="text-[12px] font-medium text-slate-700">当前任务 ({tasks.filter(t => t.status === 'running').length})</span>
        <button className="text-[11px] text-slate-400 hover:text-slate-600">
          查看全部
        </button>
      </div>
      <List>
        {tasks.map((task) => (
          <ListRow
            key={task.id}
            onClick={onOpenSessions}
            leading={
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                {task.status === "completed" ? <CheckIcon width={16} /> : <GridIcon width={16} />}
              </span>
            }
            title={task.name}
            description={
              task.status === "completed"
                ? "已完成"
                : `步骤 ${task.currentStep}/${task.totalSteps} · 进行中`
            }
            trailing={
              <div className="flex items-center gap-2">
                {task.status === "running" && (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-8 text-right">{task.progress}%</span>
                    </div>
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                  </>
                )}
                {task.status === "completed" && (
                  <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    已完成
                  </span>
                )}
                <ChevronRight width={14} className="text-slate-300" />
              </div>
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
