# 04 · 可验证环境交互与 Computer Use

---
模块：共享架构与协议/04_可验证环境交互与ComputerUse
当前版本：v1.0
状态：长期架构参考
---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-07-16 | 建立语义优先、状态作用域、结果可验证的环境交互原则；明确外部 Computer Use 项目只作为参考和基准，不成为 Runtime 硬依赖 |

---

## 模块定位

Agentic Web 不只需要 Agent 调用结构化 API，也需要在缺少 API、MCP 或 CLI 的情况下操作人类正在使用的软件界面。

这项能力的长期定位是：

```text
L0：
  OS Accessibility / UI Automation / Screenshot / OCR / Input / CDP

L1：
  Environment Interaction Adapter
  Observation State
  Action Delivery
  Resource Scheduling
  Postcondition Verification

L2：
  Session / Evidence
  状态、动作、结果、失败、确认和人工接管
```

它不是新的 Agent Runtime，不拥有目标规划、Session、审批、工作区和用户控制权。Vlawd 是当前负责验证这项能力的个人 Runtime，详细实现以 `AI_cursor_v2/` 为准。

---

## 外部参考的使用原则

`pi-computer-use` 展示了一套有价值的 Computer Use 设计：

- Accessibility / UIA / DOM 语义观察优先；
- 不可变、状态作用域的观察；
- 元素引用与产生它的状态绑定；
- 渐进式查询和缓存；
- 动作事务、后继状态和紧凑差异；
- postcondition 验证；
- 桌面进程与 CDP 页面按资源调度；
- 视觉和坐标输入只作为受控降级路径。

Agentic Web 对它的定位是：

```text
外部架构参考
+ 独立比较基准
+ 可选原生 helper 研究对象
≠ Agentic Web 标准
≠ Vlawd 必须安装的 Pi 扩展
≠ 第二套 Runtime
```

是否复用任何实现，必须经过许可证、签名、原生二进制、权限、供应链、版本稳定性和跨平台行为审查。长期契约必须保持 Vlawd / Runtime 中立，不以某个扩展的工具名或生命周期为核心。

参考：

- https://github.com/injaneity/pi-computer-use
- https://github.com/injaneity/pi-computer-use/blob/main/docs/architecture.md

---

## 能力路由顺序（ARCH.INTERACTION）

Runtime 应优先选择最稳定、最小权限、最容易验证的接口：

```text
1. 应用专用 API / MCP / SDK
2. CLI / 文件 / 数据库受控接口
3. BrowserView DOM / CDP
4. Accessibility / UI Automation
5. 语义 + Screenshot / OCR 融合
6. 当前图像约束下的原始坐标和全局输入
```

降级不是模型自由决定的无限重试。每次降级都必须检查：

- 上一级为何不可用；
- 新路径需要什么权限；
- 是否改变前台焦点或用户输入；
- 是否仍可验证目标身份和结果；
- 是否需要用户确认；
- 是否允许重试。

`silent` 只描述用户是否看见动画，不能代表执行更安全。执行策略应与可见性分开：

```text
delivery_policy:
  semantic_only
  foreground_allowed
  raw_input_allowed
```

---

## 状态作用域观察

观察结果不是一组可在整个 Session 永久复用的元素编号，而是某一时刻、某一资源的不可变事实：

```yaml
ObservationState:
  state_id:
  root_ref:
  resource_ref:
  resource_epoch:
  captured_at:
  sources:
    - dom
    - accessibility
    - screenshot
    - ocr
  outline:
  image_ref:
  privacy_classification:
```

元素引用必须属于产生它的状态：

```text
observe(root)
→ state_id + scoped element refs

query(state_id)
→ search / expand / inspect 的缓存结果

act(state_id, refs, actions)
→ 校验状态与资源 epoch
→ 执行
→ successor_state_id
```

强制规则：

- 旧 `state_id` 或旧 ref 不得静默映射到新界面；
- 窗口、页面、焦点、权限或用户输入变化可以提高 `resource_epoch`；
- 无法证明目标身份时重新观察，不猜测；
- Screenshot / UI Tree 默认是敏感数据，不自动永久保存；
- 缓存查询不得绕过权限和隐私过滤。

---

## 渐进式观察

完整 UI Tree 可能巨大，模型不应每轮接收全部节点。

推荐契约：

```text
observe(root)
→ 折叠的语义 outline

search(state_id, query)
→ 命中的局部节点

expand(state_id, ref, depth)
→ 展开指定子树

inspect(state_id, ref)
→ 读取角色、属性、状态、边界和来源
```

渐进式披露降低 Token 和延迟，但完整原始观察仍由 Runtime 在本地保存到短期缓存，以支持查询、一致性校验和必要的 Evidence 生成。

---

## 动作事务与结果验证

动作数组只有在中间不需要重新观察或决策时才构成一个事务：

```text
preflight
→ target / permission / risk / epoch 校验
→ 按顺序执行
→ 失败或环境失效时停止
→ 捕获后继状态
→ 验证 postcondition
→ 写入 Session
```

推荐结果语义：

```yaml
ActionResult:
  outcome: worked | didnt | unknown
  verification: verified | preexisting | failed
  successor_state_id:
  stopped_at:
  diff:
  evidence_refs:
  failure_type:
```

含义：

