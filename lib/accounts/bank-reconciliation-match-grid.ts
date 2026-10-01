import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "@/app/(app)/accounts/data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import type { BookEntryRow } from "@/lib/accounts/banking-book-utils";
import {
  getStatementEntriesForBank,
  loadBookReconRecords,
  resolveBankMasterId,
} from "@/lib/accounts/manual-bank-reconciliation-data";
import {
  loadBankEntries,
  saveBankEntries,
  type BankStatementEntry,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";

export type BankReconMatchStatus =
  | "matched"
  | "suggested"
  | "unmatched_bank"
  | "unmatched_books"
  | "difference"
  | "ignored";

export interface ReconciliationGridRow {
  id: string;
  coaLedgerId: number;
  statementEntryId: number | null;
  bookRowKey: string | null;
  statementDate: string;
  bookDate: string;
  description: string;
  voucherNo: string;
  referenceNo: string;
  bankDebit: number;
  bankCredit: number;
  bookDebit: number;
  bookCredit: number;
  difference: number;
  matchStatus: BankReconMatchStatus;
  remarks: string;
  reconciledBy: string;
  reconciledOn: string;
}

export interface ReconciliationSummary {
  bookTotalDebit: number;
  bookTotalCredit: number;
  bookClosingBalance: number;
  statementTotalDebit: number;
  statementTotalCredit: number;
  statementClosingBalance: number;
  matchedCount: number;
  suggestedCount: number;
  unmatchedBankCount: number;
  unmatchedBooksCount: number;
  differenceCount: number;
  ignoredCount: number;
  netDifference: number;
}

export interface SavedReconLink {
  id: string;
  coaLedgerId: number;
  statementEntryId: number | null;
  bookRowKey: string | null;
  matchStatus: BankReconMatchStatus;
  remarks: string;
  reconciledBy: string;
  reconciledOn: string;
}

const LINKS_KEY = "ds_bank_recon_match_links_v1";
const SEED_KEY = "ds_bank_recon_match_seed_v1";
export const BANK_RECON_MATCH_SEED_VERSION = "v1";

function getOrSeed<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function saveList<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
}

export function loadReconLinks(): SavedReconLink[] {
  return getOrSeed<SavedReconLink>(LINKS_KEY, []);
}

export function saveReconLinks(links: SavedReconLink[]) {
  saveList(LINKS_KEY, links);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bookReference(bookRow: BookEntryRow): string {
  const v = loadVouchers().find((x) => x.id === bookRow.voucherId);
  return v?.referenceNo?.trim() ?? "";
}

function descriptionSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / Math.max(ta.size, tb.size);
}

function bankAmount(entry: BankStatementEntry): number {
  return entry.debit > 0 ? entry.debit : entry.credit;
}

function bookAmount(entry: BookEntryRow): number {
  return entry.receipt > 0 ? entry.receipt : entry.payment;
}

function amountsAlign(
  stmt: BankStatementEntry,
  book: BookEntryRow,
): { aligned: boolean; diff: number } {
  const stmtAmt = bankAmount(stmt);
  const bookAmt = bookAmount(book);
  const stmtIsDebit = stmt.debit > 0;
  const bookIsDebit = book.receipt > 0;

  if (stmtIsDebit !== bookIsDebit) {
    return { aligned: false, diff: round2(stmtAmt + bookAmt) };
  }
  const diff = round2(Math.abs(stmtAmt - bookAmt));
  return { aligned: diff <= 0.01, diff };
}

export interface MatchCandidate {
  statementEntryId: number;
  bookRowKey: string;
  score: number;
  amountDiff: number;
}

