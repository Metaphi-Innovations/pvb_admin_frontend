"use client";

/**
 * @deprecated Obsolete quantity-based product editor.
 * Credit Note now uses NoteReferenceDocumentDetails (read-only) + NoteParticularsTable.
 * Kept for reference only — not imported by active routes.
 */

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calcCreditLineAmounts,
  getCreditLineMaxQty,
  type CreditNoteLine,
} from "../credit-notes-data";

export interface CreditNoteProductTableProps {
  lines: CreditNoteLine[];
  readOnly?: boolean;
  onQtyChange: (lineId: string, qty: number) => void;
  /** When true, tax amount is shown as IGST; otherwise split CGST/SGST. */
  interstate?: boolean;
}

function lineAmounts(line: CreditNoteLine) {
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
  interstate = false,
}: CreditNoteProductTableProps) {
  return (
    <div className="cnz-table-wrap">
      <table className="cnz-table cnz-table--qty accounts-table">
        <thead>
          <tr>
            <th className="accounts-table-th" style={{ width: "16%" }}>Product</th>
            <th className="accounts-table-th">SKU</th>
            <th className="accounts-table-th">Batch</th>
            <th className="accounts-table-th text-right">Invoice Qty</th>
            <th className="accounts-table-th text-right">Prev. Credited</th>
            <th className="accounts-table-th text-right">Available Qty</th>
            <th className="accounts-table-th text-right">Credit Qty</th>
            <th className="accounts-table-th text-right">Rate</th>
            <th className="accounts-table-th text-right">Discount</th>
            <th className="accounts-table-th text-right">GST %</th>
            <th className="accounts-table-th text-right">Taxable</th>
            <th className="accounts-table-th text-right">CGST</th>
            <th className="accounts-table-th text-right">SGST</th>
            <th className="accounts-table-th text-right">IGST</th>
            <th className="accounts-table-th text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const amounts = lineAmounts(line);
            const maxQty = getCreditLineMaxQty(line);
            const available = Number.isFinite(maxQty) ? maxQty : line.invoiceQty;
            const previouslyCredited =
              line.invoiceQty > 0 && Number.isFinite(available)
                ? Math.max(0, Math.round((line.invoiceQty - available) * 100) / 100)
                : 0;
            const overMax = line.returnQty > maxQty + 0.0001;
            const taxAmt = amounts?.taxAmt ?? 0;
            const cgst = taxAmt > 0 && !interstate ? Math.round((taxAmt / 2) * 100) / 100 : 0;
            const sgst = taxAmt > 0 && !interstate ? Math.round((taxAmt - cgst) * 100) / 100 : 0;
            const igst = taxAmt > 0 && interstate ? taxAmt : 0;
            return (
              <tr key={line.id}>
                <td className="font-medium leading-snug whitespace-normal">
                  {line.productName || "—"}
                  {line.hsn ? (
                    <span className="block text-[11px] text-muted-foreground font-normal">
                      HSN {line.hsn}
                    </span>
                  ) : null}
                </td>
                <td className="font-mono text-[12px] text-muted-foreground">
                  {line.sku?.trim() || "—"}
                </td>
                <td className="font-mono text-[12px] text-muted-foreground">
                  {line.batchNo?.trim() || "—"}
                </td>
                <td className="cnz-num">
                  {line.invoiceQty > 0 ? line.invoiceQty.toFixed(2) : "—"}
                </td>
                <td className="cnz-num">
                  {previouslyCredited > 0 ? previouslyCredited.toFixed(2) : "0.00"}
                </td>
                <td className="cnz-num">
                  {available > 0 ? available.toFixed(2) : "—"}
                </td>
                <td className="cnz-num">
                  {readOnly ? (
                    <span>{line.returnQty > 0 ? line.returnQty.toFixed(2) : "—"}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      max={Number.isFinite(maxQty) ? maxQty : undefined}
                      className={cn(
                        "cnz-cell-input h-8 w-[64px] text-xs text-right tabular-nums ml-auto",
                        overMax && "border-red-400",
                      )}
                      value={line.returnQty || ""}
                      onChange={(e) => onQtyChange(line.id, parseFloat(e.target.value) || 0)}
                    />
                  )}
                </td>
                <td className="cnz-num">
                  {line.unitPrice > 0 ? line.unitPrice.toFixed(2) : "0.00"}
                </td>
                <td className="cnz-num">
                  {line.discountPct > 0 ? `${line.discountPct}%` : "0%"}
                </td>
                <td className="cnz-num">{line.taxPct > 0 ? `${line.taxPct}%` : "—"}</td>
                <td className="cnz-num">
                  {amounts && amounts.taxable > 0 ? amounts.taxable.toFixed(2) : "0.00"}
                </td>
                <td className="cnz-num">{cgst.toFixed(2)}</td>
                <td className="cnz-num">{sgst.toFixed(2)}</td>
                <td className="cnz-num">{igst.toFixed(2)}</td>
                <td className="cnz-num font-semibold">
                  {amounts && amounts.amount > 0 ? amounts.amount.toFixed(2) : "0.00"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
