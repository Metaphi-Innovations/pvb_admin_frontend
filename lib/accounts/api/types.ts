/**
 * REST API contracts for Accounts module.
 * Implement these endpoints on the backend; client uses local services until API is live.
 */

import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { RecordStatus } from "@/app/(app)/accounts/data";

export const ACCOUNTS_API_BASE = "/api/accounts";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { page?: number; pageSize?: number; total?: number };
}

// ── Chart of Accounts ─────────────────────────────────────────────────────────
export interface CoaAccountDto {
  id: number;
  accountCode: string;
  accountName: string;
  nodeLevel: string;
  parentId: number | null;
  accountType: string;
  status: string;
  isSystem: boolean;
  openingBalance: number;
  balanceType: string;
}

export interface CreateLedgerDto {
  parentGroupId: number;
  accountName: string;
  alias?: string;
  openingBalance?: number;
  balanceType?: "Debit" | "Credit";
  gstApplicable?: boolean;
  tdsApplicable?: boolean;
  bankAccountFlag?: boolean;
}

export interface CreateSubLedgerDto {
  parentLedgerId: number;
  accountName: string;
  alias?: string;
}

// ── Vouchers ──────────────────────────────────────────────────────────────────
export interface VoucherLineDto {
  coaAccountId: number;
  debit: number;
  credit: number;
  remarks?: string;
  costCenterId?: number;
}

export interface CreateVoucherDto {
  voucherType: VoucherTypeCode;
  date: string;
  referenceNo?: string;
  narration: string;
  lines: VoucherLineDto[];
  financialYearId?: number;
}

export interface VoucherDto {
  id: number;
  voucherType: VoucherTypeCode;
  voucherNumber: string;
  date: string;
  status: RecordStatus;
  totalDebit: number;
  totalCredit: number;
  lines: (VoucherLineDto & { id: number; accountName: string })[];
}

// ── ERP Posting ───────────────────────────────────────────────────────────────
export interface ErpPostDto {
  sourceModule: "procurement" | "sales" | "hr" | "warehouse";
  sourceDocumentId: number | string;
  sourceDocumentNo: string;
  voucherType: VoucherTypeCode;
  date: string;
  narration: string;
  lines: { mappingKey: string; partyName?: string; debit: number; credit: number }[];
}

/** Endpoint map */
export const ACCOUNTS_ENDPOINTS = {
  coa: {
    list: `${ACCOUNTS_API_BASE}/coa`,
    ledger: `${ACCOUNTS_API_BASE}/coa/ledgers`,
    subLedger: `${ACCOUNTS_API_BASE}/coa/sub-ledgers`,
    byId: (id: number) => `${ACCOUNTS_API_BASE}/coa/${id}`,
  },
  vouchers: {
    list: `${ACCOUNTS_API_BASE}/vouchers`,
    byId: (id: number) => `${ACCOUNTS_API_BASE}/vouchers/${id}`,
    post: (id: number) => `${ACCOUNTS_API_BASE}/vouchers/${id}/post`,
    approve: (id: number) => `${ACCOUNTS_API_BASE}/vouchers/${id}/approve`,
    erpPost: `${ACCOUNTS_API_BASE}/vouchers/erp-post`,
  },
  reports: {
    trialBalance: `${ACCOUNTS_API_BASE}/reports/trial-balance`,
    ledger: `${ACCOUNTS_API_BASE}/reports/ledger`,
    pl: `${ACCOUNTS_API_BASE}/reports/pl`,
    balanceSheet: `${ACCOUNTS_API_BASE}/reports/balance-sheet`,
    dayBook: `${ACCOUNTS_API_BASE}/reports/day-book`,
    cashBook: `${ACCOUNTS_API_BASE}/reports/cash-book`,
    bankBook: `${ACCOUNTS_API_BASE}/reports/bank-book`,
    receivables: `${ACCOUNTS_API_BASE}/reports/receivables`,
    payables: `${ACCOUNTS_API_BASE}/reports/payables`,
    gst: `${ACCOUNTS_API_BASE}/reports/gst`,
    cashFlow: `${ACCOUNTS_API_BASE}/reports/cash-flow`,
    stockValuation: `${ACCOUNTS_API_BASE}/reports/stock-valuation`,
  },
  masters: {
    financialYears: `${ACCOUNTS_API_BASE}/masters/financial-years`,
    voucherTypes: `${ACCOUNTS_API_BASE}/masters/voucher-types`,
    costCenters: `${ACCOUNTS_API_BASE}/masters/cost-centers`,
    bankAccounts: `${ACCOUNTS_API_BASE}/masters/bank-accounts`,
    settings: `${ACCOUNTS_API_BASE}/masters/settings`,
    ledgerMappings: `${ACCOUNTS_API_BASE}/masters/ledger-mappings`,
  },
} as const;
