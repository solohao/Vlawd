import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";
import { useDensity } from "../providers/DensityProvider.js";
import type { Density } from "../tokens.js";
import { ChevronDown, ChevronUp } from "../../ui/icons.js";

interface TableContextValue {
  density: Density;
  hoverable: boolean;
  stripedRows: boolean;
  wrapLines: boolean;
  stickyHeader: boolean;
}

const TableContext = React.createContext<TableContextValue>({
  density: "default",
  hoverable: false,
  stripedRows: false,
  wrapLines: false,
  stickyHeader: false,
});

const useTableContext = () => React.useContext(TableContext);

const wrapperVariants = cva("", {
  variants: {
    variant: {
      container:
        "overflow-hidden rounded-2xl border border-slate-200 bg-white",
      stacked: "",
      embedded: "overflow-hidden rounded-2xl border border-slate-200 bg-white",
    },
    stickyHeader: {
      true: "overflow-auto max-h-[60vh]",
      false: "",
    },
  },
  defaultVariants: { variant: "stacked", stickyHeader: false },
});

const tableVariants = cva(
  "w-full caption-bottom border-collapse",
  {
    variants: {
      density: {
        compact: "text-xs",
        default: "text-[13px]",
        comfortable: "text-sm",
      },
      variant: {
        container: "",
        stacked: "",
        embedded: "",
      },
    },
    defaultVariants: { density: "default", variant: "stacked" },
  }
);

const rowVariants = cva(
  "border-b border-slate-100 transition-colors last:border-b-0",
  {
    variants: {
      hoverable: {
        true: "hover:bg-slate-50/60",
        false: "",
      },
      selected: {
        true: "bg-brand-50/40",
        false: "",
      },
      disabled: {
        true: "opacity-50 pointer-events-none",
        false: "",
      },
    },
    defaultVariants: { hoverable: false, selected: false, disabled: false },
  }
);

const headerVariants = cva(
  "whitespace-nowrap border-b border-slate-200 bg-slate-50/50 px-3 py-2 text-left font-semibold text-slate-500",
  {
    variants: {
      density: {
        compact: "px-2 py-1.5 text-[11px]",
        default: "px-3 py-2 text-[11.5px]",
        comfortable: "px-4 py-2.5 text-xs",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      },
      sortable: {
        true: "cursor-pointer select-none hover:text-slate-700",
        false: "",
      },
      sticky: {
        true: "sticky top-0 z-10",
        false: "",
      },
    },
    defaultVariants: { density: "default", align: "left", sortable: false, sticky: false },
  }
);

const cellVariants = cva(
  "px-3 py-2 align-middle text-slate-700",
  {
    variants: {
      density: {
        compact: "px-2 py-1.5 text-xs",
        default: "px-3 py-2 text-[13px]",
        comfortable: "px-4 py-2.5 text-sm",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      },
      wrapLines: {
        true: "",
        false: "whitespace-nowrap",
      },
      verticalAlign: {
        top: "align-top",
        middle: "align-middle",
        bottom: "align-bottom",
      },
    },
    defaultVariants: { density: "default", align: "left", wrapLines: false, verticalAlign: "middle" },
  }
);

export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  hoverable?: boolean;
  stripedRows?: boolean;
  wrapLines?: boolean;
  stickyHeader?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      density: densityProp,
      variant = "stacked",
      hoverable = false,
      stripedRows = false,
      wrapLines = false,
      stickyHeader = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const providerDensity = useDensity();
    const density = densityProp ?? providerDensity;
    return (
      <TableContext.Provider value={{ density, hoverable, stripedRows, wrapLines, stickyHeader }}>
        <div className={cn(wrapperVariants({ variant, stickyHeader }))}>
          <table
            ref={ref}
            className={cn(tableVariants({ density, variant }), className)}
            {...props}
          >
            {children}
          </table>
        </div>
      </TableContext.Provider>
    );
  }
);
Table.displayName = "Table";

