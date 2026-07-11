/**
 * Manual reconciliation service — Step 6.
 */

import type { BankReconActivityEvent } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { getBankReconAccountById } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { resolveCoaLedgerForV2BankAccount } from "@/lib/accounts/bank-recon-account-bridge";
import {
  bookRowToTarget,
  loadMatchBookTargets,
  manualRecordToTarget,
  scoreStatementToBook,
} from "@/lib/accounts/bank-recon-match-engine";
import { loadMatchRun } from "@/lib/accounts/bank-recon-match-store";
import { DEFAULT_MATCH_CONFIG } from "@/lib/accounts/bank-recon-match-types";
import type { MatchBookTarget } from "@/lib/accounts/bank-recon-match-types";
import {
  appendManualReconAudit,
  createManualReconId,
  deactivateGroupAndAllocations,
  getActiveAllocationsForBook,
  getActiveAllocationsForStatement,
  getAllocationsForGroup,
  getGroupById,
  loadManualReconAllocations,
  loadManualReconAudit,
  upsertManualReconAllocation,
  upsertManualReconGroup,
} from "@/lib/accounts/bank-recon-manual-recon-store";
import type {
  ManualClearingReason,
  ManualReconAllocationInput,
  ManualReconBookRow,
  ManualReconDifferenceSummary,
  ManualReconMatchType,
  ManualReconSelectionSummary,
  ManualReconStatementRow,
  ManualReconciliationStatus,
} from "@/lib/accounts/bank-recon-manual-recon-types";
import {
  buildBookEntries,
  computeBookSummary,
} from "@/lib/accounts/banking-book-utils";
import { seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  isPeriodLocked,
} from "@/lib/accounts/bank-recon-completion-service";
import {
  getBankReconTransactionById,
  loadBankReconTransactions,
  notifyRegisterUpdated,
  upsertBankReconTransaction,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";

const CURRENT_USER = ACCOUNTS_CURRENT_USER;

function bookAmount(t: MatchBookTarget): number {
  return t.deposit || t.withdrawal;
}

function bookDirection(t: MatchBookTarget): "deposit" | "withdrawal" {
  return t.deposit > 0 ? "deposit" : "withdrawal";
}

function stmtDirection(r: BankReconTransactionRecord): "deposit" | "withdrawal" {
  return r.deposit > 0 ? "deposit" : "withdrawal";
}

function stmtAmount(r: BankReconTransactionRecord): number {
  return r.deposit || r.withdrawal;
}

function deriveReconStatus(original: number, reconciled: number): ManualReconciliationStatus {
  if (reconciled <= 0.009) return "Unreconciled";
  if (reconciled >= original - 0.009) return "Reconciled";
  return "Partially Reconciled";
}

function activity(label: string, detail: string, tone: BankReconActivityEvent["tone"] = "emerald"): BankReconActivityEvent {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    detail,
    actor: CURRENT_USER,
    timestamp: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    tone,
  };
}

export function loadAllBookTargetsForRecon(
  bankAccountId: string,
  dateFrom?: string,
  dateTo?: string,
): MatchBookTarget[] {
  seedBankingDemoData();
  const ledger = resolveCoaLedgerForV2BankAccount(bankAccountId);
  if (!ledger) return [];

  const bookRows = buildBookEntries([ledger], { dateFrom, dateTo });
  const targets = bookRows.map(bookRowToTarget);

  const manuals = loadBankReconTransactions(bankAccountId).filter(
    (t) =>
      (t.source === "Manual" || t.source === "Manual + Statement") &&
      t.manualEntryStatus !== "Cancelled" &&
      t.manualEntryStatus !== "Draft",
  );

  for (const m of manuals) {
    if (dateFrom && (m.bookDate ?? "") < dateFrom) continue;
    if (dateTo && (m.bookDate ?? "") > dateTo) continue;
    targets.push(manualRecordToTarget(m));
  }

  return targets;
}

