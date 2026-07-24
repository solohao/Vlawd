import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils.js";
import { useDensity, DensityProvider } from "../providers/DensityProvider.js";
import type { Density } from "../tokens.js";

const listVariants = cva("overflow-hidden rounded-xl border border-slate-200 bg-white", {
  variants: {
    density: {
      compact: "",
      default: "",
      comfortable: "",
    },
  },
  defaultVariants: { density: "default" },
});

export interface ListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listVariants> {
  density?: Density;
}

export function List({ density: densityProp, className, children, ...props }: ListProps) {
  const providerDensity = useDensity();
  const density = densityProp ?? providerDensity;

  const content = (
    <div
      role="list"
      className={cn(listVariants({ density }), className)}
      {...props}
    >
      {children}
    </div>
  );

  if (densityProp) {
    return <DensityProvider density={density}>{content}</DensityProvider>;
  }

  return content;
}
