import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CustomEndpointConfig,
  ModelBackendKind,
  ModelBackendState,
  ModelCenterSnapshot
} from "@ai-cursor-v2/shared";
import { desktopApi } from "../app/desktop-api.js";

const EMPTY_BACKEND: ModelBackendState = {
  backend: "ollama",
  status: "unknown",
  supportsPull: true,
  endpoint: "http://127.0.0.1:11434",
  openaiEndpoint: "http://127.0.0.1:11434/v1",
  managedByApp: false,
  installedModels: [],
  installGuidanceUrl: "https://ollama.com/download",
  message: "尚未连接桌面运行时。",
  checkedAt: ""
};

const EMPTY_SNAPSHOT: ModelCenterSnapshot = {
  generatedAt: "",
  environment: null,
  backend: EMPTY_BACKEND,
  activeBackend: "ollama",
  backends: [EMPTY_BACKEND],
  customEndpoint: { baseUrl: "", model: "" },
  storage: { rootDir: "", managedSubdir: "ai-cursor-v2-models", preferNonSystemDrive: true, source: "default" },
  storageWarnings: [],
  activePull: null,
  catalog: [],
  activeProviderKind: "pipeline",
  activeBrainModel: "",
  providerConnected: false,
  usingRealInference: false
};

export interface ModelCenterController {
  available: boolean;
  snapshot: ModelCenterSnapshot;
  busy: boolean;
  probe(): Promise<void>;
  refreshBackend(): Promise<void>;
  chooseStorageRoot(): Promise<void>;
  pull(model: string): Promise<void>;
  cancelPull(): Promise<void>;
  removeModel(model: string): Promise<void>;
  useAsBrain(model: string): Promise<void>;
  setBackend(kind: ModelBackendKind): Promise<void>;
  setCustomEndpoint(config: CustomEndpointConfig): Promise<void>;
  openStorageLocation(): Promise<void>;
  openInstallGuide(): Promise<void>;
}

export function useModelCenter(): ModelCenterController {
  const available = typeof window !== "undefined" && !!window.aiCursorDesktop;
  const [snapshot, setSnapshot] = useState<ModelCenterSnapshot>(EMPTY_SNAPSHOT);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) {
      return;
    }
    const api = desktopApi();
    const unsubscribe = api.onModelSnapshot(setSnapshot);
    void api.modelSnapshot().then(setSnapshot).catch(() => undefined);
    // 首次进入即做一次环境探测与后端检测。
    void api.modelProbeEnvironment().then(setSnapshot).catch(() => undefined);
    void api.modelRefreshBackend().then(setSnapshot).catch(() => undefined);
    return () => unsubscribe();
  }, [available]);

  const run = useCallback(
    async (action: () => Promise<ModelCenterSnapshot>) => {
      if (!available) {
        return;
      }
      setBusy(true);
      try {
        setSnapshot(await action());
      } catch {
        // 错误已投影到快照（backend/activePull）；此处避免抛到 UI。
      } finally {
        setBusy(false);
      }
    },
    [available]
  );

  const probe = useCallback(() => run(() => desktopApi().modelProbeEnvironment()), [run]);
  const refreshBackend = useCallback(() => run(() => desktopApi().modelRefreshBackend()), [run]);
  const chooseStorageRoot = useCallback(() => run(() => desktopApi().modelChooseStorageRoot()), [run]);
  const pull = useCallback((model: string) => run(() => desktopApi().modelPull(model)), [run]);
  const removeModel = useCallback((model: string) => run(() => desktopApi().modelRemove(model)), [run]);
  const useAsBrain = useCallback((model: string) => run(() => desktopApi().modelUseAsBrain(model)), [run]);
  const setBackend = useCallback((kind: ModelBackendKind) => run(() => desktopApi().modelSetBackend(kind)), [run]);
  const setCustomEndpoint = useCallback(
    (config: CustomEndpointConfig) => run(() => desktopApi().modelSetCustomEndpoint(config)),
    [run]
  );

  const cancelPull = useCallback(async () => {
    if (available) {
      setSnapshot(await desktopApi().modelCancelPull());
    }
  }, [available]);

  const openStorageLocation = useCallback(async () => {
    if (available) {
      await desktopApi().modelOpenStorageLocation();
    }
  }, [available]);

  const openInstallGuide = useCallback(async () => {
    if (available) {
      await desktopApi().modelOpenInstallGuide();
    }
  }, [available]);

  return useMemo(
    () => ({
      available,
      snapshot,
      busy,
      probe,
      refreshBackend,
      chooseStorageRoot,
      pull,
      cancelPull,
      removeModel,
      useAsBrain,
      setBackend,
      setCustomEndpoint,
      openStorageLocation,
      openInstallGuide
    }),
    [
      available,
      snapshot,
      busy,
      probe,
      refreshBackend,
      chooseStorageRoot,
      pull,
      cancelPull,
      removeModel,
      useAsBrain,
      setBackend,
      setCustomEndpoint,
      openStorageLocation,
      openInstallGuide
    ]
  );
}
