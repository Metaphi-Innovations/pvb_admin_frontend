/**
 * Real-time duplicate validation for manual bank transactions.
 */

import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import type { DuplicateCheckResult } from "@/lib/accounts/bank-recon-manual-types";
import { normalizeReferenceForCompare } from "@/lib/accounts/bank-recon-manual-types";

const POSSIBLE_DUP_DAY_RANGE = 3;

function collectReferenceKeys(record: BankReconTransactionRecord): string[] {
  const keys: string[] = [];
  for (const raw of [record.reference, record.utrNumber, record.chequeNo, record.transactionIdRef]) {
    if (raw?.trim()) keys.push(normalizeReferenceForCompare(raw));
  }
  return keys.filter(Boolean);
}

function formReferenceKeys(input: {
  referenceNumber: string;
  utrNumber: string;
  transactionIdRef: string;
  chequeNumber: string;
}): string[] {
  const keys: string[] = [];
  for (const raw of [input.referenceNumber, input.utrNumber, input.transactionIdRef, input.chequeNumber]) {
    if (raw.trim()) keys.push(normalizeReferenceForCompare(raw));
  }
  return keys;
}

function directionOf(record: BankReconTransactionRecord): "deposit" | "withdrawal" {
  return record.deposit > 0 ? "deposit" : "withdrawal";
}

function isActiveRecord(t: BankReconTransactionRecord): boolean {
  return t.manualEntryStatus !== "Cancelled" && t.manualEntryStatus !== "Draft";
}

function isComparableSource(t: BankReconTransactionRecord): boolean {
  return (
    t.source === "Manual" ||
    t.source === "Manual + Statement" ||
    t.source === "Statement Upload"
  );
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 999;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 999;
  return Math.abs(da - db) / 86400000;
}

function summarizeExisting(t: BankReconTransactionRecord): string {
  const amt = t.deposit || t.withdrawal;
  const dir = t.deposit > 0 ? "Deposit" : "Withdrawal";
  const ref = t.reference || t.utrNumber || t.chequeNo || "No reference";
  const num = t.manualTransactionNumber ?? t.id;
  return `${num} · ${ref} · ${dir} ₹${amt.toLocaleString("en-IN")} · ${t.bookDate ?? t.statementDate}`;
}

export function checkManualDuplicate(input: {
  bankAccountId: string;
  direction: "Deposit" | "Withdrawal";
  amount: number;
  referenceNumber: string;
  utrNumber: string;
  transactionIdRef: string;
  chequeNumber: string;
  bookDate: string;
  transactionDate: string;
  narration: string;
  excludeTransactionId?: string;
  existing: BankReconTransactionRecord[];
}): DuplicateCheckResult {
  const deposit = input.direction === "Deposit" ? input.amount : 0;
  const withdrawal = input.direction === "Withdrawal" ? input.amount : 0;
  const dir = input.direction === "Deposit" ? "deposit" : "withdrawal";
  const formKeys = formReferenceKeys(input);

  const candidates = input.existing.filter(
    (t) =>
      t.bankAccountId === input.bankAccountId &&
      t.id !== input.excludeTransactionId &&
      isComparableSource(t) &&
      (t.manualEntryStatus !== "Cancelled"),
  );

  if (formKeys.length > 0) {
    for (const t of candidates) {
      const tAmount = t.deposit || t.withdrawal;
      const tDir = directionOf(t);
      if (tAmount !== input.amount || tDir !== dir) continue;

      const tKeys = collectReferenceKeys(t);
      const match = formKeys.some((fk) => tKeys.some((tk) => fk === tk && fk.length > 0));
      if (match) {
        return { type: "exact", existingId: t.id, summary: summarizeExisting(t) };
      }
    }
  }

  const compareDate = input.bookDate || input.transactionDate;
  for (const t of candidates) {
    if (t.manualEntryStatus === "Draft") continue;
    const tAmount = t.deposit || t.withdrawal;
    const tDir = directionOf(t);
    if (tAmount !== input.amount || tDir !== dir) continue;

    const tDate = t.bookDate ?? t.transactionDate ?? t.statementDate;
    if (daysBetween(compareDate, tDate) > POSSIBLE_DUP_DAY_RANGE) continue;

    const tKeys = collectReferenceKeys(t);
    const hasRefOverlap = formKeys.length > 0 && tKeys.length > 0 && formKeys.some((fk) => tKeys.includes(fk));
    if (hasRefOverlap) continue;

    const narrSimilar =
      input.narration.trim() &&
      t.narration.trim() &&
      normalizeNarration(input.narration) === normalizeNarration(t.narration);

    if (formKeys.length === 0 || tKeys.length === 0 || narrSimilar) {
      return {
        type: "possible",
        existingId: t.id,
        summary: summarizeExisting(t),
        reason: formKeys.length === 0
          ? "Same amount and direction without bank reference"
          : "Same amount, close date, different reference",
      };
    }
  }

  return { type: "none" };
}

export function normalizeNarration(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
