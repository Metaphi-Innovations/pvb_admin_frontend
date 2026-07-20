"use client";

import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { cn } from "@/lib/utils";
import { formatINR } from "../note-utils";

function GstToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="cnz-gst-toggle" role="group" aria-label="GST Applicable">
      {(["No", "Yes"] as const).map((label, i) => {
        const yes = i === 1;
        return (
          <button
            key={label}
            type="button"
            disabled={disabled}
            data-active={value === yes ? "true" : "false"}
            onClick={() => onChange(yes)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export interface FreshCreditNoteFormProps {
  particular: string;
  onParticularChange: (value: string) => void;
  adjustmentLedgerId: number | null;
  onAdjustmentLedgerChange: (ledger: { id: number; accountName: string }) => void;
  taxableAmount: string;
  onTaxableAmountChange: (value: string) => void;
  gstPct: string;
  onGstPctChange: (value: string) => void;
  gstApplicable: boolean;
  onGstApplicableChange: (value: boolean) => void;
  interstate?: boolean;
  disabled?: boolean;
}

/** Amount-based particulars — Accounts table chrome, compact cell controls. */
export function FreshCreditNoteForm({
  particular,
  onParticularChange,
  adjustmentLedgerId,
  onAdjustmentLedgerChange,
  taxableAmount,
  onTaxableAmountChange,
  gstPct,
  onGstPctChange,
  gstApplicable,
  onGstApplicableChange,
  interstate = false,
  disabled,
}: FreshCreditNoteFormProps) {
  const { taxable, total, cgst, sgst, igst } = computeFreshCreditTotals(
    taxableAmount,
    gstApplicable,
    gstPct,
    interstate,
  );

  const headers = [
    { label: "Particular", className: "" },
    { label: "Adjustment Ledger", className: "" },
    { label: "Amount", className: "text-right" },
    { label: "GST Applicable", className: "" },
    { label: "GST %", className: "text-right" },
    ...(interstate
      ? [{ label: "IGST", className: "text-right" }]
      : [
          { label: "CGST", className: "text-right" },
          { label: "SGST", className: "text-right" },
        ]),
    { label: "Line Total", className: "text-right" },
  ];

  return (
    <div className="cnz-table-wrap">
      <table className="cnz-table cnz-table--amt accounts-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h.label} className={cn("accounts-table-th", h.className)}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="accounts-table-td" style={{ minWidth: 160 }}>
              <Input
                className="cnz-cell-input h-7 text-xs"
                value={particular}
                onChange={(e) => onParticularChange(e.target.value)}
                placeholder="Particular / description"
                disabled={disabled}
                aria-label="Particular"
              />
            </td>
            <td className="accounts-table-td" style={{ minWidth: 160 }}>
              <GroupedLedgerSelect
                value={adjustmentLedgerId}
                onChange={(ledger) =>
                  onAdjustmentLedgerChange({
                    id: ledger.id,
                    accountName: ledger.accountName,
                  })
                }
                placeholder="Select ledger"
                required
                disabled={disabled}
                compact
              />
            </td>
            <td className="accounts-table-td cnz-num" style={{ width: 108 }}>
              <AccountsMoneyInput
                className="cnz-cell-input h-7 text-xs text-right ml-auto"
                value={taxableAmount}
                onChange={(v) => onTaxableAmountChange(String(v))}
                disabled={disabled}
              />
            </td>
            <td className="accounts-table-td" style={{ width: 108 }}>
              <GstToggle
                value={gstApplicable}
                disabled={disabled}
                onChange={(next) => {
                  onGstApplicableChange(next);
                  if (next && !(parseFloat(gstPct) > 0)) onGstPctChange("18");
                }}
              />
            </td>
            <td className="accounts-table-td cnz-num" style={{ width: 68 }}>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                disabled={disabled || !gstApplicable}
                className={cn(
                  "cnz-cell-input h-7 text-xs text-right ml-auto w-14",
                  !gstApplicable && "bg-muted/25",
                )}
                value={gstApplicable ? gstPct || "" : ""}
                onChange={(e) => onGstPctChange(e.target.value)}
                aria-label="GST percent"
              />
            </td>
            {interstate ? (
              <td className="accounts-table-td cnz-num text-muted-foreground">
                {gstApplicable && igst > 0 ? formatINR(igst) : "—"}
              </td>
            ) : (
              <>
                <td className="accounts-table-td cnz-num text-muted-foreground">
                  {gstApplicable && cgst > 0 ? formatINR(cgst) : "—"}
                </td>
                <td className="accounts-table-td cnz-num text-muted-foreground">
                  {gstApplicable && sgst > 0 ? formatINR(sgst) : "—"}
                </td>
              </>
            )}
            <td className="accounts-table-td cnz-num font-semibold">
              {taxable > 0 || total > 0 ? formatINR(total) : formatINR(0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function computeFreshCreditTotals(
  taxableAmount: string,
  gstApplicable: boolean,
  gstPct: string,
  interstate = false,
) {
  const taxable = parseFloat(taxableAmount) || 0;
  const rate = parseFloat(gstPct) || 0;
  const gstAmount = gstApplicable ? Math.round(taxable * (rate / 100) * 100) / 100 : 0;
  const total = Math.round((taxable + gstAmount) * 100) / 100;
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
  return { taxable, gstAmount, total, rate, cgst, sgst, igst };
}