export function scoreMatch(stmt: BankStatementEntry, book: BookEntryRow): MatchCandidate | null {
  let score = 0;
  const stmtRef = stmt.referenceNo.trim().toLowerCase();
  const bookRef = bookReference(book).toLowerCase();

  if (stmtRef && bookRef && stmtRef === bookRef) score += 50;
  else if (stmtRef && bookRef && (stmtRef.includes(bookRef) || bookRef.includes(stmtRef))) score += 30;

  const { aligned, diff } = amountsAlign(stmt, book);
  if (aligned) score += 40;
  else if (diff <= 100) score += 20;

  if (stmt.transactionDate === book.date) score += 30;
  else if (Math.abs(new Date(stmt.transactionDate).getTime() - new Date(book.date).getTime()) <= 3 * 86400000) {
    score += 15;
  }

  const descScore = descriptionSimilarity(stmt.narration, book.particulars);
  if (descScore >= 0.3) score += Math.round(descScore * 20);

  if (score < 40) return null;

  return {
    statementEntryId: stmt.id,
    bookRowKey: book.rowKey,
    score,
    amountDiff: diff,
  };
}

function deriveAutoStatus(candidate: MatchCandidate, userStatus?: BankReconMatchStatus): BankReconMatchStatus {
  if (userStatus === "ignored") return "ignored";
  if (userStatus === "matched") return "matched";
  if (userStatus === "difference") return "difference";
  if (userStatus === "unmatched_bank" || userStatus === "unmatched_books") return userStatus;

  if (candidate.amountDiff > 0.01) {
    if (userStatus === "suggested") return "suggested";
    return candidate.score >= 70 ? "difference" : "suggested";
  }
  if (candidate.score >= 80) return userStatus === "suggested" ? "suggested" : "matched";
  return "suggested";
}

function buildRowFromPair(input: {
  id: string;
  coaLedgerId: number;
  stmt: BankStatementEntry | null;
  book: BookEntryRow | null;
  matchStatus: BankReconMatchStatus;
  remarks?: string;
  reconciledBy?: string;
  reconciledOn?: string;
}): ReconciliationGridRow {
  const stmtAmt = input.stmt ? bankAmount(input.stmt) : 0;
  const bookAmt = input.book ? bookAmount(input.book) : 0;
  const stmtIsDebit = (input.stmt?.debit ?? 0) > 0;
  const bookIsDebit = (input.book?.receipt ?? 0) > 0;

  let difference = 0;
  if (input.stmt && input.book) {
    if (stmtIsDebit === bookIsDebit) {
      difference = round2(Math.abs(stmtAmt - bookAmt));
    } else {
      difference = round2(stmtAmt + bookAmt);
    }
  } else if (input.stmt) {
    difference = stmtAmt;
  } else if (input.book) {
    difference = bookAmt;
  }

  const description =
    input.stmt?.narration ||
    input.book?.particulars ||
    "—";

  return {
    id: input.id,
    coaLedgerId: input.coaLedgerId,
    statementEntryId: input.stmt?.id ?? null,
    bookRowKey: input.book?.rowKey ?? null,
    statementDate: input.stmt?.transactionDate ?? "",
    bookDate: input.book?.date ?? "",
    description,
    voucherNo: input.book?.voucherNo ?? "",
    referenceNo: input.stmt?.referenceNo || (input.book ? bookReference(input.book) : ""),
    bankDebit: input.stmt?.debit ?? 0,
    bankCredit: input.stmt?.credit ?? 0,
    bookDebit: input.book?.receipt ?? 0,
    bookCredit: input.book?.payment ?? 0,
    difference,
    matchStatus: input.matchStatus,
    remarks: input.remarks ?? "",
    reconciledBy: input.reconciledBy ?? "",
    reconciledOn: input.reconciledOn ?? "",
  };
}