function getBookReconciledAmount(bankAccountId: string, bookTargetId: string): number {
  return roundMoney(
    getActiveAllocationsForBook(bankAccountId, bookTargetId).reduce((s, a) => s + a.allocatedAmount, 0),
  );
}

function getStatementReconciledAmount(bankAccountId: string, statementId: string): number {
  return roundMoney(
    getActiveAllocationsForStatement(bankAccountId, statementId).reduce((s, a) => s + a.allocatedAmount, 0),
  );
}

function getLatestReconDateForBook(bankAccountId: string, bookTargetId: string): string | null {
  const allocs = getActiveAllocationsForBook(bankAccountId, bookTargetId);
  if (!allocs.length) return null;
  return allocs.sort((a, b) => b.reconciliationDate.localeCompare(a.reconciliationDate))[0]?.reconciliationDate ?? null;
}

function getLatestReconDateForStatement(bankAccountId: string, statementId: string): string | null {
  const allocs = getActiveAllocationsForStatement(bankAccountId, statementId);
  if (!allocs.length) return null;
  return allocs.sort((a, b) => b.reconciliationDate.localeCompare(a.reconciliationDate))[0]?.reconciliationDate ?? null;
}

function getSuggestedForStatement(
  bankAccountId: string,
  stmt: BankReconTransactionRecord,
  books: MatchBookTarget[],
): { bookTargetId: string; confidence: number; reasons: string[] } | null {
  const run = loadMatchRun(bankAccountId);
  const group = run?.groups.find((g) => g.statementTransactionId === stmt.id);
  if (group?.candidates[0]) {
    return {
      bookTargetId: group.candidates[0].bookTarget.id,
      confidence: group.candidates[0].confidence,
      reasons: group.candidates[0].reasons,
    };
  }
  let best: { bookTargetId: string; confidence: number; reasons: string[] } | null = null;
  for (const b of books) {
    const scored = scoreStatementToBook(stmt, b, DEFAULT_MATCH_CONFIG);
    if (!scored) continue;
    if (!best || scored.confidence > best.confidence) {
      best = { bookTargetId: b.id, confidence: scored.confidence, reasons: scored.reasons };
    }
  }
  return best && best.confidence >= DEFAULT_MATCH_CONFIG.possibleMatchThreshold ? best : null;
}

export function enrichBookRows(bankAccountId: string, targets: MatchBookTarget[]): ManualReconBookRow[] {
  const run = loadMatchRun(bankAccountId);
  return targets.map((t) => {
    const original = bookAmount(t);
    const reconciled = getBookReconciledAmount(bankAccountId, t.id);
    const available = roundMoney(Math.max(0, original - reconciled));
    let suggestedStatementId: string | null = null;
    let suggestedConfidence: number | null = null;
    let suggestedReasons: string[] = [];
    if (available > 0.009 && run) {
      for (const g of run.groups) {
        const cand = g.candidates.find((c) => c.bookTarget.id === t.id);
        if (cand && (g.category === "exact" || g.category === "suggested")) {
          suggestedStatementId = g.statementTransactionId;
          suggestedConfidence = cand.confidence;
          suggestedReasons = cand.reasons;
          break;
        }
      }
    }
    let status: ManualReconciliationStatus;
    if (reconciled <= 0.009) {
      status = suggestedStatementId ? "Suggested" : "Unreconciled";
    } else {
        const allocs = getActiveAllocationsForBook(bankAccountId, t.id);
        const hasStatementLink = allocs.some((a) => a.statementTransactionId);
        const group = allocs[0] ? getGroupById(allocs[0].groupId) : null;
        if (!hasStatementLink && group?.reconciliationMethod === "Manual Clearing" && reconciled >= original - 0.009) {
          status = "Manually Cleared";
        } else {
          status = deriveReconStatus(original, reconciled);
        }
    }

    const activeGroup = loadManualReconAllocations(bankAccountId).find(
      (a) => a.active && a.bookTargetId === t.id,
    )?.groupId ?? null;

    const manual = t.manualRecord;
    return {
      ...t,
      reconciliationStatus: status,
      reconciledAmount: reconciled,
      availableAmount: available,
      originalAmount: original,
      reconciliationDate: getLatestReconDateForBook(bankAccountId, t.id),
      expectedClearingDate: manual?.expectedClearingDate ?? null,
      chequeDate: manual?.chequeDate ?? null,
      depositedDate: manual?.depositedDate ?? null,
      suggestedStatementId,
      suggestedConfidence,
      suggestedReasons,
      groupId: activeGroup,
    };
  });
}

