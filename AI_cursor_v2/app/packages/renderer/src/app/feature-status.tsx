import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "../design-system/index.js";

export type FeatureStatus = "todo" | "wip" | "done";

interface FeatureStatusContextValue {
  statuses: Readonly<Record<string, FeatureStatus>>;
  mark(id: string, status: FeatureStatus): void;
}

const FeatureStatusContext = createContext<FeatureStatusContextValue | null>(null);

const STORAGE_KEY = "aiCursorFeatureStatus";

function readSavedStatuses(): Record<string, FeatureStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const result: Record<string, FeatureStatus> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value === "todo" || value === "wip" || value === "done") {
          result[key] = value;
        }
      }
      return result;
    }
  } catch {
    // ignore
  }
  return {};
}

export function FeatureStatusProvider({ children }: { children: ReactNode }): JSX.Element {
  const [statuses, setStatuses] = useState<Record<string, FeatureStatus>>(readSavedStatuses);

  const mark = useCallback((id: string, status: FeatureStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [id]: status };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ statuses, mark }), [statuses, mark]);

  return <FeatureStatusContext.Provider value={value}>{children}</FeatureStatusContext.Provider>;
}

export function useFeatureStatus(id: string): FeatureStatus {
  const ctx = useContext(FeatureStatusContext);
  if (!ctx) {
    return "todo";
  }
  return ctx.statuses[id] || "todo";
}

export function useMarkFeature(): (id: string, status: FeatureStatus) => void {
  const ctx = useContext(FeatureStatusContext);
  return useCallback(
    (id: string, status: FeatureStatus) => {
      ctx?.mark(id, status);
    },
    [ctx]
  );
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
  return (
    <div className={cn("feature-paint", className)} data-paint={status === "done" ? "off" : status}>
      {children}
    </div>
  );
}
