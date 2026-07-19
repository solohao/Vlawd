import { afterEach, describe, expect, it, vi } from "vitest";
import { parseOpenAiModels } from "../model/model-backend.js";
import { CustomEndpointBackend, normalizeCustomEndpoint } from "../model/custom-backend.js";
import { LMStudioBackend } from "../model/lmstudio-backend.js";

function mockFetchOnce(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status,
      json: async () => body
    }))
  );
}

function mockFetchReject(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseOpenAiModels", () => {
  it("maps /v1/models data entries to model info", () => {
    const models = parseOpenAiModels({
      data: [{ id: "qwen2.5-7b-instruct" }, { id: "llama-3.1-8b" }, { object: "model" }]
    });
    expect(models).toHaveLength(2);
    expect(models[0]).toEqual({ name: "qwen2.5-7b-instruct", sizeBytes: 0 });
  });

  it("returns empty list when data missing", () => {
    expect(parseOpenAiModels({})).toEqual([]);
  });
});

describe("normalizeCustomEndpoint", () => {
  it("appends /v1 when absent and strips trailing slashes", () => {
    expect(normalizeCustomEndpoint("http://127.0.0.1:8000/")).toBe("http://127.0.0.1:8000/v1");
    expect(normalizeCustomEndpoint("  http://host:9000  ")).toBe("http://host:9000/v1");
  });

  it("keeps an existing /vN suffix", () => {
    expect(normalizeCustomEndpoint("http://127.0.0.1:1234/v1")).toBe("http://127.0.0.1:1234/v1");
    expect(normalizeCustomEndpoint("http://host/v2")).toBe("http://host/v2");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeCustomEndpoint("   ")).toBe("");
  });
});

describe("LMStudioBackend", () => {
  it("never supports in-app pull and exposes the :1234 OpenAI endpoint", () => {
    const backend = new LMStudioBackend();
    expect(backend.supportsPull).toBe(false);
    expect(backend.openaiEndpoint).toBe("http://127.0.0.1:1234/v1");
  });

  it("reports running with loaded models when server responds", async () => {
    mockFetchOnce({ data: [{ id: "qwen2.5-7b-instruct" }] });
    const result = await new LMStudioBackend().detect();
    expect(result.status).toBe("running");
    expect(result.installedModels).toHaveLength(1);
  });

  it("reports not_installed when server is unreachable", async () => {
    mockFetchReject();
    const result = await new LMStudioBackend().detect();
    expect(result.status).toBe("not_installed");
    expect(result.installedModels).toEqual([]);
  });
});

describe("CustomEndpointBackend", () => {
  it("never supports in-app pull", () => {
    expect(new CustomEndpointBackend({ baseUrl: "", model: "" }).supportsPull).toBe(false);
  });

  it("stays not_installed and does not fetch when unconfigured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await new CustomEndpointBackend({ baseUrl: "", model: "" }).detect();
    expect(result.status).toBe("not_installed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("connects and lists models when the endpoint responds", async () => {
    mockFetchOnce({ data: [{ id: "local-model" }] });
    const backend = new CustomEndpointBackend({ baseUrl: "http://127.0.0.1:8000", model: "local-model" });
    expect(backend.openaiEndpoint).toBe("http://127.0.0.1:8000/v1");
    const result = await backend.detect();
    expect(result.status).toBe("running");
    expect(result.installedModels[0]?.name).toBe("local-model");
  });

  it("reports failure when the endpoint is unreachable", async () => {
    mockFetchReject();
    const backend = new CustomEndpointBackend({ baseUrl: "http://127.0.0.1:8000", model: "x" });
    const result = await backend.detect();
    expect(result.status).toBe("not_installed");
  });

  it("re-reads endpoint after configure()", () => {
    const backend = new CustomEndpointBackend({ baseUrl: "", model: "" });
    backend.configure({ baseUrl: "http://host:9000", model: "m" });
    expect(backend.openaiEndpoint).toBe("http://host:9000/v1");
  });
});