export function enrichStatementRows(
  bankAccountId: string,
  records: BankReconTransactionRecord[],
  books: MatchBookTarget[],
): ManualReconStatementRow[] {
  return records
    .filter((r) => r.source === "Statement Upload" || r.source === "Manual + Statement" || r.source === "Bank Feed")
    .map((r) => {
      const original = stmtAmount(r);
      const reconciled = getStatementReconciledAmount(bankAccountId, r.id);
      const available = roundMoney(Math.max(0, original - reconciled));
      const suggested = available > 0.009 ? getSuggestedForStatement(bankAccountId, r, books) : null;
      const status: ManualReconciliationStatus =
        r.reconciliationStatus as ManualReconciliationStatus | undefined ??
        (reconciled <= 0.009
          ? suggested
            ? "Suggested"
            : "Unreconciled"
          : deriveReconStatus(original, reconciled));

      const activeGroup = loadManualReconAllocations(bankAccountId).find(
        (a) => a.active && a.statementTransactionId === r.id,
      )?.groupId ?? null;

      return {
        id: r.id,
        statementDate: r.statementDate,
        valueDate: r.valueDate,
        reference: r.reference || r.utrNumber || "",
        chequeNo: r.chequeNo,
        narration: r.narration,
        deposit: r.deposit,
        withdrawal: r.withdrawal,
        source: r.source,
        verificationStatus: r.verificationStatus,
        matchStatus: r.matchStatus,
        reconciliationStatus: status,
        reconciledAmount: reconciled,
        availableAmount: available,
        originalAmount: original,
        reconciliationDate: r.reconciliationDate ?? getLatestReconDateForStatement(bankAccountId, r.id),
        suggestedBookTargetId: suggested?.bookTargetId ?? null,
        suggestedConfidence: suggested?.confidence ?? null,
        suggestedReasons: suggested?.reasons ?? [],
        groupId: activeGroup,
        record: r,
      };
    });
}

export function accountHasStatement(bankAccountId: string): boolean {
  const account = getBankReconAccountById(bankAccountId);
  if (account?.lastStatementImportedUntil) return true;
  return loadBankReconTransactions(bankAccountId).some(
    (t) => t.source === "Statement Upload" || t.source === "Manual + Statement",
  );
}

export function computeSelectionSummary(
  books: ManualReconBookRow[],
  statements: ManualReconStatementRow[],
  selectedBookIds: Set<string>,
  selectedStmtIds: Set<string>,
): ManualReconSelectionSummary {
  const selBooks = books.filter((b) => selectedBookIds.has(b.id));
  const selStmts = statements.filter((s) => selectedStmtIds.has(s.id));

  const bookDepositTotal = roundMoney(selBooks.reduce((s, b) => s + b.deposit, 0));
  const bookWithdrawalTotal = roundMoney(selBooks.reduce((s, b) => s + b.withdrawal, 0));
  const statementDepositTotal = roundMoney(selStmts.reduce((s, r) => s + r.deposit, 0));
  const statementWithdrawalTotal = roundMoney(selStmts.reduce((s, r) => s + r.withdrawal, 0));

  const bookNet = roundMoney(bookDepositTotal - bookWithdrawalTotal);
  const statementNet = roundMoney(statementDepositTotal - statementWithdrawalTotal);

  let direction: "deposit" | "withdrawal" | "mixed" | null = null;
  if (selBooks.length || selStmts.length) {
    const bookDirs = new Set(selBooks.map(bookDirection));
    const stmtDirs = new Set(selStmts.map((s) => stmtDirection(s.record)));
    const allDirs = new Set([...bookDirs, ...stmtDirs]);
    if (allDirs.size > 1) direction = "mixed";
    else if (allDirs.has("deposit")) direction = "deposit";
    else if (allDirs.has("withdrawal")) direction = "withdrawal";
  }

  let matchType: ManualReconMatchType | null = null;
  const bc = selBooks.length;
  const sc = selStmts.length;
  if (bc === 1 && sc === 1) matchType = "One-to-One";
  else if (bc === 1 && sc > 1) matchType = "One-to-Many";
  else if (bc > 1 && sc === 1) matchType = "Many-to-One";
  else if (bc > 1 && sc > 1) matchType = "Many-to-Many";

  return {
    bookCount: bc,
    statementCount: sc,
    bookDepositTotal,
    bookWithdrawalTotal,
    statementDepositTotal,
    statementWithdrawalTotal,
    bookNet,
    statementNet,
    difference: roundMoney(Math.abs(bookNet - statementNet)),
    direction,
    matchType,
  };
}

