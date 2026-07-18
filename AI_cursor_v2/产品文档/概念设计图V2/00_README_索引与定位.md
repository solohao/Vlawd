# 概念设计图 V2 · 索引与定位

本目录是概念设计图的**权威版本**。设计语言以 `01_AI光标_Vlawd/` 下的历史参考图（生图模型输出、已认可）为唯一基准。
旧目录 `../概念设计图/`（`00_设计系统`、`01_AI_Cursor`、`02_Agentic_Web`、`_生成源`）为早期 SVG 代码产物，**不再作为设计基准**，仅 `90_历史参考/` 有效并已迁入本目录。

---

## 设计语言基准

- 主色：自然亮绿 `#8FCB00 / #A6E22E`，浅绿色底 pill；状态色 蓝/琥珀/红。
- 浅色：`#F5F7F3` 底、白色圆角卡片（16px）、细边框、柔和阴影、大留白。
- 深色：近黑 `#0D0F0E` 底、深卡片、亮绿发光强调。
- 品牌：AI Cursor = 绿圆 C 标；Agentic Web = 绿色节点网络圆标。
- 吉祥物：黑色护盾 + 亮绿描边 + 卡通眼睛（AI 角色 / 执行脑）。
- 桌面端带窗口控件（最小化/最大化/关闭）；侧栏 220px + 软绿激活态 + 底部用户卡。

---

## 目录结构与定位

### 00_设计系统/
吉祥物与图标素材（历史参考）。

### 01_AI光标_Vlawd/  ——  产品入口层 · 当前主线（桌面 · 全双工个人终端）
| 文件 | 定位 |
|---|---|
| 01_工作台/（深/浅 ×2） | 主界面：入口 + 受监督执行 + 概览 |
| 02_对话入口/ | 选择麦克风/扬声器，开始语音监督 |
| 03_模型中心/ | Execution Brain / Record Notebook / Safety Engine 配置 |
| 04_运行时执行/ | 悬浮语音控制器（缩小态）、屏幕动作标注、动作确认、Session Graph |

Vlawd 两种运行形态：**完整主窗** ⇄ **运行时悬浮窗**（见 04 悬浮语音控制器）。

### 02_Agentic_Web网络/  ——  Moltery（网络/平台产品 · Web 应用）
> 命名：上层愿景/品类＝**Agentic Web**；网络平台产品定名 **Moltery**（molt 蜕壳＝可验证的版本演化 + -ery 场所）。已核查 .com/.ai/.io + npm/PyPI/GitHub 全部干净。
> 形态：**浏览器 Web 应用（响应式，移动+桌面）**，X × GitHub 融合；**非**原生桌面软件（原生桌面只有 Vlawd）。

| 文件 | 端 | 层级 | 定位 |
|---|---|---|---|
| 01_论坛移动端_PostIsProject | 移动 Web | L5+L7 | 综合性 AI 社交网络；帖子即项目（版本/分支/验证）；每项目 AI 匹配助手 |
| 02_Canvas知识图谱_桌面 | 桌面 Web | L7 视图 | 同一 Project Graph 的二维图谱投影；展现项目进展的分析与讨论（注：待改为浏览器外壳） |
| 03_Module项目页_云沙箱与AI助手 | 桌面 Web | L6 | Generative Module Spec 作为项目；配置/文件/用法/**云端沙箱调试**/运行反馈 + AI 匹配助手（注：待改为浏览器外壳） |
| 04_Moltery_Capsule仓库页_Web | 桌面 Web | L3/L4 | **Capsule 作为"仓库类型"**：Manifest(Skill/Workflow/权限/Tests/Provenance/Metrics) + 蜕壳记录(Molts/版本) + 项目动态；浏览器外壳，X×GitHub 融合（**详情页**） |
| 05_Moltery_首页Feed_Web | 桌面 Web | L5+L7 | **入口/主页**：X 式三栏滑动帖流，点进去即 04 详情；帖子=项目轻卡（类型徽章/状态/运行信号/评论转发点赞）+ 发布 composer + 右栏发现（**Feed 页**） |

### 03_产品群架构/
- `产品群架构图_浅色` —— **分层图**：五层（产品入口 / 垂直项目 / 共同对象 / 网络基础 / 运行与基础设施）+ 共同对象流 + 价值闭环。实线=当前主线，虚线=中长期愿景。
- `交互总架构图_浅色` —— **交互图**：每层含哪些模块 + 模块/层级之间的**连线与数据流**（谁调用谁、什么在流动）：用户→Vlawd(全双工/Safety/双执行器/记录引擎)→Session/Evidence/Capsule/Living Project→Post is Project/Registry→运行与验证(Runtime/云沙箱/Evaluator)→回写 Project→Registry 按任务匹配拉取 Capsule 回 Vlawd 闭环；底部「控制面」(Security/Permission/Provenance/Privacy/Cost/Evaluation) 横贯约束。

---

## 分类三原则（决定"以什么形式呈现"）

1. **产品入口（有真实 UI）**：Vlawd、论坛、Canvas、IDE 插件 → 界面稿（可落地为可交互代码）。
2. **网络基础（平台，UI 是投影）**：Post is Project、Registry → 视图稿；同一 Graph 多视图。
3. **共同对象/协议（无独立界面）**：Session/Evidence/Capsule/Living Project/Module Spec → 卡片/对象图/流动示意，不画成 App。

保真度随成熟度：Vlawd 高保真（唯一主线）；论坛/Canvas/Module 中高保真；Registry/服务设备为虚线愿景。
