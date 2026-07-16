# 02 · Session、Capsule、Project 与 Evidence

---
模块：共享架构与协议/02_SessionCapsuleProject与Evidence
当前版本：v1.2
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.2 | 2026-07-16 | 增加 Execution Environment 语义，扩展部署验证报告、失败分类和 Project Event |
| v1.1 | 2026-07-12 | 明确本文只定义跨项目语义；Vlawd Session 实现由 `AI_cursor_v2` 管理 |
| v1.0 | 2026-07-12 | 定义四类核心对象、转换关系、最小字段和协议边界 |

---

## 核心对象关系

本文件定义跨项目交换时的最小语义。Vlawd 内部 Session 的 Chunk、Record Engine、Memory、fork / merge 和持久化实现仍以 `AI_cursor_v2/技术文档/06_Session上下文工程.md` 为准。

```text
Session
  一次真实任务发生了什么

Evidence
  哪些事实可以验证结果

Capsule
  怎样在其他环境中复用一种能力

Living Project
  一个问题、方法或能力怎样长期演化

Execution Environment
  某个精确版本在什么隔离条件下被真实验证
```

转换路径：

```text
真实任务
→ Session
→ 选择 Evidence
→ 提炼 Capsule 或 Project
→ 其他 Runtime 执行 / 其他人贡献
→ 在声明的 Execution Environment 中验证
→ 新 Evidence
→ 新版本或分支
```

不是每个 Session 都值得生成 Capsule，也不是每个 Project 都必须可自动执行。

---

## Session（ART.SESSION）

Session 是本地事实记录，不是聊天记录的别名。

### 最小字段

```yaml
id:
owner:
goal:
status:
created_at:
updated_at:
environment:
privacy_scope:
parent_id:
chunks: []
```

### Chunk 类型

- user_intent；
- model_speech；
- observation；
- action_proposal；
- permission_decision；
- action_result；
- correction；
- preemption；
- failure；
- summary；
- artifact_reference。

### 生命周期

```text
created
→ active
→ paused / waiting_confirmation
→ active
→ completed / cancelled / failed
```

pause、cancel、rollback 和 takeover 必须拥有不同语义，不能只映射为一个 paused 状态。

---

## Evidence（ART.EVIDENCE）

Evidence 是能够支持或反驳某项声明的结构化记录。

### Evidence 类型

- test result；
- execution trace；
- screenshot / recording；
- source citation；
- benchmark；
- human review；
- failure report；
- compatibility report；
- signed service receipt。

### 最小字段

```yaml
id:
claim:
type:
artifact_id:
artifact_version:
environment:
producer:
created_at:
result:
source:
integrity:
privacy_scope:
```

Evidence 不能脱离精确对象版本和环境。一次成功不能证明全局兼容，一次失败也不能直接判定对象无效。

---

## Execution Environment（ART.ENVIRONMENT）

Execution Environment 记录可复现的环境要求和一次具体运行的环境引用。

```yaml
id:
project_id:
source_revision:
profile:
provider:
isolation:
runtime:
network_policy:
resource_limits:
persistence:
secret_refs: []
created_at:
expires_at:
status:
```

约束：

- `secret_refs` 只能保存引用，不能保存 Secret 值；
- 默认使用无持久存储、无公网入口、到期销毁的临时环境；
- Environment Instance 属于运行事实，只有可复现的 Declaration 才可能进入 Capsule；
- Evidence 只公开必要环境指纹，不自动公开私有日志和配置。

详细生命周期见 `03_可执行项目与部署验证.md`。

---

## Execution Report（ART.REPORT）

每次运行产生统一报告：

```yaml
run_id:
session_id:
artifact_id:
artifact_version:
project_id:
source_revision:
runtime:
agent:
model:
execution_profile:
environment:
environment_ref:
permissions_granted:
started_at:
finished_at:
status:
outputs:
failure_type:
latency:
cost:
resource_usage:
evaluator_results: []
evidence_refs: []
```

Execution Report 是 Registry 更新成功率、成本和兼容性信息的基础。

通用任务可以不填写 Project 和部署扩展字段；Project 部署运行必须填写 `project_id`、`source_revision`、`execution_profile` 和 `environment_ref`。其中 `environment` 保存可交换的环境指纹，`environment_ref` 指向本次私有 Environment Instance。

部署验证的推荐失败类型：

- `spec_gap`；
- `project_defect`；
- `environment_incompatible`；
- `secret_required`；
- `platform_limit`；
- `external_failure`；
- `policy_blocked`；
- `non_reproducible`。

