import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { aiEmployeeMascotBody, aiEmployeeBubble } from "../../app/assets.js";
import { AiEmployeeSprite } from "./AiEmployeeSprite.js";
import { VoiceController } from "./VoiceController.js";

type BubbleMessageType = "template" | "content";

interface BubbleMessage {
  text: string;
  type: BubbleMessageType;
}

function api() {
  return typeof window !== "undefined" ? window.aiCursorDesktop : undefined;
}

const SPRITE = 76;
const DRAG_THRESHOLD = 4; // px：小于此位移视为点击，否则视为拖拽
const ALPHA_HIT = 24; // 命中吉祥物本体的最小 alpha（过滤透明区域）

function getStateMessage(state: ModelRuntimeState, isPaused: boolean): BubbleMessage {
  if (isPaused) {
    return { text: "已暂停", type: "template" };
  }
  switch (state) {
    case "listening":
      return { text: "正在听…", type: "template" };
    case "thinking":
      return { text: "正在思考…", type: "template" };
    case "waiting_confirm":
      return { text: "请确认…", type: "template" };
    case "acting":
      return { text: "正在执行…", type: "template" };
    case "speaking":
      return { text: "正在说：太阳系有八颗行星", type: "content" };
    case "interrupted":
      return { text: "被打断", type: "template" };
    case "complete":
      return { text: "任务完成", type: "template" };
    case "paused":
      return { text: "已暂停", type: "template" };
    default:
      return { text: "", type: "template" };
  }
}

interface OverlayAppProps {
  runtimeState?: ModelRuntimeState;
}

