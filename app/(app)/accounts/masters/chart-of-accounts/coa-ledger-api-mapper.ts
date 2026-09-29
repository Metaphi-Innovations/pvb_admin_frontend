import type { ChartOfAccount } from "../../data";
import type {
  LedgerDetailWithTransactionsDto,
  LedgerOpeningBalanceDto,
} from "@/services/ledger.service";
import { roundMoney } from "@/lib/accounts/money-format";
import type { CoaLedgerDetailRow } from "./coa-ledger-detail-types";

const ACCOUNTING_VOUCHER_TYPE_LABELS: Record<string, string> = {
  SALES: "Sales",
  DIRECT_SALES: "Direct Sales",
  DIRECT_SERVICE: "Direct Service",
  PURCHASE: "Purchase",
  DIRECT_PURCHASE: "Direct Purchase",
  SALES_RETURN: "Sales Return",
  PURCHASE_RETURN: "Purchase Return",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
  SCHEME_CREDIT_NOTE: "Scheme Credit Note",
  RECEIPT: "Receipt",
  PAYMENT: "Payment",
  CONTRA: "Contra",
  JOURNAL: "Journal",
  STOCK_TRANSFER: "Stock Transfer",
  REVERSAL: "Reversal",
};

function formatVoucherType(type: string): string {
  const key = String(type ?? "").trim().toUpperCase();
  if (ACCOUNTING_VOUCHER_TYPE_LABELS[key]) return ACCOUNTING_VOUCHER_TYPE_LABELS[key];
  return key
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveOpeningSide(
  balanceType: string | null | undefined,
  fallback: "Debit" | "Credit" = "Debit",
): "Debit" | "Credit" {
  const value = String(balanceType ?? fallback).toUpperCase();
  return value === "CREDIT" || value === "CR" ? "Credit" : "Debit";
}

function isSyntheticPeriodOpening(
  row: LedgerOpeningBalanceDto | null | undefined,
): boolean {
  if (!row) return true;
  if (row.openingBalanceId === "period-opening") return true;
  return String(row.narration ?? "").trim().toLowerCase() === "period opening balance";
}

function toIsoDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

/**
 * Real master OB / FY effective date — never the period filter start.
 * Backend period opening overwrites effectiveDate with dateFrom.
 */
function resolveOpeningBalanceDisplayDate(
  detail: LedgerDetailWithTransactionsDto | undefined,
  masterOpening: LedgerOpeningBalanceDto | null | undefined,
  dateFrom?: string,
): string {
  const masters = (detail?.openingBalances ?? []).filter(
    (row) => !isSyntheticPeriodOpening(row),
  );
  const preferred =
    (!isSyntheticPeriodOpening(masterOpening) ? masterOpening : null) ??
    masters[0] ??
    null;
  const fromMaster = toIsoDate(preferred?.effectiveDate);
  if (fromMaster) return fromMaster;
  // No stored master OB date — fall back to Indian FY start for the selected range.
  if (dateFrom && /^\d{4}-\d{2}-\d{2}/.test(dateFrom.slice(0, 10))) {
    const y = parseInt(dateFrom.slice(0, 4), 10);
    const m = parseInt(dateFrom.slice(5, 7), 10);
    if (Number.isFinite(y) && y > 1900 && Number.isFinite(m)) {
      return `${m >= 4 ? y : y - 1}-04-01`;
    }
  }
  return "—";
}

function buildOpeningBalanceRow(
  amount: number,
  side: "Debit" | "Credit",
  openingDate: string,
): CoaLedgerDetailRow {
  return {
    date: openingDate,
    voucherNo: "—",
    voucherType: "Opening Balance",
    referenceNo: "—",
    narration: "Opening Balance",
    debit: side === "Debit" ? amount : 0,
    credit: side === "Credit" ? amount : 0,
    runningBalance: amount,
    runningBalanceType: side,
    isOpeningRow: true,
  };
}

function mapApiTransactions(
  transactions: LedgerDetailWithTransactionsDto["transactions"],
): CoaLedgerDetailRow[] {
  return (transactions ?? []).map((row) => ({
    date: row.date ? String(row.date).slice(0, 10) : "",
    voucherNo: row.voucherNo,
    voucherType: formatVoucherType(row.voucherType),
    referenceNo: "—",
    narration: row.narration || "—",
    debit: row.debit,
    credit: row.credit,
    runningBalance: row.runningBalance,
    runningBalanceType: row.runningBalanceType,
    voucherId: row.voucherId as unknown as number,
    isOpeningRow: false,
  }));
}

/**
 * Period debit/credit totals only — exclude Opening Balance rows.
 * Opening is carried forward separately; it is not period movement.
 */
function periodMovementTotals(rows: CoaLedgerDetailRow[]): {
  totalDebit: number;
  totalCredit: number;
} {
  return rows.reduce(
    (acc, row) => {
      if (row.isOpeningRow) return acc;
      return {
        totalDebit: acc.totalDebit + (Number(row.debit) || 0),
        totalCredit: acc.totalCredit + (Number(row.credit) || 0),
      };
    },
    { totalDebit: 0, totalCredit: 0 },
  );
}

/** Map ledger detail API response into COA statement rows + summary totals. */
export function buildApiLedgerDetailSummary(
  ledger: ChartOfAccount,
  detail?: LedgerDetailWithTransactionsDto,
  openingBalance?: LedgerOpeningBalanceDto | null,
  _dateFrom?: string,
) {
  const periodOpening = detail?.openingBalance ?? openingBalance;
  const parsedOpeningAmount =
    periodOpening?.amount != null
      ? Number(periodOpening.amount)
      : ledger.openingBalance ?? 0;
  const openingAmount = Number.isFinite(parsedOpeningAmount) ? parsedOpeningAmount : 0;
  const openingSide = resolveOpeningSide(
    periodOpening?.balanceType ?? ledger.balanceType,
    ledger.balanceType ?? "Debit",
  );
  const closingSide = resolveOpeningSide(detail?.balanceType, openingSide);
  const transactionRows = mapApiTransactions(detail?.transactions);
  // Only show synthetic Opening Balance when the period has real movements.
  // Otherwise "Today" (and any empty range) wrongly looks like a same-day entry.
  const openingDate = resolveOpeningBalanceDisplayDate(
    detail,
    openingBalance,
    _dateFrom,
  );
  const openingRow =
    openingAmount > 0 && transactionRows.length > 0
      ? [buildOpeningBalanceRow(openingAmount, openingSide, openingDate)]
      : [];
  const transactions = [...openingRow, ...transactionRows];
  // Prefer API period totals (already exclude opening); else sum non-opening rows.
  const fromApiDebit =
    detail?.totalDebit != null ? Number(detail.totalDebit) : NaN;
  const fromApiCredit =
    detail?.totalCredit != null ? Number(detail.totalCredit) : NaN;
  const movementTotals = periodMovementTotals(transactions);
  const totalDebit = Number.isFinite(fromApiDebit)
    ? fromApiDebit
    : movementTotals.totalDebit;
  const totalCredit = Number.isFinite(fromApiCredit)
    ? fromApiCredit
    : movementTotals.totalCredit;
  const lastRow = transactions.length > 0 ? transactions[transactions.length - 1] : null;
  // Prefer last running balance so footer closing always matches the statement grid.
  // With no movement rows, closing equals period opening (header still shows both).
  const currentBalance = lastRow
    ? lastRow.runningBalance
    : (detail?.currentBalance ?? openingAmount);
  const balanceType = lastRow ? lastRow.runningBalanceType : closingSide;

  return {
    ledgerId: ledger.id,
    openingBalance: openingAmount,
    openingBalanceType: openingSide,
    currentBalance,
    balanceType,
    // Period movements only — Opening Balance is not included.
    totalDebit: roundMoney(totalDebit),
    totalCredit: roundMoney(totalCredit),
    transactions,
  };
}
