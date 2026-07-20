import { useEffect, useRef, useState } from "react";
import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { aiEmployeeSpriteTransparent } from "../../app/assets.js";
import { runtimeStateToken } from "../../brand/ai-employee.js";
import { ExpandIcon, GearIcon } from "../icons.js";
import { VoiceController } from "./VoiceController.js";

function api() {
  return typeof window !== "undefined" ? window.aiCursorDesktop : undefined;
}

function OverlayMini({
  runtimeState,
  onExpand
}: {
  runtimeState: ModelRuntimeState;
  onExpand: () => void;
}) {
  const token = runtimeStateToken(runtimeState);

  return (
    <div
      className="drag group relative h-[76px] w-[76px] select-none"
      data-sprite-state={runtimeState}
    >
      <span
        className="pointer-events-none absolute inset-[7px] rounded-full bg-brand-400/25 blur-xl"
        style={{ animation: "ai-glow 3s ease-in-out infinite" }}
      />
      <button
        onClick={onExpand}
        className="no-drag relative grid h-[76px] w-[76px] place-items-center rounded-full transition-transform duration-200 group-hover:scale-[1.04]"
        aria-label={`expand voice controller, current state ${token.label}`}
      >
        <span
          className="pointer-events-none absolute inset-[5px] rounded-full border border-brand-400/45"
          style={{ animation: "ai-glow 3s ease-in-out infinite" }}
        />
        <img
          src={aiEmployeeSpriteTransparent}
          alt=""
          className="overlay-sprite relative h-[68px] w-[68px] object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.22)]"
        />
      </button>
      <div className="pointer-events-none absolute -right-1 top-1 flex translate-x-1 gap-1 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
        <button
          onClick={() => api()?.openMainWindow()}
          className="no-drag grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-400 shadow-[0_6px_16px_rgba(15,23,42,0.14)] backdrop-blur-xl hover:text-slate-700"
          aria-label="open settings"
        >
          <GearIcon width={13} height={13} />
        </button>
        <button
          onClick={onExpand}
          className="no-drag grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-400 shadow-[0_6px_16px_rgba(15,23,42,0.14)] backdrop-blur-xl hover:text-slate-700"
          aria-label="expand"
        >
          <ExpandIcon width={13} height={13} />
        </button>
      </div>
      <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-brand-400 shadow-[0_2px_8px_rgba(164,209,0,0.6)]" />
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
        <OverlayMini runtimeState={liveState} onExpand={() => setExpanded(true)} />
      )}
    </div>
  );
}
