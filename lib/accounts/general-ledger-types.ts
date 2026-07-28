import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { BalanceSide } from "@/lib/accounts/money-format";

export const GENERAL_LEDGER_SOURCE_REPORTS = {
  "trial-balance": "Trial Balance",
  "balance-sheet": "Balance Sheet",
  "profit-loss": "Profit & Loss",
  "cash-flow": "Cash Flow",
  "day-book": "Day Book",
  "chart-of-accounts": "Chart of Accounts",
} as const;

export type GeneralLedgerSourceReport = keyof typeof GENERAL_LEDGER_SOURCE_REPORTS;

export interface GeneralLedgerDrillDownParams {
  ledgerId?: number;
  groupId?: number;
  fromDate?: string;
  toDate?: string;
  source?: GeneralLedgerSourceReport | string;
  groupName?: string;
  branch?: string;
  warehouse?: string;
  company?: string;
  partyId?: string;
  financialYearId?: string;
  /** Restrict ledger picker / deep-link (Customer, Vendor, Bank, …). */
  ledgerType?: string;
}

export type GeneralLedgerLedgerType =
  | "Customer"
  | "Vendor"
  | "Bank"
  | "Cash"
  | "Sales"
  | "Purchase"
  | "GST"
  | "Expense"
  | "Income"
  | "Inventory"
  | "Employee"
  | "General";

export type GeneralLedgerRowKind = "opening" | "transaction" | "closing";

export interface GeneralLedgerDisplayRow {
  kind: GeneralLedgerRowKind;
  date: string;
  isoDate: string;
  voucherNo: string;
  voucherType: string;
  transactionType: string;
  partyName: string;
  gstin: string;
  pan: string;
  expenseHead: string;
  particulars: string;
  particularsNarration: string;
  debit: number;
  credit: number;
  bankCash: string;
  tdsSection: string;
  tdsAmount: number | null;
  gstAmount: number | null;
  referenceNo: string;
  /** Additive bill-wise fields when ledger has Bill-wise Accounting ON */
  billWiseReferenceNo?: string;
  billWiseReferenceType?: string;
  billWiseOriginalAmount?: number | null;
  billWiseAdjustedAmount?: number | null;
  billWiseOutstandingAmount?: number | null;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  voucherId?: number;
  lineOrder?: number;
  viewHref?: string;
  viewLabel?: string;
  /** @deprecated Use partyName */
  particular: string;
  /** @deprecated Use particularsNarration */
  narration: string;
}

export interface GeneralLedgerSummary {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string;
  ledgerType: GeneralLedgerLedgerType;
  parentGroup: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
  currentBalance: number;
  currentBalanceType: BalanceSide;
  grandTotalDebit: number;
  grandTotalCredit: number;
}

export interface GeneralLedgerFilters {
  dateFrom: string;
  dateTo: string;
  financialYearId?: string;
  voucherType?: string | string[];
  transactionType?: string | string[];
  debitCredit?: "all" | "debit" | "credit";
  branch?: string | string[];
  warehouse?: string | string[];
  company?: string;
  partyId?: string | string[];
  search?: string;
  voucherStatus?: string;
}

export interface GeneralLedgerStatement {
  summary: GeneralLedgerSummary;
  transactionRows: GeneralLedgerDisplayRow[];
  displayRows: GeneralLedgerDisplayRow[];
  hasPeriodTransactions: boolean;
}

export interface GeneralLedgerGroupChildRow {
  id: number;
  code: string;
  name: string;
  nodeLevel: "account_group" | "ledger";
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  closingDebit: number;
  closingCredit: number;
  closingBalanceType: BalanceSide;
}

export interface GeneralLedgerGroupDrillDown {
  groupId: number;
  groupName: string;
  parentGroup: string;
  children: GeneralLedgerGroupChildRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    debit: number;
    credit: number;
    closingDebit: number;
    closingCredit: number;
  };
}

export interface GeneralLedgerLedgerOption {
  id: string;
  code: string;
  name: string;
  ledgerType: GeneralLedgerLedgerType;
  parentGroup: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
}

export interface GeneralLedgerListingRow {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  ledgerType: GeneralLedgerLedgerType;
  parentGroup: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
  lastTransactionDate: string | null;
}

export interface GeneralLedgerListingFilters {
  dateFrom: string;
  dateTo: string;
  ledgerType: string;
  parentGroup: string;
  search: string;
}

export interface GeneralLedgerDemoScenario {
  id: string;
  label: string;
  ledgerName: string;
  ledgerId: number | null;
}

export interface GeneralLedgerVoucherTypeOption {
  value: string;
  label: string;
  code?: VoucherTypeCode;
}
