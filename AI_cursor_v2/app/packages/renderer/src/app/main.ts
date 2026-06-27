import type { DesktopUiSnapshot, ModelRole, ModelRuntimeState } from "@ai-cursor-v2/shared";
import { desktopApi } from "./desktop-api.js";

type AppRoute = "home" | "models" | "voice" | "workflow" | "sessions" | "knowledge" | "integrations";
type ModelTab = "config" | "downloads" | "logs";
type RuntimeMode = "hidden" | "capsule" | "action" | "graph";

let snapshot: DesktopUiSnapshot;
let route: AppRoute = "home";
let modelTab: ModelTab = "config";
let runtimeMode: RuntimeMode = "hidden";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Missing #app root");
}
const appRoot = root;

const nav: Array<{ route: AppRoute; label: string; icon: string }> = [
  { route: "home", label: "首页 / 工作台", icon: "⌂" },
  { route: "workflow", label: "工作流", icon: "⌘" },
  { route: "sessions", label: "Session 记录", icon: "▤" },
  { route: "knowledge", label: "知识库", icon: "▥" },
  { route: "integrations", label: "集成中心", icon: "⌬" },
  { route: "models", label: "设置", icon: "⚙" }
];

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stateText(state: ModelRuntimeState): string {
  const labels: Record<ModelRuntimeState, string> = {
    listening: "就绪",
    speaking: "对话中",
    thinking: "思考中",
    acting: "执行中",
    waiting_confirm: "等待确认",
    paused: "已暂停",
    interrupted: "已中断",
    complete: "已完成"
  };
  return labels[state];
}

function roleStatus(role: ModelRole): string {
  const health = snapshot.healthChecks.find((item) => item.role === role);
  const download = snapshot.modelDownloads.find((item) => item.role === role);
  if (health?.state === "healthy" || download?.status === "healthy") {
    return "运行中";
  }
  if (download?.status === "downloaded") {
    return "可用";
  }
  if (download?.status === "ready_to_download") {
    return "待下载";
  }
  return "待配置";
}

async function apply(action: () => Promise<DesktopUiSnapshot>): Promise<void> {
  snapshot = await action();
  render();
}

function render(): void {
  appRoot.innerHTML = `
    <div class="desktop-app">
      ${renderSidebar()}
      <main class="content">${route === "home" ? renderHome() : route === "models" ? renderModels() : route === "voice" ? renderVoice() : renderPlaceholder()}</main>
      ${renderRuntimePreview()}
    </div>
  `;
  bindEvents();
}

function renderSidebar(): string {
  return `
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">C</span><strong>AI Cursor</strong><em>V2</em><button>×</button></div>
      <nav>${nav.map((item) => `<button class="nav-item ${route === item.route ? "active" : ""}" data-route="${item.route}"><span>${item.icon}</span>${html(item.label)}</button>`).join("")}</nav>
      <div class="profile"><span>Lin</span><div><strong>Lin</strong><small>Pro Plan</small></div><em>⌄</em></div>
      <p>AI Cursor Desktop Employee</p>
    </aside>
  `;
}

function renderTopStatus(): string {
  return `<div class="top-status"><i></i>AI 员工已${html(stateText(snapshot.runtimeState))}</div>`;
}

