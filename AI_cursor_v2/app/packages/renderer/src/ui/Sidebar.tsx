import { BrandLogo } from "./Brand.js";
import {
  ChevronDown,
  CloseIcon,
  GridIcon,
  HomeIcon,
  ListIcon,
  NodesIcon,
  SettingsIcon,
  WorkflowIcon
} from "./icons.js";
import { navItems } from "./demo-data.js";

const iconMap = {
  home: HomeIcon,
  workflow: WorkflowIcon,
  list: ListIcon,
  grid: GridIcon,
  nodes: NodesIcon,
  settings: SettingsIcon
};

interface SidebarProps {
  theme: "dark" | "light";
  activeNav: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ theme, activeNav, onNavigate }: SidebarProps) {
  const dark = theme === "dark";
  const shell = dark
    ? "bg-ink-950 border-ink-700/70"
    : "bg-white border-slate-200/80";
  const idle = dark
    ? "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800";
  const active = dark
    ? "bg-ink-800 text-white"
    : "bg-brand-400/15 text-brand-700";
  const footerText = dark ? "text-slate-600" : "text-slate-400";

  return (
    <aside className={`flex h-full w-[248px] shrink-0 flex-col border-r ${shell}`}>
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <BrandLogo theme={theme} />
        <button className={`grid h-7 w-7 place-items-center rounded-lg ${idle}`} aria-label="collapse">
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                isActive ? active : idle
              }`}
            >
              <Icon width={18} height={18} />
              <span>{item.label}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <button
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${
            dark ? "bg-ink-800/80" : "bg-slate-100"
          }`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-400 text-[12px] font-bold text-ink-900">
            Lin
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className={`text-[13px] font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
              Lin
            </span>
            <span className="text-[11px] text-brand-500">Pro Plan</span>
          </span>
          <ChevronDown className={`ml-auto ${dark ? "text-slate-500" : "text-slate-400"}`} />
        </button>
        <p className={`px-2 pt-3 text-[10.5px] ${footerText}`}>AI Cursor Desktop Employee</p>
      </div>
    </aside>
  );
}
