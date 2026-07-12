# AI_cursor_v3 → Agentic_Web 模块拆分说明

---
模块：变更记录/AI_cursor_v3_to_Agentic_Web_模块拆分
当前版本：v1.0
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-07-12 | 记录错误 V3 命名的原因、模块迁移、权威边界和后续版本规则 |

---

## 问题

最初将长期愿景和项目群规划放入 `AI_cursor_v3/`，隐含了以下错误关系：

```text
AI_cursor_v2
→ AI_cursor_v3
```

但原目录中的大部分内容并没有继承并替代 V2 的详细产品设计，而是在另一个维度描述：

- Agentic Web 长期愿景；
- 多项目层级和依赖；
- Capsule / Living Project 共享对象；
- Registry 与 Post is Project 平台；
- Module Spec 和高校论坛垂直实验；
- 跨项目开发顺序与阶段门。

因此 `AI_cursor_v3` 把“Vlawd 产品版本”和“项目群蓝图版本”混成了一个版本轴。

---

## 修正后的关系

```text
产品版本轴：
AI_cursor_v1 → AI_cursor_v2 → 未来真正的 AI_cursor_v3

项目群蓝图轴：
Agentic_Web v1.0 → v1.1 → v2.0
```

两条轴相互引用，但独立升级。

| 模块 | 当前职责 | 当前版本 |
|------|---------|---------|
| `AI_cursor_v2/` | Vlawd 产品、交互、技术架构、MVP 和代码基线 | v2.10 |
| `Agentic_Web/` | 长期愿景、项目群关系、共享对象和跨项目阶段门 | v1.0 |
| Capsule Protocol | 未来独立协议模块 | draft v0.1 |
| Module Spec | 未来独立垂直项目 | concept v0.1 |
| Campus Lab | 未来独立垂直项目 | concept v0.1 |
| Post is Project | 未来独立平台模块 | concept v0.1 |

---

## 内容迁移

### 保留在 Agentic_Web

- Agentic Web 与可执行互联网长期愿景；
- L0-L7 分层和 Runtime / Coordination / Artifact 三平面；
- 项目群定位、依赖和开发顺序；
- Session、Evidence、Capsule、Living Project 的跨项目关系；
- Post is Project、Registry 和二维图谱的长期边界；
- 三条垂直验证路径；
- 通用 Dogfood、模型评测、成本和停止制度。

### 合并回 AI_cursor_v2

- Vlawd 在项目群中的产品定位；
- 实时语音、Execution Brain、Record Notebook 和 Safety Preemption 的职责边界；
- Task Workspace 和运行时状态语义；
- 研究型 Golden Path；
- Session Evidence 与第二天继续任务；
- Vlawd 两周 Dogfood 周期；
- U2 界面成熟线、三次证据和视觉止损；
- 模型 Baseline 与历史 Session 回放。

### 删除的重复

原 `AI_cursor_v3/技术文档/03_VlawdRuntime全双工与多任务界面.md` 不再作为第二份 Vlawd 权威设计保留；其中有效内容被选择性合并回 V2 既有模块。

---

## 权威边界

```text
Vlawd 详细设计：
  AI_cursor_v2 是唯一权威来源

Agentic Web 项目群关系：
  Agentic_Web 是唯一权威来源

跨模块引用：
  使用链接和版本矩阵
  不复制完整章节
```

Agentic Web 可以声明“Vlawd 是 L1 Runtime + L7 客户端”，但不能重新定义 Vlawd 的按钮、状态机、Provider 或代码目录。

V2 可以声明“Vlawd 是 Agentic Web 的个人入口”，但不能在产品文档中提前定义完整 Capsule Registry 或平台协议。

---

## 代码影响

本次仍不迁移或复制代码：

```text
当前实现：
AI_cursor_v2/app
```

Vlawd 继续在现有工程中实现 Golden Path。只有未来出现不可兼容的数据迁移、包边界和 Runtime 替换时，才评估真正的产品级 V3。

---

## 决策结论

> **目录代表稳定模块身份，版本写在模块内部；Vlawd 产品和 Agentic Web 项目群分别管理、分别演进。**

`AI_cursor_v3` 命名被撤销，不再占用未来真正产品主版本的语义。
