import { roundMoney } from "@/lib/accounts/money-format";
import {
  formatDisplayDate,
  formatDisplayDateRange,
  formatDisplayDateTime,
} from "@/lib/accounts/date-display";
import { receiptEditPath, receiptViewPath } from "@/app/(app)/accounts/vouchers/receipt/receipt-voucher-utils";
import { paymentEditPath, paymentViewPath } from "@/app/(app)/accounts/vouchers/payment/payment-voucher-utils";
import { contraEditPath, contraViewPath } from "@/app/(app)/accounts/vouchers/contra/contra-voucher-utils";
import { journalEditPath, journalViewPath } from "@/app/(app)/accounts/vouchers/journal/journal-voucher-utils";
import type {
  AccountingVoucherTypeApi,
  BookEntryListItem,
  DashboardBankAccountItem,
  ReconciledMatchListItem,
  StatementImportListItem,
  StatementLineListItem,
} from "@/types/bank-reconciliation.types";

/** API-backed voucher view URL — never the legacy `/vouchers/view/:numericId` demo route. */
export function bankReconVoucherViewHref(
  voucherType: AccountingVoucherTypeApi | string,
  accountingVoucherId: string,
): string {
  switch (String(voucherType).toUpperCase()) {
    case "RECEIPT":
      return receiptViewPath(accountingVoucherId);
    case "PAYMENT":
      return paymentViewPath(accountingVoucherId);
    case "CONTRA":
      return contraViewPath(accountingVoucherId);
    case "JOURNAL":
      return journalViewPath(accountingVoucherId);
    default:
      return `/accounts/vouchers?voucherId=${encodeURIComponent(accountingVoucherId)}`;
  }
}

export function bankReconVoucherEditHref(
  voucherType: AccountingVoucherTypeApi | string,
  accountingVoucherId: string,
): string | null {
  switch (String(voucherType).toUpperCase()) {
    case "RECEIPT":
      return receiptEditPath(accountingVoucherId);
    case "PAYMENT":
      return paymentEditPath(accountingVoucherId);
    case "CONTRA":
      return contraEditPath(accountingVoucherId);
    case "JOURNAL":
      return journalEditPath(accountingVoucherId);
    default:
      return null;
  }
}

export function parseApiAmount(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? roundMoney(n) : 0;
}

