import { findLedgerById, validatePostingLedgerId } from "@/lib/accounts/coa-hierarchy";
import {
  resolveTdsPayableLedger,
  resolveTdsReceivableLedger,
} from "@/lib/accounts/tds-accounting";
import { validateVoucherContactLines } from "@/lib/accounts/voucher-ledger-groups";
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

function clearVoucherCaches(): void {
  voucherListCache = null;
  ledgerMovementIndex = null;
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
}

function ensureLedgerMovementIndex(): Map<number, LedgerMovementTotals> {
  if (ledgerMovementIndex) return ledgerMovementIndex;
  ledgerMovementIndex = new Map();
  for (const voucher of loadVouchers()) {
    if (voucher.status !== "posted" && voucher.status !== "approved") continue;
    for (const line of voucher.lines) {
      if (!line.ledgerId) continue;
      const totals = ledgerMovementIndex.get(line.ledgerId) ?? { debit: 0, credit: 0 };
      totals.debit += Number(line.debit) || 0;
      totals.credit += Number(line.credit) || 0;
      ledgerMovementIndex.set(line.ledgerId, totals);
    }
  }
  return ledgerMovementIndex;
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
    const ledger = line.ledgerId ? findLedgerById(line.ledgerId, records) : null;
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
  v: Pick<AccountingVoucher, "lines" | "date" | "narration">,
): string | null {
  const draftErr = validateVoucherDraft(v);
  if (draftErr) return draftErr;
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
  amount: number;
  referenceNo?: string;
  /** Payment only — expense ledger when paying a direct expense */
  expenseHeadLedgerId?: number | null;
  expenseHeadLedgerName?: string;
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

/** Receipt: Dr Bank/Cash (+ Dr TDS Receivable) · Cr Party */
export function buildReceiptVoucherLines(input: SimpleCashVoucherInput): VoucherLine[] {
  const net = roundMoney(input.amount);
  const tds = roundMoney(input.tdsAmount ?? 0);
  const gross = roundMoney(net + tds);
  const remarks = input.referenceNo?.trim() ?? "";
  const lines: VoucherLine[] = [];

  if (input.bankCashLedgerId && net > 0) {
    lines.push({
      id: nextLineId(),
      ledgerId: input.bankCashLedgerId,
      ledgerName: input.bankCashLedgerName,
      debit: net,
      credit: 0,
      remarks,
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
      remarks,
    });
  }
  return lines;
}

/** Payment: Dr Party/Expense (+ gross includes TDS) · Cr Bank/Cash · Cr TDS Payable */
export function buildPaymentVoucherLines(input: SimpleCashVoucherInput): VoucherLine[] {
  const net = roundMoney(input.amount);
  const tds = roundMoney(input.tdsAmount ?? 0);
  const gross = roundMoney(net + tds);
  const remarks = input.referenceNo?.trim() ?? "";
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
      remarks,
    });
  }
  if (input.bankCashLedgerId && net > 0) {
    lines.push({
      id: nextLineId(1),
      ledgerId: input.bankCashLedgerId,
      ledgerName: input.bankCashLedgerName,
      debit: 0,
      credit: net,
      remarks,
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
  const debitId = input.expenseHeadLedgerId ?? input.partyLedgerId;
  if (!debitId) return "Paid To or Expense Head is required.";
  if (!input.bankCashLedgerId) return "Paid From / Bank or Cash Ledger is required.";
  if (!(Number(input.amount) > 0)) return "Amount must be greater than zero.";
  const tds = roundMoney(input.tdsAmount ?? 0);
  if (tds > 0) {
    const { id } = resolveTdsLedgerForInput(input, "payable");
    if (!id) return "Select a TDS section when TDS amount is entered.";
  }
  return null;
}

export function validateReceiptVoucherForPost(input: SimpleCashVoucherInput): string | null {
  if (!input.partyLedgerId) return "Received From / Party Ledger is required.";
  if (!input.bankCashLedgerId) return "Deposit To / Bank or Cash Ledger is required.";
  if (!(Number(input.amount) > 0)) return "Amount must be greater than zero.";
  const tds = roundMoney(input.tdsAmount ?? 0);
  if (tds > 0) {
    const { id } = resolveTdsLedgerForInput(input, "receivable");
    if (!id) return "Select a TDS section when TDS amount is entered.";
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
}

/** Contra: Dr Transfer To · Cr Transfer From */
export function buildContraVoucherLines(input: SimpleContraVoucherInput): VoucherLine[] {
  const amount = roundMoney(input.amount);
  const lines: VoucherLine[] = [];
  if (input.toLedgerId) {
    lines.push({
      id: nextLineId(),
      ledgerId: input.toLedgerId,
      ledgerName: input.toLedgerName,
      debit: amount,
      credit: 0,
      remarks: input.referenceNo?.trim() ?? "",
    });
  }
  if (input.fromLedgerId) {
    lines.push({
      id: nextLineId(1),
      ledgerId: input.fromLedgerId,
      ledgerName: input.fromLedgerName,
      debit: 0,
      credit: amount,
      remarks: input.referenceNo?.trim() ?? "",
    });
  }
  return lines;
}

export function validateContraVoucherForPost(input: SimpleContraVoucherInput): string | null {
  if (!input.fromLedgerId) return "Transfer From ledger is required.";
  if (!input.toLedgerId) return "Transfer To ledger is required.";
  if (input.fromLedgerId === input.toLedgerId) {
    return "Transfer From and Transfer To must be different ledgers.";
  }
  if (!(Number(input.amount) > 0)) return "Amount must be greater than zero.";
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

  return {
    partyLedgerId,
    partyLedgerName,
    expenseHeadLedgerId,
    expenseHeadLedgerName,
    bankCashLedgerId,
    bankCashLedgerName,
    amount: roundMoney(amount),
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

