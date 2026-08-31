/** Backend Bank Reconciliation API contracts — mirrors pvb_backend bank-reconciliation.types.ts */

export type BankReconciliationStatus =
  | "NOT_APPLICABLE"
  | "UNRECONCILED"
  | "PARTIALLY_RECONCILED"
  | "RECONCILED";

export type BankReconciliationMode = "MANUAL" | "STATEMENT";

export type BookDirection = "DEPOSIT" | "WITHDRAWAL";

export type BankStatementLineDirection = "DEBIT" | "CREDIT";

export type BankStatementImportStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "DUPLICATE_FILE";

export type AccountingVoucherTypeApi =
  | "RECEIPT"
  | "PAYMENT"
  | "CONTRA"
  | "JOURNAL"
  | "SALES_INVOICE"
  | "PURCHASE_INVOICE"
  | "DEBIT_NOTE"
  | "CREDIT_NOTE"
  | string;

export interface BankReconPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface DashboardBankAccountItem {
  bankAccountId: string;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  ledgerId: string;
  ledgerName: string | null;
  reconciliationEnabled: boolean;
  balanceAsPerBooks: string | null;
  balanceAsPerBooksType: string | null;
  bankStatementBalance: string | null;
  difference: string | null;
  unreconciledCount: number;
  lastReconciledDate: string | null;
}

export interface BankReconDashboardResponse {
  items: DashboardBankAccountItem[];
  statementBalanceRule: string;
}

export interface BookEntryListItem {
  bankDetailId: string;
  bankAccountId: string;
  voucherDate: string;
  voucherType: AccountingVoucherTypeApi;
  voucherNumber: string;
  accountingVoucherId: string;
  voucherStatus: string;
  particular: string | null;
  instrumentReference: string | null;
  utrNumber: string | null;
  chequeNumber: string | null;
  entryType: "DEBIT" | "CREDIT";
  bookDirection: BookDirection;
  deposit: string | null;
  withdrawal: string | null;
  amount: string;
  clearedDate: string | null;
  reconciliationDate: string | null;
  reconciliationStatus: BankReconciliationStatus;
  bankStatementLineId: string | null;
  reconciliationMode: BankReconciliationMode | null;
  warehouseId: string | null;
  warehouseName: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  isReversalVoucher: boolean;
}

export interface BookEntriesResponse {
  items: BookEntryListItem[];
  pagination: BankReconPagination;
}

export interface StatementImportListItem {
  bankStatementImportId: string;
  bankAccountId: string;
  originalFileName: string;
  statementFromDate: string | null;
  statementToDate: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  totalRows: number;
  newRows: number;
  duplicateRows: number;
  errorRows: number;
  importStatus: BankStatementImportStatus;
  errorMessage: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface StatementImportDetailItem extends StatementImportListItem {
  errorDetails?: Record<string, unknown> | null;
  storedFilePath?: string;
  mimeType?: string | null;
  fileHash?: string;
}

export interface StatementImportsResponse {
  items: StatementImportListItem[];
  pagination: BankReconPagination;
}

export interface StatementLineListItem {
  bankStatementLineId: string;
  bankAccountId: string;
  bankStatementImportId: string;
  transactionDate: string;
  valueDate: string | null;
  narration: string | null;
  reference: string | null;
  utrNumber: string | null;
  chequeNumber: string | null;
  direction: BankStatementLineDirection;
  deposit: string | null;
  withdrawal: string | null;
  amount: string;
  runningBalance: string | null;
  isMatched: boolean;
  matchedBankDetailId: string | null;
  importFileName: string | null;
}

export interface StatementLinesResponse {
  items: StatementLineListItem[];
  pagination: BankReconPagination;
}

export interface ReconciledMatchListItem {
  bankDetailId: string;
  bankAccountId: string;
  voucherNumber: string;
  voucherType: AccountingVoucherTypeApi;
  voucherDate: string;
  bookDirection: BookDirection;
  bookAmount: string;
  reconciliationMode: BankReconciliationMode;
  clearedDate: string | null;
  reconciliationDate: string | null;
  bankStatementLineId: string | null;
  statementTransactionDate: string | null;
  statementNarration: string | null;
  statementAmount: string | null;
  statementDirection: BankStatementLineDirection | null;
  reconciledBy: string | null;
  latestAuditLogId: string | null;
}

export interface ReconciledMatchesResponse {
  items: ReconciledMatchListItem[];
  pagination: BankReconPagination;
}

export interface ReconciliationAuditItem {
  reconciliationAuditLogId: string;
  bankDetailId: string;
  bankAccountId: string;
  action: "MANUAL_RECONCILED" | "STATEMENT_RECONCILED" | "UNRECONCILED";
  mode: BankReconciliationMode | null;
  clearedDate: string | null;
  reconciliationDate: string | null;
  bankStatementLineId: string | null;
  reason: string | null;
  previousStatus: BankReconciliationStatus | null;
  newStatus: BankReconciliationStatus | null;
  eventData: Record<string, unknown> | null;
  performedBy: string | null;
  performedAt: string;
}

export interface AuditHistoryResponse {
  items: ReconciliationAuditItem[];
  pagination: BankReconPagination;
}

export interface ManualReconcilePayload {
  bank_account_id: string;
  bank_detail_ids: string[];
  cleared_date: string;
  remarks?: string | null;
}

export interface ManualReconcileResponse {
  reconciledCount: number;
  clearedDate: string;
  reconciliationDate: string;
  mode: "MANUAL";
}

export interface UnreconcilePayload {
  bank_account_id: string;
  bank_detail_ids: string[];
  reason: string;
}

export interface UnreconcileResponse {
  unreconciledCount: number;
}

export interface StatementReconcilePayload {
  bank_account_id: string;
  bank_detail_id: string;
  bank_statement_line_id: string;
  remarks?: string | null;
}

export interface StatementReconcileResponse {
  bankDetailId: string;
  bankStatementLineId: string;
  clearedDate?: string;
  reconciliationDate?: string;
  mode: "STATEMENT";
  alreadyMatched: boolean;
}

export interface StatementUploadResponse {
  duplicateFile: boolean;
  import: StatementImportListItem;
  previousImport?: StatementImportListItem;
  warnings?: string[];
}

export interface BookEntriesQuery {
  bank_account_id: string;
  date_from?: string;
  date_to?: string;
  reconciliation_status?: BankReconciliationStatus;
  voucher_type?: AccountingVoucherTypeApi;
  transaction_direction?: "DEPOSIT" | "WITHDRAWAL";
  warehouse_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface StatementLinesQuery {
  bank_account_id: string;
  bank_statement_import_id?: string;
  unmatched_only?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface MatchesQuery {
  bank_account_id: string;
  date_from?: string;
  date_to?: string;
  mode?: BankReconciliationMode;
  page?: number;
  page_size?: number;
}

export interface StatementImportsQuery {
  bank_account_id: string;
  page?: number;
  page_size?: number;
}

export interface DashboardQuery {
  warehouse_id?: string;
  search?: string;
}
