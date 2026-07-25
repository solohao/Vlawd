import { useMemo } from "react";
import type { EvidenceSummary, SessionLineage, TaskPlan, TaskStep } from "@ai-cursor-v2/shared";
import { Card, Progress, Badge, cn } from "../../design-system/index.js";
import { CheckIcon, CloseIcon, AlertCircleIcon, PlayIcon, NodesIcon, ListIcon } from "../icons.js";

export interface TodoPanelProps {
  plan?: TaskPlan;
  evidence?: EvidenceSummary;
  lineage?: SessionLineage;
  compact?: boolean;
  showEvidence?: boolean;
}

function stepState(step: TaskStep, index: number, steps: TaskStep[]): "done" | "failed" | "current" | "pending" {
  if (step.status === "done") return "done";
  if (step.status === "failed") return "failed";
  if (index === 0 || steps[index - 1]?.status === "done") return "current";
  return "pending";
}

function StepIcon({ state }: { state: "done" | "failed" | "current" | "pending" }) {
  if (state === "done") return <CheckIcon width={12} height={12} />;
  if (state === "failed") return <CloseIcon width={12} height={12} />;
  if (state === "current") return <PlayIcon width={12} height={12} />;
  return null;
}

export function TodoPanel({ plan, evidence, lineage, compact = false, showEvidence = true }: TodoPanelProps): JSX.Element {
  const steps = plan?.steps ?? [];
  const done = steps.filter((s) => s.status === "done").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const pending = steps.filter((s) => s.status === "pending").length;
  const total = steps.length;
  const progress = total > 0 ? done / total : 0;

  const currentIndex = useMemo(() => {
    const firstPending = steps.findIndex((s) => s.status === "pending");
    return firstPending === -1 ? steps.length : firstPending;
  }, [steps]);

  const unresolved = evidence?.unresolved_questions ?? [];

  return (
    <Card variant="default" padding={compact ? "sm" : "md"} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListIcon width={16} height={16} className="text-brand-600" />
          <h2 className={cn("font-semibold text-slate-900", compact ? "text-[12px]" : "text-[13px]")}>任务计划 (Todo)</h2>
        </div>
        {lineage?.parent_id && (
          <Badge variant="outline" size="sm" className="gap-1">
            <NodesIcon width={12} height={12} />
            分支 #{lineage.parent_id.slice(0, 8)}
          </Badge>
        )}
      </div>

      {plan?.goal && (
        <p className={cn("rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-700", compact ? "text-[11px]" : "text-[12px]")}>
          {plan.goal}
        </p>
      )}

      {lineage?.parent_id && lineage?.fork_reason && !compact && (
        <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
          从 <span className="font-mono">#{lineage.parent_id.slice(0, 8)}</span> 分支：{lineage.fork_reason}
        </p>
      )}

      {total > 0 ? (
        <>
          <div className="space-y-1">
            <Progress value={done} max={total} color={failed > 0 ? "warning" : "brand"} size="sm" />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{done}/{total} 完成</span>
              {failed > 0 && <span className="text-rose-600">{failed} 失败</span>}
              {pending > 0 && <span>{pending} 待执行</span>}
            </div>
          </div>

          <div className="space-y-0">
            {steps.map((step, index) => {
              const state = stepState(step, index, steps);
              const isCurrent = state === "current";
              return (
                <div
                  key={step.id}
                  className={cn(
                    "relative flex gap-3 pb-4 last:pb-0",
                    compact && "pb-3"
                  )}
                >
                  {index < steps.length - 1 && (
                    <span className="absolute left-[11px] top-6 h-[calc(100%-16px)] w-px bg-slate-200" />
                  )}
                  <span
                    className={cn(
                      "relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] shadow-sm",
                      state === "done"
                        ? "border-brand-500 bg-brand-500 text-white"
                        : state === "failed"
                          ? "border-rose-400 bg-rose-50 text-rose-600"
                          : state === "current"
                            ? "border-blue-400 bg-blue-50 text-blue-600"
                            : "border-slate-300 bg-white text-slate-400"
                    )}
                  >
                    {state === "pending" ? index + 1 : <StepIcon state={state} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-medium",
                        compact ? "text-[11px]" : "text-[12px]",
                        state === "pending" && "text-slate-400",
                        state === "failed" && "text-rose-600",
                        state === "current" && "text-slate-900",
                        state === "done" && "text-slate-500"
                      )}
                    >
                      {step.description}
                    </p>
                    {(step.reason || step.tool) && !compact && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {step.tool}{step.reason ? ` · ${step.reason}` : ""}
                      </p>
                    )}
                    {isCurrent && step.params && Object.keys(step.params).length > 0 && !compact && (
                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        参数：{JSON.stringify(step.params)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-slate-400">暂无任务计划，输入研究目标后点击「开始研究」生成。</p>
      )}

      {evidence && showEvidence && !compact && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircleIcon width={14} height={14} className="text-amber-600" />
            <h3 className="text-[12px] font-semibold text-slate-800">证据摘要</h3>
          </div>
          <div className="mt-2 space-y-1.5 text-[11px] text-slate-600">
            <p><span className="text-slate-400">目标：</span>{evidence.goal || "-"}</p>
            <p><span className="text-slate-400">状态：</span>{evidence.status}</p>
            <p><span className="text-slate-400">来源数：</span>{evidence.source_refs.length}</p>
            {evidence.corrections.length > 0 && (
              <div>
                <p className="text-slate-400">纠正：</p>
                <ul className="ml-4 list-disc text-slate-700">
                  {evidence.corrections.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {evidence.failed_attempts.length > 0 && (
              <div>
                <p className="text-slate-400">失败尝试：</p>
                <ul className="ml-4 list-disc text-rose-600">
                  {evidence.failed_attempts.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {unresolved.length > 0 && (
              <div>
                <p className="text-slate-400">未解决问题：</p>
                <ul className="ml-4 list-disc text-slate-700">
                  {unresolved.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
            {evidence.next_recommended_step && (
              <p><span className="text-slate-400">下一步建议：</span>{evidence.next_recommended_step}</p>
            )}
          </div>
        </div>
      )}

      {!evidence && plan && currentIndex < steps.length && !compact && (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          当前步骤：{steps[currentIndex]?.description || "等待执行"}
        </div>
      )}
    </Card>
  );
}
