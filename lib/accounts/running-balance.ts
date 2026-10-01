import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import type { RecordStatus } from "@/app/(app)/accounts/data";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";

export type BalanceSide = "Debit" | "Credit";

export interface BalanceAmount {
  amount: number;
  balanceType: BalanceSide;
}

export interface ChronologicalSortable {
  date: string;
  voucherNo: string;
  voucherId?: number;
  lineOrder?: number;
  voucherTime?: string;
}

export interface LedgerMovementLine {
  debit: number;
  credit: number;
}

/** Vouchers that affect ledger running balance — posted only (excludes draft, pending, rejected, cancelled). */
export function isPostedVoucherStatus(status: RecordStatus): boolean {
  return status === "posted";
}

/** Legacy postings that were approved before post workflow — still counted in movement totals. */
export function isLedgerMovementVoucherStatus(status: RecordStatus): boolean {
  return status === "posted" || status === "approved";
}

/** Signed balance: positive = Debit, negative = Credit. */
export function toSignedBalance(amount: number, side: BalanceSide): number {
  return side === "Debit" ? amount : -amount;
}

export function fromSignedBalance(signed: number): BalanceAmount {
  if (signed >= 0) return { amount: signed, balanceType: "Debit" };
  return { amount: Math.abs(signed), balanceType: "Credit" };
}

/** Which side the voucher line was posted on (Debit column vs Credit column). */
export function entrySideFromAmounts(debit: number, credit: number): BalanceSide | null {
  const d = Number(debit) || 0;
  const c = Number(credit) || 0;
  if (d > 0 && c <= 0) return "Debit";
  if (c > 0 && d <= 0) return "Credit";
  if (d > 0 && c > 0) return d >= c ? "Debit" : "Credit";
  return null;
}

export interface DrCrColumnSideInput {
  debit: number;
  credit: number;
  runningBalanceType: BalanceSide;
  /** Opening / closing rows reflect balance direction, not entry side. */
  isBalanceRow?: boolean;
}

/**
 * Dr/Cr indicator for ledger tables with a separate side column:
 * - Opening / closing / zero-movement rows → running balance side
 * - Posted lines → accounting entry side (credit column → Cr, debit column → Dr)
 */
export function resolveDrCrColumnSide(input: DrCrColumnSideInput): BalanceSide {
  if (input.isBalanceRow) return input.runningBalanceType;
  return entrySideFromAmounts(input.debit, input.credit) ?? input.runningBalanceType;
}

/** Apply a voucher line: running balance += Debit − Credit (standard double-entry). */
export function applyMovement(signedBalance: number, debit: number, credit: number): number {
  return signedBalance + debit - credit;
}

export function signedBalanceAfterMovements(
  startSigned: number,
  movements: LedgerMovementLine[],
): number {
  return movements.reduce((s, m) => applyMovement(s, m.debit, m.credit), startSigned);
}

export function openingSignedBalance(ledger: ChartOfAccount): number {
  return toSignedBalance(ledger.openingBalance, ledger.balanceType);
}

/**
 * Ledger accounting nature from classification — not from current balance direction.
 * Debit nature: Assets, Expenses, Customers, Bank, Cash.
 * Credit nature: Liabilities, Income, Capital/Equity, Vendors.
 */
export function isDebitNatureLedger(
  ledger: ChartOfAccount,
  records: ChartOfAccount[] = loadChartOfAccounts(),
): boolean {
  if (ledger.accountType === "Asset" || ledger.accountType === "Expense") return true;
  if (
    ledger.accountType === "Liability" ||
    ledger.accountType === "Income" ||
    ledger.accountType === "Equity"
  ) {
    return false;
  }

  const ledgerType = resolveLedgerType(ledger, records);
  if (
    ledgerType === "Customer" ||
    ledgerType === "Bank" ||
    ledgerType === "Cash" ||
    ledgerType === "Inventory" ||
    ledgerType === "Fixed Asset" ||
    ledgerType === "Purchase" ||
    ledgerType === "Expense" ||
    ledgerType === "GST"
  ) {
    return true;
  }
  if (
    ledgerType === "Vendor" ||
    ledgerType === "Income" ||
    ledgerType === "Sales" ||
    ledgerType === "Loan" ||
    ledgerType === "Employee Payable"
  ) {
    return false;
  }

  return ledger.balanceType === "Debit";
}

/** Chronological order: Date → Voucher Time (or voucher id) → Voucher No → line order. */
export function compareChronological(a: ChronologicalSortable, b: ChronologicalSortable): number {
  const d = a.date.localeCompare(b.date);
  if (d !== 0) return d;

  if (a.voucherTime && b.voucherTime) {
    const t = a.voucherTime.localeCompare(b.voucherTime);
    if (t !== 0) return t;
  } else if (a.voucherId != null && b.voucherId != null && a.voucherId !== b.voucherId) {
    return a.voucherId - b.voucherId;
  }

  const vn = a.voucherNo.localeCompare(b.voucherNo);
  if (vn !== 0) return vn;

  return (a.lineOrder ?? 0) - (b.lineOrder ?? 0);
}

export function sortChronological<T extends ChronologicalSortable>(rows: T[]): T[] {
  return [...rows].sort(compareChronological);
}

export interface RunningBalanceRow<T> {
  row: T;
  runningBalance: number;
  runningBalanceType: BalanceSide;
}

/** Build running balances sequentially from opening balance through posted movements. */
export function computeRunningBalances<T extends LedgerMovementLine>(
  opening: BalanceAmount,
  movements: T[],
): RunningBalanceRow<T>[] {
  let signed = toSignedBalance(opening.amount, opening.balanceType);
  return movements.map((row) => {
    signed = applyMovement(signed, row.debit, row.credit);
    const bal = fromSignedBalance(signed);
    return {
      row,
      runningBalance: bal.amount,
      runningBalanceType: bal.balanceType,
    };
  });
}

export function computeBalanceAtDate<T extends LedgerMovementLine & ChronologicalSortable>(
  ledger: ChartOfAccount,
  allMovements: T[],
  beforeDate: string,
): BalanceAmount {
  const prior = sortChronological(allMovements.filter((m) => m.date < beforeDate));
  const signed = signedBalanceAfterMovements(openingSignedBalance(ledger), prior);
  return fromSignedBalance(signed);
}

export function computeBalanceThroughDate<T extends LedgerMovementLine & ChronologicalSortable>(
  ledger: ChartOfAccount,
  allMovements: T[],
  throughDate: string,
): BalanceAmount {
  const through = sortChronological(allMovements.filter((m) => m.date <= throughDate));
  const signed = signedBalanceAfterMovements(openingSignedBalance(ledger), through);
  return fromSignedBalance(signed);
}
