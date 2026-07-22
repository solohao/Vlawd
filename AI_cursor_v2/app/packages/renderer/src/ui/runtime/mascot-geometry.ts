// Rive 式精灵的纯几何工具：顶点重采样 + 逐点插值 + Catmull-Rom 平滑闭合路径。
// 与概念原型 rive-style-matrix.html 中的算法一致，抽出为可测试的纯函数供生产组件复用。
import type { MascotPoint } from "./mascot-states.js";

/** 用 Catmull-Rom 把闭合多边形顶点转成平滑的 SVG path（三次贝塞尔）。 */
export function pathFrom(pts: MascotPoint[]): string {
  const n = pts.length;
  const g = (i: number): MascotPoint => pts[((i % n) + n) % n];
  let d = `M ${g(0)[0].toFixed(2)} ${g(0)[1].toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = g(i - 1);
    const p1 = g(i);
    const p2 = g(i + 1);
    const p3 = g(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)} `;
  }
  return `${d}Z`;
}

/** 把闭合多边形按弧长重采样为 n 点，并把起点旋转到最顶端，改善逐点对应关系（供 morph）。 */
export function resample(pts: MascotPoint[], n: number): MascotPoint[] {
  const m = pts.length;
  const closed = [...pts, pts[0]];
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < m; i++) {
    const a = closed[i];
    const b = closed[i + 1];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push(d);
    total += d;
  }
  const out: MascotPoint[] = [];
  const step = total / n;
  let si = 0;
  let sacc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (si < m - 1 && sacc + seg[si] < target) {
      sacc += seg[si];
      si++;
    }
    const a = closed[si];
    const b = closed[si + 1];
    const t = seg[si] ? (target - sacc) / seg[si] : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  let mi = 0;
  let my = Number.POSITIVE_INFINITY;
  out.forEach((p, i) => {
    if (p[1] < my) {
      my = p[1];
      mi = i;
    }
  });
  return out.slice(mi).concat(out.slice(0, mi));
}

/** 逐点线性插值（两组点数需一致，均为 resample 后的 N 点）。 */
export function lerpPoints(a: MascotPoint[], b: MascotPoint[], t: number): MascotPoint[] {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t] as MascotPoint);
}

export function centroid(p: MascotPoint[]): MascotPoint {
  let x = 0;
  let y = 0;
  for (const q of p) {
    x += q[0];
    y += q[1];
  }
  return [x / p.length, y / p.length];
}

/** 以质心为中心纵向缩放（眨眼压扁 / 张嘴）。 */
export function scaleY(p: MascotPoint[], k: number): MascotPoint[] {
  const [, cy] = centroid(p);
  return p.map((q) => [q[0], cy + (q[1] - cy) * k] as MascotPoint);
}

export interface BBox {
  cx: number;
  cy: number;
}

export function bbox(p: MascotPoint[]): BBox {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const q of p) {
    x0 = Math.min(x0, q[0]);
    y0 = Math.min(y0, q[1]);
    x1 = Math.max(x1, q[0]);
    y1 = Math.max(y1, q[1]);
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
