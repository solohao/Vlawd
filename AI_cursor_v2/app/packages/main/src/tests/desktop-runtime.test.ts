import { describe, expect, it } from "vitest";
import { MockDesktopRuntime } from "../desktop/mock-desktop-runtime.js";

describe("MockDesktopRuntime", () => {
  it("hydrates the Electron shell with model, audio, runtime, and graph state", () => {
    const runtime = new MockDesktopRuntime();
    const snapshot = runtime.getSnapshot();

    expect(snapshot.modelDownloads).toHaveLength(3);
    expect(snapshot.audio.devices.length).toBeGreaterThan(0);
    expect(snapshot.browser.nextAction.targetLabel).toContain("当前应用");
    expect(snapshot.graph.current_node_id).toBe("current-action");
  });

  it("tracks model storage, download, health, audio, and runtime actions", () => {
    const runtime = new MockDesktopRuntime();

    const selected = runtime.selectModelStorageRoot("D:\\AIModels");
    expect(selected.modelDownloads[0].status).toBe("ready_to_download");

    const downloaded = runtime.startModelDownload("duplex_execution_brain");
    expect(downloaded.modelDownloads[0].status).toBe("downloaded");

    const healthy = runtime.runHealthCheck("duplex_execution_brain");
    expect(healthy.healthChecks[0].state).toBe("healthy");

    const audio = runtime.connectAudio();
    expect(audio.audio.connected).toBe(true);

    const acting = runtime.executeRuntimeAction();
    expect(acting.runtimeState).toBe("acting");
    expect(acting.session.chunks.some((chunk) => chunk.summary.includes("Runtime 悬浮窗"))).toBe(true);
  });
});