export const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b-0", className)} {...props} />
));
TableHead.displayName = "TableHead";

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  empty?: React.ReactNode;
  emptyColSpan?: number;
  loading?: boolean;
  loadingRows?: number;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, empty, emptyColSpan = 99, loading, loadingRows = 5, children, ...props }, ref) => {
    const ctx = useTableContext();
    const childCount = React.Children.count(children);
    const showEmpty = childCount === 0 && empty && !loading;
    return (
      <tbody ref={ref} className={cn("[&_tr:last-child]:border-b-0", className)} {...props}>
        {loading ? (
          <>
            {Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-b-0">
                <td
                  colSpan={emptyColSpan}
                  className={cn(
                    "px-3 py-2",
                    cellVariants({ density: ctx.density, wrapLines: false })
                  )}
                >
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                </td>
              </tr>
            ))}
          </>
        ) : (
          children
        )}
        {showEmpty && (
          <tr>
            <td
              colSpan={emptyColSpan}
              className={cn(
                "px-3 py-6 text-center text-[13px] text-slate-400",
                cellVariants({ density: ctx.density, wrapLines: true })
              )}
            >
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    );
  }
);
TableBody.displayName = "TableBody";

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof rowVariants> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ hoverable, selected, disabled, className, ...props }, ref) => {
    const ctx = useTableContext();
    const isHoverable = hoverable ?? ctx.hoverable;
    const striped = !selected && ctx.stripedRows;
    return (
      <tr
        ref={ref}
        aria-selected={selected ? "true" : undefined}
        className={cn(
          rowVariants({ hoverable: isHoverable, selected, disabled }),
          striped && "even:bg-slate-50/40",
          className
        )}
        {...props}
      />
    );
  }
);
TableRow.displayName = "TableRow";

export interface TableHeaderProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "align">,
    VariantProps<typeof headerVariants> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | "none";
  onSort?: () => void;
  active?: boolean;
}

export const TableHeader = React.forwardRef<HTMLTableCellElement, TableHeaderProps>(
  (
    {
      align,
      sortable,
      sortDirection = "none",
      onSort,
      active,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { density, stickyHeader } = useTableContext();
    const ariaSort: React.AriaAttributes["aria-sort"] = sortable
      ? sortDirection === "asc"
        ? "ascending"
        : sortDirection === "desc"
          ? "descending"
          : "none"
      : undefined;
    const content = sortable ? (
      <button
        type="button"
        onClick={onSort}
        className="inline-flex w-full items-center gap-1 text-left"
      >
        <span className="flex-1">{children}</span>
        <SortIndicator direction={sortDirection} />
      </button>
    ) : (
      children
    );
    return (
      <th
        ref={ref}
        scope="col"
        aria-sort={ariaSort}
        className={cn(
          headerVariants({ density, align, sortable, sticky: stickyHeader }),
          active && "text-slate-900",
          className
        )}
        {...props}
      >
        {content}
      </th>
    );
  }
);
TableHeader.displayName = "TableHeader";

export interface TableCellProps
  extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, "align">,
    VariantProps<typeof cellVariants> {
  wrapLines?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ align, wrapLines: wrapLinesProp, verticalAlign, className, ...props }, ref) => {
    const { density, wrapLines: ctxWrapLines } = useTableContext();
    const wrapLines = wrapLinesProp ?? ctxWrapLines;
    return (
      <td
        ref={ref}
        className={cn(
          cellVariants({ density, align, wrapLines, verticalAlign }),
          className
        )}
        {...props}
      />
    );
  }
);
TableCell.displayName = "TableCell";

function SortIndicator({ direction }: { direction: "asc" | "desc" | "none" }) {
  if (direction === "asc") {
    return <ChevronUp width={12} className="shrink-0 text-slate-500" />;
  }
  if (direction === "desc") {
    return <ChevronDown width={12} className="shrink-0 text-slate-500" />;
  }
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-300">
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
}
