import { useState } from "react";
import { PageHeader, ToneBadge } from "../UiPrimitives.js";
import {
  BrainIcon,
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  HandIcon,
  PauseIcon,
  ShieldIcon
} from "../icons.js";

const steps = [
  { label: "理解目标", state: "done" },
  { label: "制定研究计划", state: "done" },
  { label: "读取来源", state: "current" },
  { label: "验证限制条件", state: "next" },
  { label: "生成摘要与证据", state: "next" }
] as const;

const events = [
  { type: "用户目标", time: "14:20", text: "比较三种中文全双工模型" },
  { type: "AI 计划", time: "14:21", text: "检索、筛选并验证来源" },
  { type: "用户纠正", time: "14:24", text: "只使用可公开验证的信息" },
  { type: "当前步骤", time: "14:26", text: "读取模型报告与来源" }
];

export function TaskWorkspacePage() {
  const [state, setState] = useState<"speaking" | "paused" | "cancelled" | "takeover">("speaking");

  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        dark
        title="研究中文全双工模型"
        subtitle="受监督任务空间 · Session #A-024 · 界面演示"
        action={
          <div className="flex gap-2">
            <ToneBadge dark tone={state === "cancelled" ? "danger" : state === "paused" ? "warning" : "brand"}>
              {state === "speaking" ? "Speaking" : state === "paused" ? "Paused" : state === "takeover" ? "User takeover" : "Cancelled"}
            </ToneBadge>
            <ToneBadge dark tone="info">Read only</ToneBadge>
          </div>
        }
      />
      <div className="grid grid-cols-[220px_minmax(480px,1fr)_260px] gap-4">
        <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-4">
          <h2 className="text-[13px] font-semibold text-white">任务步骤</h2>
          <div className="mt-4 space-y-0">
            {steps.map((step, index) => (
              <div key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                {index < steps.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-ink-600" />}
                <span
                  className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${
                    step.state === "done"
                      ? "border-brand-400 bg-brand-400 text-ink-900"
                      : step.state === "current"
                        ? "border-blue-400 bg-blue-500/10 text-blue-300"
                        : "border-ink-600 bg-ink-850 text-slate-600"
                  }`}
                >
                  {step.state === "done" ? <CheckIcon width={12} height={12} /> : index + 1}
                </span>
                <div>
                  <p className={`text-[12px] ${step.state === "next" ? "text-slate-600" : "text-slate-300"}`}>{step.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    {step.state === "done" ? "完成" : step.state === "current" ? "进行中" : "等待"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={() => setState("paused")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-ink-700 py-2.5 text-[12px] text-slate-200"
            >
              <PauseIcon /> 暂停
            </button>
            <button
              onClick={() => setState("cancelled")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2.5 text-[12px] text-white"
            >
              <CloseIcon width={14} height={14} /> 取消
            </button>
          </div>
        </section>

        <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-ink-700/60 px-3 py-2.5">
            <GlobeIcon width={16} height={16} className="text-slate-400" />
            <span className="flex-1 text-[12px] text-slate-300">中文全双工语音模型 本地运行</span>
            <ToneBadge dark tone="info">BrowserView A</ToneBadge>
          </div>
          <div className="mt-3 rounded-2xl bg-[#f4f6f2] p-5 text-slate-800">
            <p className="text-[12px] font-semibold">搜索结果</p>
            <div className="mt-3 divide-y divide-slate-200">
              {["BayLing-Duplex 技术报告", "PersonaPlex 模型说明", "Moshi 开源仓库"].map((result) => (
                <div key={result} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span className="text-[12px] font-medium">{result}</span>
                  </div>
                  <p className="ml-3.5 mt-1 text-[10px] text-slate-500">示例来源 · 等待真实 BrowserView 接入</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-brand-500/60 bg-brand-400/8 p-3">
            <p className="text-[10px] font-semibold text-brand-400">当前动作</p>
            <p className="mt-1 text-[12px] text-slate-200">读取 PersonaPlex 的硬件和许可要求</p>
            <p className="mt-1 text-[10px] text-slate-500">只读 DOM · 不提交表单 · 不写入文件</p>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-700 bg-ink-900 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-400/12 text-brand-400">
              <BrainIcon width={18} height={18} />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-white">{state === "paused" ? "Paused" : "Speaking"}</p>
              <p className="text-[10px] text-slate-500">状态由本页 Demo 控件驱动</p>
            </div>
            <div className="ml-auto flex h-5 items-end gap-1">
              {[9, 16, 12, 20, 14, 18, 8, 15].map((height, index) => (
                <span key={index} className="w-1 rounded-full bg-brand-400" style={{ height }} />
              ))}
            </div>
            <button
              onClick={() => setState("paused")}
              className="grid h-8 w-8 place-items-center rounded-full bg-ink-700 text-slate-300"
            >
              <PauseIcon />
            </button>
          </div>
          <button
            onClick={() => setState("takeover")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-400 py-2.5 text-[12px] font-semibold text-brand-300"
          >
            <HandIcon /> 接管当前 Workspace
          </button>
        </section>

        <aside className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-white">Session 实时记录</h2>
            <ShieldIcon width={15} height={15} className="text-brand-400" />
          </div>
          <div className="mt-4 space-y-4">
            {events.map((event, index) => (
              <div key={event.type} className="relative flex gap-3">
                {index < events.length - 1 && <span className="absolute left-[5px] top-4 h-[calc(100%+8px)] w-px bg-ink-600" />}
                <span
                  className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-ink-850 ${
                    index === 1 ? "bg-blue-400" : index === 2 ? "bg-amber-400" : "bg-brand-400"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold text-slate-300">{event.type}</p>
                    <span className="text-[9px] text-slate-600">{event.time}</span>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{event.text}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
