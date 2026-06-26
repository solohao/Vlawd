import type { ActionProposal, ActionResult, TargetCandidate } from "@ai-cursor-v2/shared";
import type { Executor } from "./types.js";
import { MockSystemExecutor } from "./mock-system.js";

export interface BrowserScenarioState {
  query?: string;
  filters: string[];
  formFields: Record<string, string>;
  labels: TargetCandidate[];
}

export class VirtualBrowserViewExecutor implements Executor {
  readonly target_view: string;
  readonly system = new MockSystemExecutor();
  readonly state: BrowserScenarioState = {
    filters: [],
    formFields: {},
    labels: []
  };

  constructor(viewId = "browser_view_main") {
    this.target_view = viewId;
  }

  pause(): void {
    this.system.pause();
  }

  resume(): void {
    this.system.resume();
  }

  async execute(proposal: ActionProposal): Promise<ActionResult[]> {
    for (const action of proposal.actions) {
      if (action.action === "tab.open") {
        this.state.query = String(action.params?.url ?? "");
      }
      if (action.action === "form.fill" && action.params) {
        for (const [key, value] of Object.entries(action.params)) {
          if (typeof value === "string") {
            this.state.formFields[key] = value;
          }
        }
      }
      if (action.action === "overlay.label" && action.target) {
        this.state.labels.push({
          ref: action.target.ref,
          label: action.target.ref,
          description: action.target.description,
          bounds: { x: 0, y: 0, width: 120, height: 32 }
        });
      }
      if (action.action === "text.input") {
        this.state.filters.push(String(action.params?.text ?? ""));
      }
    }
    return this.system.execute(proposal);
  }
}
