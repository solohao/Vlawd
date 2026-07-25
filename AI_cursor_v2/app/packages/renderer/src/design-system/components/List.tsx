import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";
import { useDensity, DensityProvider } from "../providers/DensityProvider.js";
import type { Density } from "../tokens.js";

const listVariants = cva("", {
  variants: {
    variant: {
      bordered: "overflow-hidden rounded-xl border border-slate-200 bg-white",
      flush: "",
      grouped: "space-y-2",
    },
    density: {
      compact: "",
      default: "",
      comfortable: "",
    },
  },
  defaultVariants: { variant: "bordered", density: "default" },
});

export interface ListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listVariants> {
  density?: Density;
  empty?: React.ReactNode;
}

export function List({
  density: densityProp,
  variant = "bordered",
  empty,
  className,
  children,
  ...props
}: ListProps) {
  const providerDensity = useDensity();
  const density = densityProp ?? providerDensity;
  const hasChildren = React.Children.count(children) > 0;

  const content = (
    <div
      role="list"
      className={cn(listVariants({ variant, density }), className)}
      {...props}
    >
      {hasChildren ? children : empty}
    </div>
  );

  if (densityProp) {
    return <DensityProvider density={density}>{content}</DensityProvider>;
  }

  return content;
}
