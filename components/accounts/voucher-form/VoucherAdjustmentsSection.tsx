"use client";

/**
 * Compact generic Adjustments section for Payment / Receipt vouchers.
 * Ledger-based rows — not fixed fields per adjustment type.
 */

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VoucherSelectContent,
} from "@/components/accounts/voucher-simple-form-ui";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export const VOUCHER_ADJUSTMENT_TYPES = [
  "TDS",
  "Customer TDS",
  "Bank Charges",
  "Discount Allowed",
  "Discount Received",
  "Round Off",
  "Other Adjustment",
] as const;

export type VoucherAdjustmentType = (typeof VOUCHER_ADJUSTMENT_TYPES)[number];

export type VoucherAdjustmentSide = "debit" | "credit";

export interface VoucherAdjustmentRow {
  id: string;
  adjustmentType: VoucherAdjustmentType;
  ledgerId: number | null;
  ledgerName: string;
  /** Accounting side for the selected adjustment ledger. */
  debitOrCredit: VoucherAdjustmentSide;
  amount: number;
}

/** Types available for Payment vs Receipt (transaction-appropriate filtering). */
export function allowedAdjustmentTypes(
  voucherKind: "payment" | "receipt",
): VoucherAdjustmentType[] {
  if (voucherKind === "payment") {
    return ["TDS", "Bank Charges", "Discount Received", "Round Off", "Other Adjustment"];
  }
  return ["Customer TDS", "TDS", "Bank Charges", "Discount Allowed", "Round Off", "Other Adjustment"];
}

/** Suggested Dr/Cr for each adjustment type on Payment vs Receipt. */
export function defaultAdjustmentSide(
  type: VoucherAdjustmentType,
  voucherKind: "payment" | "receipt",
): VoucherAdjustmentSide {
  if (voucherKind === "payment") {
    switch (type) {
      case "TDS":
        return "credit"; // Cr TDS Payable (reduces bank)
      case "Bank Charges":
        return "debit"; // Dr Bank Charges
      case "Discount Received":
        return "credit"; // Cr Discount Received
      case "Round Off":
        return "debit";
      case "Other Adjustment":
        return "debit";
      default:
        return "debit";
    }
  }
  // Receipt
  switch (type) {
    case "Customer TDS":
    case "TDS":
      return "debit"; // Dr TDS Receivable
    case "Bank Charges":
      return "debit";
    case "Discount Allowed":
      return "debit";
    case "Round Off":
      return "credit";
    case "Other Adjustment":
      return "debit";
    default:
      return "debit";
  }
}

export function createEmptyAdjustmentRow(
  voucherKind: "payment" | "receipt",
  type: VoucherAdjustmentType = "Other Adjustment",
): VoucherAdjustmentRow {
  return {
    id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    adjustmentType: type,
    ledgerId: null,
    ledgerName: "",
    debitOrCredit: defaultAdjustmentSide(type, voucherKind),
    amount: 0,
  };
}

/**
 * Net effect on cash/bank vs gross.
 * Payment: credit adj reduce bank outflow; debit adj (e.g. bank charges) increase it.
 * Receipt: debit adj reduce bank inflow; credit adj increase it.
 */
export function sumAdjustmentEffect(
  rows: VoucherAdjustmentRow[],
  voucherKind: "payment" | "receipt",
): number {
  return roundMoney(
    rows.reduce((sum, row) => {
      const amt = roundMoney(row.amount);
      if (amt <= 0) return sum;
      if (voucherKind === "payment") {
        return row.debitOrCredit === "credit" ? sum + amt : sum - amt;
      }
      return row.debitOrCredit === "debit" ? sum + amt : sum - amt;
    }, 0),
  );
}

/** Preview rows for accounting impact (ledger + Dr/Cr + amount). */
export function adjustmentRowsToPreviewLines(rows: VoucherAdjustmentRow[]): {
  id: string;
  adjustmentType: string;
  ledgerId: number | null;
  ledgerName: string;
  debitOrCredit: VoucherAdjustmentSide;
  amount: number;
}[] {
  return rows
    .filter((r) => roundMoney(r.amount) > 0)
    .map((r) => ({
      id: r.id,
      adjustmentType: r.adjustmentType,
      ledgerId: r.ledgerId,
      ledgerName: r.ledgerName.trim() || "(Select ledger)",
      debitOrCredit: r.debitOrCredit,
      amount: roundMoney(r.amount),
    }));
}

