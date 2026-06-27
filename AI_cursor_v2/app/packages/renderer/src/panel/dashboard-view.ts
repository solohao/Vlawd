import type { ConversationEndpointRoute, ModelRuntimeState, WorkflowModelBinding } from "@ai-cursor-v2/shared";
import type { AiCursorTheme, AiEmployeeAvatarAsset } from "../brand/ai-employee.js";
import { selectAiEmployeeAvatar } from "../brand/ai-employee.js";
import type { ConversationEntryRow } from "./conversation-entry-view.js";
import { toConversationEntryRows } from "./conversation-entry-view.js";
import type { ModelSlotRow, ModelStorageRow } from "./model-configuration-view.js";
import { toModelSlotRows, toModelStorageRow } from "./model-configuration-view.js";

export type DashboardAction = "start_supervised_work" | "open_conversation_entry" | "open_workflows" | "open_session_log";

export interface DashboardStatusCard {
  title: "Safety Engine" | "Execution Brain" | "Record Notebook";
  state: "ready" | "running" | "syncing" | "locked";
  summary: string;
}

export interface DashboardWorkflowCard {
  id: string;
  title: string;
  description: string;
  lastRunLabel: string;
  successRateLabel: string;
  action: "run_under_supervision";
}

export interface DashboardSessionRow {
  id: string;
  title: string;
  category: string;
  status: "completed" | "cancelled" | "active";
  updatedAtLabel: string;
  summary: string;
}

export interface DashboardViewModel {
  pageId: "dashboard";
  theme: AiCursorTheme;
  avatar: AiEmployeeAvatarAsset;
  greeting: string;
  readinessLabel: string;
  runtimeState: ModelRuntimeState;
  primaryActions: { label: string; action: DashboardAction }[];
  conversationEntryRows: ConversationEntryRow[];
  modelSlots: ModelSlotRow[];
  modelStorage: ModelStorageRow;
  statusCards: DashboardStatusCard[];
  workflows: DashboardWorkflowCard[];
  recentSessions: DashboardSessionRow[];
}

export function createDashboardViewModel(input: {
  userName: string;
  theme: AiCursorTheme;
  runtimeState: ModelRuntimeState;
  conversationRoute: ConversationEndpointRoute;
  audioDevices: Parameters<typeof toConversationEntryRows>[1];
  modelBinding: WorkflowModelBinding;
}): DashboardViewModel {
  return {
    pageId: "dashboard",
    theme: input.theme,
    avatar: selectAiEmployeeAvatar(input.theme, false),
    greeting: `下午好，${input.userName}`,
    readinessLabel: "AI 员工已就绪",
    runtimeState: input.runtimeState,
    primaryActions: [
      { label: "开始新任务", action: "start_supervised_work" },
      { label: "导入任务", action: "open_workflows" },
      { label: "语音设置", action: "open_conversation_entry" },
      { label: "查看全部 Session", action: "open_session_log" }
    ],
    conversationEntryRows: toConversationEntryRows(input.conversationRoute, input.audioDevices),
    modelSlots: toModelSlotRows(input.modelBinding),
    modelStorage: toModelStorageRow(input.modelBinding.modelStorage),
    statusCards: [
      { title: "Safety Engine", state: "locked", summary: "本地安全抢占始终开启，高风险动作需要确认" },
      { title: "Execution Brain", state: "ready", summary: `${input.modelBinding.executionBrain.kind} 已准备对话与执行` },
      { title: "Record Notebook", state: "syncing", summary: "Session chunks 本地记录中，可沉淀工作流" }
    ],
    workflows: [
      {
        id: "market-research-assistant",
        title: "市场调研助手",
        description: "收集资料、填写表格并生成出差计划",
        lastRunLabel: "今天 14:32",
        successRateLabel: "92%",
        action: "run_under_supervision"
      },
      {
        id: "mail-processing-assistant",
        title: "邮件处理助手",
        description: "整理客户反馈并生成回复草稿",
        lastRunLabel: "今天 11:08",
        successRateLabel: "89%",
        action: "run_under_supervision"
      }
    ],
    recentSessions: [
      {
        id: "session-mail-summary",
        title: "处理客户反馈邮件并生成总结",
        category: "邮件处理",
        status: "completed",
        updatedAtLabel: "今天 14:32",
        summary: "AI 帮助浏览 12 封邮件，提取关键词并生成回复草稿。"
      },
      {
        id: "session-budget-form",
        title: "填写供应商信息表单",
        category: "表单填写",
        status: "completed",
        updatedAtLabel: "昨天 16:45",
        summary: "在内部系统中填写并提交供应商信息表单。"
      }
    ]
  };
}
