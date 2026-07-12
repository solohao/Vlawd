# 01 · Agentic Web 分层架构

---
模块：技术文档/01_AgenticWeb分层架构
当前版本：v1.0
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-07-12 | 建立 L0-L7 分层、三平面模型和跨层控制面 |

---

## 架构目标

V3 需要同时避免两种错误：

1. 把所有能力塞进 Vlawd 单体应用；
2. 在没有真实使用前拆出大量协议、平台和服务。

因此采用“长期分层、近期单体实现”的策略：

```text
文档和接口按层明确边界
实现优先保持简单
只有跨两个真实场景复用时才拆出独立服务或协议
```

---

## L0-L7 分层

```text
L7 体验与客户端
    Vlawd 桌面、IDE 插件、Web 论坛、二维画布、可选 Feed

L6 垂直项目与内容
    Generative Module Spec、知识项目、研究问题、服务项目

L5 Post is Project 协作平台
    Project、评论、Patch、Fork、Merge、治理、社区

L4 Registry / Network
    发布、搜索、分发、身份、签名、信誉、订阅

L3 Capsule / Living Artifact Protocol
    Manifest、版本、依赖、权限、测试、Evidence、Lineage

L2 Session / Evidence
    目标、动作、纠正、结果、环境、失败和成本

L1 Agent Runtime
    Vlawd Runtime、Coding Agent、浏览器执行器、云端 Agent

L0 基础设施
    模型、GPU、云 API、OS、浏览器、音频和工具
```

贯穿所有层的控制面：

```text
Evaluation
Security
Permission
Provenance / Trust
Privacy
Cost
```

---

## 各层职责

### L0 基础设施（ARCH.INFRA）

提供可替换资源：

- 本地或云端模型；
- GPU 和推理服务；
- 操作系统与设备 API；
- 浏览器、DOM、Accessibility Tree；
- 音频设备与传输；
- 文件、数据库和对象存储。

上层不能把具体模型厂商写入核心对象语义。

### L1 Agent Runtime（ARCH.RUNTIME）

负责：

- 接收用户目标；
- 感知环境；
- 规划和调用工具；
- 执行动作；
- 管理任务状态；
- 本地抢占与安全；
- 生成 Session 和 Execution Report。

Runtime 可以是 Vlawd、Coding Agent 或其他兼容客户端。

### L2 Session / Evidence（ARCH.EVIDENCE）

负责保存真实发生的事实：

- 用户原始目标；
- 输入和约束；
- 动作与工具调用；
- 用户纠正；
- 环境和版本；
- 成功、失败和取消；
- 成本、延迟和权限；
- 可验证输出。

这一层不自动声称结果可复用，只提供抽取能力的证据。

### L3 Capsule Protocol（ARCH.PROTOCOL）

负责将经过验证的经验表示为 Runtime 无关对象：

- Goal；
- Preconditions；
- Inputs / Outputs；
- Required Tools；
- Permissions；
- Procedure / Actions；
- Tests / Evaluator；
- Provenance；
- Compatibility；
- Lineage。

协议不规定使用 HTTP、A2A、Git 或 P2P 传输。

### L4 Registry / Network（ARCH.REGISTRY）

负责：

- 对象发布和版本寻址；
- 搜索与能力发现；
- 签名、身份和来源；
- 兼容性与运行统计；
- 私有、组织和公开可见性；
- 订阅和更新。

第一版优先使用中心化服务，不因长期网络愿景提前引入分布式共识。

### L5 Post is Project（ARCH.PLATFORM）

负责：

- Project 生命周期；
- typed contribution；
- review、patch、branch 和 merge；
- 维护者权限；
- 冲突和争议保留；
- 稳定版本和实验分支；
- 社区治理。

### L6 垂直项目（ARCH.VERTICAL）

提供具体领域语义：

- Module Spec 的模块约束和测试；
- 高校论坛的问题、证据和课程来源；
- 服务 Capsule 的价格、地区和退款；
- 研究项目的假设、实验和反例。

平台不能强迫不同领域共享所有字段，只要求共享最小核心对象。

### L7 客户端（ARCH.CLIENT）

同一份数据可以投影为：

- 任务工作区；
- 项目详情；
- 论坛；
- 二维画布；
- 列表；
- Diff；
- Agent 任务上下文；
- 可选 Activity / Feed。

视图不是数据源，用户在不同视图的操作必须生成统一 Project Event。

---

## 三平面模型

分层描述数据和产品位置；三平面描述系统运行时如何协作。

### Runtime Plane

真正执行任务，包括 Vlawd、Coding Agent、浏览器执行器和模型服务。

### Coordination Plane

负责需求发布、能力发现、任务委托、组队、竞标和结果回传。

V3 不自行设计通用涌现式协调协议。优先复用 A2A、HTTP、队列或未来成熟标准。

### Artifact Plane

负责 Session、Evidence、Capsule、Project、版本和 Lineage。

V3 当前最独特、最值得自定义的是 Artifact Plane。

```text
用户目标
→ Runtime Plane 执行
→ Coordination Plane 按需委托
→ Artifact Plane 保存事实和可复用对象
```

---

## 跨层控制面（ARCH.CONTROL）

### Evaluation

每个稳定对象必须说明如何判断成功，不能只依赖点赞或自然语言自评。

### Security

安全规则独立于模型。权限默认最小化，高风险操作必须显式确认。

### Permission

对象发布“需要什么权限”，Runtime 决定当前用户是否授予。

### Provenance / Trust

记录创建者、使用的来源、模型、派生关系、验证者和签名，不把来源与正确性混为一谈。

### Privacy

Session 默认私有。公开发布只包含用户审查后的结构化对象和必要 Evidence。

### Cost

运行前可预估，运行后可追踪。网络贡献不能产生无限无预算推理。

---

## 依赖方向

```text
L7 Client
  ↓ 调用
L1 Runtime / L5 Platform
  ↓ 产生
L2 Session / Evidence
  ↓ 提炼
L3 Capsule
  ↓ 发布
L4 Registry
  ↓ 协作
L5 Platform

L6 Vertical 为 L3-L5 提供领域 Schema 和 Evaluator
L0 Infra 可被 L1 替换，不向上定义产品语义
```

禁止：

- Registry 直接控制本地高风险动作；
- UI 私有状态成为唯一事实源；
- Capsule 携带未声明权限的隐藏执行；
- 模型输出绕过 Safety；
- 平台热度覆盖真实运行 Evidence。

---

## 实现策略

近期可以在同一代码库或进程中实现多个逻辑层，但接口必须明确：

```text
SessionStore
ExecutionReportWriter
ArtifactExporter
Evaluator
PermissionChecker
ProjectEventStore
```

只有满足以下任一条件才拆分独立服务：

- 两个客户端需要共同访问；
- 权限和数据隔离要求独立边界；
- 负载或生命周期显著不同；
- 第三方需要稳定接口；
- 当前单体已经阻碍 Golden Path。

---

## 一句话总结

**V3 以 Runtime 产生真实 Session，以 Capsule 形成协议窄腰，以 Registry 分发能力，以 Post is Project 组织持续协作；垂直项目提供证据，客户端只负责不同视图。**
