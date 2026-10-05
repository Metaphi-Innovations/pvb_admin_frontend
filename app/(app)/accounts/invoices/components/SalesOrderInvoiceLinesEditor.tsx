"use client";

/**
 * Sales Order → Pending Invoice generation product table.
 * Compact goods layout: Product / SKU / Batch columns, editable Qty, Sales Person.
 * Module-scoped — used only when sourceType=sales_order (Goods generate).
 */

import { memo, useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calcGstLineSplit,
  calcLineAmounts,
  calcSplitDiscountParts,
  recalculateLineItem,
  type InvoiceLineItem,
} from "../invoices-data";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { formatINR } from "../invoice-utils";

function schemeDiscountLabel(line: InvoiceLineItem): string {
  if (line.schemeDiscountType === "Rupees" && line.schemeDiscountAmount != null) {
    return `₹${line.schemeDiscountAmount}/unit`;
  }
  if (line.schemeDiscountPercent != null && line.schemeDiscountPercent > 0) {
    return `${line.schemeDiscountPercent}%`;
  }
  return "";
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
  scheme: "so-col-scheme",
  finalRate: "so-col-final-rate",
  manualDisc: "so-col-manual-disc",
  taxable: "so-col-taxable",
  gstPct: "so-col-gst-pct",
  gstAmt: "so-col-gst-amt",
  lineTotal: "so-col-line-total",
  salesperson: "so-col-salesperson",
} as const;

type ManualType = NonNullable<InvoiceLineItem["manualDiscountType"]>;

