"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type QtyStackMeta = {
  /** Units per case / packing */
  unitsPerPacking?: number;
  quantityType?: "Case" | "Piece" | string | null;
  uom?: string | null;
  unitPackSize?: number | null;
  netWeight?: number | null;
};

export type QtyDisplayLayout = "inline" | "compact";

function formatStackNum(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

/** Resolve Kg/Ltr label from base (unit) qty — same rules as ProductLinesEditor. */
export function resolveWeightLabel(
  baseQty: number,
  meta?: Pick<QtyStackMeta, "uom" | "unitPackSize" | "netWeight">,
): string | null {
  if (!meta || !(baseQty > 0)) return null;
  const uomLower = String(meta.uom || "").toLowerCase();
  const unitSize = Number(meta.unitPackSize) || 0;
  if (uomLower === "ml") {
    return `${((baseQty * unitSize) / 1000).toFixed(2)} Ltr`;
  }
  if (uomLower === "gms" || uomLower === "gram" || uomLower === "grams") {
    return `${((baseQty * unitSize) / 1000).toFixed(2)} Kg`;
  }
  if (uomLower === "ltr" || uomLower === "kg") {
    return `${(baseQty * (unitSize || 1)).toFixed(2)} ${meta.uom}`;
  }
  if (meta.netWeight != null && Number(meta.netWeight) > 0) {
    const label = ["ml", "ltr"].includes(uomLower) ? "Ltr" : "Kg";
    return `${(baseQty * Number(meta.netWeight)).toFixed(2)} ${label}`;
  }
  return null;
}

export function resolveCaseQty(baseQty: number, unitsPerPacking = 1): number {
  const pack = Math.max(1, Number(unitsPerPacking) || 1);
  return pack > 1 ? Math.floor(baseQty / pack) : 0;
}

function resolveQtyParts(baseQty: number, meta?: QtyStackMeta) {
  const qty = Number(baseQty) || 0;
  const pack = Math.max(1, Number(meta?.unitsPerPacking) || 1);
  const qtyType = String(meta?.quantityType || "").toLowerCase();
  const isCase = qtyType === "case";
  const caseQty = resolveCaseQty(qty, pack);
  const weightStr = resolveWeightLabel(qty, meta);

  const primary = isCase
    ? `${formatStackNum(caseQty || qty / pack)} Case`
    : `${formatStackNum(qty)} Unit`;

  const extras: string[] = [];
  if (isCase || pack > 1) extras.push(`${formatStackNum(qty)} Unit`);
  if (weightStr) extras.push(weightStr);

  return { qty, pack, primary, extras, weightStr };
}

/**
 * Qty display for packing lists.
 * - inline: one horizontal line — best for Ordered / Allocated header
 * - compact: primary + one muted secondary line — best for table cells
 */
export function StackedQtyDisplay({
  baseQty,
  meta,
  className,
  emptyLabel = "—",
  showPackSize = false,
  layout = "compact",
  emphasize = false,
}: {
  baseQty: number;
  meta?: QtyStackMeta;
  className?: string;
  emptyLabel?: string;
  showPackSize?: boolean;
  layout?: QtyDisplayLayout;
  emphasize?: boolean;
}) {
  const { qty, pack, primary, extras } = resolveQtyParts(baseQty, meta);
  if (qty <= 0) {
    return <span className={cn("text-xs text-muted-foreground", className)}>{emptyLabel}</span>;
  }

  if (layout === "inline") {
    const parts = [primary, ...extras];
    if (showPackSize && pack > 1) parts.push(`Pack ${pack}`);
    return (
      <span
        className={cn(
          "text-xs tabular-nums whitespace-nowrap",
          emphasize ? "font-semibold text-amber-700" : "font-medium text-foreground",
          className,
        )}
      >
        {parts.map((part, i) => (
          <React.Fragment key={`${part}-${i}`}>
            {i > 0 ? (
              <span className="mx-1.5 text-muted-foreground/50 font-normal">·</span>
            ) : null}
            <span className={i === 0 ? undefined : "text-muted-foreground font-normal"}>{part}</span>
          </React.Fragment>
        ))}
      </span>
    );
  }

  // compact — table cells: keep rows short
  return (
    <div className={cn("leading-tight text-right", className)}>
      <p
        className={cn(
          "text-xs tabular-nums font-semibold whitespace-nowrap",
          emphasize ? "text-amber-700" : "text-foreground",
        )}
      >
        {primary}
      </p>
      {extras.length > 0 ? (
        <p className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
          {extras.join(" · ")}
        </p>
      ) : null}
      {showPackSize && pack > 1 ? (
        <p className="text-[9px] text-muted-foreground/80">Pack size: {pack}</p>
      ) : null}
    </div>
  );
}

/** Header summary: Ordered / Allocated as horizontal chips. */
export function StackedQtyHeaderPair({
  orderedBaseQty,
  allocatedBaseQty,
  meta,
  insufficient,
  orderedLabel = "Ordered",
  allocatedLabel = "Allocated",
}: {
  orderedBaseQty: number;
  allocatedBaseQty: number;
  meta?: QtyStackMeta;
  insufficient?: boolean;
  orderedLabel?: string;
  allocatedLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
      <div className="inline-flex items-baseline gap-1.5 rounded-md border border-border/70 bg-white/70 px-2.5 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {orderedLabel}
        </span>
        <StackedQtyDisplay
          baseQty={orderedBaseQty}
          meta={meta}
          layout="inline"
          showPackSize
        />
      </div>
      <div
        className={cn(
          "inline-flex items-baseline gap-1.5 rounded-md border px-2.5 py-1",
          insufficient
            ? "border-amber-200 bg-amber-50/80"
            : "border-border/70 bg-white/70",
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {allocatedLabel}
        </span>
        <StackedQtyDisplay
          baseQty={allocatedBaseQty}
          meta={meta}
          layout="inline"
          emphasize={insufficient}
        />
      </div>
    </div>
  );
}
