/**
 * Auto-match accept, reject, undo, bulk operations — Step 4.
 */

import type { BankReconActivityEvent } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  getBankReconTransactionById,
  linkManualWithStatement,
  loadBankReconTransactions,
  notifyRegisterUpdated,
  upsertBankReconTransaction,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";
import {
  runAutoMatchEngine,
  searchBookTargets,
  summarizeRun,
} from "@/lib/accounts/bank-recon-match-engine";
import {
  appendMatchAudit,
  createAuditId,
  createMatchLinkId,
  addRejectedSuggestion,
  getMatchLinkForBookTarget,
  getMatchLinkForStatement,
  isRejectedPair,
  loadMatchConfig,
  loadMatchLinks,
  loadMatchRun,
  loadMatchAudit,
  saveMatchRun,
  upsertMatchLink,
  type RejectedSuggestion,
} from "@/lib/accounts/bank-recon-match-store";
import type {
  AutoMatchRunResult,
  BankReconMatchConfig,
  BankReconMatchLink,
  MatchCandidateResult,
  MatchMethod,
  MatchRejectReason,
} from "@/lib/accounts/bank-recon-match-types";

const CURRENT_USER = ACCOUNTS_CURRENT_USER;

function nowDisplay(): string {
  return new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function activity(
  label: string,
  detail: string,
  actor = CURRENT_USER,
  tone: BankReconActivityEvent["tone"] = "blue",
): BankReconActivityEvent {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    detail,
    actor,
    timestamp: nowDisplay(),
    tone,
  };
}

function audit(
  action: string,
  bankAccountId: string,
  statementTransactionId: string | null,
  bookTransactionId: string | null,
  matchScore: number | null,
  previousStatus: string | null,
  newStatus: string | null,
  reason: string | null,
  user = CURRENT_USER,
): void {
  appendMatchAudit({
    id: createAuditId(),
    timestamp: new Date().toISOString(),
    user,
    bankAccountId,
    statementTransactionId,
    bookTransactionId,
    action,
    matchScore,
    previousStatus,
    newStatus,
    reason,
  });
}

export function getUsedBookTargetIds(bankAccountId: string): Set<string> {
  const ids = new Set<string>();
  for (const link of loadMatchLinks(bankAccountId)) {
    ids.add(link.bookTargetId);
  }
  return ids;
}

export function runAutoMatch(input: {
  bankAccountId: string;
  transactionIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  user?: string;
}): AutoMatchRunResult {
  const config = loadMatchConfig(input.bankAccountId);
  const usedBooks = getUsedBookTargetIds(input.bankAccountId);
  const matchedStmtIds = new Set(
    loadMatchLinks(input.bankAccountId).map((l) => l.statementTransactionId),
  );

  audit(
    "Auto match run started",
    input.bankAccountId,
    null,
    null,
    null,
    null,
    null,
    input.transactionIds?.length ? `${input.transactionIds.length} selected` : "All pending",
    input.user,
  );

  const result = runAutoMatchEngine({
    bankAccountId: input.bankAccountId,
    transactionIds: input.transactionIds,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    config,
    excludeBookTargetIds: usedBooks,
    excludeStatementIds: matchedStmtIds,
  });

  for (const group of result.groups) {
    group.candidates = group.candidates.filter(
      (c) => !isRejectedPair(input.bankAccountId, group.statementTransactionId, c.bookTarget.id),
    );
    if (group.candidates.length === 0 && group.category !== "no_match") {
      group.category = "no_match";
    }
    audit(
      "Match candidate generated",
      input.bankAccountId,
      group.statementTransactionId,
      group.candidates[0]?.bookTarget.id ?? null,
      group.candidates[0]?.confidence ?? null,
      group.statement.matchStatus,
      group.category,
      group.candidates[0]?.reasons.join("; ") ?? "No match",
      input.user,
    );
  }

  if (config.autoAcceptExactMatches) {
    for (const group of result.groups) {
      if (group.category !== "exact" || group.candidates.length !== 1) continue;
      const accept = acceptMatch({
        bankAccountId: input.bankAccountId,
        statementTransactionId: group.statementTransactionId,
        candidate: group.candidates[0]!,
        matchMethod: "Auto Accepted",
        user: input.user ?? "System",
        skipRunUpdate: true,
      });
      if (accept.ok) {
        group.category = "accepted";
        audit(
          "Match auto accepted",
          input.bankAccountId,
          group.statementTransactionId,
          group.candidates[0]!.bookTarget.id,
          group.candidates[0]!.confidence,
          "Pending",
          "Matched",
          group.candidates[0]!.reasons.join("; "),
          "System",
        );
      }
    }
    result.summary = summarizeRun(result.groups);
    const links = loadMatchLinks(input.bankAccountId);
    result.summary.accepted = links.length;
  }

  saveMatchRun(result);
  audit(
    "Auto match run completed",
    input.bankAccountId,
    null,
    null,
    null,
    null,
    null,
    `Scanned ${result.summary.scanned}, exact ${result.summary.exact}, suggested ${result.summary.suggested}`,
    input.user,
  );

  notifyRegisterUpdated();
  return result;
}

