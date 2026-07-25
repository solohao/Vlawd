import { useEffect, useState } from "react";
import { FeatureStatusProvider } from "../app/feature-status.js";
import { AnomalyMonitor } from "../app/AnomalyMonitor.js";
import { useDesktopRuntime } from "../runtime/useDesktopRuntime.js";
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
  const desktop = useDesktopRuntime();

  // 当研究任务生成了新的动作提案时，自动跳转到任务空间；用户手动切页不应被覆盖
  useEffect(() => {
    if (page !== "task" && desktop.snapshot.browser.nextAction?.actionType) {
      setPage("task");
    }
  }, [desktop.snapshot.browser.nextAction]);

  // 离开任务空间时关闭 BrowserView，避免悬浮窗遮挡其他页面。
  useEffect(() => {
    if (page !== "task") {
      void desktop.browserClose().catch(() => undefined);
    }
  }, [page]);

  const theme = pageThemes[page];

  return (
    <FeatureStatusProvider>
      <div
          className={`flex h-screen w-screen overflow-hidden transition-colors ${
            theme === "dark" ? "bg-ink-900" : "bg-[#fafbf9]"
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
            {page === "conversation" && (
              <LiveConversationPage onBack={() => setPage("dashboard")} onOpenModels={() => setPage("models")} />
            )}
            {page === "task" && <TaskWorkspacePage />}
            {page === "sessions" && <SessionsPage onOpenTask={() => setPage("task")} />}
            {page === "workflows" && <WorkflowsPage />}
            {page === "models" && <ModelCenterPage />}
            {page === "devices" && <DevicesPage />}
            {page === "settings" && <SettingsPage />}
          </main>

          {/* 异常检测监控面板 */}
          <AnomalyMonitor />
        </div>
    </FeatureStatusProvider>
  );
}
