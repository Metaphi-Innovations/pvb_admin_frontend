"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  VOUCHER_MUTED_TEXT,
  VOUCHER_SECTION_TITLE,
  VOUCHER_BODY_TEXT,
} from "@/components/accounts/voucher-simple-form-ui";

export type AccountingEntrySide = "debit" | "credit";

export interface VoucherAccountingEntryLine {
  side: AccountingEntrySide;
  ledger: string;
  amount: number;
}

/** @deprecated Use VoucherAccountingEntryLine */
export type VoucherAccountingPreviewEntry = VoucherAccountingEntryLine;

function accountingSideLabel(side: AccountingEntrySide): string {
  return side === "debit" ? "Debit" : "Credit";
}

export function VoucherAccountingEntry({
  entries,
  className,
  emptyHint = "Select accounts and enter amount to see the accounting entry.",
}: {
  entries: VoucherAccountingEntryLine[];
  className?: string;
  emptyHint?: string;
}) {
  return (
    <section className={cn("w-full", className)}>
      <h2 className={VOUCHER_SECTION_TITLE}>Accounting Entry</h2>
      <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
        {entries.length === 0 ? (
          <p className={cn(VOUCHER_MUTED_TEXT, "py-0.5 italic text-xs")}>{emptyHint}</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((entry, i) => (
              <div
                key={`${entry.side}-${entry.ledger}-${i}`}
                className={cn("flex items-baseline gap-3", VOUCHER_BODY_TEXT)}
              >
                <span className="w-[52px] flex-shrink-0 text-[13px] font-medium text-foreground">
                  {accountingSideLabel(entry.side)}
                </span>
                <span className="flex-1 min-w-0 truncate" title={entry.ledger}>
                  {entry.ledger}
                </span>
                <span className="flex-shrink-0 tabular-nums font-medium text-foreground">
                  {formatMoney(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {entries.length > 0 && (
        <p className={cn("mt-1.5 text-xs text-muted-foreground")}>
          Read-only — this voucher entry will be posted exactly as shown.
        </p>
      )}
    </section>
  );
}

/** @deprecated Use VoucherAccountingEntry */
export const VoucherAccountingPreview = VoucherAccountingEntry;

export function voucherLinesToAccountingEntries(
  lines: Array<{ ledgerName: string; debit: number; credit: number }>,
): VoucherAccountingEntryLine[] {
  return lines
    .filter((l) => l.ledgerName && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
    .map((l) => ({
      side: (Number(l.debit) || 0) > 0 ? ("debit" as const) : ("credit" as const),
      ledger: l.ledgerName,
      amount: roundEntryAmount(Number(l.debit) || Number(l.credit) || 0),
    }));
}

/** @deprecated Use voucherLinesToAccountingEntries */
export const voucherLinesToPreviewEntries = voucherLinesToAccountingEntries;

function roundEntryAmount(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildReceiptAccountingEntries(
  bankName: string,
  partyName: string,
  bankAmount: number,
  partyAmount?: number,
): VoucherAccountingEntryLine[] {
  const credit = partyAmount ?? bankAmount;
  if (!bankName || !partyName || bankAmount <= 0) return [];
  return [
    { side: "debit", ledger: bankName, amount: bankAmount },
    { side: "credit", ledger: partyName, amount: credit },
  ];
}

/** @deprecated Use buildReceiptAccountingEntries */
export const buildReceiptPreviewEntries = buildReceiptAccountingEntries;

export function buildPaymentAccountingEntries(
  bankName: string,
  partyName: string,
  partyAmount: number,
  bankAmount?: number,
): VoucherAccountingEntryLine[] {
  const credit = bankAmount ?? partyAmount;
  if (!bankName || !partyName || partyAmount <= 0) return [];
  return [
    { side: "debit", ledger: partyName, amount: partyAmount },
    { side: "credit", ledger: bankName, amount: credit },
  ];
}

/** @deprecated Use buildPaymentAccountingEntries */
export const buildPaymentPreviewEntries = buildPaymentAccountingEntries;

export function buildContraAccountingEntries(
  fromName: string,
  toName: string,
  amount: number,
): VoucherAccountingEntryLine[] {
  if (!fromName || !toName || amount <= 0) return [];
  return [
    { side: "debit", ledger: toName, amount },
    { side: "credit", ledger: fromName, amount },
  ];
}

/** @deprecated Use buildContraAccountingEntries */
export const buildContraPreviewEntries = buildContraAccountingEntries;
