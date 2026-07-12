# 02 · MVP 开发规划与阶段路线

---
模块：02_MVP开发规划与阶段路线
当前版本：v1.5
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.5 | 2026-07-12 | 将 Vlawd 专属 Golden Path、Task Workspace、可恢复 Session、Evidence、Dogfood 周期和回放验收并入 V2；市场与插件移出当前产品阶段，交由 Agentic Web 阶段门管理 |
| v1.4 | 2026-06-27 | 战略再校准（详见 变更记录/v2.9_战略再校准）：新增 MODEL.PROBE 阶段归属（MVP，挂在 Phase 5 配置骨架）；MODEL.HW 裁剪说明按 8GB 现实调整 |
| v1.3 | 2026-06-26 | 新增 Phase 6 对话入口骨架：蓝牙耳机 Hands-Free 优先、电脑麦克风 fallback、Mock 音频会话与测试 |
| v1.2 | 2026-06-26 | 补充 Phase 5 模型下载位置自选要求：真实模型不得默认占用系统盘，下载根目录、路径校验和工作流绑定进入配置骨架 |
| v1.1 | 2026-06-26 | 新增 MODEL.CONFIG 阶段分配，并补充 MVP 代码落地批次 Phase 0-5 |
| v1.0 | 2026-06-23 | 初版：基于功能编号体系划分 MVP / Phase 2 / Phase 3 阶段 |

---

## 使用说明

```text
本文档通过引用功能编号来定义各阶段的开发范围。

查询路径：
  1. 本文档 → 确认编号属于哪个阶段
  2. 01_功能模块注册表.md → 查找编号对应的文档位置
  3. 具体模块文档 → 阅读详细设计

阶段变更操作：
  - 提前某功能：将该编号从后阶段表格移到前阶段表格
  - 延后某功能：将该编号从前阶段表格移到后阶段表格
  - 新增功能：先在注册表注册编号，再在本文档分配阶段
  - 修改设计：只改对应模块文档，本文档无需变动
```

---

## 阶段定义

| 阶段 | 目标 | 核心交付 |
|------|------|---------|
| MVP | 验证监督式研究闭环：“监督 AI 做”是否比自己动手更省 | 全双工入口 + 只读 BrowserView + Task Workspace + 可恢复 Session |
| Phase 2 | 提高可靠性、并行工作区和上下文降本 | BrowserView 隔离 + Session Graph / Evidence + 个性化与工作流复用 |
| Phase 3 | 受控扩展与可选云端增强 | 日程自动化 + 可选 Session 同步 + 完整 Memory + 稳定扩展接口 |

---

## MVP 阶段

> **目标**：验证“通过全双工监督完成一个只读研究任务，并在第二天继续”是否比用户自己操作更省。

### 技术能力

