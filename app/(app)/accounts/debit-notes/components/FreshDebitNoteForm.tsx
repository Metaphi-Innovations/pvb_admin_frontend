"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { SearchableSelect } from "../../credit-notes/components/SearchableSelect";
import { FRESH_DEBIT_REASONS } from "../debit-notes-data";
import { formatINR } from "../note-utils";

export interface FreshDebitNoteFormProps {
  vendorSelector: React.ReactNode;
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
}

export function FreshDebitNoteForm({
  vendorSelector,
  debitNoteDate,
  onDebitNoteDateChange,
  reason,
  onReasonChange,
  referenceNo,
  onReferenceNoChange,
  adjustmentLedgerId,
  onAdjustmentLedgerChange,
  taxableAmount,
  onTaxableAmountChange,
  gstPct,
  onGstPctChange,
  gstApplicable,
  onGstApplicableChange,
  narration,
  onNarrationChange,
  disabled,
}: FreshDebitNoteFormProps) {
  const taxable = parseFloat(taxableAmount) || 0;
  const rate = parseFloat(gstPct) || 0;
  const gstAmount = gstApplicable ? Math.round(taxable * (rate / 100) * 100) / 100 : 0;
  const total = Math.round((taxable + gstAmount) * 100) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Debit Note Date</Label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={debitNoteDate}
            onChange={(e) => onDebitNoteDateChange(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs font-medium">
            Supplier <span className="text-red-500">*</span>
          </Label>
          {vendorSelector}
        </div>

        <SearchableSelect
          label="Reason / Adjustment Type"
          value={reason}
          onChange={onReasonChange}
          options={FRESH_DEBIT_REASONS.map((r) => ({ value: r, label: r }))}
          placeholder="Select adjustment type…"
          required
          disabled={disabled}
        />

        <div className="space-y-1">
          <Label className="text-xs font-medium">Reference No. (Optional)</Label>
          <Input
            className="h-9 text-sm"
            value={referenceNo}
            onChange={(e) => onReferenceNoChange(e.target.value)}
            placeholder="Invoice / PO / memo ref…"
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs font-medium">
            Item / Ledger <span className="text-red-500">*</span>
          </Label>
          <GroupedLedgerSelect
            value={adjustmentLedgerId}
            onChange={(ledger) => onAdjustmentLedgerChange({ id: ledger.id, accountName: ledger.accountName })}
            placeholder="Select adjustment ledger…"
            required
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Taxable Amount <span className="text-red-500">*</span>
          </Label>
          <AccountsMoneyInput
            className="h-9 text-sm font-medium"
            value={taxableAmount}
            onChange={(v) => onTaxableAmountChange(String(v))}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-brand-600"
              checked={gstApplicable}
              onChange={(e) => onGstApplicableChange(e.target.checked)}
              disabled={disabled}
            />
            <span className="text-xs font-medium text-foreground">GST Applicable</span>
          </label>
          {gstApplicable && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">GST %</Label>
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
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">GST Amount</Label>
          <Input className="h-9 text-sm bg-muted/30 tabular-nums" disabled value={formatINR(gstAmount)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Total Amount</Label>
          <Input className="h-9 text-sm bg-muted/30 tabular-nums font-semibold text-brand-700" disabled value={formatINR(total)} />
        </div>

        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs font-medium">Narration</Label>
          <Textarea
            className="min-h-[72px] text-xs resize-none"
            value={narration}
            onChange={(e) => onNarrationChange(e.target.value)}
            placeholder="Details of supplier adjustment…"
            disabled={disabled}
          />
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
