import { describe, expect, it } from "vitest";
import type { AudioDeviceDescriptor, ConversationEndpointRoute, WorkflowModelBinding } from "@ai-cursor-v2/shared";
import { createDesktopPageRegistry } from "../index.js";

const devices: AudioDeviceDescriptor[] = [
  {
    id: "bose-qc-ultra",
    label: "Bose QC Ultra",
    kind: "bluetooth-headset",
    directions: ["input", "output"],
    bluetoothProfile: "hands-free",
    available: true
  },
  {
    id: "computer-mic",
    label: "Computer Microphone",
    kind: "built-in-mic",
    directions: ["input"],
    available: true
  }
];

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

const binding: WorkflowModelBinding = {
  workflow_id: "market-research",
  executionBrain: {
    kind: "bayling-duplex",
    modelPath: "D:/AI Cursor/Models/execution-brain",
    device: "cuda"
  },
  recordEngine: {
    kind: "rule-jsonl",
    storage: "sqlite",
    device: "cpu",
    enableWorkflowMining: true
  },
  safetyPreemption: {
    role: "safety_preemption",
    engine: "local-rule-engine",
    locked: true,
    keywords: ["暂停", "取消", "停止", "接管"]
  },
  modelStorage: {
    rootDir: "D:/AI Cursor/Models",
    managedSubdir: "ai-cursor-v2-models",
    preferNonSystemDrive: true,
    source: "user-selected"
  }
};

describe("desktop page registry", () => {
  it("maps design pages to Electron window view models", () => {
    const registry = createDesktopPageRegistry({
      userName: "Lin",
      theme: "light",
      conversationRoute: route,
      audioDevices: devices,
      modelBinding: binding
    });

    expect(registry.pages.map((page) => page.id)).toEqual([
      "dashboard",
      "conversation_entry",
      "model_center",
      "workflows",
      "session_log"
    ]);
    expect(registry.dashboard.avatar.variant).toBe("with-base");
    expect(registry.dashboard.statusCards.map((card) => card.title)).toEqual([
      "Safety Engine",
      "Execution Brain",
      "Record Notebook"
    ]);
    expect(registry.conversationEntry.options[0]?.badge).toBe("recommended");
    expect(registry.modelCenter.quickActions).toContain("choose_storage");
  });
});
