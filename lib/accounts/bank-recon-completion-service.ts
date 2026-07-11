/**
 * Bank reconciliation completion service — Step 7.
 */

import { getBankReconAccountById, maskAccountNumber } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { resolveCoaLedgerForV2BankAccount } from "@/lib/accounts/bank-recon-account-bridge";
import {
  appendCompletionAudit,
  createSessionId,
  createSnapshotId,
  getLatestCompletedSession,
  getSessionById,
  hasLaterCompletedSession,
  loadBankReconSessions,
  loadCompletionAccountMeta,
  loadCompletionAudit,
  loadSessionSnapshots,
  nextReconciliationSequence,
  saveSessionSnapshot,
  updateCompletionAccountMeta,
  upsertBankReconSession,
} from "@/lib/accounts/bank-recon-completion-store";
import type {
  BankReconAdjustmentItem,
  BankReconCarryForwardItem,
  BankReconCompletionAuditEntry,
  BankReconOutstandingBookItem,
  BankReconPartialItem,
  BankReconPeriodComparison,
  BankReconReconciliationFormula,
  BankReconReviewSnapshot,
  BankReconSessionRecord,
  BankReconSessionStatus,
  BankReconStatementOnlyItem,
  BankReconValidationCheck,
  CompleteReconciliationInput,
  ReopenReconciliationInput,
} from "@/lib/accounts/bank-recon-completion-types";
import { BANK_RECON_COMPLETION_PERMISSIONS } from "@/lib/accounts/bank-recon-completion-types";
import {
  computeDifferenceSummary,
  enrichBookRows,
  enrichStatementRows,
  loadAllBookTargetsForRecon,
} from "@/lib/accounts/bank-recon-manual-recon-service";
import { loadManualReconAllocations, loadManualReconAudit } from "@/lib/accounts/bank-recon-manual-recon-store";
import { loadMatchAudit } from "@/lib/accounts/bank-recon-match-store";
import { loadCategorizeAudit } from "@/lib/accounts/bank-recon-categorize-service";
import { buildBookEntries, computeBookSummary } from "@/lib/accounts/banking-book-utils";
import { seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  loadBankReconTransactions,
  loadImportBatches,
  loadAccountImportMeta,
  notifyRegisterUpdated,
} from "@/lib/accounts/bank-recon-register";

const CURRENT_USER = ACCOUNTS_CURRENT_USER;

