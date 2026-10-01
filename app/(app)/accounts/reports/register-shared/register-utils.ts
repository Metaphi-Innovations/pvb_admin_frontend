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

/**
 * Filter register rows.
 * Sales mode: empty status filter ⇒ posted only (cancelled only when explicitly selected).
 * Purchase mode: empty status filter ⇒ all statuses (legacy behaviour).
 */
export function filterRegisterRows(
  rows: RegisterReportRow[],
  filters: RegisterReportFilterParams,
  mode: "sales" | "purchase" = "sales",
): RegisterReportRow[] {
  const statuses = normalizeMultiFilter(filters.statuses);
  const voucherTypes = normalizeMultiFilter(filters.voucherTypes);
  const products = normalizeMultiFilter(filters.product);
  const salespersons = normalizeMultiFilter(filters.salespersons);
  const customerTypes = normalizeMultiFilter(filters.customerTypes);
  const partyIds = mode === "sales" ? filters.customerIds : filters.vendorIds;
  const invoiceNoQ = (filters.invoiceNo ?? "").trim().toLowerCase();
  const gstType = filters.gstType && filters.gstType !== "all" ? filters.gstType : null;

  return rows.filter((row) => {
    if (filters.dateFrom && row.invoiceDate < filters.dateFrom) return false;
    if (filters.dateTo && row.invoiceDate > filters.dateTo) return false;
    if (!rowInFinancialYear(row, filters.financialYearId)) return false;
    if (!matchesMultiIdFilter(partyIds, row.partyId)) return false;

    if (mode === "sales") {
      if (statuses.length === 0) {
        if (row.invoiceStatus !== "posted") return false;
      } else if (!statuses.includes(row.invoiceStatus)) {
        return false;
      }
    } else if (statuses.length > 0 && !statuses.includes(row.invoiceStatus)) {
      return false;
    }

    if (voucherTypes.length > 0 && !voucherTypes.includes(row.voucherType)) return false;
    if (!matchesMultiFilter(filters.branch, row.branch)) return false;
    if (!matchesMultiFilter(filters.warehouse, row.warehouse)) return false;
    if (!matchesMultiFilter(filters.states, row.state)) return false;
    if (customerTypes.length > 0) {
      const ct = (row.customerType ?? "").trim().toLowerCase();
      if (!customerTypes.some((t) => t.toLowerCase() === ct)) return false;
    }
    if (products.length > 0) {
      const hasProduct = row.productNames.some((name) => products.includes(name));
      if (!hasProduct) return false;
    }
    if (salespersons.length > 0 && !matchesMultiFilter(salespersons, row.salesperson)) return false;
    if (filters.gstRate !== "all" && String(row.gstRate) !== filters.gstRate) return false;
    if (gstType && row.gstType !== gstType) return false;
    if (invoiceNoQ && !row.invoiceNo.toLowerCase().includes(invoiceNoQ)) return false;
    if (
      !matchesSearch(filters.search, [
        row.invoiceNo,
        row.partyName,
        row.partyCode,
        row.gstin,
        row.state,
        row.branch,
        row.warehouse,
        row.salesperson,
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
      cgst: roundMoney(acc.cgst + (row.cgst ?? 0)),
      sgst: roundMoney(acc.sgst + (row.sgst ?? 0)),
      igst: roundMoney(acc.igst + (row.igst ?? 0)),
      discount: roundMoney(acc.discount + (row.discount ?? 0)),
      otherCharges: roundMoney(acc.otherCharges + (row.otherCharges ?? 0)),
      grandTotal: roundMoney(acc.grandTotal + row.invoiceTotal),
    }),
    {
      count: 0,
      taxableValue: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      discount: 0,
      otherCharges: 0,
      grandTotal: 0,
    },
  );
}

export function gstTypeLabel(gstType?: string): string {
  if (gstType === "igst") return "IGST";
  if (gstType === "cgst_sgst") return "CGST/SGST";
  return "—";
}

export function invoiceStatusLabel(status: string): string {
  if (status === "posted") return "Posted";
  if (status === "cancelled") return "Cancelled";
  if (status === "draft") return "Draft";
  return status;
}

export function buildRegisterExportRows(rows: RegisterReportRow[], partyColumnLabel: string) {
  return rows.map((row, index) => ({
    "Sr. No.": index + 1,
    "Invoice Date": formatRegisterDate(row.invoiceDate),
    "Invoice No.": row.invoiceNo,
    [`${partyColumnLabel} Code`]: row.partyCode ?? "—",
    [partyColumnLabel]: row.partyName,
    GSTIN: row.gstin,
    State: row.state,
    Salesperson: row.salesperson || "—",
    "Taxable Amount": row.taxableValue,
    CGST: row.cgst ?? 0,
    SGST: row.sgst ?? 0,
    IGST: row.igst ?? 0,
    Discount: row.discount ?? 0,
    "Other Charges": row.otherCharges ?? 0,
    "Invoice Total": row.invoiceTotal,
    "Payment Terms": row.paymentTerms || "—",
    Status: invoiceStatusLabel(row.invoiceStatus),
    "GST Type": gstTypeLabel(row.gstType),
    "Payment Status":
      row.paymentStatus === "partially_paid"
        ? "Partially Paid"
        : row.paymentStatus.charAt(0).toUpperCase() + row.paymentStatus.slice(1),
  }));
}

/** Slim export used by purchase register (back-compat columns). */
export function buildPurchaseRegisterExportRows(rows: RegisterReportRow[], partyColumnLabel: string) {
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
