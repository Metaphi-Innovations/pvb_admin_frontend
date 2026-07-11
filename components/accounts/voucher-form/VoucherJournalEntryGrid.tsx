"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoucherEntryBlock } from "@/components/accounts/voucher-form/VoucherEntryBlock";
import {
  VOUCHER_BUTTON_CLASS,
  VOUCHER_TOTAL_AMOUNT_CLASS,
  VOUCHER_TOTAL_LABEL_CLASS,
} from "@/components/accounts/voucher-simple-form-ui";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { VoucherFormEntry } from "@/lib/accounts/voucher-form-model";
import {
  calcFormEntryTotals,
  createEmptyFormEntry,
  updateFormEntryById,
} from "@/lib/accounts/voucher-form-model";
import { voucherAmountDifference } from "@/app/(app)/accounts/vouchers/voucher-data";
import { isTdsCoaLedger } from "@/lib/accounts/tds-coa-sync";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export interface VoucherJournalEntryGridProps {
  entries: VoucherFormEntry[];
  voucherDate: string;
  coaRecords: ChartOfAccount[];
  readOnly?: boolean;
  onEntriesChange: (entries: VoucherFormEntry[]) => void;
  onQuickAddSuccess?: () => void;
}

export function VoucherJournalEntryGrid({
  entries,
  voucherDate,
  coaRecords,
  readOnly = false,
  onEntriesChange,
  onQuickAddSuccess,
}: VoucherJournalEntryGridProps) {
  const { totalDebit, totalCredit } = calcFormEntryTotals(entries);
  const difference = voucherAmountDifference(totalDebit, totalCredit);
  const balanced = Math.abs(difference) < 0.009 && totalDebit > 0;

  const ledgerFilter = (ledger: ChartOfAccount) => !isTdsCoaLedger(ledger);

  const patchEntry = (entryId: number, patch: Partial<VoucherFormEntry>) => {
    onEntriesChange(updateFormEntryById(entries, entryId, patch));
  };

  const addRow = () => {
    onEntriesChange([
      ...entries,
      createEmptyFormEntry(entries.length % 2 === 0 ? "DEBIT" : "CREDIT", "journal"),
    ]);
  };

  const removeRow = (entryId: number) => {
    if (entries.length <= 2) return;
    onEntriesChange(entries.filter((e) => e.id !== entryId));
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto -mx-1 px-1">
      {entries.map((entry) => (
        <div key={entry.id} className="relative group min-w-[720px] mb-2">
          <VoucherEntryBlock
            entry={entry}
            voucherType="journal"
            voucherDate={voucherDate}
            coaRecords={coaRecords}
            readOnly={readOnly}
            accountLabel="Account"
            accountPlaceholder="Select an account"
            ledgerFilter={ledgerFilter}
            showEntryType
            onQuickAddSuccess={onQuickAddSuccess}
            onChange={(patch) => patchEntry(entry.id, patch)}
          />
          {!readOnly && entries.length > 2 && (
            <button
              type="button"
              onClick={() => removeRow(entry.id)}
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove row"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      </div>

      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className={cn(VOUCHER_BUTTON_CLASS, "gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50")}
          onClick={addRow}
        >
          <Plus className="w-4 h-4" /> Add Row
        </Button>
      )}

      <div className="sticky bottom-0 z-10 flex justify-end border border-border/60 rounded-lg bg-white px-4 py-2.5 shadow-sm">
        <div className="w-full sm:w-[360px] space-y-1 text-[13px]">
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium border-b border-border/40 pb-1">
            <span />
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-0.5">
            <span className="text-muted-foreground">Sub Total</span>
            <span className="text-right tabular-nums">{formatMoney(totalDebit)}</span>
            <span className="text-right tabular-nums">{formatMoney(totalCredit)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-0.5 border-t border-border/40 pt-1">
            <span className={VOUCHER_TOTAL_LABEL_CLASS}>Total (₹)</span>
            <span className={cn("text-right tabular-nums", VOUCHER_TOTAL_AMOUNT_CLASS)}>
              {formatMoney(totalDebit)}
            </span>
            <span className={cn("text-right tabular-nums", VOUCHER_TOTAL_AMOUNT_CLASS)}>
              {formatMoney(totalCredit)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-0.5 border-t border-border/40 pt-1">
            <span className="text-xs text-muted-foreground">Difference</span>
            <span
              className={cn(
                "col-span-2 text-right tabular-nums text-sm",
                balanced ? "text-muted-foreground" : "text-amber-700 font-medium",
              )}
            >
              {formatMoney(difference)}
            </span>
          </div>
          {!balanced && totalDebit + totalCredit > 0 && (
            <p className="text-[11px] text-amber-700 text-right pt-0.5">
              Debit and credit totals must match before posting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
