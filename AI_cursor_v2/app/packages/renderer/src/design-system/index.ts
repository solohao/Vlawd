/**
 * Design System - 设计系统统一导出
 *
 * 使用方式：
 * import { Button, Card, StatusDot, tokens } from '@/design-system'
 */

// Design Tokens
export { tokens } from "./tokens.js";
export type { Tokens, ColorScale, Density } from "./tokens.js";

// Density
export { DensityProvider, useDensity } from "./providers/DensityProvider.js";
export type { DensityProviderProps } from "./providers/DensityProvider.js";

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

// Layout primitives
export { ListRow } from "./components/ListRow.js";
export type { ListRowProps } from "./components/ListRow.js";

export { List } from "./components/List.js";
export type { ListProps } from "./components/List.js";

export { KeyValueRow } from "./components/KeyValueRow.js";
export type { KeyValueRowProps } from "./components/KeyValueRow.js";

export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "./components/Table.js";
export type {
  TableProps,
  TableRowProps,
  TableHeaderProps,
  TableCellProps,
} from "./components/Table.js";
