# Spec: DensityProvider

> 机器可读契约（参照 Clementine DS / useVyre 的 agentic spec 格式）。

```yaml
component: density-provider
ds_version: "0.1.0"
status: AI-Ready
last_verified: 2026-07-24
required_aria: []
semantic_parts:
  - root: 包裹页面/区域，向子组件提供当前密度模式
interaction_states: []
token_contract:
  - density.compact
  - density.default
  - density.comfortable
checks:
  tokens_valid: true
  states_complete: true
  a11y_complete: true
sources:
  code: ../providers/DensityProvider.tsx
  tokens: ../tokens.ts
```

## 用途

为 `ListRow` / `KeyValueRow` 等布局原语提供统一的密度上下文，避免每个组件都传 `density` prop。

## 用法

```tsx
import { DensityProvider } from "@/design-system";

<DensityProvider density="compact">
  <ModelCenterPage />
</DensityProvider>
```

## 密度定义

| 模式 | padding | gap | 正文字号 | 用途 |
|------|---------|-----|----------|------|
| compact | 10px | 8px | 12px | 信息密集的管理后台、模型中心 |
| default | 14px | 10px | 13px | 常规页面 |
| comfortable | 18px | 14px | 15px | 营销/展示页 |
