---
component: list
ds_version: "0.2.0"
status: AI-Ready
last_verified: 2026-07-24

category: Layout
category_alias: 列表容器
required_aria: [role="list"]

semantic_parts:
  root: the list container
  item: a list row (usually `ListRow`)

token_contract:
  - borderRadius.xl
  - colors.slate.200
  - colors.white

interaction_states: [default]

checks:
  aria_correct: true
  structure_correct: true
  states_complete: true
  tokens_valid: true
  no_invented_styles: true

sources:
  react:
    path: packages/renderer/src/design-system/components/List.tsx
    exports: [List, ListProps]
---

# Spec: List

A lightweight container that wraps `ListRow` items with a rounded border. Use `List` when you have a group of homogenous list rows that need a shared surface, but not the vertical overhead of a `Card`.

## Token contract

| Token | Usage |
|---|---|
| `colors.slate.200` | container border |
| `colors.white` | container background |
| `borderRadius.xl` | container rounding |

## Usage

```tsx
<List>
  <ListRow leading={<Icon />} title="Item 1" trailing={<ChevronRight />} />
  <ListRow leading={<Icon />} title="Item 2" trailing={<ChevronRight />} />
</List>
```

## Do
- Use `List` for vertical stacks of selectable settings, recent items, or actions.
- Keep items parallel in structure.

## Don't
- Nest `Card`s inside `List`; `List` itself is the surface.
- Use `List` when data has multiple columns that need alignment — use `Table` instead.