function renderHome(): string {
  return `
    <section class="page home">
      ${renderTopStatus()}
      <header class="page-title"><h1>下午好，Lin ☀</h1><p>AI Cursor · 你的桌面 AI 员工，随时待命，按你指令执行任务。</p></header>
      <section class="employee-stage">
        <article class="mini-card"><h3>对话入口</h3><p>Bose QC Ultra</p><span class="pill">${snapshot.audio.connected ? "已连接" : "待连接"}</span><button data-route="voice">语音设置</button></article>
        <div class="employee-core"><div class="avatar">● ●</div><span class="pill">执行舱在线</span><p>理解目标 · 规划步骤 · 执行操作</p></div>
        <article class="mini-card"><h3>当前模式</h3><p>受监督执行模式</p><span class="pill">AI 将在监督下执行任务</span></article>
      </section>
      <section class="steps">${["理解目标", "规划步骤", "执行中", "等待确认", "完成记录"].map((step, index) => `<div class="${index < 2 ? "done" : ""}"><span>${index + 1}</span>${step}</div>`).join("")}</section>
      <section class="monitor">
        <div><h2>桌面监控中</h2><p>AI 仅在受控环境中提出和执行操作。</p></div>
        ${["桌面", "Chrome", "Excel", "Gmail", "+"].map((name, index) => `<button class="${index === 0 ? "active" : ""}">${name}</button>`).join("")}
        <strong>本地安全防护已激活 <span>高风险动作需确认</span></strong>
      </section>
      <section class="quick-actions"><button data-runtime="action">开始新任务</button><button>导入任务</button><button>新建工作流</button><button data-route="voice">语音设置</button></section>
      <section class="recent"><h2>最近的 Session</h2>${renderRecentRows()}<button data-route="sessions">查看全部 Session →</button></section>
    </section>
    <aside class="right-rail">
      ${renderSideCard("Safety Engine", "运行中", ["风险检测 已启用", "敏感数据保护 已启用", "高风险拦截 已启用"])}
      ${renderSideCard("Execution Brain", roleStatus("duplex_execution_brain"), ["模型 Claude 3.5 Sonnet", "上下文窗口 200K"])}
      ${renderSideCard("Record Notebook", roleStatus("session_record_engine"), ["存储位置 本地加密存储", "记录状态 正常"])}
      <article class="side-card"><h3>审计轨迹</h3><strong class="metric">128</strong><p>条操作记录</p><div class="bars">${Array.from({ length: 18 }, (_, index) => `<i style="height:${14 + ((index * 9) % 50)}px"></i>`).join("")}</div></article>
    </aside>
  `;
}

function renderRecentRows(): string {
  const rows = [
    ["处理客户反馈邮件并生成总结", "邮件处理", "今天 14:32", "已完成"],
    ["调研竞品定价策略", "网页浏览", "今天 11:08", "已完成"],
    ["填写供应商信息表单", "表单填写", "昨天 16:45", "已完成"],
    ["整理会议记录并生成行动项", "文档处理", "昨天 10:22", "已完成"],
    ["下载财务报告", "文件操作", "5月26日 09:15", "已取消"]
  ];
  return `<div class="recent-list">${rows.map(([title, type, time, status]) => `<div><span>□</span><strong>${html(title)}</strong><em>${html(type)}</em><time>${html(time)}</time><b>${html(status)}</b><button>⋮</button></div>`).join("")}</div>`;
}

function renderModels(): string {
  return `
    <section class="page models">
      ${renderTopStatus()}
      <header class="page-title"><h1>模型中心 ◇</h1><p>配置 AI 模型，驱动 AI Cursor 的理解、执行与记录能力。</p></header>
      <div class="tabs"><button class="${modelTab === "config" ? "active" : ""}" data-model-tab="config">模型配置</button><button class="${modelTab === "downloads" ? "active" : ""}" data-model-tab="downloads">下载管理</button><button class="${modelTab === "logs" ? "active" : ""}" data-model-tab="logs">运行日志</button><a>模型使用指南 →</a></div>
      <div class="model-layout"><main>${renderModelTab()}</main><aside>${renderModelSide()}</aside></div>
    </section>
  `;
}

