"use client";

/**
 * Accounting controls for Generic Ledgers only.
 * Legal entity fields (GSTIN, PAN, address, contacts, bank details) belong in ERP Masters.
 */

import React from "react";
import { Label } from "@/components/ui/label";
import { CompactToggle } from "@/components/ui/ActiveInactiveToggle";

export interface GenericLedgerControls {
  costCenterApplicable: boolean;
  billWiseAccounting: boolean;
  gstApplicable: boolean;
  tdsApplicable: boolean;
  tcsApplicable: boolean;
}

interface LedgerTypeFieldsProps {
  value: GenericLedgerControls;
  readOnly?: boolean;
  onChange: (value: GenericLedgerControls) => void;
}

function YesNoRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
      <div>
        <Label className="text-xs">{label}</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">{checked ? "Yes" : "No"}</p>
      </div>
      <CompactToggle
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        activeLabel="Yes"
        inactiveLabel="No"
      />
    </div>
  );
}

export function LedgerTypeFields({ value, readOnly, onChange }: LedgerTypeFieldsProps) {
  const set = (patch: Partial<GenericLedgerControls>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <YesNoRow
          label="Cost Centre Applicable"
          checked={value.costCenterApplicable}
          disabled={readOnly}
          onChange={(v) => set({ costCenterApplicable: v })}
        />
        <YesNoRow
          label="Bill-wise Accounting"
          checked={value.billWiseAccounting}
          disabled={readOnly}
          onChange={(v) => set({ billWiseAccounting: v })}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <YesNoRow
          label="GST Applicable"
          checked={value.gstApplicable}
          disabled={readOnly}
          onChange={(v) => set({ gstApplicable: v })}
        />
        <YesNoRow
          label="TDS Applicable"
          checked={value.tdsApplicable}
          disabled={readOnly}
          onChange={(v) => set({ tdsApplicable: v })}
        />
        <YesNoRow
          label="TCS Applicable"
          checked={value.tcsApplicable}
          disabled={readOnly}
          onChange={(v) => set({ tcsApplicable: v })}
        />
      </div>
    </div>
  );
}
