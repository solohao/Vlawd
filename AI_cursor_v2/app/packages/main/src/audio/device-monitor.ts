import type {
  AudioDeviceDescriptor,
  ConversationEndpointPreference,
  ConversationEndpointRoute
} from "@ai-cursor-v2/shared";
import {
  defaultConversationEndpointPreference,
  mockAudioDevices,
  selectConversationEndpoint
} from "./conversation-endpoint.js";

export class DeviceMonitor {
  private readonly devices: AudioDeviceDescriptor[];

  constructor(devices: AudioDeviceDescriptor[] = mockAudioDevices) {
    this.devices = devices;
  }

  listDevices(): AudioDeviceDescriptor[] {
    return this.devices.filter((device) => device.available);
  }

  selectRoute(
    preference: ConversationEndpointPreference = defaultConversationEndpointPreference
  ): ConversationEndpointRoute {
    return selectConversationEndpoint(this.listDevices(), preference);
  }
}