export function maskAccountNumber(accountNumber: string | null | undefined): string {
  if (!accountNumber) return "—";
  const digits = accountNumber.replace(/\s/g, "");
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

export function formatAccountTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

const VOUCHER_TYPE_LABELS: Record<string, string> = {
  RECEIPT: "Receipt",
  PAYMENT: "Payment",
  CONTRA: "Contra",
  JOURNAL: "Journal",
  SALES_INVOICE: "Sales Invoice",
  PURCHASE_INVOICE: "Purchase Invoice",
  DEBIT_NOTE: "Debit Note",
  CREDIT_NOTE: "Credit Note",
};

export function voucherTypeLabel(type: AccountingVoucherTypeApi): string {
  return VOUCHER_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function voucherTypeFilterToApi(
  filter: string,
): AccountingVoucherTypeApi | undefined {
  switch (filter) {
    case "payment":
      return "PAYMENT";
    case "receipt":
      return "RECEIPT";
    case "contra":
      return "CONTRA";
    case "journal":
      return "JOURNAL";
    default:
      return undefined;
  }
}

export interface BankReconListingRowUi {
  id: string;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  maskedAccountNumber: string;
  accountType: string;
  bookBalance: number | null;
  bookLedgerLinked: boolean;
  statementBalanceDisplay: number | null;
  differenceDisplay: number | null;
  pendingReconciliationCount: number;
  lastReconciledDate: string | null;
  reconciliationEnabled: boolean;
}

export function mapDashboardItemToListingRow(
  item: DashboardBankAccountItem,
): BankReconListingRowUi {
  const bookBalance = item.balanceAsPerBooks != null ? parseApiAmount(item.balanceAsPerBooks) : null;
  const statementBalanceDisplay =
    item.bankStatementBalance != null ? parseApiAmount(item.bankStatementBalance) : null;
  const differenceDisplay =
    item.difference != null ? parseApiAmount(item.difference) : null;

  return {
    id: item.bankAccountId,
    bankName: item.bankName ?? "—",
    accountNickname: item.ledgerName ?? item.accountHolderName ?? "—",
    accountNumber: item.accountNumber ?? "",
    maskedAccountNumber: maskAccountNumber(item.accountNumber),
    accountType: formatAccountTypeLabel(item.accountType),
    bookBalance,
    bookLedgerLinked: bookBalance != null,
    statementBalanceDisplay,
    differenceDisplay,
    pendingReconciliationCount: item.unreconciledCount,
    lastReconciledDate: item.lastReconciledDate,
    reconciliationEnabled: item.reconciliationEnabled,
  };
}

export interface BankReconBookRowUi {
  id: string;
  bankAccountId: string;
  voucherId: string;
  voucherDate: string;
  particulars: string;
  voucherType: string;
  voucherTypeCode: string;
  voucherNumber: string;
  instrumentNumber: string;
  deposit: number;
  withdrawal: number;
  bankDate: string | null;
  status: "RECONCILED" | "UNRECONCILED";
  reconciliationMode: "MANUAL" | "STATEMENT" | null;
  viewHref: string;
  editHref: string | null;
}

export function mapBookEntryToUiRow(item: BookEntryListItem): BankReconBookRowUi {
  const instrument =
    item.utrNumber || item.chequeNumber || item.instrumentReference || "";
  const isReconciled = item.reconciliationStatus === "RECONCILED";

  // Keep original voucher/transaction date separate from bank cleared date.
  // Bulk manual reconcile may share one clearedDate across rows — that is valid.
  // Never substitute clearedDate/reconciliationDate for voucherDate.
  return {
    id: item.bankDetailId,
    bankAccountId: item.bankAccountId,
    voucherId: item.accountingVoucherId,
    voucherDate: item.voucherDate,
    particulars: item.particular ?? "—",
    voucherType: voucherTypeLabel(item.voucherType),
    voucherTypeCode: item.voucherType.toLowerCase(),
    voucherNumber: item.voucherNumber,
    instrumentNumber: instrument,
    deposit: parseApiAmount(item.deposit),
    withdrawal: parseApiAmount(item.withdrawal),
    bankDate: item.clearedDate,
    status: isReconciled ? "RECONCILED" : "UNRECONCILED",
    reconciliationMode: item.reconciliationMode,
    viewHref: bankReconVoucherViewHref(item.voucherType, item.accountingVoucherId),
    editHref: bankReconVoucherEditHref(item.voucherType, item.accountingVoucherId),
  };
}

export interface WorkspaceAccountUi {
  id: string;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  accountType: string;
  reconciliationEnabled: boolean;
}

export function mapDashboardItemToWorkspaceAccount(
  item: DashboardBankAccountItem,
): WorkspaceAccountUi {
  return {
    id: item.bankAccountId,
    bankName: item.bankName ?? "—",
    accountNickname: item.ledgerName ?? item.accountHolderName ?? "—",
    accountNumber: item.accountNumber ?? "",
    accountType: formatAccountTypeLabel(item.accountType),
    reconciliationEnabled: item.reconciliationEnabled,
  };
}

export interface WorkspaceSummaryUi {
  balanceAsPerBooks: number;
  statementBalance: number | null;
  difference: number | null;
  pendingCount: number;
  reconciledCount: number | null;
  unmatchedBankEntries: number | null;
}

export function mapDashboardItemToWorkspaceSummary(
  item: DashboardBankAccountItem,
  extras?: { reconciledCount?: number | null; unmatchedBankEntries?: number | null },
): WorkspaceSummaryUi {
  return {
    balanceAsPerBooks: parseApiAmount(item.balanceAsPerBooks),
    statementBalance:
      item.bankStatementBalance != null ? parseApiAmount(item.bankStatementBalance) : null,
    difference: item.difference != null ? parseApiAmount(item.difference) : null,
    pendingCount: item.unreconciledCount,
    reconciledCount: extras?.reconciledCount ?? null,
    unmatchedBankEntries: extras?.unmatchedBankEntries ?? null,
  };
}

export function formatImportPeriod(
  from: string | null,
  to: string | null,
): string {
  return formatDisplayDateRange(from, to);
}

export function formatApiDateTime(iso: string): string {
  return formatDisplayDateTime(iso);
}

export interface StatementBookRowUi {
  id: string;
  voucherDate: string;
  particulars: string;
  voucherType: string;
  voucherNumber: string;
  instrumentNumber: string;
  deposit: number;
  withdrawal: number;
}

export function mapBookEntryToStatementBookRow(
  item: BookEntryListItem,
): StatementBookRowUi {
  const row = mapBookEntryToUiRow(item);
  return {
    id: row.id,
    voucherDate: row.voucherDate,
    particulars: row.particulars,
    voucherType: row.voucherType,
    voucherNumber: row.voucherNumber,
    instrumentNumber: row.instrumentNumber,
    deposit: row.deposit,
    withdrawal: row.withdrawal,
  };
}

export interface StatementLineRowUi {
  id: string;
  bankDate: string;
  valueDate: string;
  description: string;
  reference: string;
  deposit: number;
  withdrawal: number;
  matchStatus: "Unmatched" | "Matched";
}

export function mapStatementLineToUiRow(
  item: StatementLineListItem,
): StatementLineRowUi {
  return {
    id: item.bankStatementLineId,
    bankDate: item.transactionDate,
    valueDate: item.valueDate ?? item.transactionDate,
    description: item.narration ?? "—",
    reference: item.reference || item.utrNumber || item.chequeNumber || "—",
    deposit: parseApiAmount(item.deposit),
    withdrawal: parseApiAmount(item.withdrawal),
    matchStatus: item.isMatched ? "Matched" : "Unmatched",
  };
}

export interface ReconciledMatchUi {
  id: string;
  bookDate: string;
  bankDate: string;
  voucherType: string;
  voucherNumber: string;
  particulars: string;
  bankDescription: string;
  instrumentNumber: string;
  amount: number;
  direction: "deposit" | "withdrawal";
  reconciledBy: string;
  reconciledOn: string;
  mode: "Manual" | "Statement";
  bankDetailId: string;
  bankStatementLineId: string | null;
  raw: ReconciledMatchListItem;
}

export function mapMatchToUiRow(item: ReconciledMatchListItem): ReconciledMatchUi {
  const amount = parseApiAmount(item.bookAmount);
  const direction = item.bookDirection === "DEPOSIT" ? "deposit" : "withdrawal";

  return {
    id: item.bankDetailId,
    bookDate: item.voucherDate,
    bankDate: item.clearedDate ?? item.reconciliationDate ?? "—",
    voucherType: voucherTypeLabel(item.voucherType),
    voucherNumber: item.voucherNumber,
    particulars: item.voucherNumber,
    bankDescription: item.statementNarration ?? "—",
    instrumentNumber: "—",
    amount,
    direction,
    reconciledBy: item.reconciledBy ?? "—",
    reconciledOn: item.reconciliationDate ?? item.clearedDate ?? "—",
    mode: item.reconciliationMode === "STATEMENT" ? "Statement" : "Manual",
    bankDetailId: item.bankDetailId,
    bankStatementLineId: item.bankStatementLineId,
    raw: item,
  };
}

export function mapImportToUi(item: StatementImportListItem) {
  return {
    id: item.bankStatementImportId,
    fileName: item.originalFileName,
    periodFrom: item.statementFromDate,
    periodTo: item.statementToDate,
    uploadedAt: item.uploadedAt,
    uploadedBy: item.uploadedBy ?? "—",
    rowsRead: item.totalRows,
    newTransactions: item.newRows,
    duplicates: item.duplicateRows,
    errorRows: item.errorRows,
    closingBalance: parseApiAmount(item.closingBalance),
    status: item.importStatus,
    errorMessage: item.errorMessage,
    errorDetails: null as Record<string, unknown> | null,
  };
}
