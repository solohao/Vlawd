import type { SessionGraphNode, SessionGraphNodeStatus, SessionGraphSnapshot } from "@ai-cursor-v2/shared";

export type SessionDrawerMode = "compact_path" | "graph";

export interface SessionPathItem {
  id: string;
  label: string;
  status: SessionGraphNodeStatus;
  isCurrent: boolean;
}

export interface SessionGraphBranchLane {
  branchId: string;
  label: string;
  nodes: SessionGraphNode[];
}

export interface SessionDrawerViewModel {
  title: "Session Graph";
  mode: SessionDrawerMode;
  recording: boolean;
  currentStepLabel: string;
  path: SessionPathItem[];
  lanes: SessionGraphBranchLane[];
  actions: ("view_full_session" | "return_to_current_node" | "save_as_workflow")[];
}

export function toCompactSessionPath(snapshot: SessionGraphSnapshot): SessionPathItem[] {
  const currentIndex = snapshot.nodes.findIndex((node) => node.id === snapshot.current_node_id);
  const visibleStart = Math.max(currentIndex - 3, 0);
  const visibleEnd = currentIndex < 0 ? Math.min(snapshot.nodes.length, 4) : Math.min(snapshot.nodes.length, currentIndex + 2);

  return snapshot.nodes.slice(visibleStart, visibleEnd).map((node) => ({
    id: node.id,
    label: node.label,
    status: node.status,
    isCurrent: node.id === snapshot.current_node_id
  }));
}

export function toSessionGraphDrawer(snapshot: SessionGraphSnapshot, mode: SessionDrawerMode): SessionDrawerViewModel {
  const current = snapshot.nodes.find((node) => node.id === snapshot.current_node_id);

  return {
    title: "Session Graph",
    mode,
    recording: true,
    currentStepLabel: current?.label ?? "当前步骤未知",
    path: toCompactSessionPath(snapshot),
    lanes: groupNodesByBranch(snapshot.nodes),
    actions: ["view_full_session", "return_to_current_node", "save_as_workflow"]
  };
}

export function createBudgetFormSessionGraph(): SessionGraphSnapshot {
  return {
    session_id: "session-q2-market-research",
    current_node_id: "node-fill-budget",
    nodes: [
      {
        id: "node-user-goal",
        label: "用户指令：整理 Q2 市场调研与出差计划",
        type: "user_instruction",
        status: "completed",
        branch_id: "main"
      },
      {
        id: "node-form-plan",
        label: "AI 生成：出差预算申请表结构",
        type: "ai_plan",
        status: "completed",
        branch_id: "main"
      },
      {
        id: "node-budget-correction",
        label: "用户修正：预算标准为 8,500 元以内",
        type: "correction",
        status: "merged",
        branch_id: "correction-budget"
      },
      {
        id: "node-fill-budget",
        label: "AI 执行：填写预算预估单元格",
        type: "action",
        status: "active",
        branch_id: "main"
      },
      {
        id: "node-continue-form",
        label: "继续填写其他费用",
        type: "action",
        status: "waiting_confirmation",
        branch_id: "main"
      }
    ],
    edges: [
      { from: "node-user-goal", to: "node-form-plan", relation: "next" },
      { from: "node-form-plan", to: "node-budget-correction", relation: "fork" },
      { from: "node-budget-correction", to: "node-fill-budget", relation: "merge" },
      { from: "node-fill-budget", to: "node-continue-form", relation: "next" }
    ]
  };
}

function groupNodesByBranch(nodes: SessionGraphNode[]): SessionGraphBranchLane[] {
  const lanes: SessionGraphBranchLane[] = [];
  for (const node of nodes) {
    const existing = lanes.find((lane) => lane.branchId === node.branch_id);
    if (existing) {
      existing.nodes.push(node);
    } else {
      lanes.push({
        branchId: node.branch_id,
        label: branchLabel(node.branch_id),
        nodes: [node]
      });
    }
  }
  return lanes;
}

function branchLabel(branchId: string): string {
  if (branchId === "main") {
    return "主线任务";
  }
  if (branchId.startsWith("correction")) {
    return "用户纠正";
  }
  return branchId;
}
