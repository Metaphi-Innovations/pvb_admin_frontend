"use client";

import { cn } from "@/lib/utils";
import { StackedQtyDisplay } from "@/app/(app)/sales/shared/StackedQtyDisplay";
import {
  toSalesReturnQtyMeta,
  type SalesReturnQtyMetaSource,
} from "../sales-return-qty";

/** Display-only stacked qty — Cases primary, Unit · Kg/Ltr secondary. */
export function SalesReturnStackedQty({
  baseQty,
  source,
  className,
  accent,
}: {
  baseQty: number;
  source: SalesReturnQtyMetaSource;
  className?: string;
  accent?: "emerald" | "amber" | "brand";
}) {
  return (
    <div className="flex w-full justify-center">
      <StackedQtyDisplay
        baseQty={baseQty}
        meta={toSalesReturnQtyMeta(source)}
        layout="compact"
        emphasize={accent === "amber"}
        className={cn(
          "text-center",
          accent === "emerald" && "[&_p:first-child]:text-emerald-700",
          accent === "brand" && "[&_p:first-child]:text-brand-700",
          className,
        )}
      />
    </div>
  );
}
