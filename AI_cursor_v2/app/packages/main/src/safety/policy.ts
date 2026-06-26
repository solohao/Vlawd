import type { ActionProposal, AtomicAction, SafetyDecision } from "@ai-cursor-v2/shared";

const BLOCKED_ACTIONS = new Set<string>(["window.close"]);
const CONFIRMATION_ACTIONS = new Set<string>(["form.submit", "clipboard.write"]);

export function evaluateSafety(proposal: ActionProposal): SafetyDecision {
  if (proposal.safety === "blocked") {
    return {
      level: "blocked",
      reason: "Model marked this proposal as blocked.",
      requires_user_confirmation: false
    };
  }

  if (proposal.confidence !== undefined && proposal.confidence < 0.7) {
    return {
      level: "confirmation_required",
      reason: "Model confidence is below the execution threshold.",
      requires_user_confirmation: true
    };
  }

  const actionDecision = proposal.actions.map(evaluateAction).find((decision) => decision.level !== "safe");
  if (actionDecision) {
    return actionDecision;
  }

  if (proposal.safety === "confirmation_required") {
    return {
      level: "confirmation_required",
      reason: "Model requested user confirmation.",
      requires_user_confirmation: true
    };
  }

  return {
    level: "safe",
    reason: "All actions are safe for MVP execution.",
    requires_user_confirmation: false
  };
}

function evaluateAction(action: AtomicAction): SafetyDecision {
  if (BLOCKED_ACTIONS.has(action.action)) {
    return {
      level: "blocked",
      reason: `${action.action} is blocked in MVP.`,
      requires_user_confirmation: false
    };
  }

  if (CONFIRMATION_ACTIONS.has(action.action)) {
    return {
      level: "confirmation_required",
      reason: `${action.action} changes external state and requires confirmation.`,
      requires_user_confirmation: true
    };
  }

  return {
    level: "safe",
    reason: `${action.action} is safe.`,
    requires_user_confirmation: false
  };
}
