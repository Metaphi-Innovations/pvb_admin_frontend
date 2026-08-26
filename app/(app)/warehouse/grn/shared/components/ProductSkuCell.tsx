"use client";

import { cn } from "@/lib/utils";

/** Shared Product Name + SKU cell used across all GRN tables. */
export function ProductSkuCell({
  name,
  sku,
  className,
}: {
  name?: string | null;
  sku?: string | null;
  className?: string;
}) {
  const displayName = name?.trim() || "—";
  const displaySku = sku?.trim() || "—";
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className="text-xs font-semibold text-foreground leading-snug truncate"
        title={displayName !== "—" ? displayName : undefined}
      >
        {displayName}
      </p>
      <p
        className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate"
        title={displaySku !== "—" ? displaySku : undefined}
      >
        SKU: {displaySku}
      </p>
    </div>
  );
}

/** Qty input styles: entered value stays brand/semibold; placeholder stays light. */
export const GRN_QTY_INPUT_CLASSNAME = cn(
  "h-9 w-full text-xs text-center tabular-nums font-semibold rounded-lg",
  "bg-white border-border text-brand-700",
  "focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
  "placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:opacity-100",
);

export const GRN_QTY_PLACEHOLDER = "Enter Qty";
