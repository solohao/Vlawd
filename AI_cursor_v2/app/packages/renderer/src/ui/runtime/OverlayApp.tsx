import { useEffect, useRef, useState } from "react";
import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { ExpandIcon, GearIcon } from "../icons.js";
import { VoiceController } from "./VoiceController.js";

function api() {
  return typeof window !== "undefined" ? window.aiCursorDesktop : undefined;
}

function OverlayMini({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="drag flex items-center gap-2.5 rounded-full border border-ink-700 bg-ink-900/95 px-2.5 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl select-none">
      <button
        onClick={onExpand}
        className="no-drag relative grid h-9 w-9 place-items-center"
        aria-label="expand voice controller"
      >
        <span
          className="absolute inset-0 rounded-full bg-brand-400/30 blur-md"
          style={{ animation: "ai-glow 3s ease-in-out infinite" }}
        />
        <img src="/ai-employee-avatar-compact.png" alt="" className="relative h-8 w-8 object-contain" />
      </button>
      <div className="flex h-4 items-center gap-[2.5px]">
        {[0.4, 0.85, 0.5, 1, 0.6].map((h, i) => (
          <span
            key={i}
            className="w-[2.5px] rounded-full bg-brand-400"
            style={{ height: `${h * 100}%`, animation: `ai-pulse 1s ease-in-out ${i * 0.12}s infinite` }}
          />
        ))}
      </div>
      <button
        onClick={() => api()?.openMainWindow()}
        className="no-drag rounded-full p-1 text-slate-400 hover:text-white"
        aria-label="open settings"
      >
        <GearIcon width={15} height={15} />
      </button>
      <button
        onClick={onExpand}
        className="no-drag rounded-full p-1 text-slate-400 hover:text-white"
        aria-label="expand"
      >
        <ExpandIcon width={14} height={14} />
      </button>
    </div>
  );
}

interface OverlayAppProps {
  runtimeState?: ModelRuntimeState;
}

export function OverlayApp({ runtimeState = "listening" }: OverlayAppProps) {
  const [expanded, setExpanded] = useState(false);
  const [liveState, setLiveState] = useState<ModelRuntimeState>(runtimeState);
  const ref = useRef<HTMLDivElement>(null);

  // Cycle 1：订阅主进程 Runtime 事件，实时投影运行状态到悬浮控制器。
  useEffect(() => {
    const desktop = api();
    if (!desktop) {
      return;
    }
    void desktop.conversationSnapshot().then((snapshot) => setLiveState(snapshot.runtimeState)).catch(() => undefined);
    return desktop.onConversationEvent((event) => {
      if (event.type === "state") {
        setLiveState(event.state);
      } else if (event.type === "snapshot") {
        setLiveState(event.snapshot.runtimeState);
      }
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const report = () => {
      const rect = el.getBoundingClientRect();
      api()?.resizeOverlay({ width: Math.ceil(rect.width), height: Math.ceil(rect.height) });
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div ref={ref} className="inline-block p-3">
      {expanded ? (
        <VoiceController
          runtimeState={liveState}
          draggable
          onCollapse={() => setExpanded(false)}
          onOpenSettings={() => api()?.openMainWindow()}
          onPause={() => api()?.conversationPreempt("pause")}
          onCancel={() => api()?.conversationPreempt("cancel")}
          onTakeover={() => api()?.openMainWindow()}
        />
      ) : (
        <OverlayMini onExpand={() => setExpanded(true)} />
      )}
    </div>
  );
}
