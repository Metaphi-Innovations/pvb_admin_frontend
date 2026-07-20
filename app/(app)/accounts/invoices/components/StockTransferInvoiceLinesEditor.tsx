"use client";

/**
 * Stock Transfer Invoice product table — Cost Price (CP) valuation.
 * Module-scoped: sourceType=stock_transfer only.
 */

import { memo, useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calcGstLineSplit,
  calcLineAmounts,
  recalculateLineItem,
  type InvoiceLineItem,
} from "../invoices-data";
import { formatINR } from "../invoice-utils";

function formatMonthYear(iso?: string): string {
  if (!iso?.trim()) return "—";
  const [y, m] = iso.split("-");
  if (!y || !m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = parseInt(m, 10) - 1;
  return months[mi] ? `${months[mi]}-${y}` : iso;
}

function clampQty(line: InvoiceLineItem, nextQty: number): { qty: number; error?: string } {
  if (!Number.isFinite(nextQty) || nextQty <= 0) {
    return { qty: line.qty, error: "Qty must be greater than 0" };
  }
  let qty = nextQty;
  const maxDispatch = line.dispatchReadyQty;
  if (typeof maxDispatch === "number" && maxDispatch > 0 && qty > maxDispatch) {
    return { qty: maxDispatch, error: `Qty cannot exceed dispatched (${maxDispatch})` };
  }
  const maxBatch = line.batchAvailableQty;
  if (typeof maxBatch === "number" && maxBatch > 0 && qty > maxBatch) {
    return { qty: maxBatch, error: `Qty cannot exceed batch available (${maxBatch})` };
  }
  return { qty };
}

const StockTransferInvoiceLineRow = memo(function StockTransferInvoiceLineRow({
  line,
  interstate,
  onQty,
  qtyError,
}: {
  line: InvoiceLineItem;
  interstate: boolean;
  onQty: (id: string, qty: number) => void;
  qtyError?: string;
}) {
  const { base } = calcLineAmounts(line);
  const split = calcGstLineSplit(line, interstate);
  const cpMissing = Boolean(line.cpMissing) || !(line.unitPrice > 0);

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-2 py-1.5 align-middle so-col-product">
        <p className="so-product-name leading-tight truncate" title={line.productName || undefined}>
          {line.productName || "—"}
        </p>
        <p className="so-product-meta mt-0.5 leading-tight">MFG: {formatMonthYear(line.manufacturingDate)}</p>
        <p className="so-product-meta leading-tight">EXP: {formatMonthYear(line.expiryDate)}</p>
      </td>
      <td className="px-2 py-1.5 align-middle so-col-sku">
        <p className="so-sku-value leading-tight truncate">{line.productCode || "—"}</p>
      </td>
      <td className="px-2 py-1.5 align-middle so-col-batch">
        <p className="so-batch-value leading-tight truncate">
          {line.batchNo?.trim() || "—"}
        </p>
      </td>
      <td className="px-2 py-1.5 align-middle so-col-hsn">
        <span className="so-hsn-value">{line.hsn || "—"}</span>
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-qty-case">
        {line.qtyInCase != null && line.qtyInCase > 0 ? line.qtyInCase : "—"}
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-qty">
        <Input
          type="number"
          min={0.01}
          step={0.01}
          disabled={cpMissing}
          className={cn(
            "h-8 w-full max-w-[72px] text-xs text-right ml-auto tabular-nums",
            qtyError && "border-red-400",
          )}
          value={line.qty || ""}
          onChange={(e) => onQty(line.id, parseFloat(e.target.value))}
        />
        {qtyError ? (
          <p className="so-product-meta text-red-600 mt-0.5 max-w-[5rem] ml-auto">{qtyError}</p>
        ) : null}
      </td>
      <td className="px-2 py-1.5 align-middle whitespace-nowrap so-col-uom">{line.unit || "—"}</td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-rate">
        {cpMissing ? (
          <span className="text-red-600 text-[10px] font-medium leading-tight block text-right">
            Cost Price not available
          </span>
        ) : (
          formatINR(line.unitPrice)
        )}
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num so-col-gross">
        {cpMissing ? "—" : formatINR(base)}
      </td>
      <td className="px-2 py-1.5 align-middle so-cell-num tabular-nums so-col-gst-pct">
        {line.taxPct}%
      </td>
      {interstate ? (
        <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground so-col-gst-amt">
          {cpMissing ? "—" : formatINR(split.igst)}
        </td>
      ) : (
        <>
          <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground so-col-gst-amt">
            {cpMissing ? "—" : formatINR(split.cgst)}
          </td>
          <td className="px-2 py-1.5 align-middle so-cell-num text-muted-foreground so-col-gst-amt">
            {cpMissing ? "—" : formatINR(split.sgst)}
          </td>
        </>
      )}
      <td className="px-2 py-1.5 align-middle so-cell-num font-medium so-col-line-total">
        {cpMissing ? "—" : formatINR(split.lineTotal)}
      </td>
    </tr>
  );
});

function StockTransferInvoiceLinesEditorInner({
  lines,
  onChange,
  interstate = false,
}: {
  lines: InvoiceLineItem[];
  onChange: Dispatch<SetStateAction<InvoiceLineItem[]>>;
  interstate?: boolean;
}) {
  const [qtyErrors, setQtyErrors] = useState<Record<string, string>>({});

  const updateQty = useCallback(
    (id: string, rawQty: number) => {
      onChange((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          if (line.cpMissing) return line;
          const { qty, error } = clampQty(line, rawQty);
          setQtyErrors((e) => {
            const next = { ...e };
            if (error) next[id] = error;
            else delete next[id];
            return next;
          });
          return recalculateLineItem({ ...line, qty, discountPct: 0 });
        }),
      );
    },
    [onChange],
  );

  const headers = interstate
    ? ([
        "Product",
        "SKU",
        "Batch No.",
        "HSN",
        "Qty in Case",
        "Qty",
        "UOM",
        "Cost Price",
        "Gross Amount",
        "GST %",
        "IGST",
        "Line Total",
      ] as const)
    : ([
        "Product",
        "SKU",
        "Batch No.",
        "HSN",
        "Qty in Case",
        "Qty",
        "UOM",
        "Cost Price",
        "Gross Amount",
        "GST %",
        "CGST",
        "SGST",
        "Line Total",
      ] as const);

  const rightAlign = new Set([
    "Qty in Case",
    "Qty",
    "Cost Price",
    "Gross Amount",
    "GST %",
    "CGST",
    "SGST",
    "IGST",
    "Line Total",
  ]);

  return (
    <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
      <table className="w-full text-xs min-w-[1180px] so-goods-product-table">
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
                No stock transfer product lines.
              </td>
            </tr>
          ) : (
            lines.map((line) => (
              <StockTransferInvoiceLineRow
                key={line.id}
                line={line}
                interstate={interstate}
                onQty={updateQty}
                qtyError={qtyErrors[line.id]}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export const StockTransferInvoiceLinesEditor = memo(StockTransferInvoiceLinesEditorInner);

/** Block STI generate when any line is missing Pricing Master CP. */
export function validateStockTransferCostPrices(lines: InvoiceLineItem[]): string | null {
  const missing = lines.find(
    (l) =>
      (l.productName || l.productId) &&
      (l.cpMissing || !(l.unitPrice > 0)),
  );
  if (!missing) return null;
  return `Cost Price not available for "${missing.productName || "product"}". Set active Pricing Master CP before generating Stock Transfer Invoice.`;
}
