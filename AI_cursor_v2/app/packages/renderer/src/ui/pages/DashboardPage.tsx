import { useEffect, type ReactNode } from "react";
import { useConversation } from "../../runtime/useConversation.js";
import { useDesktopRuntime } from "../../runtime/useDesktopRuntime.js";
import { FeatureSection } from "../../app/feature-status.js";
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
  const desktop = useDesktopRuntime();

  const readyForConversation = (snapshot: typeof convo.snapshot) =>
    snapshot.providerConnected && snapshot.usingRealInference;

  const startVoice = async () => {
    const afterConnect = await convo.connect();
    if (convo.available && !readyForConversation(afterConnect)) {
      onOpenModels();
      return;
    }
    if (convo.available) {
      void convo.toggleMic();
    }
    onStartTask();
  };

  const startTask = async () => {
    const afterConnect = await convo.connect();
    if (convo.available && !readyForConversation(afterConnect)) {
      onOpenModels();
      return;
    }
    onStartTask();
  };

  const realInference = convo.snapshot.providerConnected && convo.snapshot.usingRealInference;
  const runtimeStateLabel: Record<string, string> = {
    listening: "就绪",
    thinking: "思考中",
    speaking: "说话中",
    acting: "执行中",
    paused: "已暂停",
    interrupted: "已中断",
    complete: "完成"
  };
  const currentState = runtimeStateLabel[desktop.snapshot.runtimeState] ?? desktop.snapshot.runtimeState;

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
    <FeatureSection id="ui.dashboard" title="工作台" autoReady={!!desktop.snapshot.generatedAt} className="h-full">
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
                  <div className="text-[12px] font-semibold text-slate-900">{realInference ? "本地运行" : "未就绪"}</div>
                </div>
                <div className="border border-slate-100 rounded-lg px-3 py-2.5 bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                    <LockIcon width={12} className="text-slate-400" />
                    <span>隐私</span>
                  </div>
                  <div className="text-[12px] font-semibold text-slate-900">{desktop.snapshot.modelBinding?.executionBrain?.endpoint ? "本地优先" : "未配置"}</div>
                </div>
                <div className="border border-slate-100 rounded-lg px-3 py-2.5 bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span>状态</span>
                  </div>
                  <div className="text-[12px] font-semibold text-slate-900">{currentState}</div>
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
                  onClick={() => void startTask()}
                  className="flex items-center gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <DocIcon width={16} className="text-slate-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[12px] font-medium text-slate-900 truncate">整理会议纪要</div>
                    <div className="text-[10px] text-slate-500 truncate">提炼要点并生成报告</div>
                  </div>
                </button>
                <button
                  onClick={() => void startTask()}
                  className="flex items-center gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <GridIcon width={16} className="text-slate-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[12px] font-medium text-slate-900 truncate">数据分析</div>
                    <div className="text-[10px] text-slate-500 truncate">分析数据并生成图表</div>
                  </div>
                </button>
                <button
                  onClick={() => void startTask()}
                  className="flex items-center gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <SearchIcon width={16} className="text-slate-500 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[12px] font-medium text-slate-900 truncate">信息调研</div>
                    <div className="text-[10px] text-slate-500 truncate">搜索并总结关键信息</div>
                  </div>
                </button>
                <button
                  onClick={() => void startTask()}
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
    </FeatureSection>
  );
}


type TaskStatus = "running" | "completed";
interface Task {
  id: string;
  name: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
  status: TaskStatus;
}

function CurrentTaskPanel({ onOpenSessions }: { onOpenSessions: () => void }) {
  const tasks: Task[] = [];

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50/50 px-4 py-2 border-b border-slate-100">
        <span className="text-[12px] font-medium text-slate-700">当前任务 ({tasks.filter(t => t.status === 'running').length})</span>
        <button className="text-[11px] text-slate-400 hover:text-slate-600">
          查看全部
        </button>
      </div>
      {tasks.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-slate-400">暂无进行中的任务</div>
      ) : (
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
      )}
    </div>
  );
}

function RecentUsePanel({ onOpenSessions }: { onOpenSessions: () => void }) {
  const desktop = useDesktopRuntime();
  const chunks = desktop.snapshot.session?.chunks ?? [];
  const recentItems = [...chunks].reverse().slice(0, 6).map((chunk) => ({
    title: chunk.summary || "未命名操作",
    time: new Date(chunk.created_at).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    status: "已完成" as const
  }));

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50/50 px-4 py-2 border-b border-slate-100">
        <span className="text-[12px] font-medium text-slate-700">最近使用</span>
        <button onClick={onOpenSessions} className="text-[11px] text-slate-400 hover:text-slate-600">
          查看全部
        </button>
      </div>
      {recentItems.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-slate-400">暂无最近使用记录</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-100">
          {recentItems.map((it, index) => (
            <button
              key={`${it.title}-${index}`}
              onClick={onOpenSessions}
              className="flex items-start gap-2.5 bg-white px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              <span className="text-slate-500 mt-0.5 shrink-0"><DocIcon width={14} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-slate-900 truncate">{it.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">{it.time}</span>
                  <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                    {it.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
