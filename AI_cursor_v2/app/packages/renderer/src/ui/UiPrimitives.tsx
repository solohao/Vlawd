import type { ReactNode } from "react";

export function DemoBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${
        dark
          ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
          : "border-amber-300 bg-amber-50 text-amber-700"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      UI Demo · 未连接 Runtime
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  dark = false,
  action
}: {
  title: string;
  subtitle: string;
  dark?: boolean;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-6">
      <div>
        <h1 className={`text-[25px] font-bold ${dark ? "text-white" : "text-slate-900"}`}>{title}</h1>
        <p className={`mt-1.5 text-[13px] ${dark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
      </div>
      {action ?? <DemoBadge dark={dark} />}
    </header>
  );
}

export function ToneBadge({
  children,
  tone = "neutral",
  dark = false
}: {
  children: ReactNode;
  tone?: "brand" | "info" | "warning" | "danger" | "neutral";
  dark?: boolean;
}) {
  const tones = {
    brand: dark ? "bg-brand-400/12 text-brand-300" : "bg-brand-100 text-brand-700",
    info: dark ? "bg-blue-500/12 text-blue-300" : "bg-blue-50 text-blue-700",
    warning: dark ? "bg-amber-400/12 text-amber-300" : "bg-amber-50 text-amber-700",
    danger: dark ? "bg-rose-400/12 text-rose-300" : "bg-rose-50 text-rose-700",
    neutral: dark ? "bg-ink-700 text-slate-300" : "bg-slate-100 text-slate-600"
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  dark = false,
  action
}: {
  icon: ReactNode;
  title: string;
  description: string;
  dark?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={`grid min-h-[220px] place-items-center rounded-2xl border border-dashed p-8 text-center ${
        dark ? "border-ink-600 bg-ink-850/50" : "border-slate-300 bg-white/60"
      }`}
    >
      <div>
        <span
          className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${
            dark ? "bg-brand-400/10 text-brand-400" : "bg-brand-100 text-brand-700"
          }`}
        >
          {icon}
        </span>
        <p className={`mt-4 text-[14px] font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{title}</p>
        <p className={`mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed ${dark ? "text-slate-500" : "text-slate-500"}`}>
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
