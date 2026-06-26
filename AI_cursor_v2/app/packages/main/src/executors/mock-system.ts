import type { ActionProposal, ActionResult, AtomicAction } from "@ai-cursor-v2/shared";
import type { Executor } from "./types.js";

export interface VirtualSystemState {
  cursor: { x: number; y: number };
  typedText: string;
  clipboard: string;
  activeTab?: string;
  submittedForms: Array<Record<string, string>>;
  paused: boolean;
}

export class MockSystemExecutor implements Executor {
  readonly target_view = "system";
  readonly state: VirtualSystemState = {
    cursor: { x: 0, y: 0 },
    typedText: "",
    clipboard: "",
    submittedForms: [],
    paused: false
  };

  pause(): void {
    this.state.paused = true;
  }

  resume(): void {
    this.state.paused = false;
  }

  async execute(proposal: ActionProposal): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const action of proposal.actions) {
      if (this.state.paused) {
        results.push({
          action,
          ok: false,
          message: "Execution paused by safety preemption.",
          virtual_state: { ...this.state }
        });
        break;
      }
      results.push(this.executeAtomic(action));
    }
    return results;
  }

  private executeAtomic(action: AtomicAction): ActionResult {
    if (action.action === "pointer.move" || action.action === "pointer.click") {
      const coordinates = action.target?.coordinates;
      if (coordinates) {
        this.state.cursor = coordinates;
      }
    }

    if (action.action === "pointer.scroll") {
      this.state.typedText += `[scroll:${String(action.params?.direction ?? "down")}]`;
    }

    if (action.action === "keyboard.type" || action.action === "text.input") {
      this.state.typedText += String(action.params?.text ?? "");
    }

    if (action.action === "keyboard.press") {
      this.state.typedText += `[key:${String(action.params?.key ?? "")}]`;
    }

    if (action.action === "keyboard.shortcut") {
      this.state.typedText += `[shortcut:${String(action.params?.keys ?? "")}]`;
    }

    if (action.action === "clipboard.write") {
      this.state.clipboard = String(action.params?.content ?? "");
    }

    if (action.action === "clipboard.paste") {
      this.state.typedText += this.state.clipboard;
    }

    if (action.action === "tab.open") {
      this.state.activeTab = String(action.params?.url ?? "about:blank");
    }

    if (action.action === "form.fill") {
      const fields = action.params?.fields;
      if (Array.isArray(fields)) {
        this.state.submittedForms.push(Object.fromEntries(fields.map((field) => [String(field), "filled"])));
      }
    }

    return {
      action,
      ok: true,
      message: `${action.action} executed in virtual system.`,
      virtual_state: { ...this.state }
    };
  }
}