function inferMatchType(bookCount: number, stmtCount: number, partial: boolean): ManualReconMatchType {
  if (bookCount === 0 && stmtCount > 0) return "Manual Clearing";
  if (partial) return "Partial";
  if (bookCount === 1 && stmtCount === 1) return "One-to-One";
  if (bookCount === 1 && stmtCount > 1) return "One-to-Many";
  if (bookCount > 1 && stmtCount === 1) return "Many-to-One";
  return "Many-to-Many";
}

export function computeDifferenceSummary(bankAccountId: string): ManualReconDifferenceSummary {
  const account = getBankReconAccountById(bankAccountId);
  const ledger = resolveCoaLedgerForV2BankAccount(bankAccountId);
  const bookEntries = ledger ? buildBookEntries([ledger]) : [];
  const bookSummary = ledger ? computeBookSummary([ledger], bookEntries) : null;
  const stmts = loadBankReconTransactions(bankAccountId).filter(
    (t) => t.source === "Statement Upload" || t.source === "Manual + Statement",
  );
  const books = enrichBookRows(bankAccountId, loadAllBookTargetsForRecon(bankAccountId));
  const stmtRows = enrichStatementRows(bankAccountId, stmts, loadAllBookTargetsForRecon(bankAccountId));

  const allocs = loadManualReconAllocations(bankAccountId).filter((a) => a.active);
  let reconciledDeposits = 0;
  let reconciledWithdrawals = 0;
  for (const a of allocs) {
    const stmt = a.statementTransactionId ? getBankReconTransactionById(a.statementTransactionId) : null;
    if (stmt?.deposit) reconciledDeposits += a.allocatedAmount;
    else if (stmt?.withdrawal) reconciledWithdrawals += a.allocatedAmount;
    else {
      const book = books.find((b) => b.id === a.bookTargetId);
      if (book?.deposit) reconciledDeposits += a.allocatedAmount;
      else reconciledWithdrawals += a.allocatedAmount;
    }
  }

  const bookOnlyCount = books.filter((b) => b.reconciliationStatus === "Unreconciled" || b.reconciliationStatus === "Partially Reconciled").length;
  const statementOnlyCount = stmtRows.filter((s) => s.reconciliationStatus === "Unreconciled").length;

  return {
    openingBookBalance: bookSummary?.openingBalance ?? account?.bookBalance ?? 0,
    bookDeposits: bookSummary?.totalReceipts ?? 0,
    bookWithdrawals: bookSummary?.totalPayments ?? 0,
    closingBookBalance: bookSummary?.closingBalance ?? account?.bookBalance ?? 0,
    statementOpeningBalance: 0,
    statementDeposits: roundMoney(stmts.reduce((s, t) => s + t.deposit, 0)),
    statementWithdrawals: roundMoney(stmts.reduce((s, t) => s + t.withdrawal, 0)),
    statementClosingBalance: account?.statementBalance ?? 0,
    reconciledDeposits: roundMoney(reconciledDeposits),
    reconciledWithdrawals: roundMoney(reconciledWithdrawals),
    unpresentedCheques: roundMoney(
      books.filter((b) => b.withdrawal > 0 && b.reconciliationStatus === "Unreconciled").reduce((s, b) => s + b.availableAmount, 0),
    ),
    depositsInTransit: roundMoney(
      books.filter((b) => b.deposit > 0 && b.reconciliationStatus === "Unreconciled").reduce((s, b) => s + b.availableAmount, 0),
    ),
    statementOnlyCount,
    bookOnlyCount,
    currentDifference: roundMoney((account?.bookBalance ?? 0) - (account?.statementBalance ?? 0)),
  };
}

