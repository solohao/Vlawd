import { describe, expect, it } from "vitest";
import { parseActionProposal } from "../model/action-proposal-parser.js";

describe("action proposal parser", () => {
  it("validates raw model JSON before it reaches executors", () => {
    const proposal = parseActionProposal(
      JSON.stringify({
        proposal_id: "raw_1",
        type: "sequence",
        visibility: "visible_system",
        target_view: "system",
        safety: "safe",
        expected_result: "输入搜索词",
        actions: [{ action: "keyboard.type", params: { text: "AI Cursor" } }]
      })
    );

    expect(proposal.actions[0]?.action).toBe("keyboard.type");
  });

  it("rejects unsupported actions from real model providers", () => {
    expect(() =>
      parseActionProposal(
        JSON.stringify({
          proposal_id: "bad_1",
          type: "sequence",
          visibility: "visible_system",
          target_view: "system",
          safety: "safe",
          expected_result: "bad",
          actions: [{ action: "os.delete_all" }]
        })
      )
    ).toThrow("unsupported action");
  });
});
