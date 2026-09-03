/** Bill-wise Outstanding API types — aligned with backend BillWiseOutstanding module. */

export type BillWiseDisplayStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "PAID"
  | "REVERSED";

export type BillWiseAccountingStatus =
  | "OPEN"
  | "PARTIALLY_SETTLED"
  | "SETTLED"
  | "REVERSED";

export interface BillWiseOutstandingSummaryApi {
  totalBills: number;
  totalInvoiceAmount: number;
  totalAdjustedAmount: number;
  totalOutstandingAmount: number;
  totalOverdueAmount: number;
}

export interface BillWisePartyRefApi {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
}

export interface BillWiseBranchRefApi {
  branchId: string;
  branchName: string;
}

export interface BillWiseSourceRefApi {
  entityType: string;
  entityId: string;
}

export interface BillWiseOutstandingRowApi {
  openItemId: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate?: string;
  originalAmount: number;
  adjustedAmount: number;
  outstandingAmount: number;
  ageingDays: number;
  accountingStatus: BillWiseAccountingStatus;
  displayStatus: BillWiseDisplayStatus;
  isOverdue: boolean;
  party: BillWisePartyRefApi;
  branch: BillWiseBranchRefApi | null;
  source: BillWiseSourceRefApi;
  referenceNumber?: string | null;
}

export interface BillWiseOutstandingPaginationApi {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export interface BillWiseOutstandingListResultApi {
  summary: BillWiseOutstandingSummaryApi;
  records: BillWiseOutstandingRowApi[];
  pagination: BillWiseOutstandingPaginationApi;
}

export interface BillWiseSettlementHistoryRowApi {
  settlementId: string;
  settlementDate: string;
  settlementType: string;
  settlementAmount: number;
  cashBankAmount: number;
  tdsAmount: number;
  discountAmount: number;
  writeOffAmount: number;
  accountingVoucherId: string;
  voucherNumber?: string;
  voucherType?: string;
  referenceNumber?: string | null;
  narration?: string;
  status: "ACTIVE" | "REVERSED";
  isReversed: boolean;
}

export interface BillWiseOutstandingDetailApi {
  bill: BillWiseOutstandingRowApi;
  summary: {
    originalAmount: number;
    adjustedAmount: number;
    outstandingAmount: number;
  };
  settlements: BillWiseSettlementHistoryRowApi[];
}

export interface BillWiseOutstandingListQuery {
  financialYearId?: string;
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  branchId?: string;
  partyLedgerId?: string;
  status?: string;
  search?: string;
  openOutstandingOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Unified display row used by receivables BWO + payables bill adapters. */
export interface OutstandingBillDisplayRow {
  openItemId: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate?: string;
  originalAmount: number;
  adjustedAmount: number;
  outstandingAmount: number;
  ageingDays: number;
  displayStatus: string;
  accountingStatus?: string;
  isOverdue: boolean;
  sourceEntityType?: string;
  sourceEntityId?: string;
  referenceNumber?: string | null;
  partyName?: string;
  partyCode?: string;
}

export interface OutstandingBillSummaryDisplay {
  totalBills: number;
  totalInvoiceAmount: number;
  totalAdjustedAmount: number;
  totalOutstandingAmount: number;
  totalOverdueAmount: number;
}

export interface OutstandingBillSettlementDisplay {
  settlementId: string;
  settlementDate: string;
  settlementType: string;
  settlementAmount: number;
  voucherNumber?: string;
  referenceNumber?: string | null;
  status: string;
  narration?: string;
}
