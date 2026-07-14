"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  FileText,
  IndianRupee,
  Layers,
  MinusCircle,
  PlusCircle,
  Receipt,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportWarehouseMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  isMultiFilterActive,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import {
  buildGstDashboard,
  buildGstr1SectionHref,
  flattenGstDashboardForExport,
  flattenGstSummaryCardsForExport,
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  parseGstDashboardFiltersFromSearch,
  resolveBranchFilterLabel,
  resolveFinancialYearLabel,
  resolveWarehouseFilterLabel,
  type GstDashboardFilters,
  type GstSummaryCards,
} from "./gst-summary-data";
import { exportGstDashboardToExcel, exportGstDashboardToPdf } from "./gst-summary-export";

const PLACEHOLDER_DATE = "2025-04-01";

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

interface GstKpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  warning?: boolean;
  isCount?: boolean;
}

function buildKpiCards(cards: GstSummaryCards): GstKpiCardProps[] {
  return [
    { label: "Total Sales Invoices", value: cards.totalSalesInvoices, icon: Receipt, accent: true, isCount: true },
    { label: "Total Taxable Value", value: cards.totalTaxableValue, icon: IndianRupee },
    { label: "Total CGST", value: cards.totalCgst, icon: Scale },
    { label: "Total SGST", value: cards.totalSgst, icon: Scale },
    { label: "Total IGST", value: cards.totalIgst, icon: Scale },
    { label: "Total Cess", value: cards.totalCess, icon: Layers },
    { label: "Total Credit Notes", value: cards.totalCreditNotes, icon: MinusCircle, isCount: true },
    { label: "Total Debit Notes", value: cards.totalDebitNotes, icon: PlusCircle, isCount: true },
    { label: "Nil Rated / Exempt Value", value: cards.totalNilRatedExemptValue, icon: FileText },
    {
      label: "Total Exceptions",
      value: cards.totalExceptions,
      icon: AlertTriangle,
      warning: cards.totalExceptions > 0,
      isCount: true,
    },
  ];
}

