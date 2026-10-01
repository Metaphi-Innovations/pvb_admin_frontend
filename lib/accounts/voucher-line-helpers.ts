/**
 * Shared helpers for deriving primary debit/credit ledgers from voucher lines
 * (used by voucher listings that absorbed former register report columns).
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";

export interface VoucherLineLike {
  ledgerId?: number | null;
  ledgerName: string;
  debit: number;
  credit: number;
  remarks?: string;
}

export interface VoucherLedgerSummary {
  debitLedger: string;
  creditLedger: string;
  /** Full list for tooltip — all debit-side ledger labels. */
  debitLedgerTitle: string;
  /** Full list for tooltip — all credit-side ledger labels. */
  creditLedgerTitle: string;
}

function isTdsLine(line: VoucherLineLike): boolean {
  return (
    line.remarks?.toLowerCase().includes("tds") === true ||
    line.ledgerName.toLowerCase().includes("tds")
  );
}

function formatLedgerLabel(
  line: VoucherLineLike,
  records?: ChartOfAccount[],
): string {
  const name = line.ledgerName?.trim();
  if (!name) return "—";

  const code =
    line.ledgerId != null && records
      ? records.find((r) => r.id === line.ledgerId)?.accountCode?.trim()
      : undefined;

  if (code) return `${code} — ${name}`;
  return name;
}

function activeLines(lines: VoucherLineLike[]): VoucherLineLike[] {
  return lines.filter(
    (l) => l.ledgerName && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0),
  );
}

function summarizeSide(
  lines: VoucherLineLike[],
  side: "debit" | "credit",
  records?: ChartOfAccount[],
): { display: string; title: string } {
  const sideLines = lines.filter((l) => {
    if (isTdsLine(l)) return false;
    return side === "debit" ? (Number(l.debit) || 0) > 0 : (Number(l.credit) || 0) > 0;
  });

  const labels = sideLines
    .map((l) => formatLedgerLabel(l, records))
    .filter((label) => label !== "—");

  const unique = [...new Set(labels)];
  if (unique.length === 0) return { display: "—", title: "—" };
  if (unique.length === 1) return { display: unique[0], title: unique[0] };

  const extra = unique.length - 1;
  const firstName = unique[0].includes(" — ")
    ? unique[0].split(" — ").slice(1).join(" — ")
    : unique[0];

  return {
    display: `${firstName} +${extra} more`,
    title: unique.join(" · "),
  };
}

/** Compact listing label with optional multi-line summary (+N more) and tooltip text. */
export function summarizeVoucherLedgers(
  lines: VoucherLineLike[],
  records?: ChartOfAccount[],
): VoucherLedgerSummary {
  const active = activeLines(lines);
  const debit = summarizeSide(active, "debit", records);
  const credit = summarizeSide(active, "credit", records);
  return {
    debitLedger: debit.display,
    creditLedger: credit.display,
    debitLedgerTitle: debit.title,
    creditLedgerTitle: credit.title,
  };
}

/** @deprecated Prefer summarizeVoucherLedgers for listings — kept for simple single-line vouchers. */
export function primaryDebitCreditLedgers(
  lines: VoucherLineLike[],
  records?: ChartOfAccount[],
): {
  debitLedger: string;
  creditLedger: string;
} {
  const summary = summarizeVoucherLedgers(lines, records);
  return {
    debitLedger: summary.debitLedger,
    creditLedger: summary.creditLedger,
  };
}
