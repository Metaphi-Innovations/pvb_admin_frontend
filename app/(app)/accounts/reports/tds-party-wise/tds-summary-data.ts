/**
 * TDS Summary — transaction-wise rows for Accounts → Reports → TDS Summary.
 * Adapts shared TDS party-wise voucher lines into the client report format.
 */

import {
  loadFinancialYears,
  type FinancialYear,
} from "@/app/(app)/accounts/masters/masters-data";
import { matchesMultiFilter } from "@/lib/accounts/report-multi-filter-utils";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  loadTdsPartyWiseRows,
  resolvePartyGeneralLedgerHref,
  resolveTdsSourceHref,
  type TdsPartyType,
  type TdsPartyWiseRow,
  type TdsSourceVoucherType,
} from "@/lib/accounts/tds-party-wise-data";

export type TdsDeducteeType = TdsPartyType;

export type TdsVoucherTypeFilter = TdsSourceVoucherType;

export interface TdsSummaryTxnRow {
  id: string;
  /** YYYY-MM for sorting / month filter */
  monthKey: string;
  /** Display month e.g. Apr-2025 */
  month: string;
  partyName: string;
  pan: string;
  invoiceDate: string;
  invoiceDateDisplay: string;
  invoiceNo: string;
  amount: number;
  tdsAmount: number;
  tdsRate: string;
  tdsRateValue: number;
  tdsSection: string;
  tdsSectionLabel: string;
  /** More-filter / identity */
  deducteeType: TdsDeducteeType;
  branch: string;
  voucherType: TdsVoucherTypeFilter;
  voucherTypeLabel: string;
  partyId: string;
  partyLedgerId: number | null;
  invoiceHref: string;
  partyLedgerHref: string;
  /** Composite default sort key: month | invoice date | invoice no */
  defaultSortKey: string;
}

export interface TdsSummaryFilters {
  financialYearId: string;
  dateFrom: string;
  dateTo: string;
  month: string;
  tdsSection: string | string[];
  partyIds: string | string[];
  search: string;
  branch: string | string[];
  voucherType: string | string[];
  deducteeType: string | string[];
}

export interface TdsSummaryTotals {
  totalAmount: number;
  totalTds: number;
  count: number;
}

const VOUCHER_TYPE_LABELS: Record<TdsSourceVoucherType, string> = {
  purchase_invoice: "Purchase Voucher",
  journal: "Journal Voucher",
  payment: "Payment Voucher",
};

export const TDS_SECTION_OPTIONS = [
  { value: "194C", label: "194C — Contractor" },
  { value: "194J", label: "194J — Professional Fees" },
  { value: "194H", label: "194H — Commission" },
  { value: "194I", label: "194I — Rent" },
  { value: "194Q", label: "194Q — Purchase of Goods" },
  { value: "192", label: "192 — Salary" },
] as const;

export const TDS_DEDUCTEE_TYPE_OPTIONS = [
  { value: "Supplier", label: "Vendor" },
  { value: "Contractor", label: "Contractor" },
  { value: "Professional", label: "Professional" },
  { value: "Employee", label: "Employee" },
  { value: "Customer", label: "Customer" },
  { value: "Other", label: "Other" },
] as const;

export const TDS_VOUCHER_TYPE_OPTIONS = [
  { value: "purchase_invoice", label: "Purchase Voucher" },
  { value: "journal", label: "Journal Voucher" },
  { value: "payment", label: "Payment Voucher" },
] as const;

function parseIsoDate(iso: string): Date | null {
  if (!iso || iso.length < 10) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTdsMonthLabel(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return "—";
  const mon = d.toLocaleDateString("en-IN", { month: "short" });
  return `${mon}-${d.getFullYear()}`;
}

export function formatTdsInvoiceDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso || "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function monthKeyFromIso(iso: string): string {
  return iso?.length >= 7 ? iso.slice(0, 7) : "";
}

