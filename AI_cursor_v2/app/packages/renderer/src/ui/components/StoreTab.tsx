import { type ReactNode } from "react";
import { cn, Button, StatusDot, Badge } from "../../design-system/index.js";

interface StoreTabProps {
  name: string;
  status: 'running' | 'stopped' | 'not-installed';
  active: boolean;
  modelCount: number;
  onClick: () => void;
}

export function StoreTab({ name, status, active, modelCount, onClick }: StoreTabProps) {
  const getStatusColor = (): 'success' | 'warning' | 'neutral' => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'warning';
      case 'not-installed': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={status === 'not-installed'}
      className={cn(
        "gap-2 h-8",
        active && "bg-brand-50 text-brand-900 border-brand-200"
      )}
    >
      <StatusDot
        color={getStatusColor()}
        active={status === 'running'}
        size="sm"
      />
      <span>{name}</span>
      {modelCount > 0 && (
        <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
          {modelCount}
        </Badge>
      )}
    </Button>
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
