"use client";

/**
 * Sales Order → Pending Invoice generation product table.
 * Product / batch / qty / rate / tax are locked; discount % and amount are editable.
 * Module-scoped — used only when sourceType=sales_order.
 */

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

export function SalesOrderInvoiceLinesEditor({
  lines,
  onChange,
  interstate = false,
}: {
  lines: InvoiceLineItem[];
  onChange: (lines: InvoiceLineItem[]) => void;
  interstate?: boolean;
}) {
  const updateDiscountPct = (id: string, discountPct: number) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const pct = Math.max(0, Math.min(100, discountPct));
        return recalculateLineItem({ ...line, discountPct: pct });
      }),
    );
  };

  const updateDiscountAmt = (id: string, discountAmt: number) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const base = Math.max(0, line.qty * line.unitPrice);
        const amt = Math.max(0, Math.min(base, discountAmt));
        const discountPct = base > 0 ? Math.round((amt / base) * 10000) / 100 : 0;
        return recalculateLineItem({ ...line, discountPct });
      }),
    );
  };

  return (
    <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
      <table className="w-full text-xs min-w-[1280px]">
        <thead className="border-b border-border/60 bg-muted/20">
          <tr>
            {[
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
              interstate ? "IGST" : "CGST",
              interstate ? "" : "SGST",
              "Line Total",
            ]
              .filter((h) => h !== "")
              .map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    [
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
                    ].includes(h) && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const { discountAmt, taxable } = calcLineAmounts(line);
            const split = calcGstLineSplit(line, interstate);
            return (
              <tr key={line.id} className="border-b border-border/40 last:border-0">
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
                    onChange={(e) =>
                      updateDiscountPct(line.id, parseFloat(e.target.value) || 0)
                    }
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <AccountsMoneyInput
                    className="h-7 w-20 text-xs text-right ml-auto"
                    value={discountAmt || ""}
                    onChange={(v) => updateDiscountAmt(line.id, v)}
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
          })}
          {lines.length === 0 && (
            <tr>
              <td colSpan={15} className="px-3 py-6 text-center text-muted-foreground">
                No dispatched products found for this Sales Order.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
