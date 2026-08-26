"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  formatStackNum,
  type GrnQtyStackParts,
} from "@/lib/warehouse/grn-quantity";

export function StackedQtyCell({
  stack,
  empty = false,
  emphasize = "case",
  align = "center",
  labeled = false,
  packingSize,
  className,
}: {
  stack: GrnQtyStackParts;
  empty?: boolean;
  emphasize?: "case" | "unit";
  align?: "center" | "right" | "left";
  /** When true, renders "Qty. in Case/Unit/Kg/Litre" labels (GRN/QC stacked column). */
  labeled?: boolean;
  /** Used with labeled mode to hide Case row when packing is unit-only. */
  packingSize?: number;
  className?: string;
}) {
  if (empty || (!(stack.caseQty > 0) && !(stack.unitQty > 0))) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (labeled) {
    const showCase = (packingSize ?? 1) > 1 && stack.caseQty > 0;
    const labelCls = "text-[10px] tabular-nums text-muted-foreground leading-snug";
    const valueCls = "font-semibold text-foreground";
    return (
      <div
        className={cn(
          "space-y-0.5 leading-tight min-w-[88px]",
          align === "right" ? "text-right" : "text-left",
          className,
        )}
      >
        {showCase ? (
          <p className={labelCls}>
            Qty. in Case: <span className={valueCls}>{formatStackNum(stack.caseQty)}</span>
          </p>
        ) : null}
        {stack.unitQty > 0 ? (
          <p className={labelCls}>
            Qty. in Unit: <span className={valueCls}>{formatStackNum(stack.unitQty)}</span>
          </p>
        ) : null}
        {stack.weightQty != null && stack.weightUom ? (
          <p className={labelCls}>
            Qty. in Kg/Litre:{" "}
            <span className={valueCls}>{formatStackNum(stack.weightQty)}</span>
          </p>
        ) : null}
      </div>
    );
  }

  const caseCls =
    emphasize === "case"
      ? "text-xs tabular-nums font-semibold text-foreground"
      : "text-[10px] tabular-nums text-muted-foreground";
  const unitCls =
    emphasize === "unit"
      ? "text-xs tabular-nums font-semibold text-foreground"
      : "text-[10px] tabular-nums text-muted-foreground";

  return (
    <div
      className={cn(
        "space-y-0.5 leading-tight min-w-[72px]",
        align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center",
        className,
      )}
    >
      <p className={caseCls}>{formatStackNum(stack.caseQty)} Case</p>
      <p className={unitCls}>{formatStackNum(stack.unitQty)} Unit</p>
      {stack.weightQty != null && stack.weightUom ? (
        <p className="text-[10px] tabular-nums text-muted-foreground">
          {formatStackNum(stack.weightQty)} {stack.weightUom}
        </p>
      ) : null}
    </div>
  );
}
