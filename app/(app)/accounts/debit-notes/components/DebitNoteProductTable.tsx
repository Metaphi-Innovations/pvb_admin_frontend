"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calcDebitFromQty,
  getDebitLineMaxQty,
  type DebitNoteLine,
} from "../debit-notes-data";

const TH =
  "px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap bg-muted/40";
const TD = "px-2 py-1 align-middle text-xs text-foreground";

export interface DebitNoteProductTableProps {
  lines: DebitNoteLine[];
  readOnly?: boolean;
  onQtyChange: (lineId: string, qty: number) => void;
}

function lineAmounts(line: DebitNoteLine) {
  const debit = line.debitAmount > 0 ? line.debitAmount : calcDebitFromQty(line);
  if (debit <= 0) return null;
  const rate = 1 + (line.taxPct || 0) / 100;
  const taxable = Math.round((debit / rate) * 100) / 100;
  const taxAmt = Math.round((debit - taxable) * 100) / 100;
  return { taxable, taxAmt, amount: debit };
}

export function DebitNoteProductTable({
  lines,
  readOnly,
  onQtyChange,
}: DebitNoteProductTableProps) {
  return (
    <div className="cn-ws__table-wrap">
      <table className="cn-ws__table min-w-[1180px]">
        <thead>
          <tr>
            <th className={cn(TH, "text-left min-w-[200px]")}>Product</th>
            <th className={cn(TH, "text-left")}>SKU</th>
            <th className={cn(TH, "text-left")}>Batch</th>
            <th className={cn(TH, "text-right")}>Original Qty</th>
            <th className={cn(TH, "text-right")}>Previously Debited Qty</th>
            <th className={cn(TH, "text-right")}>Available Qty</th>
            <th className={cn(TH, "text-right")}>Debit Qty</th>
            <th className={cn(TH, "text-right")}>Rate</th>
            <th className={cn(TH, "text-right")}>Discount</th>
            <th className={cn(TH, "text-right")}>GST %</th>
            <th className={cn(TH, "text-right")}>GST</th>
            <th className={cn(TH, "text-right")}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const amounts = lineAmounts(line);
            const maxQty = getDebitLineMaxQty(line);
            const available = Number.isFinite(maxQty) ? maxQty : line.invoiceQty;
            const previously =
              line.invoiceQty > 0 && Number.isFinite(available)
                ? Math.max(0, Math.round((line.invoiceQty - available) * 1000) / 1000)
                : 0;
            const overMax = line.returnQty > maxQty + 0.0001;

            return (
              <tr key={line.id} className="hover:bg-muted/15">
                <td className={cn(TD, "font-medium leading-snug whitespace-normal")}>
                  {line.productName || "—"}
                </td>
                <td className={cn(TD, "font-mono text-[11px] text-muted-foreground")}>
                  {(line as { sku?: string }).sku?.trim() || "—"}
                </td>
                <td className={cn(TD, "font-mono text-[11px] text-muted-foreground")}>
                  {line.batchNo?.trim() || "—"}
                </td>
                <td className={cn(TD, "cn-num")}>
                  {line.invoiceQty > 0 ? line.invoiceQty : "—"}
                </td>
                <td className={cn(TD, "cn-num text-muted-foreground")}>
                  {previously > 0 ? previously : "—"}
                </td>
                <td className={cn(TD, "cn-num")}>{available > 0 ? available : "—"}</td>
                <td className={cn(TD, "cn-num")}>
                  {readOnly ? (
                    <span>{line.returnQty > 0 ? line.returnQty : "—"}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      max={Number.isFinite(maxQty) ? maxQty : undefined}
                      className={cn(
                        "h-7 w-[68px] text-xs text-right tabular-nums ml-auto",
                        overMax && "border-red-400",
                      )}
                      value={line.returnQty || ""}
                      onChange={(e) => onQtyChange(line.id, parseFloat(e.target.value) || 0)}
                    />
                  )}
                </td>
                <td className={cn(TD, "cn-num font-mono")}>
                  {line.unitPrice > 0 ? line.unitPrice.toFixed(2) : "—"}
                </td>
                <td className={cn(TD, "cn-num")}>
                  {line.discountPct > 0 ? `${line.discountPct}%` : "—"}
                </td>
                <td className={cn(TD, "cn-num")}>
                  {line.taxPct > 0 ? `${line.taxPct}%` : "—"}
                </td>
                <td className={cn(TD, "cn-num font-mono")}>
                  {amounts ? amounts.taxAmt.toFixed(2) : "—"}
                </td>
                <td className={cn(TD, "cn-num font-mono font-semibold")}>
                  {amounts && amounts.amount > 0 ? amounts.amount.toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
