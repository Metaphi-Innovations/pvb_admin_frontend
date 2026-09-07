"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GenericLedgerHierarchySelect } from "@/components/accounts/GenericLedgerHierarchySelect";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export interface NoteParticularsTableProps {
  particular: string;
  onParticularChange: (value: string) => void;
  adjustmentLedgerId: string | number | null;
  onAdjustmentLedgerChange: (ledger: { id: any; accountName: string }) => void;
  adjustmentLedgerName?: string;
  qty: string;
  onQtyChange: (value: string) => void;
  rate: string;
  onRateChange: (value: string) => void;
  gstPct: string;
  onGstPctChange: (value: string) => void;
  gstApplicable: boolean;
  onGstApplicableChange: (value: boolean) => void;
  interstate?: boolean;
  disabled?: boolean;
  className?: string;
  /** @deprecated Unused — dropdown always filters ACTIVE + allowManualPosting. */
  ledgerFilter?: (ledger: import("@/services/ledger.service").LedgerDropdownItem) => boolean;
  /** Switch id prefix to avoid duplicate ids when both CN/DN mount (should not). */
  switchId?: string;
}

/**
 * Shared editable Particulars for Credit Note and Debit Note (all reference types).
 * Columns: Particular, Adjustment Ledger, Qty, Rate, Basic, GST Applicable, GST%, CGST, SGST, IGST, Line Total.
 */
export function NoteParticularsTable({
  particular,
  onParticularChange,
  adjustmentLedgerId,
  onAdjustmentLedgerChange,
  adjustmentLedgerName,
  qty,
  onQtyChange,
  rate,
  onRateChange,
  gstPct,
  onGstPctChange,
  gstApplicable,
  onGstApplicableChange,
  interstate = false,
  disabled = false,
  className,
  switchId = "note-gst-applicable",
}: NoteParticularsTableProps) {
  const totals = computeNoteParticularTotals(qty, rate, gstApplicable, gstPct, interstate);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn("w-full accounts-table", gstApplicable ? "min-w-[920px]" : "min-w-[640px]")}>
        <thead>
          <tr className="accounts-table-head-row bg-muted/40 border-b border-border">
            <th className="accounts-table-th text-left">Particular / Description</th>
            <th className="accounts-table-th text-left">Adjustment Ledger</th>
            <th className="accounts-table-th text-right">Qty</th>
            <th className="accounts-table-th text-right">Rate</th>
            <th className="accounts-table-th text-right">Basic Amount</th>
            <th className="accounts-table-th text-center">GST Applicable</th>
            {gstApplicable ? (
              <>
                <th className="accounts-table-th text-right">GST %</th>
                <th className="accounts-table-th text-right">CGST</th>
                <th className="accounts-table-th text-right">SGST</th>
                <th className="accounts-table-th text-right">IGST</th>
              </>
            ) : null}
            <th className="accounts-table-th text-right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/40">
            <td className="px-2 py-1" style={{ minWidth: 140 }}>
              <Input
                className="h-[28px] text-xs font-normal"
                value={particular}
                onChange={(e) => onParticularChange(e.target.value)}
                placeholder="Particular / description"
                disabled={disabled}
                aria-label="Particular"
              />
            </td>
            <td className="px-2 py-1" style={{ minWidth: 160 }}>
              <GenericLedgerHierarchySelect
                value={adjustmentLedgerId ? String(adjustmentLedgerId) : null}
                onChange={(ledger) =>
                  onAdjustmentLedgerChange({
                    id: ledger.ledgerId,
                    accountName: ledger.ledgerName,
                  })
                }
                fallbackLabel={adjustmentLedgerName}
                placeholder="Select ledger…"
                disabled={disabled}
                className="h-[28px] w-full text-left font-normal text-xs"
                compact
                query={{ status: "ACTIVE" }}
              />
            </td>
            <td className="px-2 py-1 text-right" style={{ width: 64 }}>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="h-[28px] w-14 text-xs text-right font-normal ml-auto"
                value={qty}
                onChange={(e) => onQtyChange(e.target.value)}
                disabled={disabled}
                aria-label="Quantity"
              />
            </td>
            <td className="px-2 py-1 text-right" style={{ width: 96 }}>
              <AccountsMoneyInput
                className="h-[28px] w-24 text-xs text-right font-normal ml-auto border border-border"
                value={rate}
                onChange={(v) => onRateChange(String(v))}
                disabled={disabled}
              />
            </td>
            <td className="px-2 py-1 text-right" style={{ minWidth: 88 }}>
              <div className="cdn-cell-value">{formatMoney(totals.basicAmount)}</div>
            </td>
            <td className="px-2 py-1 text-center">
              <div className="inline-flex items-center justify-center h-[28px]">
                <Switch
                  id={switchId}
                  checked={gstApplicable}
                  onCheckedChange={onGstApplicableChange}
                  disabled={disabled}
                  aria-label="GST Applicable"
                />
              </div>
            </td>
            {gstApplicable ? (
              <>
                <td className="px-2 py-1 text-right" style={{ width: 56 }}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    disabled={disabled}
                    className="h-[28px] text-xs text-right ml-auto w-12 font-normal"
                    value={gstPct || ""}
                    onChange={(e) => onGstPctChange(e.target.value)}
                    aria-label="GST percent"
                  />
                </td>
                <td className="px-2 py-1 text-right" style={{ minWidth: 72 }}>
                  <div className="cdn-cell-value">{formatMoney(totals.cgst)}</div>
                </td>
                <td className="px-2 py-1 text-right" style={{ minWidth: 72 }}>
                  <div className="cdn-cell-value">{formatMoney(totals.sgst)}</div>
                </td>
                <td className="px-2 py-1 text-right" style={{ minWidth: 72 }}>
                  <div className="cdn-cell-value">{formatMoney(totals.igst)}</div>
                </td>
              </>
            ) : null}
            <td className="px-2 py-1 text-right" style={{ minWidth: 88 }}>
              <div className="cdn-cell-value">{formatMoney(totals.lineTotal)}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Basic = Qty × Rate; Line Total = Basic + GST when applicable. */
