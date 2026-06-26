export type ActionNamespace =
  | "pointer"
  | "keyboard"
  | "clipboard"
  | "window"
  | "tab"
  | "text"
  | "form"
  | "overlay";

export type ActionName =
  | "pointer.move"
  | "pointer.click"
  | "pointer.scroll"
  | "keyboard.type"
  | "keyboard.press"
  | "keyboard.shortcut"
  | "clipboard.copy"
  | "clipboard.paste"
  | "clipboard.write"
  | "tab.open"
  | "tab.switch"
  | "window.close"
  | "text.input"
  | "form.fill"
  | "form.submit"
  | "overlay.label";

export type SafetyLevel = "safe" | "confirmation_required" | "blocked";
export type ProposalType = "atomic" | "sequence" | "compound";
export type VisibilityMode = "visible_system" | "visible_virtual" | "silent";
export type TargetView = "system" | `browser_view_${string}`;

export interface ActionTarget {
  ref: string;
  description: string;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface AtomicAction {
  action: ActionName;
  target?: ActionTarget;
  params?: Record<string, string | number | boolean | string[]>;
}

export interface ActionProposal {
  proposal_id: string;
  type: ProposalType;
  visibility: VisibilityMode;
  target_view: TargetView;
  actions: AtomicAction[];
  safety: SafetyLevel;
  expected_result: string;
  rollback?: AtomicAction[];
  confidence?: number;
}

export interface ActionResult {
  action: AtomicAction;
  ok: boolean;
  message: string;
  virtual_state?: Record<string, unknown>;
}

export interface TargetCandidate {
  ref: string;
  label: string;
  description: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
