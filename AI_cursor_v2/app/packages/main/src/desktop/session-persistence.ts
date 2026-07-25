import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type {
  DesktopUiSnapshot,
  EvidenceSummary,
  ResearchSource,
  ResumeAnchor,
  SessionPayload,
  SessionRun,
  SessionSummary,
  TaskPlan
} from "@ai-cursor-v2/shared";

export interface PersistedSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  goal?: string;
  parent_id?: string;
  lineage?: {
    parent_id?: string;
    fork_from?: string;
    fork_reason?: string;
  };
  session: SessionRun;
  sources: ResearchSource[];
  lastUrl: string;
  lastTitle: string;
  conclusion?: string;
  evidenceSummary?: EvidenceSummary;
  recovery?: ResumeAnchor;
  plan?: TaskPlan;
}

export interface SaveSessionOptions {
  evidence?: EvidenceSummary;
  recovery?: ResumeAnchor;
  plan?: TaskPlan;
}

function getSessionsDir(): string {
  const dir = join(app.getPath("userData"), "sessions");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sessionPath(id: string): string {
  return join(getSessionsDir(), `${id}.json`);
}

export function saveSession(
  snapshot: DesktopUiSnapshot,
  options: SaveSessionOptions = {}
): PersistedSession {
  const { session, browser } = snapshot;
  const firstUserChunk = session.chunks.find((chunk) => chunk.type === "user" || chunk.type === "state");
  const goal = session.payload?.goal ?? firstUserChunk?.summary ?? browser.title ?? "未命名研究任务";
  const conclusionChunk = [...session.chunks].reverse().find((chunk) => chunk.type === "conclusion");
  const evidence = options.evidence ?? session.payload?.evidence;
  const recovery = options.recovery ?? session.payload?.recovery;
  const plan = options.plan ?? session.payload?.plan;

  const payload: SessionPayload | undefined = session.payload
    ? { ...session.payload, evidence, recovery, plan }
    : { goal, lineage: undefined, evidence, recovery, plan };

  const persisted: PersistedSession = {
    id: session.id,
    title: browser.title || goal,
    created_at: session.created_at,
    updated_at: new Date().toISOString(),
    goal,
    parent_id: session.parent_id,
    lineage: session.payload?.lineage,
    session: { ...session, payload },
    sources: browser.sources,
    lastUrl: browser.url,
    lastTitle: browser.title,
    conclusion: conclusionChunk?.summary,
    evidenceSummary: evidence,
    recovery,
    plan
  };

  writeFileSync(sessionPath(session.id), JSON.stringify(persisted, null, 2), "utf-8");
  return persisted;
}

export function listSessions(): SessionSummary[] {
  const dir = getSessionsDir();
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  const sessions: SessionSummary[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const persisted: PersistedSession = JSON.parse(raw);
      const summary: SessionSummary = {
        id: persisted.id,
        title: persisted.title,
        created_at: persisted.created_at,
        updated_at: persisted.updated_at,
        sourceCount: persisted.sources.length,
        parent_id: persisted.parent_id,
        hasEvidence: !!persisted.evidenceSummary,
        plan: persisted.plan,
        evidence: persisted.evidenceSummary
      };
      if (persisted.goal) {
        summary.goal = persisted.goal;
      }
      sessions.push(summary);
    } catch {
      // ignore broken files
    }
  }
  return sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function loadSession(id: string): PersistedSession | undefined {
  const path = sessionPath(id);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as PersistedSession;
  } catch {
    return undefined;
  }
}

export function deleteSession(id: string): boolean {
  const path = sessionPath(id);
  if (!existsSync(path)) return false;
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}
