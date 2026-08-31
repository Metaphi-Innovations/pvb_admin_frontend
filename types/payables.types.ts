/** Payables / Supplier Outstanding API types — aligned with backend DTOs. */

import type { PayableStatus } from "@/lib/accounts/payables-data";

export type ApiPayableStatus =
  | "PENDING"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "PAID"
  | "CLEAR"
  | "REVERSED";

export interface PayablesPaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedPayablesResponse<T> {
  data: T[];
  pagination: PayablesPaginationMeta;
}

export interface SupplierSummaryApiRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  outstandingAmount: number;
  notDueAmount: number;
  overdueAmount: number;
  oldestDueDate?: string;
  oldestOverdueDays?: number;
  lastPaymentDate?: string;
  creditDays?: number;
  status: ApiPayableStatus | "CLEAR";
}

export interface PayableBillApiRow {
  openItemId: string;
  purchaseInvoiceId?: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  purchaseInvoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  originalAmount: number;
  paidAmount: number;
  debitNoteAdjustment: number;
  outstandingAmount: number;
  overdueDays: number;
  status: ApiPayableStatus;
}

export interface AgingBucketMap {
  [bucketLabel: string]: number;
}

export interface AgingApiRow {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  totalOutstanding: number;
  buckets: AgingBucketMap;
  notDueAmount?: number;
}

export interface SupplierDetailBillApiRow {
  openItemId: string;
  purchaseInvoiceId?: string;
  purchaseInvoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  paidAmount: number;
  debitNoteAdjustment: number;
  outstandingAmount: number;
  dueDate?: string;
  status: ApiPayableStatus;
}

export interface SupplierOutstandingDetailApi {
  supplier: {
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    gstin?: string;
    branch?: string;
    creditDays?: number;
    mobile?: string;
    territory?: string;
  };
  totalPurchases: number;
  totalPayments: number;
  debitNotes: number;
  creditNotes: number;
  currentOutstanding: number;
  openBills: SupplierDetailBillApiRow[];
}

export interface BillSettlementApiRow {
  settlementId: string;
  settlementDate: string;
  settlementType: string;
  grossSettlementAmount: number;
  cashBankAmount: number;
  tdsAmount: number;
  discountAmount: number;
  writeOffAmount: number;
  accountingVoucherId: string;
  voucherNumber?: string;
  voucherType?: string;
  narration?: string;
  isReversed: boolean;
}

export interface SupplierSummaryQuery {
  search?: string;
  supplierId?: string;
  branchId?: string;
  warehouseId?: string;
  asOfDate?: string;
  excludeZeroBalance?: boolean;
  status?: string;
  page?: number;
  page_size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface BillsQuery {
  search?: string;
  supplierId?: string;
  branchId?: string;
  warehouseId?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  status?: string;
  asOfDate?: string;
  page?: number;
  page_size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AgingQuery {
  search?: string;
  supplierId?: string;
  branchId?: string;
  warehouseId?: string;
  asOfDate?: string;
  agingBreakpoints?: string;
  page?: number;
  page_size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type PayablesExportView = "summary" | "bills" | "ageing";

export interface PayablesExportQuery {
  view: PayablesExportView;
  search?: string;
  supplierId?: string;
  branchId?: string;
  warehouseId?: string;
  asOfDate?: string;
  excludeZeroBalance?: boolean;
  status?: string;
  dueStatus?: "all" | "overdue" | "not_due";
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  agingBreakpoints?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** API-backed list row types for Payables Outstanding screens. */
export interface ApiVendorOutstandingRow {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  outstanding: number;
  notDueAmount: number;
  overdueAmount: number;
  oldestDueDate: string;
  lastPaymentDate: string;
  status: PayableStatus;
}

export interface ApiSupplierBillOutstandingRow {
  openItemId: string;
  billId: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  billAmount: number;
  paidAmount: number;
  debitNoteAdjusted: number;
  outstanding: number;
  overdueDays: number;
  status: PayableStatus;
}

export interface ApiVendorAgeingRow {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  buckets: number[];
  totalOutstanding: number;
}

export interface ApiSupplierDetailBillRow {
  openItemId: string;
  billId: string;
  billNo: string;
  billDate: string;
  billAmount: number;
  paidAmount: number;
  debitNoteAdjusted: number;
  outstanding: number;
  dueDate: string;
  daysOverdue: number;
  status: PayableStatus;
}

/** Supplier outstanding detail — payment voucher history row. */
export interface VendorPaymentHistoryRow {
  paymentVoucherId: string;
  paymentNo: string;
  paymentDate: string;
  amount: number;
  allocatedAmount: number;
  bankAccount: string;
  referenceNo: string;
  status: string;
  statusLabel: string;
}
