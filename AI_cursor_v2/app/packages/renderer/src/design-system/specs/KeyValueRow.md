# Spec: KeyValueRow

```yaml
component: key-value-row
ds_version: "0.1.0"
status: AI-Ready
last_verified: 2026-07-24
required_aria: []
semantic_parts:
  - root: 整行容器
  - icon: 左侧图标槽
  - label: 属性名
  - value: 右对齐属性值
  - description: 占满第二行的长说明
token_contract:
  - density.compact
  - density.default
  - density.comfortable
  - colors.slate.100
  - colors.slate.500
  - colors.slate.700
  - colors.slate.800
interaction_states: []
checks:
  tokens_valid: true
  states_complete: true
  a11y_complete: true
sources:
  code: ../components/KeyValueRow.tsx
  tokens: ../tokens.ts
  provider: ../providers/DensityProvider.tsx
```

## 用途

用于「关于当前配置」「状态摘要」等场景：左 label、右短 value、下方 description。用 CSS Grid 保证右边缘对齐，避免右侧大段空白。

## 布局约定

```
┌─────────────────────────────────────────────────────────────┐
│ [icon] [label            ]            [value]               │
│        [description ...................................]   │
└─────────────────────────────────────────────────────────────┘
```

- 第一行三列：`auto 1fr auto`。
- `value` 缺失时改为 `auto 1fr`，description 从第二列开始。
- description 使用 `line-clamp-2` 截断，避免冗长。

## 用法

```tsx
<KeyValueRow
  icon={<BoltIcon width={16} />}
  label="性能"
  value="平衡"
  description="本地优先，若设备显存不足会自动切换为云端兜底。"
/>
```
