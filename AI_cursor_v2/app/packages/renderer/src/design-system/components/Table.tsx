import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";
import { useDensity } from "../providers/DensityProvider.js";
import type { Density } from "../tokens.js";

interface TableContextValue {
  density: Density;
  hoverable: boolean;
}

const TableContext = React.createContext<TableContextValue>({
  density: "default",
  hoverable: false,
});

const useTableContext = () => React.useContext(TableContext);

const tableVariants = cva("w-full caption-bottom border-collapse", {
  variants: {
    density: {
      compact: "text-xs",
      default: "text-[13px]",
      comfortable: "text-sm",
    },
  },
  defaultVariants: { density: "default" },
});

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
    },
    defaultVariants: { hoverable: false, selected: false },
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
    },
    defaultVariants: { density: "default", align: "left" },
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
    },
    defaultVariants: { density: "default", align: "left" },
  }
);

export interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  hoverable?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ density: densityProp, hoverable = false, className, children, ...props }, ref) => {
    const providerDensity = useDensity();
    const density = densityProp ?? providerDensity;
    return (
      <TableContext.Provider value={{ density, hoverable }}>
        <table ref={ref} className={cn(tableVariants({ density }), className)} {...props}>
          {children}
        </table>
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

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-b-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof rowVariants> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ hoverable, selected, className, ...props }, ref) => {
    const ctx = useTableContext();
    return (
      <tr
        ref={ref}
        className={cn(rowVariants({ hoverable: hoverable ?? ctx.hoverable, selected }), className)}
        {...props}
      />
    );
  }
);
TableRow.displayName = "TableRow";

export interface TableHeaderProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "align">,
    VariantProps<typeof headerVariants> {}

export const TableHeader = React.forwardRef<HTMLTableCellElement, TableHeaderProps>(
  ({ align, className, ...props }, ref) => {
    const { density } = useTableContext();
    return (
      <th
        ref={ref}
        scope="col"
        className={cn(headerVariants({ density, align }), className)}
        {...props}
      />
    );
  }
);
TableHeader.displayName = "TableHeader";

export interface TableCellProps
  extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, "align">,
    VariantProps<typeof cellVariants> {}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ align, className, ...props }, ref) => {
    const { density } = useTableContext();
    return (
      <td
        ref={ref}
        className={cn(cellVariants({ density, align }), className)}
        {...props}
      />
    );
  }
);
TableCell.displayName = "TableCell";
