---
component: table
ds_version: "0.2.0"
status: AI-Ready
last_verified: 2026-07-24

category: Layout / Data
required_aria: [role, scope]

semantic_parts:
  root: the table
  head: column headers
  body: data rows
  row: a data row
  header: a column header cell (th, scope=col)
  cell: a data cell (td)

token_contract:
  - density.compact
  - density.default
  - density.comfortable
  - colors.slate.100
  - colors.slate.200
  - colors.slate.500
  - colors.slate.700
  - colors.slate.50
  - colors.brand.50

interaction_states:
  - default
  - hover
  - selected

checks:
  aria_correct: true
  structure_correct: true
  states_complete: true
  tokens_valid: true
  no_invented_styles: true

sources:
  react:
    path: packages/renderer/src/design-system/components/Table.tsx
    exports: [Table, TableHead, TableBody, TableRow, TableHeader, TableCell]
---

# Spec: Table

Display structured records in rows and columns; the workhorse of a console. Use `Table` whenever the user needs to compare values across rows (configuration lists, capability overviews, plan rows, status lists).

## Token contract

| Token | Usage |
|---|---|
| `colors.slate.700` | body text |
| `colors.slate.500` | header text |
| `colors.slate.50` | header background |
| `colors.slate.100` / `colors.slate.200` | row / header borders |
| `colors.brand.50` | selected row background |

## Layout convention

```
┌──────────────┬──────────────────┬───────────────┬──────────────┐
│ 能力         │ 当前模型         │ 状态/推荐     │ 操作         │
├──────────────┼──────────────────┼───────────────┼──────────────┤
│ 听见你       │ Paraformer       │ 推荐          │              │
│ 理解与思考   │ Qwen2.5 3B       │ 推荐          │              │
│ 回应你       │ CosyVoice 2      │ 推荐          │              │
└──────────────┴──────────────────┴───────────────┴──────────────┘
```

- Keep headers on one line (`whitespace-nowrap`).
- Right-align status, counts, and actions with `align="right"`.
- Wrap `Table` in a rounded container if a visible panel border is needed.

## Usage

```tsx
<Table hoverable>
  <TableHead>
    <TableRow>
      <TableHeader>能力</TableHeader>
      <TableHeader>模型</TableHeader>
      <TableHeader align="right">状态</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow selected>
      <TableCell>听见你</TableCell>
      <TableCell>Paraformer 中文 v2</TableCell>
      <TableCell align="right"><Badge>推荐</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Do
- Use `Table` for repetitive, multi-attribute data.
- Pair with `DensityProvider density="compact"` for dense console interfaces.

## Don't
- Use `Table` as a page layout grid.
- Replace every `Card` with a `Table` if the content is a single object summary.
