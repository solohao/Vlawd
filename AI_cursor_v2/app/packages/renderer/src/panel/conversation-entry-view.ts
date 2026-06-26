import type { AudioDeviceDescriptor, ConversationEndpointRoute } from "@ai-cursor-v2/shared";

export interface ConversationEntryRow {
  label: string;
  value: string;
  hint: string;
}

export interface ConversationEntryOption {
  id: string;
  title: string;
  inputLabel: string;
  outputLabel: string;
  badge: "recommended" | "split" | "fallback" | "manual";
  description: string;
  action: "connect_conversation_entry" | "manual_select_devices";
  warnings: string[];
}

export function toConversationEntryRows(
  route: ConversationEndpointRoute,
  devices: AudioDeviceDescriptor[]
): ConversationEntryRow[] {
  const bluetoothHandsFreeAvailable = devices.some(isBluetoothHandsFreeDuplex);

  return [
    {
      label: "对话输入入口",
      value: route.config.input.label,
      hint: route.config.input.deviceId === route.config.output.deviceId ? "耳机麦克风输入" : "电脑麦克风 fallback"
    },
    {
      label: "对话输出入口",
      value: route.config.output.label,
      hint: route.config.input.deviceId === route.config.output.deviceId ? "耳机播放输出" : "可与输入设备分离"
    },
    {
      label: "耳机优先策略",
      value: bluetoothHandsFreeAvailable ? "Hands-Free 可用" : "未检测到完整 Hands-Free",
      hint: "优先选择支持麦克风+耳机输出的蓝牙模式"
    },
    {
      label: "安全抢占",
      value: route.safetyPreemptionEnabled ? "本地规则已启用" : "未启用",
      hint: "停/暂停/取消不依赖执行大脑"
    }
  ];
}

export function toConversationEntryOptions(devices: AudioDeviceDescriptor[]): ConversationEntryOption[] {
  const available = devices.filter((device) => device.available);
  const options: ConversationEntryOption[] = [];

  for (const headset of available.filter(isBluetoothHandsFreeDuplex)) {
    options.push({
      id: `headset:${headset.id}`,
      title: `${headset.label}（推荐）`,
      inputLabel: headset.label,
      outputLabel: headset.label,
      badge: "recommended",
      description: "蓝牙 Hands-Free/HFP/HSP，使用同一副耳机完成输入和输出。",
      action: "connect_conversation_entry",
      warnings: []
    });
  }

  const computerMic = available.find((device) => device.kind === "built-in-mic" && supports(device, "input"));
  for (const headsetOutput of available.filter(isBluetoothOutputOnly)) {
    if (computerMic) {
      options.push({
        id: `split:${computerMic.id}:${headsetOutput.id}`,
        title: "电脑麦克风 + 蓝牙耳机输出",
        inputLabel: computerMic.label,
        outputLabel: headsetOutput.label,
        badge: "split",
        description: "耳机仅提供 A2DP/Stereo 输出时，用电脑麦克风作为输入。",
        action: "connect_conversation_entry",
        warnings: ["当前蓝牙模式未提供耳机麦克风输入。"]
      });
    }
  }

  const computerSpeaker = available.find((device) => device.kind === "built-in-speaker" && supports(device, "output"));
  if (computerMic && computerSpeaker) {
    options.push({
      id: `fallback:${computerMic.id}:${computerSpeaker.id}`,
      title: "电脑麦克风 + 电脑扬声器",
      inputLabel: computerMic.label,
      outputLabel: computerSpeaker.label,
      badge: "fallback",
      description: "未连接可用耳机时的系统默认交流入口。",
      action: "connect_conversation_entry",
      warnings: []
    });
  }

  options.push({
    id: "manual",
    title: "手动选择输入/输出设备",
    inputLabel: "用户选择",
    outputLabel: "用户选择",
    badge: "manual",
    description: "高级模式：分别选择麦克风和播放设备。",
    action: "manual_select_devices",
    warnings: []
  });

  return options;
}

function isBluetoothHandsFreeDuplex(device: AudioDeviceDescriptor): boolean {
  return (
    device.available &&
    device.kind === "bluetooth-headset" &&
    supports(device, "input") &&
    supports(device, "output") &&
    (device.bluetoothProfile === "hands-free" || device.bluetoothProfile === "headset")
  );
}

function isBluetoothOutputOnly(device: AudioDeviceDescriptor): boolean {
  return device.kind === "bluetooth-headset" && supports(device, "output") && !supports(device, "input");
}

function supports(device: AudioDeviceDescriptor, direction: "input" | "output"): boolean {
  return device.directions.includes(direction);
}
