/**
 * Auto-matching suggestions for Tally-style bank reconciliation.
 * Suggestions only — never finalizes reconciliation.
 */

import { normalizeReferenceForCompare } from "@/lib/accounts/bank-recon-manual-types";
import {
  amountOf,
  directionOf,
  type RawBookTransaction,
} from "@/lib/accounts/bank-recon-book-source";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import type {
  BankReconMatchConfidence,
  BankReconSuggestion,
} from "@/lib/accounts/bank-recon-tally-types";
import { narrationSimilarity } from "@/lib/accounts/bank-recon-match-engine";

function stmtAmount(s: BankReconTransactionRecord): number {
  return s.deposit || s.withdrawal;
}

function stmtDirection(s: BankReconTransactionRecord): "deposit" | "withdrawal" {
  return s.deposit > 0 ? "deposit" : "withdrawal";
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.round(Math.abs(da - db) / 86400000);
}

function collectRefs(...parts: Array<string | null | undefined>): string[] {
  return parts
    .map((p) => (p ? normalizeReferenceForCompare(p) : ""))
    .filter((r) => r.length > 0);
}

function scorePair(
  book: RawBookTransaction,
  stmt: BankReconTransactionRecord,
): { score: number; reasons: string[]; amountMatch: boolean; directionMatch: boolean } {
  const reasons: string[] = [];
  let score = 0;

  const directionMatch = directionOf(book) === stmtDirection(stmt);
  const amountMatch = Math.abs(amountOf(book) - stmtAmount(stmt)) < 0.01;

  if (!directionMatch) {
    return { score: 0, reasons: ["Direction differs"], amountMatch, directionMatch };
  }

  if (amountMatch) {
    score += 40;
    reasons.push("Exact amount");
  } else {
    reasons.push("Amount differs");
  }

  const bookRefs = collectRefs(book.instrumentNumber, book.voucherNumber);
  const stmtRefs = collectRefs(stmt.reference, stmt.utrNumber, stmt.chequeNo, stmt.instrumentNumber);
  const exactRef = bookRefs.some((br) => stmtRefs.some((sr) => sr === br));
  if (exactRef) {
    score += 35;
    reasons.push("Exact UTR / Cheque / Instrument");
  } else if (bookRefs.length && stmtRefs.length) {
    const partial = bookRefs.some((br) =>
      stmtRefs.some((sr) => (sr.includes(br) || br.includes(sr)) && br.length > 3),
    );
    if (partial) {
      score += 15;
      reasons.push("Partial reference");
    }
  }

  const dateDiff = daysBetween(book.voucherDate, stmt.statementDate);
  if (dateDiff !== null) {
    if (dateDiff === 0) {
      score += 15;
      reasons.push("Same date");
    } else if (dateDiff <= 3) {
      score += 10;
      reasons.push(`Nearby date (${dateDiff}d)`);
    } else if (dateDiff <= 7) {
      score += 5;
      reasons.push(`Date within ${dateDiff}d`);
    }
  }

  const sim = narrationSimilarity(book.particulars, stmt.narration);
  if (sim >= 0.75) {
    score += 10;
    reasons.push("Narration similarity");
  } else if (sim >= 0.45) {
    score += 5;
    reasons.push("Partial narration match");
  }

  if (book.voucherNumber && stmt.narration.toUpperCase().includes(book.voucherNumber.toUpperCase())) {
    score += 8;
    reasons.push("Voucher reference in narration");
  }

  return { score, reasons, amountMatch, directionMatch };
}

function confidenceFrom(score: number, amountMatch: boolean): BankReconMatchConfidence {
  if (!amountMatch) return "No Match";
  if (score >= 70) return "High Confidence";
  if (score >= 45) return "Possible Match";
  return "No Match";
}

export function generateTallySuggestions(
  books: RawBookTransaction[],
  statements: BankReconTransactionRecord[],
  reconciledBookIds: Set<string>,
  reconciledStatementIds: Set<string>,
): BankReconSuggestion[] {
  const openBooks = books.filter((b) => !reconciledBookIds.has(b.id));
  const openStmts = statements.filter(
    (s) =>
      !reconciledStatementIds.has(s.id) &&
      s.manualEntryStatus !== "Cancelled" &&
      s.manualEntryStatus !== "Draft" &&
      (s.source === "Statement Upload" ||
        s.source === "Bank Feed" ||
        s.source === "Manual + Statement"),
  );

  const suggestions: BankReconSuggestion[] = [];

  for (const book of openBooks) {
    const candidates: BankReconSuggestion[] = [];
    for (const stmt of openStmts) {
      const { score, reasons, amountMatch, directionMatch } = scorePair(book, stmt);
      if (!directionMatch || score < 40) continue;
      const confidence = confidenceFrom(score, amountMatch);
      if (confidence === "No Match" && amountMatch) continue;
      if (!amountMatch) {
        // Still surface as suggestion for amount-mismatch UI pairing
        candidates.push({
          bookTransactionId: book.id,
          bankStatementTransactionId: stmt.id,
          confidence: "No Match",
          score,
          reasons,
        });
        continue;
      }
      candidates.push({
        bookTransactionId: book.id,
        bankStatementTransactionId: stmt.id,
        confidence,
        score,
        reasons,
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 5);
    if (top.length > 1 && top[0]!.score - top[1]!.score < 8) {
      for (const c of top) {
        suggestions.push({ ...c, confidence: "Multiple Matches" });
      }
    } else {
      suggestions.push(...top);
    }
  }

  return suggestions;
}

export function suggestionsForBook(
  suggestions: BankReconSuggestion[],
  bookTransactionId: string,
): BankReconSuggestion[] {
  return suggestions
    .filter((s) => s.bookTransactionId === bookTransactionId)
    .sort((a, b) => b.score - a.score);
}

export function suggestionsForStatement(
  suggestions: BankReconSuggestion[],
  statementId: string,
): BankReconSuggestion[] {
  return suggestions
    .filter((s) => s.bankStatementTransactionId === statementId)
    .sort((a, b) => b.score - a.score);
}