function renderModelTab(): string {
  if (modelTab === "downloads") {
    return `<h2>下载管理</h2>${snapshot.modelDownloads.map((item) => `<article class="download-card"><div><h3>${html(item.label)}</h3><p>${html(item.provider)} · ${html(item.status)}</p><small>${html(item.message)}</small></div><div class="progress"><span style="width:${item.progress}%"></span></div><button data-action="download" data-role="${item.role}">下载/准备</button></article>`).join("")}`;
  }
  if (modelTab === "logs") {
    return `<h2>运行日志</h2><article class="log-card">今天 14:32 · 模型中心状态同步完成<br>今天 13:08 · Record Notebook 可用<br>今天 09:15 · Safety Engine 始终开启</article>`;
  }
  return `
    <h2>核心角色模型</h2>
    ${renderRoleCard("Execution Brain", "负责实时对话、理解目标、提出动作并执行任务。", "Claude 3.5 Sonnet", "duplex_execution_brain")}
    ${renderRoleCard("Record Notebook", "负责记录 Session、生成摘要、沉淀工作流与知识。", "Qwen 2.5 7B Instruct", "session_record_engine")}
    ${renderRoleCard("Safety Engine", "本地安全引擎，实时拦截高风险操作，保护你的设备安全。", "本地安全引擎 v1.2.0", "safety_preemption")}
    <h2>模型推荐</h2><div class="recommend-row">${["Claude 3.5 Sonnet", "Qwen 2.5 7B Instruct", "Llama 3.1 8B Instruct"].map((name, index) => `<article><span>${index === 0 ? "推荐" : "可选"}</span><h3>${name}</h3><p>适合复杂任务理解与执行。</p><button>${index === 0 ? "已选择" : "选择"}</button></article>`).join("")}</div>
  `;
}

function renderRoleCard(title: string, copy: string, provider: string, role: ModelRole): string {
  const health = snapshot.healthChecks.find((item) => item.role === role);
  return `<article class="role-card"><div class="role-icon">${title[0]}</div><div><h3>${title} <span>${roleStatus(role)}</span></h3><p>${copy}</p><small>${html(health?.message ?? "等待检查")}</small></div><div class="role-model"><strong>● ${provider}</strong><span>CPU 23%</span><span>RAM 5.2 GB</span><span>GPU 18%</span></div><button>配置</button><button data-action="health" data-role="${role}">测试</button><button>⋮</button></article>`;
}

function renderModelSide(): string {
  return `
    <article class="side-card"><h3>模型状态总览</h3>${renderStatus("Execution Brain", roleStatus("duplex_execution_brain"))}${renderStatus("Record Notebook", roleStatus("session_record_engine"))}${renderStatus("Safety Engine", roleStatus("safety_preemption"))}</article>
    <article class="side-card"><h3>模型存储位置</h3><p>为模型文件选择合适的存储位置，避免占用系统盘空间。</p><button class="storage" data-action="choose-root">${html(snapshot.modelBinding.modelStorage?.rootDir || "选择模型存储目录")}</button><div class="capacity"><span></span></div><p>已用空间：38.8 GB / 200 GB</p></article>
    <article class="side-card quick"><h3>快速操作</h3><button>检查模型更新</button><button>导入模型</button><button>模型兼容性检测</button></article>
  `;
}

function renderStatus(label: string, status: string): string {
  return `<div class="status-line"><span>${label}</span><strong>● ${status}</strong></div>`;
}

function renderVoice(): string {
  return `
    <section class="page voice">
      ${renderTopStatus()}
      <header class="page-title back"><button data-route="home">←</button><h1>对话入口选择 🎙</h1><p>选择与你对话的输入 / 输出设备，开始通过语音监督 AI 执行任务。</p></header>
      <section class="voice-hero"><div class="avatar large">● ●</div><span class="pill">安全舱占已启用</span><p>你可以随时说：“暂停”、“取消”、“停止”，AI 将立即响应。</p></section>
      <div class="voice-layout"><main><h2>推荐配置</h2><div class="voice-config"><article><b>输入设备</b><h3>蓝牙耳机麦克风</h3><p>Bose QC Ultra · ${snapshot.audio.connected ? "已连接" : "待连接"}</p></article><article><b>输出设备</b><h3>蓝牙耳机扬声器</h3><p>Bose QC Ultra · ${snapshot.audio.connected ? "已连接" : "待连接"}</p></article><article><b>对话体验</b><h3>语音对话</h3><p>自然语言输入与 AI 回复</p></article></div><h2>可用设备</h2>${snapshot.audio.devices.map((device, index) => `<article class="device-row"><span>${device.directions.includes("input") ? "🎧" : "🔊"}</span><div><strong>${html(device.label)}</strong><p>${device.directions.join(" / ")}</p></div><button data-action="connect-audio">${index === 0 && snapshot.audio.connected ? "已连接" : "连接"}</button></article>`).join("")}</main><aside>${renderSideCard("如何使用语音监督 AI", "", ["1. 选择对话入口", "2. 开始对话", "3. 监督 AI 执行", "4. 完成任务"])}${renderSideCard("安全抢占能力", "始终开启", ["暂停", "取消", "停止", "接管"])}</aside></div>
    </section>
  `;
}

