import { useState } from "react";
import { Sidebar } from "./Sidebar.js";
import { MinimizeIcon } from "./icons.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ModelCenterPage } from "./pages/ModelCenterPage.js";

type Page = "dashboard" | "model_center";

export function DesktopApp() {
  const [page, setPage] = useState<Page>("dashboard");

  const theme = page === "dashboard" ? "dark" : "light";
  const activeNav = page === "dashboard" ? "dashboard" : "settings";

  const navigate = (id: string) => {
    if (id === "settings") setPage("model_center");
    else setPage("dashboard");
  };

  const minimizeToOverlay = () => {
    window.aiCursorDesktop?.hideMainWindow();
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === "dark" ? "bg-ink-900" : "bg-[#f4f6f2]"}`}>
      <Sidebar theme={theme} activeNav={activeNav} onNavigate={navigate} />
      <main className="relative flex-1 overflow-y-auto">
        {page === "dashboard" ? <DashboardPage /> : <ModelCenterPage />}

        <button
          onClick={minimizeToOverlay}
          className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-medium shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.03] ${
            theme === "dark" ? "bg-ink-700 text-slate-200 hover:bg-ink-600" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <MinimizeIcon width={15} height={15} /> 最小化到悬浮窗
        </button>
      </main>
    </div>
  );
}
