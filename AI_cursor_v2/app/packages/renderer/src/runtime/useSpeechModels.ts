import { useCallback, useEffect, useState } from "react";
import { desktopApi, type SpeechActiveConfig, type SpeechModelStatus } from "../app/desktop-api.js";

export interface SpeechModelsController {
  available: boolean;
  status: SpeechModelStatus[];
  active: SpeechActiveConfig;
  busy: boolean;
  refresh(): Promise<void>;
  download(modelId: string): Promise<void>;
  cancelDownload(modelId: string): Promise<void>;
  remove(modelId: string): Promise<void>;
  setActive(role: "stt" | "tts", modelId: string | undefined): Promise<void>;
}

export function useSpeechModels(): SpeechModelsController {
  const available = typeof window !== "undefined" && !!window.aiCursorDesktop;
  const [status, setStatus] = useState<SpeechModelStatus[]>([]);
  const [active, setActive] = useState<SpeechActiveConfig>({});
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!available) return;
    const api = desktopApi();
    const [s, a] = await Promise.all([api.speechGetStatus(), api.speechGetActive()]);
    setStatus(s);
    setActive(a);
  }, [available]);

  const run = useCallback(
    async (action: () => Promise<SpeechModelStatus[]>) => {
      if (!available) return;
      setBusy(true);
      try {
        const next = await action();
        setStatus(next);
        const a = await desktopApi().speechGetActive();
        setActive(a);
      } finally {
        setBusy(false);
      }
    },
    [available]
  );

  const download = useCallback((modelId: string) => run(() => desktopApi().speechDownload(modelId)), [run]);
  const cancelDownload = useCallback((modelId: string) => run(() => desktopApi().speechCancelDownload(modelId)), [run]);
  const remove = useCallback((modelId: string) => run(() => desktopApi().speechRemove(modelId)), [run]);
  const setActiveModel = useCallback(
    (role: "stt" | "tts", modelId: string | undefined) => run(() => desktopApi().speechSetActive(role, modelId)),
    [run]
  );

  useEffect(() => {
    if (!available) return;
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 2000);
    return () => clearInterval(interval);
  }, [available, refresh]);

  return {
    available,
    status,
    active,
    busy,
    refresh,
    download,
    cancelDownload,
    remove,
    setActive: setActiveModel
  };
}
