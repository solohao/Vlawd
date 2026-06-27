import type { ModelRuntimeState } from "@ai-cursor-v2/shared";

export type AiCursorTheme = "light" | "dark";
export type AiEmployeeAvatarVariant = "with-base" | "compact";

export interface AiEmployeeAvatarAsset {
  variant: AiEmployeeAvatarVariant;
  theme: AiCursorTheme;
  src: string;
  role: "app-presence" | "runtime-status";
  usage: string;
}

export interface RuntimeStateToken {
  state: ModelRuntimeState;
  label: string;
  tone: "green" | "yellow" | "red" | "gray";
}

export const aiEmployeeAvatarAssets: AiEmployeeAvatarAsset[] = [
  {
    variant: "with-base",
    theme: "light",
    src: "assets/ai-employee-avatar-with-base.png",
    role: "app-presence",
    usage: "主窗口、Onboarding、对话入口选择等需要情绪锚点的页面"
  },
  {
    variant: "compact",
    theme: "dark",
    src: "assets/ai-employee-avatar-compact.png",
    role: "runtime-status",
    usage: "运行时顶部胶囊、动作卡、深色 overlay 状态标识"
  }
];

export const runtimeStateTokens: RuntimeStateToken[] = [
  { state: "listening", label: "Listening", tone: "green" },
  { state: "speaking", label: "Speaking", tone: "green" },
  { state: "thinking", label: "Thinking", tone: "yellow" },
  { state: "acting", label: "Acting", tone: "green" },
  { state: "waiting_confirm", label: "Waiting confirmation", tone: "yellow" },
  { state: "paused", label: "Paused", tone: "gray" },
  { state: "interrupted", label: "Interrupted", tone: "red" },
  { state: "complete", label: "Complete", tone: "green" }
];

export function selectAiEmployeeAvatar(theme: AiCursorTheme, runtime: boolean): AiEmployeeAvatarAsset {
  const preferredVariant: AiEmployeeAvatarVariant = runtime ? "compact" : "with-base";
  return (
    aiEmployeeAvatarAssets.find((asset) => asset.variant === preferredVariant && asset.theme === theme) ??
    aiEmployeeAvatarAssets.find((asset) => asset.variant === preferredVariant) ??
    aiEmployeeAvatarAssets[0]
  );
}

export function runtimeStateToken(state: ModelRuntimeState): RuntimeStateToken {
  const token = runtimeStateTokens.find((candidate) => candidate.state === state);
  if (!token) {
    return { state, label: state, tone: "gray" };
  }
  return token;
}
