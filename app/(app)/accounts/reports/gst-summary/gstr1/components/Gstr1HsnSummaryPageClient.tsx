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
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { useGstReportFilters } from "../../useGstReportFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import {
  buildGstr1ExportMeta,
  buildGstr1HsnRows,
  buildGstr1ReportHeader,
  filterGstr1Documents,
} from "../gstr1-report-data";
import { exportGstr1InvoiceList } from "../gstr1-report-export";
import { Gstr1ReportHeaderBlock } from "./Gstr1ReportHeaderBlock";

const GST_SUMMARY_GSTR1 = "/accounts/reports/gst-summary/gstr1";

export function Gstr1HsnSummaryPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const { header, rows } = useMemo(() => {
    if (!mounted || !datesReady) return { header: null, rows: [] };
    const docs = filterGstr1Documents(filters);
    return {
      header: buildGstr1ReportHeader(filters),
      rows: buildGstr1HsnRows(docs),
    };
  }, [mounted, datesReady, filters]);

  const backHref = buildGstReportHref(GST_SUMMARY_GSTR1, filters);

  const handleExport = (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      const meta = buildGstr1ExportMeta(filters);
      exportGstr1InvoiceList(
        meta,
        "HSN Summary",
        rows.map((r) => ({
          hsn: r.hsn,
          description: r.description,
          uqc: r.uqc,
          quantity: r.quantity,
          taxableAmount: r.taxableAmount,
          gstRate: `${r.gstRate}%`,
          igst: r.igst,
          cgst: r.cgst,
          sgst: r.sgst,
          totalTax: r.totalTax,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "HSN Summary", backHref)}
      title="HSN Summary"
      description="GSTR-1 HSN-wise outward supply summary."
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
              Loading HSN summary…
            </div>
          ) : (
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={1000}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <FinancialReportHeadCell>HSN</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Description</FinancialReportHeadCell>
                    <FinancialReportHeadCell>UQC</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Quantity</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Taxable Amount</FinancialReportHeadCell>
                    <FinancialReportHeadCell>GST Rate</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">IGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">CGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">SGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Total Tax</FinancialReportHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {rows.map((row) => (
                    <AccountsTableRow key={row.id}>
                      <AccountsTableCell className="text-xs font-mono font-semibold text-brand-700">
                        {row.hsn}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs">{row.description}</AccountsTableCell>
                      <AccountsTableCell className="text-xs">{row.uqc}</AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums">
                        {row.quantity}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.taxableAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs">{row.gstRate}%</AccountsTableCell>
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
                        {formatMoney(row.totalTax)}
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
