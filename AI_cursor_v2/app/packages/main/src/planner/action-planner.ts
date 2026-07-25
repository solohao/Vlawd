import type { ActionName, ActionProposal, AtomicAction } from "@ai-cursor-v2/shared";
import type { LlmAdapter, LlmMessage } from "../model/llm-adapter.js";
import { validateProposal } from "./action-validator.js";

export interface ActionPlannerOptions {
  llm: LlmAdapter;
}

const SYSTEM_PROMPT = [
  "你是 Vlawd 的研究任务规划器。",
  "你只允许输出只读浏览器动作，用于帮用户查找和阅读公开信息。",
  "允许的动作：",
  "- browser.search: 用默认搜索引擎搜索；参数 { query: string }",
  "- browser.open: 打开具体 URL；参数 { url: string }",
  "- browser.scroll: 向下滚动页面；参数 { distance?: number }",
  "- browser.read: 读取当前页面可见文本；参数 {}（通常在搜索/打开后执行）",
  "禁止的动作包括：form.fill、form.submit、pointer.click、keyboard.type、clipboard.write、window.close、下载文件等任何会修改系统或网页、购买商品、发送消息、执行代码的行为。",
  "请严格以 JSON 输出，不要带 Markdown 代码块，格式如下：",
  JSON.stringify(
    {
      type: "sequence",
      visibility: "visible_virtual",
      target_view: "browser_view_main",
      actions: [
        { action: "browser.search", params: { query: "用户的研究目标" } },
        { action: "browser.read", params: {} }
      ],
      expected_result: "搜索并阅读网页，返回关键事实"
    },
    null,
    2
  ),
  "如果目标无法被允许的动作完成，请把 safety 设为 blocked 并给出 reason；否则 safety 必须 safe。",
  "请确保 JSON 可被 `JSON.parse` 直接解析。"
].join("\n");

export class ActionPlanner {
  private readonly llm: LlmAdapter;

  constructor(options: ActionPlannerOptions) {
    this.llm = options.llm;
  }

  async plan(goal: string, signal?: AbortSignal): Promise<ActionProposal> {
    const messages: LlmMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `研究目标：${goal}` }
    ];

    let raw = "";
    try {
      raw = await this.llm.complete(messages, signal);
    } catch (error) {
      return blockedProposal(error instanceof Error ? error.message : String(error));
    }

    const proposal = parseProposal(raw, goal);
    return validateProposal(proposal);
  }
}

function blockedProposal(reason: string): ActionProposal {
  return {
    proposal_id: `planner_${Date.now()}`,
    type: "sequence",
    visibility: "visible_virtual",
    target_view: "browser_view_main",
    actions: [],
    safety: "blocked",
    expected_result: reason,
    confidence: 0
  };
}

function parseProposal(raw: string, goal: string): ActionProposal {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  let parsed: Partial<ActionProposal>;
  try {
    parsed = JSON.parse(cleaned) as Partial<ActionProposal>;
  } catch {
    return fallbackSearchProposal(goal);
  }

  const actions: AtomicAction[] = Array.isArray(parsed.actions)
    ? parsed.actions.filter(
        (a: unknown): a is AtomicAction =>
          typeof a === "object" && a !== null && "action" in a && typeof (a as AtomicAction).action === "string"
      )
    : [];

  return {
    proposal_id: `planner_${Date.now()}`,
    type: parsed.type ?? "sequence",
    visibility: parsed.visibility ?? "visible_virtual",
    target_view: parsed.target_view ?? "browser_view_main",
    actions,
    safety: parsed.safety ?? "blocked",
    expected_result: parsed.expected_result ?? "",
    rollback: parsed.rollback,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8
  };
}

function fallbackSearchProposal(goal: string): ActionProposal {
  return {
    proposal_id: `fallback_${Date.now()}`,
    type: "sequence",
    visibility: "visible_virtual",
    target_view: "browser_view_main",
    actions: [
      { action: "browser.search" as ActionName, params: { query: goal } },
      { action: "browser.read" as ActionName, params: {} }
    ],
    safety: "safe",
    expected_result: `搜索 "${goal}" 并读取页面可见文本`,
    confidence: 0.7
  };
}
