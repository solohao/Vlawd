import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";
import { useDensity } from "../providers/DensityProvider.js";

/**
 * ListRow - 列表行组件
 *
 * 三槽布局：leading（图标/复选） + content（title + description） + trailing（状态/动作）。
 * 参考 Cloudscape 的列表/卡片行风格：清晰的 hover/focus/selected/disabled 状态，
 * 以及可控的密度（compact/default/comfortable）。
 */

const listRowVariants = cva(
  "flex w-full items-center text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset",
  {
    variants: {
      density: {
        compact: "gap-2 py-2",
        default: "gap-2.5 py-2.5",
        comfortable: "gap-3 py-3",
      },
      interactive: {
        true: "cursor-pointer hover:bg-slate-50/60",
        false: "",
      },
      selected: {
        true: "border-b-0 border-transparent bg-brand-50/40 ring-1 ring-brand-200 rounded-xl",
        false: "",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed pointer-events-none",
        false: "",
      },
      flush: {
        true: "border-b border-slate-100 last:border-b-0",
        false: "",
      },
    },
    defaultVariants: {
      density: "default",
      interactive: false,
      selected: false,
      disabled: false,
      flush: false,
    },
  }
);

const leadingVariants = cva("flex shrink-0 items-center justify-center text-slate-500", {
  variants: {
    density: {
      compact: "w-6",
      default: "w-7",
      comfortable: "w-8",
    },
  },
  defaultVariants: { density: "default" },
});

const titleVariants = cva("font-semibold text-slate-900", {
  variants: {
    density: {
      compact: "text-xs",
      default: "text-[13px]",
      comfortable: "text-sm",
    },
    wrap: {
      true: "",
      false: "truncate",
    },
  },
  defaultVariants: { density: "default", wrap: false },
});

const descriptionVariants = cva("text-slate-500", {
  variants: {
    density: {
      compact: "text-[11px]",
      default: "text-[11.5px]",
      comfortable: "text-xs",
    },
    wrap: {
      true: "",
      false: "truncate",
    },
  },
  defaultVariants: { density: "default", wrap: false },
});

const trailingVariants = cva("flex shrink-0 flex-col items-end justify-center text-slate-500", {
  variants: {
    density: {
      compact: "text-xs gap-0.5",
      default: "text-xs gap-1",
      comfortable: "text-sm gap-1",
    },
  },
  defaultVariants: { density: "default" },
});

export interface ListRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof listRowVariants> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  trailing?: React.ReactNode;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
}

export function ListRow({
  className,
  leading,
  title,
  description,
  trailing,
  interactive,
  selected,
  disabled,
  flush,
  wrapTitle,
  wrapDescription,
  ...props
}: ListRowProps) {
  const density = useDensity();
  const isInteractive = interactive ?? !!props.onClick;
  return (
    <div
      role={props.onClick ? "button" : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      className={cn(
        listRowVariants({ density, interactive: isInteractive, selected, disabled, flush }),
        className
      )}
      {...props}
    >
      {leading && <div className={cn(leadingVariants({ density }))}>{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className={cn(titleVariants({ density, wrap: wrapTitle }))}>{title}</div>
        {description && <div className={cn(descriptionVariants({ density, wrap: wrapDescription }))}>{description}</div>}
      </div>
      {trailing && <div className={cn(trailingVariants({ density }))}>{trailing}</div>}
    </div>
  );
}
