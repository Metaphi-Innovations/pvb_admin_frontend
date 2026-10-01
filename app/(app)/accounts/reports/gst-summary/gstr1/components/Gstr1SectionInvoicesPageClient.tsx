"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGstReportHref } from "@/lib/accounts/gst-report-filters";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { useGstReportFilters } from "../../useGstReportFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import { useDebouncedValue } from "../../../pl/pl-hooks";
import {
  buildGstr1ExportMeta,
  buildGstr1ReportHeader,
  documentToListRow,
  getGstr1DocumentsForSection,
  getGstr1DocumentById,
  searchGstr1InvoiceList,
} from "../gstr1-report-data";
import { exportGstr1InvoiceList } from "../gstr1-report-export";
import { GSTR1_SECTION_LABELS, type Gstr1ReportSectionId } from "../gstr1-report-types";
import { Gstr1InvoiceDetailSheet } from "./Gstr1InvoiceDetailSheet";
import { Gstr1ReportHeaderBlock } from "./Gstr1ReportHeaderBlock";

const GST_SUMMARY_GSTR1 = "/accounts/reports/gst-summary/gstr1";

export function Gstr1SectionInvoicesPageClient({
  sectionId,
}: {
  sectionId: Exclude<Gstr1ReportSectionId, "hsn-summary" | "documents-summary" | "grand-total">;
}) {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const sectionLabel = GSTR1_SECTION_LABELS[sectionId];

  const listRows = useMemo(() => {
    if (!mounted || !datesReady) return [];
    const docs = getGstr1DocumentsForSection(sectionId, filters);
    const rows = docs.map(documentToListRow);
    return searchGstr1InvoiceList(rows, debouncedSearch);
  }, [mounted, datesReady, filters, sectionId, debouncedSearch]);

  const header = useMemo(() => {
    if (!mounted || !datesReady) return null;
    return buildGstr1ReportHeader(filters);
  }, [mounted, datesReady, filters]);

  const detailDoc = useMemo(() => {
    if (!detailId || !mounted || !datesReady) return null;
    return getGstr1DocumentById(detailId, filters);
  }, [detailId, mounted, datesReady, filters]);

  const backHref = buildGstReportHref(GST_SUMMARY_GSTR1, filters);

  const handleExport = (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      const meta = buildGstr1ExportMeta(filters);
      exportGstr1InvoiceList(
        meta,
        sectionLabel,
        listRows.map((r) => ({
          documentDate: r.documentDate,
          invoiceNumber: r.invoiceNumber,
          customer: r.customer,
          gstin: r.gstin,
          placeOfSupply: r.placeOfSupply,
          invoiceType: r.invoiceType,
          invoiceAmount: r.invoiceAmount,
          taxableAmount: r.taxableAmount,
          gstRate: r.gstRate ? `${r.gstRate}%` : "—",
          igst: r.igst,
          cgst: r.cgst,
          sgst: r.sgst,
          taxAmount: r.taxAmount,
          status: r.status,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", sectionLabel, backHref)}
      title={sectionLabel}
      description="GSTR-1 section invoice listing."
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
              disabled={exporting || listRows.length === 0}
            />
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <AccountsReportBody className="space-y-3">
        {header && <Gstr1ReportHeaderBlock header={header} />}

        <div className="flex items-end gap-2">
          <div className="flex-1 max-w-xs space-y-1">
            <label className="text-xs font-medium text-foreground">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invoice no., customer, GSTIN…"
              className="h-9 text-sm rounded-lg"
            />
          </div>
        </div>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading invoices…
            </div>
          ) : (
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={1300}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <FinancialReportHeadCell>Invoice Date</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Invoice Number</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Customer</FinancialReportHeadCell>
                    <FinancialReportHeadCell>GSTIN</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Place of Supply</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Invoice Type</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Invoice Amount</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Taxable Amount</FinancialReportHeadCell>
                    <FinancialReportHeadCell>GST Rate</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">IGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">CGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">SGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Tax Amount</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Status</FinancialReportHeadCell>
                    <FinancialReportHeadCell className="w-16">Action</FinancialReportHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {listRows.map((row) => (
                    <AccountsTableRow
                      key={row.id}
                      className={cn(row.status === "Needs Review" && "bg-amber-50/30")}
                    >
                      <AccountsTableCell className="text-xs">{row.documentDate}</AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono font-semibold text-brand-700">
                        {row.invoiceNumber}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs font-medium">{row.customer}</AccountsTableCell>
                      <AccountsTableCell className="text-xs font-mono">{row.gstin}</AccountsTableCell>
                      <AccountsTableCell className="text-xs">{row.placeOfSupply}</AccountsTableCell>
                      <AccountsTableCell className="text-xs">{row.invoiceType}</AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.invoiceAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.taxableAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs">
                        {row.gstRate ? `${row.gstRate}%` : "—"}
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
                      <AccountsTableCell className="text-xs">
                        <span
                          className={cn(
                            "inline-flex text-xs px-2 py-0.5 rounded-full font-medium",
                            row.status === "Needs Review"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {row.status}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <button
                          type="button"
                          onClick={() => setDetailId(row.id)}
                          className="text-xs text-brand-600 hover:underline font-medium"
                        >
                          View
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

      <Gstr1InvoiceDetailSheet
        document={detailDoc}
        open={detailId != null}
        onClose={() => setDetailId(null)}
      />
    </AccountsPageShell>
  );
}
