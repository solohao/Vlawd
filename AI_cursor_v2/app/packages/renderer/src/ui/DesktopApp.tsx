import { useState } from "react";
import { FeaturePaint, FeatureStatusProvider } from "../app/feature-status.js";
import { DesktopRuntimeProvider } from "../runtime/useDesktopRuntime.js";
import { Sidebar } from "./Sidebar.js";
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
  dashboard: "light",
  conversation: "light",
  task: "light",
  sessions: "light",
  workflows: "light",
  models: "light",
  devices: "light",
  settings: "light"
};

export function DesktopApp() {
  const [page, setPage] = useState<DesktopPage>("dashboard");

  const theme = pageThemes[page];

  return (
    <FeatureStatusProvider>
      <DesktopRuntimeProvider>
        <div
          className={`flex h-screen w-screen overflow-hidden transition-colors ${
            theme === "dark" ? "bg-ink-900" : "bg-[#fafbf9]"
          }`}
          data-theme={theme}
        >
          <Sidebar theme={theme} activeNav={page} onNavigate={(id) => setPage(id as DesktopPage)} />
          <main className="relative flex-1 overflow-y-auto">
            {page === "dashboard" && (
              <FeaturePaint id="ui.dashboard">
                <DashboardPage
                  onStartTask={() => setPage("conversation")}
                  onOpenSessions={() => setPage("sessions")}
                  onOpenModels={() => setPage("models")}
                />
              </FeaturePaint>
            )}
            {page === "conversation" && (
              <FeaturePaint id="ui.conversation">
                <LiveConversationPage onBack={() => setPage("dashboard")} onOpenModels={() => setPage("models")} />
              </FeaturePaint>
            )}
            {page === "task" && (
              <FeaturePaint id="ui.task">
                <TaskWorkspacePage />
              </FeaturePaint>
            )}
            {page === "sessions" && (
              <FeaturePaint id="ui.sessions">
                <SessionsPage />
              </FeaturePaint>
            )}
            {page === "workflows" && (
              <FeaturePaint id="ui.workflows">
                <WorkflowsPage />
              </FeaturePaint>
            )}
            {page === "models" && (
              <FeaturePaint id="ui.models">
                <ModelCenterPage />
              </FeaturePaint>
            )}
            {page === "devices" && (
              <FeaturePaint id="ui.devices">
                <DevicesPage />
              </FeaturePaint>
            )}
            {page === "settings" && (
              <FeaturePaint id="ui.settings">
                <SettingsPage />
              </FeaturePaint>
            )}
          </main>
        </div>
      </DesktopRuntimeProvider>
    </FeatureStatusProvider>
  );
}
