import { useEffect, useRef } from "react";
import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { aiEmployeeMascotBody, aiEmployeeMascotJelly } from "../../app/assets.js";
import { bbox, lerpPoints, pathFrom, resample, scaleY } from "./mascot-geometry.js";
import { MASCOT_STATES, type MascotPoint, type MascotStateKey } from "./mascot-states.js";

const N = 56; // 统一重采样点数，供逐点几何 morph
const MORPH_MS = 360;

/** duplex-runtime 运行状态 → 精灵基础表情状态。 */
const STATE_MAP: Record<ModelRuntimeState, MascotStateKey> = {
  listening: "ready",
  speaking: "ready",
  thinking: "thinking",
  waiting_confirm: "thinking",
  acting: "focused",
  paused: "paused",
  interrupted: "error",
  complete: "complete"
};

interface ResampledState {
  eL: MascotPoint[];
  eR: MascotPoint[];
  mo: MascotPoint[];
}

const RS: Record<MascotStateKey, ResampledState> = (() => {
  const table = {} as Record<MascotStateKey, ResampledState>;
  (Object.keys(MASCOT_STATES) as MascotStateKey[]).forEach((key) => {
    const s = MASCOT_STATES[key];
    table[key] = { eL: resample(s.eyeL, N), eR: resample(s.eyeR, N), mo: resample(s.mouth, N) };
  });
  return table;
})();

const GAZE_DIRS: Record<"right" | "up" | "left", MascotPoint> = {
  right: [1, -0.2],
  up: [0, -1],
  left: [-1, -0.2]
};
const GAZE_ORDER: Array<"right" | "up" | "left"> = ["right", "up", "left"];

interface AiEmployeeSpriteProps {
  /** duplex-runtime 实时运行状态。 */
  state: ModelRuntimeState;
  /** 是否被用户暂停（覆盖 state，强制变暗静止）。 */
  paused?: boolean;
  size?: number;
}

/**
 * Rive 式桌面精灵：用同一套矢量五官做顶点几何 morph + 果冻式 squash&stretch，
 * 叠加呼吸 / 眨眼 / 看向光标 / 说话口型等实时混合输入。外框（clean_body）与五官同在
 * #rig 内一起联动。运行状态由 duplex-runtime 通过 props 驱动，替代旧版静态 PNG。
 */
