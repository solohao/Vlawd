# 02 · MVP 开发规划与阶段路线

---
模块：02_MVP开发规划与阶段路线
当前版本：v2.1
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v2.1 | 2026-07-16 | 为 Cycle 2 增加状态作用域目标、严格资源校验和 postcondition；桌面 Computer Use 仍留在 MVP Gate 后的证据驱动扩展 |
| v2.0 | 2026-07-12 | 重构为单一权威交付路线：产品 Cycle 决定顺序，风险门槛随能力启用，工程批次服务于当前体验；补充当前代码事实、三周期视频验收、MVP Gate 和 Phase 2 / Phase 3 证据门 |
| v1.5 | 2026-07-12 | 将 Vlawd 专属 Golden Path、Task Workspace、可恢复 Session、Evidence、Dogfood 周期和回放验收并入 V2；市场与插件移出当前产品阶段，交由 Agentic Web 阶段门管理 |
| v1.4 | 2026-06-27 | 战略再校准：新增 MODEL.PROBE 阶段归属；MODEL.HW 裁剪说明按 8GB 现实调整 |
| v1.3 | 2026-06-26 | 新增模块化对话入口骨架：蓝牙耳机优先、电脑麦克风 fallback、Mock 音频会话与测试 |
| v1.2 | 2026-06-26 | 补充模型下载位置自选要求 |
| v1.1 | 2026-06-26 | 新增 MODEL.CONFIG 阶段分配和代码落地批次 |
| v1.0 | 2026-06-23 | 初版：基于功能编号体系划分 MVP / Phase 2 / Phase 3 |

---

## 1. 本文档的权威规则

本文档是 Vlawd 产品交付顺序的唯一权威来源，回答四个问题：

1. 当前只验证哪一个用户体验；
2. 进入该体验前必须满足哪些风险门槛；
3. 为该体验最少实现哪些工程能力；
4. 用什么真实证据决定继续、缩小或停止。

优先级固定为：

```text
产品体验标准
→ 视频与真实 Dogfood 验收
→ 当前能力对应的风险门槛
→ 最小工程批次
→ 长期架构与技术目标
```

### 1.1 不再混用的三类概念

| 概念 | 回答的问题 | 是否决定产品顺序 |
|------|-----------|------------------|
| 产品 Cycle | 用户本周期能感知到什么新能力 | 是 |
| 风险门槛 | 启用该能力前哪些边界必须成立 | 是 |
| 工程批次 Build Slice | 为通过当前 Cycle 要修改哪些模块 | 否，只服务当前 Cycle |

历史文档和 `执行清单_代码实施.md` 中的 `Phase 0-6` 只表示工程骨架的落地记录，不再作为未来产品路线。

### 1.2 与其他文档的职责边界

```text
00_文档体系总览
  → 文档规范、版本索引和权威边界

01_功能模块注册表
  → 编号、设计文档位置和设计状态

02_MVP开发规划与阶段路线
  → 产品交付顺序、风险门槛、工程范围和退出证据

产品文档 / 技术文档
  → 最终目标设计，不自动代表当前已实现

执行清单_代码实施
  → 历史工程骨架完成记录，不代表 Dogfood 已通过

Agentic_Web
  → 跨项目阶段门，不决定 Vlawd 内部功能顺序
```

### 1.3 两周 Dogfood 与产品 Cycle 的关系

两周 Dogfood 是开发节奏，不是产品阶段名称。

```text
产品 Cycle
  可以跨一个或多个两周 Iteration

每个 Iteration
  只选择一个最大阻塞
  只实现一句验收标准
  通过后录制检查点视频

产品 Cycle
  只有满足完整退出条件后才结束
```

不得为了按两周结束而用 Mock、预录音频或静态状态冒充 Cycle 完成。

---

## 2. 状态口径与当前代码事实

### 2.1 状态口径

后续所有规划使用四种状态，避免把“文档已设计”误解为“产品已完成”。

| 状态 | 含义 |
|------|------|
| 设计完成 | 目标、接口或规则已写入文档 |
| 工程骨架 | 类型、Mock、Stub、测试替身或静态 UI 已存在 |
| 真实接通 | 真实输入、Runtime、执行器和 UI 形成一条数据链 |
| Dogfood 通过 | 真实场景连续通过，指标可记录，并有正式检查点视频 |

