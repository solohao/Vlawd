declare module "sherpa-onnx-node" {
  export class OfflineRecognizer {
    constructor(config: any);
    static createAsync(config: any): Promise<OfflineRecognizer>;
    createStream(hotwords?: string): OfflineStream;
    decode(stream: OfflineStream): void;
    decodeAsync(stream: OfflineStream): Promise<{ text: string }>;
    getResult(stream: OfflineStream): { text: string };
    free(): void;
  }

  export class OfflineStream {
    acceptWaveform(waveform: { samples: Float32Array; sampleRate: number }): void;
    setOption(key: string, value: string): void;
    free(): void;
  }

  export class OfflineTts {
    constructor(config: any);
    static createAsync(config: any): Promise<OfflineTts>;
    generate(request: { text: string; sid: number; speed: number; enableExternalBuffer?: boolean }): { samples: Float32Array; sampleRate: number };
    generateAsync(request: { text: string; sid: number; speed: number; enableExternalBuffer?: boolean; onProgress?: (info: { samples: Float32Array; progress: number }) => number | boolean | void }): Promise<{ samples: Float32Array; sampleRate: number }>;
    numSpeakers: number;
    sampleRate: number;
    free(): void;
  }

  export function readWave(path: string): { samples: Float32Array; sampleRate: number };
  export function writeWave(path: string, waveform: { samples: Float32Array; sampleRate: number }): void;
}