export interface VoucherAdjustmentsSectionProps {
  voucherKind: "payment" | "receipt";
  rows: VoucherAdjustmentRow[];
  onChange: (rows: VoucherAdjustmentRow[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function VoucherAdjustmentsSection({
  voucherKind,
  rows,
  onChange,
  readOnly,
  className,
}: VoucherAdjustmentsSectionProps) {
  const updateRow = (id: string, patch: Partial<VoucherAdjustmentRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    const defaultType: VoucherAdjustmentType =
      voucherKind === "payment" ? "TDS" : "Customer TDS";
    onChange([...rows, createEmptyAdjustmentRow(voucherKind, defaultType)]);
  };

  return (
    <div className={cn("mt-2 rounded-md border border-border/50 bg-muted/10", className)}>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-border/40">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Adjustments
        </p>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={addRow}
          >
            <Plus className="w-3 h-3" /> Add
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-2.5 py-3 text-[12px] text-muted-foreground">
          No adjustments. Add TDS, bank charges, discount, round off, or other ledger adjustments.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] accounts-table">
            <thead>
              <tr className="accounts-table-head-row bg-muted/30 border-b border-border/40">
                <th className="accounts-table-th text-left">Adjustment Type</th>
                <th className="accounts-table-th text-left">Ledger</th>
                <th className="accounts-table-th text-left">Dr / Cr</th>
                <th className="accounts-table-th text-right">Amount</th>
                {!readOnly && <th className="accounts-table-th w-10" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/30">
                  <td className="px-2 py-1.5" style={{ minWidth: 140 }}>
                    {readOnly ? (
                      <span className="text-[12px]">{row.adjustmentType}</span>
                    ) : (
                      <Select
                        value={row.adjustmentType}
                        onValueChange={(v) => {
                          const type = v as VoucherAdjustmentType;
                          updateRow(row.id, {
                            adjustmentType: type,
                            debitOrCredit: defaultAdjustmentSide(type, voucherKind),
                          });
                        }}
                      >
                        <SelectTrigger className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}>
                          <SelectValue />
                        </SelectTrigger>
                        <VoucherSelectContent>
                          {allowedAdjustmentTypes(voucherKind).map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </VoucherSelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-2 py-1.5" style={{ minWidth: 160 }}>
                    {readOnly ? (
                      <span className="text-[12px]">{row.ledgerName || "—"}</span>
                    ) : (
                      <GroupedLedgerSelect
                        value={row.ledgerId}
                        onChange={(ledger) =>
                          updateRow(row.id, {
                            ledgerId: ledger.id,
                            ledgerName: ledger.accountName,
                          })
                        }
                        placeholder="Select ledger"
                        compact
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5" style={{ width: 88 }}>
                    {readOnly ? (
                      <span className="text-[12px] uppercase">
                        {row.debitOrCredit === "debit" ? "Dr" : "Cr"}
                      </span>
                    ) : (
                      <Select
                        value={row.debitOrCredit}
                        onValueChange={(v) =>
                          updateRow(row.id, { debitOrCredit: v as VoucherAdjustmentSide })
                        }
                      >
                        <SelectTrigger className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}>
                          <SelectValue />
                        </SelectTrigger>
                        <VoucherSelectContent>
                          <SelectItem value="debit" className="text-xs">
                            Debit
                          </SelectItem>
                          <SelectItem value="credit" className="text-xs">
                            Credit
                          </SelectItem>
                        </VoucherSelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ width: 110 }}>
                    {readOnly ? (
                      <span className="text-[12px] tabular-nums">{formatMoney(row.amount)}</span>
                    ) : (
                      <AccountsMoneyInput
                        compact={false}
                        className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS, "h-8 text-xs")}
                        value={row.amount}
                        onChange={(v) => updateRow(row.id, { amount: v })}
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-1 py-1.5">
                      <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove adjustment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
