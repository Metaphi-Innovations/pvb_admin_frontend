import { findLedgerById, validatePostingLedgerId } from "@/lib/accounts/coa-hierarchy";
import { validateVoucherContactLines } from "@/lib/accounts/voucher-ledger-groups";
import { formatMoney } from "@/lib/accounts/money-format";
import type { RecordStatus } from "../data";
import { loadChartOfAccounts, nextId } from "../data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
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
  createdBy: string;
  updatedBy: string;
}

const VOUCHER_KEY = "ds_accounts_vouchers_v1";

const VOUCHER_SEED: AccountingVoucher[] = [];

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
  return getOrSeed().map(normalizeVoucher);
}

export function saveVouchers(list: AccountingVoucher[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOUCHER_KEY, JSON.stringify(list));
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

export function calcLineTotals(lines: VoucherLine[]) {
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  return { totalDebit, totalCredit };
}

export function validateVoucherDraft(v: Pick<AccountingVoucher, "date">): string | null {
  if (!v.date) return "Voucher date is required.";
  return null;
}

/** Ensures each line posts to an active COA ledger — never to structural nodes */
export function validateVoucherLines(
  lines: VoucherLine[],
  records = loadChartOfAccounts(),
): string | null {
  const active = lines.filter((l) => (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0);
  if (active.length < 2) {
    return "At least two ledger lines with debit or credit are required.";
  }
  for (const line of active) {
    const ledgerErr = validatePostingLedgerId(line.ledgerId, records);
    if (ledgerErr) return ledgerErr;
  }
  return null;
}

export function normalizeVoucherLines(
  lines: VoucherLine[],
  records = loadChartOfAccounts(),
): VoucherLine[] {
  return lines.map((line) => {
    const ledger = line.ledgerId ? findLedgerById(line.ledgerId, records) : null;
    return {
      ...line,
      ledgerId: ledger?.id ?? null,
      ledgerName: ledger?.accountName ?? line.ledgerName,
    };
  });
}

export function validateVoucherForPost(
  v: Pick<AccountingVoucher, "lines" | "date" | "narration">,
): string | null {
  const draftErr = validateVoucherDraft(v);
  if (draftErr) return draftErr;
  const records = loadChartOfAccounts();
  const lineErr = validateVoucherLines(v.lines, records);
  if (lineErr) return lineErr;
  const filled = v.lines.filter(
    (l) => l.ledgerId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0),
  );
  const { totalDebit, totalCredit } = calcLineTotals(filled);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return `Debit (${formatMoney(totalDebit)}) must equal Credit (${formatMoney(totalCredit)}).`;
  }
  if (totalDebit === 0) return "Voucher amount cannot be zero.";
  const contactErr = validateVoucherContactLines(v.lines, records);
  if (contactErr) return contactErr;
  return null;
}

/** @deprecated use validateVoucherForPost */
export function validateVoucher(v: Pick<AccountingVoucher, "lines" | "date" | "narration">): string | null {
  return validateVoucherForPost(v);
}

export const EMPTY_LINE = (): VoucherLine => ({
  id: Date.now(),
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
  return row;
}

