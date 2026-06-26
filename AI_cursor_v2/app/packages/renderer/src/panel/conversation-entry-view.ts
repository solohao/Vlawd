import type { AudioDeviceDescriptor, ConversationEndpointRoute } from "@ai-cursor-v2/shared";

export interface ConversationEntryRow {
  label: string;
  value: string;
  hint: string;
}

export function toConversationEntryRows(
  route: ConversationEndpointRoute,
  devices: AudioDeviceDescriptor[]
): ConversationEntryRow[] {
  const bluetoothHandsFreeAvailable = devices.some(
    (device) =>
      device.available &&
      device.kind === "bluetooth-headset" &&
      device.directions.includes("input") &&
      device.directions.includes("output") &&
      (device.bluetoothProfile === "hands-free" || device.bluetoothProfile === "headset")
  );

  return [
    {
      label: "对话输入入口",
      value: route.config.input.label,
      hint: route.config.input.deviceId === route.config.output.deviceId
        ? "耳机麦克风输入"
        : "电脑麦克风 fallback"
    },
    {
      label: "对话输出入口",
      value: route.config.output.label,
      hint: route.config.input.deviceId === route.config.output.deviceId
        ? "耳机播放输出"
        : "可与输入设备分离"
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