export interface SaveManualReconInput {
  bankAccountId: string;
  allocations: ManualReconAllocationInput[];
  remarks?: string;
  groupRemark?: string;
  requireManyToManyConfirm?: boolean;
}

export function saveManualReconciliation(input: SaveManualReconInput): { ok: boolean; error?: string; groupId?: string } {
  const { bankAccountId, allocations } = input;
  if (!allocations.length) return { ok: false, error: "No allocations to save." };

  for (const alloc of allocations) {
    const lock = isPeriodLocked(bankAccountId, alloc.reconciliationDate);
    if (lock.locked) {
      return {
        ok: false,
        error: `Period is locked (${lock.reconciliationNumber ?? "completed reconciliation"}). Reopen to edit.`,
      };
    }
  }

  const books = enrichBookRows(bankAccountId, loadAllBookTargetsForRecon(bankAccountId));
  const bookMap = new Map(books.map((b) => [b.id, b]));

  const uniqueBooks = new Set(allocations.map((a) => a.bookTargetId));
  const uniqueStmts = new Set(allocations.map((a) => a.statementTransactionId).filter(Boolean) as string[]);

  let totalBook = 0;
  let totalStmt = 0;
  let bookDir: "deposit" | "withdrawal" | null = null;
  let stmtDir: "deposit" | "withdrawal" | null = null;

  for (const alloc of allocations) {
    if (!(alloc.appliedAmount > 0.009)) return { ok: false, error: "Applied amount must be greater than zero." };
    if (!alloc.reconciliationDate?.trim()) return { ok: false, error: "Reconciliation date is required." };

    const book = bookMap.get(alloc.bookTargetId);
    if (!book) return { ok: false, error: "Book transaction not found." };
    if (alloc.appliedAmount > book.availableAmount + 0.009) {
      return { ok: false, error: `${book.voucherNo}: applied amount exceeds available balance.` };
    }

    const dir = bookDirection(book);
    if (!bookDir) bookDir = dir;
    else if (bookDir !== dir) return { ok: false, error: "Cannot mix deposit and withdrawal book entries." };
    totalBook = roundMoney(totalBook + alloc.appliedAmount);

    if (alloc.statementTransactionId) {
      const stmt = getBankReconTransactionById(alloc.statementTransactionId);
      if (!stmt || stmt.bankAccountId !== bankAccountId) {
        return { ok: false, error: "Statement transaction not found." };
      }
      const stmtAvail = roundMoney(stmtAmount(stmt) - getStatementReconciledAmount(bankAccountId, stmt.id));
      if (alloc.appliedAmount > stmtAvail + 0.009) {
        return { ok: false, error: "Applied amount exceeds available statement amount." };
      }
      const sDir = stmtDirection(stmt);
      if (!stmtDir) stmtDir = sDir;
      else if (stmtDir !== sDir) return { ok: false, error: "Cannot mix deposit and withdrawal statement entries." };
      if (bookDir && stmtDir && bookDir !== stmtDir) {
        return { ok: false, error: "A deposit transaction cannot be reconciled against a withdrawal transaction." };
      }
      totalStmt = roundMoney(totalStmt + alloc.appliedAmount);
    }
  }

  const hasStatement = uniqueStmts.size > 0;
  if (hasStatement && Math.abs(totalBook - totalStmt) > 0.009) {
    return { ok: false, error: `Book total (${totalBook}) must equal statement total (${totalStmt}).` };
  }

  const partial = allocations.some((a) => {
    const book = bookMap.get(a.bookTargetId)!;
    return a.appliedAmount < book.availableAmount - 0.009;
  });

  const matchType = inferMatchType(uniqueBooks.size, uniqueStmts.size, partial);
  if (matchType === "Many-to-Many" && uniqueBooks.size > 1 && uniqueStmts.size > 1 && !input.requireManyToManyConfirm) {
    return { ok: false, error: "Many-to-many grouping requires explicit confirmation and a grouping remark." };
  }
  if (matchType === "Many-to-Many" && !input.groupRemark?.trim()) {
    return { ok: false, error: "Grouping remark is mandatory for many-to-many reconciliation." };
  }

  const groupId = createManualReconId("mrg");
  const now = new Date().toISOString();
  const primaryDate = allocations[0]?.reconciliationDate ?? now.slice(0, 10);

  upsertManualReconGroup({
    id: groupId,
    bankAccountId,
    matchType,
    reconciliationMethod: hasStatement ? "Statement Match" : "Manual Clearing",
    reconciliationDate: primaryDate,
    totalBookAmount: totalBook,
    totalStatementAmount: totalStmt,
    remarks: input.remarks ?? input.groupRemark ?? null,
    clearingReason: null,
    createdBy: CURRENT_USER,
    createdOn: now,
    updatedBy: CURRENT_USER,
    updatedOn: now,
    active: true,
  });

  for (const alloc of allocations) {
    const book = bookMap.get(alloc.bookTargetId)!;
    upsertManualReconAllocation({
      id: createManualReconId("mra"),
      groupId,
      bankAccountId,
      bookTargetId: alloc.bookTargetId,
      bookRowKey: book.bookRowKey,
      statementTransactionId: alloc.statementTransactionId,
      allocatedAmount: roundMoney(alloc.appliedAmount),
      reconciliationDate: alloc.reconciliationDate,
      remarks: alloc.remarks ?? null,
      createdBy: CURRENT_USER,
      createdOn: now,
      active: true,
    });

    if (alloc.statementTransactionId) {
      const stmt = getBankReconTransactionById(alloc.statementTransactionId)!;
      const newReconciled = getStatementReconciledAmount(bankAccountId, stmt.id);
      const newStatus = deriveReconStatus(stmtAmount(stmt), newReconciled);
      upsertBankReconTransaction({
        ...stmt,
        reconciliationDate: alloc.reconciliationDate,
        reconciliationStatus: newStatus,
        reconciledAmount: newReconciled,
        activity: [
          ...stmt.activity,
          activity(
            "Manual reconciliation saved",
            `${matchType} — ${roundMoney(alloc.appliedAmount)} allocated to ${book.voucherNo}`,
            "emerald",
          ),
        ],
      });
    }

    appendManualReconAudit({
      user: CURRENT_USER,
      bankAccountId,
      action: "Allocation created",
      bookReference: book.voucherNo,
      statementReference: alloc.statementTransactionId ?? null,
      previousValue: String(book.reconciledAmount),
      newValue: String(getBookReconciledAmount(bankAccountId, book.id)),
      reconciliationDate: alloc.reconciliationDate,
      reason: input.remarks ?? null,
      groupId,
    });
  }

  appendManualReconAudit({
    user: CURRENT_USER,
    bankAccountId,
    action: "Reconciliation saved",
    bookReference: `${uniqueBooks.size} book`,
    statementReference: `${uniqueStmts.size} statement`,
    previousValue: null,
    newValue: matchType,
    reconciliationDate: primaryDate,
    reason: input.groupRemark ?? input.remarks ?? null,
    groupId,
  });

  notifyRegisterUpdated();
  return { ok: true, groupId };
}

