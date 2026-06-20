# 04 · 工作区协同与 Session

---
模块：产品文档/04_工作区协同与Session
当前版本：v2.1
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v2.1 | 2026-06-17 | 新增内置 BrowserView 多光标工作区、overlay 浮层系统、日程自动化维护场景 |
| v2.0 | 2026-06-17 | 整体重写：新增 Session Graph 任务管理、右下角任务面板三视图、Session 驱动的工作区协同 |
| v1.0 | 2026-06-01 | 初版：多 AI 工作区、拖拽协同、工作流沉淀和可监督自配置 |

---

## 核心结论

v1 把 AI 光标理解为"多个 AI 虚拟光标 + 执行调度器"。

v2 在此基础上新增 Session 维度：

```text
1 个系统光标（用于桌面原生应用）
+ N 个内置 BrowserView（每个有独立虚拟光标，真并行）
+ N 个 AI 工作区（每个绑定 BrowserView + Session）
+ 1 个双执行器（系统执行器 + BrowserView 执行器）
+ 1 个 Session Graph 记录引擎
+ 1 个右下角任务面板
+ 1 套 Overlay 浮层系统
+ 1 套用户偏好与工作流记忆
```

其中 **Session Graph** 和 **任务面板** 是 v2 新增的核心产品组件。

---

## Session 驱动的工作区

每个工作区不再只是"标签组 + 文件 + 日志"，而是一个活跃的 Session：

```text
工作区 = Session（持久、可分叉、可回溯）
       + 绑定的浏览器标签/窗口
       + 绑定的文件/资料
       + 任务面板视图
```

工作区的所有操作都记录在对应的 Session 中：

```text
用户拖入一个 PDF → Session chunk：input_added
AI 提取 PDF 内容 → Session chunk：action
用户说"总结一下" → Session chunk：user_voice
AI 生成摘要 → Session chunk：result
用户说"不够简洁" → Session fork：correction_branch
```

---

## 右下角任务面板

任务面板是 Session Graph 的可视化前端，位于桌面右下角（常驻但可折叠）。

它同时服务两个目的：

```text
给用户看：AI 在做什么、做过什么、结果如何
给 AI 查：之前做过什么、用户偏好什么、任务间有什么关联
```

### 三种视图

#### 日志视图（默认）

最简单直观，像聊天记录：

```text
10:03:15  📋 用户：搜索天气
10:03:16  🔄 AI：打开浏览器
10:03:18  🔄 AI：输入"北京后天天气"
10:03:20  ✅ 结果：27 度多云
10:03:25  📋 用户：筛选岗位
10:03:26  🔄 AI：打开 BOSS 直聘
10:03:28  ⏳ AI：搜索中...
```

适合：查看"刚才发生了什么"

#### 树视图

层级清晰，支持展开/折叠：

```text
今日任务
├── 天气查询 ✓
│   ├── 首次：明天北京 [已修正]
│   └── 修正：后天北京 → 27 度多云 ✓
├── 求职筛选 [进行中]
│   ├── 打开 BOSS 直聘 ✓
│   ├── 搜索"前端开发" ✓
│   ├── 筛选条件设置 ✓
│   └── 提取结果 [进行中... 3/10]
└── 文档整理 [待开始]
```

适合：管理多个并行任务

#### 拓扑视图

展示任务间的因果关系和依赖：

```text
[天气查询] → [得知后天多云] → [用户决定后天带伞]
                                    │
[求职筛选] → [找到 10 个岗位] → [标记 3 个优先]
     │                              │
     └── [提取 JD 关键词] → [匹配简历] ─┘
```

适合：复杂多任务场景，理解"为什么做这件事"

### 面板交互

```text
切换视图：点击 [日志|树|拓扑] 切换
展开/折叠：点击任务节点
查看详情：点击某个 chunk 查看完整信息
回退分支：点击历史分支 → 恢复到该状态
拖拽排序：调整任务优先级
折叠面板：最小化为一个小图标
```

---

## 多 AI 工作模式

沿用 v1 的多 AI 工作模式，v2 每种模式都有 Session 支撑：

### 1. 队列模式（MVP）

```text
Task A 运行中 → Session A 活跃
Task B 排队 → Session B 待激活
Task C 等待确认 → Session C 暂停
```

### 2. 并行准备模式

```text
AI A：后台分析岗位 → Session A 记录分析过程
AI B：整理 PDF → Session B 记录整理过程
AI C：等待接管光标 → Session C 暂停
```

### 3. 内置 BrowserView 真并行模式

```text
BrowserView A → Session A → 虚拟光标 A
BrowserView B → Session B → 虚拟光标 B
BrowserView C → Session C → 虚拟光标 C
各自独立执行，通过 CDP/DOM 操作，不抢系统光标
```

这是 v2.1 的核心工作模式。每个 BrowserView：

```text
有独立的 DOM 和 CDP 通道
有独立的虚拟光标动画（可选）
有独立的 Session 记录
与其他 BrowserView 互不干扰
Cookie/登录状态可共享（同一 Chromium profile）
```

用户看到的效果：

