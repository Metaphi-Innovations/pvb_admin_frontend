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

export type ManualReconVoucherType =
  | "Payment"
  | "Receipt"
  | "Contra"
  | "Journal"
  | "Fund Transfer";

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
}

export interface ManualReconGridRow extends BookReconRecord {}

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
  search?: string;
}

export interface StatementPreviewRow {
  id: number;
  statementDate: string;
  description: string;
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

export function deriveReconStatus(bankProcessingDate: string): BookReconStatus {
  return bankProcessingDate?.trim() ? "reconciled" : "pending";
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

function buildRecordFromBookEntry(
  entry: BookEntryRow,
  bankMasterId: number,
  existing: BookReconRecord | undefined,
): BookReconRecord {
  const debitAmount = entry.receipt;
  const creditAmount = entry.payment;
  const bankProcessingDate = existing?.bankProcessingDate ?? "";
  const status = existing?.status ?? deriveReconStatus(bankProcessingDate);

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
  };
}

export function buildManualReconGrid(
  bookEntries: BookEntryRow[],
  coaLedgerId: number,
  closingBookBalance: number,
): { rows: ManualReconGridRow[]; summary: ManualReconSummary } {
  const bankMasterId = resolveBankMasterId(coaLedgerId);
  const records = loadBookReconRecords();

  const scopedRecords = records.filter((r) => r.ledgerId === coaLedgerId);
  const recordMap = new Map(scopedRecords.map((r) => [r.rowKey, r]));

  const syncedRecords = [...records.filter((r) => r.ledgerId !== coaLedgerId)];
  const rows: ManualReconGridRow[] = bookEntries.map((entry) => {
    const existing = recordMap.get(entry.rowKey);
    const record = buildRecordFromBookEntry(entry, bankMasterId ?? 0, existing);
    const amountError = validateBookAmounts(record.debitAmount, record.creditAmount);
    if (amountError) {
      record.remarks = amountError;
    }
    const existingIdx = syncedRecords.findIndex((r) => r.rowKey === record.rowKey);
    if (existingIdx >= 0) syncedRecords[existingIdx] = record;
    else syncedRecords.push(record);
    return record;
  });
  saveList(RECORDS_KEY, syncedRecords);

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const reconciledCount = rows.filter((r) => r.status === "reconciled").length;
  const balanceAsPerBank = bankMasterId ? getBankStatementBalance(bankMasterId) : 0;

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
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = `${row.partyName} ${row.voucherNo} ${row.voucherTypeLabel} ${row.narration}`.toLowerCase();
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
  rowDates: { rowKey: string; bankProcessingDate: string }[];
  bankStatementBalance?: number;
}): { ok: true; summary: ManualReconSummary } | { ok: false; error: string } {
  const records = loadBookReconRecords();
  const bankMasterId = resolveBankMasterId(input.coaLedgerId);
  if (!bankMasterId) {
    return { ok: false, error: "Bank account is required." };
  }

  const dateMap = new Map(input.rowDates.map((r) => [r.rowKey, r.bankProcessingDate.trim()]));

  for (const { rowKey, bankProcessingDate } of input.rowDates) {
    const record = records.find((r) => r.rowKey === rowKey);
    if (!record) continue;
    const error = validateBankProcessingDate(record.entryDate, bankProcessingDate);
    if (error) return { ok: false, error: `${record.voucherNo}: ${error}` };
    const amountError = validateBookAmounts(record.debitAmount, record.creditAmount);
    if (amountError) return { ok: false, error: `${record.voucherNo}: ${amountError}` };
  }

  const now = new Date().toISOString();
  const updated = records.map((record) => {
    if (record.ledgerId !== input.coaLedgerId) return record;
    if (!dateMap.has(record.rowKey)) return record;

    const bankProcessingDate = dateMap.get(record.rowKey) ?? "";
    const status = deriveReconStatus(bankProcessingDate);
    const wasReconciled = record.status === "reconciled";
    const isReconciled = status === "reconciled";

    if (bankProcessingDate !== record.bankProcessingDate) {
      appendAudit({
        rowKey: record.rowKey,
        voucherNo: record.voucherNo,
        action: isReconciled ? "reconciled" : "pending",
        entryDate: record.entryDate,
        bankProcessingDate,
        remarks: record.remarks,
      });
    } else if (!wasReconciled && isReconciled) {
      appendAudit({
        rowKey: record.rowKey,
        voucherNo: record.voucherNo,
        action: "reconciled",
        entryDate: record.entryDate,
        bankProcessingDate,
        remarks: record.remarks,
      });
    }

    return {
      ...record,
      bankProcessingDate,
      status,
      reconciledBy: isReconciled ? ACCOUNTS_CURRENT_USER : "",
      reconciledOn: isReconciled ? now : "",
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
    },
  };
}

export function getAuditForRow(rowKey: string): BookReconAuditEntry[] {
  return loadBookReconAudit().filter((a) => a.rowKey === rowKey);
}

/** Single-row reconcile helper (legacy sheet support). */
export function markBookEntryReconciled(input: {
  rowKey: string;
  bankProcessingDate: string;
  remarks?: string;
}): { ok: true; record: BookReconRecord } | { ok: false; error: string } {
  const records = loadBookReconRecords();
  const record = records.find((r) => r.rowKey === input.rowKey);
  if (!record) return { ok: false, error: "Record not found." };

  const result = saveManualReconciliation({
    coaLedgerId: record.ledgerId,
    closingBookBalance: 0,
    rowDates: [{ rowKey: input.rowKey, bankProcessingDate: input.bankProcessingDate }],
  });
  if (!result.ok) return result;

  const updated = loadBookReconRecords().find((r) => r.rowKey === input.rowKey);
  if (!updated) return { ok: false, error: "Record not found." };
  if (input.remarks?.trim()) {
    const all = loadBookReconRecords();
    const idx = all.findIndex((r) => r.rowKey === input.rowKey);
    if (idx >= 0) {
      all[idx] = { ...all[idx], remarks: input.remarks.trim() };
      saveList(RECORDS_KEY, all);
    }
  }
  return { ok: true, record: updated };
}
