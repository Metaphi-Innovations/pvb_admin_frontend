"use client";

/**
 * Sample Order Proforma product table — zero billing (Rate / Line Value = ₹0).
 * GST % / Scheme / Discount shown for reference only.
 * Cost Price used for inventory consumption posting.
 * Module-scoped: sourceType=sample_order only.
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { InvoiceLineItem } from "../invoices-data";
import { formatINR } from "../invoice-utils";
import { getCostPriceBySku, isCpMissing, resolveSku } from "@/lib/accounts/inventory-accounting-data";

function formatMonthYear(iso?: string): string {
  if (!iso?.trim()) return "—";
  const [y, m] = iso.split("-");
  if (!y || !m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = parseInt(m, 10) - 1;
  return months[mi] ? `${months[mi]}-${y}` : iso;
}

const SampleOrderInvoiceLineRow = memo(function SampleOrderInvoiceLineRow({
  line,
}: {
  line: InvoiceLineItem;
}) {
  const costPrice =
    typeof line.costPrice === "number" && line.costPrice > 0
      ? line.costPrice
      : 0;
  const cpMissing = line.cpMissing || !(costPrice > 0);

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-2 py-1.5 align-middle so-col-product">
        <p className="so-product-name leading-tight truncate" title={line.productName || undefined}>
          {line.productName || "—"}
        </p>
      </td>
      <td className="px-2 py-1.5 align-middle so-col-sku">
        <p className="so-sku-value leading-tight truncate">{line.productCode || "—"}</p>
      </td>
      <td className="px-2 py-1.5 align-middle so-col-batch">
        <p className="so-batch-value leading-tight truncate">{line.batchNo?.trim() || "—"}</p>
        <p className="so-product-meta mt-0.5 leading-tight">MFG: {formatMonthYear(line.manufacturingDate)}</p>
        <p className="so-product-meta leading-tight">EXP: {formatMonthYear(line.expiryDate)}</p>
        {line.batchAvailableQty != null ? (
          <p className="so-product-meta leading-tight text-muted-foreground">
            Avail: {line.batchAvailableQty}
          </p>
        ) : null}
      </td>
      <td className="px-2 py-1.5 align-middle so-col-hsn">
        <span className="so-hsn-value">{line.hsn || "—"}</span>
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-qty-case">
        {line.qtyInCase != null && line.qtyInCase > 0 ? line.qtyInCase : "—"}
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-qty tabular-nums">
        {line.qty || "—"}
      </td>
      <td className="px-2 py-1.5 align-middle whitespace-nowrap so-col-uom">{line.unit || "—"}</td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-rate">{formatINR(0)}</td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-disc tabular-nums text-muted-foreground">
        {line.discountPct != null ? `${line.discountPct}%` : "—"}
      </td>
      <td className="px-2 py-1.5 align-middle so-col-scheme text-muted-foreground">
        {line.schemeApplied === "Yes"
          ? line.schemeName || line.schemeCode || "Yes"
          : "No"}
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-gst tabular-nums text-muted-foreground">
        {line.taxPct != null ? `${line.taxPct}%` : "—"}
      </td>
      <td
        className={cn(
          "px-2 py-1.5 align-middle so-cell-num so-col-cp tabular-nums font-medium",
          cpMissing && "text-red-600",
        )}
        title={line.costPriceSource || undefined}
      >
        {cpMissing ? "CP missing" : formatINR(costPrice)}
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num font-medium so-col-line-total">
        {formatINR(0)}
      </td>
    </tr>
  );
});

function SampleOrderInvoiceLinesEditorInner({ lines }: { lines: InvoiceLineItem[] }) {
  const headers = [
    "Product",
    "SKU",
    "Batch No.",
    "HSN",
    "Qty in Case",
    "Qty",
    "UOM",
    "Rate",
    "Disc. %",
    "Scheme",
    "GST %",
    "Cost Price",
    "Line Value",
  ] as const;

  const rightAlign = new Set([
    "Qty in Case",
    "Qty",
    "Rate",
    "Disc. %",
    "GST %",
    "Cost Price",
    "Line Value",
  ]);

  return (
    <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
      <table className="w-full text-xs min-w-[1100px] so-goods-product-table">
        <thead className="border-b border-border/60 bg-muted/20">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                  rightAlign.has(h) && "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-xs text-muted-foreground">
                No sample order product lines.
              </td>
            </tr>
          ) : (
            lines.map((line) => <SampleOrderInvoiceLineRow key={line.id} line={line} />)
          )}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/50">
        Zero billing proforma. Disc. % / Scheme / GST % are reference only. Inventory is posted at Cost Price
        (Dr Sample / Promotional Expense · Cr Inventory).
      </p>
    </div>
  );
}

export const SampleOrderInvoiceLinesEditor = memo(SampleOrderInvoiceLinesEditorInner);

/** Block Sample Order generate when Cost Price is missing. */
export function validateSampleOrderCostPrices(lines: InvoiceLineItem[]): string | null {
  const missing = lines.find((l) => {
    if (!(l.productName || l.productId)) return false;
    const sku = resolveSku(l.productName, l.productCode);
    const cp =
      typeof l.costPrice === "number" && l.costPrice > 0
        ? l.costPrice
        : getCostPriceBySku(sku, l.productName);
    return l.cpMissing || isCpMissing(sku, l.productName) || !(cp > 0);
  });
  if (!missing) return null;
  return `Cost Price not available for "${missing.productName || "product"}". Set active Pricing Master CP before generating Sample Order Invoice.`;
}

/** Block Sample Order generate when batch stock is insufficient. */
export function validateSampleOrderBatchStock(lines: InvoiceLineItem[]): string | null {
  const short = lines.find((l) => {
    if (!(l.productName || l.productId) || !(l.qty > 0)) return false;
    if (l.batchAvailableQty == null) return false;
    return l.qty > l.batchAvailableQty;
  });
  if (!short) return null;
  return `Insufficient batch stock for "${short.productName || "product"}"${
    short.batchNo ? ` (Batch ${short.batchNo})` : ""
  }. Available: ${short.batchAvailableQty}, Required: ${short.qty}.`;
}
