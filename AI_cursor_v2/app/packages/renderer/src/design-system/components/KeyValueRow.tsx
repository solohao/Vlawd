import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";
import { useDensity } from "../providers/DensityProvider.js";

/**
 * KeyValueRow - 键值对行组件
 *
 * 左：icon + label；右：value；下方：description。
 * 用右对齐的 value 把原本浪费的右边缘利用起来，同时用较短的描述控制行数。
 */

const rowVariants = cva(
  "grid items-baseline border-b border-slate-100 last:border-b-0 transition-colors",
  {
    variants: {
      density: {
        compact: "gap-x-2 gap-y-0.5 py-2",
        default: "gap-x-3 gap-y-1 py-2.5",
        comfortable: "gap-x-3 gap-y-1.5 py-3",
      },
      columns: {
        value: "grid-cols-[auto_1fr_auto]",
        noValue: "grid-cols-[auto_1fr]",
      },
    },
    defaultVariants: {
      density: "default",
      columns: "value",
    },
  }
);

const labelVariants = cva("flex items-center gap-2 font-semibold text-slate-700 truncate", {
  variants: {
    density: {
      compact: "text-xs",
      default: "text-[12.5px]",
      comfortable: "text-sm",
    },
  },
  defaultVariants: { density: "default" },
});

const valueVariants = cva("text-right font-medium text-slate-800 truncate", {
  variants: {
    density: {
      compact: "text-[11px]",
      default: "text-xs",
      comfortable: "text-[13px]",
    },
  },
  defaultVariants: { density: "default" },
});

const descriptionVariants = cva("text-slate-500 line-clamp-2", {
  variants: {
    density: {
      compact: "text-[11px] leading-tight",
      default: "text-[11.5px] leading-relaxed",
      comfortable: "text-xs leading-relaxed",
    },
  },
  defaultVariants: { density: "default" },
});

export interface KeyValueRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof rowVariants> {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value?: React.ReactNode;
  description?: React.ReactNode;
}

export function KeyValueRow({
  className,
  icon,
  label,
  value,
  description,
  ...props
}: KeyValueRowProps) {
  const density = useDensity();
  return (
    <div
      className={cn(rowVariants({ density, columns: value ? "value" : "noValue" }), className)}
      {...props}
    >
      <div className={cn(labelVariants({ density }))}>
        {icon && <span className="flex shrink-0 items-center justify-center text-slate-500">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {value && <div className={cn(valueVariants({ density }))}>{value}</div>}
      {description && (
        <div
          className={cn(
            descriptionVariants({ density }),
            value ? "col-span-full" : "col-start-2"
          )}
        >
          {description}
        </div>
      )}
    </div>
  );
}
