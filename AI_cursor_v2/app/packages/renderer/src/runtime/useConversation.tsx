import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  DuplexConversationSnapshot,
  DuplexLatencySample,
  DuplexProviderKind,
  DuplexRuntimeEvent,
  ModelRuntimeState,
  SafetyPreemptionIntent
} from "@ai-cursor-v2/shared";
import { desktopApi } from "../app/desktop-api.js";
import { BrowserSpeechRecognizer, MicVad, TtsPlayer, WhisperTranscriber } from "./audio-io.js";

const EMPTY_SNAPSHOT: DuplexConversationSnapshot = {
  sessionId: "",
  runtimeState: "listening",
  activeProviderKind: "pipeline",
  candidateProviderKinds: [],
  providerConnected: false,
  paused: false,
  turns: [],
  latency: [],
  usingRealInference: false
};

export interface ConversationController {
  available: boolean;
  snapshot: DuplexConversationSnapshot;
  runtimeState: ModelRuntimeState;
  latency: DuplexLatencySample[];
  micActive: boolean;
  micSupported: boolean;
  sttSupported: boolean;
  ttsSupported: boolean;
  ttsSpeaking: boolean;
  micLevel: number;
  interimTranscript: string;
  whisperLoading: { status: string; progress?: number } | null;
  streamingAssistant: { turnId: string; text: string; interrupted?: boolean } | null;
  inputDeviceId?: string;
  outputDeviceId?: string;
  connect(): Promise<DuplexConversationSnapshot>;
  submit(text: string): Promise<void>;
  preempt(intent: SafetyPreemptionIntent): Promise<void>;
  resume(): Promise<void>;
  setProvider(kind: DuplexProviderKind): Promise<DuplexConversationSnapshot>;
  checkHealth(): Promise<void>;
  toggleMic(): Promise<void>;
  selectInputDevice(deviceId: string): void;
  selectOutputDevice(deviceId: string): void;
}

