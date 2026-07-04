"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { SearchableSelect } from "./SearchableSelect";
import { LinkedInvoicesMultiSelect, type LinkedInvoiceOption } from "./LinkedInvoicesMultiSelect";
import { MANUAL_CREDIT_REASONS, type CreditNoteLinkedInvoice } from "../credit-notes-data";
import { formatINR } from "../note-utils";

export interface FreshCreditNoteFormProps {
  customerSelector?: React.ReactNode | null;
  reason: string;
  onReasonChange: (value: string) => void;
  referenceNo: string;
  onReferenceNoChange: (value: string) => void;
  linkedInvoices: CreditNoteLinkedInvoice[];
  onLinkedInvoicesChange: (invoices: CreditNoteLinkedInvoice[]) => void;
  linkedInvoiceOptions: LinkedInvoiceOption[];
  adjustmentLedgerId: number | null;
  onAdjustmentLedgerChange: (ledger: { id: number; accountName: string }) => void;
  taxableAmount: string;
  onTaxableAmountChange: (value: string) => void;
  gstPct: string;
  onGstPctChange: (value: string) => void;
  gstApplicable: boolean;
  onGstApplicableChange: (value: boolean) => void;
  narration: string;
  onNarrationChange: (value: string) => void;
  attachmentName: string;
  onAttachmentChange: (fileName: string) => void;
  disabled?: boolean;
  /** When true, hides GST/total/narration/attachment (provided by AccountingSummary). */
  hideSummaryFields?: boolean;
}

export function FreshCreditNoteForm({
  customerSelector,
  reason,
  onReasonChange,
  referenceNo,
  onReferenceNoChange,
  linkedInvoices,
  onLinkedInvoicesChange,
  linkedInvoiceOptions,
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
  attachmentName,
  onAttachmentChange,
  disabled,
  hideSummaryFields,
}: FreshCreditNoteFormProps) {
  const { gstAmount, total } = computeFreshCreditTotals(taxableAmount, gstApplicable, gstPct);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {customerSelector != null && (
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs font-medium">
              Customer <span className="text-red-500">*</span>
            </Label>
            {customerSelector}
          </div>
        )}

        <SearchableSelect
          label="Reason / Adjustment Type"
          value={reason}
          onChange={onReasonChange}
          options={MANUAL_CREDIT_REASONS.map((r) => ({ value: r, label: r }))}
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
            placeholder="Invoice / memo ref…"
            disabled={disabled}
          />
        </div>

        <LinkedInvoicesMultiSelect
          value={linkedInvoices}
          onChange={onLinkedInvoicesChange}
          options={linkedInvoiceOptions}
          disabled={disabled}
        />

        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs font-medium">
            Ledger Selection <span className="text-red-500">*</span>
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

        {!hideSummaryFields && (
          <>
            <div className="space-y-1">
              <Label className="text-xs font-medium">GST Amount</Label>
              <Input className="h-9 text-sm bg-muted/30 tabular-nums" disabled value={formatINR(gstAmount)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Total Amount</Label>
              <Input
                className="h-9 text-sm bg-muted/30 tabular-nums font-semibold text-brand-700"
                disabled
                value={formatINR(total)}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Narration</Label>
              <Textarea
                className="min-h-[72px] text-xs resize-none"
                value={narration}
                onChange={(e) => onNarrationChange(e.target.value)}
                placeholder="Details of customer adjustment…"
                disabled={disabled}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Attachment (Optional)</Label>
              <Input
                type="file"
                className="h-9 text-xs"
                disabled={disabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  onAttachmentChange(file?.name ?? "");
                }}
              />
              {attachmentName && (
                <p className="text-[11px] text-muted-foreground">Selected: {attachmentName}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function computeFreshCreditTotals(taxableAmount: string, gstApplicable: boolean, gstPct: string) {
  const taxable = parseFloat(taxableAmount) || 0;
  const rate = parseFloat(gstPct) || 0;
  const gstAmount = gstApplicable ? Math.round(taxable * (rate / 100) * 100) / 100 : 0;
  const total = Math.round((taxable + gstAmount) * 100) / 100;
  return { taxable, gstAmount, total, rate };
}
