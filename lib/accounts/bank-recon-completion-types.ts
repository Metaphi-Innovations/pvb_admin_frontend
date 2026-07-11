/**
 * Bank reconciliation completion types — Step 7.
 */

export type BankReconSessionStatus =
  | "Draft"
  | "In Progress"
  | "Ready to Complete"
  | "Completed"
  | "Completed with Difference"
  | "Reopened"
  | "Cancelled";

export type ValidationCheckStatus = "Passed" | "Warning" | "Failed";

export interface BankReconValidationCheck {
  id: string;
  label: string;
  status: ValidationCheckStatus;
  detail: string;
}

export interface BankReconCarryForwardItem {
  id: string;
  sourceType: "book" | "statement" | "partial";
  sourceReference: string;
  originalPeriodFrom: string;
  originalPeriodTo: string;
  amount: number;
  direction: "deposit" | "withdrawal";
  reason: string;
  status: "Carried Forward" | "Pending";
  nextPeriodFrom: string | null;
  remarks: string | null;
}

export interface BankReconOutstandingBookItem {
  bookTargetId: string;
  bookDate: string;
  voucherType: string;
  voucherNo: string;
  partyLedger: string;
  reference: string;
  deposit: number;
  withdrawal: number;
  expectedClearingDate: string | null;
  ageingDays: number;
  reason: string;
  carryForwardStatus: string;
}

export interface BankReconStatementOnlyItem {
  statementTransactionId: string;
  statementDate: string;
  valueDate: string;
  reference: string;
  narration: string;
  deposit: number;
  withdrawal: number;
  category: string;
  status: string;
  requiredAction: string;
}

export interface BankReconPartialItem {
  bookTargetId: string;
  statementTransactionId: string | null;
  originalAmount: number;
  reconciledAmount: number;
  remainingAmount: number;
  bookReference: string;
  statementReference: string | null;
  reconciliationDate: string | null;
  status: string;
}

export interface BankReconAdjustmentItem {
  id: string;
  adjustmentType: string;
  voucherNo: string;
  date: string;
  ledger: string;
  debit: number;
  credit: number;
  sourceBankTransactionId: string | null;
  createdBy: string;
  status: string;
}

export interface BankReconReconciliationFormula {
  bookClosingBalance: number;
  addDepositsInTransit: number;
  addBankCreditsNotBooked: number;
  lessUnpresentedCheques: number;
  lessBankDebitsNotBooked: number;
  adjustedBookBalance: number;
  statementClosingBalance: number;
  finalDifference: number;
}

export interface BankReconReviewSnapshot {
  bankAccountId: string;
  bankName: string;
  accountNickname: string;
  maskedAccountNumber: string;
  accountType: string;
  periodFrom: string;
  periodTo: string;
  previousReconciliationDate: string | null;
  importBatchId: string | null;
  statementFileName: string | null;
  bookOpeningBalance: number;
  bookDeposits: number;
  bookWithdrawals: number;
  bookAdjustments: number;
  bookClosingBalance: number;
  statementOpeningBalance: number;
  statementDeposits: number;
  statementWithdrawals: number;
  statementAdjustments: number;
  statementClosingBalance: number;
  totalReconciledDeposits: number;
  totalReconciledWithdrawals: number;
  unpresentedCheques: number;
  depositsInTransit: number;
  bookOnlyCount: number;
  statementOnlyCount: number;
  partialCount: number;
  excludedCount: number;
  pendingReviewCount: number;
  adjustmentCount: number;
  formula: BankReconReconciliationFormula;
  outstandingBook: BankReconOutstandingBookItem[];
  statementOnly: BankReconStatementOnlyItem[];
  partialItems: BankReconPartialItem[];
  adjustments: BankReconAdjustmentItem[];
  carryForward: BankReconCarryForwardItem[];
  reconciledTransactionCount: number;
  validationChecks: BankReconValidationCheck[];
  comparisonWithPrevious: BankReconPeriodComparison | null;
}

export interface BankReconPeriodComparison {
  previousPeriodTo: string | null;
  previousClosingBookBalance: number | null;
  currentOpeningBookBalance: number;
  bookOpeningContinuityOk: boolean;
  previousStatementClosingBalance: number | null;
  currentStatementOpeningBalance: number;
  statementOpeningContinuityOk: boolean;
  previousCarryForwardCount: number;
  clearedCarryForwardCount: number;
  newOutstandingCount: number;
  differenceMovement: number;
}

export interface BankReconSessionRecord {
  id: string;
  reconciliationNumber: string | null;
  bankAccountId: string;
  periodFrom: string;
  periodTo: string;
  status: BankReconSessionStatus;
  version: number;
  previousVersionId: string | null;
  financialYear: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  bookOpeningBalance: number;
  bookClosingBalance: number;
  adjustedBookBalance: number;
  finalDifference: number;
  differenceOverrideReason: string | null;
  differenceApprovedBy: string | null;
  differenceApprovedOn: string | null;
  incompletePeriodReason: string | null;
  preparedBy: string;
  preparedOn: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  completedBy: string | null;
  completedOn: string | null;
  reopenedBy: string | null;
  reopenedOn: string | null;
  reopenReason: string | null;
  cancelledBy: string | null;
  cancelledOn: string | null;
  cancelReason: string | null;
  importBatchId: string | null;
  statementFileName: string | null;
  locked: boolean;
  snapshotId: string | null;
  carryForward: BankReconCarryForwardItem[];
  changeSummary: string | null;
  differenceBefore: number | null;
  differenceAfter: number | null;
}

export interface BankReconSessionSnapshotRecord {
  id: string;
  sessionId: string;
  version: number;
  createdOn: string;
  createdBy: string;
  data: BankReconReviewSnapshot;
}

export interface BankReconCompletionAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  bankAccountId: string;
  reconciliationNumber: string | null;
  sessionId: string | null;
  transactionReference: string | null;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
}

export interface CompleteReconciliationInput {
  sessionId: string;
  confirmed: boolean;
  differenceOverride?: {
    reason: string;
    approvedBy: string;
    explanation: string;
  };
  incompletePeriodReason?: string;
}

export interface ReopenReconciliationInput {
  sessionId: string;
  reason: string;
  approvedBy?: string;
}

export const BANK_RECON_COMPLETION_PERMISSIONS = {
  view: "bank_recon.completion.view",
  complete: "bank_recon.completion.complete",
  completeWithDifference: "bank_recon.completion.complete_with_difference",
  approveDifference: "bank_recon.completion.approve_difference",
  viewHistory: "bank_recon.completion.view_history",
  downloadReports: "bank_recon.completion.download_reports",
  reopen: "bank_recon.completion.reopen",
  recomplete: "bank_recon.completion.recomplete",
  cancelDraft: "bank_recon.completion.cancel_draft",
  viewAudit: "bank_recon.completion.view_audit",
  exportAudit: "bank_recon.completion.export_audit",
  incompletePeriod: "bank_recon.completion.incomplete_period",
} as const;