`01_功能模块注册表.md` 中的 `active` 只等于“设计完成”，不等于“真实接通”或“Dogfood 通过”。

### 2.2 当前基线

| 能力 | 当前事实 | 当前状态 |
|------|---------|---------|
| Electron + React + TypeScript workspace | 主进程、Renderer、Overlay 和共享类型已存在 | 工程骨架 |
| DuplexModelProvider | Mock Provider 和多种 Stub Provider 已存在 | 工程骨架 |
| 音频入口 | 设备类型、路由策略和 Mock audio session 已存在 | 工程骨架 |
| 本地抢占 | 文本关键词检测和同步占位逻辑已存在 | 工程骨架 |
| Agent Loop | Proposal → Safety → Executor → Session chunk 可在测试中运行 | 工程骨架 |
| 动作结果 | 当前共享类型仍以布尔 `ok` 为主，尚未实现 state、successor、postcondition 和 Evidence 引用 | 工程骨架 |
| Executor 路由 | 当前循环找不到 `target_view` 时仍可能回退到 `system`，与目标安全契约不一致 | 工程骨架 |
| BrowserView | 当前是 VirtualBrowserViewExecutor，不是真实 WebContentsView / CDP | 工程骨架 |
| Session | append-only JSONL chunk 已存在，缺少完整恢复语义 | 工程骨架 |
| 桌面 Runtime | Electron 当前接入 MockDesktopRuntime | 工程骨架 |
| 主界面和 Overlay | 多数数据来自 demo snapshot，Runtime 事件未形成统一实时投影 | 工程骨架 |

当前没有任何一个产品 Cycle 达到“Dogfood 通过”。

---

## 3. 单一 Golden Path

MVP 只验证一个连续场景：

> **戴着耳机向 Vlawd 提出一个真实研究目标；它在只读浏览器中可见地整理资料；用户可以随时插话纠正；结果保存为带来源、纠正和未解决问题的 Session，第二天能够继续。**

完整路径：

```text
真实语音目标
→ 全双工讨论和自然插话
→ 只读 BrowserView 搜索与阅读
→ 用户途中修改约束
→ 输出带来源的结果
→ 保存 Session Evidence 和恢复锚点
→ 第二天从明确分支继续
```

这个 Golden Path 拆成三个必须按顺序完成的产品 Cycle：

| 产品 Cycle | 唯一体验变化 | 正式视频 |
|------------|-------------|---------|
| Cycle 1 | 真实全双工入口：能打断、能改口、能继续 | 视频 1 |
| Cycle 2 | 只读研究：可见搜索、途中纠正、结果带来源 | 视频 2 |
| Cycle 3 | Session 延续：打开昨日任务并从分支继续 | 视频 3 |

Cycle 1 未通过，不进入 Cycle 2；Cycle 2 未通过，不进入 Cycle 3。

---

## 4. 总体路线

```text
当前 Mock 工程骨架
→ Cycle 1：真实全双工入口
→ Cycle 2：只读 BrowserView 研究
→ Cycle 3：Session 延续
→ MVP Gate：七天真实 Dogfood
→ Phase 2：可靠性、受控执行、上下文降本和个人流程
→ Phase 3：受控扩展、可选云端与日程自动化
```

| 阶段 | 要证明的核心判断 | 启动依据 |
|------|-----------------|---------|
| Cycle 1 | 和 AI 实时说话、打断和纠正是否自然 | 当前立即开始 |
| Cycle 2 | 监督 AI 做一个只读研究任务是否比自己操作更省 | Cycle 1 通过 |
| Cycle 3 | Session 是否让结果在第二天仍然可用 | Cycle 2 通过 |
| MVP Gate | 用户是否会主动重复使用完整闭环 | 三个 Cycle 通过 |
| Phase 2 | 上下文和流程复用能否降低监督成本 | MVP Gate 通过后的真实阻塞 |
| Phase 3 | 自动化、同步和云端增强是否有明确需求 | Phase 2 证据成立 |

---

## 5. Cycle 1：真实全双工入口

### 5.1 一句验收标准

> 用户通过真实麦克风与一个固定 Provider 对话，在 AI 说话途中自然插话改变约束；AI 停止原回答，并依据新约束继续。

### 5.2 用户路径

