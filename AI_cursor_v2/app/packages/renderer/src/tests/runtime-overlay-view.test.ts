import { describe, expect, it } from "vitest";
import type { ConversationEndpointRoute } from "@ai-cursor-v2/shared";
import {
  createBudgetFormActionProposal,
  createBudgetFormSessionGraph,
  createBudgetFormTargetCandidate,
  createRuntimeActionOverlay,
  createVoiceRuntimeCapsule,
  toCompactSessionPath,
  toSessionGraphDrawer
} from "../index.js";

const route: ConversationEndpointRoute = {
  config: {
    mode: "headset-preferred",
    input: { deviceId: "bose-qc-ultra", label: "Bose QC Ultra" },
    output: { deviceId: "bose-qc-ultra", label: "Bose QC Ultra" },
    preferBluetoothHandsFree: true,
    allowComputerMicFallback: true
  },
  warnings: [],
  safetyPreemptionEnabled: true
};

describe("runtime overlay view models", () => {
  it("renders a compact voice capsule with safety and takeover controls", () => {
    const capsule = createVoiceRuntimeCapsule({
      theme: "dark",
      state: "listening",
      endpointRoute: route
    });

    expect(capsule.type).toBe("voice_capsule");
    expect(capsule.density).toBe("capsule");
    expect(capsule.avatar.variant).toBe("compact");
    expect(capsule.state.label).toBe("Listening");
    expect(capsule.controls).toEqual(["pause", "cancel", "take_over"]);
  });

  it("keeps low-risk form filling lightweight but still linked to Session Graph", () => {
    const overlay = createRuntimeActionOverlay({
      theme: "light",
      state: "acting",
      endpointRoute: route,
      proposal: createBudgetFormActionProposal(),
      target: createBudgetFormTargetCandidate(),
      valuePreview: "8,500",
      reason: "根据行程和费用标准，预估总预算金额为 8,500 元"
    });

    expect(overlay.type).toBe("action_overlay");
    expect(overlay.density).toBe("action_card");
    expect(overlay.risk.autoExecuteAllowed).toBe(true);
    expect(overlay.targetLabel).toBe("预算预估（元）");
    expect(overlay.sessionDrawer.mode).toBe("compact_path");
    expect(overlay.sessionDrawer.path.some((item) => item.isCurrent)).toBe(true);
  });

  it("expands controls when safety requires confirmation", () => {
    const proposal = {
      ...createBudgetFormActionProposal(),
      proposal_id: "proposal-share-document",
      safety: "confirmation_required" as const,
      expected_result: "把文档分享给调研团队成员"
    };

    const overlay = createRuntimeActionOverlay({
      theme: "dark",
      state: "waiting_confirm",
      endpointRoute: route,
      proposal,
      target: {
        ...createBudgetFormTargetCandidate(),
        ref: "feishu-share-button",
        label: "分享按钮"
      },
      reason: "分享文档会改变协作权限，需要用户确认"
    });

    expect(overlay.density).toBe("expanded");
    expect(overlay.risk.label).toBe("需要确认");
    expect(overlay.controls).toContain("take_over");
  });
});

describe("session graph drawer", () => {
  it("summarizes the current path for runtime and keeps full graph lanes available", () => {
    const snapshot = createBudgetFormSessionGraph();
    const compactPath = toCompactSessionPath(snapshot);
    const drawer = toSessionGraphDrawer(snapshot, "graph");

    expect(compactPath.map((node) => node.label)).toContain("AI 执行：填写预算预估单元格");
    expect(drawer.lanes.map((lane) => lane.branchId)).toEqual(["main", "correction-budget"]);
    expect(drawer.actions).toEqual(["view_full_session", "return_to_current_node", "save_as_workflow"]);
  });
});
