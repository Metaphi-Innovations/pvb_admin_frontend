import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "@/app/(app)/accounts/data";
import type { BookEntryRow } from "@/lib/accounts/banking-book-utils";
import { loadBankAccountsForReconciliation } from "@/lib/accounts/bank-accounts-data";
import {
  loadBankEntries,
  loadBankStatements,
  type BankStatementEntry,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";

export type BookReconStatus = "pending" | "reconciled";

export interface SuggestedBankMatch {
  statementEntryId: number;
  bankProcessingDate: string;
  narration: string;
  referenceNo: string;
  amount: number;
  direction: "receipt" | "payment";
}

export interface BookReconRecord {
  rowKey: string;
  ledgerId: number;
  bankMasterId: number;
  voucherId: number;
  voucherNo: string;
  entryDate: string;
  partyName: string;
  voucherTypeLabel: "Payment" | "Receipt";
  debitAmount: number;
  creditAmount: number;
  narration: string;
  bankProcessingDate: string;
  status: BookReconStatus;
  reconciledBy: string;
  reconciledOn: string;
  remarks: string;
  suggestedMatch: SuggestedBankMatch | null;
  matchedStatementEntryId: number | null;
}

export interface BookReconAuditEntry {
  id: number;
  rowKey: string;
  voucherNo: string;
  action: "reconciled" | "bank_date_updated";
  entryDate: string;
  bankProcessingDate: string;
  reconciledBy: string;
  reconciledOn: string;
  remarks: string;
  previousValues?: {
    bankProcessingDate?: string;
    remarks?: string;
  };
}

export interface ManualReconGridRow extends BookReconRecord {
  isSuggested: boolean;
}

export interface ManualReconSummary {
  balanceAsPerBooks: number;
  balanceAsPerBank: number;
  difference: number;
  pendingCount: number;
  reconciledCount: number;
}

export interface ManualReconFilters {
  coaLedgerId: number;
  dateFrom?: string;
  dateTo?: string;
  status?: "all" | BookReconStatus;
  partyName?: string;
  voucherNo?: string;
}

const RECORDS_KEY = "ds_manual_bank_recon_records_v1";
const AUDIT_KEY = "ds_manual_bank_recon_audit_v1";

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

export function loadBookReconRecords(): BookReconRecord[] {
  return getOrSeed<BookReconRecord>(RECORDS_KEY, []);
}

export function loadBookReconAudit(): BookReconAuditEntry[] {
  return getOrSeed<BookReconAuditEntry>(AUDIT_KEY, []);
}

export function resolveBankMasterId(coaLedgerId: number): number | null {
  const match = loadBankAccountsForReconciliation().find((a) => a.coaLedgerId === coaLedgerId);
  return match?.id ?? null;
}

export function resolveCoaLedgerId(bankMasterId: number): number | null {
  const match = loadBankAccountsForReconciliation().find((a) => a.id === bankMasterId);
  return match?.coaLedgerId ?? null;
}

export function voucherTypeForBookEntry(entry: BookEntryRow): "Payment" | "Receipt" {
  if (entry.voucherType === "payment") return "Payment";
  if (entry.voucherType === "receipt") return "Receipt";
  return entry.receipt > 0 ? "Receipt" : "Payment";
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenOverlapScore(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(" ").filter((t) => t.length > 2));
  const tokensB = new Set(normalizeText(b).split(" ").filter((t) => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap += 1;
  }
  return overlap / Math.max(tokensA.size, tokensB.size);
}

function isSimilarNarration(bookNarration: string, stmtNarration: string, referenceNo: string): boolean {
  const book = normalizeText(bookNarration);
  const stmt = normalizeText(`${stmtNarration} ${referenceNo}`);
  if (!book || !stmt) return false;
  if (book.includes(stmt) || stmt.includes(book)) return true;
  if (referenceNo && book.includes(normalizeText(referenceNo))) return true;
  return tokenOverlapScore(bookNarration, `${stmtNarration} ${referenceNo}`) >= 0.35;
}

function bookEntryDirection(entry: BookEntryRow): "receipt" | "payment" {
  return entry.receipt > 0 ? "receipt" : "payment";
}

function statementEntryDirection(entry: BankStatementEntry): "receipt" | "payment" {
  return entry.credit > 0 ? "receipt" : "payment";
}

function statementEntryAmount(entry: BankStatementEntry): number {
  return entry.credit > 0 ? entry.credit : entry.debit;
}

function bookEntryAmount(entry: BookEntryRow): number {
  return entry.receipt > 0 ? entry.receipt : entry.payment;
}

export function getStatementEntriesForBank(bankMasterId: number): BankStatementEntry[] {
  const statementIds = new Set(
    loadBankStatements()
      .filter((s) => s.bankAccountId === bankMasterId)
      .map((s) => s.id),
  );
  return loadBankEntries()
    .filter((e) => statementIds.has(e.statementId))
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
}

export function computeBankStatementClosingBalance(bankMasterId: number): number {
  const entries = getStatementEntriesForBank(bankMasterId);
  if (entries.length === 0) return 0;
  const lastWithBalance = [...entries].reverse().find((e) => e.balance > 0);
  if (lastWithBalance) return lastWithBalance.balance;
  const net = entries.reduce((sum, e) => sum + e.credit - e.debit, 0);
  return Math.max(0, net);
}

function getUsedStatementEntryIds(records: BookReconRecord[]): Set<number> {
  return new Set(
    records
      .filter((r) => r.status === "reconciled" && r.matchedStatementEntryId != null)
      .map((r) => r.matchedStatementEntryId as number),
  );
}

export function findSuggestedMatch(
  bookEntry: BookEntryRow,
  statementEntries: BankStatementEntry[],
  usedStatementIds: Set<number>,
): SuggestedBankMatch | null {
  const amount = bookEntryAmount(bookEntry);
  if (amount <= 0) return null;
  const direction = bookEntryDirection(bookEntry);

  for (const stmt of statementEntries) {
    if (usedStatementIds.has(stmt.id)) continue;
    const stmtAmount = statementEntryAmount(stmt);
    if (Math.abs(stmtAmount - amount) > 0.01) continue;
    if (statementEntryDirection(stmt) !== direction) continue;
    if (!isSimilarNarration(bookEntry.particulars, stmt.narration, stmt.referenceNo)) continue;

    return {
      statementEntryId: stmt.id,
      bankProcessingDate: stmt.transactionDate,
      narration: stmt.narration,
      referenceNo: stmt.referenceNo,
      amount: stmtAmount,
      direction,
    };
  }
  return null;
}

function buildRecordFromBookEntry(
  entry: BookEntryRow,
  bankMasterId: number,
  existing: BookReconRecord | undefined,
  statementEntries: BankStatementEntry[],
  usedStatementIds: Set<number>,
): BookReconRecord {
  const suggested =
    existing?.status === "reconciled"
      ? null
      : findSuggestedMatch(entry, statementEntries, usedStatementIds);

  const bankProcessingDate =
    existing?.status === "reconciled"
      ? existing.bankProcessingDate
      : existing?.bankProcessingDate || suggested?.bankProcessingDate || "";

  return {
    rowKey: entry.rowKey,
    ledgerId: entry.ledgerId,
    bankMasterId,
    voucherId: entry.voucherId,
    voucherNo: entry.voucherNo,
    entryDate: entry.date,
    partyName: entry.particulars,
    voucherTypeLabel: voucherTypeForBookEntry(entry),
    debitAmount: entry.receipt,
    creditAmount: entry.payment,
    narration: entry.particulars,
    bankProcessingDate,
    status: existing?.status ?? "pending",
    reconciledBy: existing?.reconciledBy ?? "",
    reconciledOn: existing?.reconciledOn ?? "",
    remarks: existing?.remarks ?? "",
    suggestedMatch: suggested,
    matchedStatementEntryId: existing?.matchedStatementEntryId ?? null,
  };
}

export function buildManualReconGrid(
  bookEntries: BookEntryRow[],
  coaLedgerId: number,
  closingBookBalance: number,
): { rows: ManualReconGridRow[]; summary: ManualReconSummary } {
  const bankMasterId = resolveBankMasterId(coaLedgerId);
  const records = loadBookReconRecords();
  const statementEntries = bankMasterId ? getStatementEntriesForBank(bankMasterId) : [];
  const usedStatementIds = getUsedStatementEntryIds(records);

  const scopedRecords = records.filter((r) => r.ledgerId === coaLedgerId);
  const recordMap = new Map(scopedRecords.map((r) => [r.rowKey, r]));

  const syncedRecords = [...records.filter((r) => r.ledgerId !== coaLedgerId)];
  const rows: ManualReconGridRow[] = bookEntries.map((entry) => {
    const existing = recordMap.get(entry.rowKey);
    const record = buildRecordFromBookEntry(
      entry,
      bankMasterId ?? 0,
      existing,
      statementEntries,
      usedStatementIds,
    );
    const existingIdx = syncedRecords.findIndex((r) => r.rowKey === record.rowKey);
    if (existingIdx >= 0) syncedRecords[existingIdx] = record;
    else syncedRecords.push(record);
    return {
      ...record,
      isSuggested: record.status === "pending" && !!record.suggestedMatch,
    };
  });
  saveList(RECORDS_KEY, syncedRecords);

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const reconciledCount = rows.filter((r) => r.status === "reconciled").length;
  const balanceAsPerBank = bankMasterId ? computeBankStatementClosingBalance(bankMasterId) : 0;

  return {
    rows,
    summary: {
      balanceAsPerBooks: closingBookBalance,
      balanceAsPerBank,
      difference: closingBookBalance - balanceAsPerBank,
      pendingCount,
      reconciledCount,
    },
  };
}

export function filterManualReconRows(
  rows: ManualReconGridRow[],
  filters: Omit<ManualReconFilters, "coaLedgerId">,
): ManualReconGridRow[] {
  return rows.filter((row) => {
    if (filters.dateFrom && row.entryDate < filters.dateFrom) return false;
    if (filters.dateTo && row.entryDate > filters.dateTo) return false;
    if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.partyName?.trim()) {
      const q = filters.partyName.trim().toLowerCase();
      if (!row.partyName.toLowerCase().includes(q)) return false;
    }
    if (filters.voucherNo?.trim()) {
      const q = filters.voucherNo.trim().toLowerCase();
      if (!row.voucherNo.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function updatePendingBankProcessingDate(
  rowKey: string,
  bankProcessingDate: string,
): { ok: true; record: BookReconRecord } | { ok: false; error: string } {
  const records = loadBookReconRecords();
  const idx = records.findIndex((r) => r.rowKey === rowKey);
  if (idx < 0) return { ok: false, error: "Record not found." };

  const record = records[idx];
  if (record.status === "reconciled") {
    return { ok: false, error: "Bank processing date cannot be edited after reconciliation." };
  }
  if (!bankProcessingDate) {
    return { ok: false, error: "Bank processing date is required." };
  }
  if (bankProcessingDate < record.entryDate) {
    return { ok: false, error: "Bank processing date cannot be earlier than entry date." };
  }

  const previousValues = { bankProcessingDate: record.bankProcessingDate };
  records[idx] = { ...record, bankProcessingDate };
  saveList(RECORDS_KEY, records);

  appendAudit({
    rowKey,
    voucherNo: record.voucherNo,
    action: "bank_date_updated",
    entryDate: record.entryDate,
    bankProcessingDate,
    remarks: record.remarks,
    previousValues,
  });

  return { ok: true, record: records[idx] };
}

export function markBookEntryReconciled(input: {
  rowKey: string;
  bankProcessingDate: string;
  remarks?: string;
  matchedStatementEntryId?: number | null;
}): { ok: true; record: BookReconRecord } | { ok: false; error: string } {
  const records = loadBookReconRecords();
  const idx = records.findIndex((r) => r.rowKey === input.rowKey);
  if (idx < 0) return { ok: false, error: "Record not found." };

  const record = records[idx];
  if (record.status === "reconciled") {
    return { ok: false, error: "This book entry is already reconciled." };
  }
  if (!input.bankProcessingDate?.trim()) {
    return { ok: false, error: "Bank processing date is required." };
  }
  if (input.bankProcessingDate < record.entryDate) {
    return { ok: false, error: "Bank processing date cannot be earlier than entry date." };
  }

  const now = new Date().toISOString();
  const updated: BookReconRecord = {
    ...record,
    bankProcessingDate: input.bankProcessingDate,
    status: "reconciled",
    reconciledBy: ACCOUNTS_CURRENT_USER,
    reconciledOn: now,
    remarks: input.remarks?.trim() ?? record.remarks,
    matchedStatementEntryId:
      input.matchedStatementEntryId ?? record.suggestedMatch?.statementEntryId ?? null,
    suggestedMatch: null,
  };

  records[idx] = updated;
  saveList(RECORDS_KEY, records);

  appendAudit({
    rowKey: record.rowKey,
    voucherNo: record.voucherNo,
    action: "reconciled",
    entryDate: record.entryDate,
    bankProcessingDate: input.bankProcessingDate,
    remarks: updated.remarks,
  });

  return { ok: true, record: updated };
}

function appendAudit(entry: Omit<BookReconAuditEntry, "id" | "reconciledBy" | "reconciledOn">) {
  const audit = loadBookReconAudit();
  audit.unshift({
    ...entry,
    id: nextId(audit),
    reconciledBy: ACCOUNTS_CURRENT_USER,
    reconciledOn: new Date().toISOString(),
  });
  saveList(AUDIT_KEY, audit);
}

export function ensureBookReconRecord(
  entry: BookEntryRow,
  coaLedgerId: number,
): BookReconRecord {
  const records = loadBookReconRecords();
  const existing = records.find((r) => r.rowKey === entry.rowKey);
  if (existing) return existing;

  const bankMasterId = resolveBankMasterId(coaLedgerId) ?? 0;
  const statementEntries = bankMasterId ? getStatementEntriesForBank(bankMasterId) : [];
  const usedStatementIds = getUsedStatementEntryIds(records);
  const record = buildRecordFromBookEntry(
    entry,
    bankMasterId,
    undefined,
    statementEntries,
    usedStatementIds,
  );
  records.push(record);
  saveList(RECORDS_KEY, records);
  return record;
}

export function getAuditForRow(rowKey: string): BookReconAuditEntry[] {
  return loadBookReconAudit().filter((a) => a.rowKey === rowKey);
}