export function computeNoteParticularTotals(
  qty: string,
  rate: string,
  gstApplicable: boolean,
  gstPct: string,
  interstate = false,
) {
  const qtyN = parseFloat(qty);
  const rateN = parseFloat(rate);
  const q = Number.isFinite(qtyN) && qtyN > 0 ? qtyN : 0;
  const r = Number.isFinite(rateN) && rateN > 0 ? rateN : 0;
  const basicAmount = Math.round(q * r * 100) / 100;
  const taxRate = parseFloat(gstPct) || 0;
  const gstAmount =
    gstApplicable && taxRate > 0
      ? Math.round(basicAmount * (taxRate / 100) * 100) / 100
      : 0;
  const lineTotal = Math.round((basicAmount + gstAmount) * 100) / 100;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (gstAmount > 0) {
    if (interstate) {
      igst = gstAmount;
    } else {
      cgst = Math.round((gstAmount / 2) * 100) / 100;
      sgst = Math.round((gstAmount - cgst) * 100) / 100;
    }
  }
  return {
    qty: q,
    rate: r,
    basicAmount,
    taxable: basicAmount,
    gstAmount,
    total: lineTotal,
    lineTotal,
    ratePct: taxRate,
    cgst,
    sgst,
    igst,
  };
}

/** @deprecated Prefer computeNoteParticularTotals — kept for Fresh* re-exports. */
export function computeFreshCreditTotals(
  taxableAmount: string,
  gstApplicable: boolean,
  gstPct: string,
  interstate = false,
) {
  return computeNoteParticularTotals("1", taxableAmount, gstApplicable, gstPct, interstate);
}

/** @deprecated Prefer computeNoteParticularTotals — kept for Fresh* re-exports. */
export function computeFreshDebitTotals(
  taxableAmount: string,
  gstApplicable: boolean,
  gstPct: string,
) {
  return computeNoteParticularTotals("1", taxableAmount, gstApplicable, gstPct, false);
}
