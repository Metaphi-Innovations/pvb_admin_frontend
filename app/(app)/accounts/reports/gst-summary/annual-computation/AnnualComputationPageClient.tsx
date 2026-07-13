"use client";

import { useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
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
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { buildAnnualComputationRows } from "@/lib/accounts/gst-report-service";
import { cn } from "@/lib/utils";
import { useGstReportFilters } from "../useGstReportFilters";
import { GstReportFilterBar } from "../components/GstReportFilterBar";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { exportGstTabularReport } from "../gst-report-export";

export default function AnnualComputationPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => {
    if (!mounted || !datesReady) return [];
    return buildAnnualComputationRows(filters);
  }, [mounted, datesReady, filters]);

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      exportGstTabularReport(
        { reportTitle: "Annual GST Computation", filters },
        [
          { label: "Month" },
          { label: "Taxable Outward (₹)", align: "right", className: "num" },
          { label: "Taxable Inward (₹)", align: "right", className: "num" },
          { label: "Output GST (₹)", align: "right", className: "num" },
          { label: "Input GST (₹)", align: "right", className: "num" },
          { label: "Net Payable (₹)", align: "right", className: "num" },
        ],
        rows.map((row) => ({
          month: row.month,
          taxableOutward: row.taxableOutward,
          taxableInward: row.taxableInward,
          outputGst: row.outputGst,
          inputGst: row.inputGst,
          netPayable: row.netPayable,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "Annual GST Computation")}
      title="Annual GST Computation"
      description="Month-wise annual GST summary (demo structure)."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <AccountsExportMenu
          onExcel={() => handleExport("excel")}
          onPdf={() => handleExport("pdf")}
          disabled={exporting || rows.length === 0}
        />
      }
      filters={<GstReportFilterBar filterState={filterState} mounted={mounted} />}
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <AccountsReportBody>
        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading annual computation…
            </div>
          ) : (
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={900}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell className="text-xs font-semibold min-w-[8rem]">Month</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Taxable Outward</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Taxable Inward</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Output GST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Input GST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Net Payable</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-xs font-semibold w-24">Action</AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {rows.map((row) => (
                    <AccountsTableRow
                      key={row.id}
                      className={cn(row.rowType === "total" && "bg-brand-50/40 font-semibold")}
                    >
                      <AccountsTableCell className="text-xs font-medium">{row.month}</AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.taxableOutward)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.taxableInward)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.outputGst)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.inputGst)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.netPayable)}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        {row.rowType === "line" ? (
                          <button
                            type="button"
                            className="text-xs text-brand-600 hover:underline font-medium"
                            onClick={() => {}}
                          >
                            Drill down
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </AccountsTableCell>
                    </AccountsTableRow>
                  ))}
                </AccountsTableBody>
              </AccountsTable>
            </AccountsTableScroll>
          )}
        </AccountsListingTableCard>
      </AccountsReportBody>
    </AccountsPageShell>
  );
}
