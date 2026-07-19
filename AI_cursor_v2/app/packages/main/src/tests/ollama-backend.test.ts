import { describe, expect, it } from "vitest";
import { PullProgressAccumulator, parseOllamaTags } from "../model/ollama-backend.js";
import { parseNvidiaSmi } from "../model/environment-probe.js";
import { recommendFromResources } from "../model/ollama-catalog.js";

describe("parseOllamaTags", () => {
  it("maps /api/tags entries to model info", () => {
    const models = parseOllamaTags({
      models: [
        { name: "qwen2.5:7b-instruct", size: 4700000000, modified_at: "2024-01-01T00:00:00Z" },
        { name: "llama3.1:8b", size: 4900000000 },
        { size: 1 } as { name?: string; size?: number }
      ]
    });
    expect(models).toHaveLength(2);
    expect(models[0]).toMatchObject({ name: "qwen2.5:7b-instruct", sizeBytes: 4700000000 });
    expect(models[1].sizeBytes).toBe(4900000000);
  });

  it("returns empty list when models missing", () => {
    expect(parseOllamaTags({})).toEqual([]);
  });
});

describe("PullProgressAccumulator", () => {
  it("aggregates completed/total across layers and reports percent", () => {
    const acc = new PullProgressAccumulator("qwen2.5:7b-instruct");
    expect(acc.ingest({ status: "pulling manifest" }).phase).toBe("resolving");

    acc.ingest({ status: "downloading", digest: "sha256:a", total: 100, completed: 0 });
    const half = acc.ingest({ status: "downloading", digest: "sha256:a", total: 100, completed: 50 });
    expect(half.phase).toBe("downloading");
    expect(half.percent).toBe(50);

    const twoLayers = acc.ingest({ status: "downloading", digest: "sha256:b", total: 100, completed: 100 });
    // layer a=50/100, layer b=100/100 → 150/200 = 75%
    expect(twoLayers.percent).toBe(75);

    const done = acc.ingest({ status: "success" });
    expect(done.phase).toBe("success");
    expect(done.percent).toBe(100);
  });

  it("surfaces errors", () => {
    const acc = new PullProgressAccumulator("bad:model");
    const progress = acc.ingest({ error: "model not found" });
    expect(progress.phase).toBe("error");
    expect(progress.message).toBe("model not found");
  });
});

describe("parseNvidiaSmi", () => {
  it("parses csv rows with name/total/free", () => {
    const gpus = parseNvidiaSmi("NVIDIA GeForce RTX 4060, 8188, 7900\n");
    expect(gpus).toHaveLength(1);
    expect(gpus[0]).toEqual({ name: "NVIDIA GeForce RTX 4060", vramTotalMB: 8188, vramFreeMB: 7900 });
  });

  it("skips malformed lines", () => {
    expect(parseNvidiaSmi("\n garbage \n , , \n")).toEqual([]);
  });
});

describe("recommendFromResources", () => {
  it("recommends 7B for 8GB+ VRAM", () => {
    const rec = recommendFromResources([{ name: "RTX 4060", vramTotalMB: 8188, vramFreeMB: 8000 }], 16);
    expect(rec.brainModel).toBe("qwen2.5:7b-instruct");
    expect(rec.canRunRealModel).toBe(true);
  });

  it("recommends 3B for mid VRAM", () => {
    const rec = recommendFromResources([{ name: "GTX 1650", vramTotalMB: 4096, vramFreeMB: 4000 }], 16);
    expect(rec.brainModel).toBe("qwen2.5:3b-instruct");
  });

  it("falls back to CPU 3B with enough RAM and no GPU", () => {
    const rec = recommendFromResources([], 16);
    expect(rec.canRunRealModel).toBe(true);
    expect(rec.presetId).toBe("zh-real-time-supervision");
  });

  it("recommends developer mock on low resources", () => {
    const rec = recommendFromResources([], 4);
    expect(rec.presetId).toBe("developer-mock");
    expect(rec.canRunRealModel).toBe(false);
  });
});