export interface AcceptMatchInput {
  bankAccountId: string;
  statementTransactionId: string;
  candidate: MatchCandidateResult;
  matchMethod?: MatchMethod;
  user?: string;
  skipRunUpdate?: boolean;
}

export interface MatchActionResult {
  ok: boolean;
  error?: string;
  link?: BankReconMatchLink;
}

export function acceptMatch(input: AcceptMatchInput): MatchActionResult {
  const stmt = getBankReconTransactionById(input.statementTransactionId);
  if (!stmt) return { ok: false, error: "Statement transaction not found" };
  if (stmt.bankAccountId !== input.bankAccountId) return { ok: false, error: "Bank account mismatch" };
  if (stmt.matchStatus === "Matched") {
    return { ok: false, error: "Statement transaction is already matched" };
  }

  const existingStmtLink = getMatchLinkForStatement(input.statementTransactionId);
  if (existingStmtLink?.active) {
    return { ok: false, error: "Statement transaction already has an active match" };
  }

  const book = input.candidate.bookTarget;
  const existingBookLink = getMatchLinkForBookTarget(book.id);
  if (existingBookLink?.active) {
    return { ok: false, error: "Book transaction is already matched to another statement line" };
  }

  const sAmt = stmt.deposit || stmt.withdrawal;
  const bAmt = book.deposit || book.withdrawal;
  const sDir = stmt.deposit > 0 ? "deposit" : "withdrawal";
  const bDir = book.deposit > 0 ? "deposit" : "withdrawal";
  if (sDir !== bDir || Math.abs(sAmt - bAmt) > 0.01) {
    return { ok: false, error: "Amount or direction mismatch" };
  }

  const user = input.user ?? CURRENT_USER;
  const matchMethod = input.matchMethod ?? "Suggested Accepted";
  const prevStatus = stmt.matchStatus;

  let updated: BankReconTransactionRecord;

  if (book.kind === "manual" && book.manualRecord) {
    updated = linkManualWithStatement(
      book.manualRecord,
      {
        statementDate: stmt.statementDate,
        valueDate: stmt.valueDate,
        reference: stmt.reference || book.manualRecord.reference,
        utrNumber: stmt.utrNumber ?? book.manualRecord.utrNumber,
        chequeNo: stmt.chequeNo ?? book.manualRecord.chequeNo,
        importedNarration: stmt.narration,
        runningBalance: stmt.runningBalance,
        importedFileName: stmt.importedFileName,
        importBatchId: stmt.importBatchId,
        importedBy: stmt.importedBy,
        originalRowNumber: stmt.originalRowNumber,
        originalRawData: stmt.originalRawData,
      },
      stmt.importBatchId ?? "match-link",
      user,
    );
    updated = {
      ...updated,
      matchStatus: "Matched",
      relatedRecord: {
        voucherType: book.voucherType,
        voucherNumber: book.voucherNo,
        customer: book.partyLedger,
        invoiceReference: book.manualRecord.invoiceReference ?? "",
        matchConfidence: `${input.candidate.confidence}%`,
        bookRowKey: book.bookRowKey ?? undefined,
        matchMethod,
        matchedBy: user,
        matchedOn: new Date().toISOString(),
        bookDate: book.bookDate,
        partyLedger: book.partyLedger,
        reference: book.reference,
        manualTransactionId: book.manualTransactionId ?? undefined,
      },
      activity: [
        ...updated.activity,
        activity(
          "Match accepted",
          `${matchMethod} — ${input.candidate.reasons.join("; ")}`,
          user,
          "emerald",
        ),
        activity("Manual entry linked with statement", "Book date preserved", user, "emerald"),
      ],
    };
    upsertBankReconTransaction(updated);

    if (stmt.id !== book.manualRecord.id) {
      const orphan = { ...stmt, manualEntryStatus: "Cancelled" as const, cancelReason: "Merged into manual master record" };
      upsertBankReconTransaction(orphan);
    }
  } else {
    updated = {
      ...stmt,
      bookDate: stmt.bookDate ?? book.bookDate,
      matchStatus: "Matched",
      relatedRecord: {
        voucherType: book.voucherType,
        voucherNumber: book.voucherNo,
        customer: book.partyLedger,
        invoiceReference: "",
        matchConfidence: `${input.candidate.confidence}%`,
        bookRowKey: book.bookRowKey ?? undefined,
        matchMethod,
        matchedBy: user,
        matchedOn: new Date().toISOString(),
        bookDate: book.bookDate,
        partyLedger: book.partyLedger,
        reference: book.reference,
      },
      activity: [
        ...stmt.activity,
        activity(
          "Match accepted",
          `${matchMethod} — linked to ${book.voucherNo}: ${input.candidate.reasons.join("; ")}`,
          user,
          "emerald",
        ),
      ],
    };
    upsertBankReconTransaction(updated);
  }

  const link: BankReconMatchLink = {
    id: createMatchLinkId(),
    bankAccountId: input.bankAccountId,
    statementTransactionId: updated.id,
    bookTargetId: book.id,
    bookRowKey: book.bookRowKey,
    voucherId: book.voucherId,
    voucherLineId: book.voucherLineId,
    manualTransactionId: book.manualTransactionId,
    matchType: input.candidate.category === "exact" ? "exact" : "suggested",
    matchMethod,
    confidence: input.candidate.confidence,
    reasons: input.candidate.reasons,
    matchedBy: user,
    matchedOn: new Date().toISOString(),
    active: true,
  };
  upsertMatchLink(link);

  audit(
    "Match accepted",
    input.bankAccountId,
    updated.id,
    book.id,
    input.candidate.confidence,
    prevStatus,
    "Matched",
    input.candidate.reasons.join("; "),
    user,
  );

  if (!input.skipRunUpdate) {
    const run = loadMatchRun(input.bankAccountId);
    if (run) {
      const group = run.groups.find((g) => g.statementTransactionId === input.statementTransactionId);
      if (group) group.category = "accepted";
      run.summary = summarizeRun(run.groups);
      run.summary.accepted = loadMatchLinks(input.bankAccountId).length;
      saveMatchRun(run);
    }
  }

  notifyRegisterUpdated();
  return { ok: true, link };
}

