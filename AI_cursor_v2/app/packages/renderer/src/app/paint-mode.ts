/**
 * 填色式开发进度可视化（Coloring-book development）
 *
 * 机制：默认把整个界面"去色"成浅灰（未处理态 / todo）。每完成并验证一个
 * 功能单元后，把它标记为 done，让它恢复正常主题色——像填色游戏一样，界面
 * 逐步"浮现"出最终配色，进度一眼可见。详见
 * `AI_cursor_v2/技术文档/12_填色式开发进度可视化.md`。
 *
 * 当前阶段只实现"全局未处理态"（整屏浅灰）。按功能单元/链路的分级上色
 * （todo 浅灰 / wip 深灰 / done 主题色）在后续迭代加入。
 */

const STORAGE_KEY = "aiCursorPaintMode";

export type PaintMode = "on" | "off";

interface PaintModeControl {
  on: () => void;
  off: () => void;
  toggle: () => PaintMode;
  get: () => PaintMode;
}

declare global {
  interface Window {
    __paint?: PaintModeControl;
  }
}

function readSavedMode(): PaintMode {
  // V2 界面验收期间暂时强制显示完整配色。保留 window.__paint 供开发期手动对比。
  return "off";
}

function persist(mode: PaintMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* localStorage 不可用时忽略，仅影响持久化 */
  }
}

function applyPaintMode(mode: PaintMode): void {
  document.documentElement.setAttribute("data-paint", mode);
}

/**
 * 初始化填色模式：V2 界面验收期间默认 off，设置根属性，并在
 * `window.__paint` 暴露开发期切换入口，方便在 DevTools 里对比。
 */
export function initPaintMode(): void {
  let mode = readSavedMode();
  applyPaintMode(mode);

  const setMode = (next: PaintMode): void => {
    mode = next;
    applyPaintMode(mode);
    persist(mode);
  };

  window.__paint = {
    on: () => setMode("on"),
    off: () => setMode("off"),
    toggle: () => {
      setMode(mode === "on" ? "off" : "on");
      return mode;
    },
    get: () => mode
  };
}
