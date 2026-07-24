# Spec: ListRow

```yaml
component: list-row
ds_version: "0.1.0"
status: AI-Ready
last_verified: 2026-07-24
required_aria:
  - role="button" when onClick is provided
semantic_parts:
  - root: 整行容器
  - leading: 左侧图标 / 单选 / 复选槽
  - content: 标题 + 描述主区域
  - title: 主标题
  - description: 辅助说明
  - trailing: 右侧状态、动作、chevron
token_contract:
  - density.compact
  - density.default
  - density.comfortable
  - colors.slate.100
  - colors.slate.500
  - colors.slate.700
  - colors.slate.900
  - colors.brand.50
  - colors.brand.200
  - colors.brand.400
  - borderRadius.xl
interaction_states:
  - default
  - interactive/hover
  - selected
checks:
  tokens_valid: true
  states_complete: true
  a11y_complete: true
sources:
  code: ../components/ListRow.tsx
  tokens: ../tokens.ts
  provider: ../providers/DensityProvider.tsx
```

## 用途

把「标题+描述两行、右侧留白」的堆叠卡片改成「三槽布局、右边缘锚定」的列表行。解决模型中心与首页配置行右侧空白、空间浪费的问题。

## 布局约定

```
┌─────────────────────────────────────────────────────────────┐
│ [leading]  [title          ]                  [trailing]    │
│            [description     ]                               │
└─────────────────────────────────────────────────────────────┘
```

- `leading` 固定宽度，居中对齐。
- `content` 占满剩余空间，标题和描述都 `truncate`。
- `trailing` 右对齐，可以放置状态 badge、时间、chevron。

## 用法

```tsx
<ListRow
  leading={<Radio checked={selected} />}
  title={
    <span className="flex items-center gap-2">
      均衡配置 {selected && <Badge size="sm">当前使用</Badge>}
    </span>
  }
  description="本地优先，兼顾速度与中文理解"
  trailing={<ChevronRight width={16} className="text-slate-400" />}
  onClick={() => onSelect("balanced")}
  selected={selected === "balanced"}
/>
```

## 注意

- 不要把过长的说明塞进 `description`；超过两行会自动截断（`line-clamp-2`）。
- 右侧不要留空；没有状态时放一个 chevron 或 `—` 占位。
