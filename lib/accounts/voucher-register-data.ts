/**
 * Live voucher register rows — derived from posted vouchers (single source of truth).
 */

import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import {
  getPostedVouchers,
  getVouchersByType,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { roundMoney } from "@/lib/accounts/money-format";

export type CashVoucherRegisterType = "receipt" | "payment" | "contra";

export interface VoucherRegisterRow {
  id: number;
  date: string;
  voucherNo: string;
  referenceNo: string;
  debitLedger: string;
  creditLedger: string;
  debitLedgerId: number | null;
  creditLedgerId: number | null;
  narration: string;
  amount: number;
  createdBy: string;
  paymentMode: string;
  financialYearId: number | null;
  viewHref: string;
}

export type VoucherRegisterSortKey =
  | "date"
  | "voucherNo"
  | "debitLedger"
  | "creditLedger"
  | "amount"
  | "referenceNo";

export interface VoucherRegisterFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  ledgerSearch?: string;
}

export interface VoucherRegisterSummary {
  count: number;
  totalAmount: number;
}

const REGISTER_LABELS: Record<CashVoucherRegisterType, string> = {
  receipt: "Receipt Register",
  payment: "Payment Register",
  contra: "Contra Register",
};

export function voucherRegisterTitle(type: CashVoucherRegisterType): string {
  return REGISTER_LABELS[type];
}

function primaryDebitCreditLines(v: AccountingVoucher): {
  debitLine: (typeof v.lines)[0] | undefined;
  creditLine: (typeof v.lines)[0] | undefined;
} {
  const active = v.lines.filter(
    (l) => l.ledgerId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0),
  );
  const isTds = (l: (typeof v.lines)[0]) =>
    l.remarks?.toLowerCase().includes("tds") || l.ledgerName.toLowerCase().includes("tds");

  const debitLines = active.filter((l) => (Number(l.debit) || 0) > 0 && !isTds(l));
  const creditLines = active.filter((l) => (Number(l.credit) || 0) > 0 && !isTds(l));

  return {
    debitLine: debitLines[0],
    creditLine: creditLines[0],
  };
}

export function voucherToRegisterRow(
  v: AccountingVoucher,
  type: CashVoucherRegisterType,
): VoucherRegisterRow {
  const { debitLine, creditLine } = primaryDebitCreditLines(v);
  const amount = roundMoney(v.totalDebit || v.totalCredit);

  return {
    id: v.id,
    date: v.date,
    voucherNo: v.voucherNumber,
    referenceNo: v.referenceNo?.trim() || "—",
    debitLedger: debitLine?.ledgerName?.trim() || "—",
    creditLedger: creditLine?.ledgerName?.trim() || "—",
    debitLedgerId: debitLine?.ledgerId ?? null,
    creditLedgerId: creditLine?.ledgerId ?? null,
    narration: v.narration?.trim() || "—",
    amount,
    createdBy: v.createdBy ?? "—",
    paymentMode: v.paymentMode?.trim() || "—",
    financialYearId: v.financialYearId,
    viewHref: `/accounts/vouchers/view/${v.id}`,
  };
}

export function buildVoucherRegisterRows(type: CashVoucherRegisterType): VoucherRegisterRow[] {
  return getVouchersByType(type)
    .filter((v) => v.status === "posted" || v.status === "approved")
    .map((v) => voucherToRegisterRow(v, type))
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.voucherNo.localeCompare(b.voucherNo);
    });
}

export function filterVoucherRegisterRows(
  rows: VoucherRegisterRow[],
  filters: VoucherRegisterFilters,
): VoucherRegisterRow[] {
  const q = filters.search?.trim().toLowerCase() ?? "";
  const ledgerQ = filters.ledgerSearch?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    if (ledgerQ) {
      const match =
        row.debitLedger.toLowerCase().includes(ledgerQ) ||
        row.creditLedger.toLowerCase().includes(ledgerQ);
      if (!match) return false;
    }
    if (q) {
      const hay = [
        row.voucherNo,
        row.referenceNo,
        row.debitLedger,
        row.creditLedger,
        row.narration,
        row.paymentMode,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortVoucherRegisterRows(
  rows: VoucherRegisterRow[],
  sortKey: VoucherRegisterSortKey,
  sortDir: "asc" | "desc",
): VoucherRegisterRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherNo":
        cmp = a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "debitLedger":
        cmp = a.debitLedger.localeCompare(b.debitLedger);
        break;
      case "creditLedger":
        cmp = a.creditLedger.localeCompare(b.creditLedger);
        break;
      case "amount":
        cmp = a.amount - b.amount;
        break;
      case "referenceNo":
        cmp = a.referenceNo.localeCompare(b.referenceNo);
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function computeVoucherRegisterSummary(rows: VoucherRegisterRow[]): VoucherRegisterSummary {
  return {
    count: rows.length,
    totalAmount: roundMoney(rows.reduce((s, r) => s + r.amount, 0)),
  };
}

export function formatVoucherRegisterDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** All posted manual vouchers for day book merge */
export function getPostedManualVouchersForDayBook(): AccountingVoucher[] {
  return getPostedVouchers().filter((v) =>
    (["receipt", "payment", "contra", "journal"] as VoucherTypeCode[]).includes(v.voucherType),
  );
}
