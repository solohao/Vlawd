import { describe, expect, it } from "vitest";
import type { AudioDeviceDescriptor, ConversationEndpointRoute } from "@ai-cursor-v2/shared";
import { toConversationEntryRows } from "../panel/conversation-entry-view.js";

const route: ConversationEndpointRoute = {
  config: {
    mode: "headset-preferred",
    input: { deviceId: "bt-headset-hfp", label: "Bluetooth Headset Hands-Free" },
    output: { deviceId: "bt-headset-hfp", label: "Bluetooth Headset Hands-Free" },
    preferBluetoothHandsFree: true,
    allowComputerMicFallback: true
  },
  warnings: [],
  safetyPreemptionEnabled: true
};

const mockAudioDevices: AudioDeviceDescriptor[] = [
  {
    id: "bt-headset-hfp",
    label: "Bluetooth Headset Hands-Free",
    kind: "bluetooth-headset",
    directions: ["input", "output"],
    bluetoothProfile: "hands-free",
    available: true
  }
];

describe("conversation entry view model", () => {
  it("renders input, output, headset strategy and safety rows", () => {
    const rows = toConversationEntryRows(route, mockAudioDevices);

    expect(rows.map((row) => row.label)).toEqual([
      "对话输入入口",
      "对话输出入口",
      "耳机优先策略",
      "安全抢占"
    ]);
    expect(rows[0]?.value).toBe("Bluetooth Headset Hands-Free");
    expect(rows[1]?.value).toBe("Bluetooth Headset Hands-Free");
    expect(rows[3]?.value).toBe("本地规则已启用");
  });

  it("explains computer microphone fallback when headset input is missing", () => {
    const fallbackRoute: ConversationEndpointRoute = {
      ...route,
      config: {
        ...route.config,
        input: { deviceId: "built-in-mic", label: "Computer Microphone" },
        output: { deviceId: "bt-headset-a2dp", label: "Bluetooth Headset Stereo" }
      }
    };
    const rows = toConversationEntryRows(fallbackRoute, []);

    expect(rows[0]?.value).toBe("Computer Microphone");
    expect(rows[0]?.hint).toBe("电脑麦克风 fallback");
    expect(rows[2]?.value).toBe("未检测到完整 Hands-Free");
  });
});
