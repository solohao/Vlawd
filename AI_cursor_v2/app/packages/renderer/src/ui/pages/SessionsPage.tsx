import { useEffect, useRef, useState } from "react";
import { DemoBadge, EmptyState, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { CheckIcon, FileIcon, GlobeIcon, ListIcon, MailIcon, NodesIcon } from "../icons.js";
import { Button, Card } from "../../design-system/index.js";
import { useDesktopRuntime } from "../../runtime/useDesktopRuntime.js";
import { useMarkFeature } from "../../app/feature-status.js";

const typeIcons = { 研究: NodesIcon, 邮件: MailIcon, 网页: GlobeIcon, 文件: FileIcon };

const typeLabels: Record<string, string> = {
  user: "用户",
  model: "AI",
  proposal: "提案",
  action_result: "结果",
  safety: "安全",
  state: "状态"
};

export function SessionsPage() {
  const desktop = useDesktopRuntime();
  const mark = useMarkFeature();
  const markedRef = useRef(false);
  const { snapshot } = desktop;
  const { session } = snapshot;

  useEffect(() => {
    if (session.chunks.length > 0 && !markedRef.current) {
      markedRef.current = true;
      mark("ui.sessions", "done");
    }
  }, [session.chunks.length, mark]);

  const [selected, setSelected] = useState<string | null>(null);
  const currentChunk = session.chunks.find((chunk) => chunk.id === selected);

  const listItems = session.chunks.slice().reverse();

  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title="Session 记录"
        subtitle="Session 是可审计的目标、计划、动作、Evidence 与恢复锚点。"
        action={<DemoBadge />}
      />
      <div className="grid grid-cols-[minmax(520px,1fr)_320px] gap-5">
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            {["全部", "进行中", "已完成", "已取消"].map((filter, index) => (
              <Button
                key={filter}
                variant={index === 0 ? "brandGhost" : "ghost"}
                size="sm"
                className={index === 0 ? "bg-brand-50 font-semibold" : ""}
              >
                {filter}
              </Button>
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {listItems.length === 0 && (
              <p className="px-4 py-8 text-center text-[12px] text-slate-400">暂无记录，开始在对话中说话或发送文本后会出现。</p>
            )}
            {listItems.map((chunk) => {
              const Icon = typeIcons[chunk.type as keyof typeof typeIcons] ?? FileIcon;
              const active = selected === chunk.id;
              return (
                <button
                  key={chunk.id}
                  onClick={() => setSelected(chunk.id)}
                  className={`grid w-full grid-cols-[42px_1fr_110px] items-center gap-3 px-4 py-4 text-left transition-colors ${
                    active ? "bg-brand-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 shadow-sm">
                    <Icon width={18} height={18} />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-slate-800">{chunk.summary}</span>
                    <span className="mt-1 block text-[10.5px] text-slate-400">{typeLabels[chunk.type] || chunk.type} · #{chunk.id.slice(0, 8)}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{new Date(chunk.created_at).toLocaleTimeString()}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card variant="default" padding="lg" className="h-fit">
          {currentChunk ? (
            <>
              <div className="flex items-center justify-between">
                <ToneBadge tone="brand">{typeLabels[currentChunk.type] || currentChunk.type}</ToneBadge>
                <span className="text-[10px] text-slate-400">#{currentChunk.id.slice(0, 8)}</span>
              </div>
              <h2 className="mt-4 text-[15px] font-semibold text-slate-900">{currentChunk.summary}</h2>
              <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
                {JSON.stringify(currentChunk.payload, null, 2)}
              </p>
              <div className="mt-5 space-y-3">
                {["目标与约束", "计划与纠正", "动作与结果", "Evidence Summary"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 shadow-sm">
                    <span className={`grid h-7 w-7 place-items-center rounded-full shadow-sm ${index < 2 ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-500"}`}>
                      {index < 2 ? <CheckIcon width={13} height={13} /> : index + 1}
                    </span>
                    <span className="text-[12px] font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
              <Button variant="default" size="default" className="mt-5 w-full gap-2">
                <NodesIcon width={15} height={15} /> 打开 Session Graph
              </Button>
            </>
          ) : (
            <EmptyState icon={<ListIcon />} title="选择 Session" description="选择一条记录查看详情。" />
          )}
        </Card>
      </div>
    </div>
  );
}
