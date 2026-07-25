import { BrowserWindow, WebContentsView } from "electron";
import type { ActionProposal, ActionResult, AtomicAction, DesktopBrowserRuntimeState, ResearchSource } from "@ai-cursor-v2/shared";

export interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class BrowserService {
  private mainWindow?: BrowserWindow;
  private view?: WebContentsView;
  private listeners = new Set<(state: DesktopBrowserRuntimeState) => void>();

  private url = "";
  private title = "";
  private loading = false;
  private error?: string;
  private lastResult?: ActionResult;
  private sources: ResearchSource[] = [];

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  onUpdate(listener: (state: DesktopBrowserRuntimeState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState(): DesktopBrowserRuntimeState {
    return {
      url: this.url,
      title: this.title,
      loading: this.loading,
      error: this.error,
      nextAction: {
        actionType: "",
        targetLabel: "",
        value: "",
        reason: "",
        riskLevel: "safe"
      },
      lastResult: this.lastResult,
      sources: [...this.sources]
    };
  }

  async open(url: string): Promise<void> {
    this.ensureView();
    const target = url.trim();
    if (!target) return;
    const normalized = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    this.url = normalized;
    this.loading = true;
    this.error = undefined;
    this.emit();
    await this.view!.webContents.loadURL(normalized);
  }

  async search(query: string): Promise<void> {
    const q = query.trim();
    if (!q) return;
    // 默认 DuckDuckGo HTML 版，减少 JS 与弹窗
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    await this.open(url);
  }

  pause(): void {
    if (this.view && !this.view.webContents.isDestroyed()) {
      this.view.webContents.stop();
    }
    this.loading = false;
    this.emit();
  }

  close(): void {
    if (this.view) {
      this.mainWindow?.contentView.removeChildView(this.view);
      if (!this.view.webContents.isDestroyed()) {
        this.view.webContents.close();
      }
      this.view = undefined;
    }
    this.url = "";
    this.title = "";
    this.loading = false;
    this.error = undefined;
    this.lastResult = undefined;
    this.sources = [];
    this.emit();
  }

  async execute(proposal: ActionProposal, signal?: AbortSignal): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    if (proposal.safety === "blocked") {
      return [
        {
          action: { action: "overlay.label" },
          ok: false,
          message: `提案被安全策略阻止：${proposal.expected_result}`
        }
      ];
    }
    for (const atomic of proposal.actions) {
      if (signal?.aborted) {
        break;
      }
      const result = await this.executeAtomic(atomic, signal);
      results.push(result);
      if (!result.ok) break;
    }
    this.lastResult = results[results.length - 1];
    this.emit();
    return results;
  }

  private async executeAtomic(action: AtomicAction, signal?: AbortSignal): Promise<ActionResult> {
    try {
      switch (action.action) {
        case "browser.search": {
          const query = String(action.params?.query ?? "");
          await this.search(query);
          return { action, ok: true, message: `已搜索：${query}` };
        }
        case "browser.open": {
          const url = String(action.params?.url ?? "");
          await this.open(url);
          return { action, ok: true, message: `已打开：${url}` };
        }
        case "browser.scroll": {
          const distance = Number(action.params?.distance ?? 400);
          if (this.view && !this.view.webContents.isDestroyed()) {
            await this.view.webContents.executeJavaScript(`window.scrollBy(0, ${distance})`);
          }
          return { action, ok: true, message: `已向下滚动 ${distance}` };
        }
        case "browser.read": {
          const text = await this.readVisibleText();
          const source: ResearchSource = {
            id: `source-${this.sources.length + 1}`,
            url: this.url,
            title: this.title,
            excerpt: text.trim().slice(0, 1200).replace(/\s+/g, " ")
          };
          this.sources.push(source);
          return {
            action,
            ok: true,
            message: `已提取页面可见文本 ${text.length} 字`,
            virtual_state: { text, url: this.url, title: this.title, source }
          };
        }
        default:
          return {
            action,
            ok: false,
            message: `BrowserService 未实现的动作：${action.action}`
          };
      }
    } catch (error) {
      return { action, ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  setBounds(bounds: BrowserBounds): void {
    this.ensureView();
    this.view!.setBounds(bounds);
  }

  async readVisibleText(): Promise<string> {
    if (!this.view || this.view.webContents.isDestroyed()) return "";
    return this.view.webContents.executeJavaScript(`
      (() => {
        const getText = (el) => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return '';
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') return '';
          return el.innerText || '';
        };
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null, false);
        const chunks = [];
        let node;
        while ((node = walker.nextNode())) {
          const text = getText(node).trim();
          if (text && node.children.length === 0) chunks.push(text);
        }
        return chunks.slice(0, 500).join('\\n');
      })()
    `);
  }

  private ensureView(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      throw new Error("主窗口尚未创建");
    }
    if (this.view && !this.view.webContents.isDestroyed()) {
      return;
    }

    this.view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    // 只读约束：禁止下载、弹窗、新开窗口；未知导航保持在本视图内
    this.view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    this.view.webContents.session.on("will-download", (event) => {
      event.preventDefault();
    });
    this.view.webContents.on("will-navigate", (_event, url) => {
      // 允许导航，但记录来源
      this.url = url;
    });

    this.view.webContents.on("did-start-loading", () => {
      this.loading = true;
      this.error = undefined;
      this.emit();
    });
    this.view.webContents.on("did-stop-loading", () => {
      this.loading = false;
      this.url = this.view!.webContents.getURL();
      this.title = this.view!.webContents.getTitle();
      this.emit();
    });
    this.view.webContents.on("did-fail-load", (_event, _errorCode, errorDescription) => {
      this.loading = false;
      this.error = errorDescription;
      this.emit();
    });

    this.mainWindow.contentView.addChildView(this.view);
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