```text
打开 Vlawd
→ 连接现有耳机或电脑麦克风
→ 用户提出一个研究范围问题
→ AI 开始流式语音回应
→ 用户自然插话改变范围
→ AI 停止当前回应并接受新约束
→ 用户说“停”
→ 本地停止通道暂停语音和调度器
→ 用户说“继续，只总结三点”
→ AI 根据当前约束继续
```

自然插话和安全控制词是两种不同事件：

```text
自然插话
  目的：纠正、补充或改变约束
  结果：停止当前语音，继续理解新内容

安全控制词
  目的：停 / 暂停 / 取消 / 接管
  结果：本地规则直接抢占，不等待模型决定
```

### 5.3 最小产品范围

| 功能编号 | 本周期最小范围 |
|---------|---------------|
| UX.DUPLEX | 真实音频输入、流式回复、自然插话 |
| UX.SPEAK | 短句回应，用户发言时停止播报 |
| UX.SAFE | 本地停止和明确状态反馈 |
| DUPLEX.MODEL | 固定一个真实 Provider，不比较候选模型 |
| DUPLEX.INTERACT | 用户打断和纠正两个场景 |
| DUPLEX.RULE | 停、暂停、取消、接管的本地抢占 |
| DUPLEX.OUTPUT | 可取消的流式语音输出 |
| DUPLEX.ROLES | Brain、Record Notebook、Safety Preemption 的逻辑职责 |
| DUPLEX.ENTRY | 一个真实输入源和一个真实输出源 |
| MODEL.CONFIG | 只保存当前固定 Provider 配置 |
| UI.RUNTIME | Listening / Thinking / Speaking / Interrupted / Paused 状态 |
| TRACE.SESSION | 记录用户输入、AI 输出、打断和恢复事件 |

### 5.4 工程 Build Slices

| Build Slice | 交付 |
|-------------|------|
| C1-1 Runtime 单链路 | Electron Runtime、Provider、音频和 Overlay 不再走互相分离的 Mock 状态 |
| C1-2 真实音频与 Provider | 麦克风输入、Provider 流、耳机或系统输出可运行 |
| C1-3 可取消输出 | 用户开口或本地控制信号能 flush 当前语音输出 |
| C1-4 本地抢占 | 停、暂停、取消、接管不依赖 Provider 正常响应 |
| C1-5 Runtime 事件投影 | Overlay 订阅真实状态事件，不只读取初始化 snapshot |
| C1-6 最小记录与指标 | 保存打断、约束变更、恢复和延迟数据 |

技术实现可以先使用现有 TypeScript 接口。只有真实测量证明 JavaScript 路径无法满足延迟，才把规则引擎或音频关键路径迁移到 Rust native addon。

### 5.5 风险门槛

Cycle 1 不启用真实 BrowserView 或系统执行器，因此本周期不要求完整动作安全体系，但必须满足：

- Provider 失联时语音输出可以停止；
- 本地停止信号不经过模型决策；
- 暂停后不得自动恢复；
- 用户可以通过界面取消或接管；
- 不记录或输出密钥、账号凭据和不必要的原始音频；
- 本周期不执行任何真实电脑动作。

延迟指标拆分为：

```text
barge-in detected → 语音输出停止
  目标：< 200ms

local stop signal emitted → 调度器进入 paused
  目标：< 50ms
```

不得把从用户开始发音到识别完整控制词的时间混入 `< 50ms` 调度器指标。

### 5.6 明确不做

- BrowserView、CDP、DOM 操作；
- 系统光标和键盘执行；
- `target_view` 多执行器隔离；
- 表单填写、提交、购买和文件写入；
- 完整 Session Graph、Evidence Schema 和第二天恢复；
- 多模型对比、GPU 池、模型市场；
- U3 视觉精修。

### 5.7 退出条件

- 使用真实麦克风、真实 Provider 和真实语音输出；
- 同一场景连续成功至少 3 次；
- 每次自然插话都停止原回答并应用新约束；
- 每次“停”都触发本地停止，Provider 异常时仍可停止；
- 记录两类延迟、误打断和约束理解结果；
- UI 状态达到 U2：用户能理解正在听、说、被打断或暂停；
- 录制 30–90 秒视频 1。

### 5.8 视频 1 必须显示

