# Design System 设计系统

## 概述

这是 AI Cursor V2 的统一设计系统，包含所有 UI 组件、设计规范（Design Tokens）和工具函数。

## 特性

- ✅ **统一的 Design Tokens** - 颜色、间距、字体、阴影等统一管理
- ✅ **高质量组件** - 基于 Radix UI 和 Framer Motion
- ✅ **完整的 TypeScript 支持** - 类型安全
- ✅ **动画支持** - 流畅的交互动画
- ✅ **可访问性** - 遵循 WAI-ARIA 标准
- ✅ **响应式设计** - 适配不同屏幕尺寸

## 技术栈

- **Tailwind CSS** - 样式框架
- **Framer Motion** - 动画库
- **Radix UI** - 无样式组件原语
- **class-variance-authority** - 变体管理
- **TypeScript** - 类型安全

## 使用方式

### 导入组件

```typescript
import { Button, Card, StatusDot, tokens } from '@/design-system';
```

### 基础组件示例

#### Button 按钮

```tsx
// 主要按钮
<Button variant="primary" size="md">
  确认
</Button>

// 次要按钮
<Button variant="secondary" size="sm">
  取消
</Button>

// 幽灵按钮
<Button variant="ghost">
  了解更多
</Button>

// 带动画的按钮
<Button variant="primary" animated pulse>
  开始语音对话
</Button>

// 语音专用按钮
<Button variant="voice" size="xl" animated>
  <MicIcon />
  开始语音对话
</Button>
```

#### Card 卡片

```tsx
<Card variant="default" padding="lg" hoverable animated>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
    <CardDescription>这是卡片的描述文字</CardDescription>
  </CardHeader>
  <CardContent>
    <p>卡片内容</p>
  </CardContent>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>

// 品牌风格卡片
<Card variant="brand" padding="md">
  <p>品牌风格的卡片</p>
</Card>
```

#### StatusDot 状态指示器

```tsx
// 基础用法
<StatusDot active />

// 带脉冲动画
<StatusDot active pulse color="brand" />

// 不同颜色
<StatusDot active color="success" />
<StatusDot active color="warning" />
<StatusDot active color="error" />

// 不同尺寸
<StatusDot active size="sm" />
<StatusDot active size="md" />
<StatusDot active size="lg" />
```

#### Badge 徽章

```tsx
<Badge variant="brand">推荐</Badge>
<Badge variant="success">已完成</Badge>
<Badge variant="warning">进行中</Badge>
<Badge variant="error">失败</Badge>
```

#### Progress 进度条

```tsx
<Progress value={45} max={100} color="brand" animated showLabel />
<Progress value={75} color="success" size="sm" />
```

### 使用 Design Tokens

```tsx
import { tokens } from '@/design-system';

// 使用颜色
<div style={{ color: tokens.colors.brand[600] }}>
  品牌色文字
</div>

// 使用间距
<div style={{ padding: tokens.spacing[4] }}>
  内容
</div>

// 使用阴影
<div style={{ boxShadow: tokens.shadows.brand.DEFAULT }}>
  带阴影的卡片
</div>
```

### 使用工具函数

```tsx
import { cn } from '@/design-system';

// 合并类名，自动处理冲突
<div className={cn(
  "px-2 py-1",
  isActive && "bg-brand-500",
  "px-4" // 会覆盖前面的 px-2
)}>
  内容
</div>
```

## 组件列表

### 已实现组件

- **Button** - 按钮（支持多种变体和动画）
- **Card** - 卡片容器
- **StatusDot** - 状态指示点
- **Badge** - 徽章标签
- **Progress** - 进度条
- **Skeleton** - 骨架屏
- **Divider** - 分割线

### 计划中组件

- **Input** - 输入框
- **Select** - 下拉选择
- **Dialog** - 对话框
- **Tooltip** - 提示框
- **Tabs** - 标签页
- **Toast** - 通知提示

## Design Tokens 规范

### 颜色系统

```typescript
tokens.colors.brand[500]    // 主品牌色
tokens.colors.slate[600]    // 中性灰
tokens.colors.semantic      // 语义色（成功、警告、错误）
```

### 间距系统

基于 4px 网格系统：
- `tokens.spacing[1]` = 4px
- `tokens.spacing[2]` = 8px
- `tokens.spacing[4]` = 16px
- `tokens.spacing[8]` = 32px

### 字体系统

```typescript
tokens.typography.fontSize.sm    // 14px
tokens.typography.fontSize.base  // 16px
tokens.typography.fontWeight.semibold  // 600
```

### 阴影系统

```typescript
tokens.shadows.DEFAULT       // 标准阴影
tokens.shadows.brand.DEFAULT // 品牌色阴影
```

## 动画规范

所有动画使用 Framer Motion：

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  内容
</motion.div>
```

## 最佳实践

1. **统一使用设计系统组件** - 避免自定义样式
2. **使用 Design Tokens** - 不要硬编码颜色、间距等
3. **保持一致性** - 相同功能使用相同组件
4. **优先考虑可访问性** - 使用语义化 HTML 和 ARIA 属性
5. **性能优化** - 适度使用动画，避免过度渲染

## 扩展组件

如果需要添加新组件：

1. 在 `components/` 目录下创建新文件
2. 使用 `cva` 定义变体
3. 使用 `cn` 合并类名
4. 导出到 `index.ts`
5. 更新此 README

## 维护

- 所有组件都应该有 TypeScript 类型定义
- 组件应该支持 `className` prop 以允许样式覆盖
- 使用 `forwardRef` 支持 ref 传递
- 添加清晰的 JSDoc 注释
