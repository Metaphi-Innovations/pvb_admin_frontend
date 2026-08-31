/** Receivables / Customer Outstanding API types — aligned with backend DTOs. */

export type ApiReceivableStatus =
  | "PENDING"
  | "PARTIALLY_RECEIVED"
  | "OVERDUE"
  | "PAID"
  | "CLEAR"
  | "REVERSED";

export type ApiFollowUpStatus =
  | "NOT_CONTACTED"
  | "FOLLOW_UP_SCHEDULED"
  | "PROMISE_TO_PAY"
  | "PART_PAYMENT_RECEIVED"
  | "ESCALATED"
  | "CLOSED";

export type ApiFollowUpContactMethod =
  | "CALL"
  | "EMAIL"
  | "WHATSAPP"
  | "VISIT"
  | "SMS"
  | "OTHER";

export interface ReceivablesPaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedReceivablesResponse<T> {
  data: T[];
  pagination: ReceivablesPaginationMeta;
}

export interface SalespersonRef {
  id: string;
  name: string;
}

export interface CustomerSummaryApiRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  salesperson?: SalespersonRef;
  outstandingAmount: number;
  notDueAmount: number;
  overdueAmount: number;
  oldestDueDate?: string;
  oldestOverdueDays?: number;
  lastReceiptDate?: string;
  creditLimit?: number;
  creditDays?: number;
  creditLimitBreached?: boolean;
  status: ApiReceivableStatus | "CLEAR";
}

export interface ReceivableInvoiceApiRow {
  openItemId: string;
  invoiceId?: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  originalAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  overdueDays: number;
  status: ApiReceivableStatus;
}

export interface AgingBucketMap {
  [bucketLabel: string]: number;
}

export interface AgingApiRow {
  customerId: string;
  customerName: string;
  customerCode: string;
  totalOutstanding: number;
  buckets: AgingBucketMap;
  notDueAmount?: number;
}

export interface InvoiceSettlementApiRow {
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

/** Customer outstanding detail — receipt voucher history row. */
export interface CustomerReceiptHistoryRow {
  receiptVoucherId: string;
  receiptNo: string;
  receiptDate: string;
  amount: number;
  allocatedAmount: number;
  bankAccount: string;
  referenceNo: string;
  status: string;
  statusLabel: string;
}

export interface CustomerDetailInvoiceApiRow {
  openItemId: string;
  invoiceId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  dueDate?: string;
  status: ApiReceivableStatus;
}

export interface CustomerOutstandingDetailApi {
  customer: {
    customerId: string;
    customerCode: string;
    customerName: string;
    gstin?: string;
    mobile?: string;
    creditLimit?: number;
    creditDays?: number;
    territory?: string;
  };
  totalSales: number;
  totalReceipts: number;
  currentOutstanding: number;
  openInvoices: CustomerDetailInvoiceApiRow[];
}

export interface FollowUpApiRow {
  followUpId: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  openItemId?: string;
  invoiceNumber?: string;
  outstandingAmount: number;
  status: ApiFollowUpStatus;
  promisedPaymentDate?: string;
  nextFollowUpDate?: string;
  committedAmount?: number;
  assignedTo?: SalespersonRef;
  remarks?: string;
  closeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpHistoryApiRow {
  activityId: string;
  followUpId: string;
  activityDate: string;
  status: ApiFollowUpStatus;
  contactMethod?: ApiFollowUpContactMethod;
  nextFollowUpDate?: string;
  promisedPaymentDate?: string;
  committedAmount?: number;
  assignedTo?: SalespersonRef;
  remarks?: string;
  createdBy?: SalespersonRef;
  createdAt: string;
}

export interface CustomerSummaryQuery {
  search?: string;
  customerId?: string;
  salespersonId?: string;
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

export interface ReceivableInvoicesQuery {
  search?: string;
  customerId?: string;
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
  customerId?: string;
  branchId?: string;
  warehouseId?: string;
  asOfDate?: string;
  agingBreakpoints?: string;
  page?: number;
  page_size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FollowUpsQuery {
  search?: string;
  customerId?: string;
  openItemId?: string;
  status?: ApiFollowUpStatus;
  assignedTo?: string;
  nextFollowUpDateFrom?: string;
  nextFollowUpDateTo?: string;
  page?: number;
  page_size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type ReceivablesExportView = "summary" | "invoice" | "ageing" | "follow-ups";

export interface ReceivablesExportQuery {
  view: ReceivablesExportView;
  search?: string;
  customerId?: string;
  salespersonId?: string;
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

export interface CreateFollowUpPayload {
  customerId: string;
  openItemId?: string | null;
  status: ApiFollowUpStatus;
  nextFollowUpDate?: string | null;
  promisedPaymentDate?: string | null;
  committedAmount?: number | null;
  assignedTo?: string | null;
  remarks?: string | null;
  contactMethod?: ApiFollowUpContactMethod | null;
  closeReason?: string | null;
}

export interface UpdateFollowUpPayload {
  status?: ApiFollowUpStatus;
  nextFollowUpDate?: string | null;
  promisedPaymentDate?: string | null;
  committedAmount?: number | null;
  assignedTo?: string | null;
  remarks?: string | null;
  contactMethod?: ApiFollowUpContactMethod | null;
  closeReason?: string | null;
}

/** API-backed list row types for Customer Outstanding screens (UUID identifiers). */
export interface ApiCustomerOutstandingRow {
  customerId: string;
  customerName: string;
  customerCode: string;
  salesExecutive: string;
  salespersonId?: string;
  outstanding: number;
  notDueAmount: number;
  overdueAmount: number;
  oldestDueDate: string;
  lastReceiptDate: string;
  status: import("@/lib/accounts/receivables-data").ReceivableStatus;
}

export interface ApiInvoiceOutstandingRow {
  openItemId: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  gstin: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  overdueDays: number;
  status: import("@/lib/accounts/receivables-data").ReceivableStatus;
}

export interface ApiCustomerAgeingRow {
  customerId: string;
  customerName: string;
  customerCode: string;
  territory: string;
  salesExecutive: string;
  buckets: number[];
  totalOutstanding: number;
  oldestInvoiceDate: string;
}

export interface ApiCollectionFollowUpRow {
  id: string;
  followUpNo: string;
  customerId: string;
  customerName: string;
  openItemId?: string | null;
  invoiceId: string | null;
  invoiceNo: string;
  outstandingAmount: number;
  dueDate: string;
  followUpDate: string;
  assignedTo: string;
  contactPerson: string;
  phone: string;
  promiseToPayDate: string;
  promiseAmount: number;
  status: import("@/lib/accounts/receivables-data").CollectionFollowUpStatus;
  remarks: string;
  nextFollowUpDate: string;
}

export interface ApiCustomerInvoiceOutstandingRow {
  openItemId: string;
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  paidAmount: number;
  outstanding: number;
  status: import("@/lib/accounts/receivables-data").ReceivableStatus;
}
