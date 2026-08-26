"use client";

import { cn } from "@/lib/utils";
import { StackedQtyDisplay } from "@/app/(app)/sales/shared/StackedQtyDisplay";
import { toDispatchQtyMeta, type DispatchQtyProduct } from "../dispatch-display-utils";

/** Display-only stacked qty — same compact style as Packing (Cases + Unit · Kg/Ltr). */
export function DispatchStackedQty({
  baseQty,
  product,
  className,
  accent,
}: {
  baseQty: number;
  product: DispatchQtyProduct;
  className?: string;
  accent?: "emerald" | "amber";
}) {
  return (
    <StackedQtyDisplay
      baseQty={baseQty}
      meta={toDispatchQtyMeta(product)}
      layout="compact"
      emphasize={accent === "amber"}
      className={cn(
        "text-center mx-auto",
        accent === "emerald" && "[&_p:first-child]:text-emerald-700",
        className,
      )}
    />
  );
}
