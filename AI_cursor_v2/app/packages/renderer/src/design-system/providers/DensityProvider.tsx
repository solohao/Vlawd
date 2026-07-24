import * as React from "react";
import type { Density } from "../tokens.js";

const DensityContext = React.createContext<Density>("default");

export interface DensityProviderProps {
  density?: Density;
  children: React.ReactNode;
}

/**
 * DensityProvider - 密度模式上下文
 *
 * 为页面或区域统一设置内容密度（compact / default / comfortable）。
 * 子组件通过 useDensity() 读取当前密度并自动调整 padding、间距、字号。
 *
 * @example
 * <DensityProvider density="compact">
 *   <ListRow title="..." />
 * </DensityProvider>
 */
export function DensityProvider({ density = "default", children }: DensityProviderProps) {
  return <DensityContext.Provider value={density}>{children}</DensityContext.Provider>;
}

export function useDensity(): Density {
  const density = React.useContext(DensityContext);
  return density ?? "default";
}
