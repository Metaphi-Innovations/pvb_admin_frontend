"use client";

import { StackedQtyDisplay } from "@/app/(app)/sales/shared/StackedQtyDisplay";
import { toQtyStackMeta, type PackingQtyMeta } from "../lib/packing-qty-stack";

/** Compact stacked qty — same visual language as Generate Packing List. */
export function PackingStackedQty({
  baseQty,
  line,
  className,
  emphasize = false,
  layout = "compact",
  showPackSize = false,
}: {
  baseQty: number;
  line: PackingQtyMeta;
  className?: string;
  emphasize?: boolean;
  layout?: "compact" | "inline";
  showPackSize?: boolean;
}) {
  return (
    <StackedQtyDisplay
      baseQty={baseQty}
      meta={toQtyStackMeta(line)}
      layout={layout}
      emphasize={emphasize}
      showPackSize={showPackSize}
      className={className}
    />
  );
}
