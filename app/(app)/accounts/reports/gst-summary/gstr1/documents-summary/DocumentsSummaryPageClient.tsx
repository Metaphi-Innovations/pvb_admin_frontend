"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Receipt,
  ScrollText,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsReportBody,
  AccountsReportKpiCard,
  AccountsReportKpiGrid,
} from "@/components/accounts/AccountsReportLayout";
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
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportWarehouseMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportFilterField,
  ReportStatusMultiFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  formatMultiSelectLabel,
  isMultiFilterActive,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import {
  resolveBranchFilterLabel,
  resolveWarehouseFilterLabel,
} from "../../gst-summary-data";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { resolveFinancialYearLabel } from "@/lib/accounts/gst-summary-compute";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import {
  buildDocumentsSummaryFilterQuery,
  buildDocumentsSummaryReport,
  DOCUMENT_TYPE_LABELS,
  getDocumentsSummaryBranchOptions,
  getDocumentsSummaryWarehouseOptions,
  parseDocumentsSummaryFiltersFromSearch,
  type DocumentsSummaryFilters,
  type DocumentsSummaryRow,
  type GstDocumentTypeFilter,
} from "@/lib/accounts/gstr1-documents-summary-compute";
import {
  exportDocumentsSummaryToExcel,
  exportDocumentsSummaryToPdf,
} from "./gstr1-documents-summary-export";


function getDocsFilterCell(row: DocumentsSummaryRow, colKey: string): string {
  switch (colKey) {
    case "documentType":
      return row.documentTypeLabel || row.documentType || "";
    case "firstDocumentNo":
      return row.firstDocumentNo || "";
    case "lastDocumentNo":
      return row.lastDocumentNo || "";
    default:
      return "";
  }
}

function DocsFilteredRows({
  rows,
  children,
}: {
  rows: DocumentsSummaryRow[];
  children: (visible: DocumentsSummaryRow[]) => ReactNode;
}) {
  const visible = useAccountsFilteredRows(rows);
  return <>{children(visible)}</>;
}


const PLACEHOLDER_DATE = "2025-04-01";

const DOCUMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "sales_invoice", label: DOCUMENT_TYPE_LABELS.sales_invoice },
  { value: "credit_note", label: DOCUMENT_TYPE_LABELS.credit_note },
  { value: "debit_note", label: DOCUMENT_TYPE_LABELS.debit_note },
];

