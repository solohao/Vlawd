# Vlawd 统一概念设计与开发素材

本目录是 AI Cursor 桌面端与 Agentic Web 长期平台的统一设计入口。设计沿用原有深墨绿、荧光黄绿色与 AI Employee 盾牌形象，同时补齐浅色体系、状态语义、页面层级和开发可复用素材。

> 这些页面是设计目标与交互契约，不代表对应 Runtime、Provider、Agentic Web 或部署能力已经实现。

## 目录

```text
00_设计系统/
  概念图/            品牌、主题、状态与素材总览
  素材/              Logo、SVG 图标、背景、波形和独立插画
  design-tokens.json 可供前端映射的基础 Token
01_AI_Cursor/
  01_首次使用/
  02_工作台/
  03_运行时/
  04_Session/
  05_工作流模型设备/
  06_设置/
02_Agentic_Web/
  01_Project/
  02_协作与图谱/
  03_运行与发现/
90_历史参考/          旧版概念图与原始提示词
_生成源/              可重复生成 SVG 与 PNG 的脚本
```

## 本版交付

- 31 组 1672×941 页面概念图，同时提供 PNG 与可编辑 SVG。
- 17 组 AI Cursor 页面，覆盖首次配置、工作台、运行时、Session、工作流、模型、设备与隐私。
- 10 组 Agentic Web 长期概念，覆盖 Project、Run/Validate、Capsule、Forum、Canvas、Diff、Campus、Explore、Inbox 与 Registry。
- 4 组统一设计系统画板。
- 24 个 `currentColor` SVG 图标、2 个品牌标记、3 个矢量背景/波形和 4 张独立高质量插画。
- 机器可读 `design-tokens.json` 与 `素材/_manifest.json`。

## 体验原则

1. **用户仍在控制中**：暂停、取消、接管与确认始终可发现。
2. **状态不伪装**：未连接、未配置、等待确认、失败和已暂停必须明确显示。
3. **一个焦点任务**：多任务存在时仍保持一个主 Workspace，其他任务只显示摘要。
4. **Session 不是聊天记录**：重点表达目标、计划、纠正、动作、Evidence、分支、合并与恢复锚点。
5. **同一 Graph 多视图**：Project、Forum、Canvas、Run 与 Diff 是同一 Living Project Graph 的投影。
6. **颜色不是唯一信号**：状态同时使用颜色、图标和文字。
7. **高风险不自动确认**：写入、发布、付费、生产数据等动作必须显式确认。

## 阶段边界

- AI Cursor Cycle 1–3 页面用于近期 U2 体验和后续前端复刻。
- Workflows、多任务和高级模型管理属于骨架或证据后扩展。
- Agentic Web 页面是长期愿景概念，仅在项目群阶段门成立后实现。
- 概念图中的示例数据只用于解释布局，不构成真实运行或 Dogfood 证据。

## 重新生成

```bash
node "_生成源/generate-concepts.mjs"
python3 "_生成源/render-concepts.py"
```

PNG 渲染脚本连接当前 Devin Chrome 的 CDP `localhost:29229`，需要 Python `requests` 与 `websocket-client`。SVG 是可编辑主源，即使不运行 PNG 渲染也可直接预览。
