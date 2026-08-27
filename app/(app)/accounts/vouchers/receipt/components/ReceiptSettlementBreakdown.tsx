"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VoucherReadonlyValue,
} from "@/components/accounts/voucher-simple-form-ui";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  RECEIPT_ADJUSTMENT_TYPE_LABELS,
  type ReceiptAdjustmentType,
} from "@/types/receipt-voucher.types";
import { ReceiptSearchableSelect } from "./ReceiptSearchableSelect";
import {
  createEmptyAdjustment,
  toMoneyNumber,
  type ReceiptUiAdjustment,
} from "../receipt-voucher-utils";

/** Manual settlement components the user may add (TDS is auto-derived). */
const MANUAL_COMPONENT_TYPES: ReceiptAdjustmentType[] = [
  "DISCOUNT_ALLOWED",
  "ROUND_OFF",
  "BANK_CHARGES",
  "OTHER",
];

const AMOUNT_INPUT = cn(
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  "h-9 w-[140px] max-w-full",
);

function componentLabel(type: ReceiptAdjustmentType): string {
  switch (type) {
    case "DISCOUNT_ALLOWED":
      return "Discount Allowed";
    case "ROUND_OFF":
      return "Round Off";
    case "BANK_CHARGES":
      return "Bank Charges";
    case "OTHER":
      return "Other";
    case "CUSTOMER_TDS":
      return "TDS Receivable";
    default:
      return RECEIPT_ADJUSTMENT_TYPE_LABELS[type];
  }
}

