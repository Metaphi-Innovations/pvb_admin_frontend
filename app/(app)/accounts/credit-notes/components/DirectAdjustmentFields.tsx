"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { SearchableSelect } from "./SearchableSelect";
import { cn } from "@/lib/utils";

export interface DirectAdjustmentFieldsProps {
  partyLabel: string;
  partySelector: React.ReactNode;
  reasonLabel?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  reasonOptions: { value: string; label: string }[];
  referenceInvoiceLabel?: string;
  referenceInvoiceValue: string;
  onReferenceInvoiceChange: (value: string) => void;
  referenceInvoiceOptions: { value: string; label: string; sub?: string }[];
  amount: string;
  onAmountChange: (value: string) => void;
  gstApplicable: boolean;
  onGstApplicableChange: (value: boolean) => void;
  gstPct: string;
  onGstPctChange: (value: string) => void;
  remarks: string;
  onRemarksChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DirectAdjustmentFields({
  partyLabel,
  partySelector,
  reasonLabel = "Reason",
  reason,
  onReasonChange,
  reasonOptions,
  referenceInvoiceLabel = "Reference Invoice (Optional)",
  referenceInvoiceValue,
  onReferenceInvoiceChange,
  referenceInvoiceOptions,
  amount,
  onAmountChange,
  gstApplicable,
  onGstApplicableChange,
  gstPct,
  onGstPctChange,
  remarks,
  onRemarksChange,
  disabled,
  className,
}: DirectAdjustmentFieldsProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}>
      <div className="md:col-span-2 space-y-1">
        <Label className="text-xs font-medium">{partyLabel}</Label>
        {partySelector}
      </div>

      <SearchableSelect
        label={reasonLabel}
        value={reason}
        onChange={onReasonChange}
        options={reasonOptions}
        placeholder="Select reason…"
        required
        disabled={disabled}
      />

      <SearchableSelect
        label={referenceInvoiceLabel}
        value={referenceInvoiceValue}
        onChange={onReferenceInvoiceChange}
        options={referenceInvoiceOptions}
        placeholder="None"
        disabled={disabled}
      />

      <div className="space-y-1">
        <Label className="text-xs font-medium">
          Amount <span className="text-red-500">*</span>
        </Label>
        <AccountsMoneyInput
          className="h-9 text-[13px] font-medium"
          value={amount}
          onChange={(v) => onAmountChange(String(v))}
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
              className="h-9 text-[13px]"
              value={gstPct}
              onChange={(e) => onGstPctChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="md:col-span-2 space-y-1">
        <Label className="text-xs font-medium">Remarks</Label>
        <Textarea
          className="min-h-[72px] text-[13px] resize-none"
          value={remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          placeholder="Additional remarks…"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
