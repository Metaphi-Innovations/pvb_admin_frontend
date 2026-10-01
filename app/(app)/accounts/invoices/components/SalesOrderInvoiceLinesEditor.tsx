"use client";

/**
 * Sales Order → Pending Invoice generation product table.
 * Compact goods layout: Product / SKU / Batch columns, editable Qty, Sales Person.
 * Module-scoped — used only when sourceType=sales_order (Goods generate).
 */

import { memo, useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
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
    return { qty: maxDispatch, error: `Qty cannot exceed dispatch-ready (${maxDispatch})` };
  }
  const maxBatch = line.batchAvailableQty;
  if (typeof maxBatch === "number" && maxBatch > 0 && qty > maxBatch) {
    return { qty: maxBatch, error: `Qty cannot exceed batch available (${maxBatch})` };
  }
  return { qty };
}

const COL = {
  product: "so-col-product",
  sku: "so-col-sku",
  batch: "so-col-batch",
  hsn: "so-col-hsn",
  qtyCase: "so-col-qty-case",
  qty: "so-col-qty",
  uom: "so-col-uom",
  rate: "so-col-rate",
  gross: "so-col-gross",
  discPct: "so-col-disc-pct",
  discAmt: "so-col-disc-amt",
  scheme: "so-col-scheme",
  taxable: "so-col-taxable",
  gstPct: "so-col-gst-pct",
  gstAmt: "so-col-gst-amt",
  lineTotal: "so-col-line-total",
  salesperson: "so-col-salesperson",
} as const;

