# 06 · Session 上下文工程

---
模块：技术文档/06_Session上下文工程
当前版本：v2.2
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v2.2 | 2026-07-16 | 补充环境交互 Evidence：Observation State、资源 epoch、后继状态、postcondition 和不确定结果 |
| v2.1 | 2026-07-12 | 新增本地 Session Evidence、Execution Summary、恢复锚点和第二天继续流程；明确 Session Graph 不等于 Agentic Web 的 Living Project |
| v2.0 | 2026-06-17 | 新增模块：Session Graph 数据结构、记录引擎设计、任务面板三视图 |

---

## 核心定位

Session 上下文工程是 AI 光标 v2 新增的核心模块。

v1 的上下文管理基于聊天记录和事件日志——线性、易丢失、不可分叉。v2 借鉴 OpenRath 的 Session-first 思想，把 **Session 作为一等公民**：

```text
Agent 是工人，Session 才是工作本身。

用户积累的不是"和 AI 的对话"，而是一整套结构化的工作证据链。
```

---

## 为什么 Session 对语音 Agent 特别重要

语音交互天然不精确。用户用键盘可以精确修改一个字，但用语音只能说：

```text
"不对，换一个"
"往回退"
"还是刚才那个好"
"再做一次昨天那个"
```

这些全是**分支操作**。传统对话系统把历史当线性聊天记录，一纠正就覆盖之前的上下文。

Session Graph 天然就是为"试错 → 回退 → 再试"的交互模式设计的：

```text
语音天然不精确
→ 用户需要反复调整
→ 调整就是分叉
→ 分叉需要可回溯
→ Session Graph 是最优数据结构
→ 任务面板让用户"看到"调整历史
→ AI 也能利用历史越用越懂你
```

---

## Session 数据结构（SESSION.STRUCT）

### Session 对象

```text
Session
├─ session_id: 唯一标识
├─ chunks: [ chunk_1, chunk_2, ... ]    # 时间线（按顺序记录一切）
├─ placement: ExecutionContext           # 在哪执行的（浏览器/窗口/标签）
├─ lineage:                             # 血缘关系
│   ├─ parent: session_id | null        # 父 Session
│   ├─ fork_from: session_id | null     # 从哪个 Session fork 出来
│   ├─ fork_reason: string              # fork 原因（纠正/分叉/新任务）
│   └─ merged_into: session_id | null   # 合并到哪个 Session
├─ memory_refs: [ memory_id, ... ]      # 关联的长期记忆
├─ status: pending | active | waiting_confirmation | paused | failed | completed | cancelled
├─ recovery:                            # 可恢复锚点
│   ├─ last_safe_chunk
│   ├─ current_goal
│   ├─ unresolved_questions
│   └─ required_revalidation
├─ execution_summary: summary_id | null
└─ usage: { duration, action_count }    # 资源消耗
```

### Chunk 对象

每个 chunk 是 Session 中的一个原子记录单元：

```json
{
  "chunk_id": "chunk_001",
  "session_id": "session_abc",
  "timestamp": "2026-06-17T10:03:15Z",
  "type": "user_voice | ai_response | action | result | correction | error | fork | merge",
  "content": {
    "text": "帮我搜一下明天北京的天气",
    "audio_ref": "audio_001"
  },
  "metadata": {
    "confidence": 0.95,
    "screenshot_ref": "screen_001",
    "element_ref": "element_3",
    "observation_state_id": "state_001",
    "resource_ref": "browser_page:target_A",
    "resource_epoch": 7,
    "successor_state_id": "state_002",
    "outcome": "worked",
    "verification": "verified"
  }
}
```

Chunk 类型：

| 类型 | 说明 |
|------|------|
| user_voice | 用户语音指令 |
| ai_response | 全双工模型语音反馈 |
| action | AI 执行的动作（鼠标点击、键盘输入等） |
| result | 动作执行结果 |
| correction | 用户纠正事件 |
| error | 执行错误 |
| fork | Session 分叉 |
| merge | Session 合并 |

---

## Session Graph（SESSION.GRAPH）

Session Graph 是所有 Session 之间 fork/merge 关系组成的有向图：

```text
main_session
├── fork → search_branch（用户说"帮我搜天气"）
│   ├── chunk: 打开浏览器
│   ├── chunk: 输入搜索词
│   ├── fork → corrected_branch（用户说"不对，查后天"）
│   │   ├── chunk: 修改搜索词
│   │   ├── chunk: 找到结果
│   │   └── merge → main_session（结果返回主线）
│   └── [已修正，保留历史]
├── fork → job_search_branch（用户说"帮我筛选岗位"）
│   ├── chunk: 打开招聘网站
│   ├── chunk: 搜索"前端开发"
│   └── [进行中...]
└── [待开始：整理文档]
```

### fork 操作

当以下事件发生时，记录引擎自动 fork 新 Session 分支：

```text
用户纠正（"不对"/"换一个"/"重来"）
用户开始新任务
用户说"回到刚才"
任务执行中出现异常需要重试
```

fork 不删除旧分支，只创建新分支。旧分支保留完整历史：

