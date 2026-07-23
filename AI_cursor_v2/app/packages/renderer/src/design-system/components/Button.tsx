import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";

/**
 * Button 变体定义 - shadcn/ui 风格
 */
const buttonVariants = cva(
  // 基础样式 - 更精美的效果
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // 默认按钮 - 带渐变和内阴影
        default: [
          "bg-slate-900 text-slate-50 shadow-sm",
          "hover:bg-slate-900/90",
          "active:scale-[0.98]",
        ].join(" "),

        // 品牌主按钮 - 精美的渐变效果
        primary: [
          "bg-gradient-to-b from-brand-500 to-brand-600 text-white",
          "shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_0_0_1px_rgba(0,0,0,0.1)_inset,0_8px_16px_-4px_rgba(101,127,18,0.4)]",
          "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_0_0_1px_rgba(0,0,0,0.1)_inset,0_12px_24px_-4px_rgba(101,127,18,0.5)]",
          "hover:from-brand-600 hover:to-brand-700",
          "active:scale-[0.98] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)_inset,0_2px_4px_rgba(0,0,0,0.1)]",
        ].join(" "),

        // 次要按钮 - 微妙的边框和阴影
        secondary: [
          "border border-slate-200 bg-white text-slate-900",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)]",
          "active:scale-[0.98]",
        ].join(" "),

        // 轮廓按钮
        outline: [
          "border-2 border-slate-200 bg-transparent",
          "hover:border-slate-300 hover:bg-slate-50",
          "active:scale-[0.98]",
        ].join(" "),

        // 幽灵按钮
        ghost: [
          "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
          "active:scale-[0.98]",
        ].join(" "),

        // 品牌幽灵按钮
        brandGhost: [
          "text-brand-700 hover:bg-brand-50 hover:text-brand-800",
          "active:scale-[0.98]",
        ].join(" "),

        // 语音按钮 - 特殊精美设计
        voice: [
          "h-[60px] border-2 border-brand-500 bg-white",
          "shadow-[0_0_0_4px_rgba(163,209,0,0.1),0_4px_24px_rgba(163,209,0,0.15)]",
          "hover:border-brand-600 hover:shadow-[0_0_0_6px_rgba(163,209,0,0.15),0_6px_32px_rgba(163,209,0,0.25)]",
          "active:scale-[0.98]",
        ].join(" "),

        // 链接样式
        link: "text-brand-700 underline-offset-4 hover:underline",

        // 危险按钮
        destructive: [
          "bg-red-500 text-white shadow-sm",
          "hover:bg-red-600",
          "active:scale-[0.98]",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  animated?: boolean;
  pulse?: boolean;
}

/**
 * Button 组件 - shadcn/ui 风格
 *
 * @example
 * <Button variant="primary" size="lg">保存</Button>
 * <Button variant="secondary">取消</Button>
 * <Button variant="voice" animated>开始对话</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, animated = true, pulse = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    if (animated) {
      const MotionButton = motion.button;
      return (
        <MotionButton
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          {...(props as any)}
        />
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
