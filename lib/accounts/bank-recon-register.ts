/**
 * Bank Reconciliation register — localStorage persistence for transactions,
 * import batches, saved formats and account import metadata.
 */

import { BANK_RECON_DEMO_TRANSACTIONS } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import type {
  BankReconActivityEvent,
  BankReconMatchStatus,
  BankReconRelatedRecord,
  BankReconTransactionSource,
  BankReconVerificationStatus,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import type {
  ExpectedVoucherType,
  ManualAttachmentMeta,
  ManualEntryStatus,
  ReferenceStatus,
  TransactionMode,
} from "@/lib/accounts/bank-recon-manual-types";
import { MANUAL_DEMO_TRANSACTIONS, enrichRecordWithManualDefaults } from "@/lib/accounts/bank-recon-manual-demo-seed";
import { MATCH_DEMO_TRANSACTIONS } from "@/lib/accounts/bank-recon-match-demo-seed";
import { CATEGORIZE_DEMO_TRANSACTIONS } from "@/lib/accounts/bank-recon-categorize-demo-seed";
import { MANUAL_RECON_DEMO_TRANSACTIONS } from "@/lib/accounts/bank-recon-manual-recon-demo-seed";
import { ensureBankReconCompletionSeeded } from "@/lib/accounts/bank-recon-completion-demo-seed";
import { normalizeReferenceForCompare } from "@/lib/accounts/bank-recon-manual-types";

const TXN_KEY = "dharitri_bank_recon_transactions_v2";
const BATCH_KEY = "dharitri_bank_recon_import_batches_v2";
const FORMAT_KEY = "dharitri_bank_recon_saved_formats_v2";
const META_KEY = "dharitri_bank_recon_account_meta_v2";
const REGISTER_VERSION_KEY = "dharitri_bank_recon_register_version";
const REGISTER_VERSION = "v2-step7";

export type ImportBatchStatus =
  | "Processing"
  | "Completed"
  | "Completed with Errors"
  | "Failed"
  | "Cancelled";

export interface BankReconTransactionRecord {
  id: string;
  bankAccountId: string;
  statementDate: string;
  valueDate: string;
  bookDate: string | null;
  reference: string;
  utrNumber: string | null;
  chequeNo: string | null;
  narration: string;
  partyLedger: string;
  deposit: number;
  withdrawal: number;
  runningBalance: number | null;
  source: BankReconTransactionSource;
  matchStatus: BankReconMatchStatus;
  verificationStatus: BankReconVerificationStatus;
  reconciliationDate: string | null;
  relatedRecord: BankReconRelatedRecord | null;
  activity: BankReconActivityEvent[];
  importedFileName: string | null;
  importBatchId: string | null;
  importedBy: string | null;
  importedOn: string | null;
  originalRowNumber: number | null;
  originalRawData: Record<string, string> | null;
  savedFormatId: string | null;
  statementPeriodFrom: string | null;
  statementPeriodTo: string | null;
  internalStatementId: string | null;
  linkedManualTransactionId: string | null;
  /** Step 3 — manual transaction fields */
  manualTransactionNumber: string | null;
  manualEntryStatus: ManualEntryStatus | null;
  transactionMode: TransactionMode | null;
  transactionDate: string | null;
  expectedClearingDate: string | null;
  chequeDate: string | null;
  depositedDate: string | null;
  drawerBank: string | null;
  drawerBranch: string | null;
  transactionIdRef: string | null;
  instrumentNumber: string | null;
  bankSlipNumber: string | null;
  externalReference: string | null;
  partyType: string | null;
  expectedVoucherType: ExpectedVoucherType | null;
  existingVoucherRef: string | null;
  customerVendorRef: string | null;
  invoiceReference: string | null;
  purposeCategory: string | null;
  costCentre: string | null;
  internalRemarks: string | null;
  bankNarration: string | null;
  importedNarration: string | null;
  followUpNote: string | null;
  referenceStatus: ReferenceStatus | null;
  currency: string | null;
  attachments: ManualAttachmentMeta[];
  createdBy: string | null;
  createdOn: string | null;
  updatedBy: string | null;
  updatedOn: string | null;
  cancelReason: string | null;
  possibleDuplicateOverrideReason: string | null;
  /** Step 5 — voucher created from categorization */
  postedVoucherId?: number | null;
  categorizationCategory?: string | null;
  categorizationPayload?: string | null;
  /** Step 6 — manual reconciliation (separate from accounting match) */
  reconciliationStatus?: string | null;
  reconciledAmount?: number | null;
}

export interface BankReconImportBatch {
  id: string;
  batchNumber: string;
  bankAccountId: string;
  fileName: string;
  fileType: string;
  statementPeriodFrom: string;
  statementPeriodTo: string;
  openingBalance: number | null;
  closingBalance: number | null;
  totalRows: number;
  importedRows: number;
  invalidRows: number;
  duplicateRows: number;
  linkedManualRows: number;
  possibleDuplicateRows: number;
  totalDeposit: number;
  totalWithdrawal: number;
  importedBy: string;
  importedOn: string;
  status: ImportBatchStatus;
  savedFormatId: string | null;
  errorReportJson: string | null;
}

export interface BankReconSavedFormat {
  id: string;
  formatName: string;
  bankAccountId: string;
  fileType: "csv" | "xls" | "xlsx";
  sheetNamePattern: string | null;
  headerRow: number;
  dataStartRow: number;
  columnMapping: Record<string, string | null>;
  dateFormat: string;
  amountFormat: BankReconAmountFormatConfig;
  directionRules: BankReconDirectionRules;
  createdBy: string;
  createdOn: string;
  updatedOn: string;
}

export interface BankReconAmountFormatConfig {
  decimalSeparator: "." | ",";
  thousandSeparator: "," | "." | "none";
  currencySymbol: boolean;
  bracketsNegative: boolean;
  drCrSuffix: boolean;
  debitAsNegative: boolean;
}

export interface BankReconDirectionRules {
  mode: "separate_columns" | "amount_with_type" | "signed_amount" | "deposit_withdrawal";
  creditLabels: string[];
  debitLabels: string[];
  positiveIsDeposit: boolean;
}

export interface BankReconAccountMeta {
  bankAccountId: string;
  lastStatementImportedUntil: string | null;
  lastImportBatchId: string | null;
  lastImportFileName: string | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

let batchCounter = 0;

function nextBatchNumber(): string {
  batchCounter += 1;
  const year = new Date().getFullYear();
  const n = String(batchCounter).padStart(4, "0");
  return `IMP-${year}-${n}`;
}

function nextTransactionId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

let manualSeqCounter: Record<string, number> = {};

function migrateRecords(records: BankReconTransactionRecord[]): BankReconTransactionRecord[] {
  return records.map((t) => enrichRecordWithManualDefaults(t));
}

export function ensureBankReconRegisterSeeded(): void {
  if (!isBrowser()) return;
  const version = localStorage.getItem(REGISTER_VERSION_KEY);
  const existing = localStorage.getItem(TXN_KEY);

  if (version === REGISTER_VERSION && existing) {
    const parsed = readJson<BankReconTransactionRecord[]>(TXN_KEY, []);
    const needsEnrich = parsed.some((t) => t.manualTransactionNumber === undefined);
    if (needsEnrich) {
      writeJson(TXN_KEY, migrateRecords(parsed));
    }
    return;
  }

  if (existing && version === "v2-step6") {
    ensureBankReconCompletionSeeded();
    localStorage.setItem(REGISTER_VERSION_KEY, REGISTER_VERSION);
    return;
  }

  if (existing && version === "v2-step5") {
    const parsed = migrateRecords(readJson<BankReconTransactionRecord[]>(TXN_KEY, []));
    const existingIds = new Set(parsed.map((t) => t.id));
    const toAdd = MANUAL_RECON_DEMO_TRANSACTIONS.filter((t) => !existingIds.has(t.id));
    writeJson(TXN_KEY, [...parsed, ...toAdd.map(enrichRecordWithManualDefaults)]);
    localStorage.setItem(REGISTER_VERSION_KEY, REGISTER_VERSION);
    return;
  }

  if (existing && version === "v2-step4") {
    const parsed = migrateRecords(readJson<BankReconTransactionRecord[]>(TXN_KEY, []));
    const existingIds = new Set(parsed.map((t) => t.id));
    const toAdd = CATEGORIZE_DEMO_TRANSACTIONS.filter((t) => !existingIds.has(t.id));
    writeJson(TXN_KEY, [...parsed, ...toAdd.map(enrichRecordWithManualDefaults)]);
    localStorage.setItem(REGISTER_VERSION_KEY, REGISTER_VERSION);
    return;
  }

  if (existing && version === "v2-step3") {
    const parsed = migrateRecords(readJson<BankReconTransactionRecord[]>(TXN_KEY, []));
    const existingIds = new Set(parsed.map((t) => t.id));
    const toAdd = MATCH_DEMO_TRANSACTIONS.filter((t) => !existingIds.has(t.id));
    writeJson(TXN_KEY, [...parsed, ...toAdd.map(enrichRecordWithManualDefaults)]);
    localStorage.setItem(REGISTER_VERSION_KEY, REGISTER_VERSION);
    return;
  }

  if (existing && version === "v2-step2") {
    const parsed = migrateRecords(readJson<BankReconTransactionRecord[]>(TXN_KEY, []));
    const existingIds = new Set(parsed.map((t) => t.id));
    const toAdd = MANUAL_DEMO_TRANSACTIONS.filter((t) => !existingIds.has(t.id));
    writeJson(TXN_KEY, [...parsed, ...toAdd.map(enrichRecordWithManualDefaults)]);
    localStorage.setItem(REGISTER_VERSION_KEY, REGISTER_VERSION);
    return;
  }

  if (version === REGISTER_VERSION && existing) return;

  const base = BANK_RECON_DEMO_TRANSACTIONS.map((t) =>
    enrichRecordWithManualDefaults({
      ...t,
      utrNumber: t.reference.startsWith("UTR") ? t.reference : null,
      runningBalance: null,
      importedFileName: t.source === "Statement Upload" ? "seed-demo.csv" : null,
      importBatchId: null,
      importedBy: t.source === "Statement Upload" ? "System" : null,
      importedOn: t.source === "Statement Upload" ? "2026-06-01T09:00:00" : null,
      originalRowNumber: null,
      originalRawData: null,
      savedFormatId: null,
      statementPeriodFrom: null,
      statementPeriodTo: null,
      internalStatementId: null,
      linkedManualTransactionId: null,
    }),
  );
  writeJson(TXN_KEY, [
    ...base,
    ...MANUAL_DEMO_TRANSACTIONS.map(enrichRecordWithManualDefaults),
    ...CATEGORIZE_DEMO_TRANSACTIONS.map(enrichRecordWithManualDefaults),
  ]);
  if (!localStorage.getItem(BATCH_KEY)) writeJson(BATCH_KEY, [] as BankReconImportBatch[]);
  if (!localStorage.getItem(FORMAT_KEY)) writeJson(FORMAT_KEY, [] as BankReconSavedFormat[]);
  if (!localStorage.getItem(META_KEY)) {
    writeJson(META_KEY, [
      { bankAccountId: "hdfc-current", lastStatementImportedUntil: "2026-06-19", lastImportBatchId: null, lastImportFileName: "hdfc-jun-2026-partial.csv" },
      { bankAccountId: "icici-collection", lastStatementImportedUntil: "2026-06-25", lastImportBatchId: null, lastImportFileName: "icici-jun-2026.xlsx" },
      { bankAccountId: "sbi-cash-credit", lastStatementImportedUntil: "2026-05-31", lastImportBatchId: null, lastImportFileName: null },
    ] as BankReconAccountMeta[]);
  }
  localStorage.setItem(REGISTER_VERSION_KEY, REGISTER_VERSION);
  const batches = readJson<BankReconImportBatch[]>(BATCH_KEY, []);
  batchCounter = batches.length;
}

export function loadBankReconTransactions(bankAccountId?: string): BankReconTransactionRecord[] {
  ensureBankReconRegisterSeeded();
  const rows = readJson<BankReconTransactionRecord[]>(TXN_KEY, []);
  const mapped = rows.map((t) => enrichRecordWithManualDefaults({ ...t, activity: [...(t.activity ?? [])] }));
  if (!bankAccountId) return mapped;
  return mapped.filter((t) => t.bankAccountId === bankAccountId);
}

export function saveBankReconTransactions(transactions: BankReconTransactionRecord[]): void {
  writeJson(TXN_KEY, transactions);
}

export function upsertBankReconTransaction(txn: BankReconTransactionRecord): void {
  const all = loadBankReconTransactions();
  const enriched = enrichRecordWithManualDefaults(txn);
  const idx = all.findIndex((t) => t.id === enriched.id);
  if (idx >= 0) all[idx] = enriched;
  else all.push(enriched);
  saveBankReconTransactions(all);
}

export function loadImportBatches(bankAccountId?: string): BankReconImportBatch[] {
  ensureBankReconRegisterSeeded();
  const batches = readJson<BankReconImportBatch[]>(BATCH_KEY, []);
  if (!bankAccountId) return batches;
  return batches.filter((b) => b.bankAccountId === bankAccountId);
}

export function getImportBatchById(id: string): BankReconImportBatch | undefined {
  return loadImportBatches().find((b) => b.id === id);
}

export function saveImportBatch(batch: BankReconImportBatch): void {
  const batches = loadImportBatches();
  batches.unshift(batch);
  writeJson(BATCH_KEY, batches);
}

export function loadSavedFormats(bankAccountId?: string): BankReconSavedFormat[] {
  ensureBankReconRegisterSeeded();
  const formats = readJson<BankReconSavedFormat[]>(FORMAT_KEY, []);
  if (!bankAccountId) return formats;
  return formats.filter((f) => f.bankAccountId === bankAccountId);
}

export function saveSavedFormat(format: BankReconSavedFormat): void {
  const formats = loadSavedFormats();
  const idx = formats.findIndex((f) => f.id === format.id);
  if (idx >= 0) formats[idx] = format;
  else formats.push(format);
  writeJson(FORMAT_KEY, formats);
}

export function getSavedFormatById(id: string): BankReconSavedFormat | undefined {
  return loadSavedFormats().find((f) => f.id === id);
}

export function loadAccountImportMeta(bankAccountId: string): BankReconAccountMeta {
  ensureBankReconRegisterSeeded();
  const all = readJson<BankReconAccountMeta[]>(META_KEY, []);
  return (
    all.find((m) => m.bankAccountId === bankAccountId) ?? {
      bankAccountId,
      lastStatementImportedUntil: null,
      lastImportBatchId: null,
      lastImportFileName: null,
    }
  );
}

export function updateAccountImportMeta(meta: BankReconAccountMeta): void {
  const all = readJson<BankReconAccountMeta[]>(META_KEY, []);
  const idx = all.findIndex((m) => m.bankAccountId === meta.bankAccountId);
  if (idx >= 0) all[idx] = meta;
  else all.push(meta);
  writeJson(META_KEY, all);
}

export function createImportBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTransactionId(): string {
  return nextTransactionId();
}

export function createSavedFormatId(): string {
  return `fmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildBatchNumber(): string {
  return nextBatchNumber();
}

export const DEFAULT_AMOUNT_FORMAT: BankReconAmountFormatConfig = {
  decimalSeparator: ".",
  thousandSeparator: ",",
  currencySymbol: true,
  bracketsNegative: true,
  drCrSuffix: true,
  debitAsNegative: true,
};

export const DEFAULT_DIRECTION_RULES: BankReconDirectionRules = {
  mode: "separate_columns",
  creditLabels: ["CR", "CREDIT", "C"],
  debitLabels: ["DR", "DEBIT", "D"],
  positiveIsDeposit: true,
};

export function normalizeNarration(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function transactionFingerprint(
  bankAccountId: string,
  statementDate: string,
  amount: number,
  direction: "deposit" | "withdrawal",
  reference: string,
  narration: string,
): string {
  const ref = reference.trim().toUpperCase();
  if (ref) {
    return `${bankAccountId}|${ref}|${amount}|${direction}`;
  }
  return `${bankAccountId}|${statementDate}|${amount}|${direction}|${normalizeNarration(narration)}`;
}

export function findManualTransactionMatch(
  bankAccountId: string,
  reference: string,
  deposit: number,
  withdrawal: number,
  existing: BankReconTransactionRecord[],
): BankReconTransactionRecord | undefined {
  const direction = deposit > 0 ? "deposit" : "withdrawal";
  const amount = deposit || withdrawal;
  const refNorm = normalizeReferenceForCompare(reference);

  return existing.find((t) => {
    if (t.bankAccountId !== bankAccountId) return false;
    if (t.source !== "Manual" && t.source !== "Manual + Statement") return false;
    if (t.manualEntryStatus === "Cancelled" || t.manualEntryStatus === "Draft") return false;
    const tAmount = t.deposit || t.withdrawal;
    const tDir = t.deposit > 0 ? "deposit" : "withdrawal";
    if (tAmount !== amount || tDir !== direction) return false;
    if (!refNorm) return false;
    const keys = [t.reference, t.utrNumber, t.chequeNo, t.transactionIdRef]
      .filter(Boolean)
      .map((r) => normalizeReferenceForCompare(r!));
    return keys.some((k) => k === refNorm && k.length > 0);
  });
}

export function linkManualWithStatement(
  manual: BankReconTransactionRecord,
  imported: Partial<BankReconTransactionRecord>,
  batchId: string,
  importedBy: string,
): BankReconTransactionRecord {
  return {
    ...manual,
    source: "Manual + Statement",
    verificationStatus: "Verified",
    statementDate: imported.statementDate ?? manual.statementDate,
    valueDate: imported.valueDate ?? manual.valueDate,
    bookDate: manual.bookDate,
    reference: imported.reference || manual.reference,
    utrNumber: imported.utrNumber ?? manual.utrNumber,
    chequeNo: imported.chequeNo ?? manual.chequeNo,
    narration: manual.narration,
    importedNarration: imported.narration ?? null,
    runningBalance: imported.runningBalance ?? manual.runningBalance,
    importedFileName: imported.importedFileName ?? manual.importedFileName,
    importBatchId: batchId,
    importedBy,
    importedOn: new Date().toISOString(),
    originalRowNumber: imported.originalRowNumber ?? manual.originalRowNumber,
    originalRawData: imported.originalRawData ?? manual.originalRawData,
    savedFormatId: imported.savedFormatId ?? manual.savedFormatId,
    statementPeriodFrom: imported.statementPeriodFrom ?? manual.statementPeriodFrom,
    statementPeriodTo: imported.statementPeriodTo ?? manual.statementPeriodTo,
    linkedManualTransactionId: manual.id,
    activity: [
      ...manual.activity,
      {
        id: `link-${Date.now()}`,
        label: "Linked with Statement Import",
        detail: `Statement line linked to manual entry — book date preserved (${manual.bookDate ?? "—"})`,
        actor: importedBy,
        timestamp: new Date().toLocaleString("en-IN"),
        tone: "emerald" as const,
      },
    ],
  };
}

export function getBankReconTransactionById(id: string): BankReconTransactionRecord | undefined {
  return loadBankReconTransactions().find((t) => t.id === id);
}

export function notifyRegisterUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bank-recon-register-updated"));
  }
}

export function nextManualTransactionNumber(bankAccountId: string): string {
  const prefix = bankAccountId.split("-").map((p) => p.slice(0, 4).toUpperCase()).join("").slice(0, 4) || "BNK";
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  manualSeqCounter[key] = (manualSeqCounter[key] ?? 0) + 1;
  const stored = readJson<Record<string, number>>("dharitri_bank_recon_manual_seq", {});
  stored[key] = (stored[key] ?? 0) + 1;
  writeJson("dharitri_bank_recon_manual_seq", stored);
  manualSeqCounter = stored;
  return `MBT-${prefix}-${year}-${String(stored[key]).padStart(5, "0")}`;
}

export function loadActiveBankReconTransactions(bankAccountId?: string): BankReconTransactionRecord[] {
  return loadBankReconTransactions(bankAccountId).filter((t) => t.manualEntryStatus !== "Cancelled");
}

export function createImportedTransaction(
  fields: Partial<BankReconTransactionRecord> &
    Pick<
      BankReconTransactionRecord,
      | "bankAccountId"
      | "statementDate"
      | "valueDate"
      | "reference"
      | "narration"
      | "partyLedger"
      | "deposit"
      | "withdrawal"
      | "source"
      | "matchStatus"
      | "verificationStatus"
    >,
): BankReconTransactionRecord {
  return enrichRecordWithManualDefaults({
    ...fields,
    id: createTransactionId(),
    activity: [
      {
        id: `imp-${Date.now()}`,
        label: "Statement Imported",
        detail: `Imported from ${fields.importedFileName ?? "bank statement"}`,
        actor: fields.importedBy ?? "User",
        timestamp: new Date().toLocaleString("en-IN"),
        tone: "blue",
      },
    ],
  });
}