export function markBookClearedWithoutStatement(input: {
  bankAccountId: string;
  bookTargetId: string;
  reconciliationDate: string;
  clearingReference?: string;
  remarks?: string;
  reason: ManualClearingReason;
}): { ok: boolean; error?: string; groupId?: string } {
  const books = enrichBookRows(input.bankAccountId, loadAllBookTargetsForRecon(input.bankAccountId));
  const book = books.find((b) => b.id === input.bookTargetId);
  if (!book) return { ok: false, error: "Book entry not found." };
  if (book.availableAmount <= 0.009) return { ok: false, error: "Book entry is already fully reconciled." };

  return saveManualReconciliation({
    bankAccountId: input.bankAccountId,
    allocations: [
      {
        bookTargetId: input.bookTargetId,
        statementTransactionId: null,
        appliedAmount: book.availableAmount,
        reconciliationDate: input.reconciliationDate,
        remarks: [input.clearingReference, input.remarks, input.reason].filter(Boolean).join(" · "),
      },
    ],
    remarks: `Manual Clearing — ${input.reason}`,
    groupRemark: input.reason,
  });
}

export function applyBulkReconciliationDate(input: {
  bankAccountId: string;
  bookTargetIds: string[];
  reconciliationDate: string;
  remarks?: string;
}): { ok: boolean; error?: string; count?: number } {
  let count = 0;
  for (const bookTargetId of input.bookTargetIds) {
    const result = markBookClearedWithoutStatement({
      bankAccountId: input.bankAccountId,
      bookTargetId,
      reconciliationDate: input.reconciliationDate,
      remarks: input.remarks,
      reason: "Manual Confirmation",
    });
    if (result.ok) count += 1;
  }
  if (count === 0) return { ok: false, error: "No entries were updated." };
  appendManualReconAudit({
    user: CURRENT_USER,
    bankAccountId: input.bankAccountId,
    action: "Bulk reconciliation date applied",
    bookReference: `${count} entries`,
    statementReference: null,
    previousValue: null,
    newValue: input.reconciliationDate,
    reconciliationDate: input.reconciliationDate,
    reason: input.remarks ?? null,
    groupId: null,
  });
  return { ok: true, count };
}