export function ReceiptSettlementBreakdown({
  bankLedgerName,
  bankAmount,
  tdsAmount,
  rows,
  ledgerOptions,
  readOnly,
  onChange,
}: {
  /** Selected Cash/Bank label from Received In. */
  bankLedgerName: string;
  /** Net cash/bank amount (settlement − TDS − other debit components ± credits). */
  bankAmount: number;
  /** Aggregated allocation TDS — drives auto TDS Receivable row. */
  tdsAmount: number;
  /** Underlying adjustment rows (includes system TDS if synced). */
  rows: ReceiptUiAdjustment[];
  ledgerOptions: { value: string; label: string; sub?: string }[];
  readOnly?: boolean;
  onChange: (rows: ReceiptUiAdjustment[]) => void;
}) {
  const manualRows = rows.filter((r) => r.adjustment_type !== "CUSTOMER_TDS");

  const updateManual = (id: string, patch: Partial<ReceiptUiAdjustment>) => {
    onChange(
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const removeManual = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const addComponent = (type: ReceiptAdjustmentType) => {
    const next = createEmptyAdjustment(type);
    const withoutDupType =
      type === "DISCOUNT_ALLOWED"
        ? rows.filter((r) => r.adjustment_type !== "DISCOUNT_ALLOWED")
        : rows;
    onChange([...withoutDupType, next]);
  };

  const componentTotal =
    Math.max(0, bankAmount) +
    manualRows.reduce((s, r) => {
      const amt = toMoneyNumber(r.amount);
      if (amt <= 0) return s;
      if (
        (r.adjustment_type === "OTHER" || r.adjustment_type === "ROUND_OFF") &&
        r.entry_type === "CREDIT"
      ) {
        return s - amt;
      }
      return s + amt;
    }, 0) +
    (tdsAmount > 0 ? tdsAmount : 0);

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] text-muted-foreground leading-snug">
        How is the party settlement discharged? Bank/Cash comes from Received In; TDS
        Receivable is derived from invoice TDS. Add Discount, Round Off, or Other as needed.
      </p>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                Settlement Component
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                Ledger / Account
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-foreground w-[140px]">
                Amount
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {/* Bank / Cash — always first, not double-selected */}
            <tr className="border-b border-border/60 bg-brand-50/30">
              <td className="px-3 py-2 text-xs font-semibold text-navy-900">
                {bankAmount >= 0 ? "Bank / Cash Receipt" : "Bank / Cash"}
              </td>
              <td className="px-3 py-2 text-xs text-foreground">
                {bankLedgerName || (
                  <span className="text-muted-foreground">Select Received In above…</span>
                )}
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold text-brand-700">
                {formatMoney(Math.max(0, bankAmount))}
              </td>
              <td />
            </tr>

            {/* TDS Receivable — auto from allocation TDS */}
            {tdsAmount > 0 ? (
              <tr className="border-b border-border/60 bg-emerald-50/40">
                <td className="px-3 py-2 text-xs font-semibold text-navy-900">
                  TDS Receivable
                  <span className="ml-1.5 text-[10px] font-medium text-emerald-700 uppercase tracking-wide">
                    System
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  System-controlled (from invoice TDS)
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold text-emerald-800">
                  {formatMoney(tdsAmount)}
                </td>
                <td />
              </tr>
            ) : null}

            {manualRows.map((row) => {
              const needsLedger =
                row.adjustment_type === "DISCOUNT_ALLOWED" ||
                row.adjustment_type === "BANK_CHARGES" ||
                row.adjustment_type === "OTHER";
              const showDrCr =
                row.adjustment_type === "OTHER" || row.adjustment_type === "ROUND_OFF";
              const hideLedgerPicker =
                row.adjustment_type === "ROUND_OFF";

              return (
                <tr key={row.id} className="border-b border-border/60 align-top">
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-xs font-medium">
                        {componentLabel(row.adjustment_type)}
                      </span>
                    ) : (
                      <Select
                        value={row.adjustment_type}
                        onValueChange={(v) => {
                          const type = v as ReceiptAdjustmentType;
                          updateManual(row.id, {
                            adjustment_type: type,
                            entry_type: "DEBIT",
                            ledger_id:
                              type === "ROUND_OFF" ? "" : row.ledger_id,
                            ledger_name:
                              type === "ROUND_OFF" ? "" : row.ledger_name,
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm max-w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MANUAL_COMPONENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-sm">
                              {componentLabel(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-3 py-2 min-w-[200px]">
                    {hideLedgerPicker ? (
                      <VoucherReadonlyValue
                        tone="muted"
                        className="h-9 min-h-9 max-h-9"
                      >
                        System Round Off
                      </VoucherReadonlyValue>
                    ) : needsLedger ? (
                      readOnly ? (
                        <span className="text-xs">{row.ledger_name || "—"}</span>
                      ) : (
                        <ReceiptSearchableSelect
                          label=""
                          required
                          value={row.ledger_id}
                          options={ledgerOptions}
                          placeholder="Select ledger…"
                          onChange={(id) => {
                            const opt = ledgerOptions.find((o) => o.value === id);
                            updateManual(row.id, {
                              ledger_id: id,
                              ledger_name: opt?.label || "",
                            });
                          }}
                        />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {showDrCr && !readOnly ? (
                      <div className="mt-1.5 max-w-[110px]">
                        <Select
                          value={row.entry_type}
                          onValueChange={(v) =>
                            updateManual(row.id, {
                              entry_type: v as "DEBIT" | "CREDIT",
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBIT">Debit</SelectItem>
                            <SelectItem value="CREDIT">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : showDrCr && readOnly ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {row.entry_type === "CREDIT" ? "Credit" : "Debit"}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {readOnly ? (
                      <span className="text-xs tabular-nums font-medium">
                        {formatMoney(toMoneyNumber(row.amount))}
                      </span>
                    ) : (
                      <div className="flex justify-end">
                        <Input
                          className={AMOUNT_INPUT}
                          value={row.amount}
                          onChange={(e) =>
                            updateManual(row.id, { amount: e.target.value })
                          }
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-1 py-2">
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => removeManual(row.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}

            {manualRows.length === 0 && tdsAmount <= 0 && bankAmount <= 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-xs text-muted-foreground"
                >
                  Settlement components will appear once party amount and Received In are set.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t border-border">
              <td
                colSpan={2}
                className="px-3 py-2 text-xs font-semibold text-navy-900"
              >
                Total Settlement Components
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums font-bold text-navy-900">
                {formatMoney(componentTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-[11px] text-muted-foreground sr-only">
            Add component
          </Label>
          {MANUAL_COMPONENT_TYPES.map((t) => (
            <Button
              key={t}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => addComponent(t)}
            >
              <Plus className="w-3.5 h-3.5" /> {componentLabel(t)}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
