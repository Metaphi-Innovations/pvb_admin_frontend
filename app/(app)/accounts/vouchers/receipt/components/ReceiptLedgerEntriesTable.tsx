"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  VOUCHER_MONEY_INPUT_CLASS,
} from "@/components/accounts/voucher-simple-form-ui";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceTableReadonly,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { ReceiptSearchableSelect } from "./ReceiptSearchableSelect";
import {
  createEmptyAdjustment,
  toMoneyNumber,
  type ReceiptUiAdjustment,
} from "../receipt-voucher-utils";

const AMOUNT_INPUT = cn(
  INVOICE_DETAIL_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  "text-xs text-right tabular-nums w-full",
);

const LEDGER_SELECT_CLASS = cn(INVOICE_DETAIL_SELECT_CLASS, "w-full min-w-0");

/**
 * Ledger Entries — optional manual adjustment lines only.
 */
export function ReceiptLedgerEntriesTable({
  rows,
  ledgerOptions,
  readOnly,
  onChange,
}: {
  rows: ReceiptUiAdjustment[];
  ledgerOptions: { value: string; label: string; sub?: string }[];
  readOnly?: boolean;
  onChange: (rows: ReceiptUiAdjustment[]) => void;
}) {
  const manualRows = rows.filter((r) => r.adjustment_type !== "CUSTOMER_TDS");
  const tdsRows = rows.filter((r) => r.adjustment_type === "CUSTOMER_TDS");

  const updateManual = (id: string, patch: Partial<ReceiptUiAdjustment>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeManual = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="so-invoice-charges-table-wrap w-full min-w-0">
      <table className="so-invoice-table text-xs w-full table-fixed min-w-full">
        <colgroup>
          <col />
          <col style={{ width: "9rem" }} />
          <col style={{ width: "2.75rem" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-left">
              Ledger Account
            </th>
            <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Amount
            </th>
            <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {manualRows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                No additional ledger adjustments.
              </td>
            </tr>
          ) : (
            manualRows.map((row) => (
              <tr key={row.id} className="border-b border-border/40 last:border-0">
                <td className="p-1.5 align-middle w-full min-w-0">
                  {readOnly ? (
                    <div className="so-goods-ro w-full min-w-0 truncate text-left">
                      {row.ledger_name || "—"}
                    </div>
                  ) : (
                    <div className="w-full min-w-0">
                      <ReceiptSearchableSelect
                        value={row.ledger_id}
                        options={ledgerOptions}
                        placeholder="Select ledger…"
                        triggerClassName={LEDGER_SELECT_CLASS}
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
                    </div>
                  )}
                </td>
                <td className="p-1.5 align-middle text-right w-36">
                  {readOnly ? (
                    <InvoiceTableReadonly value={formatMoney(toMoneyNumber(row.amount))} strong />
                  ) : (
                    <Input
                      className={AMOUNT_INPUT}
                      value={row.amount}
                      onChange={(e) => updateManual(row.id, { amount: e.target.value })}
                      placeholder="0.00"
                    />
                  )}
                </td>
                <td className="p-1.5 align-middle text-center w-11">
                  {!readOnly ? (
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-40"
                      onClick={() => removeManual(row.id)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function createReceiptLedgerEntryRow(
  rows: ReceiptUiAdjustment[],
): ReceiptUiAdjustment[] {
  const tdsRows = rows.filter((r) => r.adjustment_type === "CUSTOMER_TDS");
  const manualRows = rows.filter((r) => r.adjustment_type !== "CUSTOMER_TDS");
  return [...tdsRows, ...manualRows, createEmptyAdjustment("OTHER")];
}