const SalesOrderInvoiceLineRow = memo(function SalesOrderInvoiceLineRow({
  line,
  interstate,
  onDiscountPct,
  onDiscountAmt,
  onQty,
  qtyError,
}: {
  line: InvoiceLineItem;
  interstate: boolean;
  onDiscountPct: (id: string, discountPct: number) => void;
  onDiscountAmt: (id: string, discountAmt: number) => void;
  onQty: (id: string, qty: number) => void;
  qtyError?: string;
}) {
  const { base, discountAmt, taxable } = calcLineAmounts(line);
  const split = calcGstLineSplit(line, interstate);
  const spName = line.salesperson?.trim();

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className={cn("px-2 py-1.5 align-middle", COL.product)}>
        <p className="so-product-name leading-tight truncate" title={line.productName || undefined}>
          {line.productName || "—"}
        </p>
        <p className="so-product-meta mt-0.5 leading-tight">MFG: {formatMonthYear(line.manufacturingDate)}</p>
        <p className="so-product-meta leading-tight">EXP: {formatMonthYear(line.expiryDate)}</p>
      </td>
      <td className={cn("px-2 py-1.5 align-middle", COL.sku)}>
        <p className="so-sku-value leading-tight truncate" title={line.productCode || undefined}>
          {line.productCode || "—"}
        </p>
      </td>
      <td className={cn("px-2 py-1.5 align-middle", COL.batch)}>
        <p className="so-batch-value leading-tight truncate" title={line.batchNo?.trim() || undefined}>
          {line.batchNo?.trim() || "—"}
        </p>
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num text-muted-foreground", COL.hsn)}>
        {line.hsn || "—"}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num text-muted-foreground", COL.qtyCase)}>
        {line.qtyInCase != null && line.qtyInCase > 0 ? line.qtyInCase : "—"}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.qty)}>
        <Input
          type="number"
          min={0.01}
          step={0.01}
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
      <td className={cn("px-2 py-1.5 align-middle whitespace-nowrap", COL.uom)}>
        {line.unit || "—"}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.rate)}>
        {formatINR(line.unitPrice)}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.gross)}>
        {formatINR(base)}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.discPct)}>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          className="h-8 w-full max-w-[72px] text-xs text-right ml-auto tabular-nums"
          value={line.discountPct || ""}
          onChange={(e) => onDiscountPct(line.id, parseFloat(e.target.value) || 0)}
        />
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.discAmt)}>
        <AccountsMoneyInput
          className="h-8 w-full max-w-[110px] text-xs text-right ml-auto"
          value={discountAmt || ""}
          onChange={(v) => onDiscountAmt(line.id, v)}
        />
      </td>
      <td className={cn("px-2 py-1.5 align-middle", COL.scheme)}>
        {line.schemeApplied === "Yes" || line.schemeCode ? (
          <div className="min-w-[120px] max-w-[160px]">
            <p
              className="text-[11px] font-medium text-foreground leading-tight truncate"
              title={line.schemeName || undefined}
            >
              {line.schemeName || "Product Discount"}
            </p>
            <p className="font-mono text-[10px] text-brand-700 leading-tight truncate">
              {line.schemeCode || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">Product Discount</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.taxable)}>
        {formatINR(taxable)}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num tabular-nums", COL.gstPct)}>
        {line.taxPct}%
      </td>
      {interstate ? (
        <td className={cn("px-2 py-1.5 align-middle so-cell-num text-muted-foreground", COL.gstAmt)}>
          {formatINR(split.igst)}
        </td>
      ) : (
        <>
          <td className={cn("px-2 py-1.5 align-middle so-cell-num text-muted-foreground", COL.gstAmt)}>
            {formatINR(split.cgst)}
          </td>
          <td className={cn("px-2 py-1.5 align-middle so-cell-num text-muted-foreground", COL.gstAmt)}>
            {formatINR(split.sgst)}
          </td>
        </>
      )}
      <td className={cn("px-2 py-1.5 align-middle so-cell-num font-medium", COL.lineTotal)}>
        {formatINR(split.lineTotal)}
      </td>
      <td className={cn("px-2 py-1.5 align-middle whitespace-nowrap", COL.salesperson)}>
        {spName ? (
          <p className="so-product-name leading-tight truncate" title={spName}>
            {spName}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
});

const HEADER_COL: Record<string, string> = {
  Product: COL.product,
  SKU: COL.sku,
  "Batch No.": COL.batch,
  HSN: COL.hsn,
  "Qty in Case": COL.qtyCase,
  Qty: COL.qty,
  UOM: COL.uom,
  Rate: COL.rate,
  "Gross Amount": COL.gross,
  "Discount %": COL.discPct,
  "Discount Amount": COL.discAmt,
  Scheme: COL.scheme,
  Taxable: COL.taxable,
  "GST %": COL.gstPct,
  CGST: COL.gstAmt,
  SGST: COL.gstAmt,
  IGST: COL.gstAmt,
  "Line Total": COL.lineTotal,
  "Sales Person": COL.salesperson,
};

function SalesOrderInvoiceLinesEditorInner({
  lines,
  onChange,
  interstate = false,
}: {
  lines: InvoiceLineItem[];
  onChange: Dispatch<SetStateAction<InvoiceLineItem[]>>;
  interstate?: boolean;
}) {
  const [qtyErrors, setQtyErrors] = useState<Record<string, string>>({});

  const updateDiscountPct = useCallback(
    (id: string, discountPct: number) => {
      const pct = Math.max(0, Math.min(100, discountPct));
      onChange((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          return recalculateLineItem({ ...line, discountPct: pct });
        }),
      );
    },
    [onChange],
  );

  const updateDiscountAmt = useCallback(
    (id: string, discountAmt: number) => {
      onChange((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          const base = Math.max(0, line.qty * line.unitPrice);
          const amt = Math.max(0, Math.min(base, discountAmt));
          const discountPct = base > 0 ? Math.round((amt / base) * 10000) / 100 : 0;
          return recalculateLineItem({ ...line, discountPct });
        }),
      );
    },
    [onChange],
  );

  const updateQty = useCallback(
    (id: string, rawQty: number) => {
      onChange((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          const { qty, error } = clampQty(line, rawQty);
          setQtyErrors((e) => {
            const next = { ...e };
            if (error) next[id] = error;
            else delete next[id];
            return next;
          });
          return recalculateLineItem({ ...line, qty });
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
        "Rate",
        "Gross Amount",
        "Discount %",
        "Discount Amount",
        "Scheme",
        "Taxable",
        "GST %",
        "IGST",
        "Line Total",
        "Sales Person",
      ] as const)
    : ([
        "Product",
        "SKU",
        "Batch No.",
        "HSN",
        "Qty in Case",
        "Qty",
        "UOM",
        "Rate",
        "Gross Amount",
        "Discount %",
        "Discount Amount",
        "Scheme",
        "Taxable",
        "GST %",
        "CGST",
        "SGST",
        "Line Total",
        "Sales Person",
      ] as const);

  const rightAlign = new Set([
    "Qty in Case",
    "Qty",
    "Rate",
    "Gross Amount",
    "Discount %",
    "Discount Amount",
    "Taxable",
    "GST %",
    "CGST",
    "SGST",
    "IGST",
    "Line Total",
  ]);

  return (
    <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
      <table className="w-full text-xs min-w-[1480px] so-goods-product-table">
        <thead className="border-b border-border/60 bg-muted/20">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                  rightAlign.has(h) && "text-right",
                  HEADER_COL[h],
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
                No dispatch product lines.
              </td>
            </tr>
          ) : (
            lines.map((line) => (
              <SalesOrderInvoiceLineRow
                key={line.id}
                line={line}
                interstate={interstate}
                onDiscountPct={updateDiscountPct}
                onDiscountAmt={updateDiscountAmt}
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

export const SalesOrderInvoiceLinesEditor = memo(SalesOrderInvoiceLinesEditorInner);