| 编号 | 功能 | 裁剪说明 |
|------|------|---------|
| ARCH.ROLE | 两角色架构总览 | 全量 |
| ARCH.LAYER | 分层架构 | 全量（7 层架构作为开发骨架） |
| ARCH.LOCAL | 本地与云端分工 | 全量 |
| ARCH.INTR | 三者打断机制 | 全量 |
| DUPLEX.MODEL | 全双工模型层 | 全量 |
| DUPLEX.PRINCIPLE | 全双工工作原理 | 全量 |
| DUPLEX.INTERACT | 全双工交互模式 | 全量（四种场景） |
| DUPLEX.RULE | 安全控制词本地抢占 | 全量 |
| DUPLEX.OUTPUT | 全双工双路输出 | 全量 |
| DUPLEX.ROLES | 运行时逻辑职责 | 全量：Brain / Notebook / Safety 职责清楚；MVP 不要求多个大模型 |
| DUPLEX.SESSION | 与 Session 配合 | 基础：仅 chunk 记录，不含 Graph 深度回溯 |
| DUPLEX.STACK | 技术栈 | 全量 |
| EXEC.DUAL | 双执行器架构 | 系统执行器 + 一个受限 BrowserView；BrowserView 仅允许只读研究动作 |
| EXEC.ARCH | 执行器架构 | 全量接口，MVP 只启用低风险执行路径 |
| OBS.SCREEN | 多源屏幕感知 | 全量 |
| OBS.TARGET | 目标候选生成 | 全量 |
| OBS.LABEL | 屏幕标号 | 全量 |
| ACTION.PROTO | 原子动作协议体系 | 全量（协议框架） |
| ACTION.PTR | pointer.* | 全量 |
| ACTION.KBD | keyboard.* | 全量 |
| ACTION.CLIP | clipboard.* | 全量 |
| ACTION.WIN | window.* | 基础标签切换，不含窗口排列 |
| ACTION.WV | webview.* | 基础：打开、搜索、滚动、读取；禁止表单提交和写操作 |
| ACTION.PROPOSAL | ActionProposal | 全量 |
| SEMANTIC.LAYER | 语义编排层 | 基础 |
| SEMANTIC.TEXT | text.* | 全量 |
| SEMANTIC.FORM | form.* | 只保留协议和测试，Golden Path 禁止提交表单 |
| SEMANTIC.VOICE2TEXT | 口语→书面语 | 基础格式转换（数字/日期） |
| VIS.MODE | 可见性模式 | visible_system + BrowserView 的 visible_virtual；silent 延后 |
| SAFE.LEVEL | 三级安全评估 | 全量 |
| TRACE.SESSION | 留痕与 Session 对接 | 全量 |
| MODEL.DUPLEX | 全双工模型选型 | 选定一个主力模型 |
| MODEL.RULE | 规则引擎 | 全量 |
| MODEL.RECORD | 记录引擎模型 | 全量 |
| MODEL.CONFIG | 双角色模型配置 | 基础：执行大脑/记录笔记本 preset + 安全抢占锁定 + 模型下载根目录自选与系统盘提示，不含真实下载执行器 |
| DUPLEX.ENTRY | 模块化对话入口 | 基础：耳机优先检测、电脑麦克风 fallback、Mock duplex audio session，不直接绑定底层蓝牙协议 |
| MODEL.HW | 硬件配置 | 8GB（入门/笔记本 4060，v0 用 3B 小模型）/16GB 两档，24GB 与低配办公本档延后 |
| MODEL.PROBE | 环境自检与配置推荐 | 基础：探测 GPU/显存/内存/磁盘 → 推荐预设，NVIDIA 优先精确支持，其余保守降级；与 Phase 5 配置骨架衔接，不含真实下载执行 |
| LEASE.CURSOR | CursorLease 调度器 | 系统光标排他 + 单个 BrowserView Lease，不启用并行 |
| LEASE.RULES | 调度规则 | 系统光标 Rule 1-7 + 单 BrowserView 所需隔离规则 |
| LEASE.TASK | Task Card | 基础：单任务为主 |
| SESSION.STRUCT | Session 数据结构 | 全量 |
| SESSION.ENGINE | 记录引擎 | 全量 |
| SESSION.MEMORY | 长期 Memory | 基础关键词搜索 recall |
| SESSION.PANEL | 任务面板 | 仅日志视图 |
| SESSION.MVP | Session MVP 建议 | 全量（作为实现参考） |
| SESSION.EVID | Session Evidence 摘要 | 基础：来源、结果、纠正、失败和未解决问题可追溯 |
| SESSION.RESUME | 可恢复 Session | 基础：保存恢复锚点，重新观察后从安全分支继续 |
| PERSON.PREF | Preference 偏好 | 基础偏好（输出风格） |
| PERSON.ALIAS | PhraseAlias | 基础（创建/确认/触发） |
| PERSON.RULE | BehaviorRule | 基础（1-2 条内置规则） |
| PERSON.PROTOCOL | 配置变更协议 | 全量（propose/confirm/apply/revoke） |
| GOVERN.PRINCIPLE | AI 可维护性原则 | 全量 |
| GOVERN.CODE | 面向 AI 编码规范 | 全量 |
| STACK.OVERVIEW | 核心决策总览 | 全量（开发基础设施） |
| STACK.ELECTRON | 桌面框架选型 | 全量 |
| STACK.PROCESS | 多进程架构 | 全量 |
| STACK.LOOP | Agent 循环 | 全量 |
| STACK.SESSION | Session 运行时 | 全量 |
| STACK.TOOL | 工具分发 | 基础（不含 Plugin 扩展） |
| STACK.MODEL | 模型通信 | 全量 |

### 产品定义

