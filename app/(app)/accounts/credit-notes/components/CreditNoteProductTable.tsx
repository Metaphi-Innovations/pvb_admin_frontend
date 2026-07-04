"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calcCreditLineAmounts,
  getCreditLineMaxQty,
  type CreditNoteLine,
} from "../credit-notes-data";

const TABLE_HEAD =
  "px-2.5 py-2 text-xs font-semibold uppercase text-[#6B7280] whitespace-nowrap bg-[#FFF3E6]";
const TABLE_CELL = "px-2.5 py-1.5 align-middle text-xs text-foreground";
const ROW_CLASS = "border-b border-border/50 hover:bg-muted/10 min-h-[42px]";

export interface CreditNoteProductTableProps {
  lines: CreditNoteLine[];
  readOnly?: boolean;
  onQtyChange: (lineId: string, qty: number) => void;
}

function lineAmounts(line: CreditNoteLine) {
  if (line.creditAmount > 0 && line.returnQty <= 0) {
    const rate = 1 + (line.taxPct || 0) / 100;
    const taxable = Math.round((line.creditAmount / rate) * 100) / 100;
    const taxAmt = Math.round((line.creditAmount - taxable) * 100) / 100;
    return { base: taxable, discountAmt: 0, taxable, taxAmt, amount: line.creditAmount };
  }
  if (line.returnQty <= 0 || line.unitPrice <= 0) return null;
  const gross = calcCreditLineAmounts(line);
  if (line.creditAmount <= 0) return { ...gross, amount: 0 };
  if (gross.amount <= 0 || Math.abs(line.creditAmount - gross.amount) < 0.01) {
    return { ...gross, amount: line.creditAmount };
  }
  const ratio = line.creditAmount / gross.amount;
  return {
    base: gross.base,
    discountAmt: Math.round(gross.discountAmt * ratio * 100) / 100,
    taxable: Math.round(gross.taxable * ratio * 100) / 100,
    taxAmt: Math.round((line.creditAmount - gross.taxable * ratio) * 100) / 100,
    amount: line.creditAmount,
  };
}

export function CreditNoteProductTable({
  lines,
  readOnly,
  onQtyChange,
}: CreditNoteProductTableProps) {
  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px]">
          <thead>
            <tr className="border-b border-border/60">
              <th className={cn(TABLE_HEAD, "text-left min-w-[280px] w-[280px]")}>Product</th>
              <th className={cn(TABLE_HEAD, "text-left min-w-[100px]")}>Batch</th>
              <th className={cn(TABLE_HEAD, "text-left min-w-[80px]")}>HSN</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[72px]")}>Invoice Qty</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[72px]")}>Return Qty</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[80px]")}>Credit Qty</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[80px]")}>Rate</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[72px]")}>Discount</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[96px]")}>Taxable Value</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[64px]")}>GST %</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[88px]")}>GST Amount</th>
              <th className={cn(TABLE_HEAD, "text-right min-w-[88px]")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const amounts = lineAmounts(line);
              const maxQty = getCreditLineMaxQty(line);
              const returnQtyDisplay =
                line.salesReturnQty != null && line.salesReturnQty > 0
                  ? line.salesReturnQty
                  : line.eligibleReturnQty ?? line.invoiceQty;
              const overMax = line.returnQty > maxQty + 0.0001;

              return (
                <tr key={line.id} className={ROW_CLASS}>
                  <td className={cn(TABLE_CELL, "font-medium leading-snug whitespace-normal")}>
                    {line.productName || "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "font-mono text-xs text-muted-foreground")}>
                    {line.batchNo?.trim() ? line.batchNo : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "font-mono text-xs")}>{line.hsn || "—"}</td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums")}>
                    {line.invoiceQty > 0 ? line.invoiceQty : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums text-muted-foreground")}>
                    {returnQtyDisplay > 0 ? returnQtyDisplay : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right")}>
                    {readOnly ? (
                      <span className="tabular-nums">{line.returnQty > 0 ? line.returnQty : "—"}</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={Number.isFinite(maxQty) ? maxQty : undefined}
                        className={cn(
                          "h-8 w-[72px] text-xs text-right tabular-nums ml-auto",
                          overMax && "border-red-400",
                        )}
                        value={line.returnQty || ""}
                        onChange={(e) => onQtyChange(line.id, parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums font-mono")}>
                    {line.unitPrice > 0 ? line.unitPrice.toFixed(2) : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums")}>
                    {line.discountPct > 0 ? `${line.discountPct}%` : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums font-mono")}>
                    {amounts ? amounts.taxable.toFixed(2) : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums")}>
                    {line.taxPct > 0 ? `${line.taxPct}%` : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums font-mono")}>
                    {amounts ? amounts.taxAmt.toFixed(2) : "—"}
                  </td>
                  <td className={cn(TABLE_CELL, "text-right tabular-nums font-mono font-semibold text-brand-700")}>
                    {amounts && amounts.amount > 0 ? amounts.amount.toFixed(2) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
