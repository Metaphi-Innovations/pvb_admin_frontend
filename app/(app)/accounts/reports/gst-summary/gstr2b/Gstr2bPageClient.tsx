"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { buildGstr2bReconciliationRows } from "@/lib/accounts/gst-report-service";
import { cn } from "@/lib/utils";
import { useGstReportFilters } from "../useGstReportFilters";
import { GstReportFilterBar } from "../components/GstReportFilterBar";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { exportGstTabularReport } from "../gst-report-export";

const STATUS_LABEL: Record<string, string> = {
  matched: "Matched",
  partial: "Partial",
  missing_books: "Missing in Books",
  missing_portal: "Missing in Portal",
};

export default function Gstr2bPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => {
    if (!mounted || !datesReady) return [];
    return buildGstr2bReconciliationRows(filters);
  }, [mounted, datesReady, filters]);

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      exportGstTabularReport(
        { reportTitle: "GSTR-2B Reconciliation", filters },
        [
          { label: "Supplier GSTIN" },
          { label: "Supplier Name" },
          { label: "Invoice No." },
          { label: "Invoice Date" },
          { label: "Books Tax (₹)", align: "right", className: "num" },
          { label: "Portal Tax (₹)", align: "right", className: "num" },
          { label: "Variance (₹)", align: "right", className: "num" },
          { label: "Status" },
        ],
        rows.map((row) => ({
          supplierGstin: row.supplierGstin,
          supplierName: row.supplierName,
          invoiceNo: row.invoiceNo,
          invoiceDate: row.invoiceDate,
          booksTax: row.booksTax,
          portalTax: row.portalTax,
          variance: row.variance,
          status: STATUS_LABEL[row.status] ?? row.status,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-2B Reconciliation")}
      title="GSTR-2B Reconciliation"
      description="Reconcile ITC with auto-drafted GSTR-2B statement (demo)."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {}}
          >
            <Upload className="w-3.5 h-3.5" />
            Import GSTR-2B
          </Button>
          <AccountsExportMenu
            onExcel={() => handleExport("excel")}
            onPdf={() => handleExport("pdf")}
            disabled={exporting || rows.length === 0}
          />
        </div>
      }
      filters={<GstReportFilterBar filterState={filterState} mounted={mounted} />}
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <AccountsReportBody>
        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GSTR-2B reconciliation…
            </div>
          ) : (
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={1100}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell className="text-xs font-semibold">GSTIN</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-xs font-semibold min-w-[10rem]">Supplier</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-xs font-semibold">Invoice No.</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-xs font-semibold">Date</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Books Tax</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Portal Tax</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold">Variance</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-xs font-semibold">Status</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-xs font-semibold w-24">Action</AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {rows.map((row) => (
                    <AccountsTableRow key={row.id}>
                      <AccountsTableCell className="text-xs font-mono text-brand-700">
                        {row.supplierGstin}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-medium">{row.supplierName}</AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono">{row.invoiceNo}</AccountsTableCell>
                      <AccountsTableCell className="text-xs">{row.invoiceDate}</AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.booksTax)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.portalTax)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn(
                          "text-xs",
                          MONEY_AMOUNT_CLASS,
                          row.variance !== 0 && "text-amber-700 font-semibold",
                        )}
                      >
                        {formatMoney(row.variance)}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <StatusBadge
                          status={
                            row.status === "matched"
                              ? "approved"
                              : row.status === "partial"
                                ? "pending"
                                : "rejected"
                          }
                          size="sm"
                        />
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <button
                          type="button"
                          className="text-xs text-brand-600 hover:underline font-medium"
                          onClick={() => {}}
                        >
                          Drill down
                        </button>
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
