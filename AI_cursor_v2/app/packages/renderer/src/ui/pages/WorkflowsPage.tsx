import { DemoBadge, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { ArrowRight, MailIcon, PlusIcon, ShieldIcon, TableIcon, WorkflowIcon } from "../icons.js";
import { Button, Card, Badge } from "../../design-system/index.js";
import { FeatureSection } from "../../app/feature-status.js";

const workflows = [
  { title: "市场调研助手", description: "检索来源、提取 Evidence、生成带引用摘要。", icon: WorkflowIcon, state: "草稿" },
  { title: "邮件处理助手", description: "分类邮件、提取行动项并生成回复草稿。", icon: MailIcon, state: "可用" },
  { title: "表单填写助手", description: "从结构化数据准备表单内容，高风险提交需确认。", icon: TableIcon, state: "规划中" }
];

export function WorkflowsPage() {
  return (
    <FeatureSection id="ui.workflows" title="工作流库" className="h-full">
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title="工作流库"
        subtitle="从验证过的 Session 提炼可复用步骤；当前只实现前端骨架。"
        action={
          <div className="flex items-center gap-3">
            <DemoBadge />
            <Button variant="default" size="default" className="gap-2">
              <PlusIcon width={15} height={15} /> 新建工作流
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-4">
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          return (
            <Card key={workflow.title} variant="default" padding="lg" hoverable animated>
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm">
                  <Icon width={20} height={20} />
                </span>
                <ToneBadge tone={workflow.state === "可用" ? "brand" : "neutral"}>{workflow.state}</ToneBadge>
              </div>
              <h2 className="mt-5 text-[14px] font-semibold text-slate-900">{workflow.title}</h2>
              <p className="mt-2 min-h-10 text-[11.5px] leading-relaxed text-slate-500">{workflow.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
                  <ShieldIcon width={13} height={13} /> 受监督执行
                </span>
                <Button variant="link" size="sm" className="gap-1 p-0">
                  查看编辑器 <ArrowRight width={13} height={13} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card variant="default" padding="lg" className="mt-5">
        <h2 className="text-[14px] font-semibold text-slate-900">工作流编辑器预览</h2>
        <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 p-8">
          {["输入目标", "读取来源", "提取 Evidence", "等待确认", "生成结果"].map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                <p className="text-[10px] font-semibold text-brand-700">STEP {index + 1}</p>
                <p className="mt-1 text-[11.5px] font-medium text-slate-700">{step}</p>
              </div>
              {index < 4 && <ArrowRight className="text-slate-300" />}
            </div>
          ))}
        </div>
      </Card>
    </div>
    </FeatureSection>
  );
}
