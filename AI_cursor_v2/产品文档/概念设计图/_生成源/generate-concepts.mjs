import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const W = 1672;
const H = 941;
const FONT = "'WenQuanYi Zen Hei','Microsoft YaHei','PingFang SC','Segoe UI',sans-serif";

const palette = {
  lime: "#B8E51B",
  limeStrong: "#9FD000",
  limeSoft: "#EAF7C0",
  ink950: "#090D0B",
  ink900: "#0E1210",
  ink850: "#141916",
  ink800: "#1A201C",
  ink700: "#252D27",
  ink600: "#344038",
  paper: "#F4F6F2",
  white: "#FFFFFF",
  slate950: "#111714",
  slate800: "#29332D",
  slate700: "#445149",
  slate600: "#627068",
  slate500: "#7D8A82",
  slate400: "#A0AAA4",
  slate300: "#C6CDC8",
  slate200: "#DFE4E0",
  slate100: "#EDF0ED",
  amber: "#F3B83F",
  amberSoft: "#FFF2CF",
  red: "#F05F62",
  redSoft: "#FFE4E4",
  blue: "#4C8DFF",
  blueSoft: "#E7F0FF",
  violet: "#9272F8",
  cyan: "#4EC9C0"
};

const light = {
  bg: palette.paper,
  sidebar: "#F8FAF7",
  surface: palette.white,
  surface2: "#F7F9F6",
  border: palette.slate200,
  text: palette.slate950,
  muted: palette.slate600,
  faint: palette.slate400,
  accent: palette.limeStrong,
  accentText: "#425700",
  shadow: "rgba(20,30,24,.08)"
};