| 编号 | 功能 | 裁剪说明 |
|------|------|---------|
| PROD.CORE | 产品本体 | 全量 |
| PROD.COMPETE | 竞争格局 | 全量（用于定位参考） |
| PROD.BOUNDARY | 产品边界 | 全量 |
| PROD.STRATEGY | 战略定位 | 全量 |
| PROD.AGENTIC | 与 Agentic Web 的关系 | 全量：V2 只实现 Vlawd，不提前建设 Capsule / Registry / 平台 |
| MVP.USER | 首批目标用户 | 全量 |
| MVP.BROWSER | 浏览器优先切口 | 全量 |
| MVP.SCENE | 首批高频场景 | 全量（5 大场景） |
| MVP.ACTION | MVP 动作清单 | 全量 |
| MVP.VOICE | MVP 语音指令 | 全量 |
| MVP.LABEL | 屏幕标号机制 | 全量 |
| MVP.EXCLUDE | MVP 不做清单 | 全量 |
| MVP.METRIC | 北极星指标 | 全量 |
| UX.DUPLEX | 全双工耳机协作 | 全量 |
| UX.ISOLATE | 三层隔离感 | 基础体感验证 |
| UX.SPEAK | AI 说话策略 | 全量 |
| UX.SAFE | 安全感来源 | 全量 |
| UX.CORRECT | Session 纠正机制 | 基础：语音纠正→fork |
| UX.SUPERVISE | 可监督执行协议 | 全量 |
| UX.RECOVER | 错误恢复原则 | 全量 |
| UI.APP | App 主窗口 | 基础：Dashboard、对话入口、任务列表、Session Log |
| UI.RUNTIME | Runtime 浮层 | 全量：状态、当前动作、安全与暂停/取消/接管 |
| UI.TASK | Task Workspace | 基础：一个焦点任务 + 其他任务摘要状态 |
| UI.SESSION | Session Drawer | 基础：当前路径、来源、纠正和恢复入口 |

### 验证任务

| 编号 | 功能 | 裁剪说明 |
|------|------|---------|
| VALID.HYPO | 验证假设 | 全量（9 个假设） |
| VALID.DEMO | 原型 Demo | 仅搜索、耳机打断和 Session 延续；其余 Demo 延后 |
| VALID.BIZ | 商业价值判断 | 全量（用于方向验证） |
| VALID.CREDITS | 积分制设计 | 全量（提前设计，MVP 阶段可先用免费层） |
| VALID.RISK | 风险与规避 | 全量 |
| VALID.CRITERIA | 继续标准 | 全量 |
| VALID.CYCLE | 两周 Dogfood 周期 | 全量 |
| VALID.REPLAY | 历史 Session 回放 | 基础：固定 Golden Tasks 人工或半自动重放 |
| VALID.POLISH | 调优止损 | 全量：U2、三次证据、视觉预算和周期模型冻结 |

---

## MVP 代码落地批次

这里的 Phase 0-6 是代码实施批次，不等同于上方产品阶段。

| 批次 | 目标 | 验证方式 |
|------|------|----------|
| Phase 0 | pnpm workspace、shared/main/renderer 骨架 | `npm run typecheck` |
| Phase 1 | Mock 全双工 Provider → ActionProposal → Executor | 单元测试 + `npm run demo` |
| Phase 2 | 安全抢占与确认状态机 | “停/暂停/取消”测试 + 等待确认测试 |
| Phase 3 | Session JSONL 记录 | append/read 测试 + demo 日志 |
| Phase 4 | 浏览器 MVP 虚拟执行器 | 搜索/表单/滚动模拟测试 |
| Phase 5 | 双角色模型配置骨架（MODEL.CONFIG） | preset/renderer rows/模型下载位置选择/路径校验/typecheck，暂不接真实模型 |
| Phase 6 | 模块化对话入口骨架（DUPLEX.ENTRY） | audio device types/耳机优先路由/电脑麦克风 fallback/入口列表 view model/renderer status rows/Mock audio session |

Phase 5 的边界：只补配置类型、推荐 preset、桌面端 view model、用户自选模型下载根目录、系统盘空间风险提示和验证清单；真实 BayLing/PersonaPlex 下载执行器、许可证处理、模型 server、健康检查属于后续实现。

