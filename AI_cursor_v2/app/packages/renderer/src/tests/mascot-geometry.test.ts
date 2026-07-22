import { describe, expect, it } from "vitest";
import type { MascotPoint } from "../ui/runtime/mascot-states.js";
import { bbox, centroid, lerpPoints, pathFrom, resample, scaleY } from "../ui/runtime/mascot-geometry.js";
import { MASCOT_STATES } from "../ui/runtime/mascot-states.js";

const square: MascotPoint[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10]
];

describe("mascot-geometry", () => {
  it("resamples any polygon to the requested point count", () => {
    for (const key of Object.keys(MASCOT_STATES) as (keyof typeof MASCOT_STATES)[]) {
      const shape = MASCOT_STATES[key];
      expect(resample(shape.eyeL, 56)).toHaveLength(56);
      expect(resample(shape.eyeR, 56)).toHaveLength(56);
      expect(resample(shape.mouth, 56)).toHaveLength(56);
    }
  });

  it("resampled polygons across states share point counts so lerp is index-aligned", () => {
    const from = resample(MASCOT_STATES.ready.mouth, 56);
    const to = resample(MASCOT_STATES.complete.mouth, 56);
    expect(from).toHaveLength(to.length);
    const mid = lerpPoints(from, to, 0.5);
    expect(mid).toHaveLength(56);
    expect(mid[0][0]).toBeCloseTo((from[0][0] + to[0][0]) / 2, 5);
    expect(mid[0][1]).toBeCloseTo((from[0][1] + to[0][1]) / 2, 5);
  });

  it("lerp returns the endpoints at t=0 and t=1", () => {
    const from = resample(square, 32);
    const to = resample(MASCOT_STATES.ready.eyeL, 32);
    expect(lerpPoints(from, to, 0)).toEqual(from);
    expect(lerpPoints(from, to, 1)).toEqual(to);
  });

  it("scaleY stretches around the centroid without moving x", () => {
    const scaled = scaleY(square, 2);
    const [, cy] = centroid(square);
    expect(cy).toBeCloseTo(5, 5);
    scaled.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(square[i][0], 5);
      expect(p[1]).toBeCloseTo(cy + (square[i][1] - cy) * 2, 5);
    });
  });

  it("bbox reports the geometric center", () => {
    const box = bbox(square);
    expect(box.cx).toBeCloseTo(5, 5);
    expect(box.cy).toBeCloseTo(5, 5);
  });

  it("pathFrom emits a closed cubic path", () => {
    const d = pathFrom(resample(square, 16));
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trimEnd().endsWith("Z")).toBe(true);
    expect(d).toContain("C ");
  });
});