只有跨项目重复出现的 `spec_gap` 才能直接推动 Module Spec 演化。

---

## Capsule（ART.CAPSULE）

Capsule 是可移植能力包，不是原始 Session 的压缩文件。

### 建议 Manifest

```yaml
id:
version:
artifact_type:
goal:
description:
preconditions: []
required_tools: []
required_capabilities: []
permissions: []
inputs: {}
outputs: {}
procedure: []
safety_policy:
evaluators: []
provenance:
privacy_scope:
compatibility: []
runtime_metrics:
parent_id:
lineage: []
known_limitations: []
```

### 必须满足

- 用户运行前可以理解目标和权限；
- Runtime 可以判断前置条件；
- 输出有明确 Schema；
- 成功有 Evaluator；
- 版本和来源可追踪；
- 不兼容时返回结构化原因；
- 敏感数据不因打包自动公开。

### 不包含

- 隐藏系统提示词；
- 未声明的网络端点；
- 原始支付凭据；
- 默认永久授权；
- 无法审查的任意代码执行；
- 将模型自然语言承诺作为唯一测试。

---

## Living Project（ART.PROJECT）

Living Project 是一个长期演化对象，可以包含：

- Problem；
- Goal；
- Constraints；
- Hypotheses；
- Solutions；
- Evidence；
- Counterexamples；
- Experiments；
- Decisions；
- Results；
- Capsule Releases；
- Environment Profiles；
- Execution Reports；
- Stable Releases。

### 状态

```text
draft
→ active
→ validated / disputed
→ stable
→ superseded / deprecated
```

状态不表示绝对真理，只表示当前维护状态和证据水平。

---

## Project Event（ART.EVENT）

所有协作操作统一写入事件：

```yaml
id:
project_id:
actor:
type:
base_version:
payload:
created_at:
evidence_refs: []
```

推荐事件类型：

- publish；
- comment；
- add_evidence；
- add_counterexample；
- branch；
- patch；
- review；
- merge；
- reject；
- supersede；
- deprecate；
- request_validation；
- approve_execution；
- attach_execution_report；
- propose_runtime_patch；
- promote_release；
- rollback_release。

自由文本评论可以存在，但应允许转化为结构化候选事件。环境创建、进程输出和探针轮询保留在 Runtime / Session，不复制到公共 Project Event 流。

---

## Lineage（ART.LINEAGE）

Lineage 记录对象从哪里来，而不是只记录当前作者。

```text
Session A
→ Capsule v0.1
→ Project Branch B
→ Patch C
→ Capsule v0.2
→ 在环境 D 运行失败
→ Compatibility Patch
→ Capsule v0.2.1
```

必须支持：

- parent；
- forked_from；
- derived_from；
- supersedes；
- merged_from；
- evaluated_by。

---

## Module Spec 映射

一个 Generative Module Spec 可以表示为：

```text
Living Project
  ├── Goal / Non-goals
  ├── Context Questions
  ├── Invariants
  ├── Decision Tree
  ├── Failure Modes
  ├── Compatibility Matrix
  ├── Execution Profiles
  └── Version History

Capsule
  ├── Inputs / Outputs
  ├── Procedure
  ├── Required Tools
  ├── Permissions
  └── Evaluators

Evidence
  ├── Generated Implementations
  ├── Conformance Tests
  ├── Deployment Runs
  ├── Execution Reports
  └── Failure Reports
```

---

## 高校知识项目映射

```text
Living Project
  ├── Problem
  ├── Constraints
  ├── Hypotheses
  ├── Solutions
  ├── Evidence
  └── Open Questions

Session
  └── 学生与 AI 的原始私密讨论

Project Event
  └── 同学评论、证据、分支和 Patch

Capsule
  └── 可选的学习方法、实验步骤或工具流程
```

原始 Session 默认私密，发布 Project 不应自动公开完整对话。

---

## 协议提取原则

Capsule v0.1 只能从真实摩擦中提取：

```text
先分别实现两个垂直对象
→ 找到重复字段和操作
→ 提取最小共同 Schema
→ 保留领域扩展
→ 在两个客户端互换
→ 根据失败修改
```

不要先规定所有未来对象类型、信誉体系和网络传输。

---

## 一句话总结

**Session 保存事实，Evidence 支撑判断，Execution Environment 固定验证条件，Capsule 迁移能力，Living Project 组织长期演化；Agentic Web 项目群的协议价值来自这些对象之间清晰且可验证的转换。**
