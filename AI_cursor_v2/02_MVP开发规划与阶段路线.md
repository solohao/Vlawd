# 02 · MVP 开发规划与阶段路线

---
模块：02_MVP开发规划与阶段路线
当前版本：v1.1
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
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
| MVP | 验证核心体验闭环：语音指挥 AI 执行可见操作 | 全双工语音 + 系统光标执行 + 基础 Session + 浏览器场景 |
| Phase 2 | 多光标并行 + 市场体系 + 完整个性化 | BrowserView 执行器 + 积分账户 + 工作流市场 + overlay 系统 |
| Phase 3 | 插件生态 + 云端增值 + 日程自动化 | 插件系统 + Session 云同步 + 日程自动化 + 完整 Memory |

---

## MVP 阶段

> **目标**：验证"语音指挥 AI 光标可见地操作电脑"的核心体验是否足够好。

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
| DUPLEX.SESSION | 与 Session 配合 | 基础：仅 chunk 记录，不含 Graph 深度回溯 |
| DUPLEX.STACK | 技术栈 | 全量 |
| EXEC.DUAL | 双执行器架构 | 仅系统执行器（EXEC.SYS），BrowserView 延后 |
| EXEC.ARCH | 执行器架构 | 仅系统执行器部分 |
| OBS.SCREEN | 多源屏幕感知 | 全量 |
| OBS.TARGET | 目标候选生成 | 全量 |
| OBS.LABEL | 屏幕标号 | 全量 |
| ACTION.PROTO | 原子动作协议体系 | 全量（协议框架） |
| ACTION.PTR | pointer.* | 全量 |
| ACTION.KBD | keyboard.* | 全量 |
| ACTION.CLIP | clipboard.* | 全量 |
| ACTION.WIN | window.* | 基础标签切换，不含窗口排列 |
| ACTION.PROPOSAL | ActionProposal | 全量 |
| SEMANTIC.LAYER | 语义编排层 | 基础 |
| SEMANTIC.TEXT | text.* | 全量 |
| SEMANTIC.FORM | form.* | 基础（简单表单填写） |
| SEMANTIC.VOICE2TEXT | 口语→书面语 | 基础格式转换（数字/日期） |
| VIS.MODE | 可见性模式 | 仅 visible_system（系统光标可见执行） |
| SAFE.LEVEL | 三级安全评估 | 全量 |
| TRACE.SESSION | 留痕与 Session 对接 | 全量 |
| MODEL.DUPLEX | 全双工模型选型 | 选定一个主力模型 |
| MODEL.RULE | 规则引擎 | 全量 |
| MODEL.RECORD | 记录引擎模型 | 全量 |
| MODEL.CONFIG | 双角色模型配置 | 基础：执行大脑/记录笔记本 preset + 安全抢占锁定，不含真实模型下载器 |
| MODEL.HW | 硬件配置 | 8GB/16GB 两档 |
| LEASE.CURSOR | CursorLease 调度器 | 仅系统光标排他调度 |
| LEASE.RULES | 调度规则 | 仅系统光标 Rule 1-7 |
| LEASE.TASK | Task Card | 基础：单任务为主 |
| SESSION.STRUCT | Session 数据结构 | 全量 |
| SESSION.ENGINE | 记录引擎 | 全量 |
| SESSION.MEMORY | 长期 Memory | 基础关键词搜索 recall |
| SESSION.PANEL | 任务面板 | 仅日志视图 |
| SESSION.MVP | Session MVP 建议 | 全量（作为实现参考） |
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

### 验证任务

| 编号 | 功能 | 裁剪说明 |
|------|------|---------|
| VALID.HYPO | 验证假设 | 全量（7 个假设） |
| VALID.DEMO | 原型 Demo | Demo 1-4（搜索/标号/表单/标签），5-7 延后 |
| VALID.BIZ | 商业价值判断 | 全量（用于方向验证） |
| VALID.CREDITS | 积分制设计 | 全量（提前设计，MVP 阶段可先用免费层） |
| VALID.RISK | 风险与规避 | 全量 |
| VALID.CRITERIA | 继续标准 | 全量 |

