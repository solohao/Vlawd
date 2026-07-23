import * as React from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";

/**
 * Card 变体定义 - shadcn/ui 风格
 */
const cardVariants = cva(
  "rounded-2xl border bg-white transition-all duration-200",
  {
    variants: {
      variant: {
        // 默认卡片 - 微妙的阴影
        default: [
          "border-slate-200/60",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.02)]",
          "bg-white",
        ].join(" "),

        // 提升卡片 - 更明显的阴影
        elevated: [
          "border-slate-200/60",
          "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-1px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)]",
          "bg-white",
        ].join(" "),

        // 品牌卡片 - 渐变边框
        brand: [
          "border-brand-200/80",
          "bg-gradient-to-b from-brand-50/40 via-white to-white",
          "shadow-[0_1px_2px_rgba(163,209,0,0.08),0_0_0_1px_rgba(163,209,0,0.06)]",
        ].join(" "),

        // 轮廓卡片
        outline: [
          "border-slate-200",
          "shadow-none",
          "bg-white",
        ].join(" "),

        // 幽灵卡片 - 无边框
        ghost: [
          "border-transparent",
          "shadow-none",
          "bg-slate-50/50",
        ].join(" "),
      },
      hoverable: {
        true: [
          "cursor-pointer",
          "hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_6px_-1px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]",
          "hover:border-slate-300/80",
          "hover:-translate-y-0.5",
        ].join(" "),
        false: "",
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-5",
        xl: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      hoverable: false,
      padding: "md",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  animated?: boolean;
}

/**
 * Card 组件 - shadcn/ui 风格
 *
 * @example
 * <Card variant="default" padding="lg">
 *   <CardHeader>
 *     <CardTitle>标题</CardTitle>
 *     <CardDescription>描述</CardDescription>
 *   </CardHeader>
 *   <CardContent>内容</CardContent>
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hoverable, padding, animated = false, ...props }, ref) => {
    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(cardVariants({ variant, hoverable, padding, className }))}
          whileHover={hoverable ? { y: -2 } : undefined}
          transition={{ duration: 0.2, ease: "easeOut" }}
          {...(props as any)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, hoverable, padding, className }))}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

/**
 * CardHeader - 卡片头部
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/**
 * CardTitle - 卡片标题
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * CardDescription - 卡片描述
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * CardContent - 卡片内容
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

/**
 * CardFooter - 卡片页脚
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
