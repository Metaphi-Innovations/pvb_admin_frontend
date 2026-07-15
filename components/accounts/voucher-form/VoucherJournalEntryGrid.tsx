"use client";

import { useCallback, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoucherEntryBlock } from "@/components/accounts/voucher-form/VoucherEntryBlock";
import {
  RECEIPT_BUTTON_CLASS,
  RECEIPT_TOTAL_AMOUNT,
  RECEIPT_TOTAL_LABEL,
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
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { isBankAccountLedger } from "@/lib/accounts/bank-coa-utils";
import { getBankAccountByLedgerId } from "@/lib/accounts/bank-accounts-data";
import {
  isBankAccountMappedToWarehouse,
  resolveWarehouseId,
} from "@/lib/accounts/bank-warehouse-mapping";

export interface VoucherJournalEntryGridProps {
  entries: VoucherFormEntry[];
  voucherDate: string;
  coaRecords: ChartOfAccount[];
  readOnly?: boolean;
  onEntriesChange: (entries: VoucherFormEntry[]) => void;
  onQuickAddSuccess?: () => void;
  /** Limits bank ledgers to accounts mapped to this warehouse. */
  warehouseRef?: string | number | null;
  /** Match Receipt/Payment/Contra premium compact styling. */
  variant?: "default" | "receipt";
}

function formatSignedDifference(difference: number): string {
  const n = roundMoney(difference);
  if (Math.abs(n) < 0.009) return formatMoney(0);
  return `${n < 0 ? "−" : ""}${formatMoney(Math.abs(n))}`;
}

export function VoucherJournalEntryGrid({
  entries,
  voucherDate,
  coaRecords,
  readOnly = false,
  onEntriesChange,
  warehouseRef,
  variant = "default",
}: VoucherJournalEntryGridProps) {
  const isPremium = variant === "receipt";
  const { totalDebit, totalCredit } = calcFormEntryTotals(entries);
  const difference = roundMoney(totalDebit - totalCredit);
  const balanced = Math.abs(difference) < 0.009;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const applyWarehouseBankFilter = useCallback(
    (ledger: ChartOfAccount) => {
      const warehouseId = resolveWarehouseId(warehouseRef);
      if (warehouseId == null) return true;
      if (!isBankAccountLedger(ledger)) return true;
      const master = getBankAccountByLedgerId(ledger.id);
      if (!master) return false;
      return isBankAccountMappedToWarehouse(master.mappedWarehouseIds, warehouseId, master.status);
    },
    [warehouseRef],
  );

  /** Full active COA — only final ledgers are selectable via GroupedLedgerSelect. */
  const ledgerFilter = useCallback(
    (ledger: ChartOfAccount) => applyWarehouseBankFilter(ledger),
    [applyWarehouseBankFilter],
  );

  useEffect(() => {
    const warehouseId = resolveWarehouseId(warehouseRef);
    if (warehouseId == null) return;
    let next = entriesRef.current;
    let changed = false;
    next = next.map((entry) => {
      if (!entry.accountId) return entry;
      const ledger = coaRecords.find((r) => r.id === entry.accountId);
      if (!ledger || !isBankAccountLedger(ledger)) return entry;
      const master = getBankAccountByLedgerId(ledger.id);
      if (
        !master ||
        !isBankAccountMappedToWarehouse(master.mappedWarehouseIds, warehouseId, master.status)
      ) {
        changed = true;
        return { ...entry, accountId: null, accountName: "" };
      }
      return entry;
    });
    if (changed) onEntriesChange(next);
  }, [warehouseRef, coaRecords, onEntriesChange]);

  const patchEntry = (entryId: number, patch: Partial<VoucherFormEntry>) => {
    onEntriesChange(updateFormEntryById(entries, entryId, patch));
  };

  const addRow = () => {
    onEntriesChange([...entries, createEmptyFormEntry("DEBIT", "journal")]);
  };

  const removeRow = (entryId: number) => {
    if (entries.length <= 2) return;
    onEntriesChange(entries.filter((e) => e.id !== entryId));
  };

  const canRemove = !readOnly && entries.length > 2;

  return (
    <div className={cn("space-y-2", isPremium && "space-y-1.5")}>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[760px] space-y-2">
          {entries.map((entry, index) => (
            <VoucherEntryBlock
              key={entry.id}
              entry={entry}
              voucherType="journal"
              voucherDate={voucherDate}
              coaRecords={coaRecords}
              readOnly={readOnly}
              accountLabel="Account"
              accountPlaceholder="Select an account…"
              ledgerFilter={ledgerFilter}
              showEntryType
              showLineRemark={false}
              enableQuickAdd={false}
              compact={isPremium}
              className={
                isPremium && index < entries.length - 1
                  ? "pb-2 mb-0.5 border-b border-border/40"
                  : undefined
              }
              onChange={(patch) => patchEntry(entry.id, patch)}
              rowAction={
                canRemove ? (
                  <button
                    type="button"
                    onClick={() => removeRow(entry.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    aria-label="Remove row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="w-8 h-8" aria-hidden />
                )
              }
            />
          ))}
        </div>
      </div>

      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className={cn(
            isPremium ? RECEIPT_BUTTON_CLASS : VOUCHER_BUTTON_CLASS,
            "gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50",
          )}
          onClick={addRow}
        >
          <Plus className="w-4 h-4" /> Add Row
        </Button>
      )}

      <div
        className={cn(
          "flex justify-end",
          isPremium
            ? "border-t border-border bg-white px-1 pt-2 pb-0.5"
            : "border border-border/60 rounded-lg bg-white px-4 py-2.5 shadow-sm",
        )}
      >
        <div className={cn("w-full sm:w-[320px] space-y-1", isPremium ? "text-[12px]" : "text-[13px]")}>
          <div className="flex items-center justify-between gap-6">
            <span className={isPremium ? RECEIPT_TOTAL_LABEL : VOUCHER_TOTAL_LABEL_CLASS}>
              Total Debit
            </span>
            <span
              className={cn(
                "tabular-nums",
                isPremium ? RECEIPT_TOTAL_AMOUNT : VOUCHER_TOTAL_AMOUNT_CLASS,
              )}
            >
              {formatMoney(totalDebit)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className={isPremium ? RECEIPT_TOTAL_LABEL : VOUCHER_TOTAL_LABEL_CLASS}>
              Total Credit
            </span>
            <span
              className={cn(
                "tabular-nums",
                isPremium ? RECEIPT_TOTAL_AMOUNT : VOUCHER_TOTAL_AMOUNT_CLASS,
              )}
            >
              {formatMoney(totalCredit)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6 border-t border-border/40 pt-1">
            <span className={isPremium ? RECEIPT_TOTAL_LABEL : "text-xs text-muted-foreground"}>
              Difference
            </span>
            <span
              className={cn(
                "tabular-nums text-sm font-semibold",
                balanced ? "text-foreground" : "text-amber-700",
              )}
            >
              {formatSignedDifference(difference)}
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
