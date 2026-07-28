/**
 * Fully Reconciled Demo — self-contained sample whose BRS Final Difference
 * derives to exactly 0 from opening + matched movements (never hardcoded).
 *
 * Exception-heavy scenarios stay on hdfc-current (see tally-demo-seed).
 */

import { roundMoney } from "@/lib/accounts/money-format";

export const FULLY_RECONCILED_ACCOUNT_ID = "fully-reconciled-demo";

export const FULLY_RECONCILED_OPENING_BALANCE = 1_000_000;

export const FULLY_RECONCILED_PERIOD_FROM = "2026-06-01";
export const FULLY_RECONCILED_PERIOD_TO = "2026-06-30";

/** Matched book ↔ statement movements (same amounts and direction). */
export const FULLY_RECONCILED_MOVEMENTS = [
  {
    key: "fr-receipt-1",
    voucherDate: "2026-06-05",
    bankDate: "2026-06-05",
    particulars: "Krishna Agro Inputs Pvt Ltd",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-FR-0001",
    instrumentNumber: "UTR-FR-RCP0001",
    deposit: 250_000,
    withdrawal: 0,
    narration: "NEFT CR — KRISHNA AGRO INPUTS — INV PYMT",
  },
  {
    key: "fr-payment-1",
    voucherDate: "2026-06-08",
    bankDate: "2026-06-08",
    particulars: "Mahindra Agro Distributors",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-FR-0001",
    instrumentNumber: "CHQ-FR-4501",
    deposit: 0,
    withdrawal: 75_000,
    narration: "NEFT DR — MAHINDRA AGRO — VENDOR PYMT",
  },
  {
    key: "fr-receipt-2",
    voucherDate: "2026-06-12",
    bankDate: "2026-06-12",
    particulars: "Green Valley Farmers Co-op",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-FR-0002",
    instrumentNumber: "UTR-FR-RCP0002",
    deposit: 120_000,
    withdrawal: 0,
    narration: "NEFT CR — GREEN VALLEY CO-OP — COLLECTION",
  },
  {
    key: "fr-payment-2",
    voucherDate: "2026-06-15",
    bankDate: "2026-06-15",
    particulars: "GST Payable",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-FR-0002",
    instrumentNumber: "CHQ-FR-4502",
    deposit: 0,
    withdrawal: 45_500,
    narration: "NEFT DR — GST CHALLAN JUN-2026",
  },
  {
    key: "fr-contra-1",
    voucherDate: "2026-06-20",
    bankDate: "2026-06-20",
    particulars: "Transfer from Cash",
    voucherType: "Contra",
    voucherTypeCode: "contra",
    voucherNumber: "CNT-FR-0001",
    instrumentNumber: "FT-FR-2001",
    deposit: 50_000,
    withdrawal: 0,
    narration: "FT CR — CASH TO BANK TRANSFER",
  },
  {
    key: "fr-payment-3",
    voucherDate: "2026-06-25",
    bankDate: "2026-06-25",
    particulars: "Office Rent",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-FR-0003",
    instrumentNumber: "UTR-FR-PMT0003",
    deposit: 0,
    withdrawal: 30_000,
    narration: "NEFT DR — OFFICE RENT JUN-2026",
  },
] as const;

export function isFullyReconciledDemoAccount(bankAccountId: string): boolean {
  return bankAccountId === FULLY_RECONCILED_ACCOUNT_ID;
}

export function fullyReconciledBookId(key: string): string {
  return `book:${FULLY_RECONCILED_ACCOUNT_ID}:${key}`;
}

export function fullyReconciledStatementId(key: string): string {
  return `tally-fr-stmt-${key}`;
}

export function getFullyReconciledNetMovement(): number {
  return roundMoney(
    FULLY_RECONCILED_MOVEMENTS.reduce((s, m) => s + m.deposit - m.withdrawal, 0),
  );
}

/** Balance as per Books = Opening + net matched movements. */
export function getFullyReconciledBookBalance(): number {
  return roundMoney(FULLY_RECONCILED_OPENING_BALANCE + getFullyReconciledNetMovement());
}

/**
 * Closing statement balance derived from the same opening + same movements.
 * Equals book balance when every movement is matched and reconciled.
 */
export function getFullyReconciledClosingStatementBalance(): number {
  return getFullyReconciledBookBalance();
}
