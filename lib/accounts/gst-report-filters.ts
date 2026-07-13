/**
 * GST Report filter types and URL persistence helpers.
 */

import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import {
  appendMultiFilterParam,
  matchesMultiFilter,
  normalizeMultiFilter,
  parseMultiFilterParam,
} from "@/lib/accounts/report-multi-filter-utils";
import { getTrialBalanceBranchOptions } from "@/lib/accounts/trial-balance-compute";
import { resolveFinancialYearLabel } from "@/lib/accounts/pl-compute";

export interface GstReportFilters {
  financialYearId: string;
  gstPeriod: string;
  dateFrom: string;
  dateTo: string;
  branch: string[];
  gstRegistration: string;
}

export const GST_REPORT_BASE_PATH = "/accounts/reports/gst-summary";

export const GST_REPORT_NAV_ITEMS = [
  { id: "overview", label: "Overview", href: GST_REPORT_BASE_PATH },
  { id: "gstr1", label: "GSTR-1", href: `${GST_REPORT_BASE_PATH}/gstr1` },
  { id: "gstr3b", label: "GSTR-3B", href: `${GST_REPORT_BASE_PATH}/gstr3b` },
  { id: "gstr2a", label: "GSTR-2A", href: `${GST_REPORT_BASE_PATH}/gstr2a` },
  { id: "gstr2b", label: "GSTR-2B", href: `${GST_REPORT_BASE_PATH}/gstr2b` },
  {
    id: "annual-computation",
    label: "Annual GST Computation",
    href: `${GST_REPORT_BASE_PATH}/annual-computation`,
  },
] as const;

export type GstReportNavId = (typeof GST_REPORT_NAV_ITEMS)[number]["id"];

export const GST_REPORT_NAV_CARDS = GST_REPORT_NAV_ITEMS.filter((item) => item.id !== "overview");

/** Demo company GST registrations — replace with branch GST master when wired to API. */
export const GST_REGISTRATION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All registrations" },
  { value: COMPANY_BILLING.gstNumber, label: `${COMPANY_BILLING.gstNumber} — Head Office` },
  { value: "27AABCD1234E2Z6", label: "27AABCD1234E2Z6 — Mumbai Branch" },
  { value: "27AABCD1234E3Z7", label: "27AABCD1234E3Z7 — Nagpur Branch" },
];

export function buildGstPeriodOptions(financialYearId: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [
    { value: "all", label: "All months" },
  ];
  const fy =
    financialYearId !== "all"
      ? loadFinancialYears().find((f) => String(f.id) === financialYearId)
      : loadFinancialYears().find((f) => f.status === "active");
  if (!fy) return options;

  const start = new Date(fy.startDate);
  const end = new Date(fy.endDate);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const value = `${y}-${m}`;
    const label = `${monthNames[cursor.getMonth()]} ${y}`;
    options.push({ value, label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return options;
}

export function gstPeriodToDateRange(
  gstPeriod: string,
  fallback: { from: string; to: string },
): { from: string; to: string } {
  if (gstPeriod === "all") return fallback;
  const [yearStr, monthStr] = gstPeriod.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return fallback;
  const from = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function buildGstReportFilterQuery(filters: GstReportFilters): string {
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  if (filters.gstPeriod !== "all") params.set("period", filters.gstPeriod);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  if (filters.gstRegistration !== "all") params.set("gstin", filters.gstRegistration);
  return params.toString();
}

export function parseGstReportFiltersFromSearch(
  search: string,
  defaults: GstReportFilters,
): GstReportFilters {
  const params = new URLSearchParams(search);
  const branchParam = params.get("branch");
  return {
    financialYearId: params.get("fy") ?? defaults.financialYearId,
    gstPeriod: params.get("period") ?? defaults.gstPeriod,
    dateFrom: params.get("from") ?? defaults.dateFrom,
    dateTo: params.get("to") ?? defaults.dateTo,
    branch: branchParam != null ? parseMultiFilterParam(branchParam) : defaults.branch,
    gstRegistration: params.get("gstin") ?? defaults.gstRegistration,
  };
}

export function buildGstReportHref(path: string, filters: GstReportFilters): string {
  const qs = buildGstReportFilterQuery(filters);
  return qs ? `${path}?${qs}` : path;
}

export function matchesGstReportFilters(
  txn: {
    documentDate: string;
    branch: string;
    companyGstin: string;
  },
  filters: GstReportFilters,
): boolean {
  if (txn.documentDate < filters.dateFrom || txn.documentDate > filters.dateTo) return false;
  if (!matchesMultiFilter(filters.branch, txn.branch)) return false;
  if (filters.gstRegistration !== "all" && txn.companyGstin !== filters.gstRegistration) {
    return false;
  }
  return true;
}

export function getGstReportBranchOptions(): string[] {
  return getTrialBalanceBranchOptions();
}

export function resolveGstRegistrationLabel(gstRegistration: string): string {
  if (gstRegistration === "all") return "All registrations";
  const match = GST_REGISTRATION_OPTIONS.find((o) => o.value === gstRegistration);
  return match?.label ?? gstRegistration;
}

export function resolveGstPeriodLabel(gstPeriod: string): string {
  if (gstPeriod === "all") return "All months";
  const match = buildGstPeriodOptions("all").find((o) => o.value === gstPeriod);
  return match?.label ?? gstPeriod;
}

export { resolveFinancialYearLabel };

export function resolveBranchFilterLabel(branch: string[]): string {
  const values = normalizeMultiFilter(branch);
  if (values.length === 0) return "All branches";
  if (values.length === 1) return values[0];
  return `${values.length} branches`;
}
