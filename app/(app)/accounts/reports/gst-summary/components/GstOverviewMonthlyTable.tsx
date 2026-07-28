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
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import type { GstMonthlySummaryRow } from "@/lib/accounts/gst-report-types";
import { cn } from "@/lib/utils";
import { GstReportSectionHeading } from "./GstReportNavCards";

export function GstOverviewMonthlyTable({ rows }: { rows: GstMonthlySummaryRow[] }) {
  return (
    <div className="space-y-3">
      <GstReportSectionHeading label="Monthly GST Summary" />
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
                  Net GST
                </AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {rows.map((row) => (
                <AccountsTableRow
                  key={row.id}
                  className={cn(row.rowType === "total" && "bg-brand-50/40 font-semibold")}
                >
                  <AccountsTableCell className="text-xs font-medium text-foreground">
                    {row.month}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.sales)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.purchase)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.outputGst)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.inputGst)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(row.netGst)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
          </AccountsTable>
        </div>
      </AccountsListingTableCard>
    </div>
  );
}
