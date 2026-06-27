"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import { formatNearExpiryBenefitLabel } from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";
import { formatSchemeRupee } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import {
  listPendingSchemeSettlementOptions,
  type PendingSchemeSettlementOption,
} from "@/lib/accounts/scheme-settlement-data";
import { formatINR } from "@/app/(app)/accounts/credit-notes/note-utils";

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xs font-medium truncate ${mono ? "font-mono text-brand-700" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export interface SchemeSettlementSelectorProps {
  value: string;
  onChange: (key: string, option: PendingSchemeSettlementOption | null) => void;
  settlementAmount: number;
  onSettlementAmountChange: (amount: number) => void;
  disabled?: boolean;
  variant?: "credit_note" | "journal_voucher";
}

export function SchemeSettlementSelector({
  value,
  onChange,
  settlementAmount,
  onSettlementAmountChange,
  disabled,
  variant = "credit_note",
}: SchemeSettlementSelectorProps) {
  const pending = useMemo(() => listPendingSchemeSettlementOptions(), []);

  const options = useMemo(
    () =>
      pending.map((opt) => ({
        value: opt.key,
        label: opt.schemeCode,
        sub: `${opt.customerName} · ${opt.invoiceNo} · ${formatINR(opt.estimatedBenefitAmount)}`,
      })),
    [pending],
  );

  const selected = useMemo(
    () => pending.find((o) => o.key === value) ?? null,
    [pending, value],
  );

  const handleSelect = (key: string) => {
    if (!key) {
      onChange("", null);
      return;
    }
    const opt = pending.find((o) => o.key === key) ?? null;
    onChange(key, opt);
    if (opt) onSettlementAmountChange(opt.estimatedBenefitAmount);
  };

  const isCreditNote = variant === "credit_note";
  const maxAmount = selected?.estimatedBenefitAmount ?? 0;

  return (
    <div className="space-y-3">
      <SearchableSelect
        label="Apply Scheme Code"
        value={value}
        onChange={handleSelect}
        options={options}
        placeholder="Search pending Near Expiry scheme…"
        disabled={disabled}
      />

      {selected && (
        <div className="rounded-lg border border-brand-200/80 bg-brand-50/20 p-3 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Scheme Settlement Details
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2">
            <DetailField label="Customer" value={selected.customerName} />
            <DetailField label="Invoice No" value={selected.invoiceNo} mono />
            {isCreditNote && (
              <DetailField label="Sales Order No" value={selected.salesOrderNo} mono />
            )}
            <DetailField label="Product" value={selected.product} />
            {isCreditNote && <DetailField label="Batch No" value={selected.batchNumber} mono />}
            <DetailField label="Scheme Name" value={selected.schemeName} />
            {isCreditNote && (
              <>
                <DetailField label="Benefit Type" value={selected.benefitType} />
                <DetailField
                  label="Benefit Value"
                  value={formatNearExpiryBenefitLabel(
                    selected.benefitType as "Percentage" | "Fixed Amount",
                    selected.benefitValue,
                  )}
                />
              </>
            )}
            <DetailField
              label="Estimated Benefit Amount"
              value={formatSchemeRupee(selected.estimatedBenefitAmount)}
            />
            <div>
              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Settlement Amount
              </Label>
              <Input
                type="number"
                min={0}
                max={maxAmount}
                step="0.01"
                className="mt-0.5 h-8 text-xs tabular-nums"
                value={settlementAmount || ""}
                onChange={(e) => onSettlementAmountChange(parseFloat(e.target.value) || 0)}
                disabled={disabled}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Max {formatSchemeRupee(maxAmount)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
