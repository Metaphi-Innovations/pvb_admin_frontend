"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { cn } from "@/lib/utils";
import { isTdsCoaLedger } from "@/lib/accounts/tds-coa-sync";
import type { AutocompleteOption } from "@/components/ui/AutocompleteSelect";
import { DirectPurchaseSelectField } from "./DirectPurchaseSelectField";
import { DP_FIELD_CLASS, DP_LABEL_CLASS } from "./direct-purchase-form-ui";

const YES_NO = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
] as const;

function PillToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-7 px-2.5 text-xs rounded-lg border font-medium transition-colors",
            value === o.value
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border text-muted-foreground hover:bg-muted",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <PillToggle
        value={value ? "yes" : "no"}
        options={[...YES_NO]}
        onChange={(v) => onChange(v === "yes")}
        disabled={disabled}
      />
    </div>
  );
}

export function PurchaseInvoiceDirectTaxCompliance({
  gstApplicable,
  reverseCharge,
  onReverseChargeChange,
  rcmCgst,
  rcmSgst,
  rcmIgst,
  onRcmCgstChange,
  onRcmSgstChange,
  onRcmIgstChange,
  invoiceTds,
  onInvoiceTdsChange,
  tdsSectionMasterId,
  onTdsSectionSelect,
  tdsSectionOptions,
  tdsRate,
  onTdsRateChange,
  tdsBaseAmount,
  onTdsBaseAmountChange,
  tdsAmount,
  onTdsAmountChange,
  tdsLedgerId,
  tdsLedgerName,
  onTdsLedgerChange,
  lineTaxableAmount,
  readOnly,
}: {
  gstApplicable: boolean;
  reverseCharge: boolean;
  onReverseChargeChange: (v: boolean) => void;
  rcmCgst: number;
  rcmSgst: number;
  rcmIgst: number;
  onRcmCgstChange: (v: number) => void;
  onRcmSgstChange: (v: number) => void;
  onRcmIgstChange: (v: number) => void;
  invoiceTds: boolean;
  onInvoiceTdsChange: (v: boolean) => void;
  tdsSectionMasterId: number | null;
  onTdsSectionSelect: (id: string) => void;
  tdsSectionOptions: AutocompleteOption[];
  tdsRate: number;
  onTdsRateChange: (rate: number, amount: number) => void;
  tdsBaseAmount: number;
  onTdsBaseAmountChange: (base: number, amount: number) => void;
  tdsAmount: number;
  onTdsAmountChange: (v: number) => void;
  tdsLedgerId: number | null;
  tdsLedgerName: string;
  onTdsLedgerChange: (id: number, name: string) => void;
  lineTaxableAmount: number;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (gstApplicable ? 1 : 0) + (reverseCharge ? 1 : 0) + (invoiceTds ? 1 : 0);

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border bg-white shadow-sm overflow-hidden flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/20 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Tax &amp; Compliance</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            GST, reverse charge, and TDS settings
            {!open && activeCount > 0 && (
              <span className="ml-1.5 text-brand-700 font-medium">
                · {activeCount} active
              </span>
            )}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-3 py-3 space-y-4 bg-muted/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <ToggleRow
                label="GST Applicable"
                value={gstApplicable}
                onChange={() => {}}
                disabled
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Derived from line GST rates
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <ToggleRow
                label="Reverse Charge"
                value={reverseCharge}
                onChange={onReverseChargeChange}
                disabled={readOnly}
              />
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <ToggleRow
                label="TDS Applicable"
                value={invoiceTds}
                onChange={onInvoiceTdsChange}
                disabled={readOnly}
              />
            </div>
          </div>

          {reverseCharge && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-2">
                Reverse Charge (RCM)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
                <div className="space-y-1">
                  <Label className={DP_LABEL_CLASS}>RCM CGST</Label>
                  <AccountsMoneyInput
                    className={cn(DP_FIELD_CLASS, "text-right")}
                    value={rcmCgst}
                    disabled={readOnly}
                    onChange={onRcmCgstChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={DP_LABEL_CLASS}>RCM SGST</Label>
                  <AccountsMoneyInput
                    className={cn(DP_FIELD_CLASS, "text-right")}
                    value={rcmSgst}
                    disabled={readOnly}
                    onChange={onRcmSgstChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={DP_LABEL_CLASS}>RCM IGST</Label>
                  <AccountsMoneyInput
                    className={cn(DP_FIELD_CLASS, "text-right")}
                    value={rcmIgst}
                    disabled={readOnly}
                    onChange={onRcmIgstChange}
                  />
                </div>
              </div>
            </div>
          )}

          {invoiceTds && (
            <div className="rounded-lg border border-border bg-background px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                TDS Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <DirectPurchaseSelectField
                  label="TDS Section"
                  required
                  value={tdsSectionMasterId != null ? String(tdsSectionMasterId) : ""}
                  onChange={onTdsSectionSelect}
                  options={tdsSectionOptions}
                  placeholder="Section…"
                  searchPlaceholder="Search…"
                  disabled={readOnly}
                />
                <div className="space-y-1">
                  <Label className={DP_LABEL_CLASS}>TDS Rate %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className={cn(DP_FIELD_CLASS, "text-right")}
                    value={tdsRate || ""}
                    readOnly={readOnly}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const base = tdsBaseAmount > 0 ? tdsBaseAmount : lineTaxableAmount;
                      onTdsRateChange(rate, Math.round((base * rate) / 100 * 100) / 100);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={DP_LABEL_CLASS}>TDS Base</Label>
                  <AccountsMoneyInput
                    className={cn(DP_FIELD_CLASS, "text-right")}
                    value={tdsBaseAmount}
                    disabled={readOnly}
                    onChange={(v) => {
                      onTdsBaseAmountChange(
                        v,
                        tdsRate > 0 ? Math.round((v * tdsRate) / 100 * 100) / 100 : tdsAmount,
                      );
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={DP_LABEL_CLASS}>TDS Amount</Label>
                  <AccountsMoneyInput
                    className={cn(DP_FIELD_CLASS, "text-right")}
                    value={tdsAmount}
                    disabled={readOnly}
                    onChange={onTdsAmountChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={DP_LABEL_CLASS}>TDS Ledger</Label>
                  <GroupedLedgerSelect
                    compact
                    value={tdsLedgerId}
                    fallbackLabel={tdsLedgerName}
                    placeholder="TDS ledger…"
                    disabled={readOnly}
                    contentClassName="min-w-[min(420px,92vw)] w-[max(var(--radix-popover-trigger-width),420px)]"
                    ledgerFilter={(l) => isTdsCoaLedger(l)}
                    onChange={(ledger) => onTdsLedgerChange(ledger.id, ledger.accountName)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
