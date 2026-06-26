import { describe, expect, it } from "vitest";
import { createSession } from "@ai-cursor-v2/shared";
import { runAgentTurn } from "../agent-loop/loop.js";
import { VirtualBrowserViewExecutor } from "../executors/browser-mvp.js";
import { MockSystemExecutor } from "../executors/mock-system.js";
import type { Executor } from "../executors/types.js";
import { MockDuplexModelProvider } from "../model/mock-duplex-provider.js";

describe("browser MVP scenarios", () => {
  it("supports job filtering as a visible virtual browser flow", async () => {
    const browser = new VirtualBrowserViewExecutor();
    const result = await runAgentTurn(
      createSession("job_session"),
      "帮我筛选求职岗位",
      new MockDuplexModelProvider(),
      new Map<string, Executor>([
        ["system", new MockSystemExecutor()],
        ["browser_view_main", browser]
      ]),
      { autoConfirm: true }
    );

    expect(result.proposals[0]?.target_view).toBe("browser_view_main");
    expect(browser.state.query).toContain("/jobs");
    expect(browser.state.filters.join(" ")).toContain("远程");
    expect(browser.state.labels[0]?.ref).toBe("job_filter_remote");
  });

  it("supports simple form fill only after confirmation", async () => {
    const system = new MockSystemExecutor();
    const result = await runAgentTurn(
      createSession("form_session"),
      "帮我填写表单",
      new MockDuplexModelProvider(),
      new Map([["system", system]]),
      { autoConfirm: true }
    );

    expect(result.action_results.length).toBeGreaterThan(0);
    expect(system.state.typedText).toContain("张三");
    expect(system.state.typedText).toContain("demo@example.com");
  });
});
