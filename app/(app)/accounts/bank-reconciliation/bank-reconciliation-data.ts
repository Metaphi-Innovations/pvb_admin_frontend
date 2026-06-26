import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  getCoaLedgers,
  loadAccountTxns,
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type AccountType,
  type ChartOfAccount,
} from "../data";
import {
  formToLedger,
  generateLedgerCode,
  getValidLedgerParents,
  validateLedgerForm,
  type LedgerFormValues,
} from "../masters/chart-of-accounts/chart-of-accounts-data";
import { loadCompanyPayments } from "../payments/payments-data";
import { loadPurchaseInvoices } from "../purchase-invoices/purchase-invoices-data";
import { loadInvoices } from "../invoices/invoices-data";
import { loadCreditNotes } from "../credit-notes/credit-notes-data";
import { loadDebitNotes } from "../debit-notes/debit-notes-data";
import { formatReconciliationBankOption } from "@/lib/accounts/bank-account-display";
import { loadBankAccountsForReconciliation } from "@/lib/accounts/bank-accounts-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";

export type BankEntryMatchStatus = "unmatched" | "partial" | "matched" | "reconciled" | "ignored";
export type BankEntryType = "debit" | "credit";
export type MatchModule =
  | "payments"
  | "purchase"
  | "sales"
  | "journal"
  | "credit_note"
  | "debit_note"
  | "other";

/** Zoho-style bank categorization for unmatched statement lines */
export type BankCategorization =
  | "customer_receipt"
  | "vendor_payment"
  | "expense"
  | "employee_claim_payment"
  | "bank_charges"
  | "interest_income"
  | "transfer";

export const BANK_CATEGORIZATION_OPTIONS: { value: BankCategorization; label: string; hint: string }[] = [
  { value: "customer_receipt", label: "Customer Receipt", hint: "Match to sales invoice or customer receipt" },
  { value: "vendor_payment", label: "Supplier Payment", hint: "Match to purchase bill or vendor payment" },
  { value: "expense", label: "Expense", hint: "Allocate to expense ledger" },
  { value: "employee_claim_payment", label: "Employee Claim Payment", hint: "Match to approved HR claim" },
  { value: "bank_charges", label: "Bank Charges", hint: "Bank charges / fees ledger" },
  { value: "interest_income", label: "Interest Income", hint: "Interest earned on deposit" },
  { value: "transfer", label: "Transfer", hint: "Inter-account or contra transfer" },
];

export function categorizationToModule(cat: BankCategorization): MatchModule {
  switch (cat) {
    case "customer_receipt":
      return "sales";
    case "vendor_payment":
      return "purchase";
    case "employee_claim_payment":
      return "payments";
    case "transfer":
      return "journal";
    case "expense":
    case "bank_charges":
    case "interest_income":
    default:
      return "other";
  }
}

export function categorizationLabel(cat: BankCategorization | "" | string): string {
  if (!cat) return "—";
  return BANK_CATEGORIZATION_OPTIONS.find((o) => o.value === cat)?.label ?? cat;
}