```text
起始状态：Listening，真实音频入口已连接
→ 用户提出研究范围问题
→ AI 开始流式说话
→ 用户自然插话，AI 停止并修改范围
→ 用户说“停”，状态进入 Paused
→ 用户继续，AI 只总结三点
→ 结束画面标明本周期新增能力
```

---

## 6. Cycle 2：一个只读 BrowserView 研究任务

### 6.1 一句验收标准

> 用户通过语音提出研究目标，Vlawd 在一个可见 BrowserView 中完成搜索和阅读；用户途中修改条件，最终结果包含可打开的来源。

### 6.2 用户路径

```text
用户提出真实研究目标
→ Task Workspace 显示目标和当前步骤
→ BrowserView 可见地搜索和打开页面
→ Vlawd 阅读、滚动和摘录
→ 用户途中插话修改筛选条件
→ 后续阅读遵循新条件
→ 输出带来源的整理结果
```

### 6.3 允许与禁止动作

允许：

- 打开 URL；
- 搜索；
- 打开和切换只读页面；
- 滚动；
- 读取 DOM / Accessibility 内容；
- 摘录；
- 整理本地结果。

禁止：

- 表单提交；
- 购买、付款和申请；
- 发送消息或发布；
- 下载并执行文件；
- 写入用户文件；
- 系统级修改；
- 调用系统执行器作为 BrowserView 的 fallback。

### 6.4 最小产品范围

| 功能编号 | 本周期最小范围 |
|---------|---------------|
| MVP.BROWSER | 一个只读研究场景 |
| EXEC.DUAL | 只启用一个受限 BrowserView Executor；System Executor 保持关闭 |
| EXEC.ARCH | Executor 绑定、失败和停止接口 |
| OBS.SCREEN | BrowserView 页面与可见区域观察 |
| OBS.STATE | 每次观察生成 state_id，页面 ref 只在当前状态有效 |
| OBS.QUERY | 对当前状态执行 search / expand / inspect |
| OBS.TARGET | 页面目标候选 |
| ACTION.PROTO | 当前只读动作所需协议 |
| ACTION.WV | open / search / scroll / read |
| ACTION.PROPOSAL | 所有动作经过统一提案边界 |
| ACTION.VERIFY | 后继状态与 postcondition 证明动作结果 |
| VIS.MODE | visible_virtual |
| SAFE.LEVEL | safe / confirmation_required / blocked 聚合 |
| LEASE.TASK | 单个焦点任务 |
| LEASE.WORK | 一个 BrowserView 与一个 Session 绑定 |
| UI.TASK | 目标、当前步骤、来源、暂停、取消和接管 |
| UX.SUPERVISE | 用户能看见当前动作并途中纠正 |
| TRACE.SESSION | 保存来源、动作、结果和纠正 |

### 6.5 进入前风险门槛

以下能力必须在第一个真实网页动作前成立：

1. `blocked` 绝对高于 `confirmation_required` 和 `safe`；
2. 多动作 Proposal 按最高风险聚合；
3. `target_view` 只允许 `system` 或已注册的 `browser_view_*`；
4. 找不到目标 Executor 时拒绝，不得 fallback 到 system；
5. Provider 原始输出必须经过解析和运行时校验；
6. pause / cancel / confirm / reject / takeover / resume 有明确状态转换；
7. BrowserView 只读白名单默认拒绝未知动作；
8. 用户停止后，当前动作和后续队列都不再继续。
9. ActionProposal 必须绑定 `observation_state_id`、目标资源和当前 epoch；
10. 页面变化、用户接管或状态过期后，旧 ref 必须拒绝并重新观察；
11. 事件已发送不能直接标记任务成功，必须验证 postcondition；
12. 结果保留 `worked / didnt / unknown`，不得用布尔值隐藏不确定性。

这些风险门槛属于 Cycle 2，不倒置为 Cycle 1 真实语音视频的前置。

### 6.6 工程 Build Slices

| Build Slice | 交付 |
|-------------|------|
| C2-1 真实 BrowserView | Electron WebContentsView / BrowserView 与任务绑定 |
| C2-2 观察与只读工具 | URL、DOM、状态作用域 ref、渐进查询、滚动、阅读和摘录 |
| C2-3 Proposal 强制边界 | Provider 输出统一解析、校验和拒绝未知动作 |
| C2-4 Safety 与 Scheduler | 最高风险聚合、严格目标/资源/epoch 隔离和任务控制状态机 |
| C2-5 Task Workspace | 真实进度、当前动作、来源和控制入口 |
| C2-6 来源与结果 | 来源 URL、后继状态、postcondition、摘录和最终结论写入 Session |

