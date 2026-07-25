import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { DesktopUiSnapshot, ResearchSource, SessionRun, SessionSummary } from "@ai-cursor-v2/shared";

export interface PersistedSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  goal?: string;
  session: SessionRun;
  sources: ResearchSource[];
  lastUrl: string;
  lastTitle: string;
  conclusion?: string;
}

export type SessionMeta = SessionSummary;

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

export function saveSession(snapshot: DesktopUiSnapshot): PersistedSession {
  const { session, browser } = snapshot;
  const firstUserChunk = session.chunks.find((chunk) => chunk.type === "user" || chunk.type === "state");
  const goal = firstUserChunk?.summary ?? browser.title ?? "未命名研究任务";
  const conclusionChunk = [...session.chunks].reverse().find((chunk) => chunk.type === "conclusion");

  const persisted: PersistedSession = {
    id: session.id,
    title: browser.title || goal,
    created_at: session.created_at,
    updated_at: new Date().toISOString(),
    goal,
    session,
    sources: browser.sources,
    lastUrl: browser.url,
    lastTitle: browser.title,
    conclusion: conclusionChunk?.summary
  };

  writeFileSync(sessionPath(session.id), JSON.stringify(persisted, null, 2), "utf-8");
  return persisted;
}

export function listSessions(): SessionMeta[] {
  const dir = getSessionsDir();
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  const sessions: SessionMeta[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const persisted: PersistedSession = JSON.parse(raw);
      sessions.push({
        id: persisted.id,
        title: persisted.title,
        created_at: persisted.created_at,
        updated_at: persisted.updated_at,
        sourceCount: persisted.sources.length,
        ...(persisted.goal ? { goal: persisted.goal } : {})
      });
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
