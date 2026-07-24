import { useState } from "react";
import { DemoBadge, EmptyState, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { CheckIcon, FileIcon, GlobeIcon, ListIcon, MailIcon, NodesIcon, TableIcon } from "../icons.js";
import { Button, Card, Badge } from "../../design-system/index.js";

const sessions = [
  { id: "A-024", title: "研究中文全双工模型", type: "研究", time: "今天 14:32", state: "进行中", tone: "info" },
  { id: "A-023", title: "整理客户反馈与回复草稿", type: "邮件", time: "今天 11:08", state: "已完成", tone: "brand" },
  { id: "A-022", title: "比较供应商方案", type: "网页", time: "昨天 16:45", state: "已完成", tone: "brand" },
  { id: "A-021", title: "财务报告下载", type: "文件", time: "昨天 09:15", state: "已取消", tone: "neutral" }
] as const;

const typeIcons = { 研究: NodesIcon, 邮件: MailIcon, 网页: GlobeIcon, 文件: FileIcon };

export function SessionsPage() {
  const [selected, setSelected] = useState("A-024");
  const current = sessions.find((session) => session.id === selected);

  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title="Session 记录"
        subtitle="Session 是可审计的目标、计划、动作、Evidence 与恢复锚点，不是普通聊天记录。"
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
            {sessions.map((session) => {
              const Icon = typeIcons[session.type];
              const active = session.id === selected;
              return (
                <button
                  key={session.id}
                  onClick={() => setSelected(session.id)}
                  className={`grid w-full grid-cols-[42px_1fr_110px_100px] items-center gap-3 px-4 py-4 text-left transition-colors ${
                    active ? "bg-brand-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 shadow-sm">
                    <Icon width={18} height={18} />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-slate-800">{session.title}</span>
                    <span className="mt-1 block text-[10.5px] text-slate-400">Session #{session.id} · {session.type}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{session.time}</span>
                  <ToneBadge tone={session.tone}>{session.state}</ToneBadge>
                </button>
              );
            })}
          </div>
        </Card>

        <Card variant="default" padding="lg" className="h-fit">
          {current ? (
            <>
              <div className="flex items-center justify-between">
                <ToneBadge tone={current.tone}>{current.state}</ToneBadge>
                <span className="text-[10px] text-slate-400">#{current.id}</span>
              </div>
              <h2 className="mt-4 text-[15px] font-semibold text-slate-900">{current.title}</h2>
              <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
                该详情为 UI 示例。真实 Session 接入后将显示来源、风险决策、动作结果与可验证 Evidence。
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
