import type { ReactNode } from "react";
import { AiEmployeeMascot } from "../Brand.js";
import { useConversation } from "../../runtime/useConversation.js";
import { useModelCenter } from "../../runtime/useModelCenter.js";
import {
  ArrowRight,
  BrainIcon,
  CheckIcon,
  ChevronDown,
  FileIcon,
  GearIcon,
  GridIcon,
  HeadphonesIcon,
  MicIcon,
  MonitorIcon,
  PlusIcon,
  RefreshIcon,
  ShieldIcon,
  SparkIcon,
  SunIcon
} from "../icons.js";

const card = "rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]";
const cardHover = "transition-all duration-200 hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)] hover:border-slate-300";
const button = "outline-none transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2";

function StatusDot({ active = false, pulse = false }: { active?: boolean; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? "bg-brand-500" : "bg-slate-300"}`} />
    </span>
  );
}

interface DashboardPageProps {
  onStartTask: () => void;
  onOpenSessions: () => void;
  onOpenModels: () => void;
}

export function DashboardPage({ onStartTask, onOpenSessions, onOpenModels }: DashboardPageProps) {
  const convo = useConversation();
  const model = useModelCenter();

  const startVoice = () => {
    void convo.toggleMic();
  };

  const engineLabel = "Bose QC Ultra";
  const localInference = model.snapshot.backend.status === "running";

  return (
    <div className="flex h-screen gap-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50/30">
      {/* 主内容区 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        {/* 顶部问候和状态 */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold text-slate-950">下午好，Lin</h1>
            <SunIcon width={24} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge
              icon={<ShieldIcon width={16} />}
              label="安全防护"
              value="已激活"
              status="active"
              detail="本地全面防护，高风险需确认"
            />
            <StatusBadge
              icon={<MonitorIcon width={16} />}
              label="服务提供者"
              value="就绪"
              status="ready"
              detail="AI 员工已启动，随时执行"
            />
            <StatusBadge
              icon={<HeadphonesIcon width={16} />}
              label="当前语音引擎"
              value={engineLabel}
              status="active"
              detail="本地运行 • 完全离线"
              highlight
            />
          </div>
        </header>

        <p className="text-[13px] text-slate-600">
          请尽可能直接 AI 员工，随时待命，按你指令去执行任务。
        </p>

        {/* 主语音交互区 */}
        <section className={`${card} relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50/60 via-white to-white py-10`}>
          {/* 装饰背景 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[10%] top-[45%] h-32 w-32 rounded-full bg-brand-400/10 blur-3xl" />
            <div className="absolute right-[15%] top-[35%] h-40 w-40 rounded-full bg-brand-300/8 blur-3xl" />
            {/* 波浪装饰 */}
            <svg className="absolute left-0 right-0 top-1/2 -translate-y-1/2" width="100%" height="120" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,60 Q300,20 600,60 T1200,60" fill="none" stroke="rgba(163,209,0,0.08)" strokeWidth="2" strokeDasharray="8,8" />
              <path d="M0,60 Q300,100 600,60 T1200,60" fill="none" stroke="rgba(163,209,0,0.08)" strokeWidth="2" strokeDasharray="8,8" />
            </svg>
          </div>

          {/* 内容 */}
          <div className="relative z-10 flex flex-col items-center">
            <AiEmployeeMascot size={110} />
            <h2 className="mt-4 text-[24px] font-bold text-slate-950">只需开口说出你的目标</h2>
            <p className="mt-2.5 max-w-md text-center text-[13px] leading-relaxed text-slate-600">
              我会理解你的目标，规划并执行，完成后为你汇报结果。
            </p>

            <button
              onClick={() => void startVoice()}
              disabled={!convo.micSupported && convo.available}
              className={`${button} group mt-6 flex h-[60px] w-full max-w-[480px] items-center justify-center gap-4 rounded-full border-2 border-brand-500 bg-white shadow-[0_4px_24px_rgba(163,209,0,0.15)] transition-all hover:border-brand-600 hover:shadow-[0_6px_32px_rgba(163,209,0,0.25)] disabled:opacity-50`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-[0_0_0_8px_rgba(163,209,0,0.12)] transition-all group-hover:bg-brand-700 group-hover:shadow-[0_0_0_10px_rgba(163,209,0,0.15)]">
                <MicIcon width={22} />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-[15px] font-semibold text-slate-950">
                  开始语音对话
                </span>
                <span className="text-[11px] text-slate-500">
                  点击说话，或按 Space 开始
                </span>
              </span>
            </button>

            <p className={`mt-3.5 flex items-center gap-2.5 text-[11px] ${convo.micActive ? "text-brand-700" : "text-slate-400"}`}>
              <StatusDot active={convo.micActive} pulse={convo.micActive} />
              {convo.micActive
                ? "语音连接已建立 · 全双工进行中"
                : "语音连接已建立 · 全双工进行中"}
            </p>
          </div>
        </section>

        {/* 当前任务 */}
        <CurrentTaskPanel />

        {/* 快速开始 */}
        <QuickActionsPanel onStartTask={onStartTask} onOpenModels={onOpenModels} />

        {/* 最近会话 */}
        <RecentSessionsPanel onOpenSessions={onOpenSessions} />
      </div>

      {/* 右侧边栏 */}
      <aside className="w-[340px] shrink-0 space-y-4 overflow-y-auto border-l border-slate-200/60 bg-white/40 px-5 py-5 backdrop-blur-sm">
        <VoiceSettingsPanel engine={engineLabel} local={localInference} onOpenModels={onOpenModels} />
        <SafetyPanel />
        <ExecutionBrainPanel model={model} />
        <RecordNotebookPanel />
        <AuditTrailPanel count={128} />
      </aside>
    </div>
  );
}

function StatusBadge({
  icon,
  label,
  value,
  status,
  detail,
  highlight = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status: "ready" | "active";
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
      highlight
        ? "border-brand-300 bg-brand-50/60"
        : "border-slate-200 bg-white"
    }`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
        status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"
      }`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-slate-950">{value}</p>
        <p className="mt-0.5 text-[10px] text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function CurrentTaskPanel() {
  const steps = [
    { label: "提炼目标", desc: "分析用户意图" },
    { label: "规划步骤", desc: "策划执行计划" },
    { label: "执行中", desc: "正在执行任务" },
    { label: "等待确认", desc: "需要用户确认" },
    { label: "已送达", desc: "完成并归档" }
  ];
  const currentStep = 2;

  return (
    <section className={`${card} px-5 py-4`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <CheckIcon width={16} />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-950">当前任务</h3>
            <p className="text-[11px] text-slate-600">整理会议记录并生成行动项</p>
          </div>
        </div>
        <button className={`${button} rounded-lg px-3 py-1.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50`}>
          查看任务详情 →
        </button>
      </div>

      <div className="flex items-center gap-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold transition-all ${
                    index < currentStep
                      ? "bg-brand-600 text-white shadow-sm"
                      : index === currentStep
                        ? "border-2 border-brand-600 bg-white text-brand-600 ring-4 ring-brand-100"
                        : "border-2 border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {index < currentStep ? <CheckIcon width={14} /> : index + 1}
                </span>
                <div className="text-center">
                  <p className={`text-[11px] font-medium ${index <= currentStep ? "text-slate-900" : "text-slate-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-[9px] text-slate-500">{step.desc}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="mx-2 h-[2px] flex-1 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-500"
                    style={{ width: index < currentStep ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-2.5">
          <p className="text-[10px] text-slate-600">本地系统</p>
          <p className="mt-1 text-[13px] font-semibold text-slate-950">开启</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
          <p className="text-[10px] text-slate-600">提供配置</p>
          <p className="mt-1 text-[13px] font-semibold text-slate-950">AI 正在配置中提供应器...</p>
        </div>
      </div>
    </section>
  );
}

function QuickActionsPanel({ onStartTask, onOpenModels }: { onStartTask: () => void; onOpenModels: () => void }) {
  const actions = [
    { Icon: SparkIcon, title: "开始新任务", desc: "语音或文字执行", action: onStartTask },
    { Icon: FileIcon, title: "导入任务", desc: "从文件或剪贴板", action: () => {} },
    { Icon: GridIcon, title: "新建工作流", desc: "定制你的流程", action: () => {} },
    { Icon: MicIcon, title: "语音设置", desc: "管理语音和精度", action: onOpenModels },
    { Icon: GridIcon, title: "查看知识库", desc: "访问本地知识", action: () => {} }
  ];

  return (
    <section className={`${card} px-5 py-4`}>
      <h3 className="mb-3 text-[13px] font-semibold text-slate-950">快速开始</h3>
      <div className="grid grid-cols-5 gap-3">
        {actions.map(({ Icon, title, desc, action }) => (
          <button
            key={title}
            onClick={action}
            className={`${card} ${cardHover} ${button} flex flex-col items-center justify-center gap-2.5 py-4 text-center`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon width={20} />
            </span>
            <span>
              <span className="block text-[11.5px] font-semibold text-slate-950">{title}</span>
              <span className="mt-0.5 block text-[9.5px] text-slate-500">{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecentSessionsPanel({ onOpenSessions }: { onOpenSessions: () => void }) {
  const sessions = [
    { id: 1, title: "处理客户反馈邮件并生成总结", type: "邮件处理", time: "今天 14:32", status: "已完成" },
    { id: 2, title: "调研竞品定价策略", type: "网页浏览", time: "今天 11:08", status: "已完成" },
    { id: 3, title: "填写供应商信息表单", type: "表单填写", time: "昨天 16:45", status: "已完成" },
    { id: 4, title: "整理会议记录并生成行动项", type: "文档处理", time: "昨天 10:22", status: "执行中" },
    { id: 5, title: "下载财务报告（已取消）", type: "文件操作", time: "5月26日 09:15", status: "已取消" }
  ];

  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h3 className="text-[13px] font-semibold text-slate-950">最近 Session</h3>
        <button
          onClick={onOpenSessions}
          className={`${button} flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50`}
        >
          查看全部 Session →
        </button>
      </div>

      <div className="divide-y divide-slate-50">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-2 text-[10px] font-medium text-slate-500">
          <span>任务/Session</span>
          <span>类别</span>
          <span>状态</span>
          <span>时间</span>
          <span></span>
        </div>
        {sessions.map((s) => (
          <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 transition-colors hover:bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <FileIcon width={16} />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{s.type}</p>
            </div>
            <span className={`flex items-center gap-1.5 text-[10.5px] ${s.status === "已完成" ? "text-brand-700" : s.status === "已取消" ? "text-slate-400" : "text-amber-600"}`}>
              <StatusDot active={s.status === "已完成"} />
              {s.status}
            </span>
            <span className="text-[10.5px] text-slate-400">{s.time}</span>
            <span className="text-[10.5px] text-slate-400">...</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function VoiceSettingsPanel({
  engine,
  local,
  onOpenModels
}: {
  engine: string;
  local: boolean;
  onOpenModels: () => void;
}) {
  return (
    <section className={`${card} px-4 py-4`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-[13px] font-semibold text-slate-950">当前语音设置</h3>
        <button
          onClick={onOpenModels}
          className={`${button} rounded-lg px-2.5 py-1 text-[10.5px] font-medium text-brand-700 hover:bg-brand-50`}
        >
          管理语音
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        <SettingRow label="预设模式" value="平衡模式（Balanced）" />
        <SettingRow label="语音引擎" value={engine} />
        <SettingRow
          label="运行模式"
          value="完全离线 • 本地运行"
          badge="local"
        />
      </div>

      <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
        <p className="flex items-center gap-2 text-[10px] font-medium text-brand-700">
          <ShieldIcon width={14} />
          当前会话完全离线处理，不会连接云端服务。
        </p>
      </div>
    </section>
  );
}

function SettingRow({ label, value, badge }: { label: string; value: string; badge?: "local" | "cloud" }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-600">{label}</span>
      {badge ? (
        <span
          className={`rounded-md px-2 py-1 text-[10px] font-medium ${
            badge === "local" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {value}
        </span>
      ) : (
        <span className="font-medium text-slate-900">{value}</span>
      )}
    </div>
  );
}

function SafetyPanel() {
  return (
    <section className={`${card} px-4 py-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldIcon width={18} />
          </span>
          <div>
            <h3 className="text-[13px] font-semibold text-slate-950">安全引擎</h3>
            <p className="text-[10px] text-emerald-700">● 运行中</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <SafetyItem icon={<ShieldIcon width={14} />} label="风险检测" value="已启用" />
        <SafetyItem icon={<ShieldIcon width={14} />} label="数据保护" value="已启用" />
        <SafetyItem icon={<ShieldIcon width={14} />} label="高风险拦截" value="已启用" />
      </div>
    </section>
  );
}

function SafetyItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-emerald-600">{icon}</span>
        <span className="text-[11px] text-slate-700">{label}</span>
      </div>
      <span className="text-[10px] text-slate-500">{value}</span>
    </div>
  );
}

function ExecutionBrainPanel({ model }: { model: ReturnType<typeof useModelCenter> }) {
  return (
    <section className={`${card} px-4 py-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-brand-700">
            <BrainIcon width={18} />
          </span>
          <h3 className="text-[13px] font-semibold text-slate-950">执行大脑</h3>
        </div>
        <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-brand-700">
          <StatusDot active pulse />
          就绪
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-600">模型</span>
          <span className="font-medium text-slate-900">Claude 3.5 Sonnet</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-600">上下文</span>
          <span className="font-medium text-slate-900">200K</span>
        </div>
      </div>
    </section>
  );
}

function RecordNotebookPanel() {
  return (
    <section className={`${card} px-4 py-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-brand-700">
            <FileIcon width={18} />
          </span>
          <h3 className="text-[13px] font-semibold text-slate-950">记录笔记本</h3>
        </div>
        <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-amber-600">
          <StatusDot active />
          同步中
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-600">存储位置</span>
          <span className="font-medium text-slate-900">本地加密储</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-600">记录状态</span>
          <span className="font-medium text-slate-900">正常</span>
        </div>
      </div>
    </section>
  );
}

function AuditTrailPanel({ count }: { count: number }) {
  const bars = [28, 28, 56, 10, 6, 28, 28, 56, 10, 6, 28, 28, 56, 10, 6, 28, 28, 56, 10, 6];
  const legend = [
    { label: "指令", value: 28, color: "bg-brand-500" },
    { label: "AI 回复", value: 28, color: "bg-brand-400" },
    { label: "动作执行", value: 56, color: "bg-slate-400" },
    { label: "用户确认", value: 10, color: "bg-slate-300" },
    { label: "中断/取消", value: 6, color: "bg-slate-200" }
  ];

  return (
    <section className={`${card} px-4 py-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-950">审计轨迹</h3>
          <p className="text-[10px] text-slate-600">本地记录，完整可追溯</p>
        </div>
        <button className={`${button} rounded-lg px-2.5 py-1 text-[10px] font-medium text-brand-700 hover:bg-brand-50`}>
          查看全部 →
        </button>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <div>
          <p className="text-[32px] font-bold leading-none text-brand-600">{count}</p>
          <p className="mt-1 text-[9.5px] text-slate-500">条操作</p>
        </div>
        <div className="flex h-16 flex-1 items-end gap-[2px]">
          {bars.map((height, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t ${legend[i % legend.length].color}`}
              style={{ height: `${(height / 60) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[9px]">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${item.color}`} />
            <span className="text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