### 6.7 明确不做

- 表单填写和提交；
- 系统光标与键盘；
- 多 BrowserView 并行；
- silent 后台执行；
- 完整 Session Graph；
- 工作流生成；
- 自动化日程；
- Capsule 和 Registry。

### 6.8 退出条件

- 至少 3 个不同输入的真实研究任务成功；
- 用户途中修改条件后，后续页面和结论遵循新条件；
- 最终结果的来源可以打开并对应到结论；
- 没有任何禁止动作被执行；
- pause、cancel 和 takeover 有真实 Session 事件；
- 失败任务保留来源、最后成功步骤和失败原因；
- 录制 30–90 秒视频 2。

### 6.9 视频 2 必须显示

```text
起始状态：一个空的 Task Workspace
→ 用户说出研究目标
→ BrowserView 可见搜索和阅读
→ 用户插话修改条件
→ 页面选择和进度发生变化
→ 输出带来源结果
→ 结束画面标明本周期新增能力
```

---

## 7. Cycle 3：Session 延续

### 7.1 一句验收标准

> 用户打开昨日研究 Session，查看结论、来源、纠正和未解决问题；Runtime 重新验证页面和权限后，从一个明确分支继续。

### 7.2 用户路径

```text
打开昨日 Session
→ 查看目标、结论、来源和纠正
→ 查看未解决问题
→ 选择一个分支继续
→ Runtime 重新打开并验证页面
→ 页面失效时明确说明并重新搜索
→ 新结果写入同一 lineage
```

### 7.3 最小产品范围

| 功能编号 | 本周期最小范围 |
|---------|---------------|
| SESSION.STRUCT | Session envelope、状态和 parent / lineage 字段 |
| SESSION.ENGINE | 由真实事件追加 chunk |
| SESSION.PANEL | 当前路径的日志视图 |
| SESSION.MVP | 基础 chunk、简单分支和 recall |
| SESSION.EVID | 目标、来源、纠正、结果、失败和未解决问题 |
| SESSION.RESUME | 保存恢复锚点，重新观察后继续 |
| UI.SESSION | 当前路径、来源、纠正和恢复入口 |
| UX.CORRECT | 纠正形成新分支，旧分支保留 |
| UX.RECOVER | 失败后从最后可靠状态继续 |
| TRACE.SESSION | 状态变化和恢复过程可审计 |

### 7.4 最小数据语义

```text
Session
  id
  goal
  status
  created_at
  updated_at
  parent_id
  current_branch
  privacy_scope

Evidence Summary
  sources
  claims
  corrections
  results
  failures
  unresolved_questions

Resume Anchor
  last_verified_url
  query
  active_constraints
  last_successful_step
  required_permissions
```

初版只需要“当前分支 + 放弃分支 + parent lineage”，不要求完整 fork / merge 图形编辑器。

### 7.5 进入前风险门槛

- JSONL 写入失败不能被静默忽略；
- Session 状态转换必须由事件产生，不由 UI 猜测；
- 恢复前重新验证 URL、页面内容和权限；
- 不复用过期登录、确认或授权；
- 页面变化时不得假装恢复成功；
- 用户可以放弃旧分支并从新搜索开始；
- 私密原始音频和凭据不进入 Evidence 摘要。

### 7.6 工程 Build Slices

| Build Slice | 交付 |
|-------------|------|
| C3-1 Session envelope | 将 chunk 归属于可持久化 Session |
| C3-2 Evidence Summary | 从事件生成来源、结论、纠正、失败和未解决问题 |
| C3-3 Resume Anchor | 保存并读取恢复所需的最小环境信息 |
| C3-4 Revalidation | 重新打开页面后确认内容和权限仍有效 |
| C3-5 Minimal Lineage | 当前分支、父分支和放弃分支 |
| C3-6 Session UI | 打开历史任务并从明确入口继续 |

### 7.7 明确不做

- 完整 Graph 拓扑编辑；
- 自动 merge 冲突；
- 云端同步；
- 跨设备恢复；
- 向量数据库和完整长期 Memory；
- Capsule 导出；
- 工作流市场。

