import type { ActionProposal, ActionResult } from "@ai-cursor-v2/shared";

export interface Executor {
  readonly target_view: string;
  pause(): void;
  resume(): void;
  execute(proposal: ActionProposal): Promise<ActionResult[]>;
}