export const MATCH_MODULE_OPTIONS: { value: MatchModule; label: string }[] = [
  { value: "payments", label: "Payments" },
  { value: "purchase", label: "Purchase" },
  { value: "sales", label: "Sales" },
  { value: "journal", label: "Journal" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
  { value: "other", label: "Other" },
];

export const MATCH_STATUS_OPTIONS: BankEntryMatchStatus[] = [
  "unmatched",
  "partial",
  "matched",
  "reconciled",
  "ignored",
];

export interface BankReconStoredAdjustment {
  id: string;
  adjustmentTypeId: string;
  ledgerId: number;
  ledgerName: string;
  amount: number;
}

export interface BankReconMatchingPayload {
  allocations: Record<string, number>;
  adjustments: BankReconStoredAdjustment[];
}

export interface BankAccount {
  id: number;
  name: string;
  accountNumber: string;
  bankName: string;
  status: "active" | "inactive";
}

export interface BankStatement {
  id: number;
  bankAccountId: number;
  bankAccountName: string;
  month: number;
  year: number;
  statementName: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface BankStatementEntry {
  id: number;
  statementId: number;
  transactionDate: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  referenceNo: string;
  entryType: BankEntryType;
  matchedModule: MatchModule | "";
  bankCategory: BankCategorization | "";
  matchedRecordId: number | null;
  matchedRecordLabel: string;
  ledgerId: number | null;
  ledgerName: string;
  remarks: string;
  matchStatus: BankEntryMatchStatus;
  reconciliationStatus: BankEntryMatchStatus;
  reconciledBy: string;
  reconciledAt: string;
  /** JSON snapshot of invoice allocations + adjustments for reload */
  matchingPayload?: string;
}

const BANK_ACCOUNTS_KEY = "ds_bank_reconciliation_accounts_v1";
const STATEMENTS_KEY = "ds_bank_reconciliation_statements_v1";
const ENTRIES_KEY = "ds_bank_reconciliation_entries_v1";

const BANK_ACCOUNT_SEED: BankAccount[] = [
  { id: 1, name: "HDFC Current Account", accountNumber: "50200012345678", bankName: "HDFC Bank", status: "active" },
  { id: 2, name: "ICICI Current Account", accountNumber: "006501234567", bankName: "ICICI Bank", status: "active" },
];

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

export function loadBankAccounts(): BankAccount[] {
  const unified = loadBankAccountsForReconciliation();
  if (unified.length > 0) {
    return unified.map((a) => ({
      id: a.id,
      name: a.displayLabel,
      accountNumber: a.accountNumber,
      bankName: a.bankName,
      status: a.status,
    }));
  }
  return getOrSeed(BANK_ACCOUNTS_KEY, BANK_ACCOUNT_SEED)
    .filter((a) => a.status === "active")
    .map((a) => ({
      ...a,
      name: formatReconciliationBankOption({ name: a.name, accountNumber: a.accountNumber }),
    }));
}

export function loadBankStatements(): BankStatement[] {
  return getOrSeed(STATEMENTS_KEY, []);
}

export function loadBankEntries(): BankStatementEntry[] {
  return getOrSeed(ENTRIES_KEY, []);
}

export function saveBankStatements(list: BankStatement[]) {
  saveList(STATEMENTS_KEY, list);
}

export function saveBankEntries(list: BankStatementEntry[]) {
  saveList(ENTRIES_KEY, list);
}

export function getStatementById(id: number): BankStatement | undefined {
  return loadBankStatements().find((s) => s.id === id);
}

export function findExistingStatement(
  bankAccountId: number,
  month: number,
  year: number,
  excludeId?: number,
): BankStatement | undefined {
  return loadBankStatements().find(
    (s) =>
      s.bankAccountId === bankAccountId &&
      s.month === month &&
      s.year === year &&
      s.id !== excludeId,
  );
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

/** Headers seen on HDFC, ICICI, Axis, SBI, Kotak, etc. exports */
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

function headerLooksLikeStatement(headers: string[]): boolean {
  const norm = headers.map(normalizeHeader).filter(Boolean);
  const hasDate = norm.some((h) => DATE_HEADER_KEYS.has(h) || h.includes("date") || h.includes("valuedt"));
  const hasMoney =
    norm.some((h) => DEBIT_HEADER_KEYS.has(h) || h.includes("withdrawal") || h.includes("debit")) ||
    norm.some((h) => CREDIT_HEADER_KEYS.has(h) || h.includes("deposit") || h.includes("credit"));
  return hasDate && hasMoney;
}

function findStatementHeaderRow(aoa: unknown[][]): number {
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    const row = aoa[i];
    if (!row?.length) continue;
    const headers = row.map((c) => String(c ?? "").trim());
    if (headerLooksLikeStatement(headers)) return i;
  }
  return 0;
}

function aoaToObjects(aoa: unknown[][], headerRowIndex: number): Record<string, unknown>[] {
  const headerRow = aoa[headerRowIndex] ?? [];
  const headers = headerRow.map((c, i) => {
    const label = String(c ?? "").trim();
    return label || `Column_${i + 1}`;
  });
  const out: Record<string, unknown>[] = [];
  for (let r = headerRowIndex + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row?.length) continue;
    const obj: Record<string, unknown> = {};
    let empty = true;
    headers.forEach((h, i) => {
      const val = row[i] ?? "";
      if (val !== "") empty = false;
      obj[h] = val;
    });
    if (!empty) out.push(obj);
  }
  return out;
}

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
      // YYYY-MM-DD
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

function mapRowToEntry(
  row: Record<string, unknown>,
  headers: string[],
): Omit<BankStatementEntry, "id" | "statementId" | "matchStatus" | "reconciliationStatus" | "reconciledBy" | "reconciledAt"> | null {
  const map: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    const val = row[h] ?? row[headers[i]] ?? Object.values(row)[i];
    map[key] = val;
  });
  const getByKeys = (keys: Set<string>, fallbacks: string[]) => {
    for (const nk of keys) {
      if (map[nk] != null && map[nk] !== "") return map[nk];
    }
    for (const k of fallbacks) {
      const nk = normalizeHeader(k);
      if (map[nk] != null && map[nk] !== "") return map[nk];
    }
    for (const [nk, val] of Object.entries(map)) {
      if (val == null || val === "") continue;
      if (keys.has(nk)) return val;
      if ([...keys].some((key) => nk.includes(key) || key.includes(nk))) return val;
    }
    return undefined;
  };

  const dateRaw = getByKeys(DATE_HEADER_KEYS, [
    "Transaction Date",
    "Txn Date",
    "Date",
    "Value Date",
    "Value Dt",
    "Tran Date",
  ]);
  const parsedDate = parseTransactionDate(dateRaw);
  if (!parsedDate) return null;

  const debit = parseAmount(
    getByKeys(DEBIT_HEADER_KEYS, ["Debit", "Withdrawal Amt.", "Withdrawal Amount", "Dr", "Amount Debited"]),
  );
  const credit = parseAmount(
    getByKeys(CREDIT_HEADER_KEYS, ["Credit", "Deposit Amt.", "Deposit Amount", "Cr", "Amount Credited"]),
  );
  const balance = parseAmount(
    getByKeys(new Set(["balance", "closingbalance", "runningbalance", "balanceinr", "closingbalanceinr"]), [
      "Balance",
      "Closing Balance",
      "Running Balance",
    ]),
  );
  const narration = String(
    getByKeys(
      new Set([
        "narration",
        "description",
        "particulars",
        "remarks",
        "transactionparticulars",
        "transactionremarks",
        "transactiondetails",
        "details",
      ]),
      ["Narration", "Description", "Particulars", "Transaction Particulars", "Transaction Remarks"],
    ) ?? "",
  ).trim();
  const referenceNo = String(
    getByKeys(
      new Set([
        "referenceno",
        "referencenumber",
        "chqrefno",
        "chqno",
        "utr",
        "ref",
        "chequenumber",
        "chequeno",
        "chqref",
      ]),
      ["Reference No.", "Chq./Ref.No.", "UTR No.", "Cheque Number"],
    ) ?? "",
  ).trim();

  let transactionDate = parsedDate;
  const entryType: BankEntryType = debit > 0 ? "debit" : "credit";

  return {
    transactionDate,
    narration: narration || "—",
    debit,
    credit,
    balance,
    referenceNo,
    entryType,
    matchedModule: "",
    bankCategory: "",
    matchedRecordId: null,
    matchedRecordLabel: "",
    ledgerId: null,
    ledgerName: "",
    remarks: "",
  };
}

