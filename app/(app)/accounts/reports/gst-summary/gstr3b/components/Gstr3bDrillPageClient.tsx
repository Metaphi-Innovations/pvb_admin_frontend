"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
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
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGstReportHref, GST_REPORT_BASE_PATH } from "@/lib/accounts/gst-report-filters";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { cn } from "@/lib/utils";
import { useGstReportFilters } from "../../useGstReportFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import { exportGstTabularReport } from "../../gst-report-export";
import { Gstr1ReportHeaderBlock } from "../../gstr1/components/Gstr1ReportHeaderBlock";
import { useDebouncedValue } from "../../../pl/pl-hooks";
import {
  buildGstr3bReport,
  getDrillDocuments,
  resolveGstr3bSourceHref,
  toGstr3bListRows,
} from "../gstr3b-report-data";
import {
  GSTR3B_DOC_TYPE_LABELS,
  GSTR3B_DRILL_LABELS,
  isValidGstr3bDrillKey,
  type Gstr3bDrillKey,
} from "../gstr3b-report-types";

export default function Gstr3bDrillPageClient() {
  const params = useParams();
  const bucket = typeof params.bucket === "string" ? params.bucket : "";
  const drillKey: Gstr3bDrillKey = isValidGstr3bDrillKey(bucket) ? bucket : "outward_taxable";

  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const report = useMemo(() => {
    if (!mounted || !datesReady) return null;
    return buildGstr3bReport(filters);
  }, [mounted, datesReady, filters]);

  const listRows = useMemo(() => {
    if (!report) return [];
    const rows = toGstr3bListRows(getDrillDocuments(report.documents, drillKey));
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.documentNo.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        r.gstin.toLowerCase().includes(q),
    );
  }, [report, drillKey, debouncedSearch]);

  const backHref = buildGstReportHref(`${GST_REPORT_BASE_PATH}/gstr3b`, filters);
  const title = GSTR3B_DRILL_LABELS[drillKey];

  const handleExport = (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      exportGstTabularReport(
        { reportTitle: `GSTR-3B — ${title}`, filters },
        [
          { label: "Date" },
          { label: "Document No" },
          { label: "Type" },
          { label: "Party" },
          { label: "GSTIN" },
          { label: "Place of Supply" },
          { label: "Taxable Amount (₹)", align: "right", className: "num" },
          { label: "IGST (₹)", align: "right", className: "num" },
          { label: "CGST (₹)", align: "right", className: "num" },
          { label: "SGST (₹)", align: "right", className: "num" },
          { label: "Tax Amount (₹)", align: "right", className: "num" },
        ],
        listRows.map((r) => ({
          documentDate: r.documentDate,
          documentNo: r.documentNo,
          docType: GSTR3B_DOC_TYPE_LABELS[r.docType],
          partyName: r.partyName,
          gstin: r.gstin || "—",
          placeOfSupply: r.placeOfSupply || "—",
          taxableValue: r.taxableValue,
          igst: r.igst,
          cgst: r.cgst,
          sgst: r.sgst,
          taxAmount: r.taxAmount,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", title)}
      title={title}
      description="GSTR-3B document listing."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" /> GSTR-3B Summary
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
        {report && (
          <Gstr1ReportHeaderBlock
            header={report.header}
            items={[
              {
                label: "Company Name",
                value: report.header.companyName || ACCOUNTS_COMPANY_NAME,
              },
              { label: "GSTIN", value: report.header.gstin, mono: true },
              { label: "Report Name", value: report.header.reportName },
              { label: "Financial Year", value: report.header.financialYear },
              { label: "Return Period", value: report.header.returnPeriod },
              { label: "Branch", value: report.branchLabel },
            ]}
          />
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 max-w-xs space-y-1">
            <label className="text-xs font-medium text-foreground">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Document no., party, GSTIN…"
              className="h-9 text-sm rounded-lg"
            />
          </div>
        </div>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading documents…
            </div>
          ) : listRows.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No documents found</p>
              <p className="text-xs text-muted-foreground">Try adjusting filters or search.</p>
            </div>
          ) : (
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={1100}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <FinancialReportHeadCell>Date</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Document No</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Type</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Party</FinancialReportHeadCell>
                    <FinancialReportHeadCell>GSTIN</FinancialReportHeadCell>
                    <FinancialReportHeadCell>Place of Supply</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Taxable</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">IGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">CGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">SGST</FinancialReportHeadCell>
                    <FinancialReportHeadCell align="right">Tax</FinancialReportHeadCell>
                    <FinancialReportHeadCell className="w-20">Action</FinancialReportHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {listRows.map((row) => {
                    const href = resolveGstr3bSourceHref(row.docType, row.sourceId, row.isDemo);
                    return (
                      <AccountsTableRow key={row.id}>
                        <AccountsTableCell className="text-xs">{row.documentDate}</AccountsTableCell>
                        <AccountsTableCell className="text-xs font-mono font-semibold text-brand-700">
                          {row.documentNo}
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs">
                          {GSTR3B_DOC_TYPE_LABELS[row.docType]}
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs font-medium">{row.partyName}</AccountsTableCell>
                        <AccountsTableCell className="text-xs font-mono">{row.gstin || "—"}</AccountsTableCell>
                        <AccountsTableCell className="text-xs">{row.placeOfSupply || "—"}</AccountsTableCell>
                        <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                          {formatMoney(row.taxableValue)}
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
                        <AccountsTableCell>
                          {href ? (
                            <Link
                              href={href}
                              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">Demo</span>
                          )}
                        </AccountsTableCell>
                      </AccountsTableRow>
                    );
                  })}
                </AccountsTableBody>
              </AccountsTable>
            </AccountsTableScroll>
          )}
        </AccountsListingTableCard>
      </AccountsReportBody>
    </AccountsPageShell>
  );
}
