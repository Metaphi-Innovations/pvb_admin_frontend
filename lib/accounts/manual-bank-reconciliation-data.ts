import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "@/app/(app)/accounts/data";
import type { BookEntryRow } from "@/lib/accounts/banking-book-utils";
import { loadBankAccountsForReconciliation } from "@/lib/accounts/bank-accounts-data";
import {
  loadBankEntries,
  loadBankStatements,
  type BankStatementEntry,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";

export type BookReconStatus = "pending" | "reconciled" | "unmatched" | "difference";

export type ManualReconVoucherType =
  | "Payment"
  | "Receipt"
  | "Contra"
  | "Journal"
  | "Fund Transfer";

export type DifferenceReason =
  | ""
  | "date_difference"
  | "bank_charges"
  | "tds_difference"
  | "gst_difference"
  | "amount_difference"
  | "direct_bank_entry"
  | "other";

export const DIFFERENCE_REASON_OPTIONS: { value: DifferenceReason; label: string }[] = [
  { value: "", label: "Select reason" },
  { value: "date_difference", label: "Date Difference" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "tds_difference", label: "TDS Difference" },
  { value: "gst_difference", label: "GST Difference" },
  { value: "amount_difference", label: "Amount Difference" },
  { value: "direct_bank_entry", label: "Direct Bank Entry" },
  { value: "other", label: "Other" },
];

export function differenceReasonLabel(reason: DifferenceReason): string {
  return DIFFERENCE_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? "";
}

export interface BookReconRecord {
  rowKey: string;
  ledgerId: number;
  bankMasterId: number;
  voucherId: number;
  voucherNo: string;
  entryDate: string;
  partyName: string;
  voucherTypeLabel: ManualReconVoucherType;
  debitAmount: number;
  creditAmount: number;
  narration: string;
  bankProcessingDate: string;
  status: BookReconStatus;
  reconciledBy: string;
  reconciledOn: string;
  remarks: string;
  differenceReason: DifferenceReason;
  matchedStatementEntryId: number | null;
  matchedStatementRef: string;
  differenceAmount: number;
  bankName: string;
}

export interface ManualReconGridRow extends BookReconRecord {
  suggestedStatementMatch: SuggestedMatch | null;
  /** Book voucher row vs unmatched bank-statement line shown in the same grid */
  rowSource?: "book" | "statement";
}

export interface SuggestedMatch {
  statementEntryId: number;
  statementDate: string;
  statementRef: string;
  statementNarration: string;
  statementAmount: number;
  matchScore: number;
  matchType: "exact" | "amount" | "reference" | "date_near";
}

export interface ManualReconSummary {
  balanceAsPerBooks: number;
  balanceAsPerBank: number;
  difference: number;
  pendingCount: number;
  reconciledCount: number;
  unmatchedCount: number;
  differenceCount: number;
  totalCount: number;
}

export interface ManualReconFilters {
  coaLedgerId: number;
  dateFrom?: string;
  dateTo?: string;
  status?: "all" | BookReconStatus;
  search?: string;
}

export interface StatementPreviewRow {
  id: number;
  statementDate: string;
  description: string;
  referenceNo: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
}

const RECORDS_KEY = "ds_manual_bank_recon_records_v1";
const AUDIT_KEY = "ds_manual_bank_recon_audit_v1";
const BANK_BALANCE_KEY = "ds_manual_bank_recon_balance_v1";

export interface BookReconAuditEntry {
  id: number;
  rowKey: string;
  voucherNo: string;
  action: "reconciled" | "pending" | "bank_date_updated";
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

interface BankBalanceOverride {
  bankMasterId: number;
  balance: number;
  updatedAt: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function formatAccountsDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function isoFromInputDate(value: string): string {
  return value;
}

export function deriveReconStatus(
  bankProcessingDate: string,
  differenceAmount?: number,
  matchedStatementEntryId?: number | null,
): BookReconStatus {
  if (bankProcessingDate?.trim()) {
    if (differenceAmount && Math.abs(differenceAmount) > 0.01) return "difference";
    return "reconciled";
  }
  if (matchedStatementEntryId) return "pending";
  return "unmatched";
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

export function manualReconVoucherType(entry: BookEntryRow): ManualReconVoucherType {
  if (entry.voucherTypeLabel === "Fund Transfer") return "Fund Transfer";
  if (entry.voucherType === "contra") return "Contra";
  if (
    entry.voucherTypeLabel === "Journal Voucher" ||
    entry.voucherTypeLabel === "Bank Charges" ||
    entry.voucherTypeLabel === "Interest Credit" ||
    entry.voucherType === "journal"
  ) {
    return "Journal";
  }
  if (entry.receipt > 0 || entry.voucherType === "receipt") return "Receipt";
  return "Payment";
}

export function validateBankProcessingDate(
  entryDate: string,
  bankProcessingDate: string,
): string | null {
  if (!bankProcessingDate?.trim()) return null;
  if (bankProcessingDate < entryDate) {
    return "Bank processing date cannot be earlier than entry date.";
  }
  if (bankProcessingDate > todayIso()) {
    return "Bank processing date cannot be a future date.";
  }
  return null;
}

export function validateBookAmounts(debitAmount: number, creditAmount: number): string | null {
  if (debitAmount > 0 && creditAmount > 0) {
    return "Debit and credit cannot both have values in the same row.";
  }
  return null;
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

export function buildStatementPreviewRows(bankMasterId: number): StatementPreviewRow[] {
  return getStatementEntriesForBank(bankMasterId).map((entry) => ({
    id: entry.id,
    statementDate: entry.transactionDate,
    description: entry.narration,
    referenceNo: entry.referenceNo,
    debitAmount: entry.debit,
    creditAmount: entry.credit,
    balance: entry.balance,
  }));
}

export function computeBankStatementClosingBalance(bankMasterId: number): number {
  const entries = getStatementEntriesForBank(bankMasterId);
  if (entries.length === 0) return 0;
  const lastWithBalance = [...entries].reverse().find((e) => e.balance > 0);
  if (lastWithBalance) return lastWithBalance.balance;
  const net = entries.reduce((sum, e) => sum + e.credit - e.debit, 0);
  return Math.max(0, net);
}

function loadBankBalanceOverrides(): BankBalanceOverride[] {
  return getOrSeed<BankBalanceOverride>(BANK_BALANCE_KEY, []);
}

export function getBankStatementBalance(bankMasterId: number): number {
  const override = loadBankBalanceOverrides().find((o) => o.bankMasterId === bankMasterId);
  if (override) return override.balance;
  return computeBankStatementClosingBalance(bankMasterId);
}

export function saveBankStatementBalance(bankMasterId: number, balance: number): void {
  const list = loadBankBalanceOverrides().filter((o) => o.bankMasterId !== bankMasterId);
  list.push({
    bankMasterId,
    balance,
    updatedAt: new Date().toISOString(),
  });
  saveList(BANK_BALANCE_KEY, list);
}

function dateDiffDays(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  return Math.abs(Math.round((da.getTime() - db.getTime()) / 86400000));
}

function normalizeRef(ref: string): string {
  return ref.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function findSuggestedMatch(
  bookRow: { entryDate: string; debitAmount: number; creditAmount: number; voucherNo: string; partyName: string },
  statementEntries: BankStatementEntry[],
  alreadyMatchedIds: Set<number>,
): SuggestedMatch | null {
  const bookAmount = bookRow.debitAmount || bookRow.creditAmount;
  if (!bookAmount) return null;
  const bookIsDebit = bookRow.debitAmount > 0;
  const bookRef = normalizeRef(bookRow.voucherNo);
  const bookParty = bookRow.partyName.toLowerCase();

  let bestMatch: SuggestedMatch | null = null;
  let bestScore = 0;

  for (const entry of statementEntries) {
    if (alreadyMatchedIds.has(entry.id)) continue;
    const stmtAmount = bookIsDebit ? entry.credit : entry.debit;
    if (!stmtAmount) continue;

    let score = 0;
    let matchType: SuggestedMatch["matchType"] = "date_near";

    if (Math.abs(stmtAmount - bookAmount) < 0.01) {
      score += 50;
      matchType = "amount";
    } else {
      continue;
    }

    const stmtRef = normalizeRef(entry.referenceNo);
    if (bookRef && stmtRef && (stmtRef.includes(bookRef) || bookRef.includes(stmtRef))) {
      score += 30;
      matchType = "reference";
    }

    const stmtNarration = entry.narration.toLowerCase();
    if (bookParty && stmtNarration.includes(bookParty.split(" ")[0])) {
      score += 10;
    }

    const daysDiff = dateDiffDays(bookRow.entryDate, entry.transactionDate);
    if (daysDiff <= 7) {
      score += Math.max(0, 20 - daysDiff * 2);
      if (daysDiff === 0 && score >= 50) matchType = "exact";
    } else {
      score -= 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        statementEntryId: entry.id,
        statementDate: entry.transactionDate,
        statementRef: entry.referenceNo,
        statementNarration: entry.narration,
        statementAmount: stmtAmount,
        matchScore: score,
        matchType: score >= 80 ? "exact" : matchType,
      };
    }
  }

  return bestScore >= 40 ? bestMatch : null;
}

function buildRecordFromStatementEntry(
  entry: BankStatementEntry,
  bankMasterId: number,
  coaLedgerId: number,
  bankName: string,
  existing: BookReconRecord | undefined,
): BookReconRecord {
  const debitAmount = entry.debit || 0;
  const creditAmount = entry.credit || 0;
  const bankProcessingDate = existing?.bankProcessingDate ?? "";
  const differenceAmount = existing?.differenceAmount ?? 0;
  const matchedStatementEntryId = entry.id;
  const status =
    existing?.status ??
    deriveReconStatus(bankProcessingDate, differenceAmount, matchedStatementEntryId);

  return {
    rowKey: `stmt-${entry.id}`,
    ledgerId: coaLedgerId,
    bankMasterId,
    voucherId: 0,
    voucherNo: entry.referenceNo || `STMT-${entry.id}`,
    entryDate: entry.transactionDate,
    partyName: entry.narration.slice(0, 80),
    voucherTypeLabel: creditAmount > 0 ? "Receipt" : "Payment",
    debitAmount,
    creditAmount,
    narration: entry.narration,
    bankProcessingDate,
    status,
    reconciledBy: existing?.reconciledBy ?? "",
    reconciledOn: existing?.reconciledOn ?? "",
    remarks: existing?.remarks ?? "",
    differenceReason: existing?.differenceReason ?? "",
    matchedStatementEntryId,
    matchedStatementRef: entry.referenceNo,
    differenceAmount,
    bankName,
  };
}

function buildRecordFromBookEntry(
  entry: BookEntryRow,
  bankMasterId: number,
  bankName: string,
  existing: BookReconRecord | undefined,
): BookReconRecord {
  const debitAmount = entry.receipt;
  const creditAmount = entry.payment;
  const bankProcessingDate = existing?.bankProcessingDate ?? "";
  const differenceAmount = existing?.differenceAmount ?? 0;
  const matchedStatementEntryId = existing?.matchedStatementEntryId ?? null;
  const status = existing?.status ?? deriveReconStatus(bankProcessingDate, differenceAmount, matchedStatementEntryId);

  return {
    rowKey: entry.rowKey,
    ledgerId: entry.ledgerId,
    bankMasterId,
    voucherId: entry.voucherId,
    voucherNo: entry.voucherNo,
    entryDate: entry.date,
    partyName: entry.particulars,
    voucherTypeLabel: manualReconVoucherType(entry),
    debitAmount,
    creditAmount,
    narration: entry.particulars,
    bankProcessingDate,
    status,
    reconciledBy: existing?.reconciledBy ?? "",
    reconciledOn: existing?.reconciledOn ?? "",
    remarks: existing?.remarks ?? "",
    differenceReason: existing?.differenceReason ?? "",
    matchedStatementEntryId,
    matchedStatementRef: existing?.matchedStatementRef ?? "",
    differenceAmount,
    bankName,
  };
}

export function buildManualReconGrid(
  bookEntries: BookEntryRow[],
  coaLedgerId: number,
  closingBookBalance: number,
  bankMasterIdInput: number | null,
  bankName: string,
): { rows: ManualReconGridRow[]; summary: ManualReconSummary } {
  const bankMasterId = bankMasterIdInput ?? resolveBankMasterId(coaLedgerId);
  const records = loadBookReconRecords();
  const statementEntries = bankMasterId ? getStatementEntriesForBank(bankMasterId) : [];

  const scopedRecords = records.filter((r) => r.ledgerId === coaLedgerId);
  const recordMap = new Map(scopedRecords.map((r) => [r.rowKey, r]));

  const alreadyMatchedIds = new Set<number>();
  for (const rec of scopedRecords) {
    if (rec.matchedStatementEntryId) alreadyMatchedIds.add(rec.matchedStatementEntryId);
  }

  const syncedRecords = [...records.filter((r) => r.ledgerId !== coaLedgerId)];
  const rows: ManualReconGridRow[] = bookEntries.map((entry) => {
    const existing = recordMap.get(entry.rowKey);
    const record = buildRecordFromBookEntry(entry, bankMasterId ?? 0, bankName, existing);
    const amountError = validateBookAmounts(record.debitAmount, record.creditAmount);
    if (amountError) {
      record.remarks = amountError;
    }
    const existingIdx = syncedRecords.findIndex((r) => r.rowKey === record.rowKey);
    if (existingIdx >= 0) syncedRecords[existingIdx] = record;
    else syncedRecords.push(record);

    const suggestedStatementMatch =
      record.status === "unmatched" && statementEntries.length > 0
        ? findSuggestedMatch(record, statementEntries, alreadyMatchedIds)
        : null;

    if (suggestedStatementMatch) {
      alreadyMatchedIds.add(suggestedStatementMatch.statementEntryId);
    }

    return { ...record, suggestedStatementMatch, rowSource: "book" as const };
  });

  const bookMatchedStmtIds = new Set<number>();
  for (const row of rows) {
    if (row.matchedStatementEntryId) bookMatchedStmtIds.add(row.matchedStatementEntryId);
  }
  for (const rec of scopedRecords) {
    if (rec.matchedStatementEntryId && !rec.rowKey.startsWith("stmt-")) {
      bookMatchedStmtIds.add(rec.matchedStatementEntryId);
    }
  }

  const statementRows: ManualReconGridRow[] = [];
  for (const entry of statementEntries) {
    if (bookMatchedStmtIds.has(entry.id)) continue;
    const rowKey = `stmt-${entry.id}`;
    const existing = recordMap.get(rowKey) ?? records.find((r) => r.rowKey === rowKey);
    const record = buildRecordFromStatementEntry(entry, bankMasterId ?? 0, coaLedgerId, bankName, existing);
    const existingIdx = syncedRecords.findIndex((r) => r.rowKey === record.rowKey);
    if (existingIdx >= 0) syncedRecords[existingIdx] = record;
    else syncedRecords.push(record);
    statementRows.push({ ...record, suggestedStatementMatch: null, rowSource: "statement" });
  }
  saveList(RECORDS_KEY, syncedRecords);

  const allRows = [...rows, ...statementRows].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate) || a.rowKey.localeCompare(b.rowKey),
  );

  const pendingCount = allRows.filter((r) => r.status === "pending").length;
  const reconciledCount = allRows.filter((r) => r.status === "reconciled").length;
  const unmatchedCount = allRows.filter((r) => r.status === "unmatched").length;
  const differenceCount = allRows.filter((r) => r.status === "difference").length;
  const balanceAsPerBank = bankMasterId ? getBankStatementBalance(bankMasterId) : 0;

  return {
    rows: allRows,
    summary: {
      balanceAsPerBooks: closingBookBalance,
      balanceAsPerBank,
      difference: closingBookBalance - balanceAsPerBank,
      pendingCount,
      reconciledCount,
      unmatchedCount,
      differenceCount,
      totalCount: allRows.length,
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
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const amountStr = `${row.debitAmount} ${row.creditAmount}`;
      const hay = `${row.partyName} ${row.voucherNo} ${row.voucherTypeLabel} ${row.narration} ${row.matchedStatementRef} ${amountStr}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
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

export function saveManualReconciliation(input: {
  coaLedgerId: number;
  closingBookBalance: number;
  rowUpdates: {
    rowKey: string;
    bankProcessingDate: string;
    matchedStatementEntryId?: number | null;
    matchedStatementRef?: string;
    differenceReason?: DifferenceReason;
    differenceAmount?: number;
    remarks?: string;
  }[];
  bankStatementBalance?: number;
}): { ok: true; summary: ManualReconSummary } | { ok: false; error: string } {
  const records = loadBookReconRecords();
  const bankMasterId = resolveBankMasterId(input.coaLedgerId);
  if (!bankMasterId) {
    return { ok: false, error: "Bank account is required." };
  }

  const updateMap = new Map(input.rowUpdates.map((r) => [r.rowKey, r]));

  for (const upd of input.rowUpdates) {
    const record = records.find((r) => r.rowKey === upd.rowKey);
    if (!record) continue;
    if (upd.bankProcessingDate) {
      const error = validateBankProcessingDate(record.entryDate, upd.bankProcessingDate);
      if (error) return { ok: false, error: `${record.voucherNo}: ${error}` };
    }
  }

  const now = new Date().toISOString();
  const updated = records.map((record) => {
    if (record.ledgerId !== input.coaLedgerId) return record;
    const upd = updateMap.get(record.rowKey);
    if (!upd) return record;

    const bankProcessingDate = upd.bankProcessingDate ?? record.bankProcessingDate;
    const differenceAmount = upd.differenceAmount ?? record.differenceAmount ?? 0;
    const matchedStatementEntryId = upd.matchedStatementEntryId ?? record.matchedStatementEntryId;
    const status = deriveReconStatus(bankProcessingDate, differenceAmount, matchedStatementEntryId);
    const wasReconciled = record.status === "reconciled";
    const isReconciled = status === "reconciled";

    if (bankProcessingDate !== record.bankProcessingDate) {
      appendAudit({
        rowKey: record.rowKey,
        voucherNo: record.voucherNo,
        action: isReconciled ? "reconciled" : "pending",
        entryDate: record.entryDate,
        bankProcessingDate,
        remarks: upd.remarks ?? record.remarks,
      });
    } else if (!wasReconciled && isReconciled) {
      appendAudit({
        rowKey: record.rowKey,
        voucherNo: record.voucherNo,
        action: "reconciled",
        entryDate: record.entryDate,
        bankProcessingDate,
        remarks: upd.remarks ?? record.remarks,
      });
    }

    return {
      ...record,
      bankProcessingDate,
      status,
      reconciledBy: isReconciled ? ACCOUNTS_CURRENT_USER : "",
      reconciledOn: isReconciled ? now : "",
      matchedStatementEntryId: upd.matchedStatementEntryId ?? record.matchedStatementEntryId,
      matchedStatementRef: upd.matchedStatementRef ?? record.matchedStatementRef,
      differenceReason: upd.differenceReason ?? record.differenceReason,
      differenceAmount,
      remarks: upd.remarks ?? record.remarks,
    };
  });

  saveList(RECORDS_KEY, updated);

  if (input.bankStatementBalance != null && !Number.isNaN(input.bankStatementBalance)) {
    saveBankStatementBalance(bankMasterId, input.bankStatementBalance);
  }

  const scoped = updated.filter((r) => r.ledgerId === input.coaLedgerId);
  const balanceAsPerBank = getBankStatementBalance(bankMasterId);

  return {
    ok: true,
    summary: {
      balanceAsPerBooks: input.closingBookBalance,
      balanceAsPerBank,
      difference: input.closingBookBalance - balanceAsPerBank,
      pendingCount: scoped.filter((r) => r.status === "pending").length,
      reconciledCount: scoped.filter((r) => r.status === "reconciled").length,
      unmatchedCount: scoped.filter((r) => r.status === "unmatched").length,
      differenceCount: scoped.filter((r) => r.status === "difference").length,
      totalCount: scoped.length,
    },
  };
}

export function getAuditForRow(rowKey: string): BookReconAuditEntry[] {
  return loadBookReconAudit().filter((a) => a.rowKey === rowKey);
}

export function reconcileSingleRow(input: {
  rowKey: string;
  bankProcessingDate: string;
  matchedStatementEntryId?: number | null;
  matchedStatementRef?: string;
  differenceReason?: DifferenceReason;
  differenceAmount?: number;
  remarks?: string;
}): { ok: true; record: BookReconRecord } | { ok: false; error: string } {
  const records = loadBookReconRecords();
  const record = records.find((r) => r.rowKey === input.rowKey);
  if (!record) return { ok: false, error: "Record not found." };

  const error = validateBankProcessingDate(record.entryDate, input.bankProcessingDate);
  if (error) return { ok: false, error };

  const differenceAmount = input.differenceAmount ?? 0;
  const status = deriveReconStatus(input.bankProcessingDate, differenceAmount, input.matchedStatementEntryId);
  const now = new Date().toISOString();

  appendAudit({
    rowKey: record.rowKey,
    voucherNo: record.voucherNo,
    action: status === "reconciled" ? "reconciled" : "bank_date_updated",
    entryDate: record.entryDate,
    bankProcessingDate: input.bankProcessingDate,
    remarks: input.remarks ?? "",
  });

  const idx = records.findIndex((r) => r.rowKey === input.rowKey);
  records[idx] = {
    ...record,
    bankProcessingDate: input.bankProcessingDate,
    status,
    reconciledBy: status === "reconciled" ? ACCOUNTS_CURRENT_USER : "",
    reconciledOn: status === "reconciled" ? now : "",
    matchedStatementEntryId: input.matchedStatementEntryId ?? record.matchedStatementEntryId,
    matchedStatementRef: input.matchedStatementRef ?? record.matchedStatementRef,
    differenceReason: input.differenceReason ?? record.differenceReason,
    differenceAmount,
    remarks: input.remarks ?? record.remarks,
  };

  saveList(RECORDS_KEY, records);
  return { ok: true, record: records[idx] };
}

/** Legacy compat alias */
export function markBookEntryReconciled(input: {
  rowKey: string;
  bankProcessingDate: string;
  remarks?: string;
}): { ok: true; record: BookReconRecord } | { ok: false; error: string } {
  return reconcileSingleRow(input);
}