function defaultFyDateRange(): { from: string; to: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { from: PLACEHOLDER_DATE, to: today, fyId: "all" };
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

export default function DocumentsSummaryPageClient() {
  const mounted = useClientMounted();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branch, setBranch] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (!datesReady) return;
    const qs = searchParams.toString();
    if (!qs) return;
    const { from, to, fyId } = defaultFyDateRange();
    const parsed = parseDocumentsSummaryFiltersFromSearch(qs, {
      financialYearId: fyId,
      dateFrom: from,
      dateTo: to,
      branch: [],
      warehouse: [],
      documentType: [],
    });
    setFinancialYearId(parsed.financialYearId);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setWarehouse(normalizeMultiFilter(parsed.warehouse));
    setDocumentTypes(parsed.documentType);
    setPreset("custom");
  }, [searchParams, datesReady]);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        setDateFrom(fy.startDate);
        const today = new Date().toISOString().slice(0, 10);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const filters = useMemo(
    (): DocumentsSummaryFilters => ({
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      documentType: documentTypes,
    }),
    [financialYearId, dateFrom, dateTo, branch, warehouse, documentTypes, refreshKey],
  );

  const branchOptions = useMemo(
    () => (mounted ? getDocumentsSummaryBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, filters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getDocumentsSummaryWarehouseOptions() : []),
    [mounted, filters],
  );
  const warehouseOptionsForFilter = warehouseOptions.filter((w) => w !== "all");
  const moreFilterCount = countActiveMoreFilters({ warehouse });

  const report = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        rows: [],
        totals: {
          totalSalesInvoices: 0,
          totalCreditNotes: 0,
          totalDebitNotes: 0,
          totalDocumentsGenerated: 0,
          totalCancelledDocuments: 0,
        },
        hasData: false,
      };
    }
    return buildDocumentsSummaryReport(filters);
  }, [mounted, datesReady, filters]);

  const backHref = `/accounts/reports/gst-summary/gstr1?${buildDocumentsSummaryFilterQuery({
    ...filters,
    documentType: [],
  })}`;

  const hasFilters =
    isMultiFilterActive(branch) ||
    isMultiFilterActive(warehouse) ||
    documentTypes.length > 0;

  const resetFilters = () => {
    setBranch([]);
    setWarehouse([]);
    setDocumentTypes([]);
  };

  const filterSummaryItems = useMemo(
    () =>
      [
        buildBranchFilterSummary(normalizeMultiFilter(branch), () => setBranch([])),
        buildEntityFilterSummary(
          "warehouse",
          "Warehouses",
          normalizeMultiFilter(warehouse),
          warehouseOptionsForFilter.map((w) => ({ value: w, label: w })),
          () => setWarehouse([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [branch, warehouse, warehouseOptionsForFilter],
  );

  const exportMeta = useMemo(
    () => ({
      financialYear: resolveFinancialYearLabel(financialYearId),
      dateFrom,
      dateTo,
      branch: resolveBranchFilterLabel(branch),
      warehouse: resolveWarehouseFilterLabel(warehouse),
      documentType: formatMultiSelectLabel(documentTypes, DOCUMENT_TYPE_OPTIONS, "Type", "All types"),
    }),
    [financialYearId, dateFrom, dateTo, branch, warehouse, documentTypes],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportDocumentsSummaryToExcel(report.rows, report.totals, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportDocumentsSummaryToPdf(report.rows, report.totals, exportMeta);
  };

  const filterBar = (
    <>
      <ReportFilterRow
        className="items-end gap-2 flex-wrap"
        end={
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={exporting || !report.hasData}
          />
        }
      >
        <ReportFinancialYearFilter value={financialYearId} onChange={handleFinancialYearChange} />
        <ReportDateRangeFilter
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPresetChange={setPreset}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <ReportBranchMultiFilter values={branch} onChange={setBranch} options={branchOptions} />
        <ReportMoreFilters activeCount={moreFilterCount}>
          <ReportWarehouseMultiFilter
            values={warehouse}
            onChange={setWarehouse}
            options={warehouseOptionsForFilter}
          />
        </ReportMoreFilters>
        <ReportStatusMultiFilter
          label="Document Type"
          values={documentTypes}
          onChange={setDocumentTypes}
          options={DOCUMENT_TYPE_OPTIONS}
        />
        {hasFilters && (
          <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
            Reset
          </Button>
        )}
      </ReportFilterRow>
      <ReportFilterSummary items={filterSummaryItems} />
    </>
  );

  const { totals } = report;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "Documents Summary")}
      title="Documents Summary"
      description="GST document counts and number ranges for sales invoices, credit notes, and debit notes."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </Button>
      }
      filters={filterBar}
    >
      <AccountsReportBody>
        <AccountsReportKpiGrid>
          <AccountsReportKpiCard label="Total Sales Invoices" value={totals.totalSalesInvoices} icon={FileText} isCount />
          <AccountsReportKpiCard label="Total Credit Notes" value={totals.totalCreditNotes} icon={Receipt} isCount />
          <AccountsReportKpiCard label="Total Debit Notes" value={totals.totalDebitNotes} icon={ScrollText} isCount />
          <AccountsReportKpiCard
            label="Total Documents Generated"
            value={totals.totalDocumentsGenerated}
            icon={FileText}
            isCount
          />
          <AccountsReportKpiCard
            label="Total Cancelled Documents"
            value={totals.totalCancelledDocuments}
            icon={XCircle}
            warning={totals.totalCancelledDocuments > 0}
            isCount
          />
        </AccountsReportKpiGrid>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading documents summary…
            </div>
          ) : !report.hasData ? (
            <div className="accounts-table-empty py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No GST documents match the selected filters.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="block mx-auto mt-1 text-brand-600 hover:underline text-xs"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <AccountsColumnFilterProvider
              rows={report.rows}
              getCellValue={getDocsFilterCell}
            >
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={1100}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <SortTh label="Document Type" colKey="documentType" sortable={false} />
                    <SortTh label="First Document Number" colKey="firstDocumentNo" sortable={false} />
                    <SortTh label="Last Document Number" colKey="lastDocumentNo" sortable={false} />
                    <SortTh label="Total Generated" colKey="totalGenerated" sortable={false} filterable={false} align="right" />
                    <SortTh label="Cancelled" colKey="cancelledCount" sortable={false} filterable={false} align="right" />
                    <SortTh label="Active" colKey="activeCount" sortable={false} filterable={false} align="right" />
                    <SortTh label="Action" colKey="_actions" sortable={false} filterable={false} className="w-28" />
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  <DocsFilteredRows rows={report.rows}>
                    {(visibleRows) =>
                      visibleRows.map((row) => (
                    <AccountsTableRow key={row.rowKey} className="group">
                      <AccountsTableCell className="text-xs font-semibold">
                        {row.documentTypeLabel}
                      </AccountsTableCell>
                      <AccountsTableCell className="font-mono text-xs text-brand-700">
                        {row.firstDocumentNo}
                      </AccountsTableCell>
                      <AccountsTableCell className="font-mono text-xs text-brand-700">
                        {row.lastDocumentNo}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs font-medium">
                        {row.totalGenerated}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        className={cn(
                          "text-xs font-medium",
                          row.cancelledCount > 0 && "text-red-600",
                        )}
                      >
                        {row.cancelledCount}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs font-medium">
                        {row.activeCount}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] px-2 gap-1"
                          asChild
                        >
                          <Link href={row.listingHref}>
                            <ExternalLink className="w-3 h-3" />
                            View Details
                          </Link>
                        </Button>
                      </AccountsTableCell>
                    </AccountsTableRow>
                      ))
                    }
                  </DocsFilteredRows>
                </AccountsTableBody>
              </AccountsTable>
            </AccountsTableScroll>
            </AccountsColumnFilterProvider>
          )}
        </AccountsListingTableCard>
      </AccountsReportBody>
    </AccountsPageShell>
  );
}
