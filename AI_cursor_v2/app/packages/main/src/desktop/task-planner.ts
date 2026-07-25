import type { LlmAdapter, LlmMessage } from "../model/llm-adapter.js";
import type { ActionName, ActionProposal, TaskPlan, TaskStep } from "@ai-cursor-v2/shared";
import { toolSchemasForPrompt } from "./agent-tools.js";

export interface TaskPlannerOptions {
  llm: LlmAdapter;
}

const SYSTEM_PROMPT = [
  "你是 Vlawd 的任务规划器。你会把用户的研究目标拆成只读浏览器步骤。",
  "你只能使用以下只读工具（name 必须完全匹配）：",
  toolSchemasForPrompt(),
  "",
  "请严格输出 JSON（无 Markdown 代码块），格式如下：",
  JSON.stringify(
    {
      plan: {
        goal: "用户目标",
        steps: [
          {
            id: "step-1",
            description: "用默认搜索引擎查找公开信息",
            tool: "browser.search",
            params: { query: "太阳系有几颗行星" },
            reason: "先获得候选网页",
            status: "pending"
          },
          {
            id: "step-2",
            description: "阅读搜索结果可见文本",
            tool: "browser.read",
            params: {},
            reason: "提取关键事实",
            status: "pending"
          }
        ]
      }
    },
    null,
    2
  ),
  "",
  "规则：",
  "- 只使用 `browser.search`、`browser.open`、`browser.scroll`、`browser.read`、`browser.find`。",
  "- 禁止 `form.fill`、`form.submit`、`pointer.click`、`keyboard.type`、`clipboard.write`、`window.close`、下载或执行文件。",
  "- 每个步骤的 tool 必须是上面注册的工具名。",
  "- 如果目标无法由只读步骤完成，返回空 steps 并在 plan.goal 中说明风险。"
].join("\n");

export class TaskPlanner {
  private readonly llm: LlmAdapter;

  constructor(options: TaskPlannerOptions) {
    this.llm = options.llm;
  }

  async plan(goal: string, signal?: AbortSignal): Promise<TaskPlan> {
    const messages: LlmMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `研究目标：${goal}` }
    ];

    let raw = "";
    try {
      raw = await this.llm.complete(messages, signal);
    } catch (error) {
      return fallbackPlan(goal, error instanceof Error ? error.message : String(error));
    }

    return parsePlan(raw, goal);
  }
}

function fallbackPlan(goal: string, reason: string): TaskPlan {
  return {
    goal,
    steps: [
      {
        id: "step-1",
        description: `搜索 "${goal}"`,
        tool: "browser.search",
        params: { query: goal },
        reason: `规划失败，回退到搜索：${reason}`,
        status: "pending"
      },
      {
        id: "step-2",
        description: "阅读搜索结果可见文本",
        tool: "browser.read",
        params: {},
        reason: "提取关键事实",
        status: "pending"
      }
    ]
  };
}

function parsePlan(raw: string, goal: string): TaskPlan {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return fallbackPlan(goal, "JSON parse failed");
  }

  if (typeof parsed !== "object" || parsed === null || !("plan" in parsed)) {
    return fallbackPlan(goal, "missing plan field");
  }

  const plan = (parsed as { plan: unknown }).plan;
  if (typeof plan !== "object" || plan === null) {
    return fallbackPlan(goal, "plan is not an object");
  }

  const planObj = plan as { goal?: unknown; steps?: unknown };
  const stepsRaw = Array.isArray(planObj.steps) ? planObj.steps : [];

  const steps: TaskStep[] = stepsRaw
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s, index) => ({
      id: typeof s.id === "string" ? s.id : `step-${index + 1}`,
      description: typeof s.description === "string" ? s.description : "",
      tool: typeof s.tool === "string" ? (s.tool as ActionName | "browser.find") : "browser.read",
      params: typeof s.params === "object" && s.params !== null ? (s.params as Record<string, unknown>) : {},
      reason: typeof s.reason === "string" ? s.reason : undefined,
      status: "pending" as const
    }));

  return {
    goal: typeof planObj.goal === "string" ? planObj.goal : goal,
    steps
  };
}

export function proposalFromPlan(plan: TaskPlan): ActionProposal | undefined {
  const pending = plan.steps.filter((s) => s.status === "pending");
  if (pending.length === 0) return undefined;

  const actions = pending
    .filter((step) => step.tool.startsWith("browser."))
    .map((step) => ({
      action: step.tool as ActionName,
      params: step.params as Record<string, string | number | boolean | string[]>
    }));

  if (actions.length === 0) return undefined;

  return {
    proposal_id: `task-${Date.now()}`,
    type: "sequence",
    visibility: "visible_virtual",
    target_view: "browser_view_main",
    actions,
    safety: "safe",
    expected_result: pending[0].description,
    confidence: 0.8
  };
}
