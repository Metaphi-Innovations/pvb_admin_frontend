/**
 * Manual reconciliation types — Step 6 (v2 workspace).
 */

import type { MatchBookTarget } from "@/lib/accounts/bank-recon-match-types";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";

export type ManualReconciliationStatus =
  | "Unreconciled"
  | "Suggested"
  | "Partially Reconciled"
  | "Reconciled"
  | "Manually Cleared"
  | "Excluded"
  | "Pending Review";

export type ManualReconMatchType =
  | "One-to-One"
  | "One-to-Many"
  | "Many-to-One"
  | "Many-to-Many"
  | "Manual Clearing"
  | "Partial";

export type ManualReconViewMode =
  | "book_only"
  | "side_by_side"
  | "reconciled"
  | "unreconciled"
  | "all";

export type ManualClearingReason =
  | "Confirmed from Bank Portal"
  | "Confirmed through Bank Advice"
  | "Legacy Opening Reconciliation"
  | "Statement Not Available"
  | "Manual Confirmation"
  | "Other";

export const MANUAL_CLEARING_REASONS: ManualClearingReason[] = [
  "Confirmed from Bank Portal",
  "Confirmed through Bank Advice",
  "Legacy Opening Reconciliation",
  "Statement Not Available",
  "Manual Confirmation",
  "Other",
];

export interface ManualReconAllocationRecord {
  id: string;
  groupId: string;
  bankAccountId: string;
  bookTargetId: string;
  bookRowKey: string | null;
  statementTransactionId: string | null;
  allocatedAmount: number;
  reconciliationDate: string;
  remarks: string | null;
  createdBy: string;
  createdOn: string;
  active: boolean;
}

export interface ManualReconGroupRecord {
  id: string;
  bankAccountId: string;
  matchType: ManualReconMatchType;
  reconciliationMethod: "Statement Match" | "Manual Clearing";
  reconciliationDate: string;
  totalBookAmount: number;
  totalStatementAmount: number;
  remarks: string | null;
  clearingReason: ManualClearingReason | null;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  active: boolean;
}

export interface ManualReconAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  bankAccountId: string;
  action: string;
  bookReference: string | null;
  statementReference: string | null;
  previousValue: string | null;
  newValue: string | null;
  reconciliationDate: string | null;
  reason: string | null;
  groupId: string | null;
}

export interface ManualReconBookRow extends MatchBookTarget {
  reconciliationStatus: ManualReconciliationStatus;
  reconciledAmount: number;
  availableAmount: number;
  originalAmount: number;
  reconciliationDate: string | null;
  expectedClearingDate: string | null;
  chequeDate: string | null;
  depositedDate: string | null;
  suggestedStatementId: string | null;
  suggestedConfidence: number | null;
  suggestedReasons: string[];
  groupId: string | null;
}

export interface ManualReconStatementRow {
  id: string;
  statementDate: string;
  valueDate: string;
  reference: string;
  chequeNo: string | null;
  narration: string;
  deposit: number;
  withdrawal: number;
  source: string;
  verificationStatus: string;
  matchStatus: string;
  reconciliationStatus: ManualReconciliationStatus;
  reconciledAmount: number;
  availableAmount: number;
  originalAmount: number;
  reconciliationDate: string | null;
  suggestedBookTargetId: string | null;
  suggestedConfidence: number | null;
  suggestedReasons: string[];
  groupId: string | null;
  record: BankReconTransactionRecord;
}

export interface ManualReconSelectionSummary {
  bookCount: number;
  statementCount: number;
  bookDepositTotal: number;
  bookWithdrawalTotal: number;
  statementDepositTotal: number;
  statementWithdrawalTotal: number;
  bookNet: number;
  statementNet: number;
  difference: number;
  direction: "deposit" | "withdrawal" | "mixed" | null;
  matchType: ManualReconMatchType | null;
}

export interface ManualReconAllocationInput {
  bookTargetId: string;
  statementTransactionId: string | null;
  appliedAmount: number;
  reconciliationDate: string;
  remarks?: string;
}

export interface ManualReconDifferenceSummary {
  openingBookBalance: number;
  bookDeposits: number;
  bookWithdrawals: number;
  closingBookBalance: number;
  statementOpeningBalance: number;
  statementDeposits: number;
  statementWithdrawals: number;
  statementClosingBalance: number;
  reconciledDeposits: number;
  reconciledWithdrawals: number;
  unpresentedCheques: number;
  depositsInTransit: number;
  statementOnlyCount: number;
  bookOnlyCount: number;
  currentDifference: number;
}
