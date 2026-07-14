"use client";

import { useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { buildGstReportHref } from "@/lib/accounts/gst-report-filters";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { GSTR1_DRILL_ROUTES, type Gstr1SummaryRow } from "../gstr1-report-types";
import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";
import {
  GST_SUMMARY_SECTION_COLUMN_CONFIG,
  getGstSummarySectionCellValue,
  sumGstSummarySectionRows,
  type GstSummaryTableRow,
} from "../../gst-summary-column-filters";

const GST_SUMMARY_GSTR1_BASE = "/accounts/reports/gst-summary/gstr1";

export type { GstSummaryTableRow };

export function Gstr1SummaryTable({
  sections,
  filters,
  basePath = GST_SUMMARY_GSTR1_BASE,
  drillRoutes = GSTR1_DRILL_ROUTES as Partial<Record<string, string>>,
}: {
  sections: Gstr1SummaryRow[] | GstSummaryTableRow[];
  filters: GstReportFilters;
  /** Drill-down base path — defaults to GSTR-1; GSTR-3B passes its own. */
  basePath?: string;
  drillRoutes?: Partial<Record<string, string>>;
}) {
  const dataRows = useMemo(
    () => sections.filter((r) => r.rowType !== "total") as GstSummaryTableRow[],
    [sections],
  );

  return (
    <AccountsColumnFilterProvider
      rows={dataRows}
      getCellValue={getGstSummarySectionCellValue}
      columnConfig={GST_SUMMARY_SECTION_COLUMN_CONFIG}
      defaultSortKey="particulars"
      defaultSortDir="asc"
    >
      <Gstr1SummaryTableInner
        filters={filters}
        basePath={basePath}
        drillRoutes={drillRoutes}
        dataRowCount={dataRows.length}
      />
    </AccountsColumnFilterProvider>
  );
}

function Gstr1SummaryTableInner({
  filters,
  basePath,
  drillRoutes,
  dataRowCount,
}: {
  filters: GstReportFilters;
  basePath: string;
  drillRoutes: Partial<Record<string, string>>;
  dataRowCount: number;
}) {
  const ctx = useAccountsColumnFilterContext();
  const filteredRows = useAccountsFilteredRows<GstSummaryTableRow>([]);
  const totalRow = useMemo(
    () => (filteredRows.length > 0 ? sumGstSummarySectionRows(filteredRows) : null),
    [filteredRows],
  );

  return (
    <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
      {(ctx?.activeFilterCount ?? 0) > 0 && (
        <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{filteredRows.length}</span> of{" "}
            <span className="font-medium text-foreground">{dataRowCount}</span> rows
          </p>
          <button
            type="button"
            onClick={() => ctx?.clearAllColumnFilters()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline"
          >
            <X className="w-3 h-3" />
            Clear All Filters
          </button>
        </div>
      )}
      <AccountsTableScroll className="flex-1 min-h-0">
        <AccountsTable minWidth={1100}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh
                label="Particulars"
                colKey="particulars"
                filterType="text"
                className="min-w-[12rem]"
              />
              <SortTh
                label="Voucher Count"
                colKey="voucherCount"
                filterType="amount"
                align="right"
                className="min-w-[6rem]"
              />
              <SortTh
                label="Taxable Amount"
                colKey="taxableAmount"
                filterType="amount"
                align="right"
                className="min-w-[8rem]"
              />
              <SortTh
                label="IGST"
                colKey="igst"
                filterType="amount"
                align="right"
                className="min-w-[7rem]"
              />
              <SortTh
                label="CGST"
                colKey="cgst"
                filterType="amount"
                align="right"
                className="min-w-[7rem]"
              />
              <SortTh
                label="SGST"
                colKey="sgst"
                filterType="amount"
                align="right"
                className="min-w-[8rem]"
              />
              <SortTh
                label="Tax Amount"
                colKey="taxAmount"
                filterType="amount"
                align="right"
                className="min-w-[7rem]"
              />
              <SortTh
                label="Invoice Amount"
                colKey="invoiceAmount"
                filterType="amount"
                align="right"
                className="min-w-[8rem]"
              />
              <AccountsColumnHeader
                label="Action"
                colKey="_actions"
                sortable={false}
                filterable={false}
                className="w-24 min-w-[5rem]"
              />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {filteredRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={9} className="accounts-table-empty">
                  <div className="flex flex-col items-center gap-1 py-4">
                    <p className="text-sm text-muted-foreground">
                      No rows match the column filters.
                    </p>
                    {(ctx?.activeFilterCount ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => ctx?.clearAllColumnFilters()}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              <>
                {filteredRows.map((row) => {
                  const drillSlug = drillRoutes[row.sectionId];
                  const href =
                    drillSlug && row.rowType !== "total"
                      ? buildGstReportHref(`${basePath}/${drillSlug}`, filters)
                      : null;
                  const isSupporting = row.rowType === "supporting";

                  return (
                    <AccountsTableRow
                      key={row.sectionId}
                      className={cn(isSupporting && "bg-muted/10")}
                    >
                      <AccountsTableCell className="text-xs font-medium text-foreground">
                        {row.particulars}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums">
                        {row.voucherCount}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(row.taxableAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(row.igst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(row.cgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(row.sgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(row.taxAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                      >
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
                {totalRow && (
                  <AccountsTableRow className="bg-muted/30 font-semibold">
                    <AccountsTableCell className="text-xs font-bold text-navy-700">
                      {totalRow.particulars}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      className="text-xs tabular-nums font-bold"
                    >
                      {totalRow.voucherCount}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoney(totalRow.taxableAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoney(totalRow.igst)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoney(totalRow.cgst)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoney(totalRow.sgst)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                    >
                      {formatMoney(totalRow.taxAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                    >
                      {totalRow.invoiceAmount !== 0
                        ? formatMoney(totalRow.invoiceAmount)
                        : "—"}
                    </AccountsTableCell>
                    <AccountsTableCell>
                      <span className="text-xs text-muted-foreground">—</span>
                    </AccountsTableCell>
                  </AccountsTableRow>
                )}
              </>
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </AccountsListingTableCard>
  );
}
