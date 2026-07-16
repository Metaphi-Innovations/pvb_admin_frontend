"use client";

/**
 * Sales Order → Pending Invoice generation product table.
 * Product / batch / qty / rate / tax are locked; discount % and amount are editable.
 * Module-scoped — used only when sourceType=sales_order.
 */

import { memo, useCallback, type Dispatch, type SetStateAction } from "react";
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

function formatDisplayDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

const HEADER_COLS_INTRA = [
  "Product Code",
  "Product Name",
  "HSN",
  "Batch",
  "Mfg Date",
  "Expiry",
  "Qty",
  "UOM",
  "Rate",
  "Disc %",
  "Disc Amt",
  "Taxable",
  "GST %",
  "CGST",
  "SGST",
  "Line Total",
] as const;

const HEADER_COLS_INTER = [
  "Product Code",
  "Product Name",
  "HSN",
  "Batch",
  "Mfg Date",
  "Expiry",
  "Qty",
  "UOM",
  "Rate",
  "Disc %",
  "Disc Amt",
  "Taxable",
  "GST %",
  "IGST",
  "Line Total",
] as const;

const RIGHT_ALIGN = new Set([
  "Qty",
  "Rate",
  "Disc %",
  "Disc Amt",
  "Taxable",
  "GST %",
  "CGST",
  "SGST",
  "IGST",
  "Line Total",
]);

const SalesOrderInvoiceLineRow = memo(function SalesOrderInvoiceLineRow({
  line,
  interstate,
  onDiscountPct,
  onDiscountAmt,
}: {
  line: InvoiceLineItem;
  interstate: boolean;
  onDiscountPct: (id: string, discountPct: number) => void;
  onDiscountAmt: (id: string, discountAmt: number) => void;
}) {
  const { discountAmt, taxable } = calcLineAmounts(line);
  const split = calcGstLineSplit(line, interstate);

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-2 py-1.5 font-mono text-brand-700 whitespace-nowrap">
        {line.productCode || "—"}
      </td>
      <td className="px-2 py-1.5 font-medium text-foreground min-w-[140px]">
        {line.productName || "—"}
      </td>
      <td className="px-2 py-1.5 font-mono text-muted-foreground">{line.hsn || "—"}</td>
      <td className="px-2 py-1.5 font-mono">{line.batchNo || "—"}</td>
      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
        {formatDisplayDate(line.manufacturingDate)}
      </td>
      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
        {formatDisplayDate(line.expiryDate)}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{line.qty}</td>
      <td className="px-2 py-1.5">{line.unit || "—"}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatINR(line.unitPrice)}</td>
      <td className="px-2 py-1.5 text-right">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          className="h-7 w-16 text-xs text-right ml-auto tabular-nums"
          value={line.discountPct || ""}
          onChange={(e) => onDiscountPct(line.id, parseFloat(e.target.value) || 0)}
        />
      </td>
      <td className="px-2 py-1.5 text-right">
        <AccountsMoneyInput
          className="h-7 w-20 text-xs text-right ml-auto"
          value={discountAmt || ""}
          onChange={(v) => onDiscountAmt(line.id, v)}
        />
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatINR(taxable)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{line.taxPct}%</td>
      {interstate ? (
        <td className="px-2 py-1.5 text-right tabular-nums">{formatINR(split.igst)}</td>
      ) : (
        <>
          <td className="px-2 py-1.5 text-right tabular-nums">{formatINR(split.cgst)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums">{formatINR(split.sgst)}</td>
        </>
      )}
      <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
        {formatINR(line.amount)}
      </td>
    </tr>
  );
});

function SalesOrderInvoiceLinesEditorInner({
  lines,
  onChange,
  interstate = false,
}: {
  lines: InvoiceLineItem[];
  onChange: Dispatch<SetStateAction<InvoiceLineItem[]>>;
  interstate?: boolean;
}) {
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

  const headers = interstate ? HEADER_COLS_INTER : HEADER_COLS_INTRA;

  return (
    <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
      <table className="w-full text-xs min-w-[1280px]">
        <thead className="border-b border-border/60 bg-muted/20">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                  RIGHT_ALIGN.has(h) && "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <SalesOrderInvoiceLineRow
              key={line.id}
              line={line}
              interstate={interstate}
              onDiscountPct={updateDiscountPct}
              onDiscountAmt={updateDiscountAmt}
            />
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-muted-foreground">
                No dispatched products found for this Sales Order.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export const SalesOrderInvoiceLinesEditor = memo(SalesOrderInvoiceLinesEditorInner);
