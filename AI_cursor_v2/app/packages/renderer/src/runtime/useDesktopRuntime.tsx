import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CustomEndpointConfig, DesktopUiSnapshot, ModelBackendKind, ModelRole } from "@ai-cursor-v2/shared";
import { desktopApi } from "../app/desktop-api.js";

const EMPTY_SNAPSHOT: DesktopUiSnapshot = {
  generatedAt: "",
  theme: "light",
  runtimeState: "listening",
  modelBinding: {} as never,
  modelDownloads: [],
  healthChecks: [],
  audio: {
    devices: [],
    route: {} as never,
    sessionEvents: [],
    connected: false,
    message: "等待连接桌面运行时。"
  },
  browser: {
    url: "",
    title: "",
    nextAction: {
      actionType: "",
      targetLabel: "",
      value: "",
      reason: "",
      riskLevel: "safe"
    }
  },
  session: {
    id: "",
    status: "active",
    created_at: "",
    updated_at: "",
    chunks: []
  },
  graph: {
    session_id: "",
    current_node_id: "",
    nodes: [],
    edges: []
  }
};

export interface DesktopRuntimeController {
  available: boolean;
  snapshot: DesktopUiSnapshot;
  busy: boolean;
  chooseStorageRoot(): Promise<void>;
  startModelDownload(role: ModelRole): Promise<void>;
  runHealthCheck(role: ModelRole): Promise<void>;
  connectAudio(): Promise<void>;
  pauseSession(): Promise<void>;
  cancelSession(): Promise<void>;
  executeRuntimeAction(): Promise<void>;
  refresh(): Promise<void>;
}

const DesktopRuntimeContext = createContext<DesktopRuntimeController | null>(null);

export function DesktopRuntimeProvider({ children }: { children: ReactNode }): JSX.Element {
  const available = typeof window !== "undefined" && !!window.aiCursorDesktop;
  const [snapshot, setSnapshot] = useState<DesktopUiSnapshot>(EMPTY_SNAPSHOT);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) {
      return;
    }
    const api = desktopApi();
    const unsubscribe = api.onDesktopSnapshot(setSnapshot);
    void api.getSnapshot().then(setSnapshot).catch(() => undefined);
    return () => unsubscribe();
  }, [available]);

  const run = useCallback(
    async (action: () => Promise<DesktopUiSnapshot>) => {
      if (!available) {
        return;
      }
      setBusy(true);
      try {
        setSnapshot(await action());
      } catch {
        try {
          setSnapshot(await desktopApi().getSnapshot());
        } catch {
          // ignore
        }
      } finally {
        setBusy(false);
      }
    },
    [available]
  );

  const chooseStorageRoot = useCallback(() => run(() => desktopApi().chooseModelStorageRoot()), [run]);
  const startModelDownload = useCallback(
    (role: ModelRole) => run(() => desktopApi().startModelDownload(role)),
    [run]
  );
  const runHealthCheck = useCallback(
    (role: ModelRole) => run(() => desktopApi().runHealthCheck(role)),
    [run]
  );
  const connectAudio = useCallback(() => run(() => desktopApi().connectAudio()), [run]);
  const pauseSession = useCallback(() => run(() => desktopApi().pauseSession()), [run]);
  const cancelSession = useCallback(() => run(() => desktopApi().cancelSession()), [run]);
  const executeRuntimeAction = useCallback(() => run(() => desktopApi().executeRuntimeAction()), [run]);
  const refresh = useCallback(() => run(() => desktopApi().getSnapshot()), [run]);

  const value = useMemo(
    () => ({
      available,
      snapshot,
      busy,
      chooseStorageRoot,
      startModelDownload,
      runHealthCheck,
      connectAudio,
      pauseSession,
      cancelSession,
      executeRuntimeAction,
      refresh
    }),
    [
      available,
      snapshot,
      busy,
      chooseStorageRoot,
      startModelDownload,
      runHealthCheck,
      connectAudio,
      pauseSession,
      cancelSession,
      executeRuntimeAction,
      refresh
    ]
  );

  return <DesktopRuntimeContext.Provider value={value}>{children}</DesktopRuntimeContext.Provider>;
}

export function useDesktopRuntime(): DesktopRuntimeController {
  const ctx = useContext(DesktopRuntimeContext);
  if (!ctx) {
    throw new Error("useDesktopRuntime must be used within DesktopRuntimeProvider");
  }
  return ctx;
}