const BANK_CODES: Record<string, string> = {
  "hdfc-current": "HDFC",
  "icici-collection": "ICICI",
  "sbi-cash-credit": "SBI",
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

function inferFinancialYear(periodTo: string): string {
  const d = new Date(periodTo);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`;
  return `${year - 1}-${String(year).slice(-2)}`;
}

function generateReconciliationNumber(bankAccountId: string, periodTo: string): string {
  const code = BANK_CODES[bankAccountId] ?? bankAccountId.slice(0, 4).toUpperCase();
  const fy = inferFinancialYear(periodTo);
  const seq = nextReconciliationSequence(code, fy);
  return `BRC-${code}-${fy.replace("-", "")}-${String(seq).padStart(5, "0")}`;
}

/** Permission stubs — integrate with RBAC when available */
export function canViewReconciliationCompletion(): boolean {
  return true;
}

export function canCompleteReconciliation(): boolean {
  return true;
}

export function canCompleteWithDifference(): boolean {
  try {
    const perms = JSON.parse(localStorage.getItem("ds_accounts_user_permissions") ?? "[]") as string[];
    return perms.includes(BANK_RECON_COMPLETION_PERMISSIONS.completeWithDifference) || perms.includes("*");
  } catch {
    return false;
  }
}

export function canReopenReconciliation(): boolean {
  try {
    const perms = JSON.parse(localStorage.getItem("ds_accounts_user_permissions") ?? "[]") as string[];
    return perms.includes(BANK_RECON_COMPLETION_PERMISSIONS.reopen) || perms.includes("*");
  } catch {
    return false;
  }
}

export function canCancelDraftReconciliation(): boolean {
  return true;
}

export function canDownloadReconciliationReports(): boolean {
  return true;
}

export function isPeriodLocked(
  bankAccountId: string,
  date: string,
): { locked: boolean; sessionId?: string; reconciliationNumber?: string | null } {
  const sessions = loadBankReconSessions(bankAccountId).filter(
    (s) =>
      s.locked &&
      (s.status === "Completed" || s.status === "Completed with Difference") &&
      date >= s.periodFrom &&
      date <= s.periodTo,
  );
  if (!sessions.length) return { locked: false };
  const s = sessions[sessions.length - 1]!;
  return { locked: true, sessionId: s.id, reconciliationNumber: s.reconciliationNumber };
}

export function getDefaultPeriodDates(bankAccountId: string): { from: string; to: string } {
  const meta = loadCompletionAccountMeta(bankAccountId);
  const account = getBankReconAccountById(bankAccountId);
  const importMeta = loadAccountImportMeta(bankAccountId);
  const latest = getLatestCompletedSession(bankAccountId);

  let from = meta.nextPeriodFrom ?? account?.statementPeriodFrom ?? "2026-06-01";
  if (latest?.periodTo) from = addDays(latest.periodTo, 1);
  else if (meta.lastReconciledDate) from = addDays(meta.lastReconciledDate, 1);

  const to =
    importMeta.lastStatementImportedUntil ??
    account?.statementPeriodTo ??
    new Date().toISOString().slice(0, 10);

  return { from, to };
}

export function buildReconciliationReview(
  bankAccountId: string,
  periodFrom: string,
  periodTo: string,
): BankReconReviewSnapshot {
  seedBankingDemoData();
  const account = getBankReconAccountById(bankAccountId);
  const importMeta = loadAccountImportMeta(bankAccountId);
  const batches = loadImportBatches(bankAccountId);
  const latestBatch = batches[0];

  const diff = computeDifferenceSummary(bankAccountId);
  const targets = loadAllBookTargetsForRecon(bankAccountId, periodFrom, periodTo);
  const books = enrichBookRows(bankAccountId, targets);
  const stmts = enrichStatementRows(
    bankAccountId,
    loadBankReconTransactions(bankAccountId),
    targets,
  );

  const periodBooks = books.filter((b) => !b.bookDate || (b.bookDate >= periodFrom && b.bookDate <= periodTo));
  const periodStmts = stmts.filter(
    (s) => s.statementDate >= periodFrom && s.statementDate <= periodTo,
  );

  const ledger = resolveCoaLedgerForV2BankAccount(bankAccountId);
  const bookEntries = ledger ? buildBookEntries([ledger], { dateFrom: periodFrom, dateTo: periodTo }) : [];
  const bookSummary = ledger ? computeBookSummary([ledger], bookEntries, { dateFrom: periodFrom, dateTo: periodTo }) : null;

  const bookDeposits = roundMoney(periodBooks.reduce((s, b) => s + b.deposit, 0));
  const bookWithdrawals = roundMoney(periodBooks.reduce((s, b) => s + b.withdrawal, 0));
  const bookOpening = bookSummary?.openingBalance ?? diff.openingBookBalance;
  const bookClosing = roundMoney(bookOpening + bookDeposits - bookWithdrawals);

  const stmtDeposits = roundMoney(periodStmts.reduce((s, r) => s + r.deposit, 0));
  const stmtWithdrawals = roundMoney(periodStmts.reduce((s, r) => s + r.withdrawal, 0));
  const stmtOpening = diff.statementOpeningBalance;
  const stmtClosing = roundMoney(stmtOpening + stmtDeposits - stmtWithdrawals);

  const unpresentedCheques = roundMoney(
    periodBooks
      .filter((b) => b.withdrawal > 0 && b.reconciliationStatus === "Unreconciled")
      .reduce((s, b) => s + b.availableAmount, 0),
  );
  const depositsInTransit = roundMoney(
    periodBooks
      .filter((b) => b.deposit > 0 && b.reconciliationStatus === "Unreconciled")
      .reduce((s, b) => s + b.availableAmount, 0),
  );

  const outstandingBook: BankReconOutstandingBookItem[] = periodBooks
    .filter((b) => b.reconciliationStatus === "Unreconciled" || b.reconciliationStatus === "Suggested")
    .map((b) => ({
      bookTargetId: b.id,
      bookDate: b.bookDate,
      voucherType: b.voucherType,
      voucherNo: b.voucherNo,
      partyLedger: b.partyLedger,
      reference: b.reference || b.chequeNo || "",
      deposit: b.deposit,
      withdrawal: b.withdrawal,
      expectedClearingDate: b.expectedClearingDate,
      ageingDays: b.bookDate ? daysBetween(b.bookDate, periodTo) : 0,
      reason: b.withdrawal > 0 ? "Unpresented Cheque" : "Deposit in Transit",
      carryForwardStatus: "Pending",
    }));

  const statementOnly: BankReconStatementOnlyItem[] = periodStmts
    .filter((s) => s.reconciliationStatus === "Unreconciled" && s.matchStatus !== "Matched")
    .map((s) => ({
      statementTransactionId: s.id,
      statementDate: s.statementDate,
      valueDate: s.valueDate,
      reference: s.reference || s.chequeNo || "",
      narration: s.narration,
      deposit: s.deposit,
      withdrawal: s.withdrawal,
      category: s.record.categorizationCategory ?? "Uncategorized",
      status: s.reconciliationStatus,
      requiredAction: s.withdrawal > 0 ? "Categorize / Match" : "Categorize / Match",
    }));

  const partialItems: BankReconPartialItem[] = periodBooks
    .filter((b) => b.reconciliationStatus === "Partially Reconciled")
    .map((b) => ({
      bookTargetId: b.id,
      statementTransactionId: null,
      originalAmount: b.originalAmount,
      reconciledAmount: b.reconciledAmount,
      remainingAmount: b.availableAmount,
      bookReference: b.voucherNo,
      statementReference: null,
      reconciliationDate: b.reconciliationDate,
      status: "Partially Reconciled",
    }));

  const adjustments: BankReconAdjustmentItem[] = loadBankReconTransactions(bankAccountId)
    .filter(
      (t) =>
        t.postedVoucherId &&
        t.statementDate >= periodFrom &&
        t.statementDate <= periodTo,
    )
    .map((t) => ({
      id: t.id,
      adjustmentType: t.categorizationCategory ?? "Other",
      voucherNo: t.postedVoucherId ? `V-${t.postedVoucherId}` : "—",
      date: t.statementDate,
      ledger: t.partyLedger,
      debit: t.withdrawal,
      credit: t.deposit,
      sourceBankTransactionId: t.id,
      createdBy: t.createdBy ?? CURRENT_USER,
      status: "Posted",
    }));

  const allocs = loadManualReconAllocations(bankAccountId).filter((a) => a.active);
  const reconciledDeposits = roundMoney(diff.reconciledDeposits);
  const reconciledWithdrawals = roundMoney(diff.reconciledWithdrawals);

  const formula: BankReconReconciliationFormula = {
    bookClosingBalance: bookClosing,
    addDepositsInTransit: depositsInTransit,
    addBankCreditsNotBooked: 0,
    lessUnpresentedCheques: unpresentedCheques,
    lessBankDebitsNotBooked: 0,
    adjustedBookBalance: roundMoney(bookClosing + depositsInTransit - unpresentedCheques),
    statementClosingBalance: account?.statementBalance ?? stmtClosing,
    finalDifference: roundMoney(
      bookClosing + depositsInTransit - unpresentedCheques - (account?.statementBalance ?? stmtClosing),
    ),
  };

  const previous = getLatestCompletedSession(bankAccountId);
  const comparison: BankReconPeriodComparison | null = previous
    ? {
        previousPeriodTo: previous.periodTo,
        previousClosingBookBalance: previous.bookClosingBalance,
        currentOpeningBookBalance: bookOpening,
        bookOpeningContinuityOk:
          Math.abs((previous.bookClosingBalance ?? 0) - bookOpening) < 0.01,
        previousStatementClosingBalance: previous.statementClosingBalance,
        currentStatementOpeningBalance: stmtOpening,
        statementOpeningContinuityOk:
          Math.abs((previous.statementClosingBalance ?? 0) - stmtOpening) < 0.01,
        previousCarryForwardCount: previous.carryForward.length,
        clearedCarryForwardCount: 0,
        newOutstandingCount: outstandingBook.length,
        differenceMovement: roundMoney(formula.finalDifference - (previous.finalDifference ?? 0)),
      }
    : null;

  const carryForward: BankReconCarryForwardItem[] = outstandingBook.map((o) => ({
    id: `cf-${o.bookTargetId}`,
    sourceType: "book",
    sourceReference: o.voucherNo,
    originalPeriodFrom: periodFrom,
    originalPeriodTo: periodTo,
    amount: o.deposit || o.withdrawal,
    direction: o.deposit > 0 ? "deposit" : "withdrawal",
    reason: o.reason,
    status: "Pending",
    nextPeriodFrom: addDays(periodTo, 1),
    remarks: null,
  }));

  const meta = loadCompletionAccountMeta(bankAccountId);

  const validationChecks = runValidationChecks(
    bankAccountId,
    periodFrom,
    periodTo,
    formula,
    outstandingBook,
    statementOnly,
    partialItems,
    comparison,
  );

  return {
    bankAccountId,
    bankName: account?.bankName ?? "",
    accountNickname: account?.accountNickname ?? "",
    maskedAccountNumber: maskAccountNumber(account?.accountNumber ?? ""),
    accountType: account?.accountType ?? "",
    periodFrom,
    periodTo,
    previousReconciliationDate: meta.lastReconciledDate ?? previous?.completedOn?.slice(0, 10) ?? null,
    importBatchId: latestBatch?.id ?? importMeta.lastImportBatchId,
    statementFileName: latestBatch?.fileName ?? importMeta.lastImportFileName,
    bookOpeningBalance: bookOpening,
    bookDeposits,
    bookWithdrawals,
    bookAdjustments: 0,
    bookClosingBalance: bookClosing,
    statementOpeningBalance: stmtOpening,
    statementDeposits: stmtDeposits,
    statementWithdrawals: stmtWithdrawals,
    statementAdjustments: 0,
    statementClosingBalance: account?.statementBalance ?? stmtClosing,
    totalReconciledDeposits: reconciledDeposits,
    totalReconciledWithdrawals: reconciledWithdrawals,
    unpresentedCheques,
    depositsInTransit,
    bookOnlyCount: outstandingBook.length,
    statementOnlyCount: statementOnly.length,
    partialCount: partialItems.length,
    excludedCount: 0,
    pendingReviewCount: statementOnly.filter((s) => s.status === "Unreconciled").length,
    adjustmentCount: adjustments.length,
    formula,
    outstandingBook,
    statementOnly,
    partialItems,
    adjustments,
    carryForward,
    reconciledTransactionCount: allocs.length,
    validationChecks,
    comparisonWithPrevious: comparison,
  };
}

export function runValidationChecks(
  bankAccountId: string,
  periodFrom: string,
  periodTo: string,
  formula: BankReconReconciliationFormula,
  outstandingBook: BankReconOutstandingBookItem[],
  statementOnly: BankReconStatementOnlyItem[],
  partialItems: BankReconPartialItem[],
  comparison: BankReconPeriodComparison | null,
  excludeSessionId?: string,
): BankReconValidationCheck[] {
  const checks: BankReconValidationCheck[] = [];

  checks.push({
    id: "period-valid",
    label: "Reconciliation period is valid",
    status: periodFrom <= periodTo ? "Passed" : "Failed",
    detail: periodFrom <= periodTo ? "Period dates are valid." : "From date is after To date.",
  });

  const today = new Date().toISOString().slice(0, 10);
  checks.push({
    id: "not-future",
    label: "Period is not in the future",
    status: periodTo <= today ? "Passed" : "Failed",
    detail: periodTo <= today ? "Period end is not future-dated." : "Cannot complete a future period.",
  });

  const overlap = loadBankReconSessions(bankAccountId).some(
    (s) =>
      s.id !== excludeSessionId &&
      (s.status === "Completed" || s.status === "Completed with Difference") &&
      s.periodFrom <= periodTo &&
      s.periodTo >= periodFrom,
  );
  checks.push({
    id: "no-overlap",
    label: "No overlapping completed period",
    status: overlap ? "Failed" : "Passed",
    detail: overlap ? "Another completed period overlaps this range." : "No period overlap.",
  });

  checks.push({
    id: "opening-balances",
    label: "Opening balances are available",
    status: formula.bookClosingBalance != null ? "Passed" : "Failed",
    detail: "Book and statement opening balances resolved.",
  });

  checks.push({
    id: "zero-difference",
    label: "Final difference is zero",
    status: Math.abs(formula.finalDifference) < 0.01 ? "Passed" : "Failed",
    detail: `Adjusted book ${formula.adjustedBookBalance} vs statement ${formula.statementClosingBalance} — diff ${formula.finalDifference}`,
  });

  if (comparison && !comparison.bookOpeningContinuityOk) {
    checks.push({
      id: "book-continuity",
      label: "Book opening balance continuity",
      status: "Warning",
      detail: "Current opening book balance does not match previous closing balance.",
    });
  }

  if (statementOnly.length > 0) {
    checks.push({
      id: "stmt-only",
      label: "Unresolved statement-only entries",
      status: "Warning",
      detail: `${statementOnly.length} statement-only entries remain unresolved.`,
    });
  }

  if (partialItems.length > 0) {
    checks.push({
      id: "partial",
      label: "Partial reconciliations",
      status: "Warning",
      detail: `${partialItems.length} partially reconciled transactions require review.`,
    });
  }

  if (outstandingBook.length > 0) {
    checks.push({
      id: "outstanding",
      label: "Outstanding book entries",
      status: "Warning",
      detail: `${outstandingBook.length} outstanding book entries will carry forward.`,
    });
  }

  checks.push({
    id: "permission",
    label: "User has permission to complete",
    status: canCompleteReconciliation() ? "Passed" : "Failed",
    detail: canCompleteReconciliation() ? "Permission granted." : "Missing complete permission.",
  });

  return checks;
}

export function createDraftSession(
  bankAccountId: string,
  periodFrom: string,
  periodTo: string,
): { ok: boolean; error?: string; session?: BankReconSessionRecord } {
  if (periodFrom > periodTo) return { ok: false, error: "From date cannot be after To date." };

  const review = buildReconciliationReview(bankAccountId, periodFrom, periodTo);
  const now = new Date().toISOString();
  const id = createSessionId();

  const session: BankReconSessionRecord = {
    id,
    reconciliationNumber: null,
    bankAccountId,
    periodFrom,
    periodTo,
    status: "In Progress",
    version: 1,
    previousVersionId: null,
    financialYear: inferFinancialYear(periodTo),
    statementOpeningBalance: review.statementOpeningBalance,
    statementClosingBalance: review.statementClosingBalance,
    bookOpeningBalance: review.bookOpeningBalance,
    bookClosingBalance: review.bookClosingBalance,
    adjustedBookBalance: review.formula.adjustedBookBalance,
    finalDifference: review.formula.finalDifference,
    differenceOverrideReason: null,
    differenceApprovedBy: null,
    differenceApprovedOn: null,
    incompletePeriodReason: null,
    preparedBy: CURRENT_USER,
    preparedOn: now,
    reviewedBy: null,
    approvedBy: null,
    completedBy: null,
    completedOn: null,
    reopenedBy: null,
    reopenedOn: null,
    reopenReason: null,
    cancelledBy: null,
    cancelledOn: null,
    cancelReason: null,
    importBatchId: review.importBatchId,
    statementFileName: review.statementFileName,
    locked: false,
    snapshotId: null,
    carryForward: review.carryForward,
    changeSummary: null,
    differenceBefore: null,
    differenceAfter: null,
  };

  upsertBankReconSession(session);
  appendCompletionAudit({
    user: CURRENT_USER,
    action: "Reconciliation created",
    bankAccountId,
    reconciliationNumber: null,
    sessionId: id,
    transactionReference: null,
    previousValue: null,
    newValue: `${periodFrom} — ${periodTo}`,
    reason: null,
  });

  return { ok: true, session };
}

export function completeReconciliation(
  input: CompleteReconciliationInput,
): { ok: boolean; error?: string; session?: BankReconSessionRecord } {
  const session = getSessionById(input.sessionId);
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status === "Completed" || session.status === "Completed with Difference") {
    return { ok: false, error: "Reconciliation is already completed." };
  }
  if (!input.confirmed) return { ok: false, error: "Confirmation is required." };

  const review = buildReconciliationReview(session.bankAccountId, session.periodFrom, session.periodTo);
  const checks = runValidationChecks(
    session.bankAccountId,
    session.periodFrom,
    session.periodTo,
    review.formula,
    review.outstandingBook,
    review.statementOnly,
    review.partialItems,
    review.comparisonWithPrevious,
    session.id,
  );
  const failed = checks.filter((c) => c.status === "Failed");
  const hasDiff = Math.abs(review.formula.finalDifference) >= 0.01;

  if (hasDiff && !input.differenceOverride) {
    if (!canCompleteWithDifference()) {
      return {
        ok: false,
        error: "Reconciliation cannot be completed because the adjusted book balance does not match the statement closing balance.",
      };
    }
    return { ok: false, error: "Difference override with reason and approval is required." };
  }

  if (failed.some((f) => f.id !== "zero-difference" && f.id !== "no-overlap")) {
    return { ok: false, error: "Validation failed. Resolve failed checks before completing." };
  }

  if (!hasDiff && failed.some((f) => f.id === "zero-difference")) {
    return {
      ok: false,
      error: "Reconciliation cannot be completed because the adjusted book balance does not match the statement closing balance.",
    };
  }

  if (hasDiff && input.differenceOverride && !canCompleteWithDifference()) {
    return { ok: false, error: "You do not have permission to complete with difference." };
  }

  const now = new Date().toISOString();
  const reconNumber = session.reconciliationNumber ?? generateReconciliationNumber(session.bankAccountId, session.periodTo);
  const snapshotId = createSnapshotId();

  saveSessionSnapshot({
    id: snapshotId,
    sessionId: session.id,
    version: session.version,
    createdOn: now,
    createdBy: CURRENT_USER,
    data: review,
  });

  const updated: BankReconSessionRecord = {
    ...session,
    reconciliationNumber: reconNumber,
    status: hasDiff ? "Completed with Difference" : "Completed",
    statementOpeningBalance: review.statementOpeningBalance,
    statementClosingBalance: review.statementClosingBalance,
    bookOpeningBalance: review.bookOpeningBalance,
    bookClosingBalance: review.bookClosingBalance,
    adjustedBookBalance: review.formula.adjustedBookBalance,
    finalDifference: review.formula.finalDifference,
    differenceOverrideReason: input.differenceOverride?.reason ?? null,
    differenceApprovedBy: input.differenceOverride?.approvedBy ?? null,
    differenceApprovedOn: hasDiff ? now : null,
    completedBy: CURRENT_USER,
    completedOn: now,
    locked: true,
    snapshotId,
    carryForward: review.carryForward.map((c) => ({ ...c, status: "Carried Forward" as const })),
  };

  upsertBankReconSession(updated);

  updateCompletionAccountMeta({
    bankAccountId: session.bankAccountId,
    lastReconciledDate: session.periodTo,
    lastCompletedSessionId: session.id,
    nextPeriodFrom: addDays(session.periodTo, 1),
    listingStatus: hasDiff ? "Completed with Difference" : "Reconciled",
  });

  appendCompletionAudit({
    user: CURRENT_USER,
    action: hasDiff ? "Reconciliation completed with difference" : "Reconciliation completed",
    bankAccountId: session.bankAccountId,
    reconciliationNumber: reconNumber,
    sessionId: session.id,
    transactionReference: null,
    previousValue: session.status,
    newValue: updated.status,
    reason: input.differenceOverride?.reason ?? null,
  });

  notifyRegisterUpdated();
  return { ok: true, session: updated };
}

export function reopenReconciliation(
  input: ReopenReconciliationInput,
): { ok: boolean; error?: string; session?: BankReconSessionRecord } {
  if (!canReopenReconciliation()) return { ok: false, error: "You do not have permission to reopen." };
  if (!input.reason.trim()) return { ok: false, error: "Reopen reason is required." };

  const session = getSessionById(input.sessionId);
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "Completed" && session.status !== "Completed with Difference") {
    return { ok: false, error: "Only completed reconciliations can be reopened." };
  }

  if (hasLaterCompletedSession(session.bankAccountId, session.periodTo, session.id)) {
    return {
      ok: false,
      error: "A later completed reconciliation exists. Reopen from the latest period backwards.",
    };
  }

  const now = new Date().toISOString();
  const updated: BankReconSessionRecord = {
    ...session,
    status: "Reopened",
    locked: false,
    reopenedBy: CURRENT_USER,
    reopenedOn: now,
    reopenReason: input.reason.trim(),
  };

  upsertBankReconSession(updated);

  updateCompletionAccountMeta({
    ...loadCompletionAccountMeta(session.bankAccountId),
    bankAccountId: session.bankAccountId,
    listingStatus: "Reopened",
  });

  appendCompletionAudit({
    user: CURRENT_USER,
    action: "Reconciliation reopened",
    bankAccountId: session.bankAccountId,
    reconciliationNumber: session.reconciliationNumber,
    sessionId: session.id,
    transactionReference: null,
    previousValue: "Completed",
    newValue: "Reopened",
    reason: input.reason,
  });

  return { ok: true, session: updated };
}

export function recompleteReconciliation(
  sessionId: string,
  input: CompleteReconciliationInput,
): { ok: boolean; error?: string; session?: BankReconSessionRecord } {
  const session = getSessionById(sessionId);
  if (!session || session.status !== "Reopened") {
    return { ok: false, error: "Session must be in Reopened status." };
  }

  const review = buildReconciliationReview(session.bankAccountId, session.periodFrom, session.periodTo);
  const now = new Date().toISOString();
  const newVersion = session.version + 1;
  const snapshotId = createSnapshotId();
  const diffBefore = session.finalDifference;

  saveSessionSnapshot({
    id: snapshotId,
    sessionId: session.id,
    version: newVersion,
    createdOn: now,
    createdBy: CURRENT_USER,
    data: review,
  });

  const hasDiff = Math.abs(review.formula.finalDifference) >= 0.01;
  const updated: BankReconSessionRecord = {
    ...session,
    version: newVersion,
    previousVersionId: session.snapshotId,
    status: hasDiff ? "Completed with Difference" : "Completed",
    adjustedBookBalance: review.formula.adjustedBookBalance,
    finalDifference: review.formula.finalDifference,
    completedBy: CURRENT_USER,
    completedOn: now,
    locked: true,
    snapshotId,
    changeSummary: "Recompleted after reopen",
    differenceBefore: diffBefore,
    differenceAfter: review.formula.finalDifference,
    reopenedBy: session.reopenedBy,
    reopenedOn: session.reopenedOn,
    reopenReason: session.reopenReason,
  };

  upsertBankReconSession(updated);

  appendCompletionAudit({
    user: CURRENT_USER,
    action: "Reconciliation recompleted",
    bankAccountId: session.bankAccountId,
    reconciliationNumber: session.reconciliationNumber,
    sessionId: session.id,
    transactionReference: null,
    previousValue: String(diffBefore),
    newValue: String(review.formula.finalDifference),
    reason: null,
  });

  return { ok: true, session: updated };
}

export function cancelDraftSession(
  sessionId: string,
  reason: string,
): { ok: boolean; error?: string } {
  const session = getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found." };
  if (session.status !== "Draft" && session.status !== "In Progress" && session.status !== "Ready to Complete") {
    return { ok: false, error: "Only draft or in-progress sessions can be cancelled." };
  }
  if (!reason.trim()) return { ok: false, error: "Cancellation reason is required." };

  upsertBankReconSession({
    ...session,
    status: "Cancelled",
    cancelledBy: CURRENT_USER,
    cancelledOn: new Date().toISOString(),
    cancelReason: reason.trim(),
    locked: false,
  });

  appendCompletionAudit({
    user: CURRENT_USER,
    action: "Draft cancelled",
    bankAccountId: session.bankAccountId,
    reconciliationNumber: session.reconciliationNumber,
    sessionId: session.id,
    transactionReference: null,
    previousValue: session.status,
    newValue: "Cancelled",
    reason,
  });

  return { ok: true };
}

export function getSessionReview(sessionId: string): BankReconReviewSnapshot | null {
  const session = getSessionById(sessionId);
  if (!session) return null;
  if (session.snapshotId) {
    const snap = loadSessionSnapshots(sessionId).find((s) => s.id === session.snapshotId);
    if (snap) return snap.data;
  }
  return buildReconciliationReview(session.bankAccountId, session.periodFrom, session.periodTo);
}

export function aggregateAuditTrail(bankAccountId: string): BankReconCompletionAuditEntry[] {
  const completion = loadCompletionAudit(bankAccountId);
  const manual = loadManualReconAudit(bankAccountId);
  const match = loadMatchAudit(bankAccountId);
  const categorize = loadCategorizeAudit(bankAccountId);

  const manualMapped: BankReconCompletionAuditEntry[] = manual.map((m) => ({
    id: m.id,
    timestamp: m.timestamp,
    user: m.user,
    action: m.action,
    bankAccountId: m.bankAccountId,
    reconciliationNumber: null,
    sessionId: m.groupId,
    transactionReference: m.bookReference,
    previousValue: m.previousValue,
    newValue: m.newValue,
    reason: m.reason,
  }));

  const matchMapped: BankReconCompletionAuditEntry[] = match.map((m) => ({
    id: m.id,
    timestamp: m.timestamp,
    user: m.user,
    action: m.action,
    bankAccountId: m.bankAccountId,
    reconciliationNumber: null,
    sessionId: null,
    transactionReference: m.statementTransactionId ?? m.bookTransactionId,
    previousValue: m.previousStatus,
    newValue: m.newStatus,
    reason: m.reason,
  }));

  const categorizeMapped: BankReconCompletionAuditEntry[] = categorize.map((c) => ({
    id: c.id,
    timestamp: c.timestamp,
    user: c.user,
    action: c.action,
    bankAccountId: c.bankAccountId,
    reconciliationNumber: null,
    sessionId: null,
    transactionReference: c.statementTransactionId,
    previousValue: c.category ?? null,
    newValue: c.voucherNumber ?? c.details ?? null,
    reason: c.reason ?? null,
  }));

  return [...completion, ...manualMapped, ...matchMapped, ...categorizeMapped].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
}

export {
  loadBankReconSessions,
  getSessionById,
  loadCompletionAudit,
  loadSessionSnapshots,
  loadCompletionAccountMeta,
  getLatestCompletedSession,
};
