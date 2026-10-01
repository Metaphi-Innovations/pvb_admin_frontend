/**
 * Month-scoped deep links from Annual GST Summary → GSTR reports / vouchers.
 * Uses the shared GST filter query shape (`period`, `from`, `to`, `fy`, …)
 * so target reports open already filtered to that month.
 */

import {
  GST_REPORT_BASE_PATH,
  buildGstReportHref,
  gstPeriodToDateRange,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";

export type AnnualGstMonthLinks = {
  gstr1: string;
  gstr3b: string;
  salesInvoices: string;
  purchaseInvoices: string;
  creditNotes: string;
  debitNotes: string;
  dateFrom: string;
  dateTo: string;
};

function voucherQs(from: string, to: string): string {
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export function buildAnnualGstMonthLinks(
  monthKey: string,
  filters: GstReportFilters,
): AnnualGstMonthLinks {
  const { from, to } = gstPeriodToDateRange(monthKey, {
    from: filters.dateFrom,
    to: filters.dateTo,
  });

  const monthFilters: GstReportFilters = {
    ...filters,
    gstPeriod: monthKey,
    dateFrom: from,
    dateTo: to,
  };

  const vq = voucherQs(from, to);

  return {
    gstr1: buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr1`, monthFilters),
    gstr3b: buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr3b`, monthFilters),
    salesInvoices: `/accounts/transactions/invoices?${vq}`,
    purchaseInvoices: `/accounts/purchase-invoices?${vq}`,
    creditNotes: `/accounts/transactions/credit-notes?${vq}`,
    debitNotes: `/accounts/transactions/debit-notes?${vq}`,
    dateFrom: from,
    dateTo: to,
  };
}

/** Map outward/inward particular → voucher path for the month. */
export function voucherHrefForParticular(
  particular: string,
  links: AnnualGstMonthLinks,
): string | null {
  switch (particular) {
    case "B2B Sales":
    case "B2C Sales":
    case "Export":
    case "SEZ":
      return links.salesInvoices;
    case "Credit Notes":
      return links.creditNotes;
    case "Debit Notes":
      return links.debitNotes;
    case "Purchase of Goods":
    case "Purchase of Services":
    case "Capital Goods":
    case "Imports":
      return links.purchaseInvoices;
    case "Supplier Credit Notes":
      return links.creditNotes;
    case "Supplier Debit Notes":
      return links.debitNotes;
    default:
      return null;
  }
}
