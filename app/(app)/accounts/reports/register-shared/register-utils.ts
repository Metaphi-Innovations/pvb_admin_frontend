import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  matchesMultiFilter,
  matchesMultiIdFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import type {
  RegisterReportFilterParams,
  RegisterReportRow,
  RegisterReportTotals,
} from "./register-types";

export function formatRegisterDate(iso: string): string {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
}

function matchesSearch(search: string, parts: (string | number | undefined | null)[]): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => String(p ?? "").toLowerCase().includes(q));
}

function rowInFinancialYear(row: RegisterReportRow, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
  if (!fy) return String(row.financialYearId) === financialYearId;
  return row.invoiceDate >= fy.startDate && row.invoiceDate <= fy.endDate;
}

export function filterRegisterRows(
  rows: RegisterReportRow[],
  filters: RegisterReportFilterParams,
  mode: "sales" | "purchase" = "sales",
): RegisterReportRow[] {
  const statuses = normalizeMultiFilter(filters.statuses);
  const voucherTypes = normalizeMultiFilter(filters.voucherTypes);
  const products = normalizeMultiFilter(filters.product);
  const salespersons = normalizeMultiFilter(filters.salespersons);
  const partyIds = mode === "sales" ? filters.customerIds : filters.vendorIds;

  return rows.filter((row) => {
    if (filters.dateFrom && row.invoiceDate < filters.dateFrom) return false;
    if (filters.dateTo && row.invoiceDate > filters.dateTo) return false;
    if (!rowInFinancialYear(row, filters.financialYearId)) return false;
    if (!matchesMultiIdFilter(partyIds, row.partyId)) return false;
    if (statuses.length > 0 && !statuses.includes(row.invoiceStatus)) return false;
    if (voucherTypes.length > 0 && !voucherTypes.includes(row.voucherType)) return false;
    if (!matchesMultiFilter(filters.branch, row.branch)) return false;
    if (products.length > 0) {
      const hasProduct = row.productNames.some((name) => products.includes(name));
      if (!hasProduct) return false;
    }
    if (salespersons.length > 0 && !matchesMultiFilter(salespersons, row.salesperson)) return false;
    if (filters.gstRate !== "all" && String(row.gstRate) !== filters.gstRate) return false;
    if (
      !matchesSearch(filters.search, [
        row.invoiceNo,
        row.partyName,
        row.gstin,
        row.state,
        row.branch,
        ...row.productNames,
      ])
    ) {
      return false;
    }
    return true;
  });
}

export function computeRegisterTotals(rows: RegisterReportRow[]): RegisterReportTotals {
  return rows.reduce(
    (acc, row) => ({
      count: acc.count + 1,
      taxableValue: roundMoney(acc.taxableValue + row.taxableValue),
      gstAmount: roundMoney(acc.gstAmount + row.gstAmount),
      grandTotal: roundMoney(acc.grandTotal + row.invoiceTotal),
    }),
    { count: 0, taxableValue: 0, gstAmount: 0, grandTotal: 0 },
  );
}

export function buildRegisterExportRows(rows: RegisterReportRow[], partyColumnLabel: string) {
  return rows.map((row) => ({
    "Invoice Date": formatRegisterDate(row.invoiceDate),
    "Invoice No.": row.invoiceNo,
    [partyColumnLabel]: row.partyName,
    GSTIN: row.gstin,
    State: row.state,
    "Taxable Value": row.taxableValue,
    "GST Amount": row.gstAmount,
    "Invoice Total": row.invoiceTotal,
    "Payment Status":
      row.paymentStatus === "partially_paid"
        ? "Partially Paid"
        : row.paymentStatus.charAt(0).toUpperCase() + row.paymentStatus.slice(1),
  }));
}
