"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGstReportHref } from "@/lib/accounts/gst-report-filters";
import { useGstReportFilters } from "../../useGstReportFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import {
  buildGstr1DocumentSummaryRows,
  buildGstr1ExportMeta,
  buildGstr1ReportHeader,
  filterGstr1Documents,
} from "../gstr1-report-data";
import { exportGstr1InvoiceList } from "../gstr1-report-export";
import { Gstr1ReportHeaderBlock } from "./Gstr1ReportHeaderBlock";

const GST_SUMMARY_GSTR1 = "/accounts/reports/gst-summary/gstr1";

export function Gstr1DocumentsSummaryPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const { header, rows } = useMemo(() => {
    if (!mounted || !datesReady) return { header: null, rows: [] };
    const docs = filterGstr1Documents(filters);
    return {
      header: buildGstr1ReportHeader(filters),
      rows: buildGstr1DocumentSummaryRows(docs),
    };
  }, [mounted, datesReady, filters]);

  const backHref = buildGstReportHref(GST_SUMMARY_GSTR1, filters);

  const handleExport = (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      const meta = buildGstr1ExportMeta(filters);
      exportGstr1InvoiceList(
        meta,
        "Document Summary",
        rows.map((r) => ({
          documentType: r.documentType,
          fromNumber: r.fromNumber,
          toNumber: r.toNumber,
          totalIssued: r.totalIssued,
          cancelled: r.cancelled,
          netIssued: r.netIssued,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Document Summary", backHref)}
      title="Document Summary"
      description="GSTR-1 document series summary."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" /> GSTR-1 Summary
          </Link>
        </Button>
      }
      filters={
        <GstReportFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <AccountsExportMenu
              onExcel={() => handleExport("excel")}
              onPdf={() => handleExport("pdf")}
              disabled={exporting || rows.length === 0}
            />
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <AccountsReportBody className="space-y-3">
        {header && <Gstr1ReportHeaderBlock header={header} />}

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading document summary…
            </div>
          ) : (
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={800}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <FinancialReportHeadCell>Document Type</FinancialReportHeadCell>
                    <FinancialReportHeadCell>From Number</FinancialReportHeadCell>
                    <FinancialReportHeadCell>To Number</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Total Issued</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Cancelled</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Net Issued</FinancialReportHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {rows.map((row) => (
                    <AccountsTableRow key={row.id}>
                      <AccountsTableCell className="text-xs font-medium">{row.documentType}</AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono text-brand-700">
                        {row.fromNumber}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono text-brand-700">
                        {row.toNumber}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums">
                        {row.totalIssued}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums">
                        {row.cancelled}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums font-medium">
                        {row.netIssued}
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
