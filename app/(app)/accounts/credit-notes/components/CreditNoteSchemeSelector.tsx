"use client";

import { useMemo } from "react";
import { formatNearExpiryBenefitLabel } from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";
import {
  listPendingSchemeSettlementOptions,
  type PendingSchemeSettlementOption,
} from "@/lib/accounts/scheme-settlement-data";
import { SearchableSelect } from "./SearchableSelect";

export interface CreditNoteSchemeSelectorProps {
  value: string;
  onChange: (key: string, option: PendingSchemeSettlementOption | null) => void;
  disabled?: boolean;
}

export function CreditNoteSchemeSelector({ value, onChange, disabled }: CreditNoteSchemeSelectorProps) {
  const pending = useMemo(() => listPendingSchemeSettlementOptions(), []);

  const options = useMemo(
    () =>
      pending.map((opt) => ({
        value: opt.key,
        label: opt.schemeCode,
        sub: `${opt.schemeName} · ${opt.invoiceNo} · ${opt.product}`,
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
    onChange(key, pending.find((o) => o.key === key) ?? null);
  };

  const benefitLabel = selected
    ? formatNearExpiryBenefitLabel(
        selected.benefitType as "Percentage" | "Fixed Amount",
        selected.benefitValue,
      )
    : "";

  return (
    <div className="space-y-2">
      <SearchableSelect
        label="Apply Scheme Code"
        value={value}
        onChange={handleSelect}
        options={options}
        placeholder="Search pending Near Expiry scheme…"
        disabled={disabled}
      />
      {selected && (
        <p className="text-[11px] text-muted-foreground">
          Scheme:{" "}
          <span className="font-medium text-foreground">
            {selected.schemeCode} | {selected.schemeName} | {benefitLabel}
          </span>
        </p>
      )}
    </div>
  );
}
