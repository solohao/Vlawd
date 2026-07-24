import { BrandLogo } from "./Brand.js";
import {
  ChevronDown,
  GridIcon,
  HeadphonesIcon,
  HomeIcon,
  ListIcon,
  MonitorIcon,
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
  monitor: MonitorIcon,
  headphones: HeadphonesIcon,
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
    : "bg-[linear-gradient(90deg,rgba(234,247,192,.78),rgba(245,251,227,.55))] text-brand-700 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-600";
  const footerText = dark ? "text-slate-600" : "text-slate-400";

  return (
    <aside className={`flex h-full w-[216px] shrink-0 flex-col border-r ${shell}`}>
      <div className="flex items-center px-6 pb-7 pt-7">
        <BrandLogo theme={theme} />
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-4">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex h-10 items-center gap-3 rounded-md px-3.5 text-[12.5px] font-medium outline-none transition-[background-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-brand-400/50 ${
                isActive ? active : idle
              }`}
            >
              <Icon width={18} height={18} />
              <span>{item.label}</span>
              {item.badge && !isActive && (
                <span className="ml-auto rounded-md bg-brand-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-brand-500">
                  {item.badge}
                </span>
              )}

            </button>
          );
        })}
      </nav>

      <div className="px-4 pb-4">
        <button
          className={`flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left outline-none transition hover:border-slate-200 focus-visible:ring-2 focus-visible:ring-brand-400/50 ${
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
            <span className="text-[11px] text-slate-400">Pro Plan</span>
          </span>
          <ChevronDown className={`ml-auto ${dark ? "text-slate-500" : "text-slate-400"}`} />
        </button>
        <p className={`px-2 pt-3 text-[10.5px] ${footerText}`}>AI Cursor Desktop Employee</p>
      </div>
    </aside>
  );
}
