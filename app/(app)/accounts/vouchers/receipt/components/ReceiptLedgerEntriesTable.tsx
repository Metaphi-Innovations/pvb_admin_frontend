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
import { ReceiptSearchableSelect } from "./ReceiptSearchableSelect";
import {
  createEmptyAdjustment,
  toMoneyNumber,
  type ReceiptUiAdjustment,
} from "../receipt-voucher-utils";

const AMOUNT_INPUT = cn(
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  "h-8 w-[140px] max-w-full",
);

/**
 * Simplified Ledger Entries UI.
 * System rows (Bank/Cash, TDS Receivable) are display-only.
 * Manual rows map to OTHER adjustments under the hood (no Dr/Cr / type UI).
 */
export function ReceiptLedgerEntriesTable({
  bankLedgerName,
  bankAmount,
  tdsAmount,
  rows,
  ledgerOptions,
  readOnly,
  onChange,
}: {
  bankLedgerName: string;
  bankAmount: number;
  tdsAmount: number;
  rows: ReceiptUiAdjustment[];
  ledgerOptions: { value: string; label: string; sub?: string }[];
  readOnly?: boolean;
  onChange: (rows: ReceiptUiAdjustment[]) => void;
}) {
  const manualRows = rows.filter((r) => r.adjustment_type !== "CUSTOMER_TDS");

  const updateManual = (id: string, patch: Partial<ReceiptUiAdjustment>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeManual = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    const next = createEmptyAdjustment("OTHER");
    const tds = rows.filter((r) => r.adjustment_type === "CUSTOMER_TDS");
    onChange([...tds, ...manualRows, next]);
  };

  const ledgerTotal =
    Math.max(0, bankAmount) +
    (tdsAmount > 0 ? tdsAmount : 0) +
    manualRows.reduce((s, r) => s + Math.max(0, toMoneyNumber(r.amount)), 0);

  return (
    <div className="space-y-2">
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
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60 bg-muted/10">
              <td className="px-3 py-2 text-xs font-medium">
                {bankLedgerName || (
                  <span className="text-muted-foreground">Cash / Bank</span>
                )}
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  Received In
                </span>
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold">
                {formatMoney(Math.max(0, bankAmount))}
              </td>
              <td />
            </tr>

            {tdsAmount > 0 ? (
              <tr className="border-b border-border/60 bg-muted/10">
                <td className="px-3 py-2 text-xs font-medium">
                  TDS Receivable
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    Auto
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold">
                  {formatMoney(tdsAmount)}
                </td>
                <td />
              </tr>
            ) : null}

            {manualRows.map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <td className="px-3 py-2 min-w-[220px]">
                  {readOnly ? (
                    <span className="text-xs">{row.ledger_name || "—"}</span>
                  ) : (
                    <ReceiptSearchableSelect
                      value={row.ledger_id}
                      options={ledgerOptions}
                      placeholder="Select ledger…"
                      onChange={(id) => {
                        const opt = ledgerOptions.find((o) => o.value === id);
                        updateManual(row.id, {
                          ledger_id: id,
                          ledger_name: opt?.label || "",
                          adjustment_type: "OTHER",
                          entry_type: "DEBIT",
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
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t border-border">
              <td className="px-3 py-2 text-xs font-semibold">Total Ledger Amount</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums font-bold">
                {formatMoney(ledgerTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

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
