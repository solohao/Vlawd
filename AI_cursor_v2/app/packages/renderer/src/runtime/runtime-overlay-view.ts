import type { ActionProposal, ConversationEndpointRoute, ModelRuntimeState, SafetyLevel, TargetCandidate } from "@ai-cursor-v2/shared";
import type { AiCursorTheme, AiEmployeeAvatarAsset, RuntimeStateToken } from "../brand/ai-employee.js";
import { runtimeStateToken, selectAiEmployeeAvatar } from "../brand/ai-employee.js";
import type { SessionDrawerViewModel } from "./session-graph-view.js";
import { createBudgetFormSessionGraph, toSessionGraphDrawer } from "./session-graph-view.js";

export type RuntimeOverlayDensity = "capsule" | "action_card" | "expanded";
export type RuntimeControlAction = "pause" | "cancel" | "take_over" | "confirm" | "edit_instruction";

export interface VoiceRuntimeCapsuleViewModel {
  type: "voice_capsule";
  density: RuntimeOverlayDensity;
  theme: AiCursorTheme;
  avatar: AiEmployeeAvatarAsset;
  state: RuntimeStateToken;
  endpointLabel: string;
  safetyLabel: "Safety Engine 已开启";
  controls: RuntimeControlAction[];
}

export interface ActionOverlayCardViewModel {
  type: "action_overlay";
  density: RuntimeOverlayDensity;
  theme: AiCursorTheme;
  avatar: AiEmployeeAvatarAsset;
  state: RuntimeStateToken;
  proposalId: string;
  title: string;
  actionTypeLabel: string;
  targetLabel: string;
  valuePreview?: string;
  reason: string;
  risk: {
    level: SafetyLevel;
    label: "低风险" | "需要确认" | "已阻止";
    autoExecuteAllowed: boolean;
  };
  targetHighlight: TargetCandidate;
  controls: RuntimeControlAction[];
  sessionDrawer: SessionDrawerViewModel;
}

export interface RuntimeActionOverlayInput {
  theme: AiCursorTheme;
  state: ModelRuntimeState;
  endpointRoute: ConversationEndpointRoute;
  proposal: ActionProposal;
  target: TargetCandidate;
  valuePreview?: string;
  reason: string;
  drawerMode?: "compact_path" | "graph";
}

export function createVoiceRuntimeCapsule(input: {
  theme: AiCursorTheme;
  state: ModelRuntimeState;
  endpointRoute: ConversationEndpointRoute;
}): VoiceRuntimeCapsuleViewModel {
  return {
    type: "voice_capsule",
    density: "capsule",
    theme: input.theme,
    avatar: selectAiEmployeeAvatar(input.theme, true),
    state: runtimeStateToken(input.state),
    endpointLabel: `${input.endpointRoute.config.input.label} → ${input.endpointRoute.config.output.label}`,
    safetyLabel: "Safety Engine 已开启",
    controls: ["pause", "cancel", "take_over"]
  };
}

export function createRuntimeActionOverlay(input: RuntimeActionOverlayInput): ActionOverlayCardViewModel {
  const firstAction = input.proposal.actions[0];
  const risk = toRiskDescriptor(input.proposal.safety);

  return {
    type: "action_overlay",
    density: risk.autoExecuteAllowed ? "action_card" : "expanded",
    theme: input.theme,
    avatar: selectAiEmployeeAvatar(input.theme, true),
    state: runtimeStateToken(input.state),
    proposalId: input.proposal.proposal_id,
    title: risk.autoExecuteAllowed ? "下一步动作" : "等待用户确认",
    actionTypeLabel: firstAction?.action ?? "unknown",
    targetLabel: input.target.label,
    valuePreview: input.valuePreview,
    reason: input.reason,
    risk,
    targetHighlight: input.target,
    controls: risk.autoExecuteAllowed ? ["confirm", "cancel", "edit_instruction"] : ["confirm", "cancel", "edit_instruction", "take_over"],
    sessionDrawer: toSessionGraphDrawer(createBudgetFormSessionGraph(), input.drawerMode ?? "compact_path")
  };
}

export function createBudgetFormActionProposal(): ActionProposal {
  return {
    proposal_id: "proposal-fill-budget-cell",
    type: "atomic",
    visibility: "visible_system",
    target_view: "system",
    actions: [
      {
        action: "form.fill",
        target: {
          ref: "feishu-doc-budget-cell",
          description: "预算预估（元）单元格",
          coordinates: { x: 562, y: 710 }
        },
        params: {
          value: "8,500"
        }
      }
    ],
    safety: "safe",
    expected_result: "将预算预估单元格填写为 8,500 元",
    confidence: 0.92
  };
}

export function createBudgetFormTargetCandidate(): TargetCandidate {
  return {
    ref: "feishu-doc-budget-cell",
    label: "预算预估（元）",
    description: "飞书文档中的出差预算申请表单元格",
    bounds: {
      x: 265,
      y: 613,
      width: 522,
      height: 52
    }
  };
}

function toRiskDescriptor(level: SafetyLevel): ActionOverlayCardViewModel["risk"] {
  if (level === "confirmation_required") {
    return {
      level,
      label: "需要确认",
      autoExecuteAllowed: false
    };
  }
  if (level === "blocked") {
    return {
      level,
      label: "已阻止",
      autoExecuteAllowed: false
    };
  }
  return {
    level,
    label: "低风险",
    autoExecuteAllowed: true
  };
}
