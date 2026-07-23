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
import { Button, Card } from "../../design-system/index.js";

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
        title="研究中文全双工模型"
        subtitle="受监督任务空间 · Session #A-024 · 界面演示"
        action={
          <div className="flex gap-2">
            <ToneBadge tone={state === "cancelled" ? "danger" : state === "paused" ? "warning" : "brand"}>
              {state === "speaking" ? "Speaking" : state === "paused" ? "Paused" : state === "takeover" ? "User takeover" : "Cancelled"}
            </ToneBadge>
            <ToneBadge tone="info">Read only</ToneBadge>
          </div>
        }
      />
      <div className="grid grid-cols-[220px_minmax(480px,1fr)_260px] gap-4">
        <Card variant="default" padding="md">
          <h2 className="text-[13px] font-semibold text-slate-900">任务步骤</h2>
          <div className="mt-4 space-y-0">
            {steps.map((step, index) => (
              <div key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                {index < steps.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />}
                <span
                  className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] shadow-sm ${
                    step.state === "done"
                      ? "border-brand-500 bg-brand-500 text-white"
                      : step.state === "current"
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {step.state === "done" ? <CheckIcon width={12} height={12} /> : index + 1}
                </span>
                <div>
                  <p className={`text-[12px] font-medium ${step.state === "next" ? "text-slate-400" : "text-slate-700"}`}>{step.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {step.state === "done" ? "完成" : step.state === "current" ? "进行中" : "等待"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setState("paused")}
              className="gap-1.5"
            >
              <PauseIcon /> 暂停
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setState("cancelled")}
              className="gap-1.5"
            >
              <CloseIcon width={14} height={14} /> 取消
            </Button>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 shadow-sm">
            <GlobeIcon width={16} height={16} className="text-slate-400" />
            <span className="flex-1 text-[12px] text-slate-600">中文全双工语音模型 本地运行</span>
            <ToneBadge tone="info">BrowserView A</ToneBadge>
          </div>
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 shadow-inner">
            <p className="text-[12px] font-semibold text-slate-800">搜索结果</p>
            <div className="mt-3 divide-y divide-slate-200">
              {["BayLing-Duplex 技术报告", "PersonaPlex 模型说明", "Moshi 开源仓库"].map((result) => (
                <div key={result} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-sm" />
                    <span className="text-[11.5px] font-medium text-slate-700">{result}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">等待 Runtime Evidence 提取</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 shadow-sm">
              <ShieldIcon width={14} height={14} className="text-amber-600" />
              <span className="text-[10.5px] text-slate-600">高风险动作需确认</span>
            </div>
            <Button variant="primary" size="default" className="w-full gap-2">
              <HandIcon width={14} height={14} /> 接管并纠正
            </Button>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <h2 className="text-[13px] font-semibold text-slate-900">Event 记录</h2>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={event.text} className="rounded-lg bg-slate-50 px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase text-brand-700">{event.type}</span>
                  <span className="text-[9px] text-slate-400">{event.time}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">{event.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <BrainIcon width={15} height={15} className="text-brand-700" />
              <span className="text-[11px] font-medium text-slate-700">执行信心</span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <span className="w-[75%] bg-gradient-to-r from-brand-500 to-brand-600 shadow-[0_0_8px_rgba(163,209,0,0.3)]" />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">信心度 75% · 来源可验证</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
