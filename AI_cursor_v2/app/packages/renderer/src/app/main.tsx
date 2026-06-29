import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { DesktopApp } from "../ui/DesktopApp.js";
import { OverlayApp } from "../ui/runtime/OverlayApp.js";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element");
}

const view = window.location.hash.includes("runtime") ? "runtime" : "main";
document.documentElement.setAttribute("data-view", view);

async function resolveRuntimeState(): Promise<ModelRuntimeState> {
  const api = window.aiCursorDesktop;
  if (!api) {
    return "listening";
  }
  try {
    const snapshot = await api.getSnapshot();
    return snapshot.runtimeState;
  } catch {
    return "listening";
  }
}

const runtimeState = await resolveRuntimeState();

createRoot(container).render(
  <StrictMode>
    {view === "runtime" ? <OverlayApp runtimeState={runtimeState} /> : <DesktopApp />}
  </StrictMode>
);
