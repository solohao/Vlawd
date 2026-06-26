export type AudioDirection = "input" | "output";
export type AudioDeviceKind = "bluetooth-headset" | "wired-headset" | "built-in-mic" | "built-in-speaker" | "virtual";
export type BluetoothAudioProfile = "hands-free" | "headset" | "a2dp" | "unknown";
export type ConversationEndpointMode = "headset-preferred" | "computer-mic" | "split-input-output" | "manual";
export type DuplexAudioSessionState = "idle" | "listening" | "speaking" | "paused" | "stopped";

export interface AudioDeviceDescriptor {
  id: string;
  label: string;
  kind: AudioDeviceKind;
  directions: AudioDirection[];
  isDefault?: boolean;
  available: boolean;
  bluetoothProfile?: BluetoothAudioProfile;
}

export interface AudioEndpointRef {
  deviceId: string;
  label: string;
}

export interface ConversationEndpointPreference {
  mode: ConversationEndpointMode;
  preferredInputDeviceId?: string;
  preferredOutputDeviceId?: string;
  preferBluetoothHandsFree: boolean;
  allowComputerMicFallback: boolean;
}

export interface ConversationEndpointConfig {
  mode: ConversationEndpointMode;
  input: AudioEndpointRef;
  output: AudioEndpointRef;
  preferBluetoothHandsFree: boolean;
  allowComputerMicFallback: boolean;
}

export interface ConversationEndpointRoute {
  config: ConversationEndpointConfig;
  warnings: string[];
  safetyPreemptionEnabled: true;
}

export interface DuplexAudioSessionEvent {
  state: DuplexAudioSessionState;
  inputDeviceId: string;
  outputDeviceId: string;
  userAudioFrames: number;
  assistantAudioFrames: number;
}
