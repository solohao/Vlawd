import { useState } from "react";
import { Sidebar } from "./Sidebar.js";
import { MinimizeIcon } from "./icons.js";
import { LiveConversationPage } from "./pages/LiveConversationPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { DevicesPage } from "./pages/DevicesPage.js";
import { ModelCenterPage } from "./pages/ModelCenterPage.js";
import { SessionsPage } from "./pages/SessionsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { TaskWorkspacePage } from "./pages/TaskWorkspacePage.js";
import { WorkflowsPage } from "./pages/WorkflowsPage.js";

export type DesktopPage =
  | "dashboard"
  | "conversation"
  | "task"
  | "sessions"
  | "workflows"
  | "models"
  | "devices"
  | "settings";

const pageThemes: Record<DesktopPage, "dark" | "light"> = {
  dashboard: "dark",
  conversation: "light",
  task: "dark",
  sessions: "light",
  workflows: "light",
  models: "light",
  devices: "light",
  settings: "light"
};

export function DesktopApp() {
  const [page, setPage] = useState<DesktopPage>("dashboard");

  const theme = pageThemes[page];

  const minimizeToOverlay = () => {
    window.aiCursorDesktop?.hideMainWindow();
  };

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden transition-colors ${
        theme === "dark" ? "bg-ink-900" : "bg-[#f4f6f2]"
      }`}
      data-theme={theme}
    >
      <Sidebar theme={theme} activeNav={page} onNavigate={(id) => setPage(id as DesktopPage)} />
      <main className="relative flex-1 overflow-y-auto">
        {page === "dashboard" && (
          <DashboardPage
            onStartTask={() => setPage("conversation")}
            onOpenSessions={() => setPage("sessions")}
            onOpenModels={() => setPage("models")}
          />
        )}
        {page === "conversation" && <LiveConversationPage onBack={() => setPage("dashboard")} />}
        {page === "task" && <TaskWorkspacePage />}
        {page === "sessions" && <SessionsPage />}
        {page === "workflows" && <WorkflowsPage />}
        {page === "models" && <ModelCenterPage />}
        {page === "devices" && <DevicesPage />}
        {page === "settings" && <SettingsPage />}

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