- `worked`：有足够证据证明期望结果由本次动作达成；
- `didnt`：有足够证据证明未达成；
- `unknown`：动作可能已送达，但结果无法可靠验证；
- `verified`：postcondition 在动作后成立，且可归因于本次事务；
- `preexisting`：postcondition 在动作前已成立，不应把它算作本次成功；
- `failed`：postcondition 未成立或验证过程失败。

“输入事件已发送”“点击调用未报错”不能直接等于业务成功。

---

## 资源与并发

交互资源应显式建模：

```text
desktop_process:<pid>
desktop_window:<window_id>
browser_page:<target_id>
global_pointer
global_keyboard
clipboard
```

调度原则：

- 缓存的 search / expand / inspect 不占执行 Lease；
- 同一物理资源的实时 observe / act 串行；
- 独立 BrowserView / CDP page 可以并行；
- 原生桌面语义操作只有在平台证明安全时才按进程并行；
- 全局指针和键盘始终排他；
- 用户输入优先级最高，发生后立即暂停或使当前状态失效；
- 目标 Executor 不存在时拒绝，不得 fallback 到其他资源。

---

## 权限、隐私与供应链

Computer Use 是高权限能力。最低边界：

- Accessibility、Screen Recording、UIA 和全局输入权限必须分别声明；
- 权限必须可查看、可撤销、可降级；
- 密码管理器、通知、聊天、医疗、财务和身份信息默认属于高敏感界面；
- 原始截图、UI Tree、剪贴板和输入文本不得默认同步或进入公开 Evidence；
- 真实密码、支付、生产数据、权限扩大、公开发布和不可逆写入必须阻止或明确确认；
- 模型不能修改安全策略或自行授权新的系统权限；
- 原生 helper 使用独立 Bundle ID、签名、更新和完整性校验；
- 外部预编译二进制和 postinstall 脚本必须单独审查。

---

## 平台差异

统一契约不代表平台能力相同：

```text
macOS：
  Accessibility + Screen Recording
  语义执行能力取决于 App 的 AX 暴露质量

Windows：
  UI Automation + 交互式未锁定桌面
  语义观察与语义动作覆盖率需要分别测量

Linux：
  AT-SPI、Wayland/X11 和桌面环境差异较大
  不在缺少真实基准时承诺一致支持
```

每个平台必须独立记录：

- 语义观察覆盖率；
- 语义动作覆盖率；
- 视觉降级率；
- 前台接管次数；
- `unknown` 结果比例；
- 权限和签名要求。

不能因某个平台可观察，就声称它已具有同等可靠的语义执行。

---

## 与可执行项目验证的边界

`ARCH.INTERACTION` 与 `ARCH.SANDBOX` 是两项不同能力：

```text
ARCH.INTERACTION：
  操作桌面应用和 BrowserView
  关注 UI 状态、动作交付、用户接管和结果验证

ARCH.SANDBOX：
  配置、构建、启动和验证 Project Revision
  关注环境隔离、依赖、部署、Evaluator 和销毁
```

未来 GUI 项目的部署验证可以在带桌面的隔离环境中调用 Interaction Adapter，但环境生命周期仍归 Sandbox / Runtime 管理，UI 交互不能替代 Health Check、API Test 或独立 Evaluator。

---

## 验证路径（VALID.INTERACTION）

这项能力不打断当前 Vlawd Golden Path。只有只读 BrowserView、Session、暂停和接管已经稳定后，才启动独立 PoC。

对照组：

```text
Baseline：
  Screenshot + 坐标动作

Reference：
  在其支持的平台上独立运行 pi-computer-use

Treatment：
  Vlawd-native thin Interaction Adapter
```

首批任务：

- Calculator 输入计算并读取结果；
- 临时编辑器写入专用目录并独立验证文件；
- 本地测试页面填写但不对外提交。

故障注入：

- 观察后移动或缩放窗口；
- 插入弹窗；
- 重复标签；
- 延迟响应；
- 切换焦点；
- 使用无 Accessibility 的自绘区域；
- 用户中途接管；
- 使用旧 `state_id` 或旧 ref。

指标：

- 首次成功率；
- 语义观察和动作覆盖率；
- postcondition 验证率；
- stale-state 拒绝率；
- 错误目标率；
- 前台接管次数；
- 人工介入率；
- `unknown` 比例；
- Evidence 完整性；
- 延迟和成本。

进入正式实现前至少满足：

- 禁止动作 0 次；
- 过期动作全部拒绝或重新观察；
- 跨 Executor 错误 fallback 0 次；
- 所有外部有意义的成功声明都有 postcondition Evidence；
- pause、cancel 和 takeover 不依赖模型；
- Treatment 在可靠性或监督成本上稳定优于坐标 Baseline。

---

## 当前 Not Now

- 将 Pi 或任一外部 Computer Use Runtime 设为 Vlawd 核心依赖；
- 为追求“全桌面可操作”提前支持所有应用；
- 在没有状态和 postcondition 的情况下直接开放系统输入；
- 把坐标点击包装成“语义执行”；
- 将 `silent` 解释为无需安全策略；
- 默认长期保存完整桌面截图和 UI Tree；
- 用 GUI 操作替代已有 API、MCP、CLI、CDP 或自动测试；
- 在多平台基准前承诺 macOS、Windows 和 Linux 行为一致。

---

## 一句话总结

**Agentic Web 的 Computer Use 不是“让模型随便点击”，而是把环境交互建模为状态作用域观察、最小权限路由、可抢占动作事务和可验证后继状态；外部项目只提供参考与基准，Vlawd 保持自己的 Runtime、Session 和安全控制权。**
