/**
 * Bank reconciliation auto-match types — Step 4.
 */

import type { BookEntryRow } from "@/lib/accounts/banking-book-utils";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";

export type MatchCategory =
  | "exact"
  | "suggested"
  | "multiple"
  | "no_match"
  | "combined_hint"
  | "rejected"
  | "accepted";

export type MatchMethod = "Auto Accepted" | "Suggested Accepted" | "Manual Selected";

export type MatchBookTargetKind = "voucher_line" | "manual";

export interface MatchBookTarget {
  kind: MatchBookTargetKind;
  id: string;
  bookRowKey: string | null;
  voucherId: number | null;
  voucherLineId: number | null;
  voucherNo: string;
  voucherType: string;
  bookDate: string;
  partyLedger: string;
  reference: string;
  chequeNo: string | null;
  deposit: number;
  withdrawal: number;
  narration: string;
  transactionMode: string | null;
  expectedVoucherType: string | null;
  manualTransactionId: string | null;
  row?: BookEntryRow;
  manualRecord?: BankReconTransactionRecord;
}

export interface MatchScoreBreakdown {
  amount: number;
  reference: number;
  cheque: number;
  date: number;
  party: number;
  narration: number;
  mode: number;
  voucherType: number;
}

export interface MatchCandidateResult {
  id: string;
  statementTransactionId: string;
  bookTarget: MatchBookTarget;
  confidence: number;
  category: MatchCategory;
  reasons: string[];
  warnings: string[];
  mismatches: string[];
  dateDifferenceDays: number | null;
  narrationSimilarity: number;
  breakdown: MatchScoreBreakdown;
}

export interface StatementMatchGroup {
  statementTransactionId: string;
  statement: BankReconTransactionRecord;
  category: MatchCategory;
  candidates: MatchCandidateResult[];
  combinedHint?: {
    bookTargetIds: string[];
    totalAmount: number;
    message: string;
  };
  rejectedCandidateIds: string[];
}

export interface AutoMatchRunSummary {
  scanned: number;
  exact: number;
  suggested: number;
  multiple: number;
  noMatch: number;
  accepted: number;
  rejected: number;
  pendingReview: number;
  totalMatchedAmount: number;
  totalUnmatchedAmount: number;
  depositMatched: number;
  depositUnmatched: number;
  withdrawalMatched: number;
  withdrawalUnmatched: number;
}

export interface AutoMatchRunResult {
  runId: string;
  bankAccountId: string;
  startedOn: string;
  completedOn: string;
  summary: AutoMatchRunSummary;
  groups: StatementMatchGroup[];
}

export interface BankReconMatchConfig {
  electronicDateTolerance: number;
  chequeDateTolerance: number;
  cashDepositDateTolerance: number;
  ecsNachDateTolerance: number;
  bankTransferDateTolerance: number;
  narrationSimilarityThreshold: number;
  exactMatchThreshold: number;
  suggestedMatchThreshold: number;
  possibleMatchThreshold: number;
  autoAcceptExactMatches: boolean;
  requireApprovalForBulkAccept: boolean;
  referenceNormalizationEnabled: boolean;
  partyNameDetectionEnabled: boolean;
  multipleCandidateGap: number;
}

export const DEFAULT_MATCH_CONFIG: BankReconMatchConfig = {
  electronicDateTolerance: 3,
  chequeDateTolerance: 15,
  cashDepositDateTolerance: 3,
  ecsNachDateTolerance: 5,
  bankTransferDateTolerance: 3,
  narrationSimilarityThreshold: 0.5,
  exactMatchThreshold: 95,
  suggestedMatchThreshold: 80,
  possibleMatchThreshold: 65,
  autoAcceptExactMatches: false,
  requireApprovalForBulkAccept: true,
  referenceNormalizationEnabled: true,
  partyNameDetectionEnabled: true,
  multipleCandidateGap: 3,
};

export type MatchRejectReason =
  | "Different Customer"
  | "Different Vendor"
  | "Reference Does Not Match"
  | "Date Difference Too High"
  | "Wrong Voucher"
  | "Duplicate Transaction"
  | "Amount Belongs to Multiple Entries"
  | "Other";

export interface BankReconMatchLink {
  id: string;
  bankAccountId: string;
  statementTransactionId: string;
  bookTargetId: string;
  bookRowKey: string | null;
  voucherId: number | null;
  voucherLineId: number | null;
  manualTransactionId: string | null;
  matchType: "exact" | "suggested" | "manual";
  matchMethod: MatchMethod;
  confidence: number;
  reasons: string[];
  matchedBy: string;
  matchedOn: string;
  active: boolean;
}

export interface BankReconMatchAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  bankAccountId: string;
  statementTransactionId: string | null;
  bookTransactionId: string | null;
  action: string;
  matchScore: number | null;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
}
