"use client";

import { useCallback, useEffect, useRef } from "react";
import { VoucherEntryBlock } from "@/components/accounts/voucher-form/VoucherEntryBlock";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { VoucherFormEntry } from "@/lib/accounts/voucher-form-model";
import {
  getFormEntry,
  syncDualEntryAmount,
  updateFormEntry,
} from "@/lib/accounts/voucher-form-model";
import type { VoucherFormTypeConfig } from "@/lib/accounts/voucher-form-config";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { ReceiptFormSection } from "@/components/accounts/voucher-simple-form-ui";
import { isBankAccountLedger } from "@/lib/accounts/bank-coa-utils";
import { getBankAccountByLedgerId } from "@/lib/accounts/bank-accounts-data";
import { isBankAccountMappedToWarehouse, resolveWarehouseId } from "@/lib/accounts/bank-warehouse-mapping";

export interface VoucherDualEntryPanelProps {
  entries: VoucherFormEntry[];
  config: VoucherFormTypeConfig;
  voucherDate: string;
  coaRecords: ChartOfAccount[];
  readOnly?: boolean;
  onEntriesChange: (entries: VoucherFormEntry[]) => void;
  /** Payment TDS — shown in voucher entry preview only */
  tdsAmount?: number;
  onQuickAddSuccess?: () => void;
  /** Limits bank ledgers to accounts mapped to this warehouse. */
  warehouseRef?: string | number | null;
  /** Receipt-style voucher presentation — separate Debit/Credit headers and compact rows. */
  variant?: "default" | "receipt";
}

