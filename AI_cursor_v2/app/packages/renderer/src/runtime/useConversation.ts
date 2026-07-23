import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DuplexConversationSnapshot,
  DuplexProviderKind,
  DuplexRuntimeEvent,
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
  micActive: boolean;
  micSupported: boolean;
  sttSupported: boolean;
  ttsSupported: boolean;
  micLevel: number;
  interimTranscript: string;
  connect(): Promise<void>;
  submit(text: string): Promise<void>;
  preempt(intent: SafetyPreemptionIntent): Promise<void>;
  resume(): Promise<void>;
  setProvider(kind: DuplexProviderKind): Promise<void>;
  checkHealth(): Promise<void>;
  toggleMic(): Promise<void>;
}

export function useConversation(): ConversationController {
  const available = typeof window !== "undefined" && !!window.aiCursorDesktop;
  const [snapshot, setSnapshot] = useState<DuplexConversationSnapshot>(EMPTY_SNAPSHOT);
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");

  const tts = useRef<TtsPlayer | null>(null);
  const vad = useRef<MicVad | null>(null);
  const recognizer = useRef<BrowserSpeechRecognizer | null>(null);
  const whisper = useRef<WhisperTranscriber | null>(null);
  const speakingRef = useRef(false);

  if (!tts.current && TtsPlayer.isSupported()) {
    tts.current = new TtsPlayer();
  }

  const handleEvent = useCallback((event: DuplexRuntimeEvent) => {
    if (event.type === "snapshot") {
      setSnapshot(event.snapshot);
      return;
    }
    if (event.type === "state") {
      speakingRef.current = event.state === "speaking";
      if (event.state === "thinking") {
        // 新一轮回答开始，重置“已听到”累计，供下次 barge-in 精确上报。
        tts.current?.beginResponse();
      }
      if (event.state === "interrupted" || event.state === "paused" || event.state === "listening") {
        tts.current?.cancel();
      }
    } else if (event.type === "assistant_delta") {
      tts.current?.feed(event.text);
    } else if (event.type === "assistant_end") {
      if (event.interrupted) {
        tts.current?.cancel();
      } else {
        tts.current?.flush();
      }
    } else if (event.type === "preemption") {
      if (event.intent !== "resume") {
        tts.current?.cancel();
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
    return () => {
      unsubscribe();
      tts.current?.cancel();
      vad.current?.stop();
      recognizer.current?.stop();
      whisper.current?.stop();
    };
  }, [available, handleEvent]);

  const connect = useCallback(async () => {
    if (!available) {
      return;
    }
    const next = await desktopApi().conversationConnect();
    setSnapshot(next);
    await desktopApi().conversationCheckHealth().catch(() => undefined);
  }, [available]);

  const submit = useCallback(
    async (text: string) => {
      if (!available || !text.trim()) {
        return;
      }
      await desktopApi().conversationUtterance(text.trim());
    },
    [available]
  );

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
      if (available) {
        const next = await desktopApi().conversationSetProvider(kind);
        setSnapshot(next);
      }
    },
    [available]
  );

  const checkHealth = useCallback(async () => {
    if (available) {
      await desktopApi().conversationCheckHealth();
    }
  }, [available]);

  const startMic = useCallback(async () => {
    if (!MicVad.isSupported()) {
      throw new Error("当前环境不支持麦克风");
    }
    // Electron 里 webkitSpeechRecognition 通常不可用，优先用 renderer 内 Whisper（transformers.js）。
    const useWhisper = WhisperTranscriber.isSupported();
    if (useWhisper) {
      whisper.current = new WhisperTranscriber();
      whisper.current.warmup();
    }

    vad.current = new MicVad();
    await vad.current.start({
      onSpeechStart: () => {
        // VAD 检测到用户开口：AI 正在说话时立即打断（barge-in），并上报“已听到文本”。
        if (speakingRef.current && available) {
          const heard = tts.current?.getSpokenText() ?? "";
          tts.current?.cancel();
          void desktopApi().conversationBargeIn(heard);
        }
      },
      onLevel: (level) => setMicLevel(level),
      onSpeechEnd: useWhisper
        ? (audio) => {
            setInterimTranscript("识别中…");
            whisper.current
              ?.transcribe(audio)
              .then((text) => {
                setInterimTranscript("");
                if (text.trim()) {
                  void submit(text);
                }
              })
              .catch(() => setInterimTranscript(""));
          }
        : undefined
    });

    if (!useWhisper && BrowserSpeechRecognizer.isSupported()) {
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
  }, []);

  const toggleMic = useCallback(async () => {
    if (micActive) {
      stopMic();
    } else {
      await startMic();
    }
  }, [micActive, startMic, stopMic]);

  return useMemo(
    () => ({
      available,
      snapshot,
      micActive,
      micSupported: MicVad.isSupported(),
      sttSupported: WhisperTranscriber.isSupported() || BrowserSpeechRecognizer.isSupported(),
      ttsSupported: TtsPlayer.isSupported(),
      micLevel,
      interimTranscript,
      connect,
      submit,
      preempt,
      resume,
      setProvider,
      checkHealth,
      toggleMic
    }),
    [
      available,
      snapshot,
      micActive,
      micLevel,
      interimTranscript,
      connect,
      submit,
      preempt,
      resume,
      setProvider,
      checkHealth,
      toggleMic
    ]
  );
}
