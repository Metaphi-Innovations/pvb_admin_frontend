/**
 * Lightweight voucher list reads — avoids pulling posting/COA validation into list pages.
 */

import type { RecordStatus } from "../data";
import type { VoucherTypeCode } from "../masters/masters-data";
import type { AccountsDocumentWorkflow } from "@/lib/accounts/accounts-maker-checker";
import { canEditAccountsDocument } from "@/lib/accounts/accounts-maker-checker";

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
  entryMode?: VoucherEntryMode;
  paymentMode?: string;
  workflow?: AccountsDocumentWorkflow;
  createdBy: string;
  updatedBy: string;
}

const VOUCHER_KEY = "ds_accounts_vouchers_v1";

const VOUCHER_SEED: AccountingVoucher[] = [];

let voucherListCache: AccountingVoucher[] | null = null;

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

function normalizeVoucher(v: AccountingVoucher): AccountingVoucher {
  return {
    ...v,
    financialYearId: v.financialYearId ?? null,
    financialYearName: v.financialYearName ?? "",
    entryMode: v.entryMode,
    paymentMode: v.paymentMode,
    workflow: v.workflow,
  };
}

export function invalidateVoucherListCache(): void {
  voucherListCache = null;
}

export function loadVouchersForList(): AccountingVoucher[] {
  if (voucherListCache) return voucherListCache;
  voucherListCache = getOrSeed().map(normalizeVoucher);
  return voucherListCache;
}

export function getVouchersByTypeForList(type: VoucherTypeCode): AccountingVoucher[] {
  return loadVouchersForList()
    .filter((v) => v.voucherType === type)
    .map(normalizeVoucher);
}

export function canEditVoucherForList(voucher: AccountingVoucher): boolean {
  return canEditAccountsDocument(voucher.workflow, voucher.status);
}
