import { useEffect, useRef } from "react";
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
import { Button, Card, List, ListRow } from "../../design-system/index.js";
import { useDesktopRuntime } from "../../runtime/useDesktopRuntime.js";
import { useMarkFeature } from "../../app/feature-status.js";

const typeLabels: Record<string, string> = {
  user: "用户",
  model: "AI",
  proposal: "提案",
  action_result: "结果",
  safety: "安全",
  state: "状态"
};

export function TaskWorkspacePage() {
  const desktop = useDesktopRuntime();
  const mark = useMarkFeature();
  const markedRef = useRef(false);
  const { snapshot, busy, pauseSession, cancelSession, executeRuntimeAction } = desktop;
  const { runtimeState, session, graph, browser } = snapshot;

  useEffect(() => {
    if (session.chunks.length > 0 && !markedRef.current) {
      markedRef.current = true;
      mark("ui.task", "done");
    }
  }, [session.chunks.length, mark]);

  const stateTone = runtimeState === "interrupted" ? "danger" : runtimeState === "paused" ? "warning" : "brand";
  const stateText = runtimeState === "paused" ? "Paused" : runtimeState === "interrupted" ? "Interrupted" : runtimeState === "acting" ? "Acting" : "Active";

  const visibleChunks = [...session.chunks].slice(-6).reverse();

  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title={session.id ? `Session ${session.id.slice(0, 8)}` : "研究中文全双工模型"}
        subtitle="受监督任务空间 · 已接入 Runtime 快照"
        action={
          <div className="flex gap-2">
            <ToneBadge tone={stateTone}>{stateText}</ToneBadge>
            <ToneBadge tone="info">Read only</ToneBadge>
          </div>
        }
      />
      <div className="grid grid-cols-[260px_minmax(480px,1fr)_320px] gap-4">
        <Card variant="default" padding="md">
          <h2 className="text-[13px] font-semibold text-slate-900">任务步骤</h2>
          <div className="mt-4 space-y-0">
            {graph.nodes.map((node, index) => {
              const isLast = index === graph.nodes.length - 1;
              const state =
                node.status === "completed"
                  ? "done"
                  : node.status === "active" || node.id === graph.current_node_id
                    ? "current"
                    : "next";
              return (
                <div key={node.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />}
                  <span
                    className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] shadow-sm ${
                      state === "done"
                        ? "border-brand-500 bg-brand-500 text-white"
                        : state === "current"
                          ? "border-blue-400 bg-blue-50 text-blue-600"
                          : "border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    {state === "done" ? <CheckIcon width={12} height={12} /> : index + 1}
                  </span>
                  <div>
                    <p className={`text-[12px] font-medium ${state === "next" ? "text-slate-400" : "text-slate-700"}`}>{node.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {state === "done" ? "完成" : state === "current" ? "进行中" : "等待"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => void pauseSession()} disabled={busy} className="gap-1.5">
              <PauseIcon /> 暂停
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void cancelSession()} disabled={busy} className="gap-1.5">
              <CloseIcon width={14} height={14} /> 取消
            </Button>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 shadow-sm">
            <GlobeIcon width={16} height={16} className="text-slate-400" />
            <span className="flex-1 text-[12px] text-slate-600">{browser.title || "中文全双工语音模型 本地运行"}</span>
            <ToneBadge tone="info">BrowserView A</ToneBadge>
          </div>
          {browser.nextAction?.actionType && (
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 shadow-inner">
              <p className="text-[12px] font-semibold text-slate-800">下一步动作</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-sm" />
                <span className="text-[11.5px] font-medium text-slate-700">
                  {browser.nextAction.actionType} · {browser.nextAction.targetLabel}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{browser.nextAction.reason}</p>
              <p className="mt-1 text-[10px] text-slate-400">风险等级：{browser.nextAction.riskLevel}</p>
            </div>
          )}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 shadow-sm">
              <ShieldIcon width={14} height={14} className="text-amber-600" />
              <span className="text-[10.5px] text-slate-600">高风险动作需确认</span>
            </div>
            <Button variant="primary" size="default" className="w-full gap-2" onClick={() => void executeRuntimeAction()} disabled={busy}>
              <HandIcon width={14} height={14} /> 接管并执行
            </Button>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <h2 className="text-[13px] font-semibold text-slate-900">Event 记录</h2>
          <List className="mt-4 space-y-2">
            {visibleChunks.length === 0 && (
              <p className="text-[11px] text-slate-400">暂无事件，在对话中发送第一条消息后将出现记录。</p>
            )}
            {visibleChunks.map((chunk) => (
              <ListRow
                key={chunk.id}
                title={typeLabels[chunk.type] || chunk.type}
                description={chunk.summary}
                trailing={<span className="text-[10px] text-slate-400">{new Date(chunk.created_at).toLocaleTimeString()}</span>}
              />
            ))}
          </List>
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
