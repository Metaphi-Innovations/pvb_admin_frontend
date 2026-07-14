/**
 * Shared helpers for deriving primary debit/credit ledgers from voucher lines
 * (used by voucher listings that absorbed former register report columns).
 */

export interface VoucherLineLike {
  ledgerName: string;
  debit: number;
  credit: number;
  remarks?: string;
}

export function primaryDebitCreditLedgers(lines: VoucherLineLike[]): {
  debitLedger: string;
  creditLedger: string;
} {
  const active = lines.filter(
    (l) => l.ledgerName && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0),
  );
  const isTds = (l: VoucherLineLike) =>
    l.remarks?.toLowerCase().includes("tds") || l.ledgerName.toLowerCase().includes("tds");

  const debitLines = active.filter((l) => (Number(l.debit) || 0) > 0 && !isTds(l));
  const creditLines = active.filter((l) => (Number(l.credit) || 0) > 0 && !isTds(l));

  return {
    debitLedger: debitLines[0]?.ledgerName?.trim() || "—",
    creditLedger: creditLines[0]?.ledgerName?.trim() || "—",
  };
}
