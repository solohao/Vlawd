import * as React from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";

/**
 * StatusDot - 状态指示点 - shadcn/ui 风格
 */
export interface StatusDotProps {
  active?: boolean;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "brand" | "success" | "warning" | "error" | "neutral";
  className?: string;
}

const colorMap = {
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  neutral: "bg-slate-300",
};

const sizeMap = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

export function StatusDot({
  active = false,
  pulse = false,
  size = "md",
  color = "brand",
  className,
}: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      {pulse && active && (
        <motion.span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            colorMap[color]
          )}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.75, 0, 0.75],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          sizeMap[size],
          active ? colorMap[color] : colorMap.neutral,
          active && "shadow-[0_0_6px_rgba(0,0,0,0.2)]"
        )}
      />
    </span>
  );
}

/**
 * Badge - 徽章组件 - shadcn/ui 风格
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: [
          "border-transparent bg-slate-900 text-slate-50",
          "shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
          "hover:bg-slate-900/80",
        ].join(" "),
        brand: [
          "border-transparent bg-brand-500 text-white",
          "shadow-[0_1px_2px_rgba(163,209,0,0.2)]",
          "hover:bg-brand-600",
        ].join(" "),
        success: [
          "border-transparent bg-emerald-500 text-white",
          "shadow-[0_1px_2px_rgba(16,185,129,0.2)]",
          "hover:bg-emerald-600",
        ].join(" "),
        warning: [
          "border-transparent bg-amber-500 text-white",
          "shadow-[0_1px_2px_rgba(245,158,11,0.2)]",
          "hover:bg-amber-600",
        ].join(" "),
        error: [
          "border-transparent bg-rose-500 text-white",
          "shadow-[0_1px_2px_rgba(239,68,68,0.2)]",
          "hover:bg-rose-600",
        ].join(" "),
        secondary: [
          "border-slate-200 bg-slate-100 text-slate-900",
          "shadow-[0_1px_1px_rgba(0,0,0,0.03)]",
          "hover:bg-slate-200",
        ].join(" "),
        outline: [
          "border-slate-200 text-slate-900",
          "shadow-[0_1px_1px_rgba(0,0,0,0.03)]",
          "hover:bg-slate-50",
        ].join(" "),
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

/**
 * Progress - 进度条 - shadcn/ui 风格
 */
export interface ProgressProps {
  value: number;
  max?: number;
  color?: "brand" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

const progressColorMap = {
  brand: [
    "bg-gradient-to-r from-brand-500 to-brand-600",
    "shadow-[0_0_8px_rgba(163,209,0,0.3)]",
  ].join(" "),
  success: [
    "bg-gradient-to-r from-emerald-500 to-emerald-600",
    "shadow-[0_0_8px_rgba(16,185,129,0.3)]",
  ].join(" "),
  warning: [
    "bg-gradient-to-r from-amber-500 to-amber-600",
    "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
  ].join(" "),
  error: [
    "bg-gradient-to-r from-rose-500 to-rose-600",
    "shadow-[0_0_8px_rgba(239,68,68,0.3)]",
  ].join(" "),
};

const progressSizeMap = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-2.5",
};

export function Progress({
  value,
  max = 100,
  color = "brand",
  size = "md",
  animated = true,
  showLabel = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn(
        "overflow-hidden rounded-full bg-slate-100",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]",
        progressSizeMap[size]
      )}>
        {animated ? (
          <motion.div
            className={cn("h-full rounded-full", progressColorMap[color])}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        ) : (
          <div
            className={cn("h-full rounded-full", progressColorMap[color])}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      {showLabel && (
        <p className="mt-1.5 text-xs font-medium text-slate-500">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}

/**
 * Skeleton - 骨架屏加载组件 - shadcn/ui 风格
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  animated?: boolean;
}

export function Skeleton({
  variant = "rectangular",
  animated = true,
  className,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4 w-full",
    circular: "h-12 w-12 rounded-full",
    rectangular: "h-12 w-full rounded-lg",
  };

  return (
    <div
      className={cn(
        "bg-slate-200",
        variantClasses[variant],
        animated && "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

/**
 * Separator - 分割线 - shadcn/ui 风格
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export function Separator({
  orientation = "horizontal",
  decorative = false,
  className,
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-slate-200",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  );
}

/**
 * Divider - 带文字的分割线
 */
export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Divider({
  orientation = "horizontal",
  className,
  children,
  ...props
}: DividerProps) {
  if (children) {
    return (
      <div className={cn("relative", className)} {...props}>
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-500">{children}</span>
        </div>
      </div>
    );
  }

  return <Separator orientation={orientation} className={className} {...props} />;
}