function parseRateValue(rate: string): number {
  const n = Number(String(rate).replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Optional branch on seed rows (demo / extended storage shape). */
function rowBranch(row: TdsPartyWiseRow & { branch?: string }): string {
  return row.branch?.trim() || "Head Office";
}

export function toTdsSummaryTxnRow(row: TdsPartyWiseRow): TdsSummaryTxnRow {
  const invoiceDate = row.voucherDate;
  const monthKey = monthKeyFromIso(invoiceDate);
  const invoiceNo = (row.billNo || row.voucherNo || "—").trim() || "—";
  const extended = row as TdsPartyWiseRow & { branch?: string };
  return {
    id: row.id,
    monthKey,
    month: formatTdsMonthLabel(invoiceDate),
    partyName: row.partyName,
    pan: row.pan,
    invoiceDate,
    invoiceDateDisplay: formatTdsInvoiceDate(invoiceDate),
    invoiceNo,
    amount: row.taxableAmount,
    tdsAmount: row.tdsAmount,
    tdsRate: row.tdsRate,
    tdsRateValue: parseRateValue(row.tdsRate),
    tdsSection: row.tdsSection,
    tdsSectionLabel: `${row.tdsSection} — ${row.tdsSectionName}`,
    deducteeType: row.partyType,
    branch: rowBranch(extended),
    voucherType: row.sourceType,
    voucherTypeLabel: VOUCHER_TYPE_LABELS[row.sourceType],
    partyId: String(row.partyId),
    partyLedgerId: row.partyLedgerId,
    invoiceHref: resolveTdsSourceHref(row),
    partyLedgerHref: resolvePartyGeneralLedgerHref(row),
    defaultSortKey: `${monthKey}|${invoiceDate}|${invoiceNo.toLowerCase()}`,
  };
}

export function loadTdsSummaryTxnRows(): TdsSummaryTxnRow[] {
  return loadTdsPartyWiseRows().map(toTdsSummaryTxnRow);
}

function resolveFy(id: string): FinancialYear | null {
  if (!id || id === "all") return null;
  return loadFinancialYears().find((f) => String(f.id) === id) ?? null;
}

export function getDefaultTdsFinancialYearId(): string {
  const id = getActiveFinancialYearId();
  return id != null ? String(id) : "all";
}

export function getTdsPartyOptions(rows?: TdsSummaryTxnRow[]): { value: string; label: string }[] {
  const source = rows ?? loadTdsSummaryTxnRows();
  const seen = new Map<string, string>();
  for (const row of source) {
    if (!seen.has(row.partyId)) seen.set(row.partyId, row.partyName);
  }
  return Array.from(seen.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getTdsMonthOptions(
  rows: TdsSummaryTxnRow[],
): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.monthKey && !map.has(row.monthKey)) map.set(row.monthKey, row.month);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, label]) => ({ value, label }));
}

export function getTdsBranchOptions(rows?: TdsSummaryTxnRow[]): string[] {
  const source = rows ?? loadTdsSummaryTxnRows();
  return Array.from(new Set(source.map((r) => r.branch))).sort((a, b) => a.localeCompare(b));
}

export function filterTdsSummaryRows(
  rows: TdsSummaryTxnRow[],
  filters: TdsSummaryFilters,
): TdsSummaryTxnRow[] {
  const q = filters.search.trim().toLowerCase();
  const fy = resolveFy(filters.financialYearId);

  return rows.filter((row) => {
    if (fy && (row.invoiceDate < fy.startDate || row.invoiceDate > fy.endDate)) return false;
    if (filters.dateFrom && row.invoiceDate < filters.dateFrom) return false;
    if (filters.dateTo && row.invoiceDate > filters.dateTo) return false;
    if (filters.month !== "all" && filters.month && row.monthKey !== filters.month) return false;
    if (!matchesMultiFilter(filters.tdsSection, row.tdsSection)) return false;
    if (!matchesMultiFilter(filters.partyIds, row.partyId)) return false;
    if (!matchesMultiFilter(filters.branch, row.branch)) return false;
    if (!matchesMultiFilter(filters.voucherType, row.voucherType)) return false;
    if (!matchesMultiFilter(filters.deducteeType, row.deducteeType)) return false;
    if (q) {
      const hay = [
        row.month,
        row.partyName,
        row.pan,
        row.invoiceNo,
        row.tdsSection,
        row.tdsSectionLabel,
        row.tdsRate,
        row.branch,
        row.voucherTypeLabel,
        row.deducteeType,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortTdsSummaryDefault(rows: TdsSummaryTxnRow[]): TdsSummaryTxnRow[] {
  return [...rows].sort((a, b) => a.defaultSortKey.localeCompare(b.defaultSortKey));
}

export function computeTdsSummaryTotals(rows: TdsSummaryTxnRow[]): TdsSummaryTotals {
  return {
    totalAmount: rows.reduce((s, r) => s + r.amount, 0),
    totalTds: rows.reduce((s, r) => s + r.tdsAmount, 0),
    count: rows.length,
  };
}

export function buildTdsSummaryReport(filters: TdsSummaryFilters): {
  rows: TdsSummaryTxnRow[];
  totals: TdsSummaryTotals;
  hasData: boolean;
} {
  const filtered = sortTdsSummaryDefault(
    filterTdsSummaryRows(loadTdsSummaryTxnRows(), filters),
  );
  return {
    rows: filtered,
    totals: computeTdsSummaryTotals(filtered),
    hasData: filtered.length > 0,
  };
}