export async function parseStatementFile(file: File): Promise<
  Omit<BankStatementEntry, "id" | "statementId" | "matchStatus" | "reconciliationStatus" | "reconciledBy" | "reconciledAt">[]
> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
  if (!aoa.length) return [];

  const headerIdx = findStatementHeaderRow(aoa);
  const json = aoaToObjects(aoa, headerIdx);
  if (json.length === 0) return [];

  const headers = Object.keys(json[0]);
  const parsed: ReturnType<typeof mapRowToEntry>[] = [];
  for (const row of json) {
    const entry = mapRowToEntry(row, headers);
    if (entry && (entry.debit > 0 || entry.credit > 0)) parsed.push(entry);
  }
  return parsed.filter(Boolean) as NonNullable<typeof parsed[number]>[];
}

export interface UploadStatementInput {
  bankAccountId: number;
  month: number;
  year: number;
  statementName: string;
  file: File;
  overwrite?: boolean;
}

export type UploadStatementResult =
  | { ok: true; statementId: number; entryCount: number; overwritten: boolean }
  | { ok: false; code: "duplicate"; existingId: number }
  | { ok: false; code: "empty" | "invalid_bank" };

export async function uploadBankStatement(input: UploadStatementInput): Promise<UploadStatementResult> {
  const accounts = loadBankAccounts();
  const bank = accounts.find((a) => a.id === input.bankAccountId);
  if (!bank) return { ok: false, code: "invalid_bank" };

  const existing = findExistingStatement(input.bankAccountId, input.month, input.year);
  if (existing && !input.overwrite) {
    return { ok: false, code: "duplicate", existingId: existing.id };
  }

  const rows = await parseStatementFile(input.file);
  if (rows.length === 0) return { ok: false, code: "empty" };

  const statements = loadBankStatements();
  let entries = loadBankEntries();
  const now = new Date().toISOString();
  let statementId: number;
  let overwritten = false;

  if (existing && input.overwrite) {
    statementId = existing.id;
    overwritten = true;
    entries = entries.filter((e) => e.statementId !== statementId);
    const idx = statements.findIndex((s) => s.id === statementId);
    if (idx >= 0) {
      statements[idx] = {
        ...statements[idx],
        statementName: input.statementName,
        fileName: input.file.name,
        uploadedBy: ACCOUNTS_CURRENT_USER,
        uploadedAt: now,
      };
    }
  } else {
    statementId = nextId(statements);
    statements.push({
      id: statementId,
      bankAccountId: bank.id,
      bankAccountName: bank.name,
      month: input.month,
      year: input.year,
      statementName: input.statementName,
      fileName: input.file.name,
      uploadedBy: ACCOUNTS_CURRENT_USER,
      uploadedAt: now,
    });
  }

  const baseEntryId = nextId(entries);
  const newEntries: BankStatementEntry[] = rows.map((r, i) => ({
    ...r,
    id: baseEntryId + i,
    statementId,
    matchStatus: "unmatched",
    reconciliationStatus: "unmatched",
    reconciledBy: "",
    reconciledAt: "",
  }));

  saveBankStatements(statements);
  saveBankEntries([...entries, ...newEntries]);
  return { ok: true, statementId, entryCount: newEntries.length, overwritten };
}

