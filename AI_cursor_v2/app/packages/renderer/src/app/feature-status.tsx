import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "../design-system/index.js";

export type FeatureStatus = "todo" | "wip" | "done";

interface FeatureState {
  statuses: Record<string, FeatureStatus>;
  interactions: Record<string, number>;
  lastUsedAt: Record<string, string>;
}

interface FeatureStatusContextValue {
  statuses: Readonly<Record<string, FeatureStatus>>;
  interactions: Readonly<Record<string, number>>;
  lastUsedAt: Readonly<Record<string, string>>;
  mark(id: string, status: FeatureStatus): void;
  recordInteraction(id: string): void;
  resetFeature(id: string): void;
}

const STORAGE_KEY = "aiCursorFeatureState";
const LEGACY_KEY = "aiCursorFeatureStatus";

function isFeatureStatus(value: unknown): value is FeatureStatus {
  return value === "todo" || value === "wip" || value === "done";
}

function readSavedState(): FeatureState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FeatureState> | Record<string, string>;
      if (parsed && typeof parsed === "object" && !("statuses" in parsed)) {
        const statuses: Record<string, FeatureStatus> = {};
        for (const [key, value] of Object.entries(parsed as Record<string, string>)) {
          if (isFeatureStatus(value)) {
            statuses[key] = value;
          }
        }
        return { statuses, interactions: {}, lastUsedAt: {} };
      }
      return {
        statuses: Object.fromEntries(
          Object.entries((parsed as FeatureState).statuses ?? {}).filter(([, v]) => isFeatureStatus(v))
        ) as Record<string, FeatureStatus>,
        interactions: { ...(parsed as FeatureState).interactions },
        lastUsedAt: { ...(parsed as FeatureState).lastUsedAt }
      };
    }
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as Record<string, string>;
      const statuses: Record<string, FeatureStatus> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (isFeatureStatus(value)) {
          statuses[key] = value;
        }
      }
      return { statuses, interactions: {}, lastUsedAt: {} };
    }
  } catch {
    // ignore
  }
  return { statuses: {}, interactions: {}, lastUsedAt: {} };
}

function persist(next: FeatureState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const FeatureStatusContext = createContext<FeatureStatusContextValue | null>(null);

export function FeatureStatusProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<FeatureState>(readSavedState);

  const mark = useCallback((id: string, status: FeatureStatus) => {
    setState((prev) => {
      const next = { ...prev, statuses: { ...prev.statuses, [id]: status } };
      persist(next);
      return next;
    });
  }, []);

  const recordInteraction = useCallback((id: string) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const next: FeatureState = {
        ...prev,
        interactions: { ...prev.interactions, [id]: (prev.interactions[id] ?? 0) + 1 },
        lastUsedAt: { ...prev.lastUsedAt, [id]: now }
      };
      persist(next);
      return next;
    });
  }, []);

  const resetFeature = useCallback((id: string) => {
    setState((prev) => {
      const { statuses, interactions, lastUsedAt } = prev;
      const { [id]: _s, ...restStatuses } = statuses;
      const { [id]: _i, ...restInteractions } = interactions;
      const { [id]: _l, ...restLastUsedAt } = lastUsedAt;
      const next: FeatureState = {
        statuses: restStatuses,
        interactions: restInteractions,
        lastUsedAt: restLastUsedAt
      };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ...state, mark, recordInteraction, resetFeature }),
    [state, mark, recordInteraction, resetFeature]
  );

  return <FeatureStatusContext.Provider value={value}>{children}</FeatureStatusContext.Provider>;
}

function useFeatureContext(): FeatureStatusContextValue {
  const ctx = useContext(FeatureStatusContext);
  if (!ctx) {
    return {
      statuses: {},
      interactions: {},
      lastUsedAt: {},
      mark: () => undefined,
      recordInteraction: () => undefined,
      resetFeature: () => undefined
    };
  }
  return ctx;
}

export function useFeatureStatus(id: string): FeatureStatus {
  return useFeatureContext().statuses[id] ?? "todo";
}

export function useFeatureInteractions(id: string): { count: number; lastUsedAt?: string } {
  const ctx = useFeatureContext();
  return { count: ctx.interactions[id] ?? 0, lastUsedAt: ctx.lastUsedAt[id] };
}

export function useMarkFeature(): (id: string, status: FeatureStatus) => void {
  return useFeatureContext().mark;
}

export function useRecordInteraction(): (id: string) => void {
  return useFeatureContext().recordInteraction;
}

export function useResetFeature(): (id: string) => void {
  return useFeatureContext().resetFeature;
}

export function FeaturePaint({
  id,
  className,
  children
}: {
  id: string;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  const status = useFeatureStatus(id);
  const paint = status === "done" ? "off" : status === "todo" ? "on" : "wip";
  return (
    <div className={cn("feature-paint", className)} data-paint={paint}>
      {children}
    </div>
  );
}

export function FeatureSection({
  id,
  title,
  className,
  children
}: {
  id: string;
  title?: string;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  const status = useFeatureStatus(id);
  const { count, lastUsedAt } = useFeatureInteractions(id);
  const { mark, recordInteraction } = useFeatureContext();

  const handleVerify = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      mark(id, "done");
    },
    [mark, id]
  );

  const handleClickCapture = useCallback(() => {
    if (status === "todo") {
      mark(id, "wip");
    }
    recordInteraction(id);
  }, [status, mark, recordInteraction, id]);

  const formattedLastUsed = lastUsedAt
    ? new Date(lastUsedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : undefined;

  return (
    <div className={cn("relative", className)} onClickCapture={handleClickCapture}>
      <FeaturePaint id={id} className="h-full">
        {children}
      </FeaturePaint>
    </div>
  );
}

export function FeatureStatusInspector({ className }: { className?: string }): JSX.Element {
  const { statuses, interactions, lastUsedAt, mark, resetFeature } = useFeatureContext();
  const ids = Object.keys(statuses).sort();
  const getColor = (status: FeatureStatus) =>
    status === "done" ? "bg-emerald-100 text-emerald-700" : status === "wip" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";

  return (
    <div className={cn("space-y-2", className)}>
      {ids.length === 0 && (
        <p className="text-[11px] text-slate-400">暂无功能状态记录，访问各页面后会自动生成。</p>
      )}
      {ids.map((id) => {
        const status = statuses[id] ?? "todo";
        const count = interactions[id] ?? 0;
        const lastUsed = lastUsedAt[id];
        return (
          <div key={id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">
            <div className="flex items-center gap-3">
              <span className={cn("rounded px-1.5 py-0.5 font-medium", getColor(status))}>{status}</span>
              <span className="font-medium text-slate-700">{id}</span>
              <span className="text-slate-400">交互 {count} 次</span>
              {lastUsed && (
                <span className="text-slate-400">· 最后 {new Date(lastUsed).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {status === "wip" && (
                <button
                  type="button"
                  onClick={() => mark(id, "done")}
                  className="rounded bg-brand-400 px-2 py-0.5 font-medium text-ink-900 hover:bg-brand-300"
                >
                  确认完成
                </button>
              )}
              <button
                type="button"
                onClick={() => resetFeature(id)}
                className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600 hover:bg-slate-200"
              >
                重置
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
