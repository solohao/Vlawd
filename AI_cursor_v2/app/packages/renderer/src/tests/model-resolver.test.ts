import { describe, expect, it } from "vitest";
import type { EnvironmentProbe } from "@ai-cursor-v2/shared";
import { intentTemplates, modelCatalog } from "../ui/pages/model-catalog.js";
import {
  classify,
  deviceFromProbe,
  rankSlot,
  resolvePreset,
  type DeviceProfile,
  type IntentTemplate
} from "../ui/pages/model-resolver.js";

const balanced = intentTemplates.find((t) => t.id === "balanced") as IntentTemplate;
const quality = intentTemplates.find((t) => t.id === "quality") as IntentTemplate;
const local = intentTemplates.find((t) => t.id === "local") as IntentTemplate;

const highEnd: DeviceProfile = { vramMB: 65536, ramGB: 128, hasGpu: true, gpuName: "RTX 6000" };
const midEnd: DeviceProfile = { vramMB: 8192, ramGB: 32, hasGpu: true, gpuName: "RTX 3060" };
const lowEnd: DeviceProfile = { vramMB: 0, ramGB: 16, hasGpu: false, gpuName: null };

function probe(overrides: Partial<EnvironmentProbe>): EnvironmentProbe {
  return {
    probedAt: "2026-01-01T00:00:00Z",
    platform: "win32",
    arch: "x64",
    cpuCores: 8,
    totalRamGB: 32,
    freeRamGB: 20,
    gpus: [],
    disk: null,
    recommendedPresetId: "balanced",
    recommendedBrainModel: "qwen2.5:7b",
    recommendationReason: "",
    canRunRealModel: true,
    ...overrides
  };
}

describe("deviceFromProbe", () => {
  it("falls back to a mid-range assumption when no probe is available", () => {
    expect(deviceFromProbe(null)).toEqual({ vramMB: 8192, ramGB: 16, hasGpu: true, gpuName: null });
  });

  it("picks the strongest GPU and marks CPU-only when there is no vram", () => {
    expect(deviceFromProbe(probe({ gpus: [{ name: "A", vramTotalMB: 6000, vramFreeMB: 5000 }, { name: "B", vramTotalMB: 12000, vramFreeMB: 10000 }] }))).toEqual(
      { vramMB: 12000, ramGB: 32, hasGpu: true, gpuName: "B" }
    );
    expect(deviceFromProbe(probe({ gpus: [], totalRamGB: 16 }))).toEqual({ vramMB: 0, ramGB: 16, hasGpu: false, gpuName: null });
  });
});

describe("classify", () => {
  const big = modelCatalog.find((m) => m.id === "qwen2.5-72b-q4")!;
  const mid = modelCatalog.find((m) => m.id === "qwen2.5-14b-q4")!;
  const small = modelCatalog.find((m) => m.id === "qwen2.5-7b-q4")!;

  it("grades a model against continuous device parameters", () => {
    expect(classify(big, highEnd)).toBe("smooth");
    // 8G 显存放不下 72B，且 32G 内存低于其 CPU 最低要求 → 不可运行
    expect(classify(big, midEnd)).toBe("insufficient");
    // 14B 放不进 8G 显存，但 32G 内存可 CPU 兜底
    expect(classify(mid, midEnd)).toBe("cpu");
    // 7B 能加载进 8G 显存但吃紧（低于推荐显存）
    expect(classify(small, midEnd)).toBe("tight");
    expect(classify(small, lowEnd)).toBe("cpu");
  });

  it("marks insufficient when neither vram nor ram is enough", () => {
    expect(classify(big, { vramMB: 0, ramGB: 8, hasGpu: false, gpuName: null })).toBe("insufficient");
  });
});

describe("rankSlot", () => {
  it("ranks runnable models ahead of unrunnable ones", () => {
    const ranked = rankSlot("thinking", modelCatalog, quality, midEnd);
    const firstInsufficient = ranked.findIndex((r) => r.runnability === "insufficient");
    const lastRunnable = ranked.map((r) => r.runnability !== "insufficient").lastIndexOf(true);
    // 所有可运行的都排在不可运行的前面
    expect(firstInsufficient === -1 || firstInsufficient > lastRunnable).toBe(true);
  });

  it("excludes cloud models under a local-only template", () => {
    const ranked = rankSlot("thinking", modelCatalog, local, highEnd);
    expect(ranked.some((r) => r.model.id === "gpt-4o-cloud")).toBe(false);
    const withCloud = rankSlot("thinking", modelCatalog, balanced, highEnd);
    expect(withCloud.some((r) => r.model.id === "gpt-4o-cloud")).toBe(true);
  });
});

describe("resolvePreset — 同一意图按设备解析出不同组合", () => {
  it("high-end device resolves to a large execution brain", () => {
    const resolved = resolvePreset(quality, modelCatalog, highEnd, "pipeline");
    expect(resolved.slots.executionBrain.model?.baseId).toBe("qwen2.5-72b");
    expect(resolved.slots.executionBrain.runnability).toBe("smooth");
  });

  it("mid-range device downshifts the execution brain to something that fits", () => {
    const resolved = resolvePreset(quality, modelCatalog, midEnd, "pipeline");
    expect(resolved.slots.executionBrain.model?.minVramMB).toBeLessThanOrEqual(8192 * 0.9);
    expect(resolved.slots.executionBrain.runnability).not.toBe("insufficient");
  });

  it("duplex co-residency budget keeps the sum of vram within the device", () => {
    const resolved = resolvePreset(balanced, modelCatalog, midEnd, "duplex");
    const gpuVram = Object.values(resolved.slots)
      .filter((s) => s.runnability === "smooth" || s.runnability === "tight")
      .reduce((sum, s) => sum + (s.model?.minVramMB ?? 0), 0);
    expect(gpuVram).toBeLessThanOrEqual(Math.floor(midEnd.vramMB * 0.9));
  });

  it("pipeline places a larger GPU brain than duplex when GPU budget is the constraint", () => {
    const device: DeviceProfile = { vramMB: 16384, ramGB: 64, hasGpu: true, gpuName: "RTX 4080" };
    const pipe = resolvePreset(quality, modelCatalog, device, "pipeline");
    const duplex = resolvePreset(quality, modelCatalog, device, "duplex");
    // 两者都把执行大脑放在 GPU 上，但端到端要与其余角色共驻，可用显存更少
    expect(pipe.slots.executionBrain.onCpu).toBe(false);
    expect(duplex.slots.executionBrain.onCpu).toBe(false);
    const pipeVram = pipe.slots.executionBrain.model?.minVramMB ?? 0;
    const duplexVram = duplex.slots.executionBrain.model?.minVramMB ?? 0;
    expect(pipeVram).toBeGreaterThan(duplexVram);
  });

  it("cpu-only device selects lightweight models and notes the fallback", () => {
    const resolved = resolvePreset(balanced, modelCatalog, lowEnd, "pipeline");
    expect(resolved.slots.executionBrain.onCpu).toBe(true);
    expect(resolved.notes.join()).toContain("CPU");
  });
});
