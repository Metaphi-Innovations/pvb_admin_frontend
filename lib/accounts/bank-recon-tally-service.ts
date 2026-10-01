/**
 * Tally-style Bank Reconciliation service.
 * Reconcile / Bank Date / undo update links only — never posts vouchers.
 */

import {
  BANK_RECON_DEMO_ACCOUNTS,
  maskAccountNumber,
  type BankReconBankAccount,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import {
  appendUndoAuditEntry,
  createTallyLinkId,
  findActiveLinkForBook,
  findActiveLinkForStatement,
  getTallyLinkById,
  loadTallyLinks,
  loadTallySuggestions,
  migrateReconDemoStorageIfNeeded,
  notifyTallyUpdated,
  removeTallyLink,
  replaceAccountSuggestions,
  saveTallyLinks,
  upsertTallyLink,
} from "@/lib/accounts/bank-recon-tally-store";
import { getBookBalanceInfo } from "@/lib/accounts/bank-recon-ledger-link";
import {
  ensureBankReconTallySeeded,
  resetBankReconciliationDemoData,
} from "@/lib/accounts/bank-recon-tally-demo-seed";
import { computeManualBrsSummary } from "@/lib/accounts/bank-recon-brs";
import {
  amountOf,
  directionOf,
  getBookBalanceForAccount,
  loadRawBookTransactions,
  type RawBookTransaction,
} from "@/lib/accounts/bank-recon-book-source";
import {
  generateTallySuggestions,
  suggestionsForBook,
  suggestionsForStatement,
} from "@/lib/accounts/bank-recon-tally-match";
import type {
  BankReconBankTransaction,
  BankReconBookTransaction,
  BankReconBrsSummary,
  BankReconExceptionRow,
  BankReconListingAccount,
  BankReconListingSummary,
  BankReconMatchConfidence,
  BankReconReconciledRow,
  BankReconSuggestion,
  BankReconTallyLink,
  BankReconTallyStatus,
  ReconcileBankDateBulkInput,
  ReconcileBankDateOnlyInput,
  ReconcileWithStatementInput,
  UndoReconciliationInput,
} from "@/lib/accounts/bank-recon-tally-types";
import { AMOUNT_MISMATCH_MESSAGE } from "@/lib/accounts/bank-recon-tally-types";
import {
  loadBankReconTransactions,
  loadImportBatches,
  notifyRegisterUpdated,
  saveBankReconTransactions,
  type BankReconTransactionRecord,
} from "@/lib/accounts/bank-recon-register";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  getManualDemoAccount,
  isManualDemoAccount,
} from "@/lib/accounts/bank-recon-manual-demo-overlay";

/** Demo actor shown on Bank Reconciliation links (frontend prototype only). */
const BANK_RECON_DEMO_USER = "Admin User";

function ensure(): void {
  if (typeof window === "undefined") return;
  migrateReconDemoStorageIfNeeded();
  ensureBankReconTallySeeded();
}

