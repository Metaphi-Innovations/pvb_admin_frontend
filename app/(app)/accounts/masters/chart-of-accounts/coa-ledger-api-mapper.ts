import type { ChartOfAccount } from "../../data";
import type {
  LedgerDetailWithTransactionsDto,
  LedgerOpeningBalanceDto,
} from "@/services/ledger.service";
import type { CoaLedgerDetailRow } from "./coa-demo-accounting";

const ACCOUNTING_VOUCHER_TYPE_LABELS: Record<string, string> = {
  SALES: "Sales",
  DIRECT_SALES: "Direct Sales",
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

function buildOpeningBalanceRow(
  amount: number,
  side: "Debit" | "Credit",
  periodStart?: string,
): CoaLedgerDetailRow {
  const date =
    periodStart && /^\d{4}-\d{2}-\d{2}/.test(periodStart)
      ? periodStart.slice(0, 10)
      : "—";
  return {
    date,
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

/** Map ledger detail API response into COA statement rows + summary totals. */
export function buildApiLedgerDetailSummary(
  ledger: ChartOfAccount,
  detail?: LedgerDetailWithTransactionsDto,
  openingBalance?: LedgerOpeningBalanceDto | null,
  dateFrom?: string,
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
  const periodStart =
    dateFrom ||
    (periodOpening?.effectiveDate
      ? String(periodOpening.effectiveDate).slice(0, 10)
      : "");
  const openingRow =
    openingAmount > 0
      ? [buildOpeningBalanceRow(openingAmount, openingSide, periodStart)]
      : [];

  return {
    ledgerId: ledger.id,
    openingBalance: openingAmount,
    openingBalanceType: openingSide,
    currentBalance: detail?.currentBalance ?? openingAmount,
    balanceType: closingSide,
    totalDebit: detail?.totalDebit ?? 0,
    totalCredit: detail?.totalCredit ?? 0,
    transactions: [...openingRow, ...transactionRows],
  };
}