```text
┌─────────────────────┬─────────────────────┐
│  BrowserView A      │  BrowserView B      │
│  岗位搜索           │  简历编辑            │
│  [光标 A 在动]      │  [光标 B 在动]      │
├─────────────────────┴─────────────────────┤
│  任务面板（日志/树/拓扑）                    │
└───────────────────────────────────────────┘
```

---

## "拖资料给 AI"的交互

沿用 v1 的拖拽交互设计，v2 中拖拽也是 Session chunk：

```text
用户拖入 → Session chunk: {type: "input_added", source: "user_drag", content_type: "url"}
AI 处理 → Session chunk: {type: "action", action: "extract_content"}
AI 结果 → Session chunk: {type: "result", content: "提取了 3 个关键信息"}
```

拖拽留痕成为工作流的输入节点，未来可复用。

---

## 个性化与 Session 的结合

v1 的个性化系统（Preference / PhraseAlias / BehaviorRule / WorkflowShortcut）在 v2 中与 Session 深度结合：

### Session 驱动的偏好学习

```text
记录引擎分析 Session 历史：
  "用户在求职工作区，连续 5 次都筛选了'远程'选项"
  → 自动提议偏好：求职工作区默认筛选远程

记录引擎发现模式：
  "用户每天早上先查天气，再看求职"
  → 自动提议工作流：早间 routine
```

### 习惯用语的 Session 上下文

```text
用户："按老规矩"
↓
Personalization Layer 命中 WorkflowShortcut
↓
记录引擎查询最近 Session："上次用老规矩是在求职工作区"
↓
加载求职工作区的工作流
```

### 工作流从 Session 中沉淀

```text
记录引擎检测到重复模式：
  Session A、B、C 都包含相似的步骤序列
  → 提议生成工作流模板
  → 用户确认后绑定为 WorkflowShortcut
```

---

## 用户控制权

沿用 v1 的用户最高控制权原则：

```text
全部暂停
暂停某个 AI
取消某个任务
查看任何 Session 的完整历史
回退到任何 Session 分支
删除某个 Session
只允许后台分析，不允许接管光标
```

v2 新增：

```text
查看/管理 Session Graph（通过任务面板）
手动 fork Session（保存当前状态作为检查点）
手动 merge Session（合并多个任务的结果）
导出 Session 历史（备份/迁移）
```

---

## Overlay 浮层系统

AI 光标不只是操作已有界面，还可以创建自有 UI 元素覆盖在屏幕上：

### 浮层类型

```text
便签（note）       — 用户口述的备忘内容
监控卡片（monitor）  — 绑定页面元素，定时刷新
步骤清单（checklist）— 从 Session 提取的操作步骤
对比视图（comparison）— 并排展示两个信息片段
文本片段（snippet）  — 从页面提取的内容
计时器（timer）     — 倒计时/提醒
```

### 场景示例

```text
用户："记住这个电话号码" → overlay.pin(便签，“张经理 13800001234”)
AI："发现 30 分钟后有会议" → overlay.pin(会议简报)
用户："帮我盯着这个股票价格" → overlay.pin(监控卡片，定时刷新)
用户："把刚才的操作步骤列出来" → overlay.pin(步骤清单，从 Session 提取)
```

### 浮层与 Session

```text
临时浮层：跟随当前 Session，任务结束自动消失
持久浮层：用户说"一直留着" → 存入 Memory，跨 Session 保留
每个 overlay 操作记录为 Session chunk
```

---

## 日程自动化维护场景

A2UI（AI-to-UI）协议结合内置 BrowserView，适合结构化、重复性的日常维护任务：

```text
早间 routine：
  BrowserView A → 打开日历应用 → 提取今日日程
  BrowserView B → 检查未读邮件 → 发现需要调整日程
  AI 自动调整 → 修改日历时间
  overlay.pin(今日摘要) → 钉在屏幕
  耳机："早上好，今天 5 个会议，下午的推迟到 2 点了。"

全程在内置 BrowserView 中完成，不占用户光标。
```

---

## MVP 建议

第一版实现：

```text
1 个系统光标 + 2-3 个内置 BrowserView
每个 BrowserView 绑定一个 Session
右下角任务面板（先实现日志视图）
简单 fork（用户纠正时自动分叉）
Session 持久化（SQLite）
基础拖拽输入
基础 overlay（便签类型）
基础偏好记忆
口语转文字输入（基础格式转换）
```

暂不实现：

```text
树视图和拓扑视图（第二版）
Session Graph 可视化编辑（第二版）
跨设备 Session 同步
自动 Session 合并
Session 导出/导入
多类型 overlay（监控/对比/计时器）
日程自动化 routine
```

---

## 一句话总结

**v2 的工作区从"任务卡"升级为"Session + BrowserView 驱动的智能工作区"：每个工作区绑定一个内置 BrowserView 和一个 Session，多个 BrowserView 通过 CDP/DOM 真正并行操作（每个有独立虚拟光标）。Overlay 浮层系统让 AI 能在屏幕上创建自有 UI（便签/监控/清单）。右下角任务面板既是用户的监控台，也是 AI 的外部记忆。**