export function deleteBankStatement(statementId: number): void {
  saveBankStatements(loadBankStatements().filter((s) => s.id !== statementId));
  saveBankEntries(loadBankEntries().filter((e) => e.statementId !== statementId));
}

export function getStatementStats(statementId: number) {
  const entries = loadBankEntries().filter((e) => e.statementId === statementId);
  const total = entries.length;
  const matched = entries.filter((e) => e.matchStatus === "matched").length;
  const partial = entries.filter((e) => e.matchStatus === "partial").length;
  const reconciled = entries.filter((e) => e.reconciliationStatus === "reconciled").length;
  const ignored = entries.filter((e) => e.matchStatus === "ignored").length;
  const unmatched = entries.filter((e) => e.matchStatus === "unmatched").length;
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  return { total, matched, reconciled, unmatched, ignored, totalDebit, totalCredit };
}

export function enrichStatementsWithStats(statements: BankStatement[]) {
  return statements.map((s) => {
    const stats = getStatementStats(s.id);
    return { ...s, ...stats, uploadStatus: "Uploaded" as const };
  });
}

export interface StatementListFilters {
  bankAccountId?: string;
  month?: string;
  year?: string;
  search?: string;
}

export function filterStatements(
  statements: ReturnType<typeof enrichStatementsWithStats>,
  filters: StatementListFilters,
) {
  return statements
    .filter((s) => {
      if (filters.bankAccountId && filters.bankAccountId !== "all" && String(s.bankAccountId) !== filters.bankAccountId)
        return false;
      if (filters.month && filters.month !== "all" && String(s.month) !== filters.month) return false;
      if (filters.year && filters.year !== "all" && String(s.year) !== filters.year) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const label = `${s.bankAccountName} ${s.statementName}`.toLowerCase();
        if (!label.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.year - a.year || b.month - a.month || b.uploadedAt.localeCompare(a.uploadedAt));
}

export interface EntryListFilters {
  matchStatus?: string;
  reconciliationStatus?: string;
  entryType?: string;
  matchedModule?: string;
  search?: string;
}

export function getEntriesForStatement(statementId: number, filters?: EntryListFilters): BankStatementEntry[] {
  let list = loadBankEntries().filter((e) => e.statementId === statementId);
  if (!filters) return list.sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  if (filters.matchStatus && filters.matchStatus !== "all") {
    list = list.filter((e) => e.matchStatus === filters.matchStatus);
  }
  if (filters.reconciliationStatus && filters.reconciliationStatus !== "all") {
    list = list.filter((e) => e.reconciliationStatus === filters.reconciliationStatus);
  }
  if (filters.entryType && filters.entryType !== "all") {
    list = list.filter((e) => e.entryType === filters.entryType);
  }
  if (filters.matchedModule && filters.matchedModule !== "all") {
    list = list.filter((e) => e.matchedModule === filters.matchedModule);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (e) =>
        e.narration.toLowerCase().includes(q) ||
        e.referenceNo.toLowerCase().includes(q) ||
        e.matchedRecordLabel.toLowerCase().includes(q),
    );
  }
  return list.sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
}

export interface ModuleRecordOption {
  id: number;
  label: string;
  sub?: string;
}

export function searchModuleRecords(module: MatchModule, query: string): ModuleRecordOption[] {
  const q = query.trim().toLowerCase();
  const match = (label: string, sub?: string) =>
    !q || label.toLowerCase().includes(q) || (sub?.toLowerCase().includes(q) ?? false);

  switch (module) {
    case "payments":
      return loadCompanyPayments()
        .filter((p) => match(p.paymentNo, p.employeeOrVendor))
        .slice(0, 40)
        .map((p) => ({
          id: p.id,
          label: p.paymentNo,
          sub: `${p.employeeOrVendor} · ${p.sourceReferenceNo}`,
        }));
    case "purchase":
      return loadPurchaseInvoices()
        .filter((p) => match(p.invoiceNo, p.vendorName))
        .slice(0, 40)
        .map((p) => ({
          id: p.id,
          label: p.invoiceNo,
          sub: `${p.vendorName} · ${p.vendorInvoiceNo || ""}`,
        }));
    case "sales":
      return loadInvoices()
        .filter((i) => match(i.invoiceNo, i.customerName))
        .slice(0, 40)
        .map((i) => ({
          id: i.id,
          label: i.invoiceNo,
          sub: i.customerName,
        }));
    case "journal":
      return loadAccountTxns()
        .filter((t) => t.txnType === "journal" && match(t.number, t.party))
        .slice(0, 40)
        .map((t) => ({
          id: t.id,
          label: t.number,
          sub: t.party,
        }));
    case "credit_note":
      return loadCreditNotes()
        .filter((c) => match(c.creditNoteNo, c.customerName))
        .slice(0, 40)
        .map((c) => ({
          id: c.id,
          label: c.creditNoteNo,
          sub: c.customerName,
        }));
    case "debit_note":
      return loadDebitNotes()
        .filter((d) => match(d.debitNoteNo, d.vendorName))
        .slice(0, 40)
        .map((d) => ({
          id: d.id,
          label: d.debitNoteNo,
          sub: d.vendorName,
        }));
    default:
      return [];
  }
}

export interface UnpaidInvoiceOption {
  id: number;
  label: string;
  party: string;
  partyId: number | null;
  balance: number;
  dueDate: string;
  invoiceDate: string;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
}

export function listUnpaidSalesInvoicesForReceipt(): UnpaidInvoiceOption[] {
  return loadInvoices()
    .filter((i) => i.invoiceStatus === "sent" && i.balanceAmount > 0.01)
    .map((i) => ({
      id: i.id,
      label: i.invoiceNo,
      party: i.customerName,
      partyId: i.customerId,
      balance: i.balanceAmount,
      dueDate: i.dueDate,
      invoiceDate: i.invoiceDate,
      taxableAmount: Math.max(0, (i.grandTotal ?? 0) - (i.taxAmount ?? 0)),
      taxAmount: i.taxAmount ?? 0,
      grandTotal: i.grandTotal ?? 0,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function listUnpaidSalesInvoicesForCustomer(customerId?: number, customerName?: string): UnpaidInvoiceOption[] {
  const all = listUnpaidSalesInvoicesForReceipt();
  if (!customerId && !customerName?.trim()) return all;
  return all.filter((i) => {
    if (customerId && i.partyId === customerId) return true;
    if (customerName && i.party.toLowerCase() === customerName.trim().toLowerCase()) return true;
    return false;
  });
}

export function listUnpaidPurchaseInvoicesForPayment(): UnpaidInvoiceOption[] {
  return loadPurchaseInvoices()
    .filter((p) => p.grandTotal - (p.amountPaid ?? 0) > 0.01)
    .map((p) => {
      const balance = Math.max(0, p.grandTotal - (p.amountPaid ?? 0));
      const taxable = Math.max(0, p.grandTotal - (p.taxAmount ?? 0));
      return {
        id: p.id,
        label: p.invoiceNo,
        party: p.vendorName,
        partyId: p.vendorId,
        balance,
        dueDate: p.invoiceDate,
        invoiceDate: p.invoiceDate,
        taxableAmount: taxable,
        taxAmount: p.taxAmount ?? 0,
        grandTotal: p.grandTotal,
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function listUnpaidPurchaseInvoicesForVendor(vendorId?: number, vendorName?: string): UnpaidInvoiceOption[] {
  const all = listUnpaidPurchaseInvoicesForPayment();
  if (!vendorId && !vendorName?.trim()) return all;
  return all.filter((i) => {
    if (vendorId && i.partyId === vendorId) return true;
    if (vendorName && i.party.toLowerCase() === vendorName.trim().toLowerCase()) return true;
    return false;
  });
}

export function matchModuleLabel(module: MatchModule | "" | string): string {
  if (!module) return "—";
  if (module === "expenses") return "Journal";
  return MATCH_MODULE_OPTIONS.find((o) => o.value === module)?.label ?? module;
}

export interface MatchEntryInput {
  entryId: number;
  matchedModule: MatchModule;
  bankCategory?: BankCategorization | "";
  matchedRecordId?: number | null;
  matchedRecordLabel?: string;
  ledgerId?: number | null;
  ledgerName?: string;
  remarks?: string;
  matchingPayload?: BankReconMatchingPayload;
  matchStatus?: BankEntryMatchStatus;
}

export function saveEntryMatch(input: MatchEntryInput): BankStatementEntry | null {
  const entries = loadBankEntries();
  const idx = entries.findIndex((e) => e.id === input.entryId);
  if (idx < 0) return null;

  const entry = entries[idx];
  const nextStatus = input.matchStatus ?? "matched";
  const payloadJson = input.matchingPayload
    ? JSON.stringify(input.matchingPayload)
    : entry.matchingPayload;

  entries[idx] = {
    ...entry,
    matchedModule: input.matchedModule,
    bankCategory: input.bankCategory ?? entry.bankCategory ?? "",
    matchedRecordId: input.matchedRecordId ?? null,
    matchedRecordLabel: input.matchedRecordLabel ?? "",
    ledgerId: input.ledgerId ?? null,
    ledgerName: input.ledgerName ?? "",
    remarks: input.remarks ?? entry.remarks,
    matchStatus: nextStatus,
    reconciliationStatus:
      entry.reconciliationStatus === "reconciled" && nextStatus === "matched"
        ? "reconciled"
        : nextStatus === "partial"
          ? "partial"
          : nextStatus,
    matchingPayload: payloadJson,
  };
  saveBankEntries(entries);
  return entries[idx];
}

export function confirmEntryReconciliation(entryId: number): BankStatementEntry | null {
  const entries = loadBankEntries();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return null;
  const entry = entries[idx];

  const canReconcile =
    entry.matchStatus === "matched" &&
    entry.reconciliationStatus !== "partial" &&
    (entry.matchedModule === "other"
      ? entry.ledgerId != null
      : entry.matchedModule === "sales" || entry.matchedModule === "purchase"
        ? entry.matchedRecordId != null || !!entry.matchingPayload
        : entry.matchedModule && entry.matchedRecordId != null);

  if (!canReconcile) return null;

  const now = new Date().toISOString();
  entries[idx] = {
    ...entry,
    matchStatus: "reconciled",
    reconciliationStatus: "reconciled",
    reconciledBy: ACCOUNTS_CURRENT_USER,
    reconciledAt: now,
  };
  saveBankEntries(entries);
  return entries[idx];
}

export function ignoreBankEntry(entryId: number): BankStatementEntry | null {
  const entries = loadBankEntries();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return null;
  entries[idx] = {
    ...entries[idx],
    matchStatus: "ignored",
    reconciliationStatus: "ignored",
    reconciledBy: ACCOUNTS_CURRENT_USER,
    reconciledAt: new Date().toISOString(),
  };
  saveBankEntries(entries);
  return entries[idx];
}

export function resetEntryMatch(entryId: number): BankStatementEntry | null {
  const entries = loadBankEntries();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return null;
  entries[idx] = {
    ...entries[idx],
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
    matchingPayload: undefined,
  };
  saveBankEntries(entries);
  return entries[idx];
}

function defaultParentForAccountType(
  records: ChartOfAccount[],
  accountType: AccountType,
): number | null {
  const parents = getValidLedgerParents(records);
  const preferredNames: Partial<Record<AccountType, string[]>> = {
    Asset: ["Bank Accounts", "Cash-in-Hand", "Other Current Assets"],
    Liability: ["Other Current Liabilities", "Trade Payables / Sundry Creditors"],
    Income: ["Miscellaneous Income", "Sales"],
    Expense: ["Miscellaneous Expenses", "Bank Charges"],
    Equity: ["Other Current Liabilities"],
  };
  const names = preferredNames[accountType] ?? ["Miscellaneous Expenses"];
  for (const name of names) {
    const match = parents.find((p) => p.accountName === name);
    if (match) return match.id;
  }
  return parents.find((p) => p.accountType === accountType)?.id ?? parents[0]?.id ?? null;
}

/** Creates a COA ledger under a valid sub-group — the only user-creatable hierarchy level */
export function createLedgerQuick(input: {
  ledgerName: string;
  accountType: AccountType;
  parentGroupId?: number;
}): ChartOfAccount {
  const records = loadChartOfAccounts();
  const parentGroupId = input.parentGroupId ?? defaultParentForAccountType(records, input.accountType);
  const form: LedgerFormValues = {
    ledgerName: input.ledgerName.trim(),
    alias: "",
    description: "",
    parentGroupId,
    openingBalance: "0",
    balanceType:
      input.accountType === "Liability" || input.accountType === "Income" ? "Credit" : "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: input.accountType === "Asset",
    bankGroupFlag: false,
    status: "active",
  };
  const err = validateLedgerForm(form, records);
  if (err) throw new Error(err);
  const ledgers = getCoaLedgers();
  const id = nextId(ledgers);
  const ledger = formToLedger(form, id, generateLedgerCode(records), records);
  const next = [...records, ledger];
  saveChartOfAccounts(next);
  return ledger;
}

export function ledgerSearchOptions(query: string): { id: number; label: string }[] {
  const q = query.trim().toLowerCase();
  return getCoaLedgers()
    .filter((l) => l.status === "active" && (!q || l.accountName.toLowerCase().includes(q)))
    .slice(0, 50)
    .map((l) => ({ id: l.id, label: l.accountName }));
}

export function expenseLedgerSearchOptions(query: string): { id: number; label: string }[] {
  const q = query.trim().toLowerCase();
  return getCoaLedgers()
    .filter(
      (l) =>
        l.status === "active" &&
        l.accountType === "Expense" &&
        (!q || l.accountName.toLowerCase().includes(q) || l.accountCode.toLowerCase().includes(q)),
    )
    .slice(0, 50)
    .map((l) => ({ id: l.id, label: l.accountName }));
}

export function incomeLedgerSearchOptions(query: string): { id: number; label: string }[] {
  const q = query.trim().toLowerCase();
  return getCoaLedgers()
    .filter(
      (l) =>
        l.status === "active" &&
        l.accountType === "Income" &&
        (!q || l.accountName.toLowerCase().includes(q) || l.accountCode.toLowerCase().includes(q)),
    )
    .slice(0, 50)
    .map((l) => ({ id: l.id, label: l.accountName }));
}

export const WITHDRAWAL_CATEGORIES: { value: BankCategorization; label: string }[] = [
  { value: "vendor_payment", label: "Supplier Payment" },
  { value: "expense", label: "Expense" },
  { value: "employee_claim_payment", label: "Employee Claim Payment" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "transfer", label: "Transfer" },
];

export const DEPOSIT_CATEGORIES: { value: BankCategorization; label: string }[] = [
  { value: "customer_receipt", label: "Customer Payment" },
  { value: "interest_income", label: "Interest Income" },
  { value: "transfer", label: "Transfer" },
];

export function customerSearchOptions(query: string): { id: number; label: string }[] {
  const q = query.trim().toLowerCase();
  return loadCustomers()
    .filter((c) => c.status === "active" && (!q || c.customerName.toLowerCase().includes(q)))
    .slice(0, 50)
    .map((c) => ({ id: c.id, label: c.customerName }));
}

export function vendorSearchOptions(query: string): { id: number; label: string }[] {
  const q = query.trim().toLowerCase();
  return loadVendors()
    .filter((v) => v.status === "active" && (!q || v.vendorName.toLowerCase().includes(q)))
    .slice(0, 50)
    .map((v) => ({ id: v.id, label: v.vendorName }));
}
