"use client";

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
}: VoucherDualEntryPanelProps) {
  const debitEntry = getFormEntry(entries, "DEBIT");
  const creditEntry = getFormEntry(entries, "CREDIT");

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

  const debitFilter = (ledger: ChartOfAccount) =>
    config.debitAccountFilter(ledger, coaRecords, creditEntry?.accountId);
  const creditFilter = (ledger: ChartOfAccount) =>
    config.creditAccountFilter(ledger, coaRecords, debitEntry?.accountId);

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
      showAmount={amountEditableOnDebit}
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
      showAmount={amountEditableOnCredit}
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

  return (
    <div className="space-y-2.5">
      {config.voucherType === "contra" && (
        <p className="text-[11px] text-muted-foreground">
          Use Contra Voucher for transfers between bank and cash accounts.
        </p>
      )}

      {config.creditAccountFirst ? (
        <>
          {creditBlock}
          {debitBlock}
        </>
      ) : (
        <>
          {debitBlock}
          {creditBlock}
        </>
      )}

      {debitEntry?.accountId && creditEntry?.accountId && amount > 0 && (
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