export default function GstSummaryPageClient() {
  const mounted = useClientMounted();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branch, setBranch] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

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
    const parsed = parseGstDashboardFiltersFromSearch(qs, {
      financialYearId: fyId,
      dateFrom: from,
      dateTo: to,
      branch: [],
      warehouse: [],
    });
    setFinancialYearId(parsed.financialYearId);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setWarehouse(normalizeMultiFilter(parsed.warehouse));
    setPreset("custom");
  }, [searchParams, datesReady]);

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

  const gstFilters = useMemo((): GstDashboardFilters => ({
    financialYearId,
    dateFrom,
    dateTo,
    branch,
    warehouse,
  }), [financialYearId, dateFrom, dateTo, branch, warehouse]);

  const branchOptions = useMemo(
    () => (mounted ? getGstDashboardBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, gstFilters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getGstDashboardWarehouseOptions() : []),
    [mounted, gstFilters],
  );

  const dashboard = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        cards: {
          totalSalesInvoices: 0,
          totalTaxableValue: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalCess: 0,
          totalCreditNotes: 0,
          totalDebitNotes: 0,
          totalNilRatedExemptValue: 0,
          totalExceptions: 0,
        },
        sections: [],
        transactions: [],
        hasData: false,
      };
    }
    return buildGstDashboard(gstFilters);
  }, [mounted, datesReady, gstFilters]);

  const defaultFyRange = useMemo(() => defaultFyDateRange(), []);

  const hasFilters =
    datesReady &&
    (financialYearId !== defaultFyRange.fyId ||
      dateFrom !== defaultFyRange.from ||
      dateTo !== defaultFyRange.to ||
      isMultiFilterActive(branch) ||
      isMultiFilterActive(warehouse));

  const resetFilters = useCallback(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setPreset("custom");
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setBranch([]);
    setWarehouse([]);
  }, []);

  const moreFilterCount = countActiveMoreFilters({ warehouse });
  const warehouseOptionsForFilter = warehouseOptions.filter((w) => w !== "all");

  const filterSummaryItems = useMemo(() => {
    return [
      buildBranchFilterSummary(normalizeMultiFilter(branch), () => setBranch([])),
      buildEntityFilterSummary(
        "warehouse",
        "Warehouses",
        normalizeMultiFilter(warehouse),
        warehouseOptionsForFilter.map((w) => ({ value: w, label: w })),
        () => setWarehouse([]),
      ),
    ].filter((item): item is NonNullable<typeof item> => item != null);
  }, [branch, warehouse, warehouseOptionsForFilter]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: resolveFinancialYearLabel(financialYearId),
      branch: resolveBranchFilterLabel(branch),
      warehouse: resolveWarehouseFilterLabel(warehouse),
    }),
    [dateFrom, dateTo, financialYearId, branch, warehouse],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportGstDashboardToExcel(
        flattenGstSummaryCardsForExport(dashboard.cards),
        flattenGstDashboardForExport(dashboard.sections),
        exportMeta,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportGstDashboardToPdf(
      flattenGstSummaryCardsForExport(dashboard.cards),
      flattenGstDashboardForExport(dashboard.sections),
      exportMeta,
    );
  };

  const kpiCards = buildKpiCards(dashboard.cards);

  const filterBar = (
    <>
      <ReportFilterRow
        className="items-end gap-2"
        end={
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={exporting || !dashboard.hasData}
          />
        }
      >
        <ReportFinancialYearFilter
          value={financialYearId}
          onChange={handleFinancialYearChange}
        />
        <ReportDateRangeFilter
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPresetChange={setPreset}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <ReportBranchMultiFilter
          values={branch}
          onChange={setBranch}
          options={branchOptions}
        />
        <ReportMoreFilters activeCount={moreFilterCount}>
          <ReportWarehouseMultiFilter
            values={warehouse}
            onChange={setWarehouse}
            options={warehouseOptionsForFilter}
          />
        </ReportMoreFilters>
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-sm px-2"
            onClick={resetFilters}
          >
            Reset
          </Button>
        )}
      </ReportFilterRow>
      <ReportFilterSummary items={filterSummaryItems} />
    </>
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary")}
      title="GST Summary Dashboard"
      description="Consolidated outward GST view for GSTR-1 preparation."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={filterBar}
    >
      <AccountsReportBody>
        <AccountsReportKpiGrid>
          {kpiCards.map((card) => (
            <AccountsReportKpiCard key={card.label} {...card} />
          ))}
        </AccountsReportKpiGrid>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GST Summary…
            </div>
          ) : !dashboard.hasData ? (
            <div className="accounts-table-empty py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No outward GST transactions match the selected filters.
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
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={920}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell className="text-xs font-semibold min-w-[10rem]">
                      Section
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold min-w-[7rem]">
                      Document Count
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold min-w-[9rem]">
                      Taxable Value
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold min-w-[9rem]">
                      Tax Amount
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right" className="text-xs font-semibold min-w-[6rem]">
                      Exceptions
                    </AccountsTableHeadCell>
                    <AccountsTableHeadCell className="text-xs font-semibold w-28 min-w-[7rem]">
                      Action
                    </AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {dashboard.sections.map((row) => (
                    <AccountsTableRow
                      key={row.sectionId}
                      className={cn(
                        row.sectionId === "exceptions" &&
                          row.exceptions > 0 &&
                          "bg-amber-50/30",
                      )}
                    >
                      <AccountsTableCell className="text-xs font-medium text-foreground">
                        {row.section}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums">
                        {row.documentCount}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.taxableValue)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                        {formatMoney(row.taxAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        className={cn(
                          "text-xs tabular-nums",
                          row.exceptions > 0 && "text-amber-700 font-semibold",
                        )}
                      >
                        {row.exceptions}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <Link
                          href={buildGstr1SectionHref(row.sectionId, gstFilters)}
                          className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-medium"
                        >
                          View Details
                        </Link>
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