```python
corrected_session = session.fork(reason="用户纠正：查后天不是明天")
# 旧分支 session 保留，可回看
# 新分支 corrected_session 继续执行
```

### merge 操作

当分支任务完成，结果合并回主线：

```python
main_session = main_session.merge(completed_branch, result="后天27度多云")
```

### lineage 查询

可以追溯任何结果的完整来源：

```text
这个结果从哪来？
→ corrected_branch（chunk_005: 找到后天天气）
  → fork from search_branch（chunk_003: 用户纠正）
    → fork from main_session（chunk_001: 用户请求搜天气）
```

---

## 记录引擎设计（SESSION.ENGINE）

记录引擎是 Session 上下文工程的运行时组件，负责实时监听全双工模型和执行器的所有数据流：

```text
记录引擎监听：
├── 用户音频 → user_voice chunk
├── 全双工模型语音输出 → ai_response chunk
├── 动作指令 → action chunk
├── 执行结果 → result chunk
├── 打断事件 → interruption chunk
├── 纠正事件 → correction chunk + session.fork()
└── 错误事件 → error chunk
```

### 记录引擎不需要"聪明"

记录引擎的任务是：

- 把数据流格式化为结构化 chunk
- 维护 Session Graph 的 fork/merge 关系
- 响应查询（"昨天搜过什么？"）
- 判断哪些信息值得存入长期 Memory

这些任务对 3B 模型绰绰有余，甚至部分用规则引擎就能做：

```text
chunk 生成 → 规则引擎（模板化记录）
Session fork/merge → 状态机（检测纠正/分叉事件）
简单查询 → 关键词匹配 + 时间过滤
复杂查询 → 轻量模型（Qwen2.5-3B / Phi-3-mini）
长期记忆筛选 → 轻量模型
```

### 记录引擎的部署

```text
运行方式：本地后台进程
资源占用：2-4GB 内存/显存
存储：SQLite（本地，隐私安全）
无网络依赖
```

---

## 长期 Memory（SESSION.MEMORY）

Session 是单次任务的完整记录。Memory 是跨 Session 的持久记忆。

```text
Session 完成后：
记录引擎 → 提取关键信息 → 写入 Memory Store

下次任务开始时：
全双工模型请求上下文 → 记录引擎 → recall Memory → 返回相关历史
```

Memory 存储内容：

```text
用户偏好（"用户喜欢远程岗位"）
任务模式（"用户每天早上先查天气"）
纠正历史（"用户常把'明天'改成'后天'"）
成功工作流（"搜索岗位的完整步骤"）
网站特定信息（"这个网站需要登录"）
```

Memory 查询：

```text
全双工模型："用户之前搜过什么天气？"
记录引擎 → Memory.recall("天气查询", time_range="recent")
→ 返回："昨天查过北京后天天气，结果 27 度多云"
全双工模型 → 推断用户可能还要查北京天气
```

---

## 右下角任务面板（SESSION.PANEL）

任务面板是 Session Graph 的可视化前端，同时服务用户和全双工模型：

```text
面板 = 用户看到的"AI 在做什么"
     = 全双工模型查到的"之前做过什么"
     = 用户和 AI 共享的外部记忆空间
```

### 三种视图

#### 日志视图（默认）

```text
[10:03:15] 📋 搜索天气
[10:03:16] 🔄 打开浏览器
[10:03:18] 🔄 输入"北京后天天气"
[10:03:20] ✅ 结果：27 度多云
[10:03:25] 📋 筛选岗位
[10:03:26] 🔄 打开 BOSS 直聘
[10:03:28] ⏳ 搜索中...
```

适合：查看"刚才发生了什么"

#### 树视图

```text
今日 ─┬─ 天气 ✓
      │   ├─ 首次：明天 [已修正]
      │   └─ 修正：后天 → 27 度多云 ✓
      ├─ 求职 ⏳
      │   ├─ 搜索 ✓
      │   ├─ 筛选 ⏳
      │   └─ 提取 [3/10]
      └─ 文档 ○
```

适合：管理多个并行任务，展开/折叠

#### 拓扑视图

```text
[查天气] → [得知多云] → [决定带伞]
[筛选岗位] → [找到 10 个] → [标记 3 个优先]
     │                          │
     └── [提取 JD 关键词] → [匹配简历] ──┘
```

适合：理解任务间的因果关系和依赖

### 面板操作

用户可以在面板上：

```text
点击某个任务 → 查看详情
展开/折叠分支 → 管理复杂任务
点击历史分支 → 回到之前的状态
拖拽任务 → 调整优先级
```

---

## Session 与其他模块的关系

```text
全双工模型 → 记录引擎：所有输入输出被记录
记录引擎 → 全双工模型：提供历史上下文查询
记录引擎 → 任务面板：实时更新三视图
记录引擎 → Personalization Layer：记录用户偏好模式
记录引擎 → Workflow System：成功路径沉淀为工作流模板
执行器 → 记录引擎：执行结果写入 Session
Safety Policy → 记录引擎：安全决策留痕
```

---

## Session Evidence 与 Execution Summary（SESSION.EVID）

V2 不把所有日志直接称为 Evidence。Evidence 是能够支持或反驳某个任务结论的可核验片段。