export function OverlayApp({ runtimeState = "listening" }: OverlayAppProps) {
  const [expanded, setExpanded] = useState(false);
  const [liveState, setLiveState] = useState<ModelRuntimeState>(runtimeState);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState<BubbleMessage>(() => getStateMessage(runtimeState, false));
  const [demoIndex, setDemoIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 供 window 级事件监听读取的最新值（避免闭包过期）。
  const expandedRef = useRef(expanded);
  const pausedRef = useRef(paused);
  const interactiveRef = useRef<boolean | null>(null);
  const hitRef = useRef<{ ctx: CanvasRenderingContext2D; w: number; h: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; moved: boolean; pointerId: number } | null>(null);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Cycle 1：订阅主进程 Runtime 事件，实时投影运行状态与暂停标志。
  useEffect(() => {
    const desktop = api();
    if (!desktop) {
      return;
    }
    void desktop
      .conversationSnapshot()
      .then((snapshot) => {
        setLiveState(snapshot.runtimeState);
        setPaused(snapshot.paused);
      })
      .catch(() => undefined);
    return desktop.onConversationEvent((event) => {
      if (event.type === "state") {
        setLiveState(event.state);
      } else if (event.type === "snapshot") {
        setLiveState(event.snapshot.runtimeState);
        setPaused(event.snapshot.paused);
      } else if (event.type === "preemption") {
        setPaused(event.intent !== "resume");
      }
    });
  }, []);

  // 根据运行状态更新气泡文案。
  useEffect(() => {
    setMessage(getStateMessage(liveState, paused));
  }, [liveState, paused]);

  // 无后端连接时循环演示文案（先一行，再两行）。
  useEffect(() => {
    const desktop = api();
    if (desktop) {
      return;
    }
    const demos: BubbleMessage[] = [
      { text: "正在听…", type: "template" },
      { text: "正在搜索：太阳系行星", type: "content" },
      { text: "正在说：太阳系有八颗行星", type: "content" },
      { text: "任务完成", type: "template" }
    ];
    setMessage(demos[0]);
    const timer = setInterval(() => {
      setDemoIndex((i) => {
        const next = (i + 1) % demos.length;
        setMessage(demos[next]);
        return next;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // 悬浮窗尺寸跟随内容（吉祥物或展开面板）。
  useEffect(() => {
    const el = rootRef.current;
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

  // 预渲染吉祥物 alpha 到离屏画布，用于"不规则多边形"命中检测。
  useEffect(() => {
    const img = new Image();
    img.src = aiEmployeeMascotBody;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.drawImage(img, 0, 0);
      hitRef.current = { ctx, w: img.naturalWidth, h: img.naturalHeight };
    };
  }, []);

  const setInteractive = useCallback((next: boolean) => {
    if (interactiveRef.current === next) {
      return;
    }
    interactiveRef.current = next;
    api()?.setOverlayInteractive(next);
  }, []);

  // 判断光标是否落在"可交互"区域：展开时的面板 或 吉祥物不透明像素。
  const hitTest = useCallback((clientX: number, clientY: number): boolean => {
    if (expandedRef.current && panelRef.current) {
      const el = document.elementFromPoint(clientX, clientY);
      if (el && panelRef.current.contains(el)) {
        return true;
      }
    }
    const sprite = spriteRef.current;
    const hit = hitRef.current;
    if (!sprite || !hit) {
      return false;
    }
    const rect = sprite.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      return false;
    }
    const px = Math.floor((x / rect.width) * hit.w);
    const py = Math.floor((y / rect.height) * hit.h);
    try {
      return hit.ctx.getImageData(px, py, 1, 1).data[3] > ALPHA_HIT;
    } catch {
      return true;
    }
  }, []);

  // window 级鼠标移动：主进程 forward 过来的移动事件驱动穿透开关。
  // 拖拽期间不再切换穿透（否则一旦光标滑出吉祥物就会重新穿透、丢失后续事件）。
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        return;
      }
      setInteractive(hitTest(e.clientX, e.clientY));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [hitTest, setInteractive]);

  const togglePause = useCallback(() => {
    const desktop = api();
    if (!desktop) {
      return;
    }
    if (pausedRef.current) {
      void desktop.conversationResume();
    } else {
      void desktop.conversationPreempt("pause");
    }
  }, []);

  // 左键按住吉祥物：主进程用系统光标坐标定时跟随移动窗口（不依赖转发事件）。
  // 松开且几乎未移动才视为点击 → 暂停/继续。拖拽全程锁定可交互 + pointer capture。
  const onSpritePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setInteractive(true);
      dragRef.current = { sx: e.screenX, sy: e.screenY, moved: false, pointerId: e.pointerId };
      void api()?.startOverlayDrag();
    },
    [setInteractive]
  );

  const onSpritePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) {
      return;
    }
    if (!drag.moved && Math.hypot(e.screenX - drag.sx, e.screenY - drag.sy) > DRAG_THRESHOLD) {
      drag.moved = true;
    }
  }, []);

  const onSpritePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) {
        return;
      }
      dragRef.current = null;
      void api()?.endOverlayDrag();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!drag.moved) {
        togglePause();
      }
    },
    [togglePause]
  );

  return (
    <div ref={rootRef} className="inline-flex flex-col items-end gap-2 overflow-hidden p-1">
      {expanded && (
        <div ref={panelRef}>
          <VoiceController
            runtimeState={liveState}
            onCollapse={() => setExpanded(false)}
            onOpenSettings={() => api()?.openMainWindow()}
            onPause={togglePause}
            onCancel={() => api()?.conversationPreempt("cancel")}
            onTakeover={() => api()?.openMainWindow()}
          />
        </div>
      )}
      <div className="flex flex-shrink-0 items-center">
        <StatusBubble message={message} />
        <div
          ref={spriteRef}
          className="relative flex-shrink-0 select-none"
          style={{ width: SPRITE, height: SPRITE, minWidth: SPRITE, minHeight: SPRITE, cursor: "grab" }}
          data-sprite-state={paused ? "paused" : liveState}
          onPointerDown={onSpritePointerDown}
          onPointerMove={onSpritePointerMove}
          onPointerUp={onSpritePointerUp}
          onContextMenu={(e) => {
            e.preventDefault();
            setExpanded((v) => !v);
          }}
          title={paused ? "点击继续" : "点击暂停 · 右键更多 · 拖动移动"}
        >
          <AiEmployeeSprite state={liveState} paused={paused} size={SPRITE} />
          <span
            className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
            style={{ background: paused ? "#94a3b8" : "var(--brand-400, #a4d100)" }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBubble({ message }: { message: BubbleMessage }) {
  const visible = Boolean(message.text);
  const textColor = message.type === "template" ? "text-brand-600" : "text-ink-950";
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.75, x: 18 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.75, x: 18 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className="relative mr-3 flex h-[76px] min-w-[120px] max-w-[220px] flex-shrink-0 items-center px-5 py-2 pr-7"
          style={{
            backgroundImage: `url(${aiEmployeeBubble})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.45))"
          }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={message.text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              className={`w-full text-center text-[13px] leading-tight ${textColor}`}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }}
            >
              {message.text}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