### 7.8 退出条件

- 至少 3 个真实任务在应用重启或隔天后成功继续；
- 结论、来源、纠正和未解决问题完整可见；
- 页面变化或失效时能够重新搜索或明确失败；
- 新结果进入同一 lineage，不覆盖旧证据；
- 恢复失败时用户仍可安全取消或创建新分支；
- 录制 30–90 秒视频 3。

### 7.9 视频 3 必须显示

```text
起始状态：历史 Session 列表
→ 打开昨日研究任务
→ 查看来源、纠正和未解决问题
→ 选择一个问题继续
→ Runtime 重新验证页面
→ 产生新结果并写入同一 lineage
→ 结束画面标明本周期新增能力
```

---

## 8. MVP Gate：是否进入 Phase 2

三个 Cycle 完成只表示 Golden Path 已接通。只有通过以下 Gate，才说明 MVP 具有继续投入的证据。

### 8.1 必须证据

1. 三个 Cycle 各有一段真实 30–90 秒视频；
2. 完整 Golden Path 连续成功至少 3 次；
3. 创始人连续 7 天主动使用；
4. 至少 3 个真实任务明显降低操作或心理负担；
5. “监督 AI 做”的总成本低于用户自己完成；
6. 暂停、取消、纠正、失败和恢复都有 Session 证据；
7. 无未解决 P0 安全、隐私或数据损失问题；
8. UI 达到 U2，不要求 U3；
9. Provider、延迟、成本、纠正次数和失败类型可记录；
10. 用户第二天仍愿意继续使用此前结果。

“每天 10 次”作为强积极信号记录，不作为机械的唯一生死线。关键判断是用户是否主动使用，以及监督成本是否下降。

### 8.2 决策

| 结果 | 动作 |
|------|------|
| 通过 | 进入 Phase 2，只选择一个真实阻塞 |
| 部分通过 | 缩小任务范围，继续当前 Cycle 或补一个可靠性 Iteration |
| 未通过 | 停止扩功能，判断是任务不适合、模型不可用还是体验价值不足 |

MVP Gate 通过前不启动多工作区、完整工作流、云同步、市场或插件。

---

## 9. Phase 2：可靠性、受控执行和上下文降本

> 目标：从“一个研究闭环可用”进入“更多真实工作可以稳定委托，并且越用越少纠正”。

Phase 2 不一次性启动全部能力。按证据依次选择：

### Phase 2A：可靠性和受控执行扩展

要证明：

> Vlawd 能在保留监督和确认的前提下，完成一个比只读研究更接近“替我做”的低风险任务。

候选范围：

- 完整任务控制状态机；
- BrowserView 低风险写入；
- 草稿填写，但提交前确认；
- 必要时启用受限 System Executor；
- 失败恢复和 undo；
- 历史 Session 回放。

受限 System Executor 不是“直接安装一个 Computer Use 项目”。只有真实低风险任务反复需要无 API / MCP / CLI 的桌面应用时，才比较：

```text
Screenshot + 坐标 Baseline
vs 独立外部参考实现
vs Vlawd-native thin Environment Interaction Adapter
```

进入条件：

- `OBS.STATE / OBS.QUERY / ACTION.VERIFY / LEASE.RESOURCE` 已在 BrowserView 路径证明；
- pause、cancel 和 takeover 不依赖模型或外部 Runtime；
- 目标 Executor 不存在时严格拒绝；
- 可在一次性测试账户中注入旧状态、窗口移动、弹窗和用户接管；
- 外部实现只作为参考、backend 研究或比较基准。

涉及编号：

```text
ACTION.PTR / ACTION.KBD / ACTION.CLIP / ACTION.WIN
ACTION.DELIVERY / ACTION.VERIFY
OBS.STATE / OBS.QUERY
EXEC.INTERACT / LEASE.RESOURCE
SEMANTIC.TEXT / SEMANTIC.FORM / SEMANTIC.VOICE2TEXT
SAFE.LEVEL
UX.SUPERVISE / UX.RECOVER
VALID.REPLAY
```

退出证据：一个受控写入任务连续成功 3 次，高风险动作无未确认执行，并有视频 4。

### Phase 2B：个人流程和上下文降本

