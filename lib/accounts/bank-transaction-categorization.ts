/**
 * Bank Transaction Categorization - Manual categorization workflow
 * Similar to Zoho Books categorization, but WITHOUT auto-matching in Phase 1
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import {
  loadVouchers,
  saveVouchers,
  type AccountingVoucher,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { getBankAccountByLedgerId, loadBankAccountMasters, type BankAccountMaster } from "./bank-accounts-data";
import { formatBankAccountMaster } from "./bank-account-display";

// ====================================================================
// TRANSACTION CATEGORY TYPES
// ====================================================================

export type TransactionCategory =
  | "customer_receipt"
  | "vendor_payment"
  | "expense"
  | "salary"
  | "employee_advance"
  | "gst_payment"
  | "tds_payment"
  | "loan_received"
  | "loan_repaid"
  | "bank_charges"
  | "interest_income"
  | "transfer"
  | "other_receipt"
  | "other_payment";

export type TransactionStatus = "uncategorized" | "categorized" | "reconciled";

export const TRANSACTION_CATEGORIES: { value: TransactionCategory; label: string; type: "receipt" | "payment" }[] = [
  { value: "customer_receipt", label: "Customer Receipt", type: "receipt" },
  { value: "vendor_payment", label: "Supplier Payment", type: "payment" },
  { value: "expense", label: "Expense", type: "payment" },
  { value: "salary", label: "Salary", type: "payment" },
  { value: "employee_advance", label: "Employee Advance", type: "payment" },
  { value: "gst_payment", label: "GST Payment", type: "payment" },
  { value: "tds_payment", label: "TDS Payment", type: "payment" },
  { value: "loan_received", label: "Loan Received", type: "receipt" },
  { value: "loan_repaid", label: "Loan Repaid", type: "payment" },
  { value: "bank_charges", label: "Bank Charges", type: "payment" },
  { value: "interest_income", label: "Interest Income", type: "receipt" },
  { value: "transfer", label: "Transfer", type: "payment" },
  { value: "other_receipt", label: "Other Receipt", type: "receipt" },
  { value: "other_payment", label: "Other Payment", type: "payment" },
];

// ====================================================================
// BANK TRANSACTION DATA MODEL
// ====================================================================

export interface BankTransaction {
  id: number;
  bankAccountId: number;
  bankAccountName: string;
  transactionDate: string;
  narration: string;
  referenceNo: string;
  debit: number;
  credit: number;
  balance: number;
  category: TransactionCategory | "";
  ledgerId: number | null;
  ledgerName: string;
  remarks: string;
  status: TransactionStatus;
  journalEntryId: number | null;
  categorizedBy: string;
  categorizedAt: string;
  reconciledBy: string;
  reconciledAt: string;
  importedFrom: string;
  createdBy: string;
  createdAt: string;
}

const STORAGE_KEY = "ds_bank_transactions_v1";

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

export function loadBankTransactions(): BankTransaction[] {
  return getOrSeed(STORAGE_KEY, []);
}

export function saveBankTransactions(list: BankTransaction[]) {
  saveList(STORAGE_KEY, list);
}

export function getBankTransactionById(id: number): BankTransaction | undefined {
  return loadBankTransactions().find((t) => t.id === id);
}

// ====================================================================
// TRANSACTION IMPORT FROM STATEMENT
// ====================================================================

export interface ImportTransactionsInput {
  bankAccountId: number;
  file: File;
  statementMonth: number;
  statementYear: number;
}

function parseAmount(val: unknown): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return Math.abs(val);
  const s = String(val).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const DATE_HEADER_KEYS = new Set([
  "transactiondate",
  "txndate",
  "date",
  "valuedate",
  "valuedt",
  "trandate",
  "postdate",
  "postingdate",
  "bookdate",
]);

const DEBIT_HEADER_KEYS = new Set([
  "debit",
  "withdrawal",
  "withdrawalamt",
  "withdrawalamount",
  "withdrawalamountinr",
  "debitamount",
  "dr",
  "amountdebited",
]);

const CREDIT_HEADER_KEYS = new Set([
  "credit",
  "deposit",
  "depositamt",
  "depositamount",
  "depositamountinr",
  "creditamount",
  "cr",
  "amountcredited",
]);

function parseTransactionDate(dateRaw: unknown): string | null {
  if (dateRaw == null || dateRaw === "") return null;
  if (dateRaw instanceof Date && !Number.isNaN(dateRaw.getTime())) {
    return dateRaw.toISOString().slice(0, 10);
  }
  let transactionDate = String(dateRaw).trim();
  if (!transactionDate) return null;
  if (transactionDate.includes("/") || transactionDate.includes("-")) {
    const parts = transactionDate.split(/[/-]/).map((p) => p.trim());
    if (parts.length === 3) {
      const p0 = parts[0];
      const p1 = parts[1];
      const p2 = parts[2];
      if (p0.length === 4 && parseInt(p0, 10) > 1900) {
        transactionDate = `${p0}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}`;
      } else {
        const year = p2.length === 2 ? `20${p2}` : p2;
        const day = parseInt(p0, 10);
        const month = parseInt(p1, 10);
        transactionDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }
  return transactionDate;
}

export async function importBankStatement(input: ImportTransactionsInput): Promise<{ imported: number; skipped: number }> {
  const XLSX = await import("xlsx");
  const buf = await input.file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
  
  if (!aoa.length) return { imported: 0, skipped: 0 };

  // Find header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    const row = aoa[i];
    if (!row?.length) continue;
    const headers = row.map((c) => String(c ?? "").trim());
    const norm = headers.map(normalizeHeader).filter(Boolean);
    const hasDate = norm.some((h) => DATE_HEADER_KEYS.has(h));
    const hasMoney = norm.some((h) => DEBIT_HEADER_KEYS.has(h) || CREDIT_HEADER_KEYS.has(h));
    if (hasDate && hasMoney) {
      headerIdx = i;
      break;
    }
  }

  const headerRow = aoa[headerIdx] ?? [];
  const headers = headerRow.map((c, i) => String(c ?? "").trim() || `Column_${i + 1}`);
  
  const transactions = loadBankTransactions();
  const bankAccount = loadBankAccountMasters().find((b) => b.id === input.bankAccountId);
  if (!bankAccount) throw new Error("Bank account not found");

  let imported = 0;
  let skipped = 0;
  const now = new Date().toISOString();
  const baseId = nextId(transactions);

  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row?.length) continue;

    const map: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const key = normalizeHeader(h);
      map[key] = row[i] ?? "";
    });

    const getByKeys = (keys: Set<string>) => {
      for (const nk of keys) {
        if (map[nk] != null && map[nk] !== "") return map[nk];
      }
      for (const [nk, val] of Object.entries(map)) {
        if (val == null || val === "") continue;
        if ([...keys].some((key) => nk.includes(key) || key.includes(nk))) return val;
      }
      return undefined;
    };

    const dateRaw = getByKeys(DATE_HEADER_KEYS);
    const parsedDate = parseTransactionDate(dateRaw);
    if (!parsedDate) {
      skipped++;
      continue;
    }

    const debit = parseAmount(getByKeys(DEBIT_HEADER_KEYS));
    const credit = parseAmount(getByKeys(CREDIT_HEADER_KEYS));
    if (debit === 0 && credit === 0) {
      skipped++;
      continue;
    }

    const balance = parseAmount(
      getByKeys(new Set(["balance", "closingbalance", "runningbalance"]))
    );
    const narration = String(
      getByKeys(new Set(["narration", "description", "particulars", "remarks"])) ?? ""
    ).trim() || "—";
    const referenceNo = String(
      getByKeys(new Set(["referenceno", "referencenumber", "chqrefno", "utr", "ref"])) ?? ""
    ).trim();

    transactions.push({
      id: baseId + imported,
      bankAccountId: input.bankAccountId,
      bankAccountName: formatBankAccountMaster(bankAccount),
      transactionDate: parsedDate,
      narration,
      referenceNo,
      debit,
      credit,
      balance,
      category: "",
      ledgerId: null,
      ledgerName: "",
      remarks: "",
      status: "uncategorized",
      journalEntryId: null,
      categorizedBy: "",
      categorizedAt: "",
      reconciledBy: "",
      reconciledAt: "",
      importedFrom: input.file.name,
      createdBy: ACCOUNTS_CURRENT_USER,
      createdAt: now,
    });
    imported++;
  }

  saveBankTransactions(transactions);
  return { imported, skipped };
}

// ====================================================================
// TRANSACTION CATEGORIZATION
// ====================================================================

export interface CategorizationInput {
  transactionId: number;
  category: TransactionCategory;
  ledgerId: number;
  amount: number;
  narration?: string;
  remarks?: string;
}

function createJournalEntry(
  transaction: BankTransaction,
  category: TransactionCategory,
  ledger: ChartOfAccount,
  bankLedger: ChartOfAccount,
  amount: number,
  narration: string,
): AccountingVoucher {
  const vouchers = loadVouchers();
  const voucherId = nextId(vouchers);
  const now = new Date().toISOString();
  const date = transaction.transactionDate;

  // Determine Dr/Cr sides based on category
  const isReceipt = transaction.credit > 0;
  
  const lines: VoucherLine[] = [];

  if (isReceipt) {
    // Receipt: Bank Dr, Ledger Cr
    lines.push({
      id: 1,
      ledgerId: bankLedger.id,
      ledgerName: bankLedger.accountName,
      debit: amount,
      credit: 0,
      remarks: "",
    });
    lines.push({
      id: 2,
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      debit: 0,
      credit: amount,
      remarks: "",
    });
  } else {
    // Payment: Ledger Dr, Bank Cr
    lines.push({
      id: 1,
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      debit: amount,
      credit: 0,
      remarks: "",
    });
    lines.push({
      id: 2,
      ledgerId: bankLedger.id,
      ledgerName: bankLedger.accountName,
      debit: 0,
      credit: amount,
      remarks: "",
    });
  }

  const voucher: AccountingVoucher = {
    id: voucherId,
    voucherType: "journal",
    voucherNumber: `BK-${String(voucherId).padStart(6, "0")}`,
    date,
    financialYearId: null,
    financialYearName: "",
    referenceNo: transaction.referenceNo,
    narration: narration || `${isReceipt ? "Receipt" : "Payment"}: ${transaction.narration}`,
    lines,
    totalDebit: amount,
    totalCredit: amount,
    status: "posted",
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };

  return voucher;
}

export function categorizeTransaction(input: CategorizationInput): { success: boolean; error?: string } {
  const transactions = loadBankTransactions();
  const idx = transactions.findIndex((t) => t.id === input.transactionId);
  if (idx < 0) return { success: false, error: "Transaction not found" };

  const transaction = transactions[idx];
  const records = loadChartOfAccounts();
  const ledger = records.find((r) => r.id === input.ledgerId);
  if (!ledger) return { success: false, error: "Ledger not found" };

  const bankAccount = loadBankAccountMasters().find((b) => b.id === transaction.bankAccountId);
  if (!bankAccount) return { success: false, error: "Bank account not found" };

  const bankLedger = records.find((r) => r.id === bankAccount.coaLedgerId);
  if (!bankLedger) return { success: false, error: "Bank ledger not found in COA" };

  // Create journal entry
  const amount = input.amount || transaction.debit || transaction.credit;
  const narration = input.narration || transaction.narration;
  const journalVoucher = createJournalEntry(transaction, input.category, ledger, bankLedger, amount, narration);
  
  const vouchers = loadVouchers();
  vouchers.push(journalVoucher);
  saveVouchers(vouchers);

  // Update transaction
  const now = new Date().toISOString();
  transactions[idx] = {
    ...transaction,
    category: input.category,
    ledgerId: input.ledgerId,
    ledgerName: ledger.accountName,
    remarks: input.remarks || transaction.remarks,
    status: "categorized",
    journalEntryId: journalVoucher.id,
    categorizedBy: ACCOUNTS_CURRENT_USER,
    categorizedAt: now,
  };
  saveBankTransactions(transactions);

  return { success: true };
}

export function reconcileTransaction(transactionId: number): { success: boolean; error?: string } {
  const transactions = loadBankTransactions();
  const idx = transactions.findIndex((t) => t.id === transactionId);
  if (idx < 0) return { success: false, error: "Transaction not found" };

  const transaction = transactions[idx];
  if (transaction.status !== "categorized") {
    return { success: false, error: "Transaction must be categorized before reconciling" };
  }

  const now = new Date().toISOString();
  transactions[idx] = {
    ...transaction,
    status: "reconciled",
    reconciledBy: ACCOUNTS_CURRENT_USER,
    reconciledAt: now,
  };
  saveBankTransactions(transactions);

  return { success: true };
}

export function uncategorizeTransaction(transactionId: number): { success: boolean; error?: string } {
  const transactions = loadBankTransactions();
  const idx = transactions.findIndex((t) => t.id === transactionId);
  if (idx < 0) return { success: false, error: "Transaction not found" };

  const transaction = transactions[idx];
  
  // Remove journal entries if they exist
  if (transaction.journalEntryId) {
    const vouchers = loadVouchers();
    const filtered = vouchers.filter((v) => v.id !== transaction.journalEntryId);
    saveVouchers(filtered);
  }

  transactions[idx] = {
    ...transaction,
    category: "",
    ledgerId: null,
    ledgerName: "",
    remarks: "",
    status: "uncategorized",
    journalEntryId: null,
    categorizedBy: "",
    categorizedAt: "",
    reconciledBy: "",
    reconciledAt: "",
  };
  saveBankTransactions(transactions);

  return { success: true };
}

// ====================================================================
// FILTERS AND QUERIES
// ====================================================================

export interface TransactionFilters {
  bankAccountId?: number;
  status?: TransactionStatus | "all";
  category?: TransactionCategory | "all";
  startDate?: string;
  endDate?: string;
  search?: string;
}

export function filterTransactions(filters: TransactionFilters): BankTransaction[] {
  let list = loadBankTransactions();

  if (filters.bankAccountId) {
    list = list.filter((t) => t.bankAccountId === filters.bankAccountId);
  }
  if (filters.status && filters.status !== "all") {
    list = list.filter((t) => t.status === filters.status);
  }
  if (filters.category && filters.category !== "all") {
    list = list.filter((t) => t.category === filters.category);
  }
  if (filters.startDate) {
    list = list.filter((t) => t.transactionDate >= filters.startDate!);
  }
  if (filters.endDate) {
    list = list.filter((t) => t.transactionDate <= filters.endDate!);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.narration.toLowerCase().includes(q) ||
        t.referenceNo.toLowerCase().includes(q) ||
        t.ledgerName.toLowerCase().includes(q)
    );
  }

  return list.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

export function getTransactionStats(bankAccountId?: number) {
  const transactions = bankAccountId
    ? loadBankTransactions().filter((t) => t.bankAccountId === bankAccountId)
    : loadBankTransactions();

  const total = transactions.length;
  const uncategorized = transactions.filter((t) => t.status === "uncategorized").length;
  const categorized = transactions.filter((t) => t.status === "categorized").length;
  const reconciled = transactions.filter((t) => t.status === "reconciled").length;
  
  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);

  return { total, uncategorized, categorized, reconciled, totalDebit, totalCredit };
}

// ====================================================================
// RECONCILIATION HISTORY (AUDIT TRAIL)
// ====================================================================

export interface ReconciliationHistoryEntry {
  transactionId: number;
  transactionDate: string;
  bankAccountName: string;
  narration: string;
  amount: number;
  category: TransactionCategory;
  ledgerName: string;
  journalEntryNumber: string;
  categorizedBy: string;
  categorizedAt: string;
  reconciledBy: string;
  reconciledAt: string;
}

export function getReconciliationHistory(filters?: {
  bankAccountId?: number;
  startDate?: string;
  endDate?: string;
}): ReconciliationHistoryEntry[] {
  let transactions = loadBankTransactions().filter(
    (t) => t.status === "categorized" || t.status === "reconciled"
  );

  if (filters?.bankAccountId) {
    transactions = transactions.filter((t) => t.bankAccountId === filters.bankAccountId);
  }
  if (filters?.startDate) {
    transactions = transactions.filter((t) => t.transactionDate >= filters.startDate!);
  }
  if (filters?.endDate) {
    transactions = transactions.filter((t) => t.transactionDate <= filters.endDate!);
  }

  const vouchers = loadVouchers();

  return transactions
    .map((t) => {
      const journalVoucher = t.journalEntryId ? vouchers.find((v) => v.id === t.journalEntryId) : null;
      return {
        transactionId: t.id,
        transactionDate: t.transactionDate,
        bankAccountName: t.bankAccountName,
        narration: t.narration,
        amount: t.debit || t.credit,
        category: t.category as TransactionCategory,
        ledgerName: t.ledgerName,
        journalEntryNumber: journalVoucher?.voucherNumber || "—",
        categorizedBy: t.categorizedBy,
        categorizedAt: t.categorizedAt,
        reconciledBy: t.reconciledBy,
        reconciledAt: t.reconciledAt,
      };
    })
    .sort((a, b) => b.categorizedAt.localeCompare(a.categorizedAt));
}

// ====================================================================
// LEDGER SEARCH FOR CATEGORIZATION
// ====================================================================

export function searchLedgersForCategory(
  category: TransactionCategory,
  query: string = ""
): { id: number; name: string; code: string; type: string }[] {
  const records = loadChartOfAccounts();
  const ledgers = records.filter((r) => r.nodeLevel === "ledger" && r.status === "active");
  
  // Filter ledgers based on category type
  let filtered = ledgers;
  const q = query.trim().toLowerCase();

  if (q) {
    filtered = filtered.filter(
      (l) =>
        l.accountName.toLowerCase().includes(q) ||
        l.accountCode.toLowerCase().includes(q)
    );
  }

  // Suggest relevant ledgers based on category
  const suggestions: typeof filtered = [];
  switch (category) {
    case "customer_receipt":
      suggestions.push(...filtered.filter((l) => l.accountType === "Asset" || l.accountName.toLowerCase().includes("receivable")));
      break;
    case "vendor_payment":
      suggestions.push(...filtered.filter((l) => l.accountType === "Liability" || l.accountName.toLowerCase().includes("payable")));
      break;
    case "expense":
      suggestions.push(...filtered.filter((l) => l.accountType === "Expense"));
      break;
    case "salary":
      suggestions.push(...filtered.filter((l) => l.accountName.toLowerCase().includes("salary") || l.accountName.toLowerCase().includes("wages")));
      break;
    case "gst_payment":
      suggestions.push(...filtered.filter((l) => l.accountName.toLowerCase().includes("gst") || l.accountName.toLowerCase().includes("tax")));
      break;
    case "tds_payment":
      suggestions.push(...filtered.filter((l) => l.accountName.toLowerCase().includes("tds")));
      break;
    case "bank_charges":
      suggestions.push(...filtered.filter((l) => l.accountName.toLowerCase().includes("bank") && l.accountName.toLowerCase().includes("charge")));
      break;
    case "interest_income":
      suggestions.push(...filtered.filter((l) => l.accountType === "Income" && l.accountName.toLowerCase().includes("interest")));
      break;
    case "loan_received":
    case "loan_repaid":
      suggestions.push(...filtered.filter((l) => l.accountName.toLowerCase().includes("loan")));
      break;
    case "transfer":
      suggestions.push(...filtered.filter((l) => l.bankAccountFlag));
      break;
    default:
      suggestions.push(...filtered);
  }

  return suggestions.slice(0, 50).map((l) => ({
    id: l.id,
    name: l.accountName,
    code: l.accountCode,
    type: l.accountType || "—",
  }));
}
