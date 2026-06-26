import { appendChunk, type ActionProposal, type ActionResult, type AgentTurnResult, type DuplexModelProvider, type SessionRun } from "@ai-cursor-v2/shared";
import type { Executor } from "../executors/types.js";
import { evaluateSafety } from "../safety/policy.js";
import { detectSafetyPreemption } from "../safety/preemption.js";
import type { JsonlSessionStorage } from "../session/jsonl-storage.js";

export interface AgentLoopOptions {
  autoConfirm?: boolean;
  storage?: JsonlSessionStorage;
}

export async function runAgentTurn(
  session: SessionRun,
  userUtterance: string,
  provider: DuplexModelProvider,
  executors: Map<string, Executor>,
  options: AgentLoopOptions = {}
): Promise<AgentTurnResult> {
  let nextSession = appendChunk(session, {
    id: `${session.id}_user_${session.chunks.length}`,
    type: "user",
    summary: userUtterance,
    payload: { utterance: userUtterance }
  });
  await persistLatest(nextSession, options.storage);

  const preemption = detectSafetyPreemption(userUtterance);
  if (preemption && preemption.intent !== "resume") {
    for (const executor of executors.values()) {
      executor.pause();
    }
    nextSession = {
      ...appendChunk(nextSession, {
        id: `${session.id}_preempt_${nextSession.chunks.length}`,
        type: "safety",
        summary: `Safety preemption: ${preemption.intent}`,
        payload: { preemption }
      }),
      status: "paused"
    };
    await persistLatest(nextSession, options.storage);
    return {
      session: nextSession,
      proposals: [],
      action_results: [],
      states: ["paused"],
      paused_by_preemption: true
    };
  }

  if (preemption?.intent === "resume") {
    for (const executor of executors.values()) {
      executor.resume();
    }
  }

  const proposals: ActionProposal[] = [];
  const actionResults: ActionResult[] = [];
  const states: AgentTurnResult["states"] = [];

  for await (const event of provider.generate({ session_id: session.id, user_utterance: userUtterance })) {
    if (event.type === "state") {
      states.push(event.state);
      nextSession = appendChunk(nextSession, {
        id: `${session.id}_state_${nextSession.chunks.length}`,
        type: "state",
        summary: `Model state: ${event.state}`,
        payload: { state: event.state }
      });
      await persistLatest(nextSession, options.storage);
    }

    if (event.type === "speech") {
      nextSession = appendChunk(nextSession, {
        id: `${session.id}_speech_${nextSession.chunks.length}`,
        type: "model",
        summary: event.text,
        payload: { text: event.text }
      });
      await persistLatest(nextSession, options.storage);
    }

    if (event.type === "uncertainty") {
      nextSession = appendChunk(nextSession, {
        id: `${session.id}_uncertainty_${nextSession.chunks.length}`,
        type: "safety",
        summary: event.reason,
        payload: event
      });
      await persistLatest(nextSession, options.storage);
    }

    if (event.type === "action_proposal") {
      proposals.push(event.proposal);
      const decision = evaluateSafety(event.proposal);
      nextSession = appendChunk(nextSession, {
        id: `${session.id}_proposal_${nextSession.chunks.length}`,
        type: "proposal",
        summary: event.proposal.expected_result,
        payload: { proposal: event.proposal, safety_decision: decision }
      });
      await persistLatest(nextSession, options.storage);

      if (decision.level === "blocked") {
        nextSession = {
          ...nextSession,
          status: "interrupted"
        };
        continue;
      }

      if (decision.requires_user_confirmation && options.autoConfirm !== true) {
        states.push("waiting_confirm");
        continue;
      }

      const executor = executors.get(event.proposal.target_view) ?? executors.get("system");
      if (!executor) {
        throw new Error(`No executor registered for ${event.proposal.target_view}`);
      }

      states.push("acting");
      const results = await executor.execute(event.proposal);
      actionResults.push(...results);
      nextSession = appendChunk(nextSession, {
        id: `${session.id}_result_${nextSession.chunks.length}`,
        type: "action_result",
        summary: `${results.length} action(s) executed`,
        payload: { results }
      });
      await persistLatest(nextSession, options.storage);
    }
  }

  return {
    session: nextSession,
    proposals,
    action_results: actionResults,
    states,
    paused_by_preemption: false
  };
}

async function persistLatest(session: SessionRun, storage?: JsonlSessionStorage): Promise<void> {
  if (!storage) {
    return;
  }
  const latest = session.chunks.at(-1);
  if (latest) {
    await storage.append(latest);
  }
}
