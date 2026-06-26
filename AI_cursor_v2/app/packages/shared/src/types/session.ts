import type { ActionProposal, ActionResult, SafetyLevel } from "./action.js";
import type { ModelRuntimeState } from "./model.js";

export type SessionStatus = "active" | "paused" | "completed" | "interrupted" | "failed";
export type SessionChunkType = "user" | "model" | "proposal" | "action_result" | "safety" | "state";

export interface SessionChunk {
  id: string;
  session_id: string;
  type: SessionChunkType;
  created_at: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface SessionRun {
  id: string;
  status: SessionStatus;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  chunks: SessionChunk[];
}

export interface SafetyDecision {
  level: SafetyLevel;
  reason: string;
  requires_user_confirmation: boolean;
}

export interface AgentTurnResult {
  session: SessionRun;
  proposals: ActionProposal[];
  action_results: ActionResult[];
  states: ModelRuntimeState[];
  paused_by_preemption: boolean;
}

export function createSession(id: string, parent_id?: string): SessionRun {
  const now = new Date().toISOString();
  return {
    id,
    parent_id,
    status: "active",
    created_at: now,
    updated_at: now,
    chunks: []
  };
}

export function appendChunk(session: SessionRun, chunk: Omit<SessionChunk, "session_id" | "created_at">): SessionRun {
  const nextChunk: SessionChunk = {
    ...chunk,
    session_id: session.id,
    created_at: new Date().toISOString()
  };
  return {
    ...session,
    updated_at: nextChunk.created_at,
    chunks: [...session.chunks, nextChunk]
  };
}
