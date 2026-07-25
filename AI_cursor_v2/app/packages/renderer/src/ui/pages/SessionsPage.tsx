import { useEffect, useState } from "react";
import { EmptyState, PageHeader } from "../UiPrimitives.js";
import { FileIcon, GlobeIcon, NodesIcon, TrashIcon } from "../icons.js";
import { Button, Card, List, ListRow } from "../../design-system/index.js";
import { useDesktopRuntime } from "../../runtime/useDesktopRuntime.js";
import { FeatureSection } from "../../app/feature-status.js";
import type { SessionSummary } from "@ai-cursor-v2/shared";

interface SessionsPageProps {
  onOpenTask?: () => void;
}

export function SessionsPage({ onOpenTask }: SessionsPageProps) {
  const desktop = useDesktopRuntime();
  const { listSessions, loadSession, deleteSession, snapshot } = desktop;
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const items = await listSessions();
      setSessions(items);
    } catch {
      setSessions([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleLoad = async (id: string) => {
    setLoading(true);
    try {
      await loadSession(id);
      onOpenTask?.();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSelected((prev) => (prev?.id === id ? null : prev));
    void refresh();
  };

  return (
    <FeatureSection id="ui.sessions" title="Session 记录" className="h-full">
      <div className="min-h-full px-8 py-7">
        <PageHeader
          title="Session 记录"
          subtitle="保存的研究会话、来源与结论可恢复并继续探索。"
          action={
            <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
              刷新
            </Button>
          }
        />
        <div className="grid grid-cols-[minmax(520px,1fr)_320px] gap-5">
          <Card variant="default" padding="none" className="overflow-hidden">
            <List className="divide-y divide-slate-100">
              {sessions.length === 0 && (
                <EmptyState
                  icon={<FileIcon />}
                  title="暂无保存的会话"
                  description="在任务空间完成研究后点击「保存会话」，这里会出现可恢复的记录。"
                />
              )}
              {sessions.map((session) => (
                <ListRow
                  key={session.id}
                  title={session.title || session.goal || "未命名研究任务"}
                  description={session.goal || `${session.sourceCount} 个来源 · ${new Date(session.updated_at).toLocaleString()}`}
                  trailing={
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{new Date(session.updated_at).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(session.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                        title="删除"
                      >
                        <TrashIcon width={14} height={14} />
                      </button>
                    </div>
                  }
                  onClick={() => setSelected(session)}
                />
              ))}
            </List>
          </Card>

          <Card variant="default" padding="lg" className="h-fit">
            {selected ? (
              <>
                <div className="flex items-center gap-2 text-slate-500">
                  <GlobeIcon width={16} height={16} />
                  <span className="text-[11px]">#{selected.id.slice(0, 8)}</span>
                </div>
                <h2 className="mt-3 text-[15px] font-semibold text-slate-900">{selected.title || selected.goal || "未命名研究任务"}</h2>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {selected.goal || `包含 ${selected.sourceCount} 个来源`}
                </p>
                <div className="mt-5 space-y-2">
                  <Button variant="primary" size="default" className="w-full gap-2" onClick={() => void handleLoad(selected.id)} disabled={loading}>
                    <NodesIcon width={15} height={15} /> 恢复并继续研究
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => void handleDelete(selected.id)} disabled={loading}>
                    删除会话
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState icon={<FileIcon />} title="选择 Session" description="选择左侧会话查看详情并恢复研究。" />
            )}
          </Card>
        </div>
      </div>
    </FeatureSection>
  );
}