要证明：

> 同类任务第二次、第三次执行时，用户需要的解释和纠正更少。

候选范围：

- Preference；
- PhraseAlias；
- BehaviorRule；
- WorkflowShortcut；
- 从 Session 提议工作流；
- 可撤销的配置变更协议；
- 单位任务监督成本对比。

涉及编号：

```text
PERSON.PREF / PERSON.ALIAS / PERSON.RULE
PERSON.WORKFLOW / PERSON.WFGEN / PERSON.PROTOCOL
SESSION.MEMORY
```

退出证据：至少一个由真实 Session 沉淀的流程被重复使用，纠正次数或完成时间下降，并有视频 5。

### Phase 2C：多工作区

只有真实任务反复出现等待或切换瓶颈时才启动。

候选范围：

- 多 BrowserView 隔离；
- BrowserView 并行 Lease；
- Task Workspace 多任务状态；
- Session Graph 树视图和拓扑视图；
- visible_virtual 多任务体验；
- 用户对每个任务独立暂停、取消和接管。

涉及编号：

```text
LEASE.CURSOR / LEASE.RULES / LEASE.WORK
SAFE.MULTI
SESSION.GRAPH
WORK.SESSION / WORK.PANEL / WORK.MULTI / WORK.CONTROL
UI.TASK / UI.SESSION
```

退出证据：一个真实任务确实因并行减少等待，同时没有目标串线或状态误解，并有视频 6。

如果单工作区已经满足需求，不为展示“多 AI 员工”而提前建设并行。

---

## 10. Phase 3：受控扩展与可选云端增强

> 目标：核心闭环稳定后，只对已有使用证据提供自动化、同步和云端增强。

候选能力：

| 编号 | 能力 | 启动条件 |
|------|------|---------|
| SESSION.SYNC | Session 云端同步 | 明确跨设备需求、隐私和导出策略 |
| SESSION.MEMORY | 更强长期 Memory | 本地关键词 recall 已证明价值但能力不足 |
| WORK.SCHEDULE | 日程自动化 | 工作流已稳定复用，权限和失败通知成立 |
| MODEL.CLOUD | 可选云端后备 | 本地 Provider 失败或质量不足有真实证据 |
| DUPLEX.FALLBACK | 兼容模式 | 低配设备无法满足主 Provider 要求 |
| MODEL.CANDIDATE | 候选模型持续评测 | 已有稳定 Benchmark 和回放集 |

Phase 3 不自动包含 Marketplace、插件生态或公开 Agent 网络。

### Phase 2 → Phase 3 Gate

- 至少 3 类真实任务稳定运行；
- 至少一个个人流程被主动重复使用；
- 上下文积累可测量降低监督成本；
- 历史 Session 回放没有安全或恢复回归；
- 权限、隐私、成本和失败通知有明确边界；
- 新能力解决真实阻塞，而不是来自技术想象。

---

## 11. 功能编号阶段映射

完整设计文档可以描述最终状态，但当前实现只承担所属 Cycle 的裁剪范围。

| 范围 | 主要编号 |
|------|---------|
| Cycle 1 | ARCH.ROLE、ARCH.INTR、DUPLEX.MODEL、DUPLEX.INTERACT、DUPLEX.RULE、DUPLEX.OUTPUT、DUPLEX.ROLES、DUPLEX.ENTRY、MODEL.DUPLEX、MODEL.RULE、MODEL.CONFIG、UX.DUPLEX、UX.SPEAK、UX.SAFE、UI.RUNTIME、TRACE.SESSION |
| Cycle 2 | MVP.BROWSER、EXEC.DUAL、EXEC.ARCH、OBS.SCREEN、OBS.TARGET、ACTION.PROTO、ACTION.WV、ACTION.PROPOSAL、VIS.MODE、SAFE.LEVEL、LEASE.TASK、LEASE.WORK、UX.SUPERVISE、UI.TASK、TRACE.SESSION |
| Cycle 3 | SESSION.STRUCT、SESSION.ENGINE、SESSION.PANEL、SESSION.MVP、SESSION.EVID、SESSION.RESUME、UX.CORRECT、UX.RECOVER、UI.SESSION、TRACE.SESSION |
| MVP Gate | MVP.METRIC、VALID.HYPO、VALID.RISK、VALID.CRITERIA、VALID.CYCLE、VALID.REPLAY、VALID.POLISH |
| Phase 2 | ACTION.PTR、ACTION.KBD、ACTION.CLIP、ACTION.WIN、ACTION.DELIVERY、ACTION.VERIFY、OBS.STATE、OBS.QUERY、EXEC.INTERACT、SEMANTIC.TEXT、SEMANTIC.FORM、PERSON.PREF、PERSON.ALIAS、PERSON.RULE、PERSON.WORKFLOW、PERSON.WFGEN、PERSON.PROTOCOL、LEASE.CURSOR、LEASE.RESOURCE、LEASE.RULES、SAFE.MULTI、SESSION.GRAPH、WORK.SESSION、WORK.PANEL、WORK.MULTI、WORK.CONTROL、DUPLEX.BENCH |
| Phase 3 | SESSION.SYNC、SESSION.MEMORY、WORK.SCHEDULE、MODEL.CLOUD、DUPLEX.FALLBACK、MODEL.CANDIDATE |

