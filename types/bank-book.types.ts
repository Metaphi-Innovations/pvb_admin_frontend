import type { BalanceSide } from "@/lib/accounts/money-format";

export interface ApiBankBookSummary {
  bankAccountId: string | null;
  bankName: string;
  accountNo: string;
  accountHolderName: string | null;
  ledgerId: string | null;
  ledgerName: string | null;
  openingBalance: number;
  openingBalanceType: "DEBIT" | "CREDIT";
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  closingBalanceType: "DEBIT" | "CREDIT";
}

export interface ApiBankBookRowItem {
  id: string;
  voucherId: string;
  lineId: string;
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
  bankDate: string | null;
  reconStatus: string;
  status: string;
  bankDetailId: string | null;
}

export interface ApiBankBookPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiBankBookListResponse {
  summary: ApiBankBookSummary;
  rows: ApiBankBookRowItem[];
  pagination: ApiBankBookPagination;
}

export interface ApiBankBookVoucherType {
  code: string;
  label: string;
}

export interface BankBookQueryParams {
  bankAccountId?: string;
  ledgerId?: string;
  fromDate?: string;
  toDate?: string;
  voucherType?: string;
  voucherNo?: string;
  particular?: string;
  reference?: string;
  narration?: string;
  reconStatus?: string;
  status?: string;
  bankDate?: string;
  search?: string;
  receiptMin?: number;
  receiptMax?: number;
  paymentMin?: number;
  paymentMax?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  ordering?: string;
}