export function undoManualReconciliation(input: {
  groupId: string;
  reason: string;
}): { ok: boolean; error?: string } {
  const group = getGroupById(input.groupId);
  if (!group || !group.active) return { ok: false, error: "Reconciliation group not found or already undone." };

  const lock = isPeriodLocked(group.bankAccountId, group.reconciliationDate);
  if (lock.locked) {
    return {
      ok: false,
      error: `Cannot undo — period is locked (${lock.reconciliationNumber ?? "completed reconciliation"}).`,
    };
  }

  const allocs = getAllocationsForGroup(input.groupId).filter((a) => a.active);
  deactivateGroupAndAllocations(input.groupId);

  for (const alloc of allocs) {
    if (alloc.statementTransactionId) {
      const stmt = getBankReconTransactionById(alloc.statementTransactionId);
      if (stmt) {
        const newReconciled = getStatementReconciledAmount(group.bankAccountId, stmt.id);
        upsertBankReconTransaction({
          ...stmt,
          reconciliationDate: newReconciled > 0 ? stmt.reconciliationDate : null,
          reconciliationStatus: deriveReconStatus(stmtAmount(stmt), newReconciled),
          reconciledAmount: newReconciled,
          activity: [
            ...stmt.activity,
            activity("Reconciliation undone", input.reason, "amber"),
          ],
        });
      }
    }
  }

  appendManualReconAudit({
    user: CURRENT_USER,
    bankAccountId: group.bankAccountId,
    action: "Reconciliation undone",
    bookReference: group.matchType,
    statementReference: null,
    previousValue: "Reconciled",
    newValue: "Unreconciled",
    reconciliationDate: group.reconciliationDate,
    reason: input.reason,
    groupId: input.groupId,
  });

  notifyRegisterUpdated();
  return { ok: true };
}