MODEL.PROBE 的边界：作为 Phase 5 配置骨架的“环境自检 → 推荐预设”一步，放在模型下载之前。初版用 nvidia-smi/系统 API 探测 GPU 型号与显存（Windows 避开 Win32_VideoController.AdapterRAM 的 32 位截断）、内存、磁盘空间，映射到分层 preset；允许用户手动覆盖。跨厂商（AMD/Intel/Apple）精确探测、量化质量评估属于后续实现。

Phase 5 存储规则：模型文件体积很大，桌面端不得把 `AI_cursor_v2/app/models` 或 C 盘作为强制默认位置；首次下载真实模型前必须让用户选择下载根目录，并把 `MODEL_STORAGE_ROOT/ai-cursor-v2-models/<role>/<model>` 写入工作流绑定。若用户选择 Windows 系统盘，应提示空间风险但不强制阻止。

Phase 6 的边界：只完成音频设备与对话入口抽象，不实现真实底层蓝牙协议栈。桌面端通过系统音频设备枚举识别蓝牙耳机、内置麦克风和扬声器；优先选择支持输入+输出的 Hands-Free/HFP/HSP 耳机，若只有 A2DP 输出或未检测到耳机，则允许“电脑麦克风 + 蓝牙耳机/系统扬声器输出”的组合。入口 UI 应提供“连接对话入口”列表、刷新、连接和手动选择能力。真实低延迟音频流、模型 server PCM/WebSocket 接入和平台级设备监听属于后续实现。

---

## 当前实现缺口优先级

```text
1. Safety Policy 中 blocked 高于 confirmation 和 safe
2. target_view 严格校验，系统执行器与 BrowserView 不隐式 fallback
3. pause / cancel / confirm / reject / takeover / resume 状态机
4. 真实全双工 Provider 和音频流
5. 一个只读浏览器研究任务
6. Session Evidence、恢复锚点和第二天继续
```

前 3 项属于安全和隔离前置条件，不能为了先录演示而跳过。

---

## Vlawd Golden Path 交付顺序

### Cycle 1：真实全双工入口

```text
开始对话
→ AI 正在说话
→ 用户插话“先停一下”
→ 语音和动作停止
→ AI 接受新约束
```

退出条件：同一场景连续成功三次；本地停止通道不依赖模型；录制 30–90 秒真实演示。

### Cycle 2：一个只读研究任务

```text
语音提出研究目标
→ Task Workspace 显示进度
→ BrowserView 可见搜索和阅读
→ 用户途中修改条件
→ 输出带来源的结果
```

只允许打开页面、搜索、滚动、读取和整理。表单提交、购买、写文件和系统级修改关闭。

### Cycle 3：Session 延续

```text
打开昨日 Session
→ 查看结论、来源、纠正和未解决问题
→ 选择一个分支继续
→ Runtime 重新验证页面和权限
→ 新结果写入同一 lineage
```

完成三个周期后，才根据真实阻塞决定二维视图、个人工作流或其他能力，不在当前文档提前承诺。

---

## Phase 2 阶段

> **目标**：可靠的多工作区执行 + Session 上下文降本 + 可复用个人流程。

### 技术能力

