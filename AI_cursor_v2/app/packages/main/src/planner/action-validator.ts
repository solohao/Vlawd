import type { ActionName, ActionProposal, AtomicAction, SafetyLevel } from "@ai-cursor-v2/shared";

const ACTION_SAFETY: Record<ActionName, SafetyLevel> = {
  "pointer.move": "safe",
  "pointer.click": "confirmation_required",
  "pointer.scroll": "safe",
  "keyboard.type": "blocked",
  "keyboard.press": "blocked",
  "keyboard.shortcut": "blocked",
  "clipboard.copy": "safe",
  "clipboard.paste": "blocked",
  "clipboard.write": "blocked",
  "tab.open": "safe",
  "tab.switch": "safe",
  "browser.open": "safe",
  "browser.search": "safe",
  "browser.scroll": "safe",
  "browser.read": "safe",
  "window.close": "blocked",
  "text.input": "blocked",
  "form.fill": "blocked",
  "form.submit": "blocked",
  "overlay.label": "safe"
};

const READ_ONLY_WHITELIST: ActionName[] = [
  "tab.open",
  "tab.switch",
  "browser.search",
  "browser.scroll",
  "browser.read",
  "pointer.move",
  "pointer.scroll",
  "clipboard.copy",
  "overlay.label"
];

export interface ValidationResult {
  ok: boolean;
  proposal: ActionProposal;
  blockedActions: AtomicAction[];
}

export function validateProposal(proposal: ActionProposal): ActionProposal {
  const actions = proposal.actions ?? [];
  let maxLevel: SafetyLevel = "safe";
  const blockedActions: AtomicAction[] = [];

  for (const atomic of actions) {
    const action = atomic.action;
    const level = ACTION_SAFETY[action] ?? "blocked";
    if (level === "blocked" || !READ_ONLY_WHITELIST.includes(action)) {
      blockedActions.push(atomic);
      if (maxLevel !== "blocked") maxLevel = "blocked";
    } else if (level === "confirmation_required" && maxLevel === "safe") {
      maxLevel = "confirmation_required";
    }
  }

  const safety = maxLevel;
  const expected =
    safety === "blocked" && blockedActions.length > 0
      ? `检测到禁止动作：${blockedActions.map((a) => a.action).join(", ")}。已阻止执行。`
      : proposal.expected_result;

  return {
    ...proposal,
    actions: safety === "blocked" ? [] : actions,
    safety,
    expected_result: expected,
    confidence: safety === "blocked" ? 0 : proposal.confidence
  };
}
