"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";

export interface VoucherNoteSourceLineView {
  id: string;
  productName: string;
  sku?: string;
  hsn?: string;
  batchNo?: string;
  mfgDate?: string;
  expiryDate?: string;
  sourceQty: number;
  noteQty: number;
  uom?: string;
  adjustmentLedgerId: number | null;
  rate: number;
  /** Display basic (before GST). */
  basicAmount: number;
  gstApplicable: boolean;
  gstPct: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface VoucherNoteSourceParticularsTableProps {
  lines: VoucherNoteSourceLineView[];
  readOnly?: boolean;
  /** When false, GST Applicable switch is shown but not editable. */
  gstSwitchEditable?: boolean;
  onNoteQtyChange: (lineId: string, qty: number) => void;
  onGstApplicableChange: (lineId: string, applicable: boolean) => void;
  onAdjustmentLedgerChange: (
    lineId: string,
    ledger: { id: number; accountName: string },
  ) => void;
  emptyMessage?: string;
  className?: string;
}

function fmtQty(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function fmtMeta(label: string, value?: string): string {
  const v = value?.trim();
  return `${label}: ${v || "—"}`;
}

/**
 * @deprecated Replaced by NoteReferenceDocumentDetails (read-only source)
 * + NoteParticularsTable (editable particulars). Do not use in active CN/DN routes.
 *
 * Source-document Particulars table for Credit / Debit Note only.
 */
export function VoucherNoteSourceParticularsTable({
  lines,
  readOnly,
  gstSwitchEditable = true,
  onNoteQtyChange,
  onGstApplicableChange,
  onAdjustmentLedgerChange,
  emptyMessage = "Select a source document to load product lines.",
  className,
}: VoucherNoteSourceParticularsTableProps) {
  if (!lines.length) {
    return (
      <div className={cn("px-3 py-6 text-center text-[12px] text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[1100px] accounts-table">
        <thead>
          <tr className="accounts-table-head-row bg-muted/40 border-b border-border">
            <th className="accounts-table-th text-left">Product Details</th>
            <th className="accounts-table-th text-left">HSN / SAC</th>
            <th className="accounts-table-th text-left">Batch</th>
            <th className="accounts-table-th text-right">Source Qty</th>
            <th className="accounts-table-th text-right">Note Qty</th>
            <th className="accounts-table-th text-left">UOM</th>
            <th className="accounts-table-th text-left">Adjustment Ledger</th>
            <th className="accounts-table-th text-right">Rate</th>
            <th className="accounts-table-th text-right">Basic Amount</th>
            <th className="accounts-table-th text-center">GST Applicable</th>
            <th className="accounts-table-th text-right">GST %</th>
            <th className="accounts-table-th text-right">CGST</th>
            <th className="accounts-table-th text-right">SGST</th>
            <th className="accounts-table-th text-right">IGST</th>
            <th className="accounts-table-th text-right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-border/40">
              <td className="px-2 py-1 min-w-[160px] max-w-[220px] whitespace-normal">
                <p className="text-[12px] font-normal text-foreground leading-snug">
                  {line.productName || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground font-normal mt-0.5 leading-tight">
                  {fmtMeta("SKU", line.sku)}
                </p>
                <p className="text-[10px] text-muted-foreground font-normal leading-tight">
                  {fmtMeta("MFG", line.mfgDate)}
                </p>
                <p className="text-[10px] text-muted-foreground font-normal leading-tight">
                  {fmtMeta("Expiry", line.expiryDate)}
                </p>
              </td>
              <td className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {line.hsn?.trim() || "—"}
              </td>
              <td className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {line.batchNo?.trim() || "—"}
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                {fmtQty(line.sourceQty)}
              </td>
              <td className="px-2 py-1 text-right" style={{ width: 72 }}>
                {readOnly ? (
                  <span className="tabular-nums text-[12px]">{fmtQty(line.noteQty)}</span>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="h-[26px] w-16 text-xs text-right font-normal ml-auto"
                    value={line.noteQty || ""}
                    onChange={(e) =>
                      onNoteQtyChange(line.id, parseFloat(e.target.value) || 0)
                    }
                    aria-label={`Note qty for ${line.productName}`}
                  />
                )}
              </td>
              <td className="px-2 py-1 text-[12px] text-muted-foreground">
                {line.uom?.trim() || "—"}
              </td>
              <td className="px-2 py-1 min-w-[140px]">
                <GroupedLedgerSelect
                  value={line.adjustmentLedgerId}
                  onChange={(ledger) =>
                    onAdjustmentLedgerChange(line.id, {
                      id: ledger.id,
                      accountName: ledger.accountName,
                    })
                  }
                  placeholder="Select ledger"
                  required
                  disabled={readOnly}
                  compact
                />
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                {line.rate > 0 ? line.rate.toFixed(2) : "0.00"}
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                {formatMoney(line.basicAmount)}
              </td>
              <td className="px-2 py-1 text-center">
                <div className="inline-flex items-center justify-center gap-1">
                  <Switch
                    checked={line.gstApplicable}
                    onCheckedChange={(v) => onGstApplicableChange(line.id, v)}
                    disabled={readOnly || !gstSwitchEditable}
                    aria-label={`GST applicable for ${line.productName}`}
                  />
                </div>
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                {line.gstApplicable && line.gstPct > 0 ? `${line.gstPct}%` : "—"}
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px] text-muted-foreground">
                {formatMoney(line.cgst)}
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px] text-muted-foreground">
                {formatMoney(line.sgst)}
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px] text-muted-foreground">
                {formatMoney(line.igst)}
              </td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px] font-normal">
                {formatMoney(line.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shared line amount helper for source rows (Note Qty × Rate + GST). */
export function computeNoteSourceLineAmounts(opts: {
  noteQty: number;
  rate: number;
  discountPct?: number;
  taxPct: number;
  gstApplicable: boolean;
  interstate?: boolean;
}): {
  basicAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
} {
  const qty = Math.max(0, opts.noteQty);
  const rate = Math.max(0, opts.rate);
  const discPct = Math.max(0, opts.discountPct ?? 0);
  const base = qty * rate;
  const basicAmount = Math.round(Math.max(0, base - base * (discPct / 100)) * 100) / 100;
  const effectiveTax = opts.gstApplicable ? Math.max(0, opts.taxPct) : 0;
  const gstAmount =
    effectiveTax > 0 ? Math.round(basicAmount * (effectiveTax / 100) * 100) / 100 : 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (gstAmount > 0) {
    if (opts.interstate) {
      igst = gstAmount;
    } else {
      cgst = Math.round((gstAmount / 2) * 100) / 100;
      sgst = Math.round((gstAmount - cgst) * 100) / 100;
    }
  }
  const lineTotal = Math.round((basicAmount + gstAmount) * 100) / 100;
  return { basicAmount, gstAmount, cgst, sgst, igst, lineTotal };
}
