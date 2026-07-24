import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind 类名，自动处理冲突
 * 例如：cn("px-2 py-1", "px-4") => "py-1 px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 创建变体样式的辅助函数
 * 用于创建带有多种变体的组件样式
 */
export { cva, type VariantProps } from "class-variance-authority";
