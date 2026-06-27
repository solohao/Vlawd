import { useState } from "react";
import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { Sidebar } from "./Sidebar.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ModelCenterPage } from "./pages/ModelCenterPage.js";
import { VoiceController } from "./runtime/VoiceController.js";

type Page = "dashboard" | "model_center";

interface DesktopAppProps {
  runtimeState?: ModelRuntimeState;
}

export function DesktopApp({ runtimeState = "listening" }: DesktopAppProps) {
  const [page, setPage] = useState<Page>("dashboard");
  const [showVoice, setShowVoice] = useState(true);

  const theme = page === "dashboard" ? "dark" : "light";
  const activeNav = page === "dashboard" ? "dashboard" : "settings";

  const navigate = (id: string) => {
    if (id === "settings") setPage("model_center");
    else setPage("dashboard");
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === "dark" ? "bg-ink-900" : "bg-[#f4f6f2]"}`}>
      <Sidebar theme={theme} activeNav={activeNav} onNavigate={navigate} />
      <main className="relative flex-1 overflow-y-auto">
        {page === "dashboard" ? <DashboardPage /> : <ModelCenterPage />}

        {showVoice && (
          <div className="pointer-events-none fixed right-6 top-6 z-30">
            <div className="pointer-events-auto">
              <VoiceController runtimeState={runtimeState} />
            </div>
          </div>
        )}

        <button
          onClick={() => setShowVoice((v) => !v)}
          className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-400 shadow-[0_10px_30px_rgba(164,209,0,0.5)] transition-transform hover:scale-105"
          aria-label="toggle voice controller"
        >
          <img src="/ai-employee-avatar-compact.png" alt="" className="h-9 w-9 object-contain" />
        </button>
      </main>
    </div>
  );
}