const ConversationContext = createContext<ConversationController | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }): JSX.Element {
  const available = typeof window !== "undefined" && !!window.aiCursorDesktop;
  const [snapshot, setSnapshot] = useState<DuplexConversationSnapshot>(EMPTY_SNAPSHOT);
  const [runtimeState, setRuntimeState] = useState<ModelRuntimeState>(EMPTY_SNAPSHOT.runtimeState);
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [whisperLoading, setWhisperLoading] = useState<{ status: string; progress?: number } | null>(null);
  const [clientLatency, setClientLatency] = useState<Partial<Record<DuplexLatencySample["kind"], number>>>({});
  const [inputDeviceId, setInputDeviceId] = useState<string | undefined>(undefined);
  const [outputDeviceId, setOutputDeviceId] = useState<string | undefined>(undefined);
  const [streamingAssistant, setStreamingAssistant] = useState<{ turnId: string; text: string; interrupted?: boolean } | null>(null);

  const tts = useRef<TtsPlayer | null>(null);
  const vad = useRef<MicVad | null>(null);
  const recognizer = useRef<BrowserSpeechRecognizer | null>(null);
  const whisper = useRef<WhisperTranscriber | null>(null);
  const speakingRef = useRef(false);
  const inputDeviceRef = useRef<string | undefined>(undefined);
  const outputDeviceRef = useRef<string | undefined>(undefined);
  const userUtteranceAtRef = useRef<number | null>(null);
  const bargeInAtRef = useRef<number | null>(null);
  const activeSpeechRef = useRef<{ stt?: string; tts?: string }>({});
  const micBroadcastRef = useRef<{ lastTime: number; lastLevel: number }>({ lastTime: 0, lastLevel: 0 });
  const lastSubmitRef = useRef<{ text: string; at: number } | null>(null);

  if (!tts.current && TtsPlayer.isSupported()) {
    tts.current = new TtsPlayer({
      onSpeakingStart: () => {
        setTtsSpeaking(true);
        const now = Date.now();
        if (userUtteranceAtRef.current != null) {
          setClientLatency((prev) => ({ ...prev, utterance_to_first_speech: now - userUtteranceAtRef.current! }));
          userUtteranceAtRef.current = null;
        }
      },
      onSpeakingEnd: () => {
        setTtsSpeaking(false);
        const now = Date.now();
        if (bargeInAtRef.current != null) {
          setClientLatency((prev) => ({ ...prev, barge_in_to_output_stop: now - bargeInAtRef.current! }));
          bargeInAtRef.current = null;
        }
      }
    });
  }

  const handleEvent = useCallback((event: DuplexRuntimeEvent) => {
    if (event.type === "snapshot") {
      setSnapshot(event.snapshot);
      setRuntimeState(event.snapshot.runtimeState);
      setStreamingAssistant(null);
      return;
    }
    if (event.type === "state") {
      speakingRef.current = event.state === "speaking";
      setRuntimeState(event.state);
      if (event.state === "thinking") {
        tts.current?.beginResponse();
      }
      if (event.state === "interrupted" || event.state === "paused" || event.state === "listening") {
        tts.current?.cancel();
      }
    } else if (event.type === "user_utterance") {
      setInterimTranscript("");
      setStreamingAssistant(null);
    } else if (event.type === "assistant_delta") {
      setRuntimeState((prev) => (prev === "thinking" ? "speaking" : prev));
      setStreamingAssistant((prev) => {
        if (prev && prev.turnId === event.turnId) {
          return { ...prev, text: prev.text + event.text };
        }
        return { turnId: event.turnId, text: event.text };
      });
      tts.current?.feed(event.text);
    } else if (event.type === "assistant_end") {
      setStreamingAssistant((prev) => (prev ? { ...prev, interrupted: event.interrupted } : null));
      if (event.interrupted) {
        tts.current?.cancel();
      } else {
        tts.current?.flush();
      }
    } else if (event.type === "preemption") {
      if (event.intent !== "resume") {
        tts.current?.cancel();
        setStreamingAssistant(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!available) {
      return;
    }
    const api = desktopApi();
    const unsubscribe = api.onConversationEvent(handleEvent);
    void api.conversationSnapshot().then(setSnapshot).catch(() => undefined);
    void api.speechGetActive().then((active) => {
      activeSpeechRef.current = active;
    }).catch(() => undefined);
    return () => {
      unsubscribe();
      tts.current?.cancel();
      vad.current?.stop();
      recognizer.current?.stop();
      whisper.current?.stop();
    };
  }, [available, handleEvent]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!available || !trimmed) {
        return;
      }
      // 800ms 内相同文本去重，避免语音识别 / 按键连击导致同一句话被提交两次。
      const now = Date.now();
      if (lastSubmitRef.current && lastSubmitRef.current.text === trimmed && now - lastSubmitRef.current.at < 800) {
        return;
      }
      lastSubmitRef.current = { text: trimmed, at: now };
      userUtteranceAtRef.current = now;
      await desktopApi().conversationUtterance(trimmed);
    },
    [available]
  );

  const stopMic = useCallback(() => {
    vad.current?.stop();
    vad.current = null;
    recognizer.current?.stop();
    recognizer.current = null;
    whisper.current?.stop();
    whisper.current = null;
    setMicActive(false);
    setMicLevel(0);
    setInterimTranscript("");
    setWhisperLoading(null);
    micBroadcastRef.current = { lastTime: 0, lastLevel: 0 };
    void desktopApi().setMicLevel(0).catch(() => undefined);
  }, []);

  const startMic = useCallback(async () => {
    if (!MicVad.isSupported()) {
      throw new Error("当前环境不支持麦克风");
    }

    let activeStt = activeSpeechRef.current.stt;
    if (!activeStt) {
      try {
        activeStt = (await desktopApi().speechGetActive()).stt;
        activeSpeechRef.current = { ...activeSpeechRef.current, stt: activeStt };
      } catch {
        activeStt = undefined;
      }
    }
    const useLocalStt = !!activeStt;
    let useWhisper = !useLocalStt && WhisperTranscriber.isSupported();

    if (useWhisper) {
      whisper.current = new WhisperTranscriber({
        onProgress: (status, progress) => setWhisperLoading({ status, progress })
      });
      try {
        await whisper.current.warmup();
      } catch (error) {
        console.warn("[useConversation] Whisper 加载失败，回退到浏览器语音识别：", error);
        whisper.current?.stop();
        whisper.current = null;
        setWhisperLoading(null);
        useWhisper = false;
      }
    }

    vad.current = new MicVad({ deviceId: inputDeviceRef.current });
    await vad.current.start({
      onSpeechStart: () => {
        console.log("[useConversation] VAD onSpeechStart");
        if (speakingRef.current && available) {
          bargeInAtRef.current = Date.now();
          const heard = tts.current?.getSpokenText() ?? "";
          tts.current?.cancel();
          void desktopApi().conversationBargeIn(heard);
        }
      },
      onLevel: (level) => {
        setMicLevel(level);
        const now = Date.now();
        const { lastTime, lastLevel } = micBroadcastRef.current;
        // 80ms 节流，且只有当变化超过 0.05 时才广播，避免 IPC 过于频繁。
        if (now - lastTime > 80 || Math.abs(level - lastLevel) > 0.08) {
          micBroadcastRef.current = { lastTime: now, lastLevel: level };
          void desktopApi().setMicLevel(level).catch(() => undefined);
        }
      },
      onSpeechEnd: useLocalStt || useWhisper
        ? (audio) => {
            console.log("[useConversation] VAD onSpeechEnd, audio length:", audio.length);
            setInterimTranscript("识别中…");
            const doSubmit = (text: string) => {
              setInterimTranscript("");
              if (text.trim()) {
                void submit(text);
              }
            };
            if (useLocalStt) {
              console.log("[useConversation] onSpeechEnd, calling speechTranscribe, samples:", audio.length);
              desktopApi()
                .speechTranscribe(audio, 16000)
                .then((text) => { console.log("[useConversation] speechTranscribe result:", text); doSubmit(text); })
                .catch((err) => { console.error("[useConversation] speechTranscribe error:", err); setInterimTranscript(""); });
            } else {
              whisper.current
                ?.transcribe(audio, "chinese", (text) => setInterimTranscript(text))
                .then(doSubmit)
                .catch(() => setInterimTranscript(""));
            }
          }
        : undefined
    });

    if (!useLocalStt && !useWhisper && BrowserSpeechRecognizer.isSupported()) {
      recognizer.current = new BrowserSpeechRecognizer();
      const started = recognizer.current.start({
        onInterim: (text) => setInterimTranscript(text),
        onFinal: (text) => {
          setInterimTranscript("");
          void submit(text);
        },
        onError: () => setInterimTranscript("")
      });
      if (!started) {
        recognizer.current = null;
      }
    }
    setMicActive(true);
  }, [available, submit]);

  const toggleMic = useCallback(async () => {
    if (micActive) {
      stopMic();
    } else {
      try {
        await startMic();
      } catch (err) {
        console.error("[toggleMic] failed:", err);
        stopMic();
      }
    }
  }, [micActive, startMic, stopMic]);

  const connect = useCallback(async () => {
    if (!available) {
      return EMPTY_SNAPSHOT;
    }
    const next = await desktopApi().conversationConnect();
    setSnapshot(next);
    await desktopApi().conversationCheckHealth().catch(() => undefined);
    return next;
  }, [available]);

  const preempt = useCallback(
    async (intent: SafetyPreemptionIntent) => {
      tts.current?.cancel();
      if (available) {
        await desktopApi().conversationPreempt(intent);
      }
    },
    [available]
  );

  const resume = useCallback(async () => {
    if (available) {
      await desktopApi().conversationResume();
    }
  }, [available]);

  const setProvider = useCallback(
    async (kind: DuplexProviderKind) => {
      if (!available) {
        return EMPTY_SNAPSHOT;
      }
      const next = await desktopApi().conversationSetProvider(kind);
      setSnapshot(next);
      return next;
    },
    [available]
  );

  const checkHealth = useCallback(async () => {
    if (available) {
      await desktopApi().conversationCheckHealth();
    }
  }, [available]);

  const selectInputDevice = useCallback((deviceId: string) => {
    inputDeviceRef.current = deviceId;
    setInputDeviceId(deviceId);
  }, []);

  const selectOutputDevice = useCallback((deviceId: string) => {
    outputDeviceRef.current = deviceId;
    setOutputDeviceId(deviceId);
    tts.current?.setSinkId(deviceId);
  }, []);

  const latency = useMemo<DuplexLatencySample[]>(
    () => [
      ...snapshot.latency,
      ...(Object.entries(clientLatency) as Array<[DuplexLatencySample["kind"], number]>).map(
        ([kind, ms]) => ({ kind, ms, at: new Date().toISOString() })
      )
    ],
    [snapshot.latency, clientLatency]
  );

  const controller = useMemo<ConversationController>(
    () => ({
      available,
      snapshot,
      runtimeState,
      latency,
      micActive,
      micSupported: MicVad.isSupported(),
      sttSupported: WhisperTranscriber.isSupported() || BrowserSpeechRecognizer.isSupported(),
      ttsSupported: TtsPlayer.isSupported(),
      ttsSpeaking,
      micLevel,
      interimTranscript,
      whisperLoading,
      streamingAssistant,
      inputDeviceId,
      outputDeviceId,
      connect,
      submit,
      preempt,
      resume,
      setProvider,
      checkHealth,
      toggleMic,
      selectInputDevice,
      selectOutputDevice
    }),
    [
      available,
      snapshot,
      runtimeState,
      latency,
      micActive,
      ttsSpeaking,
      micLevel,
      interimTranscript,
      whisperLoading,
      streamingAssistant,
      inputDeviceId,
      outputDeviceId,
      connect,
      submit,
      preempt,
      resume,
      setProvider,
      checkHealth,
      toggleMic,
      selectInputDevice,
      selectOutputDevice
    ]
  );

  return <ConversationContext.Provider value={controller}>{children}</ConversationContext.Provider>;
}

export function useConversation(): ConversationController {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return ctx;
}