export function rejectMatch(input: {
  bankAccountId: string;
  statementTransactionId: string;
  bookTargetId: string;
  reason: MatchRejectReason | string;
  user?: string;
}): MatchActionResult {
  const user = input.user ?? CURRENT_USER;
  const stmt = getBankReconTransactionById(input.statementTransactionId);
  if (!stmt) return { ok: false, error: "Transaction not found" };

  const rejected: RejectedSuggestion = {
    statementTransactionId: input.statementTransactionId,
    bookTargetId: input.bookTargetId,
    reason: input.reason,
    rejectedOn: new Date().toISOString(),
    rejectedBy: user,
  };
  addRejectedSuggestion(input.bankAccountId, rejected);

  const updated: BankReconTransactionRecord = {
    ...stmt,
    matchStatus: stmt.matchStatus === "Suggested Match" ? "Pending" : stmt.matchStatus,
    activity: [
      ...stmt.activity,
      activity("Match rejected", `${input.reason}`, user, "amber"),
    ],
  };
  upsertBankReconTransaction(updated);

  const run = loadMatchRun(input.bankAccountId);
  if (run) {
    const group = run.groups.find((g) => g.statementTransactionId === input.statementTransactionId);
    if (group) {
      group.rejectedCandidateIds.push(input.bookTargetId);
      group.candidates = group.candidates.filter((c) => c.bookTarget.id !== input.bookTargetId);
      if (group.candidates.length === 0) group.category = "rejected";
    }
    saveMatchRun(run);
  }

  audit(
    "Match rejected",
    input.bankAccountId,
    input.statementTransactionId,
    input.bookTargetId,
    null,
    stmt.matchStatus,
    "Pending",
    input.reason,
    user,
  );

  notifyRegisterUpdated();
  return { ok: true };
}

