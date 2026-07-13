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
import { buildGstr3bRows } from "@/lib/accounts/gst-report-service";
import { cn } from "@/lib/utils";
import { useGstReportFilters } from "../useGstReportFilters";
import { GstReportFilterBar } from "../components/GstReportFilterBar";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { exportGstTabularReport } from "../gst-report-export";

export default function Gstr3bPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => {
    if (!mounted || !datesReady) return [];
    return buildGstr3bRows(filters);
  }, [mounted, datesReady, filters]);

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      exportGstTabularReport(
        { reportTitle: "GSTR-3B", filters },
        [
          { label: "Particulars" },
          { label: "Taxable Value (₹)", align: "right", className: "num" },
          { label: "Integrated Tax (₹)", align: "right", className: "num" },
          { label: "Central Tax (₹)", align: "right", className: "num" },
          { label: "State Tax (₹)", align: "right", className: "num" },
          { label: "Cess (₹)", align: "right", className: "num" },
        ],
        rows.map((row) => ({
          particulars: row.particulars,
          taxableValue: row.taxableValue,
          integratedTax: row.integratedTax,
          centralTax: row.centralTax,
          stateTax: row.stateTax,
          cess: row.cess,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-3B")}
      title="GSTR-3B"
      description="Monthly GST return — liability and ITC summary (demo structure)."
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
              Loading GSTR-3B…
            </div>
          ) : (
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={960}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell className="text-xs font-semibold min-w-[16rem]">
                      Particulars
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                      Taxable Value
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                      IGST
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                      CGST
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                      SGST
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                      Cess
                    </AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {rows.map((row) => (
                    <AccountsTableRow
                      key={row.id}
                      className={cn(
                        row.rowType === "section" && "bg-muted/20",
                        row.rowType === "total" && "bg-brand-50/40 font-semibold",
                      )}
                    >
                      <AccountsTableCell
                        className={cn(
                          "text-xs",
                          row.rowType !== "line" && "font-semibold text-foreground",
                        )}
                      >
                        {row.particulars}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {row.taxableValue ? formatMoney(row.taxableValue) : "—"}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.integratedTax)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.centralTax)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.stateTax)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.cess)}
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
