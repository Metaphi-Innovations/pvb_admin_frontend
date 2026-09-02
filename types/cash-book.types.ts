import type { BalanceSide } from "@/lib/accounts/money-format";

export interface ApiCashBookSummary {
  cashLedgerId: string | null;
  cashLedgerName: string;
  openingBalance: number;
  openingBalanceType: "DEBIT" | "CREDIT";
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  closingBalanceType: "DEBIT" | "CREDIT";
}

export interface ApiCashBookRow {
  id: string; // accounting_voucher_line_id
  voucherId: string; // accounting_voucher_id
  date: string; // YYYY-MM-DD
  voucherType: string;
  voucherNo: string;
  particular: string;
  narration: string | null;
  reference: string | null;
  receipt: number;
  payment: number;
  runningBalance: number;
  balanceType: "DEBIT" | "CREDIT";
  status: string;
  lineId: string;
  cashLedgerId: string;
  cashLedgerName: string;
}

export interface ApiCashBookPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiCashBookListResponse {
  summary: ApiCashBookSummary;
  rows: ApiCashBookRow[];
  pagination: ApiCashBookPagination;
}

export interface ApiCashBookLedgerOption {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string;
  subGroupName: string;
  subGroupCode: string;
}

export interface ApiCashBookVoucherType {
  code: string;
  label: string;
}

export interface CashBookQueryParams {
  cashLedgerId?: string;
  ledgerId?: string;
  fromDate?: string;
  toDate?: string;
  voucherType?: string;
  voucherNo?: string;
  particular?: string;
  reference?: string;
  narration?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  ordering?: string;
}
