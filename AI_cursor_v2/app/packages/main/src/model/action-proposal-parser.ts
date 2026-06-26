import type {
  ActionName,
  ActionTarget,
  ActionProposal,
  AtomicAction,
  ProposalType,
  SafetyLevel,
  TargetView,
  VisibilityMode
} from "@ai-cursor-v2/shared";

const ACTION_NAMES = new Set<ActionName>([
  "pointer.move",
  "pointer.click",
  "pointer.scroll",
  "keyboard.type",
  "keyboard.press",
  "keyboard.shortcut",
  "clipboard.copy",
  "clipboard.paste",
  "clipboard.write",
  "tab.open",
  "tab.switch",
  "window.close",
  "text.input",
  "form.fill",
  "form.submit",
  "overlay.label"
]);
const SAFETY_LEVELS = new Set<SafetyLevel>(["safe", "confirmation_required", "blocked"]);
const VISIBILITY_MODES = new Set<VisibilityMode>(["visible_system", "visible_virtual", "silent"]);
const PROPOSAL_TYPES = new Set<ProposalType>(["atomic", "sequence", "compound"]);

export function parseActionProposal(raw: string): ActionProposal {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error("ActionProposal must be a JSON object.");
  }
  if (typeof parsed.proposal_id !== "string") {
    throw new Error("ActionProposal.proposal_id must be a string.");
  }
  if (!PROPOSAL_TYPES.has(parsed.type as ProposalType)) {
    throw new Error("ActionProposal.type is invalid.");
  }
  if (typeof parsed.target_view !== "string") {
    throw new Error("ActionProposal.target_view must be a string.");
  }
  if (!VISIBILITY_MODES.has(parsed.visibility as VisibilityMode)) {
    throw new Error("ActionProposal.visibility is invalid.");
  }
  if (!SAFETY_LEVELS.has(parsed.safety as SafetyLevel)) {
    throw new Error("ActionProposal.safety is invalid.");
  }
  if (!Array.isArray(parsed.actions)) {
    throw new Error("ActionProposal.actions must be an array.");
  }
  if (typeof parsed.expected_result !== "string") {
    throw new Error("ActionProposal.expected_result must be a string.");
  }
  const actions = parsed.actions.map(parseAtomicAction);

  const proposal: ActionProposal = {
    proposal_id: parsed.proposal_id,
    type: parsed.type as ProposalType,
    visibility: parsed.visibility as VisibilityMode,
    target_view: parsed.target_view as TargetView,
    safety: parsed.safety as SafetyLevel,
    expected_result: parsed.expected_result,
    actions
  };

  if (Array.isArray(parsed.rollback)) {
    proposal.rollback = parsed.rollback.map(parseAtomicAction);
  }
  if (typeof parsed.confidence === "number") {
    proposal.confidence = parsed.confidence;
  }

  return proposal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAtomicAction(value: unknown): AtomicAction {
  if (!isRecord(value) || !ACTION_NAMES.has(value.action as ActionName)) {
    throw new Error("ActionProposal contains an unsupported action.");
  }
  if (value.params !== undefined && !isActionParams(value.params)) {
    throw new Error("ActionProposal action params are invalid.");
  }
  return {
    action: value.action as ActionName,
    target: parseActionTarget(value.target),
    params: value.params
  };
}

function parseActionTarget(value: unknown): ActionTarget | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value) || typeof value.ref !== "string" || typeof value.description !== "string") {
    throw new Error("ActionProposal action target is invalid.");
  }
  const target: ActionTarget = {
    ref: value.ref,
    description: value.description
  };
  if (isRecord(value.coordinates)) {
    if (typeof value.coordinates.x !== "number" || typeof value.coordinates.y !== "number") {
      throw new Error("ActionProposal action target coordinates are invalid.");
    }
    target.coordinates = { x: value.coordinates.x, y: value.coordinates.y };
  }
  return target;
}

function isActionParams(value: unknown): value is AtomicAction["params"] {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((entry) => {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      return true;
    }
    return Array.isArray(entry) && entry.every((item) => typeof item === "string");
  });
}