/** One compact field: value + %/₹ toggle. Applies to the whole line after scheme. */
function ManualDiscountField({
  type,
  value,
  amount,
  postSchemeAmount,
  onValue,
  onType,
}: {
  type: ManualType;
  value: number;
  amount: number;
  postSchemeAmount: number;
  onValue: (value: number) => void;
  onType: (type: ManualType) => void;
}) {
  const pctOfLine =
    postSchemeAmount > 0 ? Math.round((amount / postSchemeAmount) * 10000) / 100 : 0;
  return (
    <div className="ml-auto w-full max-w-[130px]">
      <div className="flex h-8 items-stretch overflow-hidden rounded-md border border-input bg-white focus-within:ring-1 focus-within:ring-brand-500">
        <input
          type="number"
          min={0}
          max={type === "Percentage" ? 100 : undefined}
          step={0.01}
          aria-label="Manual discount"
          className="w-full min-w-0 bg-transparent px-2 text-right text-xs tabular-nums outline-none"
          value={value || ""}
          placeholder="0"
          onChange={(e) => onValue(parseFloat(e.target.value) || 0)}
        />
        <div className="flex shrink-0 border-l border-input">
          {(["Percentage", "Flat"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              title={t === "Percentage" ? "Percentage of line" : "Fixed ₹ on line"}
              className={cn(
                "w-6 text-[11px] font-semibold transition-colors",
                type === t
                  ? "bg-brand-600 text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => type !== t && onType(t)}
            >
              {t === "Percentage" ? "%" : "₹"}
            </button>
          ))}
        </div>
      </div>
      {amount > 0 ? (
        <p className="so-product-meta mt-0.5 text-right leading-tight">
          {type === "Percentage" ? `= ${formatINR(amount)}` : `= ${pctOfLine}%`}
        </p>
      ) : null}
    </div>
  );
}

const SalesOrderInvoiceLineRow = memo(function SalesOrderInvoiceLineRow({
  line,
  interstate,
  onManualValue,
  onManualType,
  onQty,
  qtyError,
}: {
  line: InvoiceLineItem;
  interstate: boolean;
  onManualValue: (id: string, value: number) => void;
  onManualType: (id: string, type: ManualType) => void;
  onQty: (id: string, qty: number) => void;
  qtyError?: string;
}) {
  const { base, taxable } = calcLineAmounts(line);
  const parts = calcSplitDiscountParts(line);
  const split = calcGstLineSplit(line, interstate);
  const spName = line.salesperson?.trim();
  const hasScheme = line.schemeApplied === "Yes" || Boolean(line.schemeCode);

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className={cn("px-2 py-1.5 align-middle", COL.product)}>
        <p className="so-product-name leading-tight truncate" title={line.productName || undefined}>
          {line.productName || "—"}
        </p>
        <p className="so-product-meta mt-0.5 leading-tight">MFG Date: {formatDisplayDate(line.manufacturingDate)}</p>
        <p className="so-product-meta leading-tight">EXP Date: {formatDisplayDate(line.expiryDate)}</p>
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
      <td className={cn("px-2 py-1.5 align-middle text-left text-muted-foreground", COL.hsn)}>
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
      <td className={cn("px-2 py-1.5 align-middle", COL.scheme)}>
        {hasScheme ? (
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
            <p className="text-[10px] text-muted-foreground leading-tight">
              {schemeDiscountLabel(line) || "Product Discount"}
              {parts.schemeAmt > 0 ? ` · −${formatINR(parts.schemeAmt)}` : ""}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.finalRate)}>
        {formatINR(parts.finalRate)}
      </td>
      <td className={cn("px-2 py-1.5 align-middle so-cell-num", COL.manualDisc)}>
        <ManualDiscountField
          type={line.manualDiscountType ?? "Percentage"}
          value={line.manualDiscountValue ?? 0}
          amount={parts.manualAmt}
          postSchemeAmount={parts.postScheme}
          onValue={(v) => onManualValue(line.id, v)}
          onType={(t) => onManualType(line.id, t)}
        />
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
  "Qty of Case": COL.qtyCase,
  Qty: COL.qty,
  UOM: COL.uom,
  Rate: COL.rate,
  "Gross Amount": COL.gross,
  "Scheme Applied": COL.scheme,
  "Final Rate": COL.finalRate,
  "Manual Discount": COL.manualDisc,
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

  const updateManualValue = useCallback(
    (id: string, rawValue: number) => {
      onChange((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          const type = line.manualDiscountType ?? "Percentage";
          const { postScheme } = calcSplitDiscountParts(line);
          const value = Math.max(
            0,
            type === "Percentage" ? Math.min(100, rawValue) : Math.min(postScheme, rawValue),
          );
          return recalculateLineItem({
            ...line,
            discountMode: "split",
            manualDiscountType: type,
            manualDiscountValue: value,
          });
        }),
      );
    },
    [onChange],
  );

  /** Switching % ↔ ₹ keeps the same ₹ discount on the line. */
  const updateManualType = useCallback(
    (id: string, type: ManualType) => {
      onChange((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          const { postScheme, manualAmt } = calcSplitDiscountParts(line);
          const value =
            type === "Flat"
              ? manualAmt
              : postScheme > 0
                ? Math.round((manualAmt / postScheme) * 10000) / 100
                : 0;
          return recalculateLineItem({
            ...line,
            discountMode: "split",
            manualDiscountType: type,
            manualDiscountValue: value,
          });
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
        "Qty of Case",
        "Qty",
        "UOM",
        "Rate",
        "Gross Amount",
        "Scheme Applied",
        "Final Rate",
        "Manual Discount",
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
        "Qty of Case",
        "Qty",
        "UOM",
        "Rate",
        "Gross Amount",
        "Scheme Applied",
        "Final Rate",
        "Manual Discount",
        "Taxable",
        "GST %",
        "CGST",
        "SGST",
        "Line Total",
        "Sales Person",
      ] as const);

  const rightAlign = new Set([
    "Qty of Case",
    "Qty",
    "Rate",
    "Gross Amount",
    "Final Rate",
    "Manual Discount",
    "Taxable",
    "GST %",
    "CGST",
    "SGST",
    "IGST",
    "Line Total",
  ]);

  return (
    <div className="so-goods-product-table-wrap overflow-x-auto">
      <table className="so-invoice-table text-xs w-max min-w-[1480px] so-goods-product-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
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
                onManualValue={updateManualValue}
                onManualType={updateManualType}
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