---

## MVP 代码落地批次

| 批次 | 目标 | 验证方式 |
|------|------|----------|
| Phase 0 | pnpm workspace、shared/main/renderer 骨架 | `npm run typecheck` |
| Phase 1 | Mock 全双工 Provider → ActionProposal → Executor | 单元测试 + `npm run demo` |
| Phase 2 | 安全抢占与确认状态机 | “停/暂停/取消”测试 + 等待确认测试 |
| Phase 3 | Session JSONL 记录 | append/read 测试 + demo 日志 |
| Phase 4 | 浏览器 MVP 虚拟执行器 | 搜索/表单/滚动模拟测试 |
| Phase 5 | 双角色模型配置骨架（MODEL.CONFIG） | preset/renderer rows/typecheck，暂不接真实模型 |

Phase 5 的边界：只补配置类型、推荐 preset、桌面端 view model 和验证清单；真实 BayLing/PersonaPlex 下载器、许可证处理、模型 server、健康检查属于后续实现。

---

## Phase 2 阶段

> **目标**：多光标并行执行 + 市场体系 + 完整体验打磨。

### 技术能力

| 编号 | 功能 | 前置依赖 |
|------|------|---------|
| EXEC.DUAL | 双执行器架构 | MVP 完成（启用 BrowserView 执行器） |
| EXEC.ARCH | 执行器架构 | MVP 完成（完善 BrowserView 部分） |
| ACTION.OVL | overlay.* | EXEC.DUAL（需要 BrowserView） |
| ACTION.WV | webview.* | EXEC.DUAL（需要 BrowserView） |
| ACTION.EXT | 预留扩展命名空间 | ACTION.PROTO（按需启用） |
| VIS.MODE | 可见性模式 | MVP 完成（启用 visible_virtual + silent） |
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
| MARKET.ACCOUNT | Account Context | VALID.CREDITS |
| MARKET.STORE | Marketplace | MARKET.ACCOUNT + PERSON.WORKFLOW |

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
| VALID.DEMO | 原型 Demo | MVP 完成（Demo 5-7：留痕/耳机/训练） |

---

## Phase 3 阶段

> **目标**：插件生态 + 云端增值服务 + 日程自动化。

| 编号 | 功能 | 前置依赖 |
|------|------|---------|
| PLUGIN.LIFECYCLE | 插件生命周期 | MARKET.STORE |
| PLUGIN.SANDBOX | 插件沙箱 | PLUGIN.LIFECYCLE + SAFE.LEVEL |
| PLUGIN.PERM | 插件权限 | PLUGIN.LIFECYCLE + SAFE.MULTI |
| MARKET.PUBLISH | 市场发布 | MARKET.STORE + PLUGIN.LIFECYCLE |
| SESSION.SYNC | Session 云端同步 | SESSION.GRAPH + MARKET.ACCOUNT |
| SESSION.MEMORY | 长期 Memory | MVP 完成（升级为云端强模型辅助的 recall） |
| WORK.SCHEDULE | 日程自动化 | WORK.SESSION + PERSON.WORKFLOW |
| MODEL.CANDIDATE | 候选模型评估 | DUPLEX.BENCH（持续跟进新模型） |

---

## 阶段升级标准

```text
MVP → Phase 2 的触发条件：
  1. 创始人连续 7 天每天使用 10 次以上（VALID.CRITERIA）
  2. 至少 3 个真实任务明显减少心理阻力
  3. Demo 1-4 全部通过用户验证
  4. 全双工模型延迟稳定在 < 500ms

Phase 2 → Phase 3 的触发条件：
  1. BrowserView 多光标稳定运行
  2. 积分制正式上线并有付费用户
  3. 工作流市场至少 20 个可用模板
  4. 用户主动创建工作流的比例 > 10%
```
