import { type ReactNode } from "react";
import { cn } from "../../design-system/index.js";

interface StoreTabProps {
  name: string;
  status: 'running' | 'stopped' | 'not-installed';
  active: boolean;
  modelCount: number;
  onClick: () => void;
}

export function StoreTab({ name, status, active, modelCount, onClick }: StoreTabProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-emerald-500';
      case 'stopped': return 'bg-amber-500';
      case 'not-installed': return 'bg-slate-300';
      default: return 'bg-slate-300';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running': return '运行中';
      case 'stopped': return '未启动';
      case 'not-installed': return '未安装';
      default: return '';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={status === 'not-installed'}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all",
        active
          ? "border-brand-300 bg-brand-50 text-brand-900"
          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        status === 'not-installed' && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor())} />
      <span>{name}</span>
      {modelCount > 0 && (
        <span className="text-[11px] text-slate-500">({modelCount})</span>
      )}
    </button>
  );
}

interface StoreTabGroupProps {
  children: ReactNode;
  label?: string;
}

export function StoreTabGroup({ children, label }: StoreTabGroupProps) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
      {label && (
        <span className="text-[12px] font-medium text-slate-700 shrink-0">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}
