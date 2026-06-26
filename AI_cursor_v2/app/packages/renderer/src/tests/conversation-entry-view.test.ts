import { describe, expect, it } from "vitest";
import type { AudioDeviceDescriptor, ConversationEndpointRoute } from "@ai-cursor-v2/shared";
import { toConversationEntryOptions, toConversationEntryRows } from "../panel/conversation-entry-view.js";

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

const devices: AudioDeviceDescriptor[] = [
  {
    id: "bt-headset-hfp",
    label: "Bluetooth Headset Hands-Free",
    kind: "bluetooth-headset",
    directions: ["input", "output"],
    bluetoothProfile: "hands-free",
    available: true
  },
  {
    id: "bt-headset-a2dp",
    label: "Bluetooth Headset Stereo",
    kind: "bluetooth-headset",
    directions: ["output"],
    bluetoothProfile: "a2dp",
    available: true
  },
  {
    id: "built-in-mic",
    label: "Computer Microphone",
    kind: "built-in-mic",
    directions: ["input"],
    available: true
  },
  {
    id: "built-in-speaker",
    label: "Computer Speaker",
    kind: "built-in-speaker",
    directions: ["output"],
    available: true
  }
];

describe("conversation entry view model", () => {
  it("renders input, output, headset strategy and safety rows", () => {
    const rows = toConversationEntryRows(route, devices);

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

  it("renders connectable entrance options for the device picker", () => {
    const options = toConversationEntryOptions(devices);

    expect(options.map((option) => option.badge)).toEqual(["recommended", "split", "fallback", "manual"]);
    expect(options[0]?.title).toContain("推荐");
    expect(options[0]?.action).toBe("connect_conversation_entry");
    expect(options[1]?.inputLabel).toBe("Computer Microphone");
    expect(options[1]?.outputLabel).toBe("Bluetooth Headset Stereo");
    expect(options[1]?.warnings[0]).toContain("耳机麦克风");
  });

  it("still exposes manual selection when no audio device is available", () => {
    const options = toConversationEntryOptions([]);

    expect(options).toHaveLength(1);
    expect(options[0]?.badge).toBe("manual");
    expect(options[0]?.action).toBe("manual_select_devices");
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
    const rows = toConversationEntryRows(fallbackRoute, devices.filter((device) => device.id !== "bt-headset-hfp"));

    expect(rows[0]?.value).toBe("Computer Microphone");
    expect(rows[0]?.hint).toBe("电脑麦克风 fallback");
    expect(rows[2]?.value).toBe("未检测到完整 Hands-Free");
  });
});