export function VoucherDualEntryPanel({
  entries,
  config,
  voucherDate,
  coaRecords,
  readOnly = false,
  onEntriesChange,
  tdsAmount = 0,
  onQuickAddSuccess,
  warehouseRef,
  variant = "default",
}: VoucherDualEntryPanelProps) {
  const debitEntry = getFormEntry(entries, "DEBIT");
  const creditEntry = getFormEntry(entries, "CREDIT");
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const debitLedger = debitEntry?.accountId ?? null;
  const creditLedger = creditEntry?.accountId ?? null;

  const amountEditableOnDebit = config.amountEditableOnDebit !== false;
  const amountEditableOnCredit = config.amountEditableOnCredit !== false;

  const patchEntry = (entryType: "DEBIT" | "CREDIT", patch: Partial<VoucherFormEntry>) => {
    let next = updateFormEntry(entries, entryType, patch);

    const shouldSyncAmount =
      patch.amount != null &&
      ((entryType === "DEBIT" && amountEditableOnDebit) ||
        (entryType === "CREDIT" && amountEditableOnCredit));

    if (shouldSyncAmount) {
      next = syncDualEntryAmount(next, patch.amount!);
    }

    if ("accountId" in patch && patch.accountId != null && entryType === "DEBIT" && creditLedger === patch.accountId) {
      next = updateFormEntry(next, "CREDIT", { accountId: null, accountName: "" });
    }
    if ("accountId" in patch && patch.accountId != null && entryType === "CREDIT" && debitLedger === patch.accountId) {
      next = updateFormEntry(next, "DEBIT", { accountId: null, accountName: "" });
    }

    onEntriesChange(next);
  };

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

  const debitFilter = useCallback(
    (ledger: ChartOfAccount) => {
      if (!config.debitAccountFilter(ledger, coaRecords, creditEntry?.accountId)) return false;
      return applyWarehouseBankFilter(ledger);
    },
    [config, coaRecords, creditEntry?.accountId, applyWarehouseBankFilter],
  );
  const creditFilter = useCallback(
    (ledger: ChartOfAccount) => {
      if (!config.creditAccountFilter(ledger, coaRecords, debitEntry?.accountId)) return false;
      return applyWarehouseBankFilter(ledger);
    },
    [config, coaRecords, debitEntry?.accountId, applyWarehouseBankFilter],
  );

  useEffect(() => {
    const warehouseId = resolveWarehouseId(warehouseRef);
    if (warehouseId == null) return;
    let next = entriesRef.current;
    let changed = false;
    for (const side of ["DEBIT", "CREDIT"] as const) {
      const entry = getFormEntry(next, side);
      if (!entry?.accountId) continue;
      const ledger = coaRecords.find((r) => r.id === entry.accountId);
      if (!ledger || !isBankAccountLedger(ledger)) continue;
      const master = getBankAccountByLedgerId(ledger.id);
      if (
        !master ||
        !isBankAccountMappedToWarehouse(master.mappedWarehouseIds, warehouseId, master.status)
      ) {
        next = updateFormEntry(next, side, { accountId: null, accountName: "" });
        changed = true;
      }
    }
    if (changed) onEntriesChange(next);
  }, [warehouseRef, coaRecords, onEntriesChange]);

  const isPremiumDualLayout =
    variant === "receipt" ||
    config.voucherType === "receipt" ||
    config.voucherType === "payment" ||
    config.voucherType === "contra";

  const disableQuickAdd =
    config.voucherType === "receipt" ||
    config.voucherType === "payment" ||
    config.voucherType === "contra";

  const debitBlock = debitEntry ? (
    <VoucherEntryBlock
      entry={debitEntry}
      voucherType={config.voucherType}
      voucherDate={voucherDate}
      coaRecords={coaRecords}
      readOnly={readOnly}
      accountLabel={config.debitAccountLabel}
      accountPlaceholder={config.debitAccountPlaceholder}
      ledgerFilter={debitFilter}
      quickAddScope={config.debitQuickAddScope}
      enableQuickAdd={!disableQuickAdd}
      showAmount={amountEditableOnDebit}
      showLineRemark={!isPremiumDualLayout}
      compact={isPremiumDualLayout}
      onQuickAddSuccess={onQuickAddSuccess}
      onChange={(patch) => patchEntry("DEBIT", patch)}
    />
  ) : null;

  const creditBlock = creditEntry ? (
    <VoucherEntryBlock
      entry={creditEntry}
      voucherType={config.voucherType}
      voucherDate={voucherDate}
      coaRecords={coaRecords}
      readOnly={readOnly}
      accountLabel={config.creditAccountLabel}
      accountPlaceholder={config.creditAccountPlaceholder}
      ledgerFilter={creditFilter}
      quickAddScope={config.creditQuickAddScope}
      enableQuickAdd={!disableQuickAdd}
      showAmount={amountEditableOnCredit}
      showLineRemark={!isPremiumDualLayout}
      compact={isPremiumDualLayout}
      onQuickAddSuccess={onQuickAddSuccess}
      onChange={(patch) => patchEntry("CREDIT", patch)}
    />
  ) : null;

  const grossAmount =
    config.voucherType === "receipt"
      ? creditEntry?.amount ?? 0
      : config.voucherType === "payment"
        ? debitEntry?.amount ?? 0
        : debitEntry?.amount ?? creditEntry?.amount ?? 0;

  const bankSideAmount =
    config.voucherType === "payment" && tdsAmount > 0
      ? Math.max(0, grossAmount - tdsAmount)
      : grossAmount;

  const amount = grossAmount;

  const renderEntryBlocks = () => {
    if (isPremiumDualLayout) {
      return (
        <>
          {config.creditAccountFirst ? (
            <>
              {creditBlock && <ReceiptFormSection title="Credit">{creditBlock}</ReceiptFormSection>}
              {debitBlock && <ReceiptFormSection title="Debit">{debitBlock}</ReceiptFormSection>}
            </>
          ) : (
            <>
              {debitBlock && <ReceiptFormSection title="Debit">{debitBlock}</ReceiptFormSection>}
              {creditBlock && <ReceiptFormSection title="Credit">{creditBlock}</ReceiptFormSection>}
            </>
          )}
        </>
      );
    }

    return config.creditAccountFirst ? (
      <>
        {creditBlock}
        {debitBlock}
      </>
    ) : (
      <>
        {debitBlock}
        {creditBlock}
      </>
    );
  };

  return (
    <div className={cn(isPremiumDualLayout ? "space-y-0" : "space-y-2.5")}>
      {renderEntryBlocks()}

      {debitEntry?.accountId && creditEntry?.accountId && amount > 0 && !isPremiumDualLayout && (
        <div className="rounded-md border border-border/50 bg-muted/15 px-2.5 py-2 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Voucher Entry
          </p>
          <p className="text-[12px] text-foreground">
            <span className="font-semibold text-brand-700">Dr</span> {debitEntry.accountName}
            <span className="tabular-nums text-muted-foreground ml-2">
              {formatMoney(config.voucherType === "payment" ? grossAmount : bankSideAmount)}
            </span>
          </p>
          <p className="text-[12px] text-foreground">
            <span className="font-semibold text-navy-700">Cr</span> {creditEntry.accountName}
            <span className="tabular-nums text-muted-foreground ml-2">
              {formatMoney(config.voucherType === "payment" ? bankSideAmount : grossAmount)}
            </span>
          </p>
          {config.voucherType === "payment" && tdsAmount > 0 && (
            <p className="text-[12px] text-foreground">
              <span className="font-semibold text-navy-700">Cr</span> TDS Payable
              <span className="tabular-nums text-muted-foreground ml-2">{formatMoney(tdsAmount)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
