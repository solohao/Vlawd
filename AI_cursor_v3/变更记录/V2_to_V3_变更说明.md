# V2 → V3 变更说明

---
模块：变更记录/V2_to_V3_变更说明
当前版本：v1.0
---

## 变更原因

V2 已经建立全双工 AI 桌面员工、可见执行、Session、模型配置与 Electron 原型，但后续产品讨论出现了三个不能继续作为普通功能塞入 V2 的变化：

1. Session 不只服务个人记忆，还可能生成可移植 Capsule；
2. 帖子不再是静态内容，而可能成为可执行、可验证、可持续演化的项目；
3. Vlawd 之外出现 Module Spec 和高校二维论坛两个独立垂直验证场景。

因此系统从“单一桌面应用”演化为“由 Runtime、对象协议、网络平台和垂直项目构成的项目群”。

---

## 核心变化

| 维度 | V2 | V3 |
|------|----|----|
| 长期类别 | AI 桌面员工 | 可执行、可验证、可演化的 Agentic Web |
| 主要入口 | 耳机 + 桌面光标 | Vlawd、IDE、Web、画布等多个客户端 |
| 事实对象 | Session | Session + Evidence |
| 可移植对象 | 工作流模板 | Capsule |
| 网络对象 | 工作流市场 | Living Project |
| 协作方式 | 发布和下载 | comment、evidence、branch、patch、merge |
| 垂直场景 | 桌面任务 | Vlawd、Module Spec、高校知识论坛 |
| 平台顺序 | Phase 2 市场 | 两个垂直验证后才抽取协议和 Registry |
| 开发制度 | 功能 Phase | Golden Path + 证据门 + Dogfood 周期 |
| 护城河 | 语音、Session、隐私 | 入口 + 个人状态 + 可验证网络 |

---

## 保留的 V2 核心

V3 不否定以下判断：

- 全双工语音是重要体验入口；
- 本地安全抢占必须独立于模型；
- 可见执行和高风险确认是信任基础；
- Session 是记录纠正、结果和上下文的核心；
- 模型应可替换，安全不交给模型；
- 浏览器优先是早期合理切口；
- Vlawd 需要能够被创始人长期 Dogfood。

---

## 修正的 V2 判断

### 工作流市场不直接进入早期 Phase 2

没有跨环境可移植、权限、Evidence 和版本模型时，市场只会成为低质量模板库。V3 将其拆为：

```text
本地 Session
→ 本地复用
→ Capsule v0.1
→ Registry
→ Post is Project
→ 公开生态
```

### Session Graph 不等于网络项目图谱

Session Graph 记录一次任务的过程；Living Project Graph 组织多个版本、方案、证据和贡献。二者相关，但不能共用一个含义模糊的数据结构。

### 全双工不是唯一护城河

全双工负责高频入口和差异化体验；长期防御力来自：

```text
可见且可靠的执行工程
+ 个人 Session、偏好和信任状态
+ 私有真实任务 Eval
+ 可验证 Capsule / Project 网络
```

### 不再提前设计完整通用协议

V3 只在至少两个真实垂直场景暴露共同需求后提取 Capsule Protocol，通信和 Agent 互操作优先复用现有标准。

---

## 代码影响

本次 V3 只新增文档，不复制或迁移代码。

```text
当前实现基线：
AI_cursor_v2/app

当前实现优先事项：
1. 安全策略 blocked 优先级
2. target_view 严格校验和执行器隔离
3. pause / cancel / rollback / confirm 状态机
4. 真实全双工 Provider 与音频流
5. 一个只读浏览器 Golden Path
6. 可恢复 Session
```

当 V3 第一个 Golden Path 进入代码实施时，应在现有工程中做最小修改。只有出现不可兼容的目录、包边界或数据迁移需求，才创建代码级 V3 迁移 ADR。

---

## 决策结论

> **V3 是项目群和验证方法的主版本升级，不是当前代码库的重写许可。**

V2 保留为已经实现的产品骨架；V3 负责决定下一步应该验证什么、哪些共同能力值得抽象，以及什么时候才有资格建设网络和平台。
