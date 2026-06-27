import type { DesktopModelDownloadState, DesktopModelHealthCheck, DesktopUiSnapshot, ModelRole } from "@ai-cursor-v2/shared";
import { createDashboardViewModel } from "../panel/dashboard-view.js";
import { toModelSlotRows, toModelStorageRow } from "../panel/model-configuration-view.js";
import {
  createBudgetFormActionProposal,
  createBudgetFormTargetCandidate,
  createRuntimeActionOverlay,
  createVoiceRuntimeCapsule
} from "../runtime/runtime-overlay-view.js";
import { toSessionGraphDrawer } from "../runtime/session-graph-view.js";
import { desktopApi } from "./desktop-api.js";

let snapshot: DesktopUiSnapshot;

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}
const appRoot = app;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatarSrc(src: string): string {
  return `/${src.replace("assets/", "")}`;
}

async function apply(action: () => Promise<DesktopUiSnapshot>): Promise<void> {
  snapshot = await action();
  render();
}

function render(): void {
  const dashboard = createDashboardViewModel({
    userName: "Mateus",
    theme: snapshot.theme,
    runtimeState: snapshot.runtimeState,
    conversationRoute: snapshot.audio.route,
    audioDevices: snapshot.audio.devices,
    modelBinding: snapshot.modelBinding
  });
  const capsule = createVoiceRuntimeCapsule({
    theme: snapshot.theme,
    state: snapshot.runtimeState,
    endpointRoute: snapshot.audio.route
  });
  const actionOverlay = createRuntimeActionOverlay({
    theme: snapshot.theme,
    state: snapshot.runtimeState,
    endpointRoute: snapshot.audio.route,
    proposal: createBudgetFormActionProposal(),
    target: createBudgetFormTargetCandidate(),
    valuePreview: snapshot.browser.nextAction.value,
    reason: snapshot.browser.nextAction.reason,
    drawerMode: "compact_path"
  });
  const graph = toSessionGraphDrawer(snapshot.graph, "graph");
  const modelSlots = toModelSlotRows(snapshot.modelBinding);
  const storage = toModelStorageRow(snapshot.modelBinding.modelStorage);

  appRoot.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Electron / Vite dev window</p>
        <h1>${escapeHtml(dashboard.greeting)}</h1>
        <p>${escapeHtml(dashboard.readinessLabel)} · ${escapeHtml(snapshot.audio.message)}</p>
        <div class="hero-actions">
          ${dashboard.primaryActions.map((action) => `<button>${escapeHtml(action.label)}</button>`).join("")}
        </div>
      </div>
      <img class="avatar" src="${avatarSrc(dashboard.avatar.src)}" alt="AI Employee" />
    </section>

    <section class="grid">
      <article class="panel dashboard-panel">
        <div class="panel-title">
          <span>Dashboard</span>
          <strong>${escapeHtml(capsule.state.label)}</strong>
        </div>
        <div class="status-grid">
          ${dashboard.statusCards
            .map(
              (card) => `
                <div class="status-card">
                  <span>${escapeHtml(card.title)}</span>
                  <strong>${escapeHtml(card.state)}</strong>
                  <p>${escapeHtml(card.summary)}</p>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="mini-list">
          ${dashboard.conversationEntryRows
            .map((row) => `<div><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong><em>${escapeHtml(row.hint)}</em></div>`)
            .join("")}
        </div>
      </article>

      <article class="panel model-panel">
        <div class="panel-title">
          <span>Model Center</span>
          <button data-action="choose-root">选择下载目录</button>
        </div>
        <div class="storage-card">
          <strong>${escapeHtml(storage.label)}</strong>
          <p>${escapeHtml(storage.currentRoot)}</p>
          <em>${storage.preferNonSystemDrive ? "建议使用非系统盘保存模型权重" : "允许使用当前目录"}</em>
        </div>
        <div class="model-slots">
          ${modelSlots
            .map(
              (slot) => `
                <div class="slot">
                  <span>${escapeHtml(slot.slot)}</span>
                  <strong>${escapeHtml(slot.current)}</strong>
                  <p>${escapeHtml(slot.description)}</p>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="download-list">
          ${snapshot.modelDownloads.map(renderDownload).join("")}
        </div>
        <div class="health-list">
          ${snapshot.healthChecks.map(renderHealth).join("")}
        </div>
      </article>

      <article class="panel runtime-panel">
        <div class="voice-capsule">
          <img src="${avatarSrc(capsule.avatar.src)}" alt="Runtime avatar" />
          <div>
            <strong>${escapeHtml(capsule.state.label)}</strong>
            <span>${escapeHtml(capsule.endpointLabel)}</span>
          </div>
          <button data-action="connect-audio">连接入口</button>
          <button data-action="pause">暂停</button>
          <button data-action="cancel">取消</button>
        </div>
        <div class="workspace">
          <div class="browser-bar">${escapeHtml(snapshot.browser.title)} · ${escapeHtml(snapshot.browser.url)}</div>
          <div class="doc">
            <h2>Q2 市场调研与出差计划</h2>
            <p>AI Cursor 正在监督填写预算草稿。当前目标单元格已高亮，所有步骤写入 Session Graph。</p>
            <table>
              <thead><tr><th>城市</th><th>调研对象</th><th>预算预估</th></tr></thead>
              <tbody>
                <tr><td>上海</td><td>渠道伙伴</td><td>6,800</td></tr>
                <tr class="target-row"><td>北京</td><td>企业客户</td><td>${snapshot.runtimeState === "acting" ? "8,500" : ""}</td></tr>
                <tr><td>深圳</td><td>供应商</td><td>7,200</td></tr>
              </tbody>
            </table>
          </div>
          <aside class="action-card">
            <span>${escapeHtml(actionOverlay.title)} · ${escapeHtml(actionOverlay.risk.label)}</span>
            <h3>${escapeHtml(actionOverlay.actionTypeLabel)}</h3>
            <p>目标：${escapeHtml(actionOverlay.targetLabel)}</p>
            <strong>${escapeHtml(snapshot.browser.nextAction.value)}</strong>
            <p>${escapeHtml(actionOverlay.reason)}</p>
            <button data-action="execute-runtime">执行</button>
            <button data-action="pause">暂停</button>
          </aside>
          <aside class="session-path">
            <div class="panel-title"><span>Compact Session Path</span><button>查看全部</button></div>
            ${actionOverlay.sessionDrawer.path
              .map((item) => `<div class="path-item ${item.isCurrent ? "current" : ""}"><span>${escapeHtml(item.status)}</span>${escapeHtml(item.label)}</div>`)
              .join("")}
          </aside>
        </div>
      </article>

      <article class="panel graph-panel">
        <div class="panel-title">
          <span>Session Graph</span>
          <strong>${escapeHtml(graph.mode)}</strong>
        </div>
        <div class="graph-lanes">
          ${graph.lanes
            .map(
              (branch) => `
                <div class="lane">
                  <strong>${escapeHtml(branch.branchId)}</strong>
                  ${branch.nodes.map((node) => `<div class="graph-node ${node.id === snapshot.graph.current_node_id ? "current" : ""}">${escapeHtml(node.label)}</div>`).join("")}
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;

  bindEvents();
}

function renderDownload(download: DesktopModelDownloadState): string {
  return `
    <div class="download-row">
      <div>
        <strong>${escapeHtml(download.label)}</strong>
        <span>${escapeHtml(download.provider)} · ${escapeHtml(download.status)}</span>
        <p>${escapeHtml(download.message)}</p>
        <div class="progress"><i style="width:${download.progress}%"></i></div>
      </div>
      <button data-action="download" data-role="${download.role}">下载/准备</button>
    </div>
  `;
}

function renderHealth(check: DesktopModelHealthCheck): string {
  return `
    <div class="health-row">
      <div>
        <strong>${escapeHtml(check.role)}</strong>
        <span>${escapeHtml(check.state)} · ${escapeHtml(check.endpoint ?? "local")}</span>
        <p>${escapeHtml(check.message)}</p>
      </div>
      <button data-action="health" data-role="${check.role}">健康检查</button>
    </div>
  `;
}

function bindEvents(): void {
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