const dark = {
  bg: palette.ink900,
  sidebar: palette.ink950,
  surface: palette.ink850,
  surface2: palette.ink800,
  border: palette.ink700,
  text: "#F4F7F4",
  muted: "#A8B3AC",
  faint: "#6F7B73",
  accent: palette.lime,
  accentText: palette.lime,
  shadow: "rgba(0,0,0,.32)"
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rect(x, y, width, height, fill, radius = 18, stroke = "none", strokeWidth = 1, extra = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${extra}/>`;
}

function circle(cx, cy, r, fill, stroke = "none", strokeWidth = 1, extra = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${extra}/>`;
}

function line(x1, y1, x2, y2, stroke, strokeWidth = 1, dash = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

function path(d, stroke, strokeWidth = 2, fill = "none", extra = "") {
  return `<path d="${d}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}

function text(x, y, value, size, fill, weight = 400, anchor = "start", extra = "") {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(value)}</text>`;
}

function multiText(x, y, lines, size, fill, weight = 400, lineHeight = 1.45, anchor = "start") {
  const tspans = lines
    .map((entry, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${esc(entry)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${tspans}</text>`;
}

function wrap(value, width = 20) {
  const chars = [...String(value)];
  const rows = [];
  for (let i = 0; i < chars.length; i += width) rows.push(chars.slice(i, i + width).join(""));
  return rows;
}

function pill(x, y, value, tone, theme, width) {
  const colors = {
    lime: [theme === dark ? "rgba(184,229,27,.12)" : palette.limeSoft, theme.accentText],
    amber: [theme === dark ? "rgba(243,184,63,.12)" : palette.amberSoft, palette.amber],
    red: [theme === dark ? "rgba(240,95,98,.12)" : palette.redSoft, palette.red],
    blue: [theme === dark ? "rgba(76,141,255,.12)" : palette.blueSoft, palette.blue],
    neutral: [theme.surface2, theme.muted]
  };
  const [bg, fg] = colors[tone] ?? colors.neutral;
  const w = width ?? Math.max(78, value.length * 14 + 28);
  return `${rect(x, y, w, 30, bg, 15)}${circle(x + 16, y + 15, 4, fg)}${text(x + 27, y + 20, value, 12, fg, 600)}`;
}

function button(x, y, value, theme, kind = "primary", width = 126) {
  const primary = kind === "primary";
  const danger = kind === "danger";
  const bg = primary ? theme.accent : danger ? palette.red : theme.surface2;
  const fg = primary ? palette.ink950 : danger ? palette.white : theme.text;
  const border = primary || danger ? "none" : theme.border;
  return `${rect(x, y, width, 40, bg, 12, border)}${text(x + width / 2, y + 25, value, 13, fg, 650, "middle")}`;
}

function icon(type, x, y, size, color, strokeWidth = 2) {
  const s = size;
  const cx = x + s / 2;
  const cy = y + s / 2;
  const k = s / 24;
  const p = (d, fill = "none") =>
    `<path d="${d}" transform="translate(${x} ${y}) scale(${k})" stroke="${color}" stroke-width="${strokeWidth / k}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const c = (ox, oy, r, fill = "none") =>
    `<circle cx="${x + ox * k}" cy="${y + oy * k}" r="${r * k}" stroke="${color}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
  switch (type) {
    case "home":
      return p("M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5M9.5 20v-6h5v6");
    case "workflow":
      return `${c(6, 6, 2.4)}${c(18, 6, 2.4)}${c(12, 18, 2.4)}${p("M6 8.4v3a2 2 0 0 0 2 2h2.4M18 8.4v3a2 2 0 0 1-2 2h-2.4")}`;
    case "session":
      return p("M6 5h13M6 12h13M6 19h13M3 5h.01M3 12h.01M3 19h.01");
    case "graph":
      return `${c(5, 12, 2.2)}${c(19, 5.5, 2.2)}${c(19, 18.5, 2.2)}${p("M7 11 17 6.5M7 13l10 4.5")}`;
    case "model":
      return `${p("M5 5h14v14H5zM9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M19 9h3M2 15h3M19 15h3")}`;
    case "device":
      return p("M4 13v-1a8 8 0 0 1 16 0v1M3 13h4v7H3zM17 13h4v7h-4z");
    case "settings":
      return `${c(12, 12, 3)}${p("M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4")}`;
    case "shield":
      return p("M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z");
    case "brain":
      return `${p("M6 5h12v14H6zM9 9h6v6H9z")}${c(12, 12, 1.4, color)}`;
    case "notebook":
      return p("M5 3h14v18H5zM9 3v18M12 8h4M12 12h4");
    case "mic":
      return `${p("M9 4v7a3 3 0 0 0 6 0V4zM5 11a7 7 0 0 0 14 0M12 18v3")}`;
    case "pause":
      return p("M9 5v14M15 5v14");
    case "stop":
      return `<rect x="${x + s * 0.29}" y="${y + s * 0.29}" width="${s * 0.42}" height="${s * 0.42}" rx="${s * 0.06}" fill="${color}"/>`;
    case "hand":
      return p("M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-2-3a1.5 1.5 0 0 1 2.3-1.9L8 14");
    case "search":
      return `${c(10, 10, 6)}${p("m15 15 6 6")}`;
    case "project":
      return `${c(12, 5, 2.3)}${c(5, 18, 2.3)}${c(19, 18, 2.3)}${p("M11 7 6 16M13 7l5 9M7 18h10")}`;
    case "evidence":
      return p("M6 3h9l3 3v15H6zM9 11l2 2 4-5M15 3v4h4");
    case "run":
      return p("M8 5l10 7-10 7z");
    case "capsule":
      return p("M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 21v-9M12 12l8-4.5M12 12 4 7.5");
    case "forum":
      return p("M4 5h16v11H9l-5 4zM8 9h8M8 13h5");
    case "inbox":
      return p("M4 5h16v14H4zM4 14h5l2 2h2l2-2h5");
    case "lock":
      return `${rect(x + s * 0.25, y + s * 0.43, s * 0.5, s * 0.42, "none", s * 0.08, color, strokeWidth)}${path(`M${x + s * 0.36} ${y + s * 0.43}v-${s * 0.12}a${s * 0.14} ${s * 0.14} 0 0 1 ${s * 0.28} 0v${s * 0.12}`, color, strokeWidth)}`;
    case "check":
      return p("M5 12l4 4L19 6");
    case "plus":
      return p("M12 5v14M5 12h14");
    default:
      return `${circle(cx, cy, s * 0.32, "none", color, strokeWidth)}${circle(cx, cy, s * 0.08, color)}`;
  }
}

function logo(x, y, theme, compact = false) {
  const mark = `${rect(x, y, 36, 36, theme.accent, 11)}${path(`M${x + 25} ${y + 11}a9 9 0 1 0 .5 14`, palette.ink950, 3)}${circle(x + 18, y + 18, 3, palette.ink950)}`;
  if (compact) return mark;
  return `${mark}${text(x + 48, y + 23, "AI Cursor", 16, theme.text, 700)}${rect(x + 136, y + 8, 29, 20, theme === dark ? "rgba(184,229,27,.13)" : palette.limeSoft, 6)}${text(x + 150.5, y + 22, "V2", 10, theme.accentText, 800, "middle")}`;
}

function agenticLogo(x, y, theme) {
  const fg = theme.accent;
  return `${circle(x + 18, y + 18, 17, theme === dark ? "rgba(184,229,27,.12)" : palette.limeSoft, fg, 1.4)}${circle(x + 18, y + 18, 4, fg)}${circle(x + 10, y + 10, 2.5, fg)}${circle(x + 28, y + 11, 2.5, fg)}${circle(x + 26, y + 27, 2.5, fg)}${line(x + 13, y + 13, x + 16, y + 16, fg, 1.4)}${line(x + 21, y + 16, x + 26, y + 12, fg, 1.4)}${line(x + 21, y + 21, x + 25, y + 26, fg, 1.4)}${text(x + 48, y + 23, "Agentic Web", 16, theme.text, 700)}`;
}

function sidebar(theme, active, product = "ai") {
  const entries =
    product === "ai"
      ? [
          ["home", "工作台", "dashboard"],
          ["workflow", "工作流", "workflows"],
          ["session", "Session", "sessions"],
          ["graph", "任务空间", "tasks"],
          ["model", "模型中心", "models"],
          ["device", "设备", "devices"],
          ["settings", "设置", "settings"]
        ]
      : [
          ["search", "探索", "explore"],
          ["project", "项目", "projects"],
          ["graph", "Canvas", "canvas"],
          ["forum", "讨论", "forum"],
          ["run", "运行与验证", "run"],
          ["inbox", "待处理", "inbox"],
          ["capsule", "Registry", "registry"]
        ];
  const parts = [rect(0, 0, 220, H, theme.sidebar, 0), product === "ai" ? logo(28, 26, theme) : agenticLogo(28, 26, theme)];
  entries.forEach(([ic, label, id], index) => {
    const y = 108 + index * 54;
    const selected = active === id;
    if (selected) parts.push(rect(18, y - 10, 184, 42, theme === dark ? "rgba(184,229,27,.12)" : palette.limeSoft, 12));
    parts.push(icon(ic, 34, y, 20, selected ? theme.accent : theme.faint));
    parts.push(text(67, y + 15, label, 14, selected ? theme.text : theme.muted, selected ? 650 : 500));
    if (selected) parts.push(rect(18, y - 2, 3, 26, theme.accent, 2));
  });
  parts.push(rect(22, 846, 176, 66, theme.surface2, 16, theme.border));
  parts.push(circle(48, 879, 17, theme === dark ? palette.ink600 : palette.slate200));
  parts.push(text(48, 884, "J", 14, theme.text, 750, "middle"));
  parts.push(text(75, 875, "Jacob", 13, theme.text, 650));
  parts.push(text(75, 894, product === "ai" ? "本地工作区" : "个人空间", 11, theme.muted));
  return parts.join("");
}

function shell(theme, active, titleValue, subtitle, product = "ai", badges = []) {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="${theme.shadow}"/></filter><radialGradient id="glow"><stop offset="0" stop-color="${theme.accent}" stop-opacity=".22"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></radialGradient></defs>`,
    rect(0, 0, W, H, theme.bg, 0),
    sidebar(theme, active, product),
    text(258, 57, titleValue, 27, theme.text, 750),
    text(258, 84, subtitle, 13, theme.muted, 400),
    line(220, 106, W, 106, theme.border)
  ];
  let bx = 1460;
  badges
    .slice()
    .reverse()
    .forEach((badge) => {
      const width = badge.width ?? Math.max(100, badge.label.length * 13 + 28);
      bx -= width;
      parts.push(pill(bx, 40, badge.label, badge.tone ?? "lime", theme, width));
      bx -= 10;
    });
  return parts.join("");
}

function endSvg() {
  return "</svg>";
}

function sectionTitle(x, y, titleValue, theme, hint = "") {
  return `${text(x, y, titleValue, 16, theme.text, 700)}${hint ? text(x + 2, y + 22, hint, 11, theme.muted) : ""}`;
}

function statCard(x, y, width, titleValue, value, caption, theme, tone = "lime", ic = "check") {
  const accent = tone === "amber" ? palette.amber : tone === "red" ? palette.red : tone === "blue" ? palette.blue : theme.accent;
  return `${rect(x, y, width, 116, theme.surface, 18, theme.border, 1, 'filter="url(#shadow)"')}${rect(x + 18, y + 18, 34, 34, theme === dark ? `${accent}20` : `${accent}18`, 10)}${icon(ic, x + 25, y + 25, 20, accent)}${text(x + 66, y + 35, titleValue, 12, theme.muted, 600)}${text(x + 18, y + 78, value, 26, theme.text, 760)}${text(x + 18, y + 100, caption, 11, theme.muted)}`;
}

function table(x, y, width, rows, theme, columns = [0.42, 0.2, 0.2, 0.18], header = ["项目", "状态", "最近活动", "结果"]) {
  const rowH = 52;
  let out = rect(x, y, width, 46 + rows.length * rowH, theme.surface, 18, theme.border, 1, 'filter="url(#shadow)"');
  out += rect(x, y, width, 46, theme.surface2, 18);
  let xx = x + 20;
  header.forEach((h, i) => {
    out += text(xx, y + 29, h, 11, theme.muted, 650);
    xx += width * columns[i];
  });
  rows.forEach((row, ri) => {
    const yy = y + 46 + ri * rowH;
    out += line(x, yy, x + width, yy, theme.border);
    let cx = x + 20;
    row.forEach((cell, ci) => {
      if (ci === 1) out += pill(cx, yy + 11, cell, cell.includes("失败") || cell.includes("阻止") ? "red" : cell.includes("等待") ? "amber" : "lime", theme, Math.min(width * columns[ci] - 22, 98));
      else out += text(cx, yy + 31, cell, ci === 0 ? 13 : 12, ci === 0 ? theme.text : theme.muted, ci === 0 ? 620 : 450);
      cx += width * columns[ci];
    });
  });
  return out;
}

function timeline(x, y, width, events, theme) {
  let out = rect(x, y, width, events.length * 78 + 34, theme.surface, 18, theme.border, 1, 'filter="url(#shadow)"');
  events.forEach((event, index) => {
    const yy = y + 34 + index * 78;
    const accent = event.tone === "amber" ? palette.amber : event.tone === "red" ? palette.red : event.tone === "blue" ? palette.blue : theme.accent;
    if (index < events.length - 1) out += line(x + 34, yy + 20, x + 34, yy + 88, theme.border, 2);
    out += circle(x + 34, yy + 12, 10, theme.surface2, accent, 2);
    out += circle(x + 34, yy + 12, 4, accent);
    out += text(x + 56, yy + 7, event.title, 13, theme.text, 650);
    out += text(x + width - 22, yy + 7, event.time, 10, theme.faint, 450, "end");
    out += multiText(x + 56, yy + 30, wrap(event.desc, 38).slice(0, 2), 11, theme.muted);
  });
  return out;
}

function node(x, y, width, titleValue, meta, tone, theme, ic = "project") {
  const accent = tone === "amber" ? palette.amber : tone === "red" ? palette.red : tone === "blue" ? palette.blue : tone === "violet" ? palette.violet : theme.accent;
  return `${rect(x, y, width, 78, theme.surface, 16, accent, 1.4, 'filter="url(#shadow)"')}${rect(x + 12, y + 13, 36, 36, theme === dark ? `${accent}22` : `${accent}15`, 11)}${icon(ic, x + 20, y + 21, 20, accent)}${text(x + 60, y + 31, titleValue, 13, theme.text, 650)}${text(x + 60, y + 52, meta, 10, theme.muted)}${circle(x + width - 17, y + 17, 5, accent)}`;
}

function voiceCapsule(x, y, width, state, theme, tone = "lime") {
  const accent = tone === "amber" ? palette.amber : tone === "red" ? palette.red : theme.accent;
  let out = rect(x, y, width, 64, theme.surface, 32, theme.border, 1, 'filter="url(#shadow)"');
  out += circle(x + 33, y + 32, 21, theme === dark ? `${accent}18` : `${accent}16`, accent, 1.5);
  out += icon("mic", x + 23, y + 22, 20, accent);
  out += text(x + 66, y + 27, state, 13, theme.text, 700);
  out += text(x + 66, y + 46, state === "Listening" ? "正在倾听，可随时插话" : state === "Speaking" ? "正在回应，开口即可打断" : state === "Paused" ? "已暂停，不会自动恢复" : "本地安全通道已接管", 10, theme.muted);
  for (let i = 0; i < 11; i++) {
    const h = 8 + ((i * 7) % 20);
    out += rect(x + width - 142 + i * 8, y + 32 - h / 2, 3, h, accent, 2);
  }
  out += circle(x + width - 28, y + 32, 15, theme.surface2);
  out += icon("pause", x + width - 37, y + 23, 18, theme.muted, 1.5);
  return out;
}

function renderFoundations(theme, titleSuffix) {
  const t = theme;
  let out = shell(t, "settings", `统一设计系统 · ${titleSuffix}`, "从视觉参考到可复用 Token、组件和资产", "ai", [{ label: "Design System v1", tone: "lime", width: 138 }]);
  out += sectionTitle(258, 145, "品牌核心", t, "可信赖、可中断、可追踪、适合长期办公");
  out += rect(258, 182, 504, 246, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += logo(290, 218, t);
  out += text(290, 294, "AI Desktop Employee", 32, t.text, 780);
  out += multiText(290, 326, ["人负责目标、权限与最终决定", "AI 负责执行、记录与持续改进"], 13, t.muted, 450, 1.55);
  out += circle(648, 310, 72, "url(#glow)");
  out += path("M660 245l54 22v40c0 42-28 75-54 90-27-15-54-48-54-90v-40z", t.accent, 6, t.surface2);
  out += circle(644, 307, 5, t.accent);
  out += circle(675, 307, 5, t.accent);
  out += path("M650 332q10 8 20 0", t.accent, 3);

  out += sectionTitle(792, 145, "主题与表面", t, "同一语义，两套对比度与光影");
  out += rect(792, 182, 612, 246, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  const swatches = [
    [palette.lime, "Brand 400", "#B8E51B"],
    [palette.limeStrong, "Brand 500", "#9FD000"],
    [palette.ink900, "Ink 900", "#0E1210"],
    [palette.paper, "Paper", "#F4F6F2"],
    [palette.amber, "Warning", "#F3B83F"],
    [palette.red, "Danger", "#F05F62"]
  ];
  swatches.forEach(([color, name, hex], index) => {
    const x = 822 + (index % 3) * 188;
    const y = 216 + Math.floor(index / 3) * 92;
    out += rect(x, y, 52, 52, color, 14, color === palette.paper ? palette.slate200 : "none");
    out += text(x + 65, y + 22, name, 12, t.text, 650);
    out += text(x + 65, y + 43, hex, 10, t.muted);
  });

  out += sectionTitle(258, 474, "排版与间距", t);
  out += rect(258, 510, 504, 338, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(290, 564, "页面标题 / 28–32", 30, t.text, 760);
  out += text(290, 610, "模块标题 / 16–18", 18, t.text, 700);
  out += text(290, 650, "正文与表格 / 13–14", 14, t.text, 500);
  out += text(290, 684, "辅助说明 / 11–12", 11, t.muted);
  out += line(290, 720, 722, 720, t.border);
  ["4", "8", "12", "16", "24", "32"].forEach((value, index) => {
    const x = 290 + index * 70;
    out += rect(x, 752, Number(value), 16, t.accent, 4);
    out += text(x, 796, value, 10, t.muted);
  });
  out += text(290, 828, "8px 基础网格 · 12/16/20/24 圆角 · 克制的高程阴影", 11, t.muted);

  out += sectionTitle(792, 474, "状态语义", t);
  out += rect(792, 510, 612, 338, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += pill(824, 548, "Listening · 正常", "lime", t, 154);
  out += pill(996, 548, "Waiting · 注意", "amber", t, 154);
  out += pill(1168, 548, "Blocked · 阻止", "red", t, 154);
  out += pill(824, 594, "Paused · 暂停", "neutral", t, 154);
  out += pill(996, 594, "Evidence · 信息", "blue", t, 154);
  out += pill(1168, 594, "Complete · 完成", "lime", t, 154);
  out += voiceCapsule(824, 665, 486, "Speaking", t);
  out += text(824, 763, "规则", 12, t.text, 700);
  out += multiText(824, 788, ["状态必须同时使用颜色、图标和文字；", "高风险动作永不依赖倒计时自动确认。"], 12, t.muted, 450, 1.5);
  return out + endSvg();
}

function renderComponents() {
  const t = light;
  let out = shell(t, "settings", "组件与运行状态规范", "所有页面通过同一套组件表达状态、风险与证据", "ai", [{ label: "U2 可理解", tone: "lime", width: 116 }]);
  out += sectionTitle(258, 146, "运行时状态", t);
  const states = [
    ["Listening", "lime"],
    ["Thinking", "amber"],
    ["Speaking", "lime"],
    ["Interrupted", "red"],
    ["Paused", "neutral"],
    ["Complete", "lime"]
  ];
  states.forEach(([state, tone], index) => {
    out += voiceCapsule(258 + (index % 2) * 580, 180 + Math.floor(index / 2) * 88, 548, state, index % 2 ? dark : light, tone);
  });
  out += sectionTitle(258, 474, "核心组件", t);
  out += rect(258, 510, 548, 330, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 547, "Action Proposal", 14, t.text, 700);
  out += pill(654, 525, "需要确认", "amber", t, 112);
  out += text(282, 584, "准备将“预算总额”写入当前工作表", 17, t.text, 700);
  out += multiText(282, 616, ["目标：Q2 预算表 / 单元格 B12", "原因：根据已确认的三个费用项目汇总"], 12, t.muted, 450, 1.55);
  out += rect(282, 692, 500, 54, t.surface2, 12);
  out += icon("shield", 300, 706, 24, palette.amber);
  out += text(338, 716, "只批准本次精确动作，不授予后续通用权限", 11, t.muted, 550);
  out += button(282, 770, "拒绝", t, "secondary", 100);
  out += button(394, 770, "编辑指令", t, "secondary", 122);
  out += button(632, 770, "确认执行", t, "primary", 150);

  out += rect(830, 510, 574, 330, dark.surface, 20, dark.border, 1, 'filter="url(#shadow)"');
  out += text(856, 547, "Session Path", 14, dark.text, 700);
  const events = [
    ["用户目标", "查找五个中文全双工模型", "lime"],
    ["AI 计划", "搜索、阅读并比较来源", "blue"],
    ["用户纠正", "只保留可本地运行的方案", "amber"],
    ["当前步骤", "验证硬件与许可证要求", "lime"]
  ];
  events.forEach(([titleValue, desc, tone], index) => {
    const yy = 586 + index * 58;
    const accent = tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : dark.accent;
    if (index < events.length - 1) out += line(878, yy + 16, 878, yy + 66, dark.border, 2);
    out += circle(878, yy + 8, 8, dark.surface2, accent, 2);
    out += text(902, yy + 5, titleValue, 12, dark.text, 650);
    out += text(902, yy + 25, desc, 11, dark.muted);
  });
  out += button(856, 784, "打开完整 Session", dark, "secondary", 182);
  return out + endSvg();
}

function renderAssetBoard() {
  const t = dark;
  let out = shell(t, "settings", "开发素材总览", "独立、透明、可复用；页面不依赖裁切概念图", "ai", [{ label: "Vector first", tone: "lime", width: 122 }]);
  const groups = [
    ["品牌与头像", ["logo mark", "AI Employee", "Execution Brain", "Record Notebook"], "shield"],
    ["声音与设备", ["waveform", "voice orb", "headset", "microphone"], "mic"],
    ["安全与状态", ["pause", "cancel", "takeover", "risk badges"], "lock"],
    ["Session 图谱", ["instruction", "correction", "evidence", "merge"], "graph"],
    ["Agentic 对象", ["project", "capsule", "report", "environment"], "capsule"],
    ["空态与错误", ["no sessions", "offline", "permission", "run failed"], "inbox"]
  ];
  groups.forEach(([titleValue, items, ic], index) => {
    const x = 258 + (index % 3) * 382;
    const y = 148 + Math.floor(index / 3) * 314;
    out += rect(x, y, 350, 280, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
    out += rect(x + 22, y + 22, 46, 46, "rgba(184,229,27,.12)", 14);
    out += icon(ic, x + 33, y + 33, 24, t.accent);
    out += text(x + 82, y + 51, titleValue, 15, t.text, 700);
    items.forEach((item, itemIndex) => {
      const yy = y + 94 + itemIndex * 40;
      out += rect(x + 22, yy, 306, 30, t.surface2, 9);
      out += circle(x + 38, yy + 15, 4, itemIndex === 2 ? palette.amber : t.accent);
      out += text(x + 52, yy + 20, item, 11, t.muted, 550);
      out += text(x + 308, yy + 20, item.includes("AI") ? "PNG/WebP" : "SVG", 9, t.faint, 500, "end");
    });
    out += text(x + 22, y + 258, "命名：category-name-state-theme.ext", 9, t.faint);
  });
  out += rect(258, 802, 1114, 56, "rgba(184,229,27,.08)", 16, t.accent, 1);
  out += icon("check", 282, 818, 22, t.accent);
  out += text(318, 831, "交付标准：SVG 使用 currentColor；栅格资产保留透明背景与 1x/2x；所有素材写入 manifest。", 12, t.text, 600);
  return out + endSvg();
}

function renderOnboarding(theme = light) {
  const t = theme;
  let out = shell(t, "devices", "首次启动", "用三步建立可理解、可暂停的本地 AI 工作环境", "ai", [{ label: "步骤 1 / 3", tone: "lime", width: 104 }]);
  out += rect(258, 150, 1110, 690, t.surface, 26, t.border, 1, 'filter="url(#shadow)"');
  out += circle(486, 376, 134, "url(#glow)");
  out += path("M486 252l90 38v68c0 69-48 121-90 145-43-24-90-76-90-145v-68z", t.accent, 7, t.surface2);
  out += circle(462, 362, 7, t.accent);
  out += circle(510, 362, 7, t.accent);
  out += path("M468 398q18 13 36 0", t.accent, 4);
  out += text(486, 551, "你始终拥有控制权", 18, t.text, 750, "middle");
  out += text(486, 579, "停、暂停、取消与接管始终在本地生效", 12, t.muted, 450, "middle");

  out += text(730, 236, "准备 AI Cursor", 30, t.text, 780);
  out += multiText(730, 278, ["只需完成最小配置，后续可在设置中修改。", "我们不会默认保存原始音频或敏感凭据。"], 13, t.muted, 450, 1.55);
  const steps = [
    ["麦克风权限", "允许真实语音输入与插话检测", "已允许", "lime", "mic"],
    ["音频输出", "选择耳机或电脑扬声器", "待选择", "amber", "device"],
    ["固定 Provider", "Cycle 1 期间只使用一个 Provider", "未配置", "neutral", "model"]
  ];
  steps.forEach(([titleValue, desc, status, tone, ic], index) => {
    const y = 364 + index * 108;
    out += rect(730, y, 550, 88, t.surface2, 16, t.border);
    out += rect(750, y + 18, 48, 48, tone === "amber" ? palette.amberSoft : tone === "lime" ? palette.limeSoft : t.surface, 14);
    out += icon(ic, 762, y + 30, 24, tone === "amber" ? palette.amber : t.accent);
    out += text(818, y + 35, titleValue, 14, t.text, 700);
    out += text(818, y + 58, desc, 11, t.muted);
    out += pill(1162, y + 28, status, tone, t, 94);
  });
  out += button(730, 716, "稍后设置", t, "secondary", 120);
  out += button(1110, 716, "继续选择设备", t, "primary", 170);
  return out + endSvg();
}

function renderConversation(theme = dark) {
  const t = theme;
  let out = shell(t, "devices", "连接对话入口", "选择用于和 AI 实时交流的输入与输出路径", "ai", [
    { label: "Safety always on", tone: "lime", width: 146 },
    { label: "未连接", tone: "amber", width: 94 }
  ]);
  const routes = [
    ["推荐", "蓝牙耳机 Hands-Free", "耳机麦克风 → 耳机输出", "延迟最低，适合自然插话", "lime"],
    ["分离模式", "电脑麦克风 + 蓝牙立体声", "电脑麦克风 → 耳机输出", "音质更好，输入输出分离", "blue"],
    ["Fallback", "电脑麦克风 + 扬声器", "默认麦克风 → 默认扬声器", "无需外部设备即可开始", "neutral"],
    ["手动选择", "自定义输入与输出设备", "选择两个具体设备", "用于特殊硬件或排错", "amber"]
  ];
  routes.forEach(([tag, name, route, hint, tone], index) => {
    const y = 150 + index * 157;
    out += rect(258, y, 720, 137, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
    out += rect(280, y + 23, 58, 58, t.surface2, 17);
    out += icon(index === 0 ? "device" : index === 2 ? "mic" : "settings", 296, y + 39, 26, tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : t.accent);
    out += pill(358, y + 22, tag, tone, t, tag.length > 4 ? 98 : 82);
    out += text(358, y + 71, name, 16, t.text, 700);
    out += text(358, y + 96, route, 11, t.muted);
    out += text(358, y + 117, hint, 10, t.faint);
    out += button(838, y + 49, index === 0 ? "连接" : "选择", t, index === 0 ? "primary" : "secondary", 112);
  });
  out += rect(1010, 150, 362, 608, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(1038, 190, "对话链路", 15, t.text, 700);
  const flow = [
    ["User Voice", "mic"],
    ["Conversation Entry", "device"],
    ["Duplex Provider", "model"],
    ["AI Voice Output", "mic"]
  ];
  flow.forEach(([label, ic], index) => {
    const y = 234 + index * 104;
    out += rect(1064, y, 254, 64, t.surface2, 15, t.border);
    out += icon(ic, 1084, y + 20, 24, t.accent);
    out += text(1124, y + 37, label, 12, t.text, 650);
    if (index < flow.length - 1) out += path(`M1191 ${y + 64}v38`, t.accent, 2);
  });
  out += rect(1038, 675, 306, 56, "rgba(184,229,27,.08)", 14, t.accent, 1);
  out += icon("shield", 1056, 692, 22, t.accent);
  out += multiText(1092, 695, ["“停 / 暂停 / 取消”", "绕过 Provider 本地生效"], 10, t.muted, 600, 1.45);
  out += button(258, 798, "测试麦克风", t, "secondary", 136);
  out += button(406, 798, "播放测试音", t, "secondary", 136);
  return out + endSvg();
}

function renderDashboard(theme = dark) {
  const t = theme;
  let out = shell(t, "dashboard", "下午好，Jacob", "选择一个目标，AI 将在你的监督下执行", "ai", [
    { label: "Safety On", tone: "lime", width: 104 },
    { label: "Provider Ready", tone: "lime", width: 132 }
  ]);
  out += rect(258, 146, 752, 270, t.surface, 24, t.border, 1, 'filter="url(#shadow)"');
  out += circle(640, 272, 132, "url(#glow)");
  out += circle(640, 260, 62, t.surface2, t.accent, 2);
  out += icon("mic", 611, 231, 58, t.accent, 2.3);
  out += text(640, 344, "开始受监督工作", 22, t.text, 760, "middle");
  out += text(640, 372, "说出目标，或从工作流中选择", 12, t.muted, 450, "middle");
  out += button(835, 332, "开始对话", t, "primary", 140);
  out += pill(284, 170, "对话入口已连接", "lime", t, 142);
  out += pill(842, 170, "本地记录开启", "blue", t, 128);

  out += statCard(1034, 146, 338, "当前焦点任务", "研究全双工模型", "正在等待你的目标", t, "lime", "project");
  out += statCard(1034, 280, 338, "本周节省时间", "3h 42m", "来自 7 个已完成 Session", t, "blue", "session");

  out += sectionTitle(258, 458, "快速开始", t);
  const quick = [
    ["研究并整理来源", "只读浏览器任务", "search"],
    ["继续昨日 Session", "从安全锚点恢复", "session"],
    ["导入工作流", "复用已验证步骤", "workflow"]
  ];
  quick.forEach(([titleValue, desc, ic], index) => {
    const x = 258 + index * 250;
    out += rect(x, 492, 228, 116, t.surface, 18, t.border, 1, 'filter="url(#shadow)"');
    out += rect(x + 18, 510, 36, 36, t.surface2, 11);
    out += icon(ic, x + 26, 518, 20, t.accent);
    out += text(x + 18, 567, titleValue, 13, t.text, 650);
    out += text(x + 18, 589, desc, 10, t.muted);
  });
  out += sectionTitle(258, 650, "最近 Session", t);
  out += table(
    258,
    680,
    1114,
    [
      ["对比中文全双工模型", "已完成", "今天 14:20", "5 个来源"],
      ["Q2 预算资料整理", "已暂停", "昨天 18:12", "等待恢复"],
      ["供应商背景研究", "已完成", "周二 10:43", "3 个结论"]
    ],
    t
  );
  return out + endSvg();
}

function renderRuntimeStates() {
  const t = dark;
  let out = shell(t, "tasks", "运行时状态总览", "Voice Capsule 是用户在任何应用中的常驻控制面", "ai", [{ label: "Overlay System", tone: "lime", width: 126 }]);
  const states = [
    ["Listening", "正在倾听，可自然插话", "lime"],
    ["Thinking", "理解目标并形成下一步", "amber"],
    ["Speaking", "流式回应，开口即可打断", "lime"],
    ["Interrupted", "旧回答已停止，新约束生效", "red"],
    ["Paused", "已暂停，不会自动恢复", "neutral"],
    ["Waiting confirmation", "等待批准精确动作", "amber"],
    ["Acting", "正在当前 Workspace 可见执行", "lime"],
    ["Provider error", "本地停止仍然可用", "red"]
  ];
  states.forEach(([state, desc, tone], index) => {
    const x = 258 + (index % 2) * 570;
    const y = 154 + Math.floor(index / 2) * 168;
    const tt = index % 2 ? light : dark;
    out += rect(x, y, 536, 142, tt === dark ? dark.surface : light.surface, 22, tt === dark ? dark.border : light.border, 1, 'filter="url(#shadow)"');
    out += voiceCapsule(x + 20, y + 18, 496, state, tt, tone);
    out += text(x + 22, y + 112, desc, 11, tt.muted);
    out += text(x + 514, y + 112, index < 3 ? "用户可随时暂停 / 取消 / 接管" : "状态必须获得明确确认", 9, tt.faint, 450, "end");
  });
  return out + endSvg();
}

function renderTaskWorkspace(theme = dark) {
  const t = theme;
  let out = shell(t, "tasks", "研究中文全双工模型", "当前焦点任务 · 只读 BrowserView · Session #A-024", "ai", [
    { label: "Speaking", tone: "lime", width: 102 },
    { label: "Read only", tone: "blue", width: 100 }
  ]);
  out += rect(258, 144, 260, 684, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(280, 181, "任务步骤", 14, t.text, 700);
  const steps = [
    ["理解目标", "完成", "lime"],
    ["制定搜索计划", "完成", "lime"],
    ["读取来源", "进行中", "blue"],
    ["验证限制条件", "下一步", "amber"],
    ["生成带来源总结", "等待", "neutral"]
  ];
  steps.forEach(([name, status, tone], index) => {
    const y = 222 + index * 83;
    const accent = tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : tone === "neutral" ? t.faint : t.accent;
    if (index < steps.length - 1) out += line(301, y + 23, 301, y + 87, t.border, 2);
    out += circle(301, y + 12, 10, t.surface2, accent, 2);
    if (status === "完成") out += icon("check", 294, y + 5, 14, accent, 2);
    out += text(326, y + 8, name, 12, t.text, 650);
    out += text(326, y + 30, status, 10, accent, 550);
  });
  out += button(280, 747, "暂停任务", t, "secondary", 104);
  out += button(396, 747, "取消", t, "danger", 92);

  out += rect(542, 144, 560, 684, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += rect(562, 164, 520, 44, t.surface2, 11);
  out += icon("search", 578, 175, 20, t.muted);
  out += text(614, 191, "中文全双工语音模型 本地运行", 12, t.text, 550);
  out += pill(936, 171, "BrowserView A", "blue", t, 126);
  out += rect(562, 224, 520, 342, t === dark ? "#F7F9FB" : "#FAFBFC", 14);
  out += text(586, 264, "搜索结果", 15, palette.slate950, 700);
  const resultRows = [
    ["BayLing-Duplex 技术报告", "实时语音对话与中英文支持"],
    ["PersonaPlex 模型说明", "全双工、多角色语音与本地部署"],
    ["Moshi 开源仓库", "流式语音生成、许可证与硬件需求"]
  ];
  resultRows.forEach(([titleValue, desc], index) => {
    const y = 294 + index * 82;
    out += circle(588, y + 11, 5, palette.limeStrong);
    out += text(606, y + 15, titleValue, 12, palette.slate950, 650);
    out += text(606, y + 39, desc, 10, palette.slate600);
    out += line(606, y + 59, 1048, y + 59, palette.slate200);
  });
  out += rect(562, 586, 520, 94, "rgba(184,229,27,.08)", 14, t.accent, 1);
  out += text(586, 618, "当前动作", 10, t.accentText, 700);
  out += text(586, 649, "读取 PersonaPlex 的硬件和许可证要求", 13, t.text, 650);
  out += text(586, 670, "只读 DOM · 不提交表单 · 不写入文件", 10, t.muted);
  out += voiceCapsule(582, 732, 480, "Speaking", t);

  out += rect(1126, 144, 246, 684, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(1148, 181, "Session 实时记录", 14, t.text, 700);
  out += timeline(
    1140,
    204,
    218,
    [
      { title: "用户目标", time: "14:20", desc: "比较适合中文的全双工模型", tone: "lime" },
      { title: "AI 计划", time: "14:21", desc: "搜索、阅读并验证来源", tone: "blue" },
      { title: "用户纠正", time: "14:24", desc: "只保留可本地运行方案", tone: "amber" },
      { title: "当前步骤", time: "14:26", desc: "读取 PersonaPlex 要求", tone: "lime" }
    ],
    t
  );
  return out + endSvg();
}

function renderActionConfirmation() {
  const t = dark;
  let out = shell(t, "tasks", "动作确认与用户接管", "高风险动作永远显示精确目标、影响、原因与后置验证", "ai", [{ label: "Waiting confirmation", tone: "amber", width: 174 }]);
  out += rect(258, 150, 710, 640, t.surface, 24, t.border, 1, 'filter="url(#shadow)"');
  out += rect(282, 178, 662, 364, "#F7F9FB", 16);
  out += text(308, 216, "Q2 预算表", 15, palette.slate950, 700);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 308 + col * 116;
      const y = 244 + row * 42;
      const selected = row === 4 && col === 3;
      out += rect(x, y, 116, 42, selected ? palette.limeSoft : palette.white, 0, selected ? palette.limeStrong : palette.slate200, selected ? 2 : 1);
      if (selected) out += text(x + 58, y + 26, "8,500", 12, palette.slate950, 700, "middle");
    }
  }
  out += rect(588, 437, 170, 42, "none", 0, palette.limeStrong, 3);
  out += circle(758, 479, 6, palette.limeStrong);
  out += text(282, 584, "预览仍然可见；用户可直接操作原应用", 11, t.muted);
  out += button(282, 632, "立即接管", t, "secondary", 128);
  out += button(424, 632, "暂停", t, "secondary", 96);

  out += rect(994, 150, 378, 640, t.surface, 24, palette.amber, 1.4, 'filter="url(#shadow)"');
  out += pill(1020, 178, "需要确认", "amber", t, 112);
  out += text(1020, 240, "写入预算总额", 22, t.text, 760);
  out += multiText(1020, 276, ["目标：Excel / Q2预算表 / B12", "值：8,500", "影响：修改当前工作簿"], 12, t.muted, 450, 1.65);
  out += line(1020, 362, 1346, 362, t.border);
  out += text(1020, 398, "为什么需要确认", 12, t.text, 700);
  out += multiText(1020, 426, ["该动作会写入文件。确认仅适用于", "当前精确单元格，不扩大后续权限。"], 11, t.muted, 450, 1.55);
  out += rect(1020, 496, 326, 90, "rgba(243,184,63,.08)", 14, palette.amber, 1);
  out += icon("shield", 1038, 516, 24, palette.amber);
  out += text(1076, 526, "执行后验证", 11, palette.amber, 700);
  out += multiText(1076, 550, ["重新读取 B12 并保存截图 Evidence", "失败时停止，不自动重试提交"], 10, t.muted, 450, 1.45);
  out += button(1020, 624, "拒绝", t, "secondary", 100);
  out += button(1132, 624, "编辑", t, "secondary", 100);
  out += button(1020, 682, "确认本次动作", t, "primary", 326);
  return out + endSvg();
}

function renderMultiTask() {
  const t = light;
  let out = shell(t, "tasks", "任务工作区", "默认聚焦一个任务，其他任务只显示可理解的状态摘要", "ai", [{ label: "3 个任务", tone: "blue", width: 102 }]);
  const tasks = [
    ["研究中文全双工模型", "active", "读取第三个来源", "BrowserView A", "12 min", "lime"],
    ["整理 Q2 预算资料", "waiting", "等待确认写入表格", "Excel", "8 min", "amber"],
    ["供应商背景研究", "paused", "用户已暂停", "BrowserView B", "21 min", "neutral"]
  ];
  tasks.forEach(([name, status, action, workspace, duration, tone], index) => {
    const y = 154 + index * 198;
    const focused = index === 0;
    out += rect(258, y, 1114, 174, t.surface, 22, focused ? t.accent : t.border, focused ? 2 : 1, 'filter="url(#shadow)"');
    out += rect(282, y + 25, 48, 48, focused ? palette.limeSoft : t.surface2, 14);
    out += icon(index === 1 ? "session" : "search", 294, y + 37, 24, tone === "amber" ? palette.amber : t.accent);
    out += text(350, y + 40, name, 16, t.text, 720);
    out += pill(350, y + 58, status === "active" ? "执行中" : status === "waiting" ? "等待确认" : "已暂停", tone, t, 102);
    out += text(500, y + 80, action, 12, t.muted);
    out += text(1032, y + 38, workspace, 11, t.muted, 600);
    out += text(1290, y + 38, duration, 11, t.faint, 500, "end");
    out += line(282, y + 108, 1346, y + 108, t.border);
    out += text(282, y + 139, "下一步", 10, t.faint, 650);
    out += text(342, y + 139, index === 0 ? "验证许可证与硬件需求" : index === 1 ? "确认精确单元格" : "从最近安全锚点恢复", 11, t.text, 600);
    out += button(1088, y + 118, status === "paused" ? "恢复" : "暂停", t, "secondary", 94);
    out += button(1194, y + 118, status === "waiting" ? "查看确认" : "打开", t, focused ? "primary" : "secondary", 128);
  });
  out += rect(258, 764, 1114, 78, palette.blueSoft, 16, palette.blue, 1);
  out += icon("hand", 282, 789, 24, palette.blue);
  out += text(322, 795, "接管任一任务会释放对应 Workspace，并使旧 Observation State 失效。", 12, palette.slate800, 600);
  return out + endSvg();
}

function renderSessions(theme = light) {
  const t = theme;
  let out = shell(t, "sessions", "Session", "结构化记录目标、动作、纠正、来源与恢复锚点", "ai", [
    { label: "本地加密", tone: "lime", width: 108 },
    { label: "12 个 Session", tone: "blue", width: 118 }
  ]);
  out += rect(258, 144, 1114, 62, t.surface, 16, t.border, 1, 'filter="url(#shadow)"');
  out += icon("search", 280, 163, 22, t.muted);
  out += text(318, 180, "搜索目标、来源、结论或应用", 12, t.faint);
  out += pill(878, 160, "全部状态", "neutral", t, 112);
  out += pill(1002, 160, "最近 30 天", "neutral", t, 118);
  out += button(1226, 155, "导出", t, "secondary", 110);
  out += table(
    258,
    232,
    1114,
    [
      ["中文全双工模型研究", "已完成", "今天 14:20", "5 来源 · 3 结论"],
      ["Q2 预算资料整理", "已暂停", "昨天 18:12", "恢复锚点可用"],
      ["供应商背景研究", "已完成", "周二 10:43", "3 来源 · 1 风险"],
      ["客户邮件草稿", "已取消", "周一 16:05", "未发送"],
      ["竞品功能矩阵", "等待确认", "7 月 12 日", "等待发布摘要"],
      ["招聘岗位研究", "已完成", "7 月 10 日", "8 来源 · 2 纠正"]
    ],
    t
  );
  out += rect(258, 652, 1114, 176, t.surface, 18, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 690, "今日摘要", 14, t.text, 700);
  out += statCard(282, 714, 240, "完成任务", "3", "成功率 100%", t, "lime", "check");
  out += statCard(540, 714, 240, "用户纠正", "4", "均已写入 Session", t, "amber", "session");
  out += statCard(798, 714, 240, "引用来源", "12", "全部可重新打开", t, "blue", "evidence");
  out += statCard(1056, 714, 290, "待处理", "1", "一个 Session 等待恢复", t, "red", "inbox");
  return out + endSvg();
}

function renderSessionDetail() {
  const t = light;
  let out = shell(t, "sessions", "中文全双工模型研究", "Session #A-024 · 完成于今天 14:32 · 25 分钟", "ai", [
    { label: "已完成", tone: "lime", width: 96 },
    { label: "5 个来源", tone: "blue", width: 102 }
  ]);
  out += rect(258, 144, 284, 688, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(280, 181, "Session Summary", 14, t.text, 700);
  out += text(280, 224, "目标", 10, t.faint, 700);
  out += multiText(280, 249, ["比较适合中文、可本地运行的", "全双工语音模型。"], 12, t.text, 600, 1.5);
  out += text(280, 320, "最终结论", 10, t.faint, 700);
  out += multiText(280, 345, ["BayLing 更贴合中文需求；", "PersonaPlex 适合多角色实验；", "Moshi 作为开源基线保留。"], 12, t.text, 550, 1.55);
  out += text(280, 432, "用户纠正", 10, t.faint, 700);
  out += multiText(280, 457, ["排除仅提供云端 API 的方案；", "重点记录硬件与许可证要求。"], 11, t.muted, 500, 1.55);
  out += text(280, 526, "未解决问题", 10, t.faint, 700);
  out += multiText(280, 551, ["需要在目标显卡上实测延迟；", "尚未验证中文自然插话质量。"], 11, t.muted, 500, 1.55);
  out += button(280, 742, "从此继续", t, "primary", 236);

  out += timeline(
    568,
    144,
    532,
    [
      { title: "用户目标", time: "14:20", desc: "比较适合中文的全双工模型", tone: "lime" },
      { title: "AI 计划", time: "14:21", desc: "搜索模型、论文、仓库和许可证", tone: "blue" },
      { title: "用户纠正", time: "14:24", desc: "只保留可本地运行方案", tone: "amber" },
      { title: "来源 Evidence", time: "14:28", desc: "记录 BayLing、PersonaPlex、Moshi", tone: "blue" },
      { title: "结果", time: "14:32", desc: "形成三个候选和两个待验证问题", tone: "lime" }
    ],
    t
  );
  out += rect(1126, 144, 246, 688, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(1148, 181, "Evidence", 14, t.text, 700);
  const evidence = [
    ["BayLing 论文", "已验证", "blue"],
    ["PersonaPlex 文档", "已验证", "blue"],
    ["Moshi 仓库", "已验证", "blue"],
    ["硬件估算", "AI 推断", "amber"],
    ["中文插话质量", "未验证", "red"]
  ];
  evidence.forEach(([name, status, tone], index) => {
    const y = 220 + index * 87;
    out += rect(1142, y, 214, 70, t.surface2, 13);
    out += icon("evidence", 1156, y + 21, 22, tone === "amber" ? palette.amber : tone === "red" ? palette.red : palette.blue);
    out += text(1188, y + 27, name, 11, t.text, 650);
    out += pill(1188, y + 37, status, tone, t, 92);
  });
  return out + endSvg();
}

function renderSessionGraph() {
  const t = dark;
  let out = shell(t, "sessions", "Session Graph", "主线、纠正、尝试与合并形成可追踪的任务历史", "ai", [{ label: "Graph View", tone: "blue", width: 112 }]);
  out += rect(258, 144, 1114, 688, t.surface, 24, t.border, 1, 'filter="url(#shadow)"');
  for (let i = 0; i < 10; i++) out += line(282, 186 + i * 58, 1348, 186 + i * 58, "rgba(255,255,255,.025)");
  for (let i = 0; i < 16; i++) out += line(302 + i * 64, 166, 302 + i * 64, 808, "rgba(255,255,255,.025)");
  out += path("M426 240 C520 240 520 240 602 240 S740 240 824 240 S980 240 1088 240", t.accent, 3);
  out += path("M602 278 C650 360 706 390 774 390 S920 390 980 390", palette.amber, 2, "none", 'stroke-dasharray="7 7"');
  out += path("M774 428 C820 504 900 522 980 522 S1042 440 1088 278", palette.blue, 2.3);
  out += node(322, 202, 208, "用户目标", "比较中文全双工模型", "lime", t, "project");
  out += node(550, 202, 208, "AI 计划", "搜索与验证五个来源", "blue", t, "workflow");
  out += node(778, 202, 208, "读取来源", "BayLing / PersonaPlex", "lime", t, "evidence");
  out += node(1006, 202, 208, "结果摘要", "三个候选与两个问题", "lime", t, "check");
  out += node(648, 352, 248, "用户纠正", "只保留可本地运行方案", "amber", t, "session");
  out += node(840, 484, 256, "AI 尝试分支", "检查硬件与许可证", "blue", t, "run");
  out += node(1110, 352, 204, "合并", "更新主线结论", "violet", t, "graph");
  out += rect(300, 668, 1032, 108, t.surface2, 16, t.border);
  out += text(326, 702, "当前恢复锚点", 11, t.accent, 700);
  out += text(326, 737, "“检查硬件与许可证”完成后，重新验证中文插话质量", 15, t.text, 650);
  out += button(1112, 702, "从此分支继续", t, "primary", 186);
  return out + endSvg();
}

function renderResume() {
  const t = light;
  let out = shell(t, "sessions", "继续昨日任务", "恢复前重新验证页面、权限与来源，不直接重放旧动作", "ai", [{ label: "需要重验", tone: "amber", width: 108 }]);
  out += rect(258, 150, 1114, 626, t.surface, 24, t.border, 1, 'filter="url(#shadow)"');
  out += text(290, 198, "Q2 预算资料整理", 24, t.text, 760);
  out += text(290, 226, "昨日 18:12 暂停 · 恢复锚点 chunk_024", 11, t.muted);
  out += line(290, 252, 1340, 252, t.border);
  const checks = [
    ["Session 数据完整", "目标、纠正和来源均可读取", "通过", "lime"],
    ["工作簿仍存在", "Q2-budget.xlsx 已重新定位", "通过", "lime"],
    ["目标页面状态", "单元格内容自昨日后发生变化", "需重验", "amber"],
    ["写入权限", "上次确认已过期，需要重新确认", "已失效", "red"]
  ];
  checks.forEach(([name, desc, status, tone], index) => {
    const y = 290 + index * 88;
    out += rect(290, y, 1020, 70, t.surface2, 14);
    out += circle(318, y + 35, 13, tone === "lime" ? palette.limeSoft : tone === "amber" ? palette.amberSoft : palette.redSoft);
    out += icon(tone === "lime" ? "check" : "shield", 310, y + 27, 16, tone === "lime" ? t.accent : tone === "amber" ? palette.amber : palette.red);
    out += text(348, y + 28, name, 13, t.text, 650);
    out += text(348, y + 50, desc, 10, t.muted);
    out += pill(1190, y + 20, status, tone, t, 96);
  });
  out += rect(290, 668, 1020, 72, palette.amberSoft, 14, palette.amber, 1);
  out += icon("shield", 312, 692, 24, palette.amber);
  out += multiText(350, 690, ["恢复后先重新观察当前环境，再生成下一动作。", "旧授权、旧坐标和旧元素引用不会静默复用。"], 11, palette.slate800, 600, 1.45);
  out += button(258, 806, "取消恢复", t, "secondary", 130);
  out += button(1156, 806, "重新观察并继续", t, "primary", 216);
  return out + endSvg();
}

function renderWorkflows() {
  const t = light;
  let out = shell(t, "workflows", "工作流", "只保存经过真实 Session 验证、可解释且可停止的流程", "ai", [{ label: "4 个工作流", tone: "blue", width: 112 }]);
  out += rect(258, 144, 1114, 64, t.surface, 16, t.border, 1, 'filter="url(#shadow)"');
  out += icon("search", 280, 165, 22, t.muted);
  out += text(318, 181, "搜索工作流", 12, t.faint);
  out += pill(938, 161, "最近使用", "neutral", t, 112);
  out += button(1190, 156, "新建工作流", t, "primary", 146);
  const cards = [
    ["带来源的研究整理", "只读搜索 → 阅读 → 摘录 → 总结", "使用 7 次", "lime", "search"],
    ["供应商背景核查", "目标公司 → 来源验证 → 风险摘要", "使用 4 次", "blue", "evidence"],
    ["会议资料准备", "读取 Session → 汇总要点 → 生成清单", "使用 3 次", "amber", "session"],
    ["预算材料整理", "收集数据 → 草稿 → 强确认写入", "实验中", "red", "workflow"]
  ];
  cards.forEach(([name, desc, meta, tone, ic], index) => {
    const x = 258 + (index % 2) * 570;
    const y = 240 + Math.floor(index / 2) * 244;
    out += rect(x, y, 542, 216, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
    out += rect(x + 22, y + 22, 48, 48, tone === "red" ? palette.redSoft : tone === "amber" ? palette.amberSoft : tone === "blue" ? palette.blueSoft : palette.limeSoft, 14);
    out += icon(ic, x + 34, y + 34, 24, tone === "red" ? palette.red : tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : t.accent);
    out += text(x + 88, y + 43, name, 16, t.text, 700);
    out += text(x + 88, y + 66, meta, 10, t.muted);
    out += text(x + 22, y + 108, desc, 12, t.text, 550);
    out += line(x + 22, y + 132, x + 520, y + 132, t.border);
    out += pill(x + 22, y + 154, tone === "red" ? "需要写入确认" : "可暂停 / 可恢复", tone === "red" ? "red" : "lime", t, tone === "red" ? 138 : 136);
    out += button(x + 402, y + 151, "打开", t, index === 0 ? "primary" : "secondary", 116);
  });
  return out + endSvg();
}

function renderWorkflowBuilder() {
  const t = light;
  let out = shell(t, "workflows", "工作流编辑器", "由真实 Session 提议步骤，用户审查后再保存", "ai", [{ label: "草稿", tone: "amber", width: 84 }]);
  out += rect(258, 144, 266, 688, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(280, 181, "可用模块", 14, t.text, 700);
  const blocks = [
    ["用户目标", "project"],
    ["搜索来源", "search"],
    ["读取页面", "evidence"],
    ["用户确认", "shield"],
    ["生成结果", "check"],
    ["保存 Session", "session"]
  ];
  blocks.forEach(([name, ic], index) => {
    const y = 216 + index * 72;
    out += rect(280, y, 222, 54, t.surface2, 13, t.border);
    out += icon(ic, 296, y + 15, 22, t.accent);
    out += text(332, y + 33, name, 12, t.text, 600);
  });
  out += text(280, 684, "来源", 10, t.faint, 700);
  out += text(280, 708, "Session #A-024", 12, t.text, 600);
  out += text(280, 732, "7 次成功执行后提议", 10, t.muted);

  out += rect(550, 144, 566, 688, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(576, 181, "带来源的研究整理", 17, t.text, 720);
  out += text(576, 205, "步骤按真实执行顺序排列", 10, t.muted);
  const steps = [
    ["1", "收集并确认用户目标", "不调用工具"],
    ["2", "搜索候选来源", "只读 BrowserView"],
    ["3", "阅读并保存 Evidence", "记录来源与时间"],
    ["4", "接受用户纠正", "停止旧计划并重排"],
    ["5", "生成带来源总结", "输出未解决问题"]
  ];
  steps.forEach(([num, titleValue, desc], index) => {
    const y = 246 + index * 102;
    out += circle(600, y + 30, 18, palette.limeSoft);
    out += text(600, y + 36, num, 12, t.accentText, 750, "middle");
    out += rect(634, y, 448, 72, t.surface2, 14, t.border);
    out += text(654, y + 29, titleValue, 12, t.text, 650);
    out += text(654, y + 52, desc, 10, t.muted);
    if (index < steps.length - 1) out += line(600, y + 48, 600, y + 110, t.border, 2);
  });
  out += button(576, 770, "测试草稿", t, "secondary", 122);
  out += button(926, 770, "保存工作流", t, "primary", 156);

  out += rect(1142, 144, 230, 688, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(1164, 181, "安全与权限", 14, t.text, 700);
  const rules = [
    ["只读网页", "lime"],
    ["允许用户打断", "lime"],
    ["不自动提交", "lime"],
    ["写入需确认", "amber"],
    ["无永久授权", "red"]
  ];
  rules.forEach(([rule, tone], index) => {
    const y = 224 + index * 68;
    out += icon(tone === "lime" ? "check" : "shield", 1164, y, 18, tone === "lime" ? t.accent : tone === "amber" ? palette.amber : palette.red);
    out += text(1194, y + 15, rule, 11, t.text, 600);
  });
  out += line(1164, 570, 1350, 570, t.border);
  out += text(1164, 606, "版本", 10, t.faint, 700);
  out += text(1164, 632, "draft v0.3", 12, t.text, 650);
  out += text(1164, 666, "最近验证", 10, t.faint, 700);
  out += text(1164, 692, "3 次连续成功", 12, t.text, 650);
  return out + endSvg();
}

function renderModelCenter() {
  const t = light;
  let out = shell(t, "models", "模型中心", "普通用户只需要理解两个角色和一个固定安全层", "ai", [{ label: "固定 Provider", tone: "lime", width: 126 }]);
  const roles = [
    ["Execution Brain", "实时对话、理解目标、提出动作", "BayLing-Duplex", "运行中", "brain", "lime"],
    ["Record Notebook", "记录 Session、摘要与工作流建议", "Rule JSONL", "就绪", "notebook", "blue"],
    ["Safety Engine", "本地暂停、取消、停止与接管", "Local rules", "始终开启", "shield", "lime"]
  ];
  roles.forEach(([name, desc, model, status, ic, tone], index) => {
    const y = 150 + index * 164;
    out += rect(258, y, 780, 140, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
    out += rect(282, y + 26, 56, 56, tone === "blue" ? palette.blueSoft : palette.limeSoft, 16);
    out += icon(ic, 298, y + 42, 24, tone === "blue" ? palette.blue : t.accent);
    out += text(358, y + 46, name, 15, t.text, 700);
    out += text(358, y + 70, desc, 11, t.muted);
    out += pill(358, y + 91, status, tone, t, 102);
    out += text(816, y + 44, model, 13, t.text, 650);
    out += text(816, y + 68, index === 0 ? "固定到 Cycle 1" : index === 1 ? "本地存储" : "不可关闭", 10, t.muted);
    out += button(904, y + 82, index === 2 ? "查看规则" : "测试", t, "secondary", 108);
  });
  out += rect(1064, 150, 308, 468, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(1088, 188, "当前组合", 14, t.text, 700);
  const flow = [
    ["Execution Brain", "brain", "lime"],
    ["Record Notebook", "notebook", "blue"],
    ["Safety Engine", "shield", "lime"]
  ];
  flow.forEach(([name, ic, tone], index) => {
    const y = 226 + index * 98;
    out += rect(1088, y, 260, 68, t.surface2, 14);
    out += icon(ic, 1106, y + 22, 24, tone === "blue" ? palette.blue : t.accent);
    out += text(1144, y + 29, name, 12, t.text, 650);
    out += text(1144, y + 49, index === 2 ? "Locked" : "Healthy", 10, t.muted);
    if (index < flow.length - 1) out += path(`M1218 ${y + 68}v30`, t.accent, 2);
  });
  out += line(1088, 522, 1348, 522, t.border);
  out += text(1088, 558, "模型存储", 10, t.faint, 700);
  out += text(1088, 582, "D:\\Vlawd\\models", 11, t.text, 600);
  out += rect(1088, 594, 260, 8, t.surface2, 4);
  out += rect(1088, 594, 92, 8, t.accent, 4);
  out += rect(258, 662, 1114, 164, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 700, "Cycle 1 决策", 14, t.text, 700);
  out += multiText(282, 730, ["只固定一个合格 Provider，不在界面中鼓励持续横评。", "真实链路接通后，再根据延迟、成本和隐私证据决定替换。"], 12, t.muted, 500, 1.55);
  out += pill(1100, 716, "避免模型市场化", "amber", t, 166);
  return out + endSvg();
}

function renderDevices() {
  const t = light;
  let out = shell(t, "devices", "设备中心", "管理对话入口、测试音频路径并查看本地隐私状态", "ai", [{ label: "1 个活动入口", tone: "lime", width: 134 }]);
  out += rect(258, 150, 722, 676, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 190, "对话入口", 15, t.text, 700);
  const devices = [
    ["Bose QC Ultra", "输入 / 输出", "已连接", "device", "lime"],
    ["内置麦克风", "输入", "可用", "mic", "blue"],
    ["电脑扬声器", "输出", "可用", "device", "blue"]
  ];
  devices.forEach(([name, role, status, ic, tone], index) => {
    const y = 226 + index * 112;
    out += rect(282, y, 674, 92, t.surface2, 16, index === 0 ? t.accent : t.border, index === 0 ? 2 : 1);
    out += rect(302, y + 20, 52, 52, index === 0 ? palette.limeSoft : palette.blueSoft, 15);
    out += icon(ic, 316, y + 34, 24, index === 0 ? t.accent : palette.blue);
    out += text(374, y + 37, name, 14, t.text, 700);
    out += text(374, y + 60, role, 10, t.muted);
    out += pill(820, y + 30, status, tone, t, 92);
  });
  out += line(282, 570, 956, 570, t.border);
  out += text(282, 608, "输入电平", 11, t.muted, 650);
  for (let i = 0; i < 42; i++) {
    const h = 8 + ((i * 11) % 32);
    out += rect(282 + i * 14, 648 - h / 2, 6, h, i < 29 ? t.accent : t.surface2, 3);
  }
  out += button(282, 710, "测试麦克风", t, "secondary", 136);
  out += button(432, 710, "播放测试音", t, "secondary", 136);
  out += button(800, 710, "更换入口", t, "primary", 136);

  out += rect(1004, 150, 368, 318, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(1028, 190, "本地安全通道", 15, t.text, 700);
  out += rect(1028, 224, 320, 82, palette.limeSoft, 15, t.accent, 1);
  out += icon("shield", 1048, 248, 28, t.accent);
  out += text(1094, 251, "Safety Preemption", 12, t.text, 700);
  out += text(1094, 276, "始终开启 · 不经过 Provider", 10, t.muted);
  out += text(1028, 344, "支持控制词", 10, t.faint, 700);
  out += pill(1028, 366, "停", "red", t, 66);
  out += pill(1104, 366, "暂停", "amber", t, 76);
  out += pill(1190, 366, "取消", "red", t, 76);
  out += pill(1276, 366, "继续", "lime", t, 72);

  out += rect(1004, 492, 368, 334, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(1028, 532, "隐私状态", 15, t.text, 700);
  const privacy = [
    ["原始音频", "不保存", "lime"],
    ["Transcript", "仅当前 Session", "blue"],
    ["设备标识", "本地保存", "blue"],
    ["云端上传", "未启用", "lime"]
  ];
  privacy.forEach(([label, value, tone], index) => {
    const y = 574 + index * 58;
    out += text(1028, y, label, 11, t.muted);
    out += text(1348, y, value, 11, tone === "lime" ? t.accentText : palette.blue, 650, "end");
    out += line(1028, y + 18, 1348, y + 18, t.border);
  });
  return out + endSvg();
}

function renderSettings() {
  const t = light;
  let out = shell(t, "settings", "设置与隐私", "所有权限、存储、主题与记录策略都可理解、可撤销", "ai", [{ label: "Local first", tone: "lime", width: 112 }]);
  out += rect(258, 144, 244, 688, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  const categories = ["常规", "外观", "对话与声音", "Provider", "Session 与存储", "隐私与权限", "高级"];
  categories.forEach((label, index) => {
    const y = 174 + index * 58;
    const selected = index === 5;
    if (selected) out += rect(276, y - 18, 208, 42, palette.limeSoft, 11);
    out += text(296, y + 8, label, 12, selected ? t.accentText : t.muted, selected ? 700 : 550);
  });
  out += rect(528, 144, 844, 688, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(556, 188, "隐私与权限", 18, t.text, 730);
  out += text(556, 216, "控制哪些数据可以被保存、上传或发布", 11, t.muted);
  const sections = [
    ["原始音频", "默认不保存麦克风原始音频", false],
    ["Session Transcript", "本地保存，用于恢复与审计", true],
    ["匿名性能指标", "仅上传延迟、失败类型和版本", false],
    ["自动发布摘要", "任何内容发布前必须预览确认", false]
  ];
  sections.forEach(([titleValue, desc, enabled], index) => {
    const y = 264 + index * 92;
    out += line(556, y - 16, 1344, y - 16, t.border);
    out += text(556, y + 14, titleValue, 13, t.text, 650);
    out += text(556, y + 37, desc, 10, t.muted);
    out += rect(1262, y - 3, 52, 28, enabled ? t.accent : t.surface2, 14, enabled ? "none" : t.border);
    out += circle(enabled ? 1300 : 1276, y + 11, 10, enabled ? palette.ink950 : t.faint);
  });
  out += text(556, 654, "数据位置", 12, t.text, 700);
  out += rect(556, 676, 758, 54, t.surface2, 12, t.border);
  out += text(574, 709, "D:\\Vlawd\\sessions", 11, t.text, 600);
  out += button(1196, 683, "更改", t, "secondary", 100);
  out += rect(556, 754, 758, 54, palette.redSoft, 12, palette.red, 1);
  out += icon("shield", 574, 769, 22, palette.red);
  out += text(610, 780, "清除本地数据需要再次确认，且不会删除导出的 Evidence。", 10, palette.slate800, 600);
  return out + endSvg();
}

function renderProjectView() {
  const t = light;
  let out = shell(t, "projects", "中文全双工交互能力", "Living Project · v0.8 · 维护中", "web", [
    { label: "Validated", tone: "lime", width: 108 },
    { label: "Private", tone: "blue", width: 92 }
  ]);
  out += rect(258, 144, 730, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += pill(282, 172, "当前稳定结论", "lime", t, 132);
  out += text(282, 226, "用户可以自然插话改变约束，", 27, t.text, 760);
  out += text(282, 262, "AI 在目标延迟内停止并继续。", 27, t.text, 760);
  out += multiText(282, 304, ["该结论绑定精确版本、测试环境与三次真实运行，", "尚不能证明所有设备与 Provider 均兼容。"], 12, t.muted, 450, 1.55);
  out += sectionTitle(282, 376, "主要分支", t);
  const branches = [
    ["本地 Provider", "3 条 Evidence", "lime"],
    ["云端 Provider", "2 条 Evidence", "blue"],
    ["中文自然插话", "仍有争议", "amber"]
  ];
  branches.forEach(([name, meta, tone], index) => {
    const y = 410 + index * 82;
    out += rect(282, y, 650, 66, t.surface2, 14);
    out += icon("graph", 300, y + 21, 22, tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : t.accent);
    out += text(336, y + 27, name, 12, t.text, 650);
    out += text(336, y + 48, meta, 10, t.muted);
    out += pill(804, y + 18, tone === "amber" ? "有争议" : "已验证", tone, t, 100);
  });
  out += sectionTitle(282, 686, "待解决问题", t);
  out += multiText(282, 716, ["• 不同蓝牙设备的真实打断延迟", "• Provider 失败时的语音输出清理", "• 误打断率与恢复体验"], 11, t.muted, 500, 1.6);

  out += rect(1014, 144, 358, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(1038, 181, "项目状态", 14, t.text, 700);
  const metrics = [
    ["Revision", "v0.8"],
    ["最近验证", "今天 15:10"],
    ["成功运行", "7 / 8"],
    ["Evidence", "12"],
    ["贡献者", "3"],
    ["隐私范围", "Private"]
  ];
  metrics.forEach(([label, value], index) => {
    const y = 226 + index * 52;
    out += text(1038, y, label, 10, t.muted);
    out += text(1344, y, value, 11, t.text, 650, "end");
    out += line(1038, y + 15, 1344, y + 15, t.border);
  });
  out += text(1038, 562, "最近 Evidence", 12, t.text, 700);
  out += timeline(
    1028,
    578,
    330,
    [
      { title: "真实运行", time: "今天", desc: "三次自然插话均成功", tone: "lime" },
      { title: "失败报告", time: "昨天", desc: "蓝牙输出未及时 flush", tone: "red" }
    ],
    t
  );
  out += button(1038, 760, "贡献 Evidence", t, "primary", 306);
  return out + endSvg();
}

function renderRunValidate() {
  const t = dark;
  let out = shell(t, "run", "Run / Validate / Deploy", "同一 Project Graph 的执行投影，不是独立云控制台", "web", [
    { label: "Prototype", tone: "blue", width: 104 },
    { label: "Running", tone: "lime", width: 96 }
  ]);
  out += rect(258, 144, 764, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(284, 182, "Execution Plan", 15, t.text, 700);
  out += pill(866, 160, "Environment expires in 42m", "amber", t, 190);
  const stages = [
    ["Source checkout", "passed", "Revision 4f58ee9", "lime"],
    ["Build", "passed", "npm run build · 38s", "lime"],
    ["Start", "passed", "health endpoint ready", "lime"],
    ["Golden Test", "running", "2 / 3 scenarios", "blue"],
    ["Evaluator", "waiting", "independent result", "amber"]
  ];
  stages.forEach(([name, status, desc, tone], index) => {
    const y = 222 + index * 92;
    out += rect(284, y, 712, 72, t.surface2, 14, t.border);
    out += circle(312, y + 36, 13, tone === "lime" ? "rgba(184,229,27,.12)" : tone === "blue" ? "rgba(76,141,255,.12)" : "rgba(243,184,63,.12)");
    out += icon(tone === "lime" ? "check" : tone === "blue" ? "run" : "pause", 304, y + 28, 16, tone === "lime" ? t.accent : tone === "blue" ? palette.blue : palette.amber);
    out += text(344, y + 29, name, 13, t.text, 650);
    out += text(344, y + 51, desc, 10, t.muted);
    out += pill(870, y + 20, status, tone, t, 102);
  });
  out += button(284, 744, "停止环境", t, "danger", 126);
  out += button(842, 744, "查看实时日志", t, "secondary", 154);

  out += rect(1048, 144, 324, 326, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(1072, 182, "权限与预算", 14, t.text, 700);
  const limits = [
    ["Network", "Allowlist only"],
    ["Persistence", "Ephemeral"],
    ["Secrets", "2 references"],
    ["CPU / RAM", "2 vCPU / 4 GB"],
    ["Budget", "$0.42 max"]
  ];
  limits.forEach(([label, value], index) => {
    const y = 222 + index * 45;
    out += text(1072, y, label, 10, t.muted);
    out += text(1344, y, value, 10, t.text, 600, "end");
    out += line(1072, y + 13, 1344, y + 13, t.border);
  });
  out += rect(1048, 494, 324, 338, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(1072, 532, "Execution Report", 14, t.text, 700);
  out += statCard(1072, 560, 276, "Golden Test", "2 / 3", "一个场景仍在运行", t, "blue", "run");
  out += text(1072, 704, "失败分类", 10, t.muted, 700);
  out += pill(1072, 722, "none", "lime", t, 86);
  out += text(1072, 784, "原始日志和 Secret 不会自动发布到 Project Graph。", 9, t.faint);
  return out + endSvg();
}

function renderCapsulePreview() {
  const t = light;
  let out = shell(t, "registry", "Capsule 权限预览", "运行前理解目标、前置条件、环境、权限与输出", "web", [{ label: "Capsule v0.1", tone: "blue", width: 120 }]);
  out += rect(258, 150, 1114, 632, t.surface, 24, t.border, 1, 'filter="url(#shadow)"');
  out += rect(290, 184, 70, 70, palette.limeSoft, 20);
  out += icon("capsule", 307, 201, 36, t.accent);
  out += text(386, 208, "Research Sources Capsule", 22, t.text, 760);
  out += text(386, 236, "在隔离浏览器中搜索、阅读并返回带来源的摘要", 11, t.muted);
  out += pill(1160, 202, "Signed", "lime", t, 98);
  out += line(290, 278, 1340, 278, t.border);
  const columns = [
    ["目标与输入", ["目标：研究一个主题", "输入：query / constraints", "输出：summary / citations"], "project"],
    ["环境要求", ["BrowserView / CDP", "网络：allowlist", "存储：ephemeral"], "run"],
    ["需要权限", ["打开网页", "读取 DOM", "保存本地摘要"], "lock"]
  ];
  columns.forEach(([titleValue, rows, ic], index) => {
    const x = 290 + index * 350;
    out += rect(x, 312, 320, 224, t.surface2, 17, t.border);
    out += icon(ic, x + 20, 332, 24, t.accent);
    out += text(x + 56, 349, titleValue, 13, t.text, 700);
    rows.forEach((row, ri) => {
      out += circle(x + 24, 391 + ri * 42, 4, ri === 2 ? palette.amber : t.accent);
      out += text(x + 38, 395 + ri * 42, row, 11, t.muted, 500);
    });
  });
  out += rect(290, 570, 1020, 90, palette.amberSoft, 14, palette.amber, 1);
  out += icon("shield", 314, 594, 26, palette.amber);
  out += text(356, 601, "风险提示", 11, palette.slate950, 700);
  out += multiText(356, 626, ["该 Capsule 可以访问网络，但不能提交表单、支付或写入外部文件。", "不兼容时必须返回结构化原因，不会请求永久授权。"], 10, palette.slate700, 500, 1.45);
  out += button(290, 704, "查看来源与版本", t, "secondary", 168);
  out += button(1120, 704, "在临时环境运行", t, "primary", 190);
  return out + endSvg();
}

function renderForum() {
  const t = light;
  let out = shell(t, "forum", "Project Forum", "按人类可读的时间顺序查看同一 Graph 的 Project Event", "web", [{ label: "Class private", tone: "blue", width: 120 }]);
  out += rect(258, 144, 760, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 182, "中文全双工交互 · 讨论", 16, t.text, 720);
  out += timeline(
    276,
    208,
    726,
    [
      { title: "Jacob 提出问题", time: "09:12", desc: "哪些中文模型可以支持自然插话？", tone: "lime" },
      { title: "AI 生成结构化草稿", time: "09:13", desc: "拆分为模型、硬件、延迟与许可证节点", tone: "blue" },
      { title: "Lin 添加 Evidence", time: "10:02", desc: "补充 BayLing 技术报告与测试记录", tone: "blue" },
      { title: "Mia 提出反例", time: "11:26", desc: "特定蓝牙设备出现输出停止延迟", tone: "red" },
      { title: "维护者创建分支", time: "13:40", desc: "单独验证蓝牙音频输出链路", tone: "amber" },
      { title: "分支合并为 v0.8", time: "15:10", desc: "更新稳定结论并保留未解决问题", tone: "lime" }
    ],
    t
  );
  out += rect(1044, 144, 328, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(1068, 182, "添加贡献", 14, t.text, 700);
  const actions = [
    ["添加 Evidence", "evidence", "blue"],
    ["提出方案", "project", "lime"],
    ["提出反例", "shield", "red"],
    ["创建 Patch", "workflow", "amber"]
  ];
  actions.forEach(([label, ic, tone], index) => {
    const y = 222 + index * 76;
    out += rect(1068, y, 280, 58, t.surface2, 13, t.border);
    out += icon(ic, 1086, y + 18, 22, tone === "blue" ? palette.blue : tone === "red" ? palette.red : tone === "amber" ? palette.amber : t.accent);
    out += text(1122, y + 35, label, 12, t.text, 620);
  });
  out += line(1068, 544, 1348, 544, t.border);
  out += text(1068, 580, "发布边界", 12, t.text, 700);
  out += multiText(1068, 608, ["自由文本不会直接改变稳定对象。", "AI 只能将其转为候选节点，", "最终由维护者接受、拒绝或保留。"], 10, t.muted, 500, 1.55);
  out += button(1068, 752, "打开 Canvas", t, "primary", 280);
  return out + endSvg();
}

function renderCanvas() {
  const t = dark;
  let out = shell(t, "canvas", "Knowledge Canvas", "局部加载、语义缩放、冲突与依赖清晰可见", "web", [
    { label: "12 nodes", tone: "blue", width: 94 },
    { label: "Local graph", tone: "lime", width: 108 }
  ]);
  out += rect(258, 144, 1114, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  for (let i = 0; i < 12; i++) out += line(280, 174 + i * 54, 1350, 174 + i * 54, "rgba(255,255,255,.025)");
  for (let i = 0; i < 18; i++) out += line(290 + i * 58, 166, 290 + i * 58, 810, "rgba(255,255,255,.025)");
  const connections = [
    [814, 474, 598, 318, t.accent],
    [814, 474, 1040, 302, palette.blue],
    [814, 474, 1066, 576, palette.red],
    [814, 474, 566, 612, palette.amber],
    [598, 318, 392, 238, palette.blue],
    [1040, 302, 1220, 220, palette.violet],
    [566, 612, 392, 720, palette.amber]
  ];
  connections.forEach(([x1, y1, x2, y2, color], index) => {
    out += path(`M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`, color, 2, "none", index > 4 ? 'stroke-dasharray="7 7"' : "");
  });
  out += node(692, 435, 244, "自然插话闭环", "Problem · center", "lime", t, "project");
  out += node(486, 280, 222, "停止延迟 <200ms", "Goal · verified", "lime", t, "check");
  out += node(930, 264, 232, "真实音频输出", "Constraint · active", "blue", t, "device");
  out += node(956, 538, 248, "蓝牙输出延迟", "Counterexample", "red", t, "shield");
  out += node(446, 574, 238, "本地抢占通道", "Solution · testing", "amber", t, "run");
  out += node(300, 200, 220, "三次真实运行", "Evidence · fresh", "blue", t, "evidence");
  out += node(1110, 180, 220, "Cycle 1 v0.8", "Release", "violet", t, "capsule");
  out += node(286, 680, 224, "音频接口 Patch", "Patch · review", "amber", t, "workflow");
  out += rect(284, 754, 1040, 50, "rgba(0,0,0,.18)", 14, t.border);
  out += pill(304, 764, "Problem", "lime", t, 98);
  out += pill(414, 764, "Evidence", "blue", t, 104);
  out += pill(530, 764, "Conflict", "red", t, 102);
  out += pill(644, 764, "Patch", "amber", t, 90);
  out += text(1302, 786, "滚轮：语义缩放 · Shift：多选 · 双击：聚焦", 9, t.faint, 450, "end");
  return out + endSvg();
}

function renderDiffReview() {
  const t = light;
  let out = shell(t, "projects", "Patch Review", "结构化审查 typed contribution，而不是只比较自由文本", "web", [{ label: "Patch #18", tone: "amber", width: 102 }]);
  out += rect(258, 144, 1114, 602, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 181, "蓝牙音频输出停止策略", 17, t.text, 720);
  out += text(282, 207, "由 Mia 提交 · 来源 Session #B-114 · 2 条 Evidence", 10, t.muted);
  out += line(282, 230, 1348, 230, t.border);
  out += rect(282, 256, 510, 410, "#FFF8F8", 16, palette.redSoft);
  out += pill(304, 276, "当前版本", "red", t, 104);
  out += text(304, 328, "停止输出", 15, t.text, 700);
  out += multiText(304, 364, ["检测到用户插话后调用 Provider cancel。", "等待 Provider 返回，再清空播放队列。"], 12, t.muted, 500, 1.6);
  out += rect(304, 450, 466, 86, palette.redSoft, 13);
  out += text(324, 479, "风险", 10, palette.red, 700);
  out += multiText(324, 505, ["Provider 失联时无法停止；", "播放队列可能继续输出旧回答。"], 10, palette.slate800, 500, 1.45);
  out += text(304, 586, "Evidence", 10, t.faint, 700);
  out += text(304, 610, "失败报告 B-114 / Bluetooth HFP", 11, t.text, 600);

  out += rect(814, 256, 510, 410, "#F7FCE9", 16, palette.limeSoft);
  out += pill(836, 276, "候选 Patch", "lime", t, 112);
  out += text(836, 328, "本地优先停止", 15, t.text, 700);
  out += multiText(836, 364, ["检测到插话后立即 flush 本地播放队列，", "并行发送 Provider cancel，不等待远端返回。"], 12, t.muted, 500, 1.6);
  out += rect(836, 450, 466, 86, palette.limeSoft, 13);
  out += text(856, 479, "Postcondition", 10, t.accentText, 700);
  out += multiText(856, 505, ["输出设备静音且 generation id 失效；", "旧响应后续 chunk 全部丢弃。"], 10, palette.slate800, 500, 1.45);
  out += text(836, 586, "Evaluator", 10, t.faint, 700);
  out += text(836, 610, "3 次测试：平均 142ms / 全部通过", 11, t.text, 600);
  out += button(258, 780, "拒绝", t, "danger", 100);
  out += button(370, 780, "保留为分支", t, "secondary", 138);
  out += button(1160, 780, "接受并合并", t, "primary", 176);
  return out + endSvg();
}

function renderCampus() {
  const t = light;
  let out = shell(t, "forum", "AI 专家与图谱草稿", "原始私聊默认私密，发布前审查结构化摘要与来源", "web", [{ label: "Class private", tone: "blue", width: 120 }]);
  out += rect(258, 144, 524, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 181, "AI 专家私聊", 15, t.text, 700);
  const messages = [
    ["我想了解全双工模型为什么能被打断。", false],
    ["可以从流式生成、音频输出队列和本地抢占三个层面解释。", true],
    ["哪些是已验证事实，哪些只是推断？", false],
    ["已验证：本地输出可独立 flush；有争议：不同蓝牙设备的停止延迟。", true]
  ];
  messages.forEach(([body, ai], index) => {
    const y = 226 + index * 108;
    const x = ai ? 282 : 398;
    const w = ai ? 430 : 360;
    out += rect(x, y, w, 78, ai ? t.surface2 : palette.limeSoft, 16, ai ? t.border : "none");
    out += multiText(x + 16, y + 28, wrap(body, ai ? 30 : 24).slice(0, 2), 11, t.text, 500, 1.5);
    out += text(x + w - 12, y + 66, ai ? "AI Expert" : "You", 9, t.faint, 500, "end");
  });
  out += rect(282, 700, 476, 72, t.surface2, 14, t.border);
  out += text(302, 742, "继续提问…", 11, t.faint);
  out += circle(724, 736, 21, t.accent);
  out += icon("plus", 714, 726, 20, palette.ink950);

  out += rect(808, 144, 564, 688, t.surface, 22, t.border, 1, 'filter="url(#shadow)"');
  out += text(834, 181, "待发布的图谱草稿", 15, t.text, 700);
  out += pill(1210, 160, "仅你可见", "blue", t, 112);
  const draft = [
    ["Problem", "如何实现自然插话？", "lime"],
    ["Verified", "本地输出队列可独立停止", "blue"],
    ["Consensus", "安全控制应绕过模型", "lime"],
    ["Contested", "蓝牙设备都能在 200ms 内停止", "amber"],
    ["Hypothesis", "generation id 可避免旧 chunk 回流", "violet"]
  ];
  draft.forEach(([type, value, tone], index) => {
    const y = 222 + index * 86;
    out += rect(834, y, 512, 68, t.surface2, 14, t.border);
    out += pill(850, y + 18, type, tone === "violet" ? "blue" : tone, t, 104);
    out += text(972, y + 39, value, 11, t.text, 600);
  });
  out += rect(834, 678, 512, 78, palette.amberSoft, 14, palette.amber, 1);
  out += icon("lock", 852, 701, 22, palette.amber);
  out += multiText(890, 702, ["发布后只公开这些结构化节点和来源，", "原始录音与完整 Transcript 仍保持私密。"], 10, palette.slate800, 550, 1.45);
  out += button(834, 780, "继续编辑", t, "secondary", 128);
  out += button(1164, 780, "审查并发布", t, "primary", 182);
  return out + endSvg();
}

function renderExplore() {
  const t = light;
  let out = shell(t, "explore", "探索可验证项目与能力", "按目标匹配、环境、权限风险、成功率和 Evidence 新鲜度排序", "web", [{ label: "No engagement ranking", tone: "blue", width: 174 }]);
  out += rect(258, 144, 1114, 72, t.surface, 18, t.border, 1, 'filter="url(#shadow)"');
  out += icon("search", 282, 167, 24, t.muted);
  out += text(324, 187, "搜索目标、问题、Capsule、环境或 Evidence", 13, t.faint);
  out += button(1212, 160, "搜索", t, "primary", 132);
  out += rect(258, 240, 222, 588, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(282, 278, "筛选", 14, t.text, 700);
  const filters = ["适用环境", "权限风险", "验证状态", "维护状态", "Evidence 新鲜度", "Project 类型"];
  filters.forEach((label, index) => {
    const y = 318 + index * 68;
    out += text(282, y, label, 11, t.text, 600);
    out += rect(282, y + 14, 174, 30, t.surface2, 8, t.border);
    out += text(296, y + 34, index === 1 ? "低风险" : index === 2 ? "已验证" : "全部", 10, t.muted);
  });
  out += rect(506, 240, 866, 588, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
  out += text(532, 278, "与“带来源研究”最相关", 14, t.text, 700);
  const results = [
    ["Research Sources Capsule", "Capsule", "94% 任务匹配 · 87% 成功率", "Prototype / BrowserView", "lime"],
    ["可信来源整理方法", "Living Project", "12 条 Evidence · 3 个维护者", "文档 / 本地", "blue"],
    ["高校课程资料验证", "Project", "最近 2 天验证 · 低权限", "Class private", "amber"],
    ["网页研究 Golden Test", "Evaluator", "适用于只读 BrowserView", "No network write", "blue"]
  ];
  results.forEach(([name, type, meta, env, tone], index) => {
    const y = 312 + index * 118;
    out += rect(532, y, 814, 96, t.surface2, 15, t.border);
    out += rect(552, y + 20, 50, 50, tone === "amber" ? palette.amberSoft : tone === "blue" ? palette.blueSoft : palette.limeSoft, 14);
    out += icon(type === "Capsule" ? "capsule" : type === "Evaluator" ? "run" : "project", 565, y + 33, 24, tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : t.accent);
    out += text(620, y + 34, name, 13, t.text, 700);
    out += text(620, y + 58, meta, 10, t.muted);
    out += pill(1138, y + 18, type, tone, t, 112);
    out += text(1324, y + 72, env, 9, t.faint, 500, "end");
  });
  return out + endSvg();
}

function renderInbox() {
  const t = light;
  let out = shell(t, "inbox", "待处理", "只显示需要你做决定或需要重新关注的事项", "web", [{ label: "6 items", tone: "amber", width: 88 }]);
  const groups = [
    ["需要确认", [
      ["预算工作流等待写入确认", "Task · 5 分钟前", "amber"],
      ["Prototype 环境请求网络权限", "Run · 18 分钟前", "red"]
    ]],
    ["项目协作", [
      ["Project 收到 Patch #18", "Review · 1 小时前", "blue"],
      ["中文插话分支等待合并", "Branch · 今天 11:26", "lime"]
    ]],
    ["环境与依赖", [
      ["Capsule 在 Windows 环境失败", "Failure · 昨天", "red"],
      ["验证环境将在 42 分钟后过期", "Environment · 现在", "amber"]
    ]]
  ];
  let yy = 150;
  groups.forEach(([group, items]) => {
    out += text(258, yy + 20, group, 14, t.text, 700);
    yy += 42;
    items.forEach(([titleValue, meta, tone]) => {
      out += rect(258, yy, 1114, 84, t.surface, 16, t.border, 1, 'filter="url(#shadow)"');
      const accent = tone === "red" ? palette.red : tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : t.accent;
      out += circle(292, yy + 42, 18, tone === "red" ? palette.redSoft : tone === "amber" ? palette.amberSoft : tone === "blue" ? palette.blueSoft : palette.limeSoft);
      out += icon(tone === "red" ? "shield" : tone === "amber" ? "pause" : tone === "blue" ? "project" : "check", 282, yy + 32, 20, accent);
      out += text(330, yy + 36, titleValue, 13, t.text, 650);
      out += text(330, yy + 59, meta, 10, t.muted);
      out += button(1218, yy + 22, "查看", t, tone === "amber" || tone === "red" ? "primary" : "secondary", 118);
      yy += 98;
    });
    yy += 22;
  });
  return out + endSvg();
}

function renderRegistry() {
  const t = dark;
  let out = shell(t, "registry", "Capsule Registry", "通过真实运行信号发现能力，而不是点赞和停留时长", "web", [
    { label: "Signed objects", tone: "lime", width: 128 },
    { label: "Private + Public", tone: "blue", width: 140 }
  ]);
  out += rect(258, 144, 1114, 82, t.surface, 18, t.border, 1, 'filter="url(#shadow)"');
  out += icon("search", 282, 172, 24, t.muted);
  out += text(324, 190, "按目标、环境、风险、版本或兼容性搜索", 12, t.faint);
  out += pill(1002, 170, "Windows", "neutral", t, 98);
  out += pill(1112, 170, "Low risk", "lime", t, 96);
  out += button(1220, 164, "搜索", t, "primary", 124);
  const items = [
    ["Research Sources", "v0.4", "87%", "BrowserView · Windows/macOS", "12 Evidence", "lime"],
    ["Session Summary", "v0.8", "96%", "Local · JSONL/SQLite", "28 Evidence", "blue"],
    ["Prototype Web Runner", "v0.2", "71%", "Ephemeral sandbox", "9 Evidence", "amber"]
  ];
  items.forEach(([name, version, success, env, evidence, tone], index) => {
    const y = 254 + index * 178;
    out += rect(258, y, 1114, 154, t.surface, 20, t.border, 1, 'filter="url(#shadow)"');
    out += rect(282, y + 26, 64, 64, tone === "amber" ? "rgba(243,184,63,.12)" : tone === "blue" ? "rgba(76,141,255,.12)" : "rgba(184,229,27,.12)", 18);
    out += icon("capsule", 300, y + 44, 28, tone === "amber" ? palette.amber : tone === "blue" ? palette.blue : t.accent);
    out += text(370, y + 48, name, 16, t.text, 720);
    out += text(370, y + 74, `${version} · ${env}`, 10, t.muted);
    out += pill(370, y + 94, "Signed", "lime", t, 90);
    out += text(868, y + 44, "真实成功率", 10, t.faint, 650);
    out += text(868, y + 75, success, 25, t.text, 760);
    out += text(1010, y + 44, "运行证据", 10, t.faint, 650);
    out += text(1010, y + 75, evidence, 12, t.text, 650);
    out += text(1160, y + 44, "权限", 10, t.faint, 650);
    out += pill(1160, y + 58, index === 2 ? "Medium" : "Low", index === 2 ? "amber" : "lime", t, 90);
    out += button(1210, y + 101, "查看", t, index === 0 ? "primary" : "secondary", 136);
  });
  out += rect(258, 802, 1114, 48, "rgba(76,141,255,.08)", 14, palette.blue, 1);
  out += text(282, 832, "排序信号：目标匹配 · 成功率 · 失败类型 · 适用环境 · Evidence 新鲜度 · 维护状态", 11, t.muted, 600);
  return out + endSvg();
}

const concepts = [
  ["00_设计系统/概念图/00_品牌与基础_浅色", () => renderFoundations(light, "Light")],
  ["00_设计系统/概念图/01_品牌与基础_深色", () => renderFoundations(dark, "Dark")],
  ["00_设计系统/概念图/02_组件与状态规范", renderComponents],
  ["00_设计系统/概念图/03_开发素材总览", renderAssetBoard],
  ["01_AI_Cursor/01_首次使用/01_首次启动与权限_浅色", () => renderOnboarding(light)],
  ["01_AI_Cursor/01_首次使用/02_对话入口选择_深色", () => renderConversation(dark)],
  ["01_AI_Cursor/02_工作台/01_工作台_深色", () => renderDashboard(dark)],
  ["01_AI_Cursor/02_工作台/02_工作台_浅色", () => renderDashboard(light)],
  ["01_AI_Cursor/03_运行时/01_运行时状态总览_深色", renderRuntimeStates],
  ["01_AI_Cursor/03_运行时/02_受监督任务工作区_深色", () => renderTaskWorkspace(dark)],
  ["01_AI_Cursor/03_运行时/03_动作确认与接管_深色", renderActionConfirmation],
  ["01_AI_Cursor/03_运行时/04_多任务工作区_浅色", renderMultiTask],
  ["01_AI_Cursor/04_Session/01_Session列表_浅色", () => renderSessions(light)],
  ["01_AI_Cursor/04_Session/02_Session详情与证据_浅色", renderSessionDetail],
  ["01_AI_Cursor/04_Session/03_Session分支图_深色", renderSessionGraph],
  ["01_AI_Cursor/04_Session/04_第二天恢复_浅色", renderResume],
  ["01_AI_Cursor/05_工作流模型设备/01_工作流库_浅色", renderWorkflows],
  ["01_AI_Cursor/05_工作流模型设备/02_工作流编辑器_浅色", renderWorkflowBuilder],
  ["01_AI_Cursor/05_工作流模型设备/03_模型中心_浅色", renderModelCenter],
  ["01_AI_Cursor/05_工作流模型设备/04_设备中心_浅色", renderDevices],
  ["01_AI_Cursor/06_设置/01_设置与隐私_浅色", renderSettings],
  ["02_Agentic_Web/01_Project/01_Project权威视图_浅色", renderProjectView],
  ["02_Agentic_Web/01_Project/02_Project运行验证_深色", renderRunValidate],
  ["02_Agentic_Web/01_Project/03_Capsule权限预览_浅色", renderCapsulePreview],
  ["02_Agentic_Web/02_协作与图谱/01_Forum事件流_浅色", renderForum],
  ["02_Agentic_Web/02_协作与图谱/02_Canvas知识图谱_深色", renderCanvas],
  ["02_Agentic_Web/02_协作与图谱/03_Diff审查_浅色", renderDiffReview],
  ["02_Agentic_Web/02_协作与图谱/04_高校AI专家与草稿_浅色", renderCampus],
  ["02_Agentic_Web/03_运行与发现/01_Explore搜索_浅色", renderExplore],
  ["02_Agentic_Web/03_运行与发现/02_Inbox待处理_浅色", renderInbox],
  ["02_Agentic_Web/03_运行与发现/03_Registry能力网络_深色", renderRegistry]
];

function writeAsset(relativePath, body) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
}

function iconSvg(type) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${icon(type, 0, 0, 24, "currentColor", 1.7)}</svg>`;
}

function generateAtomicAssets() {
  const icons = [
    "home",
    "workflow",
    "session",
    "graph",
    "model",
    "device",
    "settings",
    "shield",
    "brain",
    "notebook",
    "mic",
    "pause",
    "stop",
    "hand",
    "search",
    "project",
    "evidence",
    "run",
    "capsule",
    "forum",
    "inbox",
    "lock",
    "check",
    "plus"
  ];
  icons.forEach((name) => writeAsset(`00_设计系统/素材/图标/icon-${name}.svg`, iconSvg(name)));

  writeAsset(
    "00_设计系统/素材/品牌/logo-ai-cursor-mark.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="13" fill="#B8E51B"/><path d="M32 16a12 12 0 1 0 .5 18" fill="none" stroke="#0E1210" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="24" r="4" fill="#0E1210"/></svg>`
  );
  writeAsset(
    "00_设计系统/素材/品牌/logo-agentic-web-mark.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#111714" stroke="#B8E51B" stroke-width="2"/><circle cx="24" cy="24" r="5" fill="#B8E51B"/><circle cx="14" cy="14" r="3" fill="#B8E51B"/><circle cx="35" cy="15" r="3" fill="#B8E51B"/><circle cx="33" cy="35" r="3" fill="#B8E51B"/><path d="m18 18 3 3m7-1 5-4m-5 12 4 5" stroke="#B8E51B" stroke-width="2" stroke-linecap="round"/></svg>`
  );
  writeAsset(
    "00_设计系统/素材/背景/bg-runtime-grid-dark.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><radialGradient id="g"><stop stop-color="#B8E51B" stop-opacity=".12"/><stop offset="1" stop-color="#0E1210" stop-opacity="0"/></radialGradient><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#B8E51B" stroke-opacity=".06"/></pattern></defs><rect width="800" height="600" fill="#0E1210"/><rect width="800" height="600" fill="url(#p)"/><circle cx="400" cy="300" r="280" fill="url(#g)"/></svg>`
  );
  writeAsset(
    "00_设计系统/素材/背景/bg-project-network-light.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><pattern id="d" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#9FD000" fill-opacity=".14"/></pattern><radialGradient id="g"><stop stop-color="#EAF7C0" stop-opacity=".8"/><stop offset="1" stop-color="#F4F6F2" stop-opacity="0"/></radialGradient></defs><rect width="800" height="600" fill="#F4F6F2"/><rect width="800" height="600" fill="url(#d)"/><circle cx="400" cy="300" r="260" fill="url(#g)"/></svg>`
  );
  writeAsset(
    "00_设计系统/素材/背景/voice-waveform-listening.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 10 + 2}" y="${24 - (7 + ((i * 11) % 18)) / 2}" width="4" height="${7 + ((i * 11) % 18)}" rx="2" fill="#B8E51B"/>`).join("")}</svg>`
  );

  writeAsset(
    "00_设计系统/design-tokens.json",
    JSON.stringify(
      {
        version: "1.0.0",
        color: {
          brand: {
            50: "#F5FBE3",
            100: "#EAF7C0",
            200: "#D8EF8C",
            300: "#C4E652",
            400: "#B8E51B",
            500: "#9FD000",
            600: "#84AB00",
            700: "#657F12"
          },
          ink: {
            950: "#090D0B",
            900: "#0E1210",
            850: "#141916",
            800: "#1A201C",
            700: "#252D27",
            600: "#344038"
          },
          paper: {
            canvas: "#F4F6F2",
            surface: "#FFFFFF",
            elevated: "#F7F9F6"
          },
          semantic: {
            success: "#9FD000",
            warning: "#F3B83F",
            danger: "#F05F62",
            info: "#4C8DFF",
            experimental: "#9272F8"
          }
        },
        typography: {
          family: ["Inter", "PingFang SC", "Microsoft YaHei", "Segoe UI", "sans-serif"],
          pageTitle: { size: 28, weight: 750, lineHeight: 1.25 },
          sectionTitle: { size: 16, weight: 700, lineHeight: 1.35 },
          body: { size: 13, weight: 450, lineHeight: 1.55 },
          label: { size: 11, weight: 600, lineHeight: 1.35 }
        },
        spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
        radius: { control: 12, card: 18, panel: 22, modal: 24, capsule: 32 },
        motion: {
          fast: 120,
          standard: 180,
          slow: 320,
          reducedMotion: "no-looping-animation"
        }
      },
      null,
      2
    )
  );

  const manifestItems = [
    {
      name: "logo-ai-cursor-mark",
      path: "品牌/logo-ai-cursor-mark.svg",
      format: "svg",
      theme: "theme-free",
      role: "AI Cursor 品牌主标"
    },
    {
      name: "logo-agentic-web-mark",
      path: "品牌/logo-agentic-web-mark.svg",
      format: "svg",
      theme: "theme-free",
      role: "Agentic Web 项目网络标记"
    },
    ...icons.map((name) => ({
      name: `icon-${name}`,
      path: `图标/icon-${name}.svg`,
      format: "svg",
      theme: "currentColor",
      role: "24px 线性界面图标"
    })),
    {
      name: "bg-runtime-grid-dark",
      path: "背景/bg-runtime-grid-dark.svg",
      format: "svg",
      theme: "dark",
      role: "Runtime 与 Canvas 深色网格背景"
    },
    {
      name: "bg-project-network-light",
      path: "背景/bg-project-network-light.svg",
      format: "svg",
      theme: "light",
      role: "Project 与空态浅色点阵背景"
    },
    {
      name: "voice-waveform-listening",
      path: "背景/voice-waveform-listening.svg",
      format: "svg",
      theme: "theme-free",
      role: "静态 Listening 波形；动画由 CSS 实现"
    },
    {
      name: "agentic-project-network-dark",
      path: "插画/agentic-project-network-dark.png",
      format: "png",
      size: "1536x1024",
      theme: "dark",
      role: "Agentic Web Living Project Network 主视觉"
    },
    {
      name: "living-project-network-light",
      path: "插画/living-project-network-light.png",
      format: "png",
      size: "1536x1024",
      theme: "light",
      role: "Project、Explore 与空态主视觉"
    },
    {
      name: "safe-supervised-execution-dark",
      path: "插画/safe-supervised-execution-dark.png",
      format: "png",
      size: "1536x1024",
      theme: "dark",
      role: "安全监督、权限与接管说明"
    },
    {
      name: "conversation-entry-devices-dark",
      path: "插画/conversation-entry-devices-dark.png",
      format: "png",
      size: "1536x1024",
      theme: "dark",
      role: "对话入口与音频设备说明"
    }
  ];
  writeAsset(
    "00_设计系统/素材/_manifest.json",
    JSON.stringify(
      {
        version: "1.0.0",
        generatedAt: "2026-07-16",
        principles: [
          "界面图只用于设计沟通，不应被裁切为产品素材",
          "简单几何图标优先 SVG/currentColor",
          "栅格插画保留独立文件和明确主题",
          "高风险状态必须同时使用颜色、图标和文字"
        ],
        items: manifestItems
      },
      null,
      2
    )
  );
}

generateAtomicAssets();

for (const [relative, render] of concepts) {
  const svgPath = join(root, `${relative}.svg`);
  mkdirSync(dirname(svgPath), { recursive: true });
  writeFileSync(svgPath, render(), "utf8");
  console.log(`generated ${relative}.svg`);
}