export function buildReconciliationGrid(input: {
  coaLedgerId: number;
  bookEntries: BookEntryRow[];
  dateFrom?: string;
  dateTo?: string;
  closingBookBalance: number;
}): { rows: ReconciliationGridRow[]; summary: ReconciliationSummary } {
  const bankMasterId = resolveBankMasterId(input.coaLedgerId);
  const savedLinks = loadReconLinks().filter((l) => l.coaLedgerId === input.coaLedgerId);

  let statementEntries: BankStatementEntry[] = [];
  if (bankMasterId) {
    statementEntries = getStatementEntriesForBank(bankMasterId).filter((e) => {
      if (input.dateFrom && e.transactionDate < input.dateFrom) return false;
      if (input.dateTo && e.transactionDate > input.dateTo) return false;
      return true;
    });
  }

  const bookEntries = input.bookEntries.filter((e) => e.ledgerId === input.coaLedgerId);

  const usedStmtIds = new Set<number>();
  const usedBookKeys = new Set<string>();
  const rows: ReconciliationGridRow[] = [];

  for (const link of savedLinks) {
    const stmt = link.statementEntryId
      ? statementEntries.find((e) => e.id === link.statementEntryId) ?? null
      : null;
    const book = link.bookRowKey
      ? bookEntries.find((e) => e.rowKey === link.bookRowKey) ?? null
      : null;
    if (!stmt && !book) continue;
    if (stmt) usedStmtIds.add(stmt.id);
    if (book) usedBookKeys.add(book.rowKey);
    rows.push(
      buildRowFromPair({
        id: link.id,
        coaLedgerId: input.coaLedgerId,
        stmt,
        book,
        matchStatus: link.matchStatus,
        remarks: link.remarks,
        reconciledBy: link.reconciledBy,
        reconciledOn: link.reconciledOn,
      }),
    );
  }

  const candidates: MatchCandidate[] = [];
  for (const stmt of statementEntries) {
    if (usedStmtIds.has(stmt.id)) continue;
    for (const book of bookEntries) {
      if (usedBookKeys.has(book.rowKey)) continue;
      const c = scoreMatch(stmt, book);
      if (c) candidates.push(c);
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    if (usedStmtIds.has(c.statementEntryId) || usedBookKeys.has(c.bookRowKey)) continue;
    const stmt = statementEntries.find((e) => e.id === c.statementEntryId)!;
    const book = bookEntries.find((e) => e.rowKey === c.bookRowKey)!;
    const status = deriveAutoStatus(c);
    usedStmtIds.add(c.statementEntryId);
    usedBookKeys.add(c.bookRowKey);
    rows.push(
      buildRowFromPair({
        id: `auto-${c.statementEntryId}-${c.bookRowKey}`,
        coaLedgerId: input.coaLedgerId,
        stmt,
        book,
        matchStatus: status,
      }),
    );
  }

  for (const stmt of statementEntries) {
    if (usedStmtIds.has(stmt.id)) continue;
    rows.push(
      buildRowFromPair({
        id: `stmt-${stmt.id}`,
        coaLedgerId: input.coaLedgerId,
        stmt,
        book: null,
        matchStatus: "unmatched_bank",
      }),
    );
  }

  for (const book of bookEntries) {
    if (usedBookKeys.has(book.rowKey)) continue;
    rows.push(
      buildRowFromPair({
        id: `book-${book.rowKey}`,
        coaLedgerId: input.coaLedgerId,
        stmt: null,
        book,
        matchStatus: "unmatched_books",
      }),
    );
  }

  rows.sort((a, b) => {
    const da = a.statementDate || a.bookDate;
    const db = b.statementDate || b.bookDate;
    return da.localeCompare(db);
  });

  const stmtDebit = statementEntries.reduce((s, e) => s + e.debit, 0);
  const stmtCredit = statementEntries.reduce((s, e) => s + e.credit, 0);
  const stmtClosing =
    statementEntries.length > 0
      ? statementEntries[statementEntries.length - 1].balance
      : 0;

  const summary: ReconciliationSummary = {
    bookTotalDebit: round2(bookEntries.reduce((s, e) => s + e.receipt, 0)),
    bookTotalCredit: round2(bookEntries.reduce((s, e) => s + e.payment, 0)),
    bookClosingBalance: input.closingBookBalance,
    statementTotalDebit: round2(stmtDebit),
    statementTotalCredit: round2(stmtCredit),
    statementClosingBalance: stmtClosing,
    matchedCount: rows.filter((r) => r.matchStatus === "matched").length,
    suggestedCount: rows.filter((r) => r.matchStatus === "suggested").length,
    unmatchedBankCount: rows.filter((r) => r.matchStatus === "unmatched_bank").length,
    unmatchedBooksCount: rows.filter((r) => r.matchStatus === "unmatched_books").length,
    differenceCount: rows.filter((r) => r.matchStatus === "difference").length,
    ignoredCount: rows.filter((r) => r.matchStatus === "ignored").length,
    netDifference: round2(input.closingBookBalance - stmtClosing),
  };

  return { rows, summary };
}

export function matchStatusLabel(status: BankReconMatchStatus): string {
  const labels: Record<BankReconMatchStatus, string> = {
    matched: "Matched",
    suggested: "Suggested Match",
    unmatched_bank: "Unmatched in Bank",
    unmatched_books: "Unmatched in Books",
    difference: "Difference",
    ignored: "Ignored",
  };
  return labels[status];
}

function upsertLink(link: SavedReconLink) {
  const links = loadReconLinks();
  const idx = links.findIndex((l) => l.id === link.id);
  if (idx >= 0) links[idx] = link;
  else links.push(link);
  saveReconLinks(links);
}

const BOOK_RECON_RECORDS_KEY = "ds_manual_bank_recon_records_v1";

function syncBookReconStatus(row: ReconciliationGridRow) {
  if (!row.bookRowKey) return;
  const records = loadBookReconRecords();
  const idx = records.findIndex((r) => r.rowKey === row.bookRowKey);
  if (idx < 0) return;
  const isReconciled = row.matchStatus === "matched" || row.matchStatus === "ignored";
  records[idx] = {
    ...records[idx],
    bankProcessingDate: isReconciled && row.statementDate ? row.statementDate : records[idx].bankProcessingDate,
    status: isReconciled ? "reconciled" : "pending",
    reconciledBy: isReconciled ? ACCOUNTS_CURRENT_USER : "",
    reconciledOn: isReconciled ? new Date().toISOString() : "",
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(BOOK_RECON_RECORDS_KEY, JSON.stringify(records));
  }
}

export function saveReconciliationRow(
  row: ReconciliationGridRow,
  updates: Partial<Pick<ReconciliationGridRow, "matchStatus" | "remarks" | "statementEntryId" | "bookRowKey">>,
): ReconciliationGridRow {
  const now = new Date().toISOString();
  const updated: ReconciliationGridRow = {
    ...row,
    ...updates,
    reconciledBy:
      updates.matchStatus === "matched" || updates.matchStatus === "ignored"
        ? ACCOUNTS_CURRENT_USER
        : row.reconciledBy,
    reconciledOn:
      updates.matchStatus === "matched" || updates.matchStatus === "ignored" ? now : row.reconciledOn,
  };

  upsertLink({
    id: updated.id,
    coaLedgerId: updated.coaLedgerId,
    statementEntryId: updated.statementEntryId,
    bookRowKey: updated.bookRowKey,
    matchStatus: updated.matchStatus,
    remarks: updated.remarks,
    reconciledBy: updated.reconciledBy,
    reconciledOn: updated.reconciledOn,
  });

  syncBookReconStatus(updated);
  return updated;
}

export function confirmMatch(row: ReconciliationGridRow): ReconciliationGridRow {
  return saveReconciliationRow(row, { matchStatus: "matched" });
}

export function unmatchRow(row: ReconciliationGridRow): ReconciliationGridRow {
  const links = loadReconLinks().filter((l) => l.id !== row.id);
  saveReconLinks(links);

  if (row.statementEntryId && !row.bookRowKey) {
    return { ...row, matchStatus: "unmatched_bank" };
  }
  if (row.bookRowKey && !row.statementEntryId) {
    return { ...row, matchStatus: "unmatched_books" };
  }
  return saveReconciliationRow(row, {
    matchStatus: row.statementEntryId ? "unmatched_bank" : "unmatched_books",
    remarks: "",
  });
}

export function ignoreRow(row: ReconciliationGridRow, remarks?: string): ReconciliationGridRow {
  return saveReconciliationRow(row, {
    matchStatus: "ignored",
    remarks: remarks ?? row.remarks ?? "Ignored during reconciliation",
  });
}

export function addBankChargeRow(row: ReconciliationGridRow): ReconciliationGridRow {
  return saveReconciliationRow(row, {
    matchStatus: "matched",
    remarks: row.remarks || "Bank charge recorded",
  });
}

export function createAdjustmentRow(row: ReconciliationGridRow): ReconciliationGridRow {
  return saveReconciliationRow(row, {
    matchStatus: "matched",
    remarks: row.remarks || "Adjustment voucher created",
  });
}

type SeedSpec = {
  statementRef: string;
  bookVoucherNo: string;
  matchStatus: BankReconMatchStatus;
  remarks?: string;
};

const SEED_SPECS: SeedSpec[] = [
  { statementRef: "NEFT-001", bookVoucherNo: "RV-0001", matchStatus: "matched" },
  { statementRef: "PAY-001", bookVoucherNo: "PV-0001", matchStatus: "matched" },
  { statementRef: "NEFT-002", bookVoucherNo: "RV-0002", matchStatus: "suggested", remarks: "Review date and reference before confirming" },
  { statementRef: "BANK-FEE-JUN", bookVoucherNo: "", matchStatus: "unmatched_bank", remarks: "Bank fee not in books" },
  { statementRef: "", bookVoucherNo: "PV-0007", matchStatus: "unmatched_books", remarks: "Payment not on statement" },
  { statementRef: "NEFT-006", bookVoucherNo: "RV-0007", matchStatus: "difference", remarks: "Amount mismatch — verify" },
];

export function ensureBankReconMatchSeed(coaLedgerId: number, bookEntries: BookEntryRow[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEED_KEY) === BANK_RECON_MATCH_SEED_VERSION) return;

  const bankMasterId = resolveBankMasterId(coaLedgerId);
  if (!bankMasterId) return;

  let statementEntries = getStatementEntriesForBank(bankMasterId);
  const links: SavedReconLink[] = loadReconLinks().filter((l) => l.coaLedgerId !== coaLedgerId);
  const now = new Date().toISOString();

  const allEntries = loadBankEntries();
  if (!allEntries.some((e) => e.referenceNo === "BANK-FEE-JUN")) {
    const extraStmt: BankStatementEntry = {
      id: nextId(allEntries),
      statementId: statementEntries[0]?.statementId ?? 1,
      transactionDate: bookEntries[0]?.date ?? new Date().toISOString().slice(0, 10),
      narration: "BANK SERVICE CHARGE — account maintenance",
      debit: 350,
      credit: 0,
      balance: 0,
      referenceNo: "BANK-FEE-JUN",
      entryType: "debit",
      matchedModule: "",
      bankCategory: "",
      matchedRecordId: null,
      matchedRecordLabel: "",
      ledgerId: null,
      ledgerName: "",
      remarks: "",
      matchStatus: "unmatched",
      reconciliationStatus: "unmatched",
      reconciledBy: "",
      reconciledAt: "",
    };
    saveBankEntries([...allEntries, extraStmt]);
    statementEntries = getStatementEntriesForBank(bankMasterId);
  }

  for (const spec of SEED_SPECS) {
    const stmt = spec.statementRef
      ? statementEntries.find((s) => s.referenceNo === spec.statementRef)
      : null;
    const book = spec.bookVoucherNo
      ? bookEntries.find((b) => b.voucherNo === spec.bookVoucherNo)
      : null;

    if (!stmt && !book) continue;

    const id = `seed-${spec.statementRef || spec.bookVoucherNo}-${coaLedgerId}`;
    links.push({
      id,
      coaLedgerId,
      statementEntryId: stmt?.id ?? null,
      bookRowKey: book?.rowKey ?? null,
      matchStatus: spec.matchStatus,
      remarks: spec.remarks ?? "",
      reconciledBy: spec.matchStatus === "matched" ? ACCOUNTS_CURRENT_USER : "",
      reconciledOn: spec.matchStatus === "matched" ? now : "",
    });
  }

  saveReconLinks(links);
  localStorage.setItem(SEED_KEY, BANK_RECON_MATCH_SEED_VERSION);
}

export function filterReconRows(
  rows: ReconciliationGridRow[],
  filters: { status?: string; search?: string },
): ReconciliationGridRow[] {
  return rows.filter((row) => {
    if (filters.status && filters.status !== "all" && row.matchStatus !== filters.status) return false;
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = `${row.description} ${row.voucherNo} ${row.referenceNo} ${row.remarks}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
