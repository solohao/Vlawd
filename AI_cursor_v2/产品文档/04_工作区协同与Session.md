# 04 · 工作区协同与 Session

---
模块：产品文档/04_工作区协同与Session
当前版本：v2.0
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v2.0 | 2026-06-17 | 整体重写：新增 Session Graph 任务管理、右下角任务面板三视图、Session 驱动的工作区协同 |
| v1.0 | 2026-06-01 | 初版：多 AI 工作区、拖拽协同、工作流沉淀和可监督自配置 |

---

## 核心结论

v1 把 AI 光标理解为"多个 AI 虚拟光标 + 执行调度器"。

v2 在此基础上新增 Session 维度：

```text
1 个真实系统光标
+ N 个 AI 虚拟光标
+ N 个 AI 工作区
+ 1 个执行调度器
+ 1 个 Session Graph 记录引擎
+ 1 个右下角任务面板
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

### 3. 沙盒并行模式

```text
Browser Context A → Session A
Browser Context B → Session B
各自独立执行，不抢真实光标
```

每个沙盒的操作都记录在独立 Session 中，互不干扰。

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

## MVP 建议

第一版实现：

```text
1 个真实光标
2-3 个 AI 任务卡（工作区）
每个任务卡绑定一个 Session
右下角任务面板（先实现日志视图）
简单 fork（用户纠正时自动分叉）
Session 持久化（SQLite）
基础拖拽输入
基础偏好记忆
```

暂不实现：

```text
树视图和拓扑视图（第二版）
Session Graph 可视化编辑（第二版）
跨设备 Session 同步
自动 Session 合并
Session 导出/导入
```

---

## 一句话总结

**v2 的工作区从"AI 虚拟光标 + 任务卡"升级为"Session 驱动的智能工作区"：每个工作区是一个活跃的 Session，所有操作自动记录为 chunk，纠正自动 fork 新分支，成功路径自动沉淀为工作流。右下角任务面板（日志/树/拓扑三视图）既是用户的操作监控台，也是 AI 的外部记忆查询入口——用户和 AI 共享同一个"记忆空间"。**
