import type { ConversationEndpointRoute, WorkflowModelBinding } from "@ai-cursor-v2/shared";
import type { AiCursorTheme } from "../brand/ai-employee.js";
import type { ConversationEntryOption, ConversationEntryRow } from "./conversation-entry-view.js";
import { toConversationEntryOptions, toConversationEntryRows } from "./conversation-entry-view.js";
import type { DashboardViewModel } from "./dashboard-view.js";
import { createDashboardViewModel } from "./dashboard-view.js";
import type { ModelSlotRow, ModelStorageRow } from "./model-configuration-view.js";
import { toModelSlotRows, toModelStorageRow } from "./model-configuration-view.js";

export type DesktopPageId = "dashboard" | "conversation_entry" | "model_center" | "workflows" | "session_log";

export interface DesktopPageDefinition {
  id: DesktopPageId;
  title: string;
  surface: "electron_window";
  purpose: string;
}

export interface ConversationEntryPageViewModel {
  pageId: "conversation_entry";
  title: "对话入口选择";
  rows: ConversationEntryRow[];
  options: ConversationEntryOption[];
  safetyPreemptionHint: string;
}

export interface ModelCenterPageViewModel {
  pageId: "model_center";
  title: "模型中心";
  slots: ModelSlotRow[];
  storage: ModelStorageRow;
  quickActions: ("test_models" | "choose_storage" | "import_model")[];
}

export interface DesktopPageRegistry {
  pages: DesktopPageDefinition[];
  dashboard: DashboardViewModel;
  conversationEntry: ConversationEntryPageViewModel;
  modelCenter: ModelCenterPageViewModel;
}

export function createDesktopPageRegistry(input: {
  userName: string;
  theme: AiCursorTheme;
  conversationRoute: ConversationEndpointRoute;
  audioDevices: Parameters<typeof toConversationEntryOptions>[0];
  modelBinding: WorkflowModelBinding;
}): DesktopPageRegistry {
  return {
    pages: [
      {
        id: "dashboard",
        title: "首页 / 工作台",
        surface: "electron_window",
        purpose: "展示 AI 员工就绪状态、受监督任务入口、最近 Session 和三角色状态。"
      },
      {
        id: "conversation_entry",
        title: "对话入口选择",
        surface: "electron_window",
        purpose: "连接耳机、电脑麦克风、扬声器或手动入口，启动全双工监督。"
      },
      {
        id: "model_center",
        title: "模型中心",
        surface: "electron_window",
        purpose: "配置 Execution Brain、Record Notebook 与固定 Safety Engine。"
      },
      {
        id: "workflows",
        title: "工作流库",
        surface: "electron_window",
        purpose: "管理从 Session 沉淀出的可复用桌面任务流程。"
      },
      {
        id: "session_log",
        title: "Session 记录",
        surface: "electron_window",
        purpose: "查看完整 Session chunks、Graph、产物和导出记录。"
      }
    ],
    dashboard: createDashboardViewModel({
      userName: input.userName,
      theme: input.theme,
      runtimeState: "listening",
      conversationRoute: input.conversationRoute,
      audioDevices: input.audioDevices,
      modelBinding: input.modelBinding
    }),
    conversationEntry: {
      pageId: "conversation_entry",
      title: "对话入口选择",
      rows: toConversationEntryRows(input.conversationRoute, input.audioDevices),
      options: toConversationEntryOptions(input.audioDevices),
      safetyPreemptionHint: "暂停、取消、停止、接管等本地安全抢占指令始终开启。"
    },
    modelCenter: {
      pageId: "model_center",
      title: "模型中心",
      slots: toModelSlotRows(input.modelBinding),
      storage: toModelStorageRow(input.modelBinding.modelStorage),
      quickActions: ["test_models", "choose_storage", "import_model"]
    }
  };
}