export function buildDefaultAllocations(
  books: ManualReconBookRow[],
  statements: ManualReconStatementRow[],
  selectedBookIds: Set<string>,
  selectedStmtIds: Set<string>,
  commonReconciliationDate?: string,
): ManualReconAllocationInput[] {
  const selBooks = books.filter((b) => selectedBookIds.has(b.id));
  const selStmts = statements.filter((s) => selectedStmtIds.has(s.id));

  if (selStmts.length === 0) {
    return selBooks.map((b) => ({
      bookTargetId: b.id,
      statementTransactionId: null,
      appliedAmount: b.availableAmount,
      reconciliationDate: commonReconciliationDate ?? b.reconciliationDate ?? b.bookDate,
    }));
  }

  if (selBooks.length === 1 && selStmts.length >= 1) {
    const book = selBooks[0]!;
    let remaining = book.availableAmount;
    return selStmts.map((s) => {
      const applied = roundMoney(Math.min(remaining, s.availableAmount));
      remaining = roundMoney(remaining - applied);
      return {
        bookTargetId: book.id,
        statementTransactionId: s.id,
        appliedAmount: applied,
        reconciliationDate: commonReconciliationDate ?? (s.valueDate || s.statementDate),
      };
    }).filter((a) => a.appliedAmount > 0);
  }

  if (selBooks.length > 1 && selStmts.length === 1) {
    const stmt = selStmts[0]!;
    let remaining = stmt.availableAmount;
    return selBooks.map((b) => {
      const applied = roundMoney(Math.min(remaining, b.availableAmount));
      remaining = roundMoney(remaining - applied);
      return {
        bookTargetId: b.id,
        statementTransactionId: stmt.id,
        appliedAmount: applied,
        reconciliationDate: commonReconciliationDate ?? (stmt.valueDate || stmt.statementDate),
      };
    }).filter((a) => a.appliedAmount > 0);
  }

  if (selBooks.length === 1 && selStmts.length === 1) {
    const b = selBooks[0]!;
    const s = selStmts[0]!;
    const applied = roundMoney(Math.min(b.availableAmount, s.availableAmount));
    return [
      {
        bookTargetId: b.id,
        statementTransactionId: s.id,
        appliedAmount: applied,
        reconciliationDate: commonReconciliationDate ?? (s.valueDate || s.statementDate),
      },
    ];
  }

  if (selBooks.length > 1 && selStmts.length > 1) {
    const bookTotal = roundMoney(selBooks.reduce((s, b) => s + b.availableAmount, 0));
    const stmtTotal = roundMoney(selStmts.reduce((s, r) => s + r.availableAmount, 0));
    if (Math.abs(bookTotal - stmtTotal) < 0.01) {
      const sortedBooks = [...selBooks].sort((a, b) => a.availableAmount - b.availableAmount);
      const sortedStmts = [...selStmts].sort((a, b) => a.availableAmount - b.availableAmount);
      const out: ManualReconAllocationInput[] = [];
      let bi = 0;
      let si = 0;
      let bRem = sortedBooks[0]?.availableAmount ?? 0;
      let sRem = sortedStmts[0]?.availableAmount ?? 0;
      while (bi < sortedBooks.length && si < sortedStmts.length) {
        const applied = roundMoney(Math.min(bRem, sRem));
        if (applied > 0) {
          out.push({
            bookTargetId: sortedBooks[bi]!.id,
            statementTransactionId: sortedStmts[si]!.id,
            appliedAmount: applied,
        reconciliationDate:
          commonReconciliationDate ??
          (sortedStmts[si]!.valueDate || sortedStmts[si]!.statementDate),
          });
        }
        bRem = roundMoney(bRem - applied);
        sRem = roundMoney(sRem - applied);
        if (bRem <= 0.009) {
          bi += 1;
          bRem = sortedBooks[bi]?.availableAmount ?? 0;
        }
        if (sRem <= 0.009) {
          si += 1;
          sRem = sortedStmts[si]?.availableAmount ?? 0;
        }
      }
      return out;
    }
  }

  return [];
}

export { loadManualReconAudit, getGroupById, getAllocationsForGroup };
