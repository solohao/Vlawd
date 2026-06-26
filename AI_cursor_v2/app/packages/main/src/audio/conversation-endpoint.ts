import type {
  AudioDeviceDescriptor,
  ConversationEndpointConfig,
  ConversationEndpointPreference,
  ConversationEndpointRoute
} from "@ai-cursor-v2/shared";

export { createMockDuplexAudioSession } from "./mock-audio-session.js";

export const defaultConversationEndpointPreference: ConversationEndpointPreference = {
  mode: "headset-preferred",
  preferBluetoothHandsFree: true,
  allowComputerMicFallback: true
};

export const mockAudioDevices: AudioDeviceDescriptor[] = [
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
    isDefault: true,
    available: true
  },
  {
    id: "built-in-speaker",
    label: "Computer Speaker",
    kind: "built-in-speaker",
    directions: ["output"],
    isDefault: true,
    available: true
  }
];

export function selectConversationEndpoint(
  devices: AudioDeviceDescriptor[],
  preference: ConversationEndpointPreference = defaultConversationEndpointPreference
): ConversationEndpointRoute {
  const available = devices.filter((device) => device.available);

  if (preference.mode === "manual") {
    const manualInput = available.find((device) => device.id === preference.preferredInputDeviceId);
    const manualOutput = available.find((device) => device.id === preference.preferredOutputDeviceId);
    if (manualInput && supports(manualInput, "input") && manualOutput && supports(manualOutput, "output")) {
      return routeFromDevices(preference, manualInput, manualOutput, []);
    }
  }

  if (preference.mode === "headset-preferred") {
    const duplexHeadset = findBluetoothHandsFree(available);
    if (duplexHeadset) {
      return routeFromDevices(preference, duplexHeadset, duplexHeadset, []);
    }

    const headsetOutput = available.find(
      (device) => device.kind === "bluetooth-headset" && supports(device, "output")
    );
    const computerMic = findComputerMic(available);
    if (headsetOutput && computerMic && preference.allowComputerMicFallback) {
      return routeFromDevices(preference, computerMic, headsetOutput, [
        "Bluetooth output is available but no Hands-Free microphone was detected; using computer microphone input."
      ]);
    }
  }

  if (preference.mode === "computer-mic") {
    const computerMic = findComputerMic(available);
    const output = findPreferredOutput(available);
    if (computerMic && output) {
      return routeFromDevices(preference, computerMic, output, []);
    }
  }

  const input = findPreferredInput(available);
  const output = findPreferredOutput(available);
  if (!input || !output) {
    throw new Error("No usable audio input/output route is available.");
  }

  return routeFromDevices(preference, input, output, [
    "Falling back to default system audio devices."
  ]);
}

function routeFromDevices(
  preference: ConversationEndpointPreference,
  input: AudioDeviceDescriptor,
  output: AudioDeviceDescriptor,
  warnings: string[]
): ConversationEndpointRoute {
  const config: ConversationEndpointConfig = {
    mode: preference.mode,
    input: {
      deviceId: input.id,
      label: input.label
    },
    output: {
      deviceId: output.id,
      label: output.label
    },
    preferBluetoothHandsFree: preference.preferBluetoothHandsFree,
    allowComputerMicFallback: preference.allowComputerMicFallback
  };

  return {
    config,
    warnings,
    safetyPreemptionEnabled: true
  };
}

function findBluetoothHandsFree(devices: AudioDeviceDescriptor[]): AudioDeviceDescriptor | undefined {
  return devices.find(
    (device) =>
      device.kind === "bluetooth-headset" &&
      supports(device, "input") &&
      supports(device, "output") &&
      (device.bluetoothProfile === "hands-free" || device.bluetoothProfile === "headset")
  );
}

function findComputerMic(devices: AudioDeviceDescriptor[]): AudioDeviceDescriptor | undefined {
  return devices.find((device) => device.kind === "built-in-mic" && supports(device, "input"));
}

function findPreferredInput(devices: AudioDeviceDescriptor[]): AudioDeviceDescriptor | undefined {
  return devices.find((device) => supports(device, "input") && device.isDefault) ?? devices.find((device) => supports(device, "input"));
}

function findPreferredOutput(devices: AudioDeviceDescriptor[]): AudioDeviceDescriptor | undefined {
  return devices.find((device) => supports(device, "output") && device.isDefault) ?? devices.find((device) => supports(device, "output"));
}

function supports(device: AudioDeviceDescriptor, direction: "input" | "output"): boolean {
  return device.directions.includes(direction);
}
