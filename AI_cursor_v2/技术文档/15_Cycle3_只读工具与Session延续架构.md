# Cycle 3：只读工具链与 Session 延续架构

## 1. 设计目标

Cycle 3 的验收标准可以概括为一句话：

> 用户打开昨日研究 Session，查看结论、来源、纠正和未解决问题；Runtime 重新验证页面和权限后，从一个明确分支继续。

为支撑这一目标，Cycle 3 在已有 Cycle 2 的只读 BrowserView 之上补充两块能力：

1. **核心只读工具注册表（Core Tool Registry）**：把 AI 可调用的能力固化为有限、可发现、可描述的只读工具，避免 Phase 2 之前的任意桌面/光标控制。
2. **任务级多步推理与 Session 延续（Task Planner + Session Envelope）**：把研究目标拆成可执行的只读步骤，保存为可恢复的证据摘要、恢复锚点和分支谱系。

## 2. 只读工具链

### 2.1 设计用意

通用 Computer Use（`click`、`type`、`drag`、跨应用 UI 自动化）属于 **Phase 2** 的范畴（见 `11_能力工具与适配器护城河.md` 的 `ACTION.PTR`、`ACTION.KBD`、`ACTION.WIN`、`LEASE.CURSOR` 等）。在 Cycle 3 里，AI 仍然只能“看网页、读文本、管理 Session”，不能改写系统或外部状态。参考了 `ego-lite` 的 `snapshot/ref` 与 `pi-computer-use` 的 `observe_ui/search_ui` 后，我们决定建立一层显式工具注册表，而不是让模型直接输出任意 JSON 动作。

### 2.2 工具注册表位置

- `packages/main/src/desktop/agent-tools.ts`：只读工具定义集合 `CORE_TOOLS`。
- `packages/main/src/desktop/task-planner.ts`：基于注册表把研究目标拆成 `TaskPlan`。
- `packages/main/src/browser/browser-service.ts`：工具的实际执行器，只处理 `browser.*` 动作。

### 2.3 当前注册的工具

| 工具名 | 作用 | 安全等级 |
|---|---|---|
| `browser.search` | 用默认搜索引擎查询 | safe |
| `browser.open` | 打开具体 URL | safe |
| `browser.scroll` | 向下滚动页面 | safe |
| `browser.read` | 提取当前页可见文本并保存来源 | safe |
| `browser.find` | 在页面可见文本中定位关键字并返回上下文 | safe |
| `session.save` | 持久化当前 Session | safe |
| `session.branch` | Fork 出新的 Session 分支 | safe |
| `task.plan` | 为研究目标生成多步计划 | safe |

所有工具都是只读或 Session 自我管理，不包含 `pointer.click`、`keyboard.type`、`form.fill`、`form.submit`、下载、执行、系统级改动。

### 2.4 工具提示给 LLM

`agent-tools.ts` 通过 `toolSchemasForPrompt()` 把工具名、参数、返回值以 JSON Schema 形式注入 `TaskPlanner` 的系统提示。模型只需输出符合 Schema 的 `TaskPlan` JSON，`TaskPlanner` 负责解析、校验并转换为 `ActionProposal`。

## 3. 任务级多步推理

### 3.1 TaskPlan 数据模型

```text
TaskPlan
  goal: string
  steps: TaskStep[]
  current_step_id?: string

TaskStep
  id: string
  description: string
  tool: ActionName | "browser.find" (只读集合内)
  params: Record<string, unknown>
  reason?: string
  status: "pending" | "done" | "failed"
```

`TaskPlan` 保存在 `SessionRun.payload.plan` 中，并随事件写入 `session.chunks`（`type: "todo"`），UI 左侧任务步骤面板直接展示。

### 3.2 执行流程

1. `DesktopRuntime.startResearch(goal)` 调用 `TaskPlanner.plan(goal)` 得到 `TaskPlan`。
2. `proposalFromPlan(plan)` 把当前所有 pending 步骤一次性映射为 `ActionProposal.actions`。
3. `BrowserService.execute()` 按顺序执行 `browser.search` → `browser.read`（或 `browser.open`/`scroll`/`find`）。
4. `DesktopRuntime.advancePlan()` 根据执行结果把对应 `TaskStep` 标记为 `done`/`failed`。
5. 用户每点击一次“接管并执行”，推进一轮；若所有步骤完成，则进入“生成结论”。

### 3.3 用户插话与分支

当 `bargeIn(heardText)` 检测到研究意图时：

1. `forkCurrentSession(reason)` 先保存当前 Session，然后创建 `parent_id` 指向旧 Session 的新 Session，并写入 `payload.lineage`。
2. 新 Session 自动继承研究目标，开始新 `TaskPlan`。
3. UI 中显示“从 Session #xxx 分支：{reason}”。

旧分支的所有证据、来源、结论保留在 `userData/sessions/{oldId}.json` 中，不会被覆盖。

## 4. Session 延续与 Revalidation

### 4.1 Session 信封字段扩展

`packages/shared/src/types/session.ts` 新增：

- `SessionPayload`：
  - `goal`：研究目标
  - `lineage`：父分支、分叉点、分叉原因
  - `recovery`：恢复锚点
  - `evidence`：证据摘要
  - `plan`：任务计划
- `EvidenceSummary`：结论、来源引用、纠正、失败尝试、未解决问题、下一步建议
- `ResumeAnchor`：最后一次验证通过的 URL/标题/关键摘录、查询、约束、权限

### 4.2 持久化格式

`packages/main/src/desktop/session-persistence.ts` 的 `PersistedSession` 新增：

- `parent_id` / `lineage`
- `evidenceSummary`
- `recovery`
- `plan`

### 4.3 恢复时重新验证

`DesktopRuntime.loadSession()` 重新打开 `lastUrl` 后：

1. 读取当前页标题和可见文本。
2. 与 `ResumeAnchor.expected_excerpt` / `last_verified_title` 比对。
3. 若页面已变化，记录 `revalidation` chunk，并生成新的 `browser.search` 提案，等待用户点击“接管并执行”。
4. 若验证通过，保持 paused 状态，用户可继续。

## 5. UI 表现

- `TaskWorkspacePage`：左侧显示 `TaskPlan` 步骤（done/current/failed），右下方显示“证据摘要”卡片（含未解决问题、下一步建议），顶部显示分支来源。
- `SessionsPage`：列表行展示来源数、是否含证据摘要、是否分支自其他 Session。

## 6. 参考项目

- `ego-lite`：`ego-browser` 的 `snapshot`/`ref` 模型启发了只读页面快照与状态锚点。
- `pi-computer-use`：`observe_ui`/`search_ui` 启发了 `browser.find` 与验证后置条件。
- 两者都被限制在 Phase 2 范围，Cycle 3 只借鉴其“观察→验证→记录”的语义，不引入任意点击/输入。

## 7. 退出条件映射

| 退出条件 | 实现位置 |
|---|---|
| ≥3 个真实任务成功继续 | `verify-cycle3-e2e.mjs` 已验证 A/B/C 三个任务 |
| 结论、来源、纠正、未解决问题可见 | `EvidenceSummary` + `TaskWorkspacePage` 证据摘要面板 |
| 页面变化触发重新搜索或失败 | `DesktopRuntime.revalidateSession()` |
| 新结果写入同一 lineage | `SessionLineage` 与 `forkCurrentSession()` |
| 恢复失败可取消或创建新分支 | UI 提供暂停/取消按钮，bargeIn 可生成新分支 |
| 录制视频 3 | 通过 `recording_start/stop` 记录完整流程 |
