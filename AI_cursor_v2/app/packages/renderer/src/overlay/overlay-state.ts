import type { ModelRuntimeState, TargetCandidate } from "@ai-cursor-v2/shared";

export interface OverlayState {
  modelState: ModelRuntimeState;
  labels: TargetCandidate[];
  confirmation?: {
    proposalId: string;
    expectedResult: string;
  };
}

export function createOverlayState(): OverlayState {
  return {
    modelState: "listening",
    labels: []
  };
}

export function showConfirmation(state: OverlayState, proposalId: string, expectedResult: string): OverlayState {
  return {
    ...state,
    modelState: "waiting_confirm",
    confirmation: {
      proposalId,
      expectedResult
    }
  };
}
