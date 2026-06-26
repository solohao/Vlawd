import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSession } from "@ai-cursor-v2/shared";
import { runAgentTurn } from "../agent-loop/loop.js";
import { VirtualBrowserViewExecutor } from "../executors/browser-mvp.js";
import { MockSystemExecutor } from "../executors/mock-system.js";
import type { Executor } from "../executors/types.js";
import { MockDuplexModelProvider } from "../model/mock-duplex-provider.js";
import { JsonlSessionStorage } from "../session/jsonl-storage.js";

describe("agent loop", () => {
  it("runs mock model proposals through safety, executor, and session logging", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ai-cursor-v2-"));
    const storage = new JsonlSessionStorage(join(dir, "session.jsonl"));
    const browser = new VirtualBrowserViewExecutor();
    const result = await runAgentTurn(
      createSession("agent_session"),
      "帮我搜索 AI Cursor",
      new MockDuplexModelProvider(),
      new Map<string, Executor>([
        ["system", new MockSystemExecutor()],
        ["browser_view_main", browser]
      ]),
      { autoConfirm: true, storage }
    );

    const chunks = await storage.readAll();
    expect(result.proposals).toHaveLength(1);
    expect(result.action_results.length).toBeGreaterThan(0);
    expect(chunks.some((chunk) => chunk.type === "proposal")).toBe(true);
    expect(chunks.some((chunk) => chunk.type === "action_result")).toBe(true);
    expect(browser.state.labels).toHaveLength(1);
    await rm(dir, { recursive: true, force: true });
  });

  it("waits for confirmation when model or policy requires it", async () => {
    const result = await runAgentTurn(
      createSession("confirm_session"),
      "帮我填写表单",
      new MockDuplexModelProvider(),
      new Map([["system", new MockSystemExecutor()]]),
      { autoConfirm: false }
    );

    expect(result.proposals[0]?.safety).toBe("confirmation_required");
    expect(result.action_results).toHaveLength(0);
    expect(result.states).toContain("waiting_confirm");
  });
});