function nowIso(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function statementRows(bankAccountId: string): BankReconTransactionRecord[] {
  return loadBankReconTransactions(bankAccountId).filter(
    (t) =>
      t.manualEntryStatus !== "Cancelled" &&
      t.manualEntryStatus !== "Draft" &&
      (t.source === "Statement Upload" ||
        t.source === "Bank Feed" ||
        t.source === "Manual + Statement" ||
        String(t.id).startsWith("tally-stmt-")),
  );
}

function activeReconciledLinks(bankAccountId: string): BankReconTallyLink[] {
  return loadTallyLinks(bankAccountId).filter((l) => l.status === "RECONCILED");
}

function ignoredStatementIds(bankAccountId: string): Set<string> {
  return new Set(
    loadTallyLinks(bankAccountId)
      .filter((l) => l.status === "IGNORED" && l.bankStatementTransactionId)
      .map((l) => l.bankStatementTransactionId!),
  );
}

export function refreshTallySuggestions(bankAccountId: string): BankReconSuggestion[] {
  ensure();
  const books = loadRawBookTransactions(bankAccountId);
  const stmts = statementRows(bankAccountId);
  const reconBook = new Set(
    activeReconciledLinks(bankAccountId)
      .map((l) => l.bookTransactionId)
      .filter(Boolean) as string[],
  );
  const reconStmt = new Set(
    activeReconciledLinks(bankAccountId)
      .map((l) => l.bankStatementTransactionId)
      .filter(Boolean) as string[],
  );
  ignoredStatementIds(bankAccountId).forEach((id) => reconStmt.add(id));

  const suggestions = generateTallySuggestions(books, stmts, reconBook, reconStmt);
  replaceAccountSuggestions(
    bankAccountId,
    suggestions,
    new Set(books.map((b) => b.id)),
    new Set(stmts.map((s) => s.id)),
  );
  return suggestions;
}

function resolveBookStatus(
  book: RawBookTransaction,
  link: BankReconTallyLink | undefined,
  bookSuggestions: BankReconSuggestion[],
): BankReconTallyStatus {
  if (link?.status === "RECONCILED") return "RECONCILED";
  if (link?.status === "MARKED_FOR_REVIEW") return "MARKED_FOR_REVIEW";

  // Manual client workflow: books without a Bank Date are simply Unreconciled.
  if (isManualDemoAccount(book.bankAccountId) || statementRows(book.bankAccountId).length === 0) {
    return "UNRECONCILED";
  }

  const amountMismatch = bookSuggestions.some((s) => s.confidence === "No Match" && s.score >= 40);
  if (amountMismatch && bookSuggestions.some((s) => Math.abs(s.score) >= 40)) {
    const paired = bookSuggestions.find((s) => s.confidence === "No Match");
    if (paired) return "AMOUNT_MISMATCH";
  }

  const multi = bookSuggestions.filter((s) => s.confidence === "Multiple Matches");
  if (multi.length > 1) return "MULTIPLE_MATCHES";

  const highOrPossible = bookSuggestions.filter(
    (s) => s.confidence === "High Confidence" || s.confidence === "Possible Match",
  );
  if (highOrPossible.length > 1) return "MULTIPLE_MATCHES";
  if (highOrPossible.length === 1) return "SUGGESTED_MATCH";

  return "AVAILABLE_ONLY_IN_BOOKS";
}

function resolveStatementStatus(
  stmt: BankReconTransactionRecord,
  link: BankReconTallyLink | undefined,
  stmtSuggestions: BankReconSuggestion[],
): BankReconTallyStatus {
  if (link?.status === "RECONCILED") return "RECONCILED";
  if (link?.status === "IGNORED") return "IGNORED";
  if (link?.status === "MARKED_FOR_REVIEW") return "MARKED_FOR_REVIEW";

  const amountMismatch = stmtSuggestions.some((s) => s.confidence === "No Match");
  if (amountMismatch) return "AMOUNT_MISMATCH";

  const multi = stmtSuggestions.filter((s) => s.confidence === "Multiple Matches");
  if (multi.length > 1) return "MULTIPLE_MATCHES";

  const matchable = stmtSuggestions.filter(
    (s) => s.confidence === "High Confidence" || s.confidence === "Possible Match",
  );
  if (matchable.length > 1) return "MULTIPLE_MATCHES";
  if (matchable.length === 1) return "SUGGESTED_MATCH";
  return "AVAILABLE_ONLY_IN_BANK";
}

function bestConfidence(list: BankReconSuggestion[]): BankReconMatchConfidence | null {
  if (!list.length) return null;
  if (list.some((s) => s.confidence === "Multiple Matches")) return "Multiple Matches";
  if (list.some((s) => s.confidence === "High Confidence")) return "High Confidence";
  if (list.some((s) => s.confidence === "Possible Match")) return "Possible Match";
  if (list.some((s) => s.confidence === "No Match")) return "No Match";
  return null;
}

/** @deprecated Manual phase uses Expected Balance from BRS, not statement closing. */
export function getClosingStatementBalance(bankAccountId: string): number {
  ensure();
  return getBrsSummary(bankAccountId).expectedBalanceAsPerBank;
}

export function listBookTransactions(
  bankAccountId: string,
  dateFrom?: string,
  dateTo?: string,
): BankReconBookTransaction[] {
  ensure();
  const suggestions = loadTallySuggestions();
  const books = loadRawBookTransactions(bankAccountId, dateFrom, dateTo);
  return books.map((book) => {
    const link = findActiveLinkForBook(book.id);
    const bookSugs = suggestionsForBook(suggestions, book.id);
    const status = resolveBookStatus(book, link, bookSugs);
    return {
      id: book.id,
      bankAccountId,
      voucherId: book.voucherId,
      voucherDate: book.voucherDate,
      particulars: book.particulars,
      voucherType: book.voucherType,
      voucherTypeCode: book.voucherTypeCode,
      voucherNumber: book.voucherNumber,
      instrumentNumber: book.instrumentNumber,
      instrumentDate: book.instrumentDate,
      deposit: book.deposit,
      withdrawal: book.withdrawal,
      bankDate: link?.bankDate ?? null,
      status,
      linkId: link?.id ?? null,
      canEditVoucher: book.canEditVoucher,
      viewHref: book.viewHref,
      editHref: book.editHref,
      suggestedStatementIds: bookSugs.map((s) => s.bankStatementTransactionId),
      matchConfidence: bestConfidence(bookSugs),
      remarks: link?.remarks ?? null,
      reconciledBy: link?.reconciledBy ?? null,
      reconciledOn: link?.reconciledAt?.slice(0, 10) ?? null,
      ledgerName: book.ledgerName,
    };
  });
}

export function listBankTransactions(bankAccountId: string): BankReconBankTransaction[] {
  ensure();
  const suggestions = loadTallySuggestions();
  const books = loadRawBookTransactions(bankAccountId);
  const bookById = new Map(books.map((b) => [b.id, b]));

  return statementRows(bankAccountId).map((stmt) => {
    const link = findActiveLinkForStatement(stmt.id);
    const stmtSugs = suggestionsForStatement(suggestions, stmt.id);
    const status = resolveStatementStatus(stmt, link, stmtSugs);
    const top = stmtSugs[0];
    const suggestedBook = top ? bookById.get(top.bookTransactionId) : undefined;
    return {
      id: stmt.id,
      bankAccountId,
      bankDate: stmt.statementDate,
      valueDate: stmt.valueDate || null,
      narration: stmt.narration,
      reference: stmt.reference || stmt.utrNumber || stmt.chequeNo || "",
      deposit: stmt.deposit,
      withdrawal: stmt.withdrawal,
      statementBalance: stmt.runningBalance,
      matchStatus: status,
      suggestedVoucherLabel: suggestedBook
        ? `${suggestedBook.voucherType} ${suggestedBook.voucherNumber}`
        : null,
      suggestedBookTransactionIds: stmtSugs.map((s) => s.bookTransactionId),
      matchConfidence: bestConfidence(stmtSugs),
      importBatchId: stmt.importBatchId,
      linkId: link?.id ?? null,
      ignoreReason: link?.status === "IGNORED" ? link.reviewReason : null,
    };
  });
}

export function listReconciledRows(bankAccountId: string): BankReconReconciledRow[] {
  ensure();
  const books = loadRawBookTransactions(bankAccountId);
  const bookById = new Map(books.map((b) => [b.id, b]));
  const stmts = statementRows(bankAccountId);
  const stmtById = new Map(stmts.map((s) => [s.id, s]));

  return activeReconciledLinks(bankAccountId).map((link) => {
    const book = link.bookTransactionId ? bookById.get(link.bookTransactionId) : undefined;
    const stmt = link.bankStatementTransactionId
      ? stmtById.get(link.bankStatementTransactionId)
      : undefined;
    const deposit = book?.deposit ?? stmt?.deposit ?? 0;
    const withdrawal = book?.withdrawal ?? stmt?.withdrawal ?? 0;
    return {
      id: link.id,
      bankAccountId,
      voucherDate: book?.voucherDate ?? null,
      bankDate: link.bankDate ?? "",
      particulars: book?.particulars ?? stmt?.narration ?? "—",
      voucherType: book?.voucherType ?? "—",
      voucherNumber: book?.voucherNumber ?? "—",
      reference:
        book?.instrumentNumber ||
        stmt?.reference ||
        stmt?.utrNumber ||
        stmt?.chequeNo ||
        "",
      deposit,
      withdrawal,
      reconciledBy: link.reconciledBy ?? "—",
      reconciledOn: link.reconciledAt?.slice(0, 10) ?? "—",
      voucherId: link.voucherId,
      bookTransactionId: link.bookTransactionId,
      bankStatementTransactionId: link.bankStatementTransactionId,
      linkId: link.id,
      viewHref: book ? `/accounts/vouchers/view/${book.voucherId}` : null,
    };
  });
}

export function listExceptionRows(bankAccountId: string): BankReconExceptionRow[] {
  ensure();
  const books = listBookTransactions(bankAccountId);
  const banks = listBankTransactions(bankAccountId);
  const rows: BankReconExceptionRow[] = [];

  for (const b of books) {
    if (
      b.status === "AVAILABLE_ONLY_IN_BOOKS" ||
      b.status === "AMOUNT_MISMATCH" ||
      b.status === "MULTIPLE_MATCHES" ||
      b.status === "MARKED_FOR_REVIEW" ||
      b.status === "SUGGESTED_MATCH"
    ) {
      const bankAmt =
        b.status === "AMOUNT_MISMATCH" && b.suggestedStatementIds[0]
          ? (() => {
              const s = banks.find((x) => x.id === b.suggestedStatementIds[0]);
              return s ? amountOf(s) : null;
            })()
          : null;
      rows.push({
        id: `ex-book-${b.id}`,
        bankAccountId,
        date: b.voucherDate,
        source: b.status === "AMOUNT_MISMATCH" ? "Both" : "Books",
        particulars: b.particulars,
        reference: b.instrumentNumber,
        bookAmount: amountOf(b),
        bankAmount: bankAmt,
        difference: bankAmt != null ? roundMoney(amountOf(b) - bankAmt) : null,
        exceptionType:
          b.status === "AMOUNT_MISMATCH"
            ? "Amount Mismatch"
            : b.status === "MULTIPLE_MATCHES"
              ? "Multiple Matches"
              : b.status === "MARKED_FOR_REVIEW"
                ? "Marked for Review"
                : b.status === "SUGGESTED_MATCH"
                  ? "Ambiguous Match"
                  : "Available Only in Books",
        status: b.status,
        bookTransactionId: b.id,
        bankStatementTransactionId: b.suggestedStatementIds[0] ?? null,
        voucherId: b.voucherId,
        viewHref: b.viewHref,
        editHref: b.editHref,
      });
    }
  }

  for (const s of banks) {
    if (
      s.matchStatus === "AVAILABLE_ONLY_IN_BANK" ||
      s.matchStatus === "AMOUNT_MISMATCH" ||
      s.matchStatus === "MULTIPLE_MATCHES" ||
      s.matchStatus === "MARKED_FOR_REVIEW"
    ) {
      // Avoid duplicating amount-mismatch already listed from books
      if (
        s.matchStatus === "AMOUNT_MISMATCH" &&
        rows.some((r) => r.bankStatementTransactionId === s.id)
      ) {
        continue;
      }
      rows.push({
        id: `ex-bank-${s.id}`,
        bankAccountId,
        date: s.bankDate,
        source: "Bank",
        particulars: s.narration,
        reference: s.reference,
        bookAmount: null,
        bankAmount: amountOf(s),
        difference: null,
        exceptionType:
          s.matchStatus === "AMOUNT_MISMATCH"
            ? "Amount Mismatch"
            : s.matchStatus === "MULTIPLE_MATCHES"
              ? "Multiple Matches"
              : s.matchStatus === "MARKED_FOR_REVIEW"
                ? "Marked for Review"
                : "Available Only in Bank",
        status: s.matchStatus,
        bookTransactionId: s.suggestedBookTransactionIds[0] ?? null,
        bankStatementTransactionId: s.id,
        voucherId: null,
        viewHref: null,
        editHref: null,
      });
    }
  }

  // Duplicate detection among statement rows
  const seen = new Map<string, string>();
  for (const s of banks) {
    const key = `${s.bankDate}|${s.deposit}|${s.withdrawal}|${s.reference}|${s.narration}`;
    if (seen.has(key)) {
      rows.push({
        id: `ex-dup-${s.id}`,
        bankAccountId,
        date: s.bankDate,
        source: "Bank",
        particulars: s.narration,
        reference: s.reference,
        bookAmount: null,
        bankAmount: amountOf(s),
        difference: 0,
        exceptionType: "Duplicate Statement Entry",
        status: s.matchStatus,
        bookTransactionId: null,
        bankStatementTransactionId: s.id,
        voucherId: null,
        viewHref: null,
        editHref: null,
      });
    } else {
      seen.set(key, s.id);
    }
  }

  return rows;
}

export function getBrsSummary(
  bankAccountId: string,
  dateFrom?: string,
  dateTo?: string,
): BankReconBrsSummary {
  ensure();
  const books = listBookTransactions(bankAccountId, dateFrom, dateTo);
  const unreconciledBook = books.filter((b) => b.status !== "RECONCILED");
  const reconciledCount = books.filter((b) => b.status === "RECONCILED").length;
  const manual = getManualDemoAccount(bankAccountId);
  const balanceSign =
    manual?.balanceSign ??
    (String(BANK_RECON_DEMO_ACCOUNTS.find((a) => a.id === bankAccountId)?.accountType)
      .toLowerCase()
      .includes("cash") ||
    String(BANK_RECON_DEMO_ACCOUNTS.find((a) => a.id === bankAccountId)?.accountType)
      .toLowerCase()
      .includes("overdraft")
      ? "cash_credit"
      : "asset");

  return computeManualBrsSummary({
    balanceAsPerBooks: getBookBalanceForAccount(bankAccountId) ?? 0,
    unreconciledBookLines: unreconciledBook.map((b) => ({
      deposit: b.deposit,
      withdrawal: b.withdrawal,
      reconciled: false,
    })),
    balanceSign,
    reconciledCount,
    pendingCount: unreconciledBook.length,
  });
}

export function getListingAccounts(): BankReconListingAccount[] {
  ensure();
  return BANK_RECON_DEMO_ACCOUNTS.map((a: BankReconBankAccount) => {
    const books = listBookTransactions(a.id);
    const pending = books.filter((b) => b.status !== "RECONCILED").length;
    const reconciled = activeReconciledLinks(a.id);
    const thisMonth = today().slice(0, 7);
    const reconciledThisMonth = reconciled.filter((l) =>
      (l.reconciledAt ?? "").startsWith(thisMonth),
    ).length;
    const last = reconciled
      .map((l) => l.bankDate || l.reconciledAt?.slice(0, 10) || "")
      .filter(Boolean)
      .sort()
      .reverse()[0];
    const info = getBookBalanceInfo(a.id);
    const bookBalance = info.bookBalance;
    const brs = getBrsSummary(a.id);
    const bankBalance = brs.expectedBalanceAsPerBank;
    return {
      id: a.id,
      bankName: a.bankName,
      accountNickname: a.accountNickname,
      accountNumber: a.accountNumber,
      accountType: a.accountType,
      bookBalance,
      bookLedgerLinked: info.linked,
      linkedCoaLedgerId: info.ledgerId,
      bankBalance,
      difference:
        bookBalance == null ? null : roundMoney(bookBalance - bankBalance),
      pendingReconciliationCount: pending,
      lastReconciledDate: last ?? a.lastReconciledDate,
      reconciledThisMonth,
      statementPeriodFrom: a.statementPeriodFrom,
      statementPeriodTo: a.statementPeriodTo,
    };
  });
}

export function computeListingSummary(
  accounts: BankReconListingAccount[],
): BankReconListingSummary {
  const linked = accounts.filter((a) => a.bookLedgerLinked && a.bookBalance != null);
  return {
    totalAccounts: accounts.length,
    totalBookBalance: roundMoney(
      linked.reduce((s, a) => s + (a.bookBalance ?? 0), 0),
    ),
    totalBankBalance: roundMoney(accounts.reduce((s, a) => s + a.bankBalance, 0)),
    totalDifference: roundMoney(
      linked.reduce((s, a) => s + (a.difference ?? 0), 0),
    ),
    pendingReconciliation: accounts.reduce((s, a) => s + a.pendingReconciliationCount, 0),
    reconciledThisMonth: accounts.reduce((s, a) => s + a.reconciledThisMonth, 0),
  };
}

export function getAccountLabel(bankAccountId: string): string {
  const a = BANK_RECON_DEMO_ACCOUNTS.find((x) => x.id === bankAccountId);
  if (!a) return bankAccountId;
  return `${a.accountNickname} · ${maskAccountNumber(a.accountNumber)}`;
}

export function validateAmountMatch(
  book: { deposit: number; withdrawal: number },
  stmt: { deposit: number; withdrawal: number },
): { ok: true } | { ok: false; error: string } {
  if (directionOf(book) !== directionOf(stmt)) {
    return { ok: false, error: "Transaction direction does not match." };
  }
  if (Math.abs(amountOf(book) - amountOf(stmt)) > 0.01) {
    return { ok: false, error: AMOUNT_MISMATCH_MESSAGE };
  }
  return { ok: true };
}

export function reconcileWithStatement(
  input: ReconcileWithStatementInput,
): { ok: true; linkId: string } | { ok: false; error: string } {
  ensure();
  const books = loadRawBookTransactions(input.bankAccountId);
  const book = books.find((b) => b.id === input.bookTransactionId);
  if (!book) return { ok: false, error: "Book transaction not found." };

  const stmt = statementRows(input.bankAccountId).find(
    (s) => s.id === input.bankStatementTransactionId,
  );
  if (!stmt) return { ok: false, error: "Bank statement entry not found." };

  if (!input.bankDate.trim()) return { ok: false, error: "Bank Date is required." };

  const amountCheck = validateAmountMatch(book, stmt);
  if (!amountCheck.ok) return amountCheck;

  const existingBookLink = findActiveLinkForBook(book.id);
  const existingStatementLink = findActiveLinkForStatement(stmt.id);
  if (existingBookLink?.status === "RECONCILED") {
    return { ok: false, error: "Book transaction is already reconciled." };
  }
  if (existingStatementLink?.status === "RECONCILED") {
    return { ok: false, error: "Statement entry is already reconciled." };
  }

  const status: BankReconTallyStatus = input.markForReview
    ? "MARKED_FOR_REVIEW"
    : "RECONCILED";
  const existing = existingBookLink ?? existingStatementLink;
  const link: BankReconTallyLink = {
    id: existing?.id ?? createTallyLinkId(),
    bankAccountId: input.bankAccountId,
    bookTransactionId: book.id,
    bankStatementTransactionId: stmt.id,
    voucherId: book.voucherId,
    bankDate: input.bankDate,
    status,
    reconciledAmount: amountOf(book),
    reconciledBy: BANK_RECON_DEMO_USER,
    reconciledAt: nowIso(),
    remarks: input.remarks?.trim() || null,
    reviewReason: input.markForReview ? input.remarks?.trim() || "Marked for review" : null,
    importBatchId: stmt.importBatchId,
    undoReason: null,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  if (
    existingBookLink &&
    existingStatementLink &&
    existingBookLink.id !== existingStatementLink.id
  ) {
    removeTallyLink(existingStatementLink.id);
  }
  upsertTallyLink(link);
  refreshTallySuggestions(input.bankAccountId);
  return { ok: true, linkId: link.id };
}

export function reconcileBankDateOnly(
  input: ReconcileBankDateOnlyInput,
): { ok: true; linkId: string } | { ok: false; error: string } {
  ensure();
  const books = loadRawBookTransactions(input.bankAccountId);
  const book = books.find((b) => b.id === input.bookTransactionId);
  if (!book) return { ok: false, error: "Book transaction not found." };
  if (!input.bankDate.trim()) return { ok: false, error: "Bank Date is required." };
  const existing = findActiveLinkForBook(book.id);
  if (existing?.status === "RECONCILED") {
    return { ok: false, error: "Book transaction is already reconciled." };
  }

  const status: BankReconTallyStatus = input.markForReview
    ? "MARKED_FOR_REVIEW"
    : "RECONCILED";
  const link: BankReconTallyLink = {
    id: existing?.id ?? createTallyLinkId(),
    bankAccountId: input.bankAccountId,
    bookTransactionId: book.id,
    // Manual workflow: never auto-link statement rows.
    bankStatementTransactionId: null,
    voucherId: book.voucherId,
    bankDate: input.bankDate,
    status,
    reconciledAmount: amountOf(book),
    reconciledBy: BANK_RECON_DEMO_USER,
    reconciledAt: nowIso(),
    remarks: input.remarks?.trim() || null,
    reviewReason: input.markForReview ? input.remarks?.trim() || "Marked for review" : null,
    importBatchId: null,
    undoReason: null,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  upsertTallyLink(link);
  return { ok: true, linkId: link.id };
}

export function reconcileBankDateBulk(
  input: ReconcileBankDateBulkInput,
): { ok: true; saved: number; skipped: number; errors: string[] } | { ok: false; error: string } {
  ensure();
  if (!input.bankDate.trim()) return { ok: false, error: "Bank Date is required." };
  if (!input.bookTransactionIds.length) {
    return { ok: false, error: "Select at least one book transaction." };
  }

  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const bookTransactionId of input.bookTransactionIds) {
    const result = reconcileBankDateOnly({
      bankAccountId: input.bankAccountId,
      bookTransactionId,
      bankDate: input.bankDate,
      remarks: input.remarks,
    });
    if (result.ok) saved += 1;
    else {
      skipped += 1;
      errors.push(`${bookTransactionId}: ${result.error}`);
    }
  }
  if (saved > 0) notifyTallyUpdated();
  return { ok: true, saved, skipped, errors };
}

export function saveAsPending(
  bankAccountId: string,
  bookTransactionId: string,
  remarks?: string,
): { ok: true } | { ok: false; error: string } {
  ensure();
  const existing = findActiveLinkForBook(bookTransactionId);
  if (existing?.status === "RECONCILED") {
    return { ok: false, error: "Already reconciled. Undo first to save as pending." };
  }
  if (existing) {
    upsertTallyLink({
      ...existing,
      status: "UNRECONCILED",
      bankDate: null,
      remarks: remarks?.trim() || existing.remarks,
      updatedAt: nowIso(),
    });
  }
  notifyTallyUpdated();
  return { ok: true };
}

export function markBookForReview(
  bankAccountId: string,
  bookTransactionId: string,
  reason: string,
): { ok: true } | { ok: false; error: string } {
  ensure();
  const books = loadRawBookTransactions(bankAccountId);
  const book = books.find((b) => b.id === bookTransactionId);
  if (!book) return { ok: false, error: "Book transaction not found." };

  const existing = findActiveLinkForBook(bookTransactionId);
  const link: BankReconTallyLink = {
    id: existing?.id ?? createTallyLinkId(),
    bankAccountId,
    bookTransactionId: book.id,
    bankStatementTransactionId: existing?.bankStatementTransactionId ?? null,
    voucherId: book.voucherId,
    bankDate: existing?.bankDate ?? null,
    status: "MARKED_FOR_REVIEW",
    reconciledAmount: existing?.reconciledAmount ?? null,
    reconciledBy: BANK_RECON_DEMO_USER,
    reconciledAt: nowIso(),
    remarks: reason.trim() || null,
    reviewReason: reason.trim() || "Marked for review",
    importBatchId: existing?.importBatchId ?? null,
    undoReason: null,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  upsertTallyLink(link);
  return { ok: true };
}

export function markStatementForReview(
  bankAccountId: string,
  statementId: string,
  reason: string,
): { ok: true } | { ok: false; error: string } {
  ensure();
  const stmt = statementRows(bankAccountId).find((s) => s.id === statementId);
  if (!stmt) return { ok: false, error: "Statement entry not found." };
  const existing = findActiveLinkForStatement(statementId);
  const link: BankReconTallyLink = {
    id: existing?.id ?? createTallyLinkId(),
    bankAccountId,
    bookTransactionId: existing?.bookTransactionId ?? null,
    bankStatementTransactionId: statementId,
    voucherId: existing?.voucherId ?? null,
    bankDate: existing?.bankDate ?? stmt.statementDate,
    status: "MARKED_FOR_REVIEW",
    reconciledAmount: existing?.reconciledAmount ?? null,
    reconciledBy: BANK_RECON_DEMO_USER,
    reconciledAt: nowIso(),
    remarks: reason.trim() || null,
    reviewReason: reason.trim() || "Marked for review",
    importBatchId: stmt.importBatchId,
    undoReason: null,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  upsertTallyLink(link);
  return { ok: true };
}

export function ignoreStatementEntry(
  bankAccountId: string,
  statementId: string,
  reason: string,
): { ok: true } | { ok: false; error: string } {
  ensure();
  if (!reason.trim()) return { ok: false, error: "Ignore reason is required." };
  const stmt = statementRows(bankAccountId).find((s) => s.id === statementId);
  if (!stmt) return { ok: false, error: "Statement entry not found." };
  if (findActiveLinkForStatement(statementId)?.status === "RECONCILED") {
    return { ok: false, error: "Undo reconciliation before ignoring this entry." };
  }
  const link: BankReconTallyLink = {
    id: createTallyLinkId(),
    bankAccountId,
    bookTransactionId: null,
    bankStatementTransactionId: statementId,
    voucherId: null,
    bankDate: stmt.statementDate,
    status: "IGNORED",
    reconciledAmount: null,
    reconciledBy: BANK_RECON_DEMO_USER,
    reconciledAt: nowIso(),
    remarks: reason.trim(),
    reviewReason: reason.trim(),
    importBatchId: stmt.importBatchId,
    undoReason: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  upsertTallyLink(link);
  refreshTallySuggestions(bankAccountId);
  return { ok: true };
}

export function undoReconciliation(
  input: UndoReconciliationInput,
): { ok: true } | { ok: false; error: string } {
  ensure();
  if (!input.reason.trim()) return { ok: false, error: "Audit reason is required." };
  const link = getTallyLinkById(input.linkId);
  if (!link) return { ok: false, error: "Reconciliation link not found." };
  if (link.status !== "RECONCILED" && link.status !== "MARKED_FOR_REVIEW") {
    return { ok: false, error: "Only reconciled entries can be undone." };
  }
  appendUndoAuditEntry({
    id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    linkId: link.id,
    bankAccountId: link.bankAccountId,
    bookTransactionId: link.bookTransactionId,
    bankDate: link.bankDate,
    reason: input.reason.trim(),
    undoneBy: BANK_RECON_DEMO_USER,
    undoneAt: nowIso(),
  });
  // Remove link — clears Bank Date and restores Unreconciled without changing book balance.
  removeTallyLink(link.id);
  return { ok: true };
}

export { resetBankReconciliationDemoData };

export function buildCreateVoucherHref(stmt: BankReconBankTransaction): string {
  const isDeposit = stmt.deposit > 0;
  const tab = isDeposit ? "receipt" : "payment";
  const params = new URLSearchParams({
    tab,
    mode: "new",
    reconBankAccountId: stmt.bankAccountId,
    reconStatementId: stmt.id,
    reconAmount: String(amountOf(stmt)),
    reconDate: stmt.bankDate,
    reconReference: stmt.reference,
    reconNarration: stmt.narration,
  });
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        "dharitri_bank_recon_voucher_draft_v1",
        JSON.stringify({
          bankAccountId: stmt.bankAccountId,
          statementId: stmt.id,
          amount: amountOf(stmt),
          direction: isDeposit ? "deposit" : "withdrawal",
          date: stmt.bankDate,
          reference: stmt.reference,
          narration: stmt.narration,
        }),
      );
    } catch {
      /* ignore */
    }
  }
  return `/accounts/vouchers?${params.toString()}`;
}

export function canRollbackImport(batchId: string): {
  ok: boolean;
  reason?: string;
  reconciledCount: number;
} {
  ensure();
  const links = loadTallyLinks().filter(
    (l) =>
      l.importBatchId === batchId &&
      (l.status === "RECONCILED" || l.status === "MARKED_FOR_REVIEW"),
  );
  if (links.length > 0) {
    return {
      ok: false,
      reconciledCount: links.length,
      reason:
        "Rollback is blocked because one or more rows from this import are reconciled. Undo those reconciliations first.",
    };
  }
  return { ok: true, reconciledCount: 0 };
}

export function rollbackImport(
  batchId: string,
): { ok: true; removed: number } | { ok: false; error: string } {
  ensure();
  const gate = canRollbackImport(batchId);
  if (!gate.ok) return { ok: false, error: gate.reason ?? "Rollback not allowed." };

  const all = loadBankReconTransactions();
  const remaining = all.filter((t) => t.importBatchId !== batchId);
  const removed = all.length - remaining.length;
  saveBankReconTransactions(remaining);

  // Soft-mark batch cancelled
  const batches = loadImportBatches();
  const batch = batches.find((b) => b.id === batchId);
  if (batch && typeof window !== "undefined") {
    const next = batches.map((b) =>
      b.id === batchId ? { ...b, status: "Cancelled" as const } : b,
    );
    localStorage.setItem("dharitri_bank_recon_import_batches_v2", JSON.stringify(next));
  }

  // Drop non-reconciled links tied to this batch (gate already ensured none reconciled)
  saveTallyLinks(loadTallyLinks().filter((l) => l.importBatchId !== batchId));

  if (batch) refreshTallySuggestions(batch.bankAccountId);
  notifyRegisterUpdated();
  notifyTallyUpdated();
  return { ok: true, removed };
}

export function getBookTransactionById(
  bankAccountId: string,
  bookTransactionId: string,
): BankReconBookTransaction | undefined {
  return listBookTransactions(bankAccountId).find((b) => b.id === bookTransactionId);
}

export function getBankTransactionById(
  bankAccountId: string,
  statementId: string,
): BankReconBankTransaction | undefined {
  return listBankTransactions(bankAccountId).find((s) => s.id === statementId);
}

export function getMatchingStatementCandidates(
  bankAccountId: string,
  bookTransactionId: string,
): BankReconBankTransaction[] {
  const book = getBookTransactionById(bankAccountId, bookTransactionId);
  if (!book) return [];
  const suggestions = suggestionsForBook(loadTallySuggestions(), bookTransactionId);
  const banks = listBankTransactions(bankAccountId).filter(
    (s) => s.matchStatus !== "RECONCILED" && s.matchStatus !== "IGNORED",
  );
  const suggestedIds = new Set(suggestions.map((s) => s.bankStatementTransactionId));
  const suggested = banks.filter((s) => suggestedIds.has(s.id));
  const others = banks.filter(
    (s) =>
      !suggestedIds.has(s.id) &&
      directionOf(s) === directionOf(book) &&
      Math.abs(amountOf(s) - amountOf(book)) < 0.01,
  );
  return [...suggested, ...others];
}

export { AMOUNT_MISMATCH_MESSAGE };
