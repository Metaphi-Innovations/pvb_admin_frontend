import {
  findLedgerById,
  findPostingLedgerByName,
  validatePostingLedgerId,
} from "@/lib/accounts/coa-hierarchy";
import {
  resolveTdsPayableLedger,
  resolveTdsReceivableLedger,
} from "@/lib/accounts/tds-accounting";
import { validateVoucherContactLines } from "@/lib/accounts/voucher-ledger-groups";
import {
  validateContraVoucherLedgerScopes,
  validatePaymentVoucherLedgerScopes,
  validateReceiptVoucherLedgerScopes,
  ledgerMatchesReceiptDebitScope,
  ledgerMatchesReceiptCreditScope,
  ledgerMatchesPaymentDebitScope,
  ledgerMatchesPaymentCreditScope,
} from "@/lib/accounts/voucher-quick-add-ledger";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import type { RecordStatus } from "../data";
import { loadChartOfAccounts, nextId } from "../data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type { AccountsDocumentWorkflow } from "@/lib/accounts/accounts-maker-checker";
import {
  canEditAccountsDocument,
  resolveWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";
import { attachWorkflowOnCreate } from "@/lib/accounts/accounts-workflow-persist";
import {
  type VoucherTypeCode,
  loadFinancialYears,
  loadVoucherTypes,
  VOUCHER_TYPE_LABELS,
} from "../masters/masters-data";

export type { VoucherTypeCode };
export { VOUCHER_TYPE_LABELS };

export interface VoucherLine {
  id: number;
  ledgerId: number | null;
  ledgerName: string;
  debit: number;
  credit: number;
  remarks: string;
  contactId?: number | null;
  contactName?: string;
}

export type VoucherEntryMode = "simple" | "double";

export interface AccountingVoucher {
  id: number;
  voucherType: VoucherTypeCode;
  voucherNumber: string;
  date: string;
  financialYearId: number | null;
  financialYearName: string;
  referenceNo: string;
  narration: string;
  lines: VoucherLine[];
  totalDebit: number;
  totalCredit: number;
  status: RecordStatus;
  /** Simple vs double entry UI mode — receipt, payment, contra only */
  entryMode?: VoucherEntryMode;
  /** Payment mode for receipt/payment simple entry */
  paymentMode?: string;
  workflow?: AccountsDocumentWorkflow;
  createdBy: string;
  updatedBy: string;
}

const VOUCHER_KEY = "ds_accounts_vouchers_v1";

const VOUCHER_SEED: AccountingVoucher[] = [];

export type LedgerMovementTotals = { debit: number; credit: number };

let voucherListCache: AccountingVoucher[] | null = null;
let ledgerMovementIndex: Map<number, LedgerMovementTotals> | null = null;
let ledgersWithPostings: Set<number> | null = null;
let voucherCacheGeneration = 0;

function clearVoucherCaches(): void {
  voucherListCache = null;
  ledgerMovementIndex = null;
  ledgersWithPostings = null;
  voucherCacheGeneration += 1;
  try {
    const { invalidateVoucherListCache } =
      require("./voucher-list-data") as typeof import("./voucher-list-data");
    invalidateVoucherListCache();
  } catch {
    // optional during module init
  }
}

export function getVoucherCacheGeneration(): number {
  return voucherCacheGeneration;
}

function getOrSeed(): AccountingVoucher[] {
  if (typeof window === "undefined") return VOUCHER_SEED;
  try {
    const raw = localStorage.getItem(VOUCHER_KEY);
    if (!raw) {
      localStorage.setItem(VOUCHER_KEY, JSON.stringify(VOUCHER_SEED));
      return VOUCHER_SEED;
    }
    return JSON.parse(raw) as AccountingVoucher[];
  } catch {
    return VOUCHER_SEED;
  }
}

export function loadVouchers(): AccountingVoucher[] {
  if (voucherListCache) return voucherListCache;
  voucherListCache = getOrSeed().map(normalizeVoucher);
  return voucherListCache;
}

export function saveVouchers(list: AccountingVoucher[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOUCHER_KEY, JSON.stringify(list));
  clearVoucherCaches();
  try {
    const { invalidateLedgerReportCaches } = require("@/lib/accounts/ledger-reports") as typeof import("@/lib/accounts/ledger-reports");
    invalidateLedgerReportCaches();
  } catch {
    // optional
  }
  try {
    window.dispatchEvent(new CustomEvent("ds-accounts-vouchers-updated"));
  } catch {
    // optional
  }
}

function ensureLedgerMovementIndex(): Map<number, LedgerMovementTotals> {
  if (ledgerMovementIndex) return ledgerMovementIndex;
  ledgerMovementIndex = new Map();
  ledgersWithPostings = new Set();
  for (const voucher of loadVouchers()) {
    if (voucher.status !== "posted" && voucher.status !== "approved") continue;
    for (const line of voucher.lines) {
      if (!line.ledgerId) continue;
      ledgersWithPostings.add(line.ledgerId);
      const totals = ledgerMovementIndex.get(line.ledgerId) ?? { debit: 0, credit: 0 };
      totals.debit += Number(line.debit) || 0;
      totals.credit += Number(line.credit) || 0;
      ledgerMovementIndex.set(line.ledgerId, totals);
    }
  }
  return ledgerMovementIndex;
}

/** O(1) — whether any posted voucher line targets this ledger. */
export function ledgerHasVoucherPostings(ledgerId: number): boolean {
  ensureLedgerMovementIndex();
  return ledgersWithPostings?.has(ledgerId) ?? false;
}

/** O(1) debit/credit totals per ledger — built once per voucher cache epoch. */
export function getLedgerMovementTotals(ledgerId: number): LedgerMovementTotals {
  return ensureLedgerMovementIndex().get(ledgerId) ?? { debit: 0, credit: 0 };
}

export function getPostedVouchers(): AccountingVoucher[] {
  return loadVouchers().filter((v) => v.status === "posted" || v.status === "approved");
}

export function getVouchersByType(type: VoucherTypeCode): AccountingVoucher[] {
  return loadVouchers()
    .filter((v) => v.voucherType === type)
    .map(normalizeVoucher);
}

export function getVoucherById(id: number): AccountingVoucher | undefined {
  return loadVouchers().find((v) => v.id === id);
}

function normalizeVoucher(v: AccountingVoucher): AccountingVoucher {
  return {
    ...v,
    financialYearId: v.financialYearId ?? null,
    financialYearName: v.financialYearName ?? "",
    entryMode: v.entryMode,
    paymentMode: v.paymentMode,
  };
}

export function getJournalVouchers(): AccountingVoucher[] {
  return getVouchersByType("journal");
}

export function generateVoucherNumber(type: VoucherTypeCode, existing: AccountingVoucher[]): string {
  const vt = loadVoucherTypes().find((t) => t.code === type);
  const prefix = vt?.prefix ?? type.slice(0, 3).toUpperCase();
  const nums = existing
    .filter((v) => v.voucherType === type)
    .map((v) => {
      const m = v.voucherNumber.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const next = nums.length ? Math.max(...nums) + 1 : vt?.startingNumber ?? 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export function lineDebitAmount(line: Pick<VoucherLine, "debit">): number {
  return roundMoney(line.debit);
}

export function lineCreditAmount(line: Pick<VoucherLine, "credit">): number {
  return roundMoney(line.credit);
}

export function calcLineTotals(lines: VoucherLine[]) {
  const totalDebit = roundMoney(lines.reduce((s, l) => s + lineDebitAmount(l), 0));
  const totalCredit = roundMoney(lines.reduce((s, l) => s + lineCreditAmount(l), 0));
  return { totalDebit, totalCredit };
}

export function voucherAmountDifference(totalDebit: number, totalCredit: number): number {
  return roundMoney(Math.abs(roundMoney(totalDebit) - roundMoney(totalCredit)));
}

export function isVoucherBalanced(totalDebit: number, totalCredit: number): boolean {
  return voucherAmountDifference(totalDebit, totalCredit) === 0;
}

function linesWithAmount(lines: VoucherLine[]): VoucherLine[] {
  return lines.filter((l) => lineDebitAmount(l) > 0 || lineCreditAmount(l) > 0);
}

function postedVoucherLines(lines: VoucherLine[]): VoucherLine[] {
  return lines.filter(
    (l) => l.ledgerId && (lineDebitAmount(l) > 0 || lineCreditAmount(l) > 0),
  );
}

export function normalizeVoucherLineAmounts(line: VoucherLine): VoucherLine {
  return {
    ...line,
    debit: lineDebitAmount(line),
    credit: lineCreditAmount(line),
  };
}

export function validateVoucherDraft(v: Pick<AccountingVoucher, "date">): string | null {
  if (!v.date) return "Voucher date is required.";
  return null;
}

/** Draft save — allows single-sided / unbalanced entries */
export function validateVoucherDraftForSave(
  v: Pick<AccountingVoucher, "date" | "lines">,
): string | null {
  const dateErr = validateVoucherDraft(v);
  if (dateErr) return dateErr;
  const hasEntry = v.lines.some(
    (l) =>
      l.ledgerId ||
      Boolean(l.ledgerName?.trim()) ||
      lineDebitAmount(l) > 0 ||
      lineCreditAmount(l) > 0,
  );
  if (!hasEntry) {
    return "Add at least one ledger line with a debit or credit amount.";
  }
  return null;
}

/** Ensures each line posts to an active COA ledger — never to structural nodes */
export function validateVoucherLines(
  lines: VoucherLine[],
  records = loadChartOfAccounts(),
): string | null {
  const active = linesWithAmount(lines);
  if (active.length < 2) {
    return "At least two ledger lines with debit or credit are required.";
  }
  for (const line of active) {
    if (!line.ledgerId) {
      return "Select a ledger for every row with an amount.";
    }
    const ledgerErr = validatePostingLedgerId(line.ledgerId, records);
    if (ledgerErr) return ledgerErr;
    if (lineDebitAmount(line) > 0 && lineCreditAmount(line) > 0) {
      return "A ledger line cannot have both debit and credit amounts.";
    }
    if (lineDebitAmount(line) <= 0 && lineCreditAmount(line) <= 0) {
      return "Each ledger line must have an amount greater than zero.";
    }
  }
  return null;
}

export function normalizeVoucherLines(
  lines: VoucherLine[],
  records = loadChartOfAccounts(),
): VoucherLine[] {
  return lines.map((line) => {
    let ledger = line.ledgerId ? findLedgerById(line.ledgerId, records) : null;
    if (!ledger && line.ledgerName?.trim()) {
      ledger = findPostingLedgerByName(line.ledgerName, records);
    }
    return normalizeVoucherLineAmounts({
      ...line,
      ledgerId: ledger?.id ?? line.ledgerId ?? null,
      ledgerName: ledger?.accountName ?? line.ledgerName,
    });
  });
}

/** Keep rows with any entered data when saving a draft */
export function compactDraftVoucherLines(lines: VoucherLine[]): VoucherLine[] {
  const meaningful = lines.filter(
    (l) =>
      l.ledgerId ||
      Boolean(l.ledgerName?.trim()) ||
      lineDebitAmount(l) > 0 ||
      lineCreditAmount(l) > 0 ||
      Boolean(l.remarks?.trim()),
  );
  return meaningful.length > 0 ? meaningful : lines.slice(0, Math.max(1, lines.length));
}

export function validateVoucherForPost(
  v: Pick<AccountingVoucher, "lines" | "date" | "narration"> & {
    financialYearId?: number | null;
  },
): string | null {
  const draftErr = validateVoucherDraft(v);
  if (draftErr) return draftErr;
  if (v.financialYearId !== undefined && !v.financialYearId) {
    return "Financial year is required.";
  }
  const records = loadChartOfAccounts();
  const lineErr = validateVoucherLines(v.lines, records);
  if (lineErr) return lineErr;
  const filled = postedVoucherLines(v.lines);
  const { totalDebit, totalCredit } = calcLineTotals(filled);
  if (!isVoucherBalanced(totalDebit, totalCredit)) {
    return `Debit (${formatMoney(totalDebit)}) must equal Credit (${formatMoney(totalCredit)}).`;
  }
  if (totalDebit === 0) return "Voucher amount cannot be zero.";
  const contactErr = validateVoucherContactLines(v.lines, records);
  if (contactErr) return contactErr;
  return null;
}

/** Post validation for voucher entry screens — allows one-sided / unbalanced entries. */
export function validateVoucherEntryForPost(
  v: Pick<AccountingVoucher, "lines" | "date">,
): string | null {
  const dateErr = validateVoucherDraft(v);
  if (dateErr) return dateErr;

  const records = loadChartOfAccounts();
  const filled = postedVoucherLines(v.lines.map(normalizeVoucherLineAmounts));

  if (filled.length === 0) {
    return "Add at least one ledger line with a debit or credit amount.";
  }

  for (const line of filled) {
    if (!line.ledgerId) {
      return "Select a ledger for every row with an amount.";
    }
    const ledgerErr = validatePostingLedgerId(line.ledgerId, records);
    if (ledgerErr) return ledgerErr;
    if (lineDebitAmount(line) <= 0 && lineCreditAmount(line) <= 0) {
      return "Amount must be greater than zero.";
    }
  }

  return null;
}

/** Lines to persist when posting — drops empty rows */
export function compactPostedVoucherLines(lines: VoucherLine[]): VoucherLine[] {
  return postedVoucherLines(lines.map(normalizeVoucherLineAmounts));
}

/** @deprecated use validateVoucherForPost */
export function validateVoucher(v: Pick<AccountingVoucher, "lines" | "date" | "narration">): string | null {
  return validateVoucherForPost(v);
}

let emptyLineSeq = 0;

export const EMPTY_LINE = (): VoucherLine => ({
  id: Date.now() + ++emptyLineSeq,
  ledgerId: null,
  ledgerName: "",
  debit: 0,
  credit: 0,
  remarks: "",
});

export type CreateVoucherInput = Omit<
  AccountingVoucher,
  | "id"
  | "voucherNumber"
  | "voucherType"
  | "totalDebit"
  | "totalCredit"
  | "createdBy"
  | "updatedBy"
  | "financialYearId"
  | "financialYearName"
> & {
  financialYearId?: number | null;
  financialYearName?: string;
};

function defaultFinancialYear(): { financialYearId: number | null; financialYearName: string } {
  const active = loadFinancialYears().find((fy) => fy.status === "active");
  return {
    financialYearId: active?.id ?? null,
    financialYearName: active?.name ?? "",
  };
}

export function createVoucher(type: VoucherTypeCode, partial: CreateVoucherInput): AccountingVoucher {
  const records = loadChartOfAccounts();
  const normalizedLines = normalizeVoucherLines(partial.lines, records);
  const list = loadVouchers();
  const { totalDebit, totalCredit } = calcLineTotals(normalizedLines);
  const fyDefaults = defaultFinancialYear();
  const row: AccountingVoucher = {
    ...partial,
    lines: normalizedLines,
    financialYearId: partial.financialYearId ?? fyDefaults.financialYearId,
    financialYearName: partial.financialYearName ?? fyDefaults.financialYearName,
    id: nextId(list),
    voucherType: type,
    voucherNumber: generateVoucherNumber(type, list),
    totalDebit,
    totalCredit,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  list.push(row);
  saveVouchers(list);
  attachWorkflowOnCreate(
    type === "journal"
      ? "journal_entry"
      : type === "receipt"
        ? "receipt_voucher"
        : type === "payment"
          ? "payment_voucher"
          : "journal_entry",
    row.id,
  );
  return row;
}

export interface SimpleCashVoucherInput {
  partyLedgerId: number | null;
  partyLedgerName: string;
  bankCashLedgerId: number | null;
  bankCashLedgerName: string;
  /** Bank / cash side amount (legacy alias: amount) */
  amount: number;
  bankAmount?: number;
  /** Account / ledger side amount */
  accountAmount?: number;
  referenceNo?: string;
  /** Payment only — expense ledger when paying a direct expense */
  expenseHeadLedgerId?: number | null;
  expenseHeadLedgerName?: string;
  /** Per-line remarks on bank/cash and party legs */
  bankLineRemarks?: string;
  partyLineRemarks?: string;
  tdsAmount?: number;
  /** TDS Master section id — auto-resolves payable/receivable ledger */
  tdsSectionMasterId?: number | null;
  tdsLedgerId?: number | null;
  tdsLedgerName?: string;
}

function resolveTdsLedgerForInput(
  input: SimpleCashVoucherInput,
  kind: "payable" | "receivable",
): { id: number | null; name: string } {
  if (input.tdsLedgerId) {
    return { id: input.tdsLedgerId, name: input.tdsLedgerName ?? "" };
  }
  if (input.tdsSectionMasterId != null) {
    const ledger =
      kind === "payable"
        ? resolveTdsPayableLedger(input.tdsSectionMasterId)
        : resolveTdsReceivableLedger(input.tdsSectionMasterId);
    if (ledger) return { id: ledger.id, name: ledger.accountName };
  }
  return { id: null, name: "" };
}

function nextLineId(offset = 0): number {
  return Date.now() + offset;
}

function cashBankAmount(input: SimpleCashVoucherInput): number {
  return roundMoney(input.bankAmount ?? input.amount);
}

function cashAccountAmount(input: SimpleCashVoucherInput): number {
  const bank = cashBankAmount(input);
  const tds = roundMoney(input.tdsAmount ?? 0);
  if (input.accountAmount != null && input.accountAmount > 0) {
    return roundMoney(input.accountAmount);
  }
  return roundMoney(bank + tds);
}

function validateCashVoucherBalance(input: SimpleCashVoucherInput, mode: "receipt" | "payment"): string | null {
  const bank = cashBankAmount(input);
  const account = cashAccountAmount(input);
  const tds = roundMoney(input.tdsAmount ?? 0);
  if (!(bank > 0)) {
    return mode === "receipt" ? "Amount must be greater than zero." : "Enter bank / cash amount.";
  }
  if (!(account > 0)) {
    return mode === "receipt" ? "Amount must be greater than zero." : "Enter account / ledger amount.";
  }
  const expectedAccount = roundMoney(bank + tds);
  if (account !== expectedAccount) {
    if (mode === "receipt") {
      return `Debit and Credit must be equal (${formatMoney(account)}).`;
    }
    const side = mode === "payment" ? "debit" : "credit";
    return `Account ${side} (${formatMoney(account)}) must equal bank amount (${formatMoney(bank)})${tds > 0 ? ` plus TDS (${formatMoney(tds)})` : ""}.`;
  }
  return null;
}

/** Receipt: Dr Bank/Cash (+ Dr TDS Receivable) · Cr Party */
export function buildReceiptVoucherLines(input: SimpleCashVoucherInput): VoucherLine[] {
  const net = cashBankAmount(input);
  const gross = cashAccountAmount(input);
  const tds = roundMoney(input.tdsAmount ?? 0);
  const bankRemarks = input.bankLineRemarks?.trim() ?? input.referenceNo?.trim() ?? "";
  const partyRemarks = input.partyLineRemarks?.trim() ?? input.referenceNo?.trim() ?? "";
  const lines: VoucherLine[] = [];

  if (input.bankCashLedgerId && net > 0) {
    lines.push({
      id: nextLineId(),
      ledgerId: input.bankCashLedgerId,
      ledgerName: input.bankCashLedgerName,
      debit: net,
      credit: 0,
      remarks: bankRemarks,
    });
  }
  const tdsLedger = resolveTdsLedgerForInput(input, "receivable");
  if (tdsLedger.id && tds > 0) {
    lines.push({
      id: nextLineId(1),
      ledgerId: tdsLedger.id,
      ledgerName: tdsLedger.name,
      debit: tds,
      credit: 0,
      remarks: "TDS",
    });
  }
  if (input.partyLedgerId && gross > 0) {
    lines.push({
      id: nextLineId(2),
      ledgerId: input.partyLedgerId,
      ledgerName: input.partyLedgerName,
      debit: 0,
      credit: gross,
      remarks: partyRemarks,
    });
  }
  return lines;
}

/** Payment: Dr Party/Expense (+ gross includes TDS) · Cr Bank/Cash · Cr TDS Payable */
export function buildPaymentVoucherLines(input: SimpleCashVoucherInput): VoucherLine[] {
  const net = cashBankAmount(input);
  const gross = cashAccountAmount(input);
  const tds = roundMoney(input.tdsAmount ?? 0);
  const bankRemarks = input.bankLineRemarks?.trim() ?? input.referenceNo?.trim() ?? "";
  const partyRemarks = input.partyLineRemarks?.trim() ?? input.referenceNo?.trim() ?? "";
  const debitLedgerId = input.expenseHeadLedgerId ?? input.partyLedgerId;
  const debitLedgerName = input.expenseHeadLedgerName ?? input.partyLedgerName;
  const lines: VoucherLine[] = [];

  if (debitLedgerId && gross > 0) {
    lines.push({
      id: nextLineId(),
      ledgerId: debitLedgerId,
      ledgerName: debitLedgerName,
      debit: gross,
      credit: 0,
      remarks: partyRemarks,
    });
  }
  if (input.bankCashLedgerId && net > 0) {
    lines.push({
      id: nextLineId(1),
      ledgerId: input.bankCashLedgerId,
      ledgerName: input.bankCashLedgerName,
      debit: 0,
      credit: net,
      remarks: bankRemarks,
    });
  }
  const tdsLedger = resolveTdsLedgerForInput(input, "payable");
  if (tdsLedger.id && tds > 0) {
    lines.push({
      id: nextLineId(2),
      ledgerId: tdsLedger.id,
      ledgerName: tdsLedger.name,
      debit: 0,
      credit: tds,
      remarks: "TDS",
    });
  }
  return lines;
}

export function validatePaymentVoucherForPost(input: SimpleCashVoucherInput): string | null {
  const records = loadChartOfAccounts();
  const debitId = input.expenseHeadLedgerId ?? input.partyLedgerId;
  if (!debitId) return "Ledger is required.";
  if (!input.bankCashLedgerId) return "Payment Account is required.";
  if (input.bankCashLedgerId === debitId) {
    return "Payment Account and Ledger cannot be the same.";
  }
  const scopeErr = validatePaymentVoucherLedgerScopes(
    input.bankCashLedgerId,
    input.partyLedgerId,
    input.expenseHeadLedgerId ?? null,
    records,
  );
  if (scopeErr) return scopeErr;
  const balanceErr = validateCashVoucherBalance(input, "payment");
  if (balanceErr) return balanceErr;
  const tds = roundMoney(input.tdsAmount ?? 0);
  if (tds > 0) {
    const { id } = resolveTdsLedgerForInput(input, "payable");
    if (!id) return "Select a TDS section when TDS amount is entered.";
  }
  return null;
}

export function validateReceiptVoucherForPost(input: SimpleCashVoucherInput): string | null {
  const records = loadChartOfAccounts();
  if (!input.bankCashLedgerId) return "Receipt Account is required.";
  if (!input.partyLedgerId) return "Ledger is required.";
  if (input.bankCashLedgerId === input.partyLedgerId) {
    return "Receipt Account and Ledger cannot be the same.";
  }
  const scopeErr = validateReceiptVoucherLedgerScopes(
    input.bankCashLedgerId,
    input.partyLedgerId,
    records,
  );
  if (scopeErr) return scopeErr;
  const balanceErr = validateCashVoucherBalance(input, "receipt");
  if (balanceErr) return balanceErr;
  const tds = roundMoney(input.tdsAmount ?? 0);
  if (tds > 0) {
    const { id } = resolveTdsLedgerForInput(input, "receivable");
    if (!id) return "Select a TDS section when TDS amount is entered.";
  }
  return null;
}

export interface ReceiptVoucherGridState {
  receiptLedgerId: number | null;
  receiptLedgerName: string;
  receiptRemarks: string;
  creditLines: VoucherLine[];
}

function isReceiptTdsLine(line: VoucherLine): boolean {
  return (
    line.remarks?.toLowerCase().includes("tds") === true ||
    line.ledgerName.toLowerCase().includes("tds")
  );
}

/** Parse stored receipt voucher lines into receipt-account + credit grid rows. */
export function parseReceiptVoucherGridState(
  lines: VoucherLine[],
  records = loadChartOfAccounts(),
): ReceiptVoucherGridState {
  const active = lines.filter(
    (l) => l.ledgerId && (lineDebitAmount(l) > 0 || lineCreditAmount(l) > 0),
  );

  const debitLines = active.filter((l) => lineDebitAmount(l) > 0 && !isReceiptTdsLine(l));
  const receiptDebit =
    debitLines.find((l) => {
      const ledger = records.find((r) => r.id === l.ledgerId);
      return ledger ? ledgerMatchesReceiptDebitScope(ledger, records) : false;
    }) ?? debitLines[0];

  const creditLines = active
    .filter((l) => lineCreditAmount(l) > 0 && !isReceiptTdsLine(l))
    .map((l) => ({
      ...l,
      debit: 0,
      credit: lineCreditAmount(l),
    }));

  return {
    receiptLedgerId: receiptDebit?.ledgerId ?? null,
    receiptLedgerName: receiptDebit?.ledgerName ?? "",
    receiptRemarks: receiptDebit?.remarks ?? "",
    creditLines: creditLines.length > 0 ? creditLines : [EMPTY_LINE()],
  };
}

/** Build balanced receipt voucher lines: Dr Receipt Account · Cr grid rows. */
export function buildReceiptVoucherLinesFromGrid(
  receiptLedgerId: number,
  receiptLedgerName: string,
  creditLines: VoucherLine[],
  receiptRemarks = "",
): VoucherLine[] {
  const credits = creditLines
    .map(normalizeVoucherLineAmounts)
    .filter((l) => l.ledgerId && lineCreditAmount(l) > 0);
  const totalCredit = roundMoney(credits.reduce((s, l) => s + lineCreditAmount(l), 0));
  const lines: VoucherLine[] = [];

  if (receiptLedgerId && totalCredit > 0) {
    lines.push({
      id: nextLineId(),
      ledgerId: receiptLedgerId,
      ledgerName: receiptLedgerName,
      debit: totalCredit,
      credit: 0,
      remarks: receiptRemarks.trim(),
    });
  }

  credits.forEach((l, idx) => {
    lines.push({
      id: nextLineId(idx + 1),
      ledgerId: l.ledgerId,
      ledgerName: l.ledgerName,
      debit: 0,
      credit: lineCreditAmount(l),
      remarks: l.remarks?.trim() ?? "",
    });
  });

  return lines;
}

export function validateReceiptVoucherGridForPost(
  receiptLedgerId: number | null,
  creditLines: VoucherLine[],
  records = loadChartOfAccounts(),
): string | null {
  if (!receiptLedgerId) return "Receipt Account is required.";

  const credits = creditLines
    .map(normalizeVoucherLineAmounts)
    .filter((l) => l.ledgerId || lineCreditAmount(l) > 0 || Boolean(l.remarks?.trim()));

  const filledCredits = credits.filter((l) => l.ledgerId && lineCreditAmount(l) > 0);
  if (filledCredits.length === 0) return "Add at least one Ledger (Cr) row with amount.";

  for (const line of filledCredits) {
    if (!line.ledgerId) return "Ledger is required on each credit row.";
    if (line.ledgerId === receiptLedgerId) {
      return "Receipt Account and Ledger cannot be the same.";
    }
    const scopeErr = validateReceiptVoucherLedgerScopes(
      receiptLedgerId,
      line.ledgerId,
      records,
    );
    if (scopeErr) return scopeErr;
  }

  const totalCredit = roundMoney(
    filledCredits.reduce((s, l) => s + lineCreditAmount(l), 0),
  );
  if (!(totalCredit > 0)) return "Amount must be greater than zero.";

  return null;
}

export interface PaymentVoucherGridState {
  paymentLedgerId: number | null;
  paymentLedgerName: string;
  paymentRemarks: string;
  debitLines: VoucherLine[];
  tdsAmount: number;
}

function isPaymentTdsLine(line: VoucherLine): boolean {
  return (
    line.remarks?.toLowerCase().includes("tds") === true ||
    line.ledgerName.toLowerCase().includes("tds")
  );
}

/** Parse stored payment voucher lines into payment-account + debit grid rows. */
export function parsePaymentVoucherGridState(
  lines: VoucherLine[],
  records = loadChartOfAccounts(),
): PaymentVoucherGridState {
  const active = lines.filter(
    (l) => l.ledgerId && (lineDebitAmount(l) > 0 || lineCreditAmount(l) > 0),
  );

  const creditLines = active.filter((l) => lineCreditAmount(l) > 0);
  const paymentCredit =
    creditLines.find((l) => {
      if (isPaymentTdsLine(l)) return false;
      const ledger = records.find((r) => r.id === l.ledgerId);
      return ledger ? ledgerMatchesPaymentCreditScope(ledger, records) : false;
    }) ?? creditLines.find((l) => !isPaymentTdsLine(l));

  const tdsLine = creditLines.find(isPaymentTdsLine);

  const debitLines = active
    .filter((l) => lineDebitAmount(l) > 0)
    .map((l) => ({
      ...l,
      credit: 0,
      debit: lineDebitAmount(l),
    }));

  return {
    paymentLedgerId: paymentCredit?.ledgerId ?? null,
    paymentLedgerName: paymentCredit?.ledgerName ?? "",
    paymentRemarks: paymentCredit?.remarks ?? "",
    debitLines: debitLines.length > 0 ? debitLines : [EMPTY_LINE()],
    tdsAmount: tdsLine ? lineCreditAmount(tdsLine) : 0,
  };
}

export interface PaymentVoucherGridBuildOptions {
  paymentRemarks?: string;
  tdsAmount?: number;
  tdsSectionMasterId?: number | null;
  tdsLedgerId?: number | null;
  tdsLedgerName?: string;
}

function resolvePaymentGridTdsLedger(
  options?: PaymentVoucherGridBuildOptions,
): { id: number | null; name: string } {
  if (options?.tdsLedgerId) {
    return { id: options.tdsLedgerId, name: options.tdsLedgerName ?? "" };
  }
  if (options?.tdsSectionMasterId != null) {
    const ledger = resolveTdsPayableLedger(options.tdsSectionMasterId);
    if (ledger) return { id: ledger.id, name: ledger.accountName };
  }
  return { id: null, name: "" };
}

/** Build balanced payment voucher lines: Dr grid rows · Cr Payment Account (+ TDS). */
export function buildPaymentVoucherLinesFromGrid(
  paymentLedgerId: number,
  paymentLedgerName: string,
  debitLines: VoucherLine[],
  options?: PaymentVoucherGridBuildOptions,
): VoucherLine[] {
  const debits = debitLines
    .map(normalizeVoucherLineAmounts)
    .filter((l) => l.ledgerId && lineDebitAmount(l) > 0);
  const totalGross = roundMoney(debits.reduce((s, l) => s + lineDebitAmount(l), 0));
  const tds = roundMoney(options?.tdsAmount ?? 0);
  const bankCredit = roundMoney(Math.max(0, totalGross - tds));
  const lines: VoucherLine[] = [];

  debits.forEach((l, idx) => {
    lines.push({
      id: nextLineId(idx),
      ledgerId: l.ledgerId,
      ledgerName: l.ledgerName,
      debit: lineDebitAmount(l),
      credit: 0,
      remarks: l.remarks?.trim() ?? "",
    });
  });

  if (paymentLedgerId && bankCredit > 0) {
    lines.push({
      id: nextLineId(debits.length),
      ledgerId: paymentLedgerId,
      ledgerName: paymentLedgerName,
      debit: 0,
      credit: bankCredit,
      remarks: options?.paymentRemarks?.trim() ?? "",
    });
  }

  if (tds > 0) {
    const tdsLedger = resolvePaymentGridTdsLedger(options);
    if (tdsLedger.id) {
      lines.push({
        id: nextLineId(debits.length + 1),
        ledgerId: tdsLedger.id,
        ledgerName: tdsLedger.name,
        debit: 0,
        credit: tds,
        remarks: "TDS",
      });
    }
  }

  return lines;
}

export function validatePaymentVoucherGridForPost(
  paymentLedgerId: number | null,
  debitLines: VoucherLine[],
  records = loadChartOfAccounts(),
  options?: Pick<PaymentVoucherGridBuildOptions, "tdsAmount" | "tdsSectionMasterId">,
): string | null {
  if (!paymentLedgerId) return "Payment Account is required.";

  const debits = debitLines
    .map(normalizeVoucherLineAmounts)
    .filter((l) => l.ledgerId || lineDebitAmount(l) > 0 || Boolean(l.remarks?.trim()));

  const filledDebits = debits.filter((l) => l.ledgerId && lineDebitAmount(l) > 0);
  if (filledDebits.length === 0) return "Add at least one Ledger (Dr) row with amount.";

  for (const line of filledDebits) {
    if (!line.ledgerId) return "Ledger is required on each debit row.";
    if (line.ledgerId === paymentLedgerId) {
      return "Payment Account and Ledger cannot be the same.";
    }
    const scopeErr = validatePaymentVoucherLedgerScopes(
      paymentLedgerId,
      line.ledgerId,
      null,
      records,
    );
    if (scopeErr) return scopeErr;
  }

  const totalGross = roundMoney(
    filledDebits.reduce((s, l) => s + lineDebitAmount(l), 0),
  );
  if (!(totalGross > 0)) return "Amount must be greater than zero.";

  const tds = roundMoney(options?.tdsAmount ?? 0);
  if (tds > totalGross + 0.009) {
    return "TDS amount cannot exceed total debit amount.";
  }
  if (tds > 0) {
    const { id } = resolvePaymentGridTdsLedger({
      tdsAmount: tds,
      tdsSectionMasterId: options?.tdsSectionMasterId,
    });
    if (!id) return "Select a vendor with TDS section when TDS amount is entered.";
  }

  return null;
}

export function canEditVoucher(voucher: AccountingVoucher): boolean {
  return canEditAccountsDocument(voucher.workflow, voucher.status);
}

export interface SimpleContraVoucherInput {
  fromLedgerId: number | null;
  fromLedgerName: string;
  toLedgerId: number | null;
  toLedgerName: string;
  amount: number;
  referenceNo?: string;
  fromLineRemarks?: string;
  toLineRemarks?: string;
}

/** Contra: Dr Transfer To · Cr Transfer From */
export function buildContraVoucherLines(input: SimpleContraVoucherInput): VoucherLine[] {
  const amount = roundMoney(input.amount);
  const toRemarks = input.toLineRemarks?.trim() ?? input.referenceNo?.trim() ?? "";
  const fromRemarks = input.fromLineRemarks?.trim() ?? input.referenceNo?.trim() ?? "";
  const lines: VoucherLine[] = [];
  if (input.toLedgerId) {
    lines.push({
      id: nextLineId(),
      ledgerId: input.toLedgerId,
      ledgerName: input.toLedgerName,
      debit: amount,
      credit: 0,
      remarks: toRemarks,
    });
  }
  if (input.fromLedgerId) {
    lines.push({
      id: nextLineId(1),
      ledgerId: input.fromLedgerId,
      ledgerName: input.fromLedgerName,
      debit: 0,
      credit: amount,
      remarks: fromRemarks,
    });
  }
  return lines;
}

export function validateContraVoucherForPost(input: SimpleContraVoucherInput): string | null {
  if (!input.toLedgerId) return "Debit Account is required.";
  if (!input.fromLedgerId) return "Credit Account is required.";
  if (input.fromLedgerId === input.toLedgerId) {
    return "Debit Account and Credit Account must be different.";
  }
  if (!(Number(input.amount) > 0)) return "Amount must be greater than zero.";
  const scopeErr = validateContraVoucherLedgerScopes(
    input.fromLedgerId,
    input.toLedgerId,
    loadChartOfAccounts(),
  );
  if (scopeErr) return scopeErr;
  return null;
}

export function parseContraVoucherFromLines(lines: VoucherLine[]): SimpleContraVoucherInput {
  const active = lines.filter(
    (l) => l.ledgerId && (lineDebitAmount(l) > 0 || lineCreditAmount(l) > 0),
  );
  const debitLine = active.find((l) => lineDebitAmount(l) > 0);
  const creditLine = active.find((l) => lineCreditAmount(l) > 0);
  let amount = 0;
  if (debitLine) amount = lineDebitAmount(debitLine);
  else if (creditLine) amount = lineCreditAmount(creditLine);

  return {
    fromLedgerId: creditLine?.ledgerId ?? null,
    fromLedgerName: creditLine?.ledgerName ?? "",
    toLedgerId: debitLine?.ledgerId ?? null,
    toLedgerName: debitLine?.ledgerName ?? "",
    amount: roundMoney(amount),
    fromLineRemarks: creditLine?.remarks ?? "",
    toLineRemarks: debitLine?.remarks ?? "",
  };
}

export function inferVoucherEntryMode(voucher: AccountingVoucher): VoucherEntryMode {
  if (voucher.entryMode) return voucher.entryMode;
  if (voucher.voucherType === "journal") return "double";

  const active = postedVoucherLines(voucher.lines);
  if (active.length === 2 || active.length === 3) {
    if (voucher.voucherType === "receipt" || voucher.voucherType === "payment") {
      const parsed = parseCashVoucherFromLines(voucher.lines, voucher.voucherType);
      const debitId =
        voucher.voucherType === "payment"
          ? parsed.expenseHeadLedgerId ?? parsed.partyLedgerId
          : parsed.partyLedgerId;
      if (debitId && parsed.bankCashLedgerId && parsed.amount > 0) {
        return "simple";
      }
    }
    if (voucher.voucherType === "contra") {
      const parsed = parseContraVoucherFromLines(voucher.lines);
      if (parsed.fromLedgerId && parsed.toLedgerId && parsed.amount > 0) {
        return "simple";
      }
    }
  }
  return "double";
}

export function parseCashVoucherFromLines(
  lines: VoucherLine[],
  mode: "receipt" | "payment",
): SimpleCashVoucherInput {
  const active = lines.filter(
    (l) => l.ledgerId && (lineDebitAmount(l) > 0 || lineCreditAmount(l) > 0),
  );

  const isTdsLine = (l: VoucherLine) =>
    l.remarks?.toLowerCase().includes("tds") ||
    l.ledgerName.toLowerCase().includes("tds");

  let partyLedgerId: number | null = null;
  let partyLedgerName = "";
  let expenseHeadLedgerId: number | null = null;
  let expenseHeadLedgerName = "";
  let bankCashLedgerId: number | null = null;
  let bankCashLedgerName = "";
  let tdsLedgerId: number | null = null;
  let tdsLedgerName = "";
  let amount = 0;
  let tdsAmount = 0;

  if (mode === "receipt") {
    const creditLine = active.find((l) => lineCreditAmount(l) > 0 && !isTdsLine(l));
    const debitLines = active.filter((l) => lineDebitAmount(l) > 0);
    const tdsLine = debitLines.find(isTdsLine);
    const bankLine = debitLines.find((l) => !isTdsLine(l));

    if (creditLine?.ledgerId) {
      partyLedgerId = creditLine.ledgerId;
      partyLedgerName = creditLine.ledgerName;
    }
    if (bankLine?.ledgerId) {
      bankCashLedgerId = bankLine.ledgerId;
      bankCashLedgerName = bankLine.ledgerName;
      amount = lineDebitAmount(bankLine);
    }
    if (tdsLine?.ledgerId) {
      tdsLedgerId = tdsLine.ledgerId;
      tdsLedgerName = tdsLine.ledgerName;
      tdsAmount = lineDebitAmount(tdsLine);
    }
    if (!amount && creditLine) {
      amount = roundMoney(lineCreditAmount(creditLine) - tdsAmount);
    }
  } else {
    const debitLine = active.find((l) => lineDebitAmount(l) > 0 && !isTdsLine(l));
    const creditLines = active.filter((l) => lineCreditAmount(l) > 0);
    const tdsLine = creditLines.find(isTdsLine);
    const bankLine = creditLines.find((l) => !isTdsLine(l));

    if (debitLine?.ledgerId) {
      partyLedgerId = debitLine.ledgerId;
      partyLedgerName = debitLine.ledgerName;
      const gross = lineDebitAmount(debitLine);
      if (bankLine) {
        amount = lineCreditAmount(bankLine);
        tdsAmount = tdsLine ? lineCreditAmount(tdsLine) : roundMoney(gross - amount);
      } else {
        amount = gross;
      }
    }
    if (bankLine?.ledgerId) {
      bankCashLedgerId = bankLine.ledgerId;
      bankCashLedgerName = bankLine.ledgerName;
      if (!amount) amount = lineCreditAmount(bankLine);
    }
    if (tdsLine?.ledgerId) {
      tdsLedgerId = tdsLine.ledgerId;
      tdsLedgerName = tdsLine.ledgerName;
      tdsAmount = lineCreditAmount(tdsLine);
    }
  }

  const bankAmount = roundMoney(amount);
  let accountAmount = 0;
  let bankLineRemarks = "";
  let partyLineRemarks = "";
  if (mode === "receipt") {
    const creditLine = active.find((l) => lineCreditAmount(l) > 0 && !isTdsLine(l));
    accountAmount = creditLine ? lineCreditAmount(creditLine) : roundMoney(bankAmount + tdsAmount);
    const debitLines = active.filter((l) => lineDebitAmount(l) > 0);
    const bankLine = debitLines.find((l) => !isTdsLine(l));
    if (bankLine) bankLineRemarks = bankLine.remarks ?? "";
    if (creditLine) partyLineRemarks = creditLine.remarks ?? "";
  } else {
    const debitLine = active.find((l) => lineDebitAmount(l) > 0 && !isTdsLine(l));
    accountAmount = debitLine ? lineDebitAmount(debitLine) : roundMoney(bankAmount + tdsAmount);
    const creditLines = active.filter((l) => lineCreditAmount(l) > 0);
    const bankLine = creditLines.find((l) => !isTdsLine(l));
    if (bankLine) bankLineRemarks = bankLine.remarks ?? "";
    if (debitLine) partyLineRemarks = debitLine.remarks ?? "";
  }

  return {
    partyLedgerId,
    partyLedgerName,
    expenseHeadLedgerId,
    expenseHeadLedgerName,
    bankCashLedgerId,
    bankCashLedgerName,
    amount: bankAmount,
    bankAmount,
    accountAmount: roundMoney(accountAmount),
    bankLineRemarks,
    partyLineRemarks,
    tdsAmount: roundMoney(tdsAmount),
    tdsLedgerId,
    tdsLedgerName,
  };
}

export type UpdateVoucherInput = Partial<
  Omit<AccountingVoucher, "id" | "voucherNumber" | "voucherType" | "createdBy">
>;

export function updateVoucher(id: number, partial: UpdateVoucherInput): AccountingVoucher {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === id);
  if (idx < 0) throw new Error("Voucher not found.");
  const current = list[idx];
  if (!canEditVoucher(current)) throw new Error("This voucher cannot be edited.");

  const records = loadChartOfAccounts();
  const lines = partial.lines ? normalizeVoucherLines(partial.lines, records) : current.lines;
  const { totalDebit, totalCredit } = calcLineTotals(lines);
  const updated: AccountingVoucher = {
    ...current,
    ...partial,
    lines,
    totalDebit,
    totalCredit,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  list[idx] = updated;
  saveVouchers(list);
  return updated;
}

