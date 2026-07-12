# 03 · Vlawd Runtime、全双工与多任务界面

---
模块：技术文档/03_VlawdRuntime全双工与多任务界面
当前版本：v1.0
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-07-12 | 将 V2 Runtime 放入 V3 架构，定义模型职责、抢占、多任务和首个 Golden Path |

---

## Vlawd Runtime 定位

Vlawd 负责把自然交互转化为可监督任务：

```text
Audio / Text Input
→ Turn Detection / Preemption
→ Execution Brain
→ Action Proposal
→ Safety / Permission
→ Executor
→ Session / Evidence
→ Task Workspace
```

它必须能够在没有完整 Agentic Web 平台时独立工作。

---

## 全双工交互（UX.DUPLEX）

全双工的目标不是让 AI 持续说话，而是让听、说、执行和纠正可以自然重叠：

```text
AI 说明当前步骤
+ 执行低风险动作
+ 持续监听用户插话
+ 在抢占后保留任务上下文
```

实时语音层与执行层必须解耦，语音模型故障时可以降级到文本监督，不能让整个 Runtime 失效。

---

## 模型职责拆分

不要求一个模型承担所有职责。

### 实时语音层

负责：

- 音频输入输出；
- turn-taking；
- 插话检测；
- 低延迟语音反馈；
- partial transcript。

### Execution Brain

负责：

- 理解目标；
- 规划；
- 生成 ActionProposal；
- 处理不确定性；
- 根据用户纠正调整任务。

### Record Notebook

负责：

- 整理 Session；
- 提取目标、纠正、结论和开放问题；
- 生成 Project Draft；
- 压缩长期上下文。

可以使用规则或廉价小模型，不占用实时语音关键路径。

### Safety Preemption

负责：

- 停止；
- 暂停；
- 取消；
- 回滚请求；
- 接管；
- 高风险动作阻止。

这一层使用本地确定性规则和状态机，不依赖模型是否正确理解。

---

## 安全抢占（UX.PREEMPT）

目标体验：

```text
AI 正在说话或执行
→ 用户开始插话
→ 音频输出立即衰减或停止
→ 当前动作在安全边界暂停
→ 记录 partial transcript
→ 判断 pause / cancel / correction / takeover
→ 更新 Session
```

控制语义：

| 意图 | 行为 |
|------|------|
| pause | 暂停当前任务，可继续 |
| cancel | 终止未完成动作，不自动恢复 |
| rollback | 请求撤销已执行且支持撤销的动作 |
| takeover | 用户取得当前界面控制权 |
| resume | 从明确检查点继续 |
| correction | 保留原历史，更新目标或生成分支 |

关键词匹配只能作为早期 fallback，不能成为最终实时抢占机制。

---

## ActionProposal 边界

每个提议必须包含：

- proposal_id；
- target_view；
- 原子动作；
- 预期结果；
- 安全等级；
- 所需确认；
- 可选 rollback；
- confidence。

执行前必须：

- 严格验证 target_view；
- 确认执行器与权限相符；
- blocked 优先于 confirmation；
- 未知执行器拒绝，不回退到系统执行器；
- confirmation 进入持久待确认队列；
- 运行期间持续检查抢占。

---

## 可见执行（UX.VISIBLE）

用户需要看到：

- 当前任务；
- AI 正在使用的工具或页面；
- 已完成和待执行步骤；
- 为什么暂停；
- 下一项确认；
- 来源和输出；
- 成本、时间和失败；
- 接管入口。

可见执行不等于每个底层动作都移动真实鼠标。对于并行或后台任务，可以展示结构化进度和证据。

---

## 多任务工作区（UX.TASKLANE）

### Task 状态

```text
queued
planning
acting
waiting_user
paused
completed
cancelled
failed
```

### Task Card

```yaml
task_id:
title:
status:
session_id:
current_step:
current_tool:
progress:
waiting_reason:
pending_confirmation:
last_evidence:
cost:
```

用户可以通过语音引用任务：

- “第二个任务先停一下”；
- “继续刚才的模型研究”；
- “购买任务不要提交”；
- “我来接管这个页面”。

同一系统光标仍然需要排他控制；并行感来自任务状态和独立 Browser / Tool Context，而不是多个系统光标争用。

---

## 耳机与音频入口（UX.HEADSET）

近期架构：

```text
蓝牙 / USB 耳机或电脑麦克风
→ OS 音频设备
→ Vlawd Host
→ 本地 VAD、抢占和隐私状态
→ 本地或云端全双工模型
```

需要处理：

- 输入输出可以来自不同设备；
- 蓝牙 Hands-Free 模式的音质限制；
- A2DP 只有高质量输出时的麦克风 fallback；
- 设备切换和断连；
- 明确录音状态；
- 本地静音和硬件暂停。

第一阶段不直接实现底层蓝牙协议栈。

---

## 首个 Golden Path（UX.RESEARCH）

> **用户通过耳机提出一个真实研究目标，Vlawd 可见地完成只读网页研究，用户途中纠正，结果保存为第二天可以继续的 Session / Project Draft。**

### 输入

- 自然语言目标；
- 限定主题；
- 时间或成本预算；
- 可选资料范围。

### 允许动作

- 打开页面；
- 搜索；
- 滚动；
- 读取 DOM 和页面文本；
- 保存引用；
- 生成结构化摘要。

### 禁止动作

- 登录新账号；
- 提交表单；
- 购买；
- 公开发布；
- 删除文件；
- 修改系统设置。

### 输出

- 来源；
- 比较或结论；
- 用户纠正；
- 未解决问题；
- 可继续分支；
- Execution Report。

---

## V2 实现继承

V3 继续复用 V2 的：

- DuplexModelProvider 抽象；
- ActionProposal；
- Session 类型；
- 安全抢占骨架；
- Electron 主窗口和 Overlay；
- Provider Registry；
- 浏览器场景骨架。

进入真实 Dogfood 前必须补齐：

- 真实音频流和 Provider；
- 状态变化推送到 Renderer；
- 安全策略最严格决策优先；
- target_view 枚举校验；
- 待确认队列；
- 实际 pause / cancel / rollback 区分；
- 持久 Session 恢复；
- 真实只读浏览器执行器。

---

## 一句话总结

**Vlawd 的关键不是同时移动多个光标，而是让用户通过全双工入口监督多个独立任务；每个任务可见、可停、可恢复，并产生可继续使用的 Session。**
