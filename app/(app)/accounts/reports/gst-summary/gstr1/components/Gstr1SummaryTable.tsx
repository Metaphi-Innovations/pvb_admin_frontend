"use client";

import Link from "next/link";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { buildGstReportHref } from "@/lib/accounts/gst-report-filters";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { GSTR1_DRILL_ROUTES, type Gstr1SummaryRow } from "../gstr1-report-types";
import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";

const GST_SUMMARY_BASE = "/accounts/reports/gst-summary/gstr1";

export function Gstr1SummaryTable({
  sections,
  filters,
}: {
  sections: Gstr1SummaryRow[];
  filters: GstReportFilters;
}) {
  return (
    <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
      <AccountsTableScroll className="flex-1 min-h-0">
        <AccountsTable minWidth={1100}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <FinancialReportHeadCell className="min-w-[12rem]">Particulars</FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[6rem]">
                Voucher Count
              </FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[8rem]">
                Taxable Amount
              </FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[7rem]">
                IGST
              </FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[7rem]">
                CGST
              </FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[8rem]">
                SGST
              </FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[7rem]">
                Tax Amount
              </FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[8rem]">
                Invoice Amount
              </FinancialReportHeadCell>
              <FinancialReportHeadCell className="w-24 min-w-[5rem]">Action</FinancialReportHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {sections.map((row) => {
              const drillSlug = GSTR1_DRILL_ROUTES[row.sectionId];
              const href =
                drillSlug && row.sectionId !== "grand-total"
                  ? buildGstReportHref(`${GST_SUMMARY_BASE}/${drillSlug}`, filters)
                  : null;
              const isTotal = row.rowType === "total";
              const isSupporting = row.rowType === "supporting";

              return (
                <AccountsTableRow
                  key={row.sectionId}
                  className={cn(
                    isTotal && "bg-muted/30 font-semibold",
                    isSupporting && "bg-muted/10",
                  )}
                >
                  <AccountsTableCell
                    className={cn(
                      "text-xs",
                      isTotal ? "font-bold text-navy-700" : "font-medium text-foreground",
                    )}
                  >
                    {row.particulars}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums">
                    {row.voucherCount}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.taxableAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.igst)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.cgst)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.sgst)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.taxAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {row.invoiceAmount !== 0 ? formatMoney(row.invoiceAmount) : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    {href ? (
                      <Link
                        href={href}
                        className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-medium"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </AccountsListingTableCard>
  );
}
