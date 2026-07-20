"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { formatINR } from "../note-utils";

export interface FreshDebitNoteFormProps {
  vendorSelector?: React.ReactNode;
  debitNoteDate: string;
  onDebitNoteDateChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  referenceNo: string;
  onReferenceNoChange: (value: string) => void;
  adjustmentLedgerId: number | null;
  adjustmentLedgerName: string;
  onAdjustmentLedgerChange: (ledger: { id: number; accountName: string }) => void;
  taxableAmount: string;
  onTaxableAmountChange: (value: string) => void;
  gstPct: string;
  onGstPctChange: (value: string) => void;
  gstApplicable: boolean;
  onGstApplicableChange: (value: boolean) => void;
  narration: string;
  onNarrationChange: (value: string) => void;
  disabled?: boolean;
  /** When true, only particulars table + GST controls (parent owns reference fields). */
  particularsOnly?: boolean;
}

/**
 * Amount-based Debit Note particulars — presentation only.
 */
export function FreshDebitNoteForm({
  reason,
  adjustmentLedgerId,
  onAdjustmentLedgerChange,
  taxableAmount,
  onTaxableAmountChange,
  gstPct,
  onGstPctChange,
  gstApplicable,
  onGstApplicableChange,
  disabled,
  particularsOnly = true,
}: FreshDebitNoteFormProps) {
  const { gstAmount, total } = computeFreshDebitTotals(taxableAmount, gstApplicable, gstPct);
  const taxTreatment = gstApplicable ? `GST ${gstPct || 0}%` : "Non-GST";

  return (
    <div className="space-y-3">
      {!particularsOnly ? null : null}

      <div className="cn-ws__table-wrap">
        <table className="cn-ws__table min-w-[640px]">
          <thead>
            <tr>
              <th>Description</th>
              <th>Adjustment Ledger</th>
              <th>Tax Treatment</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-xs">{reason || "Direct Adjustment"}</td>
              <td className="text-xs">
                <GroupedLedgerSelect
                  value={adjustmentLedgerId}
                  onChange={(ledger) =>
                    onAdjustmentLedgerChange({
                      id: ledger.id,
                      accountName: ledger.accountName,
                    })
                  }
                  placeholder="Select ledger…"
                  required
                  disabled={disabled}
                />
              </td>
              <td className="text-xs">{taxTreatment}</td>
              <td className="cn-num">
                <AccountsMoneyInput
                  className="h-7 w-28 text-xs text-right font-medium ml-auto"
                  value={taxableAmount}
                  onChange={(v) => onTaxableAmountChange(String(v))}
                  disabled={disabled}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-4 px-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 rounded accent-brand-600"
            checked={gstApplicable}
            onChange={(e) => onGstApplicableChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="text-[11px] font-medium">GST Applicable</span>
        </label>
        {gstApplicable ? (
          <div className="cn-ws__field w-24">
            <Label className="text-[11px] font-medium text-muted-foreground">GST %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              className="h-9 text-sm"
              value={gstPct}
              onChange={(e) => onGstPctChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        ) : null}
        <div className="ml-auto text-xs text-muted-foreground tabular-nums">
          GST {formatINR(gstAmount)} · Line total {formatINR(total)}
        </div>
      </div>
    </div>
  );
}

export function computeFreshDebitTotals(taxableAmount: string, gstApplicable: boolean, gstPct: string) {
  const taxable = parseFloat(taxableAmount) || 0;
  const rate = parseFloat(gstPct) || 0;
  const gstAmount = gstApplicable ? Math.round(taxable * (rate / 100) * 100) / 100 : 0;
  const total = Math.round((taxable + gstAmount) * 100) / 100;
  return { taxable, gstAmount, total, rate };
}
