import { describe, expect, it } from "vitest";
import type { AudioDeviceDescriptor } from "@ai-cursor-v2/shared";
import {
  createMockDuplexAudioSession,
  mockAudioDevices,
  selectConversationEndpoint
} from "../audio/conversation-endpoint.js";
import { DeviceMonitor } from "../audio/device-monitor.js";
import { bindPresetToWorkflow } from "../model/dual-role-config.js";

describe("conversation endpoint routing", () => {
  it("prefers Bluetooth Hands-Free devices for duplex conversation", () => {
    const monitor = new DeviceMonitor(mockAudioDevices);
    const route = monitor.selectRoute();

    expect(monitor.listDevices()).toHaveLength(4);
    expect(route.config.input.deviceId).toBe("bt-headset-hfp");
    expect(route.config.output.deviceId).toBe("bt-headset-hfp");
    expect(route.safetyPreemptionEnabled).toBe(true);
    expect(route.warnings).toEqual([]);
  });

  it("falls back to computer microphone when Bluetooth is output-only", () => {
    const outputOnlyBluetooth: AudioDeviceDescriptor[] = mockAudioDevices.filter(
      (device) => device.id !== "bt-headset-hfp"
    );
    const route = selectConversationEndpoint(outputOnlyBluetooth);

    expect(route.config.input.deviceId).toBe("built-in-mic");
    expect(route.config.output.deviceId).toBe("bt-headset-a2dp");
    expect(route.warnings[0]).toContain("computer microphone");
  });

  it("binds headset-preferred conversation entry into workflow presets", () => {
    const binding = bindPresetToWorkflow("developer-mock", "audio_demo");

    expect(binding.conversationEndpoint?.mode).toBe("headset-preferred");
    expect(binding.conversationEndpoint?.preferBluetoothHandsFree).toBe(true);
    expect(binding.conversationEndpoint?.allowComputerMicFallback).toBe(true);
  });

  it("creates deterministic mock duplex audio session events", () => {
    const route = selectConversationEndpoint(mockAudioDevices);
    const events = createMockDuplexAudioSession(route);

    expect(events.map((event) => event.state)).toEqual(["listening", "speaking", "stopped"]);
    expect(events[0]?.inputDeviceId).toBe("bt-headset-hfp");
    expect(events[1]?.assistantAudioFrames).toBe(1);
  });
});
