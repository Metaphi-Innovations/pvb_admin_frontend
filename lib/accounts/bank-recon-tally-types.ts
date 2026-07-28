/**
 * Tally-style Bank Reconciliation — module-local types.
 * Reconciliation never posts or mutates accounting vouchers.
 */

export type BankReconTallyStatus =
  | "UNRECONCILED"
  | "SUGGESTED_MATCH"
  | "RECONCILED"
  | "AVAILABLE_ONLY_IN_BOOKS"
  | "AVAILABLE_ONLY_IN_BANK"
  | "AMOUNT_MISMATCH"
  | "MULTIPLE_MATCHES"
  | "MARKED_FOR_REVIEW"
  | "IGNORED";

export type BankReconMatchConfidence =
  | "High Confidence"
  | "Possible Match"
  | "No Match"
  | "Multiple Matches";

export type BankReconExceptionType =
  | "Amount Mismatch"
  | "Duplicate Statement Entry"
  | "Available Only in Books"
  | "Available Only in Bank"
  | "Multiple Matches"
  | "Ambiguous Match"
  | "Marked for Review";

export type BankReconWorkspaceTab =
  | "books"
  | "bank"
  | "reconciled"
  | "exceptions";

export interface BankReconTallyLink {
  id: string;
  bankAccountId: string;
  bookTransactionId: string | null;
  bankStatementTransactionId: string | null;
  voucherId: number | null;
  bankDate: string | null;
  status: BankReconTallyStatus;
  reconciledAmount: number | null;
  reconciledBy: string | null;
  reconciledAt: string | null;
  remarks: string | null;
  reviewReason: string | null;
  importBatchId: string | null;
  undoReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankReconBookTransaction {
  id: string;
  bankAccountId: string;
  voucherId: number;
  voucherDate: string;
  particulars: string;
  voucherType: string;
  voucherTypeCode: string;
  voucherNumber: string;
  instrumentNumber: string;
  instrumentDate: string | null;
  deposit: number;
  withdrawal: number;
  bankDate: string | null;
  status: BankReconTallyStatus;
  linkId: string | null;
  canEditVoucher: boolean;
  viewHref: string;
  editHref: string | null;
  suggestedStatementIds: string[];
  matchConfidence: BankReconMatchConfidence | null;
  remarks: string | null;
  reconciledBy: string | null;
  reconciledOn: string | null;
  ledgerName: string;
}

export interface BankReconBankTransaction {
  id: string;
  bankAccountId: string;
  bankDate: string;
  valueDate: string | null;
  narration: string;
  reference: string;
  deposit: number;
  withdrawal: number;
  statementBalance: number | null;
  matchStatus: BankReconTallyStatus;
  suggestedVoucherLabel: string | null;
  suggestedBookTransactionIds: string[];
  matchConfidence: BankReconMatchConfidence | null;
  importBatchId: string | null;
  linkId: string | null;
  ignoreReason: string | null;
}

export interface BankReconReconciledRow {
  id: string;
  bankAccountId: string;
  voucherDate: string | null;
  bankDate: string;
  particulars: string;
  voucherType: string;
  voucherNumber: string;
  reference: string;
  deposit: number;
  withdrawal: number;
  reconciledBy: string;
  reconciledOn: string;
  voucherId: number | null;
  bookTransactionId: string | null;
  bankStatementTransactionId: string | null;
  linkId: string;
  viewHref: string | null;
}

export interface BankReconExceptionRow {
  id: string;
  bankAccountId: string;
  date: string;
  source: "Books" | "Bank" | "Both";
  particulars: string;
  reference: string;
  bookAmount: number | null;
  bankAmount: number | null;
  difference: number | null;
  exceptionType: BankReconExceptionType;
  status: BankReconTallyStatus;
  bookTransactionId: string | null;
  bankStatementTransactionId: string | null;
  voucherId: number | null;
  viewHref: string | null;
  editHref: string | null;
}

export interface BankReconBrsSummary {
  balanceAsPerBooks: number;
  /** Alias: unreconciled book deposits (in transit). */
  depositsInTransit: number;
  /** Alias: unreconciled book withdrawals. */
  paymentsNotDebited: number;
  unreconciledDeposits: number;
  unreconciledWithdrawals: number;
  bankOnlyDeposits: number;
  bankOnlyWithdrawals: number;
  expectedBalanceAsPerBank: number;
  /** Unused in manual client phase (always 0). */
  closingBalanceAsPerStatement: number;
  /** Unused in manual client phase (always 0). */
  finalDifference: number;
  reconciledCount: number;
  pendingCount: number;
  balanceSign: "asset" | "cash_credit";
}

export interface BankReconListingAccount {
  id: string;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  accountType: string;
  /** Derived GL balance; null when COA bank ledger is not linked. */
  bookBalance: number | null;
  /** False when Balance as per Books must show “Book ledger not linked”. */
  bookLedgerLinked: boolean;
  linkedCoaLedgerId: number | null;
  bankBalance: number;
  /** book − bank when linked; 0 when unlinked (UI shows —). */
  difference: number | null;
  pendingReconciliationCount: number;
  lastReconciledDate: string | null;
  reconciledThisMonth: number;
  statementPeriodFrom: string;
  statementPeriodTo: string;
}

export interface BankReconListingSummary {
  totalAccounts: number;
  totalBookBalance: number;
  totalBankBalance: number;
  totalDifference: number;
  pendingReconciliation: number;
  reconciledThisMonth: number;
}

export interface BankReconSuggestion {
  bookTransactionId: string;
  bankStatementTransactionId: string;
  confidence: BankReconMatchConfidence;
  score: number;
  reasons: string[];
}

export interface ReconcileWithStatementInput {
  bankAccountId: string;
  bookTransactionId: string;
  bankStatementTransactionId: string;
  bankDate: string;
  remarks?: string;
  markForReview?: boolean;
}

export interface ReconcileBankDateOnlyInput {
  bankAccountId: string;
  bookTransactionId: string;
  bankDate: string;
  remarks?: string;
  markForReview?: boolean;
}

export interface ReconcileBankDateBulkInput {
  bankAccountId: string;
  bookTransactionIds: string[];
  bankDate: string;
  remarks?: string;
}

export interface UndoReconciliationInput {
  linkId: string;
  reason: string;
}

/** Manual workflow status filters (books-only). */
export const BANK_RECON_TALLY_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "UNRECONCILED", label: "Unreconciled" },
  { value: "RECONCILED", label: "Reconciled" },
] as const;

/** @deprecated Full filter set retained for legacy statement UI left on disk. */
export const BANK_RECON_TALLY_STATUS_FILTERS_LEGACY = [
  { value: "all", label: "All" },
  { value: "UNRECONCILED", label: "Unreconciled" },
  { value: "RECONCILED", label: "Reconciled" },
  { value: "AVAILABLE_ONLY_IN_BOOKS", label: "Available Only in Books" },
  { value: "AVAILABLE_ONLY_IN_BANK", label: "Available Only in Bank" },
  { value: "AMOUNT_MISMATCH", label: "Amount Mismatch" },
  { value: "SUGGESTED_MATCH", label: "Suggested Match" },
  { value: "MULTIPLE_MATCHES", label: "Multiple Matches" },
  { value: "MARKED_FOR_REVIEW", label: "Marked for Review" },
] as const;

export const AMOUNT_MISMATCH_MESSAGE =
  "The amount differs from the books. Please correct the original Payment / Receipt / Contra voucher before reconciliation.";

export const TALLY_EVENT = "bank-recon-tally-updated";