编号未出现在当前 Cycle，不代表设计被废弃，只代表它不是当前交付承诺。

---

## 12. 工程决策规则

### 12.1 当前只实现通过验收所需内容

```text
如果某项工作不能提高当前 Cycle 的：
  成功率
  安全性
  恢复能力
  可理解性
  可测量性

则不进入当前 Iteration。
```

### 12.2 技术目标不是提前建设义务

- pnpm、Rust native、SQLite、独立模型进程是目标选项，不是 Cycle 1 的统一前置；
- 当前 npm workspace 可以继续使用，除非迁移直接解决当前阻塞；
- Cycle 1 可以先使用最可靠的固定 Provider，记录延迟、成本和隐私边界；
- 本地模型、量化、下载器和多 Provider 只有在 Golden Path 接通后按证据推进；
- 不为未来插件、市场和 Capsule 设计当前 Runtime。

### 12.3 安全随能力启用

```text
Cycle 1 只说话
  → 本地停止、音频取消、隐私边界

Cycle 2 读取网页
  → 只读白名单、目标隔离、最高风险聚合、任务状态机

Cycle 3 持久化和恢复
  → 数据完整性、权限重验、恢复失败语义

Phase 2 写入或提交
  → 明确确认、undo、审计和更强执行隔离
```

不得用“安全以后再说”绕过当前已启用能力的风险门槛，也不得用未来高风险能力的标准阻塞当前低风险 Cycle。

---

## 13. 视频与证据规则

每个正式视频必须显示：

1. 起始状态；
2. 用户真实输入；
3. 产品产生的可见变化；
4. 最终结果；
5. 本周期新增能力。

统一规则：

- 30–90 秒；
- 使用真实版本和真实输入；
- 只允许简单裁剪等待时间；
- 不使用预录音频、静态假状态或复杂宣传包装；
- 同一 Golden Path 先连续成功 3 次再录正式视频；
- 失败保留为 Session 和回放样本；
- 文件名使用 `日期-周期-场景`；
- 录制准备超过 30 分钟则停止，先修复可重复性。

视频是阶段退出证据，不是代替测试、指标或真实使用的宣传材料。

---

## 14. 与 Agentic Web 的阶段关系

Vlawd 完成三个 Cycle 和 MVP Gate 后，只代表本地 Runtime、Session 和监督式研究闭环得到验证。

Agentic Web 后续顺序保持：

```text
Vlawd 自我 Dogfood
→ 第二个垂直案例
→ 从至少两个案例抽取 Capsule Schema
→ 最小 Registry
→ Post is Project
→ 服务、商业与设备生态
```

在两个垂直案例产生共同可迁移对象之前，不启动：

- Capsule Protocol 固化；
- Registry；
- Post is Project 平台；
- Marketplace；
- 插件生态；
- 共享 GPU 池；
- 自研硬件。

---

## 15. 当前唯一下一步

当前只执行 Cycle 1。

```text
固定一个 Provider
→ 接通真实音频输入和输出
→ 让输出可被自然插话取消
→ 接通本地“停/暂停”
→ 用 Runtime 事件驱动 Overlay
→ 连续成功三次
→ 录制视频 1
```

Cycle 1 通过前，不开始真实 BrowserView、Session Resume、完整安全状态机或 Phase 2 能力。
