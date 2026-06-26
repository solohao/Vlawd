import type { ConversationEndpointRoute, DuplexAudioSessionEvent } from "@ai-cursor-v2/shared";

export function createMockDuplexAudioSession(route: ConversationEndpointRoute): DuplexAudioSessionEvent[] {
  return [
    {
      state: "listening",
      inputDeviceId: route.config.input.deviceId,
      outputDeviceId: route.config.output.deviceId,
      userAudioFrames: 1,
      assistantAudioFrames: 0
    },
    {
      state: "speaking",
      inputDeviceId: route.config.input.deviceId,
      outputDeviceId: route.config.output.deviceId,
      userAudioFrames: 1,
      assistantAudioFrames: 1
    },
    {
      state: "stopped",
      inputDeviceId: route.config.input.deviceId,
      outputDeviceId: route.config.output.deviceId,
      userAudioFrames: 1,
      assistantAudioFrames: 1
    }
  ];
}
