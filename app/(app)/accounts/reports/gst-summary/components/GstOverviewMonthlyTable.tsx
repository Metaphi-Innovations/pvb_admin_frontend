"use client";

import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { formatMoneyString, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import type { GstOverviewMonthlyRow } from "@/types/gst-summary.types";
import { cn } from "@/lib/utils";
import { GstReportSectionHeading } from "./GstReportNavCards";

export function GstOverviewMonthlyTable({
  rows,
}: {
  rows: GstOverviewMonthlyRow[];
}) {
  return (
    <div className="space-y-3">
      <GstReportSectionHeading label="Monthly GST Summary" />
      <p className="text-[11px] text-muted-foreground -mt-1">
        “Books GST Diff.” is Output GST − Books Input GST — not statutory Net
        GST Payable.
      </p>
      <AccountsListingTableCard>
        <div className="overflow-x-auto">
          <AccountsTable minWidth={760}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <AccountsTableHeadCell className="text-xs font-semibold min-w-[7rem]">
                  Month
                </AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                  Sales
                </AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                  Purchase
                </AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                  Output GST
                </AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                  Input GST
                </AccountsTableHeadCell>
                <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                  Books GST Diff.
                </AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {rows.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell
                    colSpan={6}
                    className="text-xs text-muted-foreground text-center py-6"
                  >
                    No monthly GST rows for the selected filters.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                rows.map((row) => (
                  <AccountsTableRow
                    key={row.month_key || row.month}
                    className={cn(
                      row.row_type === "total" && "bg-brand-50/40 font-semibold",
                    )}
                  >
                    <AccountsTableCell className="text-xs font-medium text-foreground">
                      {row.month}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoneyString(row.sales ?? row.taxable_sales)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoneyString(row.purchase ?? row.taxable_purchases)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoneyString(row.outputGst ?? row.output_gst)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoneyString(row.inputGst ?? row.input_gst)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoneyString(
                        row.books_gst_working_difference ?? row.netGst,
                      )}
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
          </AccountsTable>
        </div>
      </AccountsListingTableCard>
    </div>
  );
}
