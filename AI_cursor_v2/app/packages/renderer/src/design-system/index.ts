/**
 * Design System - 设计系统统一导出
 *
 * 使用方式：
 * import { Button, Card, StatusDot, tokens } from '@/design-system'
 */

// Design Tokens
export { tokens } from "./tokens.js";
export type { Tokens, ColorScale } from "./tokens.js";

// Utilities
export { cn, cva } from "./utils.js";
export type { VariantProps } from "./utils.js";

// Components
export { Button, buttonVariants } from "./components/Button.js";
export type { ButtonProps } from "./components/Button.js";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
} from "./components/Card.js";
export type { CardProps } from "./components/Card.js";

export {
  StatusDot,
  Badge,
  Progress,
  Skeleton,
  Divider,
} from "./components/Indicators.js";
export type {
  StatusDotProps,
  BadgeProps,
  ProgressProps,
  SkeletonProps,
  DividerProps,
} from "./components/Indicators.js";
