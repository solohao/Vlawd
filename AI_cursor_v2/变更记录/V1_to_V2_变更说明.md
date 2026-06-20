# V1 → V2 变更说明

---

## 变更日期：2026-06-17

## 变更级别：大版本架构升级

---

## 一、变更背景

### 为什么需要 V2

V1 架构基于 VAD → ASR → LLM → TTS 四模块串联（Pipeline），存在以下问题：

```text
1. 延迟高：Pipeline 累积延迟 1-3 秒，用户感知明显
2. 打断不自然：需要外部 VAD 检测 + TTS 停止，而非原生支持
3. 纠正代价大：纠正需要重走完整 Pipeline
4. 上下文管理弱：聊天记录式存储，不支持分叉和回溯
5. 架构复杂：9 层架构 + L0-L4 推理分层，维护成本高
```

### 什么技术使 V2 成为可能

```text
1. 全双工语音模型成熟
   GLM-4-Voice（9B）、PersonaPlex（7B）实现端到端延迟 < 200ms
   原生支持同时听说、打断、纠正

2. Session-first 上下文工程
   OpenRath 范式证明 Session Graph（fork/merge/lineage）可以高效管理 Agent 上下文
   语音纠正天然是分叉操作，Session Graph 完美匹配

3. 竞争环境变化
   OpenAI Codex 发布，云端异步 Agent 赛道竞争加剧
   需要明确差异化锚点：本地实时语音 Agent
```

---

## 二、架构决策

### ADR-001：语音交互层改用全双工模型

```text
替代：VAD + ASR + LLM + TTS 四模块串联
选用：GLM-4-Voice / BayLing-Duplex（中文优先）
原因：延迟从 1-3s 降至 < 200ms，原生支持打断/纠正
```

### ADR-002：两角色架构替代九层架构

```text
替代：Interface → VoiceRuntime → IntentRouter → Planning → Observation → Action → Safety → Trace → Personalization
选用：全双工模型（交互+理解+决策） + 记录引擎（Session Graph+任务面板）
原因：全双工模型一体化处理原来 VoiceRuntime + IntentRouter + Planning 的功能
```

### ADR-003：Session-first 上下文工程

```text
替代：聊天记录 + 事件日志
选用：Session Graph（fork/merge/lineage）+ 右下角任务面板
原因：语音纠正天然是分叉操作，需要可回溯的上下文结构
```

### ADR-004：竞争策略调整

```text
新增：vs Codex/Claude 差异化分析
锚点：本地隐私 + 全双工实时 + Session 可回溯 + 中文市场
不争："谁的 AI 更聪明"
```

---

## 三、模块影响范围

### v2.0 — 整体重写（6 个模块）

| 模块 | 变更内容 |
|------|---------|
| 产品文档/01_产品战略与定位 | 新增竞品分析（vs Codex/Claude），调整差异化锚点 |
| 产品文档/03_核心体验与安全原则 | 全双工交互体验重写，新增 Session 纠正机制 |
| 产品文档/04_工作区协同与Session | Session 驱动的工作区，右下角任务面板三视图 |
| 技术文档/01_系统总体架构 | 两角色架构替代九层架构 |
| 技术文档/03_全双工交互设计 | 全双工模型替代 ASR+LLM+TTS Pipeline |
| 技术文档/04_模型选型与本地推理 | 全双工模型 + 规则引擎替代 L0-L4 分层 |

### v2.0 — 新增模块（1 个）

| 模块 | 内容 |
|------|------|
| 技术文档/06_Session上下文工程 | Session Graph 数据结构、记录引擎设计、任务面板三视图 |

### v1.1 — 微调（3 个模块）

| 模块 | 变更内容 |
|------|---------|
| 技术文档/02_观察动作执行与留痕 | 留痕层对接 Session chunk，UserCorrection 触发 fork |
| 技术文档/05_任务工作区与光标调度 | CursorLease 绑定 Session，任务卡关联 Session |
| 技术文档/08_工程架构与AI可维护性 | 新增 Session Context，bounded contexts 从 9 个简化为 7 个 |

### v1.0 — 沿用（3 个模块）

| 模块 | 说明 |
|------|------|
| 产品文档/02_目标用户场景与MVP | 用户场景和 MVP 范围未变 |
| 技术文档/07_个性化与工作流系统 | Preference/PhraseAlias/BehaviorRule/WorkflowShortcut 设计未变 |
| 增长与验证文档/01_原型验证与商业判断 | 验证方式和商业判断未变 |

---

## 四、关键概念变更对照

| V1 概念 | V2 概念 | 变更说明 |
|---------|---------|---------|
| VAD + ASR + LLM + TTS | 全双工模型 | 四模块串联 → 端到端单模型 |
| 九层架构 | 两角色 + 执行器 | 合并功能相似的层 |
| L0-L4 推理分层 | 全双工 + 规则引擎 + 可选云端 | 简化分层，全双工模型内化 L1-L3 |
| 事件日志 | Session chunk | 线性日志 → 结构化 Session |
| 聊天记录 | Session Graph | 线性 → 有向图（fork/merge） |
| 准全双工 | 原生全双工 | Pipeline 拼接 → 模型原生 |
| TaskRun | Session | 独立记录 → 关联图谱 |
| StepEvent | chunk | 事件 → 有上下文的记录单元 |
| UserCorrection | correction chunk + fork | 日志记录 → 分支操作 |

---

## 五、保留不变的设计

以下 V1 设计在 V2 中完全保留：

```text
CursorLease 光标调度（排他调度，用户最高优先）
屏幕标号（overlay 编号 + 语音指向）
动作协议（结构化动作 + 安全等级）
多源屏幕感知（Screenshot + OCR + DOM + Accessibility Tree）
安全等级三档（safe / confirmation_required / blocked）
可监督执行（动作前高亮、高风险确认、可暂停/取消）
个性化四件套（Preference / PhraseAlias / BehaviorRule / WorkflowShortcut）
用户最高控制权
本地优先隐私原则
```

---

## 六、V1 文档保留

V1 文档完整保留在 `AI_cursor/` 目录下，不做修改。

V1 文档的价值：
- 设计决策的推理过程有参考价值
- 部分 V1 设计在 V2 中沿用
- 降级模式下可能回退到 V1 Pipeline
