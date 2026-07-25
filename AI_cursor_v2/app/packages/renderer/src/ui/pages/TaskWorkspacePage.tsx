import { useEffect, useRef, useState } from "react";
import { PageHeader, ToneBadge } from "../UiPrimitives.js";
import {
  BrainIcon,
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  HandIcon,
  PauseIcon,
  SearchIcon,
  ShieldIcon
} from "../icons.js";
import { Button, Card, List, ListRow } from "../../design-system/index.js";
import { useDesktopRuntime } from "../../runtime/useDesktopRuntime.js";
import { FeatureSection } from "../../app/feature-status.js";

const typeLabels: Record<string, string> = {
  user: "用户",
  model: "AI",
  proposal: "提案",
  action_result: "结果",
  safety: "安全",
  state: "状态",
  conclusion: "结论"
};

export function TaskWorkspacePage() {
  const desktop = useDesktopRuntime();
  const { snapshot, busy, pauseSession, cancelSession, startResearch, executeRuntimeAction, finalizeResearch, browserOpen, browserSearch, browserPause, browserClose, browserSetBounds } = desktop;
  const { runtimeState, session, graph, browser } = snapshot;

  const [goal, setGoal] = useState("");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const browserContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = browserContainerRef.current;
    if (!el) return;

    const report = () => {
      const rect = el.getBoundingClientRect();
      void browserSetBounds({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    };

    report();
    window.addEventListener("resize", report);
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => {
      window.removeEventListener("resize", report);
      observer.disconnect();
    };
  }, [browserSetBounds]);

  const stateTone = runtimeState === "interrupted" ? "danger" : runtimeState === "paused" ? "warning" : runtimeState === "complete" ? "info" : "brand";
  const stateText =
    runtimeState === "paused" ? "Paused" : runtimeState === "interrupted" ? "Interrupted" : runtimeState === "acting" ? "Acting" : runtimeState === "complete" ? "Done" : "Active";

  const visibleChunks = [...session.chunks].slice(-6).reverse();
  const conclusion = [...session.chunks].reverse().find((chunk) => chunk.type === "conclusion")?.summary;

  return (
    <FeatureSection id="ui.task" title="任务空间" className="h-full">
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
          <Card variant="default" padding="md" className="flex flex-col gap-4">
            <h2 className="text-[13px] font-semibold text-slate-900">研究目标</h2>
            <textarea
              className="min-h-[80px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="语音或输入研究目标，例如：帮我查太阳系有几颗行星"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <Button variant="primary" size="sm" className="w-full" disabled={busy} onClick={() => void startResearch(goal)}>
              <SearchIcon width={14} height={14} /> 开始研究
            </Button>

            <h2 className="mt-2 text-[13px] font-semibold text-slate-900">任务步骤</h2>
            <div className="mt-0 space-y-0">
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
            <div className="mt-auto grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => void pauseSession()} disabled={busy} className="gap-1.5">
                <PauseIcon /> 暂停
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void cancelSession()} disabled={busy} className="gap-1.5">
                <CloseIcon width={14} height={14} /> 取消
              </Button>
            </div>
          </Card>

          <Card variant="default" padding="md" className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 shadow-sm">
              <GlobeIcon width={16} height={16} className="text-slate-400" />
              <span className="flex-1 truncate text-[12px] text-slate-600">{browser.title || "BrowserView"}</span>
              <ToneBadge tone="info">BrowserView A</ToneBadge>
              {browser.loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />}
            </div>

            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="输入搜索词"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void browserSearch(query)}
              />
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void browserSearch(query)}>
                <SearchIcon width={14} height={14} />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void browserOpen(url)}
              />
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void browserOpen(url)}>
                打开
              </Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void browserPause()}>
                <PauseIcon width={14} height={14} />
              </Button>
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => void browserClose()}>
                <CloseIcon width={14} height={14} />
              </Button>
            </div>

            <div ref={browserContainerRef} className="relative min-h-[320px] flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
              {!browser.url && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <GlobeIcon width={32} height={32} />
                  <p className="text-[12px]">浏览器容器 · 搜索或输入 URL 后可见页面</p>
                  {browser.error && <p className="text-[11px] text-red-500">{browser.error}</p>}
                </div>
              )}
            </div>

            {browser.url && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
                <span className="font-medium">URL:</span> <span data-testid="browser-url">{browser.url}</span>
              </div>
            )}

            {browser.nextAction?.actionType && (
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 shadow-inner">
                <p className="text-[12px] font-semibold text-slate-800">下一步动作</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-sm" />
                  <span data-testid="next-action-type" className="text-[11.5px] font-medium text-slate-700">
                    {browser.nextAction.actionType} · {browser.nextAction.targetLabel}
                  </span>
                </div>
                {browser.nextAction.value && (
                  <p data-testid="next-action-value" className="mt-1 text-[10px] text-slate-500">
                    参数：{browser.nextAction.value}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-slate-400">{browser.nextAction.reason}</p>
                <p className="mt-1 text-[10px] text-slate-400">风险等级：{browser.nextAction.riskLevel}</p>
              </div>
            )}
            {browser.lastResult && (
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 shadow-inner">
                <p className="text-[12px] font-semibold text-slate-800">读取结果</p>
                <p data-testid="last-result-message" className="mt-1 text-[11px] text-slate-600">{browser.lastResult.message}</p>
                {browser.lastResult.virtual_state && typeof browser.lastResult.virtual_state.text === "string" && (
                  <p className="mt-2 max-h-40 overflow-auto rounded-lg bg-white p-2 text-[10px] text-slate-500">
                    {browser.lastResult.virtual_state.text}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 shadow-sm">
                <ShieldIcon width={14} height={14} className="text-amber-600" />
                <span className="text-[10.5px] text-slate-600">高风险动作需确认</span>
              </div>
              <Button variant="primary" size="default" className="w-full gap-2" onClick={() => void executeRuntimeAction()} disabled={busy}>
                <HandIcon width={14} height={14} /> 接管并执行
              </Button>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => void finalizeResearch()} disabled={busy || browser.sources.length === 0}>
                生成结论（引用 {browser.sources.length} 个来源）
              </Button>
            </div>
          </Card>

          <Card variant="default" padding="md" className="flex flex-col">
            <h2 className="text-[13px] font-semibold text-slate-900">Event 记录</h2>
            <List className="mt-4 flex-1 space-y-2 overflow-auto">
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
            {browser.sources.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[12px] font-semibold text-slate-800">来源</p>
                <List className="mt-2 space-y-2">
                  {browser.sources.map((source) => (
                    <ListRow
                      key={source.id}
                      data-testid="source-link"
                      data-url={source.url}
                      title={source.title || source.url}
                      description={source.excerpt.slice(0, 80)}
                      onClick={() => void browserOpen(source.url)}
                      trailing={<span className="text-[10px] text-slate-400">{source.id}</span>}
                    />
                  ))}
                </List>
              </div>
            )}
            {conclusion && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[12px] font-semibold text-slate-800">研究结论</p>
                <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{conclusion}</p>
              </div>
            )}
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
    </FeatureSection>
  );
}
