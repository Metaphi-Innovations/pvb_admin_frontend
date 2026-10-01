/**
 * Auto-match scoring engine — Step 4.
 */

import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { normalizeReferenceForCompare } from "@/lib/accounts/bank-recon-manual-types";
import { resolveCoaLedgerForV2BankAccount } from "@/lib/accounts/bank-recon-account-bridge";
import {
  buildBookEntries,
  type BookEntryRow,
} from "@/lib/accounts/banking-book-utils";
import { seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import { loadBankReconTransactions } from "@/lib/accounts/bank-recon-register";
import type {
  AutoMatchRunResult,
  AutoMatchRunSummary,
  BankReconMatchConfig,
  MatchBookTarget,
  MatchCandidateResult,
  MatchCategory,
  MatchScoreBreakdown,
  StatementMatchGroup,
} from "@/lib/accounts/bank-recon-match-types";
import { DEFAULT_MATCH_CONFIG } from "@/lib/accounts/bank-recon-match-types";

const BANK_PREFIXES = [
  "NEFT CR",
  "NEFT DR",
  "IMPS CR",
  "IMPS DR",
  "RTGS CR",
  "RTGS DR",
  "UPI/",
  "CHQ DEP",
  "CHQ PAID",
  "ATM WDL",
  "ECS/",
  "NACH/",
];

export function normalizeNarrationForMatch(text: string): string {
  let s = text.trim().toUpperCase();
  for (const p of BANK_PREFIXES) {
    if (s.startsWith(p)) s = s.slice(p.length).trim();
  }
  return s.replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function narrationSimilarity(a: string, b: string): number {
  const na = normalizeNarrationForMatch(a);
  const nb = normalizeNarrationForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const tokenize = (s: string) =>
    s.split(/\s+/).filter((t) => t.length > 2);
  const ta = new Set(tokenize(na));
  const tb = new Set(tokenize(nb));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / Math.max(ta.size, tb.size);
}

function stmtDirection(stmt: BankReconTransactionRecord): "deposit" | "withdrawal" {
  return stmt.deposit > 0 ? "deposit" : "withdrawal";
}

function targetDirection(t: MatchBookTarget): "deposit" | "withdrawal" {
  return t.deposit > 0 ? "deposit" : "withdrawal";
}

function stmtAmount(stmt: BankReconTransactionRecord): number {
  return stmt.deposit || stmt.withdrawal;
}

function targetAmount(t: MatchBookTarget): number {
  return t.deposit || t.withdrawal;
}

function collectStmtRefs(stmt: BankReconTransactionRecord): string[] {
  const refs: string[] = [];
  for (const raw of [stmt.reference, stmt.utrNumber, stmt.transactionIdRef, stmt.chequeNo]) {
    if (raw?.trim()) refs.push(normalizeReferenceForCompare(raw));
  }
  return refs.filter(Boolean);
}

function collectTargetRefs(t: MatchBookTarget): string[] {
  const refs: string[] = [];
  for (const raw of [t.reference, t.chequeNo]) {
    if (raw?.trim()) refs.push(normalizeReferenceForCompare(raw));
  }
  return refs.filter(Boolean);
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.round(Math.abs(da - db) / 86400000);
}

function dateToleranceFor(stmt: BankReconTransactionRecord, config: BankReconMatchConfig): number {
  const mode = stmt.transactionMode ?? "";
  if (mode === "Cheque") return config.chequeDateTolerance;
  if (mode === "Cash Deposit") return config.cashDepositDateTolerance;
  if (mode === "ECS" || mode === "NACH") return config.ecsNachDateTolerance;
  if (mode === "Bank Transfer") return config.bankTransferDateTolerance;
  return config.electronicDateTolerance;
}

function voucherReference(bookRow: BookEntryRow): string {
  const v = loadVouchers().find((x) => x.id === bookRow.voucherId);
  return v?.referenceNo?.trim() ?? "";
}

export function bookRowToTarget(row: BookEntryRow): MatchBookTarget {
  const ref = voucherReference(row);
  return {
    kind: "voucher_line",
    id: row.rowKey,
    bookRowKey: row.rowKey,
    voucherId: row.voucherId,
    voucherLineId: Number(row.rowKey.split("-").pop()) || null,
    voucherNo: row.voucherNo,
    voucherType: row.voucherTypeLabel,
    bookDate: row.date,
    partyLedger: row.particulars,
    reference: ref,
    chequeNo: ref.match(/^\d{4,}$/) ? ref : null,
    deposit: row.receipt,
    withdrawal: row.payment,
    narration: row.particulars,
    transactionMode: null,
    expectedVoucherType: row.voucherTypeLabel,
    manualTransactionId: null,
    row,
  };
}

export function manualRecordToTarget(record: BankReconTransactionRecord): MatchBookTarget {
  return {
    kind: "manual",
    id: `manual-${record.id}`,
    bookRowKey: null,
    voucherId: null,
    voucherLineId: null,
    voucherNo: record.manualTransactionNumber ?? record.id,
    voucherType: record.expectedVoucherType ?? "Manual Entry",
    bookDate: record.bookDate ?? record.transactionDate ?? "",
    partyLedger: record.partyLedger,
    reference: record.reference || record.utrNumber || "",
    chequeNo: record.chequeNo,
    deposit: record.deposit,
    withdrawal: record.withdrawal,
    narration: record.narration,
    transactionMode: record.transactionMode,
    expectedVoucherType: record.expectedVoucherType,
    manualTransactionId: record.id,
    manualRecord: record,
  };
}

export function loadMatchBookTargets(
  bankAccountId: string,
  dateFrom?: string,
  dateTo?: string,
): MatchBookTarget[] {
  seedBankingDemoData();
  const ledger = resolveCoaLedgerForV2BankAccount(bankAccountId);
  if (!ledger) return [];

  const bookRows = buildBookEntries([ledger], { dateFrom, dateTo });
  const targets: MatchBookTarget[] = bookRows.map(bookRowToTarget);

  const manuals = loadBankReconTransactions(bankAccountId).filter(
    (t) =>
      (t.source === "Manual" || t.source === "Manual + Statement") &&
      t.manualEntryStatus !== "Cancelled" &&
      t.manualEntryStatus !== "Draft" &&
      t.matchStatus !== "Matched",
  );

  for (const m of manuals) {
    if (dateFrom && (m.bookDate ?? "") < dateFrom) continue;
    if (dateTo && (m.bookDate ?? "") > dateTo) continue;
    targets.push(manualRecordToTarget(m));
  }

  return targets;
}

export function scoreStatementToBook(
  stmt: BankReconTransactionRecord,
  book: MatchBookTarget,
  config: BankReconMatchConfig = DEFAULT_MATCH_CONFIG,
): MatchCandidateResult | null {
  const sDir = stmtDirection(stmt);
  const bDir = targetDirection(book);
  if (sDir !== bDir) return null;

  const sAmt = stmtAmount(stmt);
  const bAmt = targetAmount(book);
  if (Math.abs(sAmt - bAmt) > 0.01) return null;

  const breakdown: MatchScoreBreakdown = {
    amount: 0,
    reference: 0,
    cheque: 0,
    date: 0,
    party: 0,
    narration: 0,
    mode: 0,
    voucherType: 0,
  };
  const reasons: string[] = [];
  const warnings: string[] = [];
  const mismatches: string[] = [];

  breakdown.amount = 35;
  reasons.push("Exact amount match");

  const stmtRefs = collectStmtRefs(stmt);
  const bookRefs = collectTargetRefs(book);
  let refMatched = false;
  let chequeMatched = false;

  if (stmt.chequeNo?.trim() && book.chequeNo?.trim()) {
    if (normalizeReferenceForCompare(stmt.chequeNo) === normalizeReferenceForCompare(book.chequeNo)) {
      breakdown.cheque = 30;
      chequeMatched = true;
      reasons.push("Cheque number matched");
    }
  }

  if (!chequeMatched && stmtRefs.length > 0 && bookRefs.length > 0) {
    const overlap = stmtRefs.some((sr) => bookRefs.some((br) => sr === br && sr.length > 0));
    if (overlap) {
      breakdown.reference = 30;
      refMatched = true;
      reasons.push("Reference / UTR matched");
    } else {
      const partial = stmtRefs.some((sr) =>
        bookRefs.some((br) => (sr.includes(br) || br.includes(sr)) && sr.length > 3 && br.length > 3),
      );
      if (partial) {
        breakdown.reference = 15;
        reasons.push("Reference partially matched");
        mismatches.push("Reference partially matched");
      } else {
        mismatches.push("Reference differs");
      }
    }
  } else if (stmtRefs.length === 0 || bookRefs.length === 0) {
    mismatches.push("Reference missing on one side");
  }

  const compareDates = [
    daysBetween(stmt.statementDate, book.bookDate),
    daysBetween(stmt.valueDate, book.bookDate),
    daysBetween(stmt.statementDate, stmt.expectedClearingDate),
    daysBetween(stmt.statementDate, stmt.depositedDate),
  ].filter((d): d is number => d !== null);

  const minDateDiff = compareDates.length ? Math.min(...compareDates) : null;
  const tol = dateToleranceFor(stmt, config);
  if (minDateDiff !== null) {
    if (minDateDiff <= tol) {
      breakdown.date = minDateDiff === 0 ? 10 : 7;
      reasons.push(
        minDateDiff === 0
          ? "Same date"
          : `Statement date is ${minDateDiff} day(s) from book date`,
      );
    } else {
      mismatches.push(`Date differs by ${minDateDiff} days`);
    }
  }

  if (config.partyNameDetectionEnabled) {
    const sp = stmt.partyLedger.trim().toLowerCase();
    const bp = book.partyLedger.trim().toLowerCase();
    if (sp && bp && sp !== "—" && (sp === bp || sp.includes(bp) || bp.includes(sp))) {
      breakdown.party = 10;
      reasons.push("Party / ledger matched");
    } else if (sp && sp !== "—") {
      const sim = narrationSimilarity(stmt.narration, book.partyLedger);
      if (sim >= 0.5) {
        breakdown.party = 6;
        reasons.push("Party name found in narration");
      }
    }
  }

  const narrSim = narrationSimilarity(stmt.narration, book.narration);
  if (narrSim >= config.narrationSimilarityThreshold) {
    breakdown.narration = Math.round(narrSim * 10);
    reasons.push(`Narration similarity ${Math.round(narrSim * 100)}%`);
  }

  if (stmt.transactionMode && book.transactionMode && stmt.transactionMode === book.transactionMode) {
    breakdown.mode = 5;
    reasons.push("Same transaction mode");
  }

  if (
    stmt.expectedVoucherType &&
    book.expectedVoucherType &&
    stmt.expectedVoucherType !== "Unknown" &&
    book.expectedVoucherType.includes(stmt.expectedVoucherType.split(" ")[0] ?? "")
  ) {
    breakdown.voucherType = 5;
    reasons.push("Same voucher type");
  }

  const confidence = Math.min(
    100,
    breakdown.amount +
      breakdown.reference +
      breakdown.cheque +
      breakdown.date +
      breakdown.party +
      breakdown.narration +
      breakdown.mode +
      breakdown.voucherType,
  );

  if (confidence < config.possibleMatchThreshold) return null;

  let category: MatchCategory = "no_match";
  if (confidence >= config.exactMatchThreshold && (refMatched || chequeMatched)) {
    category = "exact";
  } else if (confidence >= config.suggestedMatchThreshold) {
    category = "suggested";
  } else if (confidence >= config.possibleMatchThreshold) {
    category = "suggested";
    warnings.push("Possible match — review recommended");
  }

  if (!refMatched && !chequeMatched && confidence >= config.suggestedMatchThreshold) {
    warnings.push("No exact reference match — narration/party based suggestion");
  }

  return {
    id: `cand-${stmt.id}-${book.id}`,
    statementTransactionId: stmt.id,
    bookTarget: book,
    confidence,
    category,
    reasons,
    warnings,
    mismatches,
    dateDifferenceDays: minDateDiff,
    narrationSimilarity: narrSim,
    breakdown,
  };
}

function classifyGroup(
  candidates: MatchCandidateResult[],
  config: BankReconMatchConfig,
): MatchCategory {
  if (candidates.length === 0) return "no_match";
  const exact = candidates.filter((c) => c.category === "exact");
  if (exact.length === 1) return "exact";
  if (exact.length > 1) return "multiple";
  const top = candidates[0]?.confidence ?? 0;
  const second = candidates[1]?.confidence ?? 0;
  if (candidates.length > 1 && top - second <= config.multipleCandidateGap) return "multiple";
  if (top >= config.suggestedMatchThreshold) return "suggested";
  return "no_match";
}

function detectCombinedHint(
  stmt: BankReconTransactionRecord,
  books: MatchBookTarget[],
): StatementMatchGroup["combinedHint"] | undefined {
  const amt = stmtAmount(stmt);
  const dir = stmtDirection(stmt);
  const sameDir = books.filter((b) => targetDirection(b) === dir && Math.abs(targetAmount(b) - amt) > 0.01);
  if (sameDir.length < 2) return undefined;

  for (let i = 0; i < sameDir.length; i++) {
    for (let j = i + 1; j < sameDir.length; j++) {
      const sum = targetAmount(sameDir[i]!) + targetAmount(sameDir[j]!);
      if (Math.abs(sum - amt) < 0.01) {
        return {
          bookTargetIds: [sameDir[i]!.id, sameDir[j]!.id],
          totalAmount: sum,
          message: `Potential combined match: ${sameDir[i]!.voucherNo} + ${sameDir[j]!.voucherNo} = ₹${sum.toLocaleString("en-IN")}`,
        };
      }
    }
  }
  return undefined;
}

export function runAutoMatchEngine(input: {
  bankAccountId: string;
  transactionIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  config?: BankReconMatchConfig;
  excludeBookTargetIds?: Set<string>;
  excludeStatementIds?: Set<string>;
}): AutoMatchRunResult {
  const config = input.config ?? DEFAULT_MATCH_CONFIG;
  const runId = `run-${Date.now()}`;
  const startedOn = new Date().toISOString();

  let statements = loadBankReconTransactions(input.bankAccountId).filter(
    (t) =>
      t.manualEntryStatus !== "Cancelled" &&
      t.matchStatus !== "Matched" &&
      t.matchStatus !== "Excluded" &&
      (t.source === "Statement Upload" ||
        t.source === "Bank Feed" ||
        (t.source === "Manual + Statement" && !t.relatedRecord?.voucherNumber)),
  );

  if (input.transactionIds?.length) {
    const set = new Set(input.transactionIds);
    statements = statements.filter((t) => set.has(t.id));
  }
  if (input.dateFrom) statements = statements.filter((t) => (t.statementDate || t.bookDate || "") >= input.dateFrom!);
  if (input.dateTo) statements = statements.filter((t) => (t.statementDate || t.bookDate || "") <= input.dateTo!);
  if (input.excludeStatementIds) {
    statements = statements.filter((t) => !input.excludeStatementIds!.has(t.id));
  }

  const books = loadMatchBookTargets(input.bankAccountId, input.dateFrom, input.dateTo).filter(
    (b) => !input.excludeBookTargetIds?.has(b.id),
  );

  const groups: StatementMatchGroup[] = [];

  for (const stmt of statements) {
    const candidates: MatchCandidateResult[] = [];
    for (const book of books) {
      if (book.manualTransactionId === stmt.id) continue;
      const scored = scoreStatementToBook(stmt, book, config);
      if (scored) candidates.push(scored);
    }
    candidates.sort((a, b) => b.confidence - a.confidence);

    const category = classifyGroup(candidates, config);
    const topCandidates =
      category === "multiple" ? candidates.slice(0, 5) : candidates.slice(0, 1);

    if (category === "exact" && topCandidates[0]) topCandidates[0].category = "exact";
    if (category === "suggested" && topCandidates[0]) topCandidates[0].category = "suggested";
    if (category === "multiple") {
      for (const c of topCandidates) c.category = "multiple";
    }

    groups.push({
      statementTransactionId: stmt.id,
      statement: stmt,
      category,
      candidates: category === "no_match" ? [] : topCandidates,
      combinedHint: detectCombinedHint(stmt, books),
      rejectedCandidateIds: [],
    });
  }

  const summary = summarizeRun(groups);

  return {
    runId,
    bankAccountId: input.bankAccountId,
    startedOn,
    completedOn: new Date().toISOString(),
    summary,
    groups,
  };
}

export function summarizeRun(groups: StatementMatchGroup[]): AutoMatchRunSummary {
  let exact = 0;
  let suggested = 0;
  let multiple = 0;
  let noMatch = 0;
  let totalMatchedAmount = 0;
  let totalUnmatchedAmount = 0;
  let depositMatched = 0;
  let depositUnmatched = 0;
  let withdrawalMatched = 0;
  let withdrawalUnmatched = 0;

  for (const g of groups) {
    const amt = g.statement.deposit || g.statement.withdrawal;
    const isDeposit = g.statement.deposit > 0;
    if (g.category === "exact") {
      exact += 1;
      totalMatchedAmount += amt;
      if (isDeposit) depositMatched += amt;
      else withdrawalMatched += amt;
    } else if (g.category === "suggested") {
      suggested += 1;
      totalUnmatchedAmount += amt;
      if (isDeposit) depositUnmatched += amt;
      else withdrawalUnmatched += amt;
    } else if (g.category === "multiple") {
      multiple += 1;
      totalUnmatchedAmount += amt;
      if (isDeposit) depositUnmatched += amt;
      else withdrawalUnmatched += amt;
    } else {
      noMatch += 1;
      totalUnmatchedAmount += amt;
      if (isDeposit) depositUnmatched += amt;
      else withdrawalUnmatched += amt;
    }
  }

  return {
    scanned: groups.length,
    exact,
    suggested,
    multiple,
    noMatch,
    accepted: 0,
    rejected: 0,
    pendingReview: suggested + multiple,
    totalMatchedAmount,
    totalUnmatchedAmount,
    depositMatched,
    depositUnmatched,
    withdrawalMatched,
    withdrawalUnmatched,
  };
}

export function searchBookTargets(input: {
  bankAccountId: string;
  statement: BankReconTransactionRecord;
  config?: BankReconMatchConfig;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  voucherType?: string;
}): MatchCandidateResult[] {
  const config = input.config ?? DEFAULT_MATCH_CONFIG;
  const books = loadMatchBookTargets(input.bankAccountId, input.dateFrom, input.dateTo);
  const q = input.search?.trim().toLowerCase() ?? "";

  const results: MatchCandidateResult[] = [];
  for (const book of books) {
    if (input.voucherType && book.voucherType !== input.voucherType) continue;
    if (q) {
      const hay = `${book.voucherNo} ${book.partyLedger} ${book.reference} ${book.narration}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    const scored = scoreStatementToBook(input.statement, book, config);
    if (scored) results.push(scored);
    else if (!q && Math.abs(stmtAmount(input.statement) - targetAmount(book)) > 0.01) continue;
    else if (stmtDirection(input.statement) === targetDirection(book)) {
      results.push({
        id: `search-${input.statement.id}-${book.id}`,
        statementTransactionId: input.statement.id,
        bookTarget: book,
        confidence: 0,
        category: "no_match",
        reasons: ["Manual selection"],
        warnings: [],
        mismatches: ["Amount or reference may differ"],
        dateDifferenceDays: daysBetween(input.statement.statementDate, book.bookDate),
        narrationSimilarity: narrationSimilarity(input.statement.narration, book.narration),
        breakdown: {
          amount: 0,
          reference: 0,
          cheque: 0,
          date: 0,
          party: 0,
          narration: 0,
          mode: 0,
          voucherType: 0,
        },
      });
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}
