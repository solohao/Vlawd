import type { ActionProposal, ActionResult, SafetyLevel } from "./action.js";
import type { ModelRuntimeState } from "./model.js";

export type SessionStatus = "active" | "paused" | "completed" | "interrupted" | "failed";
export type SessionChunkType =
  | "user"
  | "model"
  | "proposal"
  | "action_result"
  | "safety"
  | "state"
  | "conclusion"
  | "correction"
  | "todo"
  | "evidence"
  | "revalidation"
  | "branch";

export type SessionGraphNodeType =
  | "user_instruction"
  | "ai_plan"
  | "action"
  | "confirmation"
  | "correction"
  | "result"
  | "merge";
export type SessionGraphNodeStatus = "completed" | "active" | "waiting_confirmation" | "cancelled" | "merged";

export interface SessionChunk {
  id: string;
  session_id: string;
  type: SessionChunkType;
  created_at: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface SessionLineage {
  parent_id?: string;
  fork_from?: string;
  fork_reason?: string;
  merged_into?: string;
  branch_ids?: string[];
}

export interface ResumeAnchor {
  query?: string;
  active_constraints?: string[];
  last_successful_step?: string;
  required_permissions?: string[];
  last_verified_url?: string;
  last_verified_title?: string;
  last_verified_at?: string;
  expected_excerpt?: string;
}

export interface EvidenceSummary {
  goal?: string;
  status: SessionStatus;
  conclusions: string[];
  source_refs: string[];
  corrections: string[];
  failed_attempts: string[];
  unresolved_questions: string[];
  next_recommended_step?: string;
  environment?: string;
  model_and_provider?: string;
}

export interface TaskStep {
  id: string;
  description: string;
  tool: string;
  params: Record<string, unknown>;
  reason?: string;
  status: "pending" | "done" | "failed";
}

export interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  current_step_id?: string;
}

export interface SessionPayload {
  goal?: string;
  lineage?: SessionLineage;
  recovery?: ResumeAnchor;
  evidence?: EvidenceSummary;
  plan?: TaskPlan;
}

export interface SessionGraphNode {
  id: string;
  label: string;
  type: SessionGraphNodeType;
  status: SessionGraphNodeStatus;
  chunk_id?: string;
  branch_id: string;
}

export interface SessionGraphEdge {
  from: string;
  to: string;
  relation: "next" | "fork" | "merge";
}

export interface SessionGraphSnapshot {
  session_id: string;
  current_node_id: string;
  nodes: SessionGraphNode[];
  edges: SessionGraphEdge[];
}

export interface SessionRun {
  id: string;
  status: SessionStatus;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  chunks: SessionChunk[];
  payload?: SessionPayload;
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
    chunks: [],
    payload: parent_id ? { lineage: { parent_id } } : {}
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
