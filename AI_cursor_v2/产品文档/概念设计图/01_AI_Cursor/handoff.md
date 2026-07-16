# AI Cursor 前端复刻 Handoff

## 页面优先级

### P0：Cycle 1–3 核心

1. App Shell 与真实导航。
2. 工作台深色/浅色投影。
3. 对话入口与权限配置。
4. Runtime 状态总览、Voice Capsule、暂停/取消/接管。
5. 受监督任务工作区与动作确认。
6. Session 列表、详情、Evidence 与恢复。
7. 模型中心、设备中心、设置与隐私。

### P1：基础体验完整性

- Empty、Loading、Offline、Permission blocked、Provider error。
- Workflow Library 与 Builder 的 UI 骨架。
- Session Graph 与多任务概览。

### Deferred

- 真实 BrowserView/CDP、系统输入执行、多 Provider 并发。
- 高级 Workflow 市场、Knowledge、Integrations。
- Capsule、Registry 与 Agentic Web 后端。

## 页面到代码映射

| 设计区 | 推荐路由 | 主要组件 |
|---|---|---|
| 首次启动与权限 | `/onboarding` | PermissionCard、DeviceCheck、PrivacySummary |
| 对话入口 | `/conversation` | EntryModeCard、DeviceSelector |
| 工作台 | `/dashboard` | StatusHero、QuickAction、ActiveTask、RecentSession |
| 任务工作区 | `/task/:id` | StepTimeline、WorkspaceViewport、SessionRail、VoiceCapsule |
| Session 列表 | `/sessions` | SessionFilter、SessionTable |
| Session 详情 | `/sessions/:id` | EvidenceSummary、EventTimeline、ResumeAnchor |
| Session Graph | `/sessions/:id/graph` | GraphCanvas、NodeInspector |
| 工作流库 | `/workflows` | WorkflowCard、WorkflowFilter |
| 工作流编辑器 | `/workflows/:id` | WorkflowCanvas、StepInspector |
| 模型中心 | `/models` | ProviderCard、HealthBadge、ModelTable |
| 设备中心 | `/devices` | DeviceCard、LevelMeter |
| 设置与隐私 | `/settings` | SettingsSection、RetentionControl、DangerZone |

## 主题

- Dashboard、Task Workspace、Runtime Overlay 默认深色。
- Conversation、Model Center、Session 阅读与 Settings 默认浅色。
- 页面主题是首选投影，不应通过页面枚举硬编码；Shell 接收 `light | dark | system`。
- Token 来源：`../00_设计系统/design-tokens.json`。

## 数据与状态

- 页面必须消费统一 ViewModel，不直接拼接 Runtime 内部对象。
- Mock 数据统一标记 `demo`，禁止把示例状态显示为真实健康状态。
- Runtime 使用事件订阅更新，不只读取启动 snapshot。
- Pending Proposal 必须包含目标、动作、风险、影响范围、来源和 postcondition。
- Session 必须区分 User、AI、Runtime、Safety 与 Evidence 事件。

## 实现顺序

```text
tokens + primitives
→ shell + navigation
→ dashboard + conversation
→ runtime state projection
→ task workspace + confirmation
→ sessions + evidence
→ models + devices + settings
→ error/empty/offline states
```