| 编号 | 功能 | 前置依赖 |
|------|------|---------|
| EXEC.DUAL | 双执行器架构 | MVP 完成（扩展多 BrowserView 和动作范围） |
| EXEC.ARCH | 执行器架构 | MVP 完成（完善隔离、失败和恢复路径） |
| ACTION.OVL | overlay.* | EXEC.DUAL（需要 BrowserView） |
| ACTION.WV | webview.* | MVP 完成（扩展多 BrowserView 和更多低风险动作） |
| ACTION.EXT | 预留扩展命名空间 | ACTION.PROTO（按需启用） |
| VIS.MODE | 可见性模式 | MVP 完成（完善多任务 visible_virtual，按证据启用 silent） |
| SAFE.MULTI | 多光标安全约束 | EXEC.DUAL |
| LEASE.CURSOR | CursorLease 调度器 | MVP 完成（启用 BrowserView 并行调度） |
| LEASE.RULES | 调度规则 | MVP 完成（启用 Rule B1-B6） |
| LEASE.WORK | Workspace 工作区 | EXEC.DUAL + LEASE.CURSOR |
| SESSION.GRAPH | Session Graph | SESSION.STRUCT（完整 fork/merge/lineage 可视化） |
| SESSION.PANEL | 任务面板 | MVP 完成（升级为树视图 + 拓扑视图） |
| PERSON.WORKFLOW | WorkflowShortcut | PERSON.ALIAS + SESSION.ENGINE |
| PERSON.SAFETY | SafetyPolicyOverride | SAFE.LEVEL |
| PERSON.PRESET | WorkspacePreset | LEASE.WORK |
| PERSON.STYLE | InteractionStyle | DUPLEX.OUTPUT |
| PERSON.WFGEN | 工作流生成与执行 | SESSION.ENGINE + PERSON.WORKFLOW |
| DUPLEX.BENCH | 评测基准 | DUPLEX.MODEL（需要稳定运行数据） |
| DUPLEX.FALLBACK | V1 降级方案 | DUPLEX.MODEL（为低配设备提供降级路径） |
| MODEL.CLOUD | 可选云端后备 | MODEL.DUPLEX（本地模型验证后） |
| MODEL.HW | 硬件配置 | MVP 完成（补充 24GB 档位） |
| GOVERN.SESSION | Session Context | SESSION.GRAPH + GOVERN.PRINCIPLE |
| SESSION.EVID | Session Evidence 摘要 | MVP 完成（增加自动聚类和兼容性信息） |
| SESSION.RESUME | 可恢复 Session | MVP 完成（覆盖页面变化、登录过期和失败分支） |

### 产品体验

| 编号 | 功能 | 前置依赖 |
|------|------|---------|
| UX.ISOLATE | 三层隔离感 | MVP 完成（完善注意力/心理隔离打磨） |
| UX.CORRECT | Session 纠正机制 | MVP 完成（完善 merge + 旧分支保留体验） |
| WORK.SESSION | Session 驱动的工作区 | SESSION.GRAPH + LEASE.WORK |
| WORK.PANEL | 任务面板 | SESSION.PANEL |
| WORK.MULTI | 多 AI 工作模式 | EXEC.DUAL + LEASE.WORK |
| WORK.DRAG | 拖资料给 AI | WORK.SESSION |
| WORK.PERSON | 个性化与 Session 结合 | PERSON.WFGEN + WORK.SESSION |
| WORK.CONTROL | 用户控制权 | WORK.SESSION |
| WORK.OVERLAY | Overlay 浮层系统 | ACTION.OVL |
| UI.TASK | Task Workspace | LEASE.WORK + SESSION.RESUME |
| VALID.DEMO | 原型 Demo | MVP 完成（只选择一个有真实使用证据的剩余场景） |

---

## Phase 3 阶段

> **目标**：在核心闭环稳定后提供受控扩展、可选云端增强和日程自动化。

| 编号 | 功能 | 前置依赖 |
|------|------|---------|
| SESSION.SYNC | Session 云端同步 | SESSION.GRAPH + 明确隐私与导出策略 |
| SESSION.MEMORY | 长期 Memory | MVP 完成（升级为云端强模型辅助的 recall） |
| WORK.SCHEDULE | 日程自动化 | WORK.SESSION + PERSON.WORKFLOW |
| MODEL.CANDIDATE | 候选模型评估 | DUPLEX.BENCH（持续跟进新模型） |

Marketplace、插件生态和公开发布不再自动属于 Vlawd Phase 2 / Phase 3。它们保持 deferred，只有 `Agentic_Web/02_跨项目开发路径与阶段门.md` 中 Capsule、Registry 和权限阶段门成立后才重新规划。

---

## 阶段升级标准

```text
MVP → Phase 2 的触发条件：
  1. 研究 Golden Path 连续成功至少 3 次
  2. 创始人连续 7 天主动使用，至少 3 个真实任务明显减负
  3. 无未解决 P0 安全、隐私或数据损失问题
  4. 暂停、取消、接管和失败恢复均有 Session 证据
  5. 三个 Cycle 各有一段 30–90 秒真实演示
  6. UI 达到 U2，不要求 U3

Phase 2 → Phase 3 的触发条件：
  1. BrowserView 隔离和多任务状态稳定运行
  2. 至少 3 类真实任务可在第二天恢复
  3. 上下文积累可测量降低单位任务纠正次数
  4. 至少一个由 Session 沉淀的个人流程被重复使用
  5. 历史 Session 回放没有安全或恢复回归
```