export function AiEmployeeSprite({ state, paused = false, size = 76 }: AiEmployeeSpriteProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rigRef = useRef<SVGGElement>(null);
  const eLRef = useRef<SVGPathElement>(null);
  const eRRef = useRef<SVGPathElement>(null);
  const moRef = useRef<SVGPathElement>(null);
  const pupilsRef = useRef<SVGGElement>(null);
  const pLRef = useRef<SVGEllipseElement>(null);
  const pRRef = useRef<SVGEllipseElement>(null);

  // 目标状态（映射后），供 RAF 循环读取最新值。
  const targetRef = useRef<MascotStateKey>(STATE_MAP[state]);
  const speakingRef = useRef(state === "speaking");

  useEffect(() => {
    const mapped = paused ? "paused" : STATE_MAP[state];
    targetRef.current = mapped;
    speakingRef.current = !paused && state === "speaking";
  }, [state, paused]);

  useEffect(() => {
    const eL = eLRef.current;
    const eR = eRRef.current;
    const mo = moRef.current;
    const rig = rigRef.current;
    const pupils = pupilsRef.current;
    const pL = pLRef.current;
    const pR = pRRef.current;
    const svg = svgRef.current;
    if (!eL || !eR || !mo || !rig || !pupils || !pL || !pR || !svg) {
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cur: MascotStateKey = targetRef.current;
    let morph: { from: MascotStateKey; to: MascotStateKey; t0: number; active: boolean } = {
      from: cur,
      to: cur,
      t0: 0,
      active: false
    };
    let shakeUntil = 0;
    let shakePhase = 0;
    let blinkK = 1;
    const look = { x: 0, y: 0, lastMove: 0 };

    // 眨眼调度
    let blinkTimer: ReturnType<typeof setTimeout> | null = null;
    const doBlink = (dbl: boolean): void => {
      const t0 = performance.now();
      const step = (now: number): void => {
        const p = (now - t0) / 150;
        if (p >= 1) {
          blinkK = 1;
          if (dbl) {
            doBlink(false);
          }
          return;
        }
        blinkK = Math.abs(Math.cos(p * Math.PI));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const scheduleBlink = (): void => {
      const wait = 2600 + Math.random() * 5200;
      blinkTimer = setTimeout(() => {
        if (!document.hidden && cur !== "paused") {
          doBlink(Math.random() < 0.3);
        }
        scheduleBlink();
      }, wait);
    };
    if (!reduceMotion) {
      scheduleBlink();
    }

    // 思考态眼珠扫视
    const easeBack = (t: number): number => {
      const s = 1.9;
      const u = t - 1;
      return 1 + u * u * ((s + 1) * u + s);
    };
    const nextGaze = (c: "right" | "up" | "left"): "right" | "up" | "left" => {
      const others = GAZE_ORDER.filter((x) => x !== c);
      return others[(Math.random() * others.length) | 0];
    };
    let gz = {
      cur: "up" as "right" | "up" | "left",
      tar: "right" as "right" | "up" | "left",
      t0: 0,
      dur: 0.2,
      dwell: 0.6,
      moving: true
    };

    const onMove = (ev: MouseEvent): void => {
      const r = svg.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        return;
      }
      look.x = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width - 0.5) * 2));
      look.y = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height - 0.5) * 2));
      look.lastMove = performance.now();
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const render = (now: number): void => {
      const tn = now / 1000;

      // 顶点几何 morph（连续变形，非交叉淡入）
      if (targetRef.current !== cur && !morph.active) {
        morph = { from: cur, to: targetRef.current, t0: now, active: true };
        if (targetRef.current === "error") {
          shakePhase = now;
          shakeUntil = now + 520;
        }
      }
      let cE = RS[cur].eL;
      let cER = RS[cur].eR;
      let cM = RS[cur].mo;
      if (morph.active) {
        let p = (now - morph.t0) / MORPH_MS;
        if (p >= 1) {
          p = 1;
          morph.active = false;
          cur = morph.to;
        }
        const e = p < 1 ? 1 - Math.pow(1 - p, 3) : 1; // easeOutCubic
        cE = lerpPoints(RS[morph.from].eL, RS[morph.to].eL, e);
        cER = lerpPoints(RS[morph.from].eR, RS[morph.to].eR, e);
        cM = lerpPoints(RS[morph.from].mo, RS[morph.to].mo, e);
      } else {
        cE = RS[cur].eL.slice();
        cER = RS[cur].eR.slice();
        cM = RS[cur].mo.slice();
      }

      // 眼珠朝向
      let gazeX = 0;
      let gazeY = 0;
      if (cur === "thinking" && !morph.active) {
        let ge = 1;
        if (gz.moving) {
          let p = (tn - gz.t0) / gz.dur;
          if (p >= 1) {
            p = 1;
            gz.moving = false;
            gz.cur = gz.tar;
            gz.t0 = tn;
          }
          ge = easeBack(p);
        } else if (tn - gz.t0 > gz.dwell) {
          gz = {
            cur: gz.cur,
            tar: nextGaze(gz.cur),
            t0: tn,
            dur: 0.13 + Math.random() * 0.09,
            dwell: 0.6 + Math.random() * 1.3,
            moving: true
          };
        }
        const a = GAZE_DIRS[gz.cur];
        const b = GAZE_DIRS[gz.tar];
        gazeX = a[0] + (b[0] - a[0]) * ge;
        gazeY = a[1] + (b[1] - a[1]) * ge;
        if (!gz.moving) {
          gazeX += Math.sin(tn * 7) * 0.06;
        }
      } else if (cur !== "paused") {
        // 看向光标：鼠标停止一段时间后回正
        const idle = now - look.lastMove > 1500;
        const decay = idle ? 0.92 : 1;
        look.x *= decay;
        look.y *= decay;
        gazeX = look.x;
        gazeY = look.y;
      }

      // 眨眼：压扁眼睛
      if (blinkK < 1) {
        cE = scaleY(cE, blinkK);
        cER = scaleY(cER, blinkK);
      }

      // 口型：说话 / 完成态张合
      let mouthOpen = 0;
      if (cur === "complete") {
        mouthOpen = 0.35 + 0.15 * Math.sin(tn * 4);
      }
      if (speakingRef.current) {
        mouthOpen = Math.max(mouthOpen, (Math.sin(tn * 10) * 0.5 + 0.5) * 0.7);
      }
      if (mouthOpen > 0.02) {
        cM = scaleY(cM, 1 + mouthOpen * 1.4);
      }

      eL.setAttribute("d", pathFrom(cE));
      eR.setAttribute("d", pathFrom(cER));
      mo.setAttribute("d", pathFrom(cM));

      // 瞳孔
      const showPupils = (Math.abs(gazeX) > 0.02 || Math.abs(gazeY) > 0.02 || cur === "thinking") && cur !== "paused";
      pupils.style.opacity = showPupils ? "1" : "0";
      if (showPupils) {
        const bl = bbox(cE);
        const br = bbox(cER);
        const rngX = 10;
        const rngY = 8;
        pL.setAttribute("cx", String(bl.cx + gazeX * rngX));
        pL.setAttribute("cy", String(bl.cy + gazeY * rngY));
        pR.setAttribute("cx", String(br.cx + gazeX * rngX));
        pR.setAttribute("cy", String(br.cy + gazeY * rngY));
        const er = Math.max(0.25, blinkK);
        pL.setAttribute("ry", String(15 * er));
        pR.setAttribute("ry", String(15 * er));
      }

      // 外框 + 五官整体联动：体积守恒 squash&stretch + 漂浮 / 歪头 / 前倾 / 弹性抖动
      let ty = 0;
      let sq = 0;
      let rot = 0;
      let skew = 0;
      const alive = cur !== "paused" && !reduceMotion;
      if (alive) {
        sq += 0.022 * Math.sin(tn * 1.9);
        ty += -2 * Math.sin(tn * 1.9);
        if (cur === "ready") {
          ty += -6 * Math.sin(tn * 1.6);
          rot = 1.1 * Math.sin(tn * 1.15);
        }
        if (cur === "thinking") {
          rot = 3.2 * Math.sin(tn * 1.1);
        }
        if (cur === "focused") {
          skew = -3.5 + 1.2 * Math.sin(tn * 3.2);
          sq += 0.01 * Math.sin(tn * 5);
        }
        if (cur === "complete") {
          const j = Math.max(0, Math.sin(tn * 3));
          ty += -14 * j;
          sq += 0.1 * j - 0.03;
        }
        if (now < shakeUntil) {
          const k = (shakeUntil - now) / 520;
          rot += 9 * k * Math.sin((now - shakePhase) * 0.055);
          sq += 0.05 * k * Math.sin((now - shakePhase) * 0.09);
        }
      }
      const sy = 1 + sq;
      const sx = 1 / sy;
      rig.setAttribute(
        "transform",
        `translate(0 ${ty.toFixed(2)}) ` +
          `translate(256 470) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-256 -470) ` +
          `translate(256 300) rotate(${rot.toFixed(2)}) skewX(${skew.toFixed(2)}) translate(-256 -300)`
      );
      rig.setAttribute("opacity", cur === "paused" ? "0.55" : "1");

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (blinkTimer) {
        clearTimeout(blinkTimer);
      }
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className="pointer-events-none block h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <pattern id="mascotJelly" patternUnits="userSpaceOnUse" width="512" height="512">
          <image href={aiEmployeeMascotJelly} x="0" y="0" width="512" height="512" />
        </pattern>
        <filter id="mascotGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#c8ff4d" floodOpacity="0.5" />
        </filter>
      </defs>
      <g ref={rigRef}>
        <image href={aiEmployeeMascotBody} x="0" y="0" width="512" height="512" />
        <g filter="url(#mascotGlow)">
          <path ref={eLRef} fill="url(#mascotJelly)" />
          <path ref={eRRef} fill="url(#mascotJelly)" />
          <path ref={moRef} fill="url(#mascotJelly)" />
          <g ref={pupilsRef} opacity="0">
            <ellipse ref={pLRef} rx="12" ry="15" fill="#141414" />
            <ellipse ref={pRRef} rx="12" ry="15" fill="#141414" />
          </g>
        </g>
      </g>
    </svg>
  );
}
