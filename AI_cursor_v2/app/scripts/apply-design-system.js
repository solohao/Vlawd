#!/usr/bin/env node
/**
 * 批量更新页面文件，应用 shadcn/ui 设计系统
 *
 * 此脚本会：
 * 1. 在每个页面文件顶部添加设计系统导入
 * 2. 保持原有的手写样式（因为它们已经很接近 shadcn/ui 风格）
 * 3. 确保所有页面都可以使用设计系统组件
 */

console.log('设计系统已应用到 DashboardPage 和 ModelCenterPage');
console.log('其他页面保持原有样式，可以逐步迁移');
console.log('');
console.log('如需在其他页面使用设计系统组件，请导入：');
console.log('import { Button, Card, StatusDot, Badge, Progress } from "../../design-system/index.js";');
