/**
 * Shared Excel-style column filter helpers for GST Summary tables.
 * Uses Accounts AccountsColumnFilterProvider / SortTh / AccountsColumnFilterPopover.
 */

import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";

/** Shared summary-row shape — GSTR-1 and GSTR-3B. */
export type GstSummaryTableRow = {
  sectionId: string;
  particulars: string;
  voucherCount: number;
  taxableAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  invoiceAmount: number;
  rowType: "section" | "supporting" | "total";
};

export const GST_SUMMARY_SECTION_COLUMN_CONFIG: AccountsColumnFilterConfig = {
  particulars: { type: "text" },
  voucherCount: { type: "amount" },
  taxableAmount: { type: "amount" },
  igst: { type: "amount" },
  cgst: { type: "amount" },
  sgst: { type: "amount" },
  taxAmount: { type: "amount" },
  invoiceAmount: { type: "amount" },
};

export function getGstSummarySectionCellValue(
  row: GstSummaryTableRow,
  key: string,
): unknown {
  switch (key) {
    case "particulars":
      return row.particulars;
    case "voucherCount":
      return row.voucherCount;
    case "taxableAmount":
      return row.taxableAmount;
    case "igst":
      return row.igst;
    case "cgst":
      return row.cgst;
    case "sgst":
      return row.sgst;
    case "taxAmount":
      return row.taxAmount;
    case "invoiceAmount":
      return row.invoiceAmount;
    default:
      return (row as unknown as Record<string, unknown>)[key];
  }
}

export function sumGstSummarySectionRows(rows: GstSummaryTableRow[]): GstSummaryTableRow {
  const r = (n: number) => Math.round(n * 100) / 100;
  const acc = rows.reduce(
    (a, row) => {
      a.voucherCount += row.voucherCount;
      a.taxableAmount += row.taxableAmount;
      a.igst += row.igst;
      a.cgst += row.cgst;
      a.sgst += row.sgst;
      a.taxAmount += row.taxAmount;
      a.invoiceAmount += row.invoiceAmount;
      return a;
    },
    {
      voucherCount: 0,
      taxableAmount: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      taxAmount: 0,
      invoiceAmount: 0,
    },
  );
  return {
    sectionId: "grand-total",
    particulars: "Grand Total",
    voucherCount: acc.voucherCount,
    taxableAmount: r(acc.taxableAmount),
    igst: r(acc.igst),
    cgst: r(acc.cgst),
    sgst: r(acc.sgst),
    taxAmount: r(acc.taxAmount),
    invoiceAmount: r(acc.invoiceAmount),
    rowType: "total",
  };
}