export function undoMatch(input: {
  bankAccountId: string;
  statementTransactionId: string;
  reason: string;
  user?: string;
}): MatchActionResult {
  const user = input.user ?? CURRENT_USER;
  const link = getMatchLinkForStatement(input.statementTransactionId);
  if (!link?.active) return { ok: false, error: "No active match found" };

  const stmt = getBankReconTransactionById(input.statementTransactionId);
  if (!stmt) return { ok: false, error: "Transaction not found" };

  const updated: BankReconTransactionRecord = {
    ...stmt,
    matchStatus: "Pending",
    relatedRecord: null,
    activity: [
      ...stmt.activity,
      activity("Match undone", input.reason, user, "slate"),
    ],
  };
  upsertBankReconTransaction(updated);

  upsertMatchLink({ ...link, active: false });

  audit(
    "Match undone",
    input.bankAccountId,
    input.statementTransactionId,
    link.bookTargetId,
    link.confidence,
    "Matched",
    "Pending",
    input.reason,
    user,
  );

  notifyRegisterUpdated();
  return { ok: true };
}

export function bulkAcceptExactMatches(input: {
  bankAccountId: string;
  statementTransactionIds: string[];
  user?: string;
}): { accepted: number; failed: number; errors: string[] } {
  const run = loadMatchRun(input.bankAccountId);
  if (!run) return { accepted: 0, failed: input.statementTransactionIds.length, errors: ["No match run found"] };

  let accepted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of input.statementTransactionIds) {
    const group = run.groups.find((g) => g.statementTransactionId === id);
    if (!group || group.category !== "exact" || group.candidates.length !== 1) {
      failed += 1;
      errors.push(`${id}: not an exact match`);
      continue;
    }
    const result = acceptMatch({
      bankAccountId: input.bankAccountId,
      statementTransactionId: id,
      candidate: group.candidates[0]!,
      matchMethod: "Auto Accepted",
      user: input.user,
    });
    if (result.ok) accepted += 1;
    else {
      failed += 1;
      errors.push(`${id}: ${result.error}`);
    }
  }

  return { accepted, failed, errors };
}

export function updateStatementMatchStatusFromRun(bankAccountId: string): void {
  const run = loadMatchRun(bankAccountId);
  if (!run) return;

  for (const group of run.groups) {
    if (group.category === "accepted") continue;
    const stmt = getBankReconTransactionById(group.statementTransactionId);
    if (!stmt || stmt.matchStatus === "Matched") continue;

    let status = stmt.matchStatus;
    if (group.category === "exact" || group.category === "suggested") {
      status = "Suggested Match";
    } else if (group.category === "multiple") {
      status = "Suggested Match";
    } else if (group.category === "no_match") {
      status = stmt.source === "Statement Upload" ? "Uncategorized" : status;
    }

    if (status !== stmt.matchStatus) {
      upsertBankReconTransaction({
        ...stmt,
        matchStatus: status,
        relatedRecord:
          group.candidates[0] && status === "Suggested Match"
            ? {
                voucherType: group.candidates[0].bookTarget.voucherType,
                voucherNumber: group.candidates[0].bookTarget.voucherNo,
                customer: group.candidates[0].bookTarget.partyLedger,
                invoiceReference: "",
                matchConfidence: `${group.candidates[0].confidence}%`,
              }
            : stmt.relatedRecord,
        activity: [
          ...stmt.activity,
          activity(
            group.category === "exact" ? "Exact match identified" : "Suggested match identified",
            group.candidates[0]?.reasons.join("; ") ?? "No candidates",
            "System",
            group.category === "exact" ? "emerald" : "amber",
          ),
        ],
      });
    }
  }
  notifyRegisterUpdated();
}

export function findAlternativeMatches(input: {
  bankAccountId: string;
  statementTransactionId: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  voucherType?: string;
}): MatchCandidateResult[] {
  const stmt = getBankReconTransactionById(input.statementTransactionId);
  if (!stmt) return [];
  const config = loadMatchConfig(input.bankAccountId);
  const used = getUsedBookTargetIds(input.bankAccountId);
  return searchBookTargets({
    bankAccountId: input.bankAccountId,
    statement: stmt,
    config,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    voucherType: input.voucherType,
  }).filter((c) => !used.has(c.bookTarget.id));
}

export { loadMatchRun, loadMatchConfig, loadMatchLinks, loadMatchAudit };
