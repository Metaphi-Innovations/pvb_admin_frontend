"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
} from "@/components/accounts/voucher-simple-form-ui";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { PaymentSearchableSelect } from "./PaymentSearchableSelect";
import {
  createEmptyAdjustment,
  sanitizeNonNegativeMoneyInput,
  toMoneyNumber,
  type PaymentUiAdjustment,
} from "../payment-voucher-utils";

const AMOUNT_INPUT = cn(
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  "h-8 w-[140px] max-w-full",
);

/** System-only adjustment types — kept in state/payload but not shown in simplified UI. */
const HIDDEN_ADJUSTMENT_TYPES = new Set(["SUPPLIER_TDS", "ROUND_OFF"]);

/**
 * Ledger Entries — optional manual payment adjustment lines.
 * Paid From already captures Cash/Bank; do not duplicate here.
 * TDS is entered via Journal Voucher — SUPPLIER_TDS rows stay hidden if present.
 */
export function PaymentLedgerEntriesTable({
  rows,
  ledgerOptions,
  readOnly,
  onChange,
}: {
  rows: PaymentUiAdjustment[];
  ledgerOptions: { value: string; label: string; sub?: string }[];
  readOnly?: boolean;
  onChange: (rows: PaymentUiAdjustment[]) => void;
}) {
  const manualRows = rows.filter(
    (r) => !HIDDEN_ADJUSTMENT_TYPES.has(r.adjustment_type),
  );
  const hiddenRows = rows.filter((r) =>
    HIDDEN_ADJUSTMENT_TYPES.has(r.adjustment_type),
  );

  const updateManual = (id: string, patch: Partial<PaymentUiAdjustment>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeManual = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    const next = createEmptyAdjustment("OTHER");
    onChange([...hiddenRows, ...manualRows, next]);
  };

  return (
    <div className="space-y-2">
      {manualRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No additional ledger adjustments.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-semibold">
                  Ledger Account
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold w-[160px]">
                  Amount
                </th>
                <th className="w-10 px-2 py-2 text-left text-xs font-semibold">
                  {!readOnly ? "Action" : null}
                </th>
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-3 py-2 min-w-[220px]">
                    {readOnly ? (
                      <span className="text-xs">{row.ledger_name || "—"}</span>
                    ) : (
                      <PaymentSearchableSelect
                        value={row.ledger_id}
                        options={ledgerOptions}
                        placeholder="Select ledger…"
                        onChange={(id) => {
                          const opt = ledgerOptions.find((o) => o.value === id);
                          updateManual(row.id, {
                            ledger_id: id,
                            ledger_name: opt?.label || "",
                            ...(row.adjustment_type === "OTHER"
                              ? {
                                  adjustment_type: "OTHER" as const,
                                  entry_type: row.entry_type || "CREDIT",
                                }
                              : {}),
                          });
                        }}
                      />
                    )}
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
                            updateManual(row.id, {
                              amount: sanitizeNonNegativeMoneyInput(e.target.value),
                            })
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={addRow}
        >
          <Plus className="w-3.5 h-3.5" /> Add Row
        </Button>
      ) : null}
    </div>
  );
}