```text
Session：
  完整事实日志

Evidence：
  从 Session 中选出的来源、动作结果、截图、错误或用户确认

Execution Summary：
  面向用户和恢复流程的任务摘要
```

最小 Execution Summary：

```text
goal
status
conclusions
source_refs
evidence_refs
user_corrections
failed_attempts
unresolved_questions
next_recommended_step
environment
model_and_provider
duration_and_cost
```

生成规则：

- 结论必须能够追溯到一个或多个 `source_ref` / `result` chunk；
- 用户纠正和失败不得从摘要中静默删除；
- 未验证推断与已验证事实分开；
- 高风险动作记录提议、确认、执行结果和确认人；
- 摘要可以重新生成，原始 Session chunk 不可被摘要覆盖。

环境交互 Evidence 的最小关联：

```text
ActionProposal
→ observation_state_id
→ resource_ref + resource_epoch
→ 用户确认或 Safety 决策
→ 已执行步骤和 stopped_at
→ successor_state_id
→ postcondition verification
→ diff / screenshot / structured result
```

记录原则：

- `worked / didnt / unknown` 不压缩成单一布尔值；
- `verified / preexisting / failed` 必须保留，避免把动作前已存在的状态算作成功；
- 事件送达、API 返回 200 或输入注入无报错不能单独成为业务 Evidence；
- 用户接管、焦点变化、旧状态拒绝和降级路径属于事实，不得从摘要隐藏；
- Screenshot、UI Tree 和剪贴板按敏感等级与 TTL 保存，Evidence 优先引用最小结构化片段。

---

## Session 延续与第二天继续（SESSION.RESUME）

任务暂停、失败或未完成时，记录引擎保存恢复锚点：

```text
当前目标
已完成步骤
最近安全状态
当前 Workspace / URL / 文件
用户最后一次纠正
未解决问题
下次继续前必须重新验证的环境
```

重新打开流程：

```text
用户打开昨日 Session
→ 展示目标、结论、来源、未解决问题
→ 用户选择继续当前分支或创建新分支
→ Runtime 重新观察页面和权限状态
→ 对过期登录、页面变化和外部数据重新验证
→ 从最近安全锚点生成下一步
→ 新动作继续写入同一 lineage
```

恢复不是盲目重放旧动作。任何依赖外部页面、账号、时间或权限的步骤都必须先重新观察。

---

## 与 Agentic Web 共享对象的边界

V2 Session 是 Vlawd 内部的运行时事实记录；它不是公开网络项目，也不直接等于 Capsule。

```text
Vlawd v2：
  Session / Chunk / Evidence / Execution Summary

未来跨项目层：
  Capsule / Living Project / Registry
```

只有当至少两个真实垂直项目需要交换同类对象时，才由 `Agentic_Web/共享架构与协议/` 抽取跨 Runtime 契约。V2 当前只保证本地记录可追溯、可恢复、可导出，不提前实现完整网络协议。

---

## 核心设计模式

### 模式 1：Session 作为一等公民

每个用户交互/AI 动作都是一个 chunk，每个任务流程都是一个 Session：

```text
不是"把信息塞进 prompt"
而是"把信息记录为 Session chunk，需要时按需查询"
```

### 模式 2：Fork/Merge 表达任务纠正和分叉

```text
不是"删除之前的记录"
而是"fork 新分支，旧分支保留"
可以随时回到任何历史分支
```

### 模式 3：持久化可查询

```text
不是"对话结束就丢失"
而是"Session 持久存储，跨任务可查询"
"帮我再做一次昨天那个" → 搜索历史 Session
```

---

## 隐私原则

Session 数据包含用户的完整操作历史：

```text
默认本地保存（SQLite）
用户可删除任何 Session
敏感字段脱敏
不默认上传
不默认跨设备同步
用户可导出自己的 Session 数据
```

---

## 与竞品的差异

```text
Codex：文字输入，用户精确描述需求，不太需要反复纠正
      → Session Graph 对 Codex 价值有限

AI 光标：语音输入，纠正/调整/回退是常态
        → Session Graph 是核心产品价值
        → 用户的调整历史本身就是"越用越懂你"的数据基础
```

---

## MVP 实现建议（SESSION.MVP）

第一版 Session 引擎：

```text
1. 基础 Session + chunk 记录（SQLite）
2. 简单 fork（用户纠正时自动分叉）
3. 日志视图（最简单的时间线 UI）
4. 基础 Memory recall（关键词搜索）
```

暂不实现：

```text
- 复杂 Session Graph 可视化
- 跨设备 Session 同步
- 自动 Session 合并
- 拓扑视图
```

---

## 一句话总结

**Session 上下文工程把"AI 做了什么"从散落的日志升级为结构化的 Session Graph。用户的每次纠正是 fork，每次回退是 merge，所有历史路径都保留。右下角任务面板（日志/树/拓扑三视图）既给用户看 AI 在做什么，也给 AI 查之前做过什么——用户和 AI 共享同一个外部记忆空间。这对语音 Agent 是刚需，因为语音交互天然就是"试错→回退→再试"的过程。**
