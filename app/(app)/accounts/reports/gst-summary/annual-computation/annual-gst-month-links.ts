/**
 * Month-scoped deep links from Annual GST Compliance Summary → production reports.
 */

import {
  GST_REPORT_BASE_PATH,
  buildGstReportHref,
  gstPeriodToDateRange,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";

export type AnnualGstMonthLinks = {
  gstr1: string;
  gstr2a: string;
  gstr2b: string;
  gstr3b: string;
  dateFrom: string;
  dateTo: string;
};

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

  return {
    gstr1: buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr1`, monthFilters),
    gstr2a: buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr2a`, monthFilters),
    gstr2b: buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr2b`, monthFilters),
    gstr3b: buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr3b`, monthFilters),
    dateFrom: from,
    dateTo: to,
  };
}

/** Legacy helper retained for unused demo drill sheet until Step 8C cleanup. */
export function voucherHrefForParticular(
  _particular: string,
  _links: AnnualGstMonthLinks,
): string | null {
  return null;
}