function renderPlaceholder(): string {
  return `<section class="page placeholder">${renderTopStatus()}<header class="page-title"><h1>${html(nav.find((item) => item.route === route)?.label ?? "AI Cursor")}</h1><p>该模块是 APP 主框架入口，后续继续按设计图补全。</p></header></section>`;
}

function renderSideCard(title: string, status: string, lines: string[]): string {
  return `<article class="side-card"><h3>${html(title)} ${status ? `<span>${html(status)}</span>` : ""}</h3>${lines.map((line) => `<p>${html(line)}</p>`).join("")}</article>`;
}

function renderRuntimePreview(): string {
  if (runtimeMode === "hidden") {
    return "";
  }
  return `<section class="runtime-preview ${runtimeMode}"><div class="runtime-capsule"><div class="mini-avatar">●●</div><div><strong>AI Cursor <span>V2</span></strong><p>${runtimeMode === "capsule" ? "Listening..." : "Acting..."} · Bose QC Ultra · Safety Engine 已开启</p></div><button data-action="pause">Ⅱ</button><button data-action="cancel">×</button><button data-runtime="graph">⌘</button></div>${runtimeMode === "action" ? `<article class="floating-card"><h3>AI Cursor · 下一步动作</h3><p>动作类型：点击按钮</p><strong>目标位置：当前应用中的确认按钮</strong><p>原因：根据你的指令执行下一步。</p><footer><button data-action="execute-runtime">执行</button><button data-action="cancel">取消</button><button>修改内容</button></footer></article>` : ""}${runtimeMode === "graph" ? `<article class="floating-graph"><h3>Session Graph · 记录中</h3>${snapshot.graph.nodes.map((node) => `<div class="${node.id === snapshot.graph.current_node_id ? "current" : ""}">${html(node.label)}</div>`).join("")}<button data-runtime="action">回到当前节点</button></article>` : ""}</section>`;
}

function bindEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextRoute = button.dataset.route as AppRoute | undefined;
      if (nextRoute) {
        route = nextRoute;
        render();
      }
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-model-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.modelTab as ModelTab | undefined;
      if (nextTab) {
        modelTab = nextTab;
        render();
      }
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-runtime]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.runtime as RuntimeMode | undefined;
      if (nextMode) {
        runtimeMode = nextMode;
        render();
      }
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const role = button.dataset.role as ModelRole | undefined;
      if (action === "choose-root") {
        void apply(() => desktopApi().chooseModelStorageRoot());
      }
      if (action === "download" && role) {
        void apply(() => desktopApi().startModelDownload(role));
      }
      if (action === "health" && role) {
        void apply(() => desktopApi().runHealthCheck(role));
      }
      if (action === "connect-audio") {
        void apply(() => desktopApi().connectAudio());
      }
      if (action === "pause") {
        void apply(() => desktopApi().pauseSession());
      }
      if (action === "cancel") {
        void apply(() => desktopApi().cancelSession());
      }
      if (action === "execute-runtime") {
        void apply(() => desktopApi().executeRuntimeAction());
      }
    });
  });
}

snapshot = await desktopApi().getSnapshot();
render();
