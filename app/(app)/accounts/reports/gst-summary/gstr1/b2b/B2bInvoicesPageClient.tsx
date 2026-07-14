"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  IndianRupee,
  Receipt,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ReportCustomerMultiFilter,
  ReportWarehouseMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportFilterField,
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
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { resolveFinancialYearLabel } from "@/lib/accounts/gst-summary-compute";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import {
  buildB2bFilterQuery,
  buildB2bInvoiceReport,
  getB2bBranchOptions,
  getB2bCustomerOptions,
  getB2bWarehouseOptions,
  parseB2bFiltersFromSearch,
  resolveExceptionFixAction,
  type B2bGstRateFilter,
  type B2bInvoiceFilters,
  type B2bInvoiceRow,
  type B2bStatusFilter,
} from "@/lib/accounts/gstr1-b2b-compute";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { exportB2bInvoicesToExcel, exportB2bInvoicesToPdf } from "./gstr1-b2b-export";
import { B2bInvoiceDetailSheet } from "./components/B2bInvoiceDetailSheet";
import { useDebouncedValue } from "../../../pl/pl-hooks";

const PLACEHOLDER_DATE = "2025-04-01";

const GST_RATE_OPTIONS: { value: B2bGstRateFilter; label: string }[] = [
  { value: "all", label: "All rates" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const STATUS_OPTIONS: { value: B2bStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "valid", label: "Valid" },
  { value: "exception", label: "Exception" },
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

function InvoiceStatusBadge({ status }: { status: "valid" | "exception" }) {
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      Exception
    </span>
  );
}

function RateBreakupRows({ row }: { row: B2bInvoiceRow }) {
  return (
    <>
      {row.rateBreakups.map((b) => (
        <AccountsTableRow key={`${row.invoiceId}-${b.ratePct}`} className="bg-muted/10">
          <AccountsTableCell className="text-xs text-muted-foreground pl-10">
            GST @ {b.ratePct}%
          </AccountsTableCell>
          <AccountsTableCell />
          <AccountsTableCell />
          <AccountsTableCell />
          <AccountsTableCell />
          <AccountsTableCell />
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.taxableValue)}
          </AccountsTableCell>
          <AccountsTableCell className="text-xs text-muted-foreground">{b.ratePct}%</AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.cgst)}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.sgst)}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.igst)}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            —
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.totalTax)}
          </AccountsTableCell>
          <AccountsTableCell />
          <AccountsTableCell />
        </AccountsTableRow>
      ))}
    </>
  );
}

export default function B2bInvoicesPageClient() {
  const mounted = useClientMounted();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branch, setBranch] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState<string[]>([]);
  const [gstRate, setGstRate] = useState<B2bGstRateFilter>("all");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [status, setStatus] = useState<B2bStatusFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [viewRow, setViewRow] = useState<B2bInvoiceRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedInvoiceNo = useDebouncedValue(invoiceNo, 300);

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
    const parsed = parseB2bFiltersFromSearch(qs, {
      financialYearId: fyId,
      dateFrom: from,
      dateTo: to,
      branch: [],
      warehouse: [],
      customerId: [],
      gstRate: "all",
      invoiceNo: "",
      status: "all",
    });
    setFinancialYearId(parsed.financialYearId);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setWarehouse(normalizeMultiFilter(parsed.warehouse));
    setCustomerId(normalizeMultiFilter(parsed.customerId));
    setGstRate(parsed.gstRate);
    setInvoiceNo(parsed.invoiceNo);
    setStatus(parsed.status);
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

  const b2bFilters = useMemo((): B2bInvoiceFilters => ({
    financialYearId,
    dateFrom,
    dateTo,
    branch,
    warehouse,
    customerId,
    gstRate,
    invoiceNo: debouncedInvoiceNo,
    status,
  }), [
    financialYearId,
    dateFrom,
    dateTo,
    branch,
    warehouse,
    customerId,
    gstRate,
    debouncedInvoiceNo,
    status,
    refreshKey,
  ]);

  const branchOptions = useMemo(
    () => (mounted ? getB2bBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, b2bFilters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getB2bWarehouseOptions() : []),
    [mounted, b2bFilters],
  );
  const customerOptions = useMemo(
    () => (mounted ? getB2bCustomerOptions() : []),
    [mounted, b2bFilters],
  );
  const customerMultiOptions = useMemo(
    () =>
      customerOptions.map((c) => ({
        id: Number(c.id),
        customerName: c.name,
      })),
    [customerOptions],
  );
  const customerSelectOptions = useMemo(
    () => customerOptions.map((c) => ({ value: c.id, label: c.name })),
    [customerOptions],
  );
  const warehouseOptionsForFilter = warehouseOptions.filter((w) => w !== "all");
  const moreFilterCount = countActiveMoreFilters({ warehouse });

  const report = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        rows: [],
        totals: {
          totalInvoices: 0,
          totalInvoiceValue: 0,
          totalTaxableValue: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalCess: 0,
          totalExceptions: 0,
        },
        hasData: false,
      };
    }
    return buildB2bInvoiceReport(b2bFilters);
  }, [mounted, datesReady, b2bFilters]);

  const defaultFyRange = useMemo(() => defaultFyDateRange(), []);

  const hasFilters =
    datesReady &&
    (financialYearId !== defaultFyRange.fyId ||
      dateFrom !== defaultFyRange.from ||
      dateTo !== defaultFyRange.to ||
      isMultiFilterActive(branch) ||
      isMultiFilterActive(warehouse) ||
      isMultiFilterActive(customerId) ||
      gstRate !== "all" ||
      Boolean(invoiceNo.trim()) ||
      status !== "all");

  const resetFilters = useCallback(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setPreset("custom");
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setBranch([]);
    setWarehouse([]);
    setCustomerId([]);
    setGstRate("all");
    setInvoiceNo("");
    setStatus("all");
  }, []);

  const backHref = `/accounts/reports/gst-summary/gstr1?${buildB2bFilterQuery({
    ...b2bFilters,
    customerId: [],
    gstRate: "all",
    invoiceNo: "",
    status: "all",
  })}`;

  const filterSummaryItems = useMemo(
    () =>
      [
        buildBranchFilterSummary(normalizeMultiFilter(branch), () => setBranch([])),
        buildEntityFilterSummary(
          "customer",
          "Customers",
          normalizeMultiFilter(customerId),
          customerSelectOptions,
          () => setCustomerId([]),
        ),
        buildEntityFilterSummary(
          "warehouse",
          "Warehouses",
          normalizeMultiFilter(warehouse),
          warehouseOptionsForFilter.map((w) => ({ value: w, label: w })),
          () => setWarehouse([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [branch, customerId, warehouse, customerSelectOptions, warehouseOptionsForFilter],
  );

  const exportMeta = useMemo(() => {
    return {
      financialYear: resolveFinancialYearLabel(financialYearId),
      dateFrom,
      dateTo,
      branch: resolveBranchFilterLabel(branch),
      warehouse: resolveWarehouseFilterLabel(warehouse),
      customer: formatMultiSelectLabel(
        normalizeMultiFilter(customerId),
        customerSelectOptions,
        "Customer",
        "All customers",
      ),
      gstRate: GST_RATE_OPTIONS.find((o) => o.value === gstRate)?.label ?? "All rates",
      invoiceNo: debouncedInvoiceNo,
      status: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "All",
    };
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    branch,
    warehouse,
    customerId,
    customerSelectOptions,
    gstRate,
    debouncedInvoiceNo,
    status,
  ]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportB2bInvoicesToExcel(report.rows, report.totals, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportB2bInvoicesToPdf(report.rows, report.totals, exportMeta);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
        <ReportCustomerMultiFilter
          values={customerId}
          onChange={setCustomerId}
          customers={customerMultiOptions}
        />
        <ReportMoreFilters activeCount={moreFilterCount}>
          <ReportWarehouseMultiFilter
            values={warehouse}
            onChange={setWarehouse}
            options={warehouseOptionsForFilter}
          />
        </ReportMoreFilters>
        <ReportFilterField label="GST Rate" minWidthClass="min-w-[120px]">
          <Select value={gstRate} onValueChange={(v) => setGstRate(v as B2bGstRateFilter)}>
            <SelectTrigger className={cn(filterControlClass, "mt-0 w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GST_RATE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ReportFilterField>
        <ReportFilterField label="Invoice Number" minWidthClass="min-w-[180px]">
          <Input
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="Search invoice…"
            className={cn(filterControlClass, "mt-0 w-full")}
          />
        </ReportFilterField>
        <ReportFilterField label="Status" minWidthClass="min-w-[120px]">
          <Select value={status} onValueChange={(v) => setStatus(v as B2bStatusFilter)}>
            <SelectTrigger className={cn(filterControlClass, "mt-0 w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ReportFilterField>
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
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "B2B Invoices")}
      title="B2B Invoices"
      description="Sales invoices issued to GST-registered customers for GSTR-1."
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
          <AccountsReportKpiCard label="Total B2B Invoices" value={totals.totalInvoices} icon={Receipt} isCount />
          <AccountsReportKpiCard label="Total Invoice Value" value={totals.totalInvoiceValue} icon={IndianRupee} />
          <AccountsReportKpiCard label="Total Taxable Value" value={totals.totalTaxableValue} icon={IndianRupee} />
          <AccountsReportKpiCard label="Total CGST" value={totals.totalCgst} icon={Scale} />
          <AccountsReportKpiCard label="Total SGST" value={totals.totalSgst} icon={Scale} />
          <AccountsReportKpiCard label="Total IGST" value={totals.totalIgst} icon={Scale} />
          <AccountsReportKpiCard label="Total Cess" value={totals.totalCess} icon={Scale} />
          <AccountsReportKpiCard
            label="Total Exceptions"
            value={totals.totalExceptions}
            icon={AlertTriangle}
            warning={totals.totalExceptions > 0}
            isCount
          />
        </AccountsReportKpiGrid>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading B2B invoices…
            </div>
          ) : !report.hasData ? (
            <div className="accounts-table-empty py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No B2B invoices match the selected filters.
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
              <AccountsTable minWidth={1400}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell className="w-8" />
                    <AccountsTableHeadCell>Invoice Date</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Invoice Number</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Customer Name</AccountsTableHeadCell>
                    <AccountsTableHeadCell>GSTIN</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Place of Supply</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Invoice Value</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Taxable Value</AccountsTableHeadCell>
                    <AccountsTableHeadCell>GST Rate</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">CGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">SGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">IGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Cess</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Total Tax</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="w-24">Action</AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {report.rows.map((row) => {
                    const isExpanded = expandedIds.has(row.invoiceId);
                    const sourceInv = loadInvoices().find((i) => i.id === row.invoiceId);
                    const primaryFix =
                      row.status === "exception" && sourceInv && row.exceptions[0]
                        ? resolveExceptionFixAction(row.exceptions[0].code, sourceInv)
                        : null;

                    return (
                      <Fragment key={row.invoiceId}>
                        <AccountsTableRow
                          className={cn(
                            "group",
                            row.status === "exception" && "bg-amber-50/30",
                          )}
                        >
                          <AccountsTableCell className="w-8 px-2">
                            {row.hasMultipleRates ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(row.invoiceId)}
                                className="p-1 hover:bg-muted rounded-md"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>
                            ) : null}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs">{row.invoiceDate}</AccountsTableCell>
                          <AccountsTableCell className="text-xs font-mono font-semibold text-brand-700">
                            {row.invoiceNo}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs font-medium">{row.customerName}</AccountsTableCell>
                          <AccountsTableCell className="text-xs font-mono">{row.gstin}</AccountsTableCell>
                          <AccountsTableCell className="text-xs">{row.placeOfSupply}</AccountsTableCell>
                          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(row.invoiceValue)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(row.taxableValue)}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs">{row.gstRateLabel}</AccountsTableCell>
                          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(row.cgst)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(row.sgst)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(row.igst)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(row.cess)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
                            {formatMoney(row.totalTax)}
                          </AccountsTableCell>
                          <AccountsTableCell>
                            <div className="space-y-0.5">
                              <InvoiceStatusBadge status={row.status} />
                              {row.status === "exception" && row.exceptions[0] && (
                                <p
                                  className="text-[10px] text-amber-700 leading-tight max-w-[140px]"
                                  title={row.exceptions.map((e) => e.message).join("; ")}
                                >
                                  {row.exceptions[0].message}
                                  {row.exceptions.length > 1 && ` +${row.exceptions.length - 1}`}
                                </p>
                              )}
                            </div>
                          </AccountsTableCell>
                          <AccountsTableCell>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewRow(row)}
                                className="text-xs text-brand-600 hover:underline font-medium"
                              >
                                View
                              </button>
                              {primaryFix && (
                                <Link
                                  href={primaryFix.href}
                                  className="text-xs text-muted-foreground hover:text-brand-600 inline-flex items-center gap-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" /> Fix
                                </Link>
                              )}
                            </div>
                          </AccountsTableCell>
                        </AccountsTableRow>
                        {isExpanded && row.hasMultipleRates && <RateBreakupRows row={row} />}
                      </Fragment>
                    );
                  })}
                </AccountsTableBody>
              </AccountsTable>
            </AccountsTableScroll>
          )}
        </AccountsListingTableCard>
      </AccountsReportBody>

      <B2bInvoiceDetailSheet
        row={viewRow}
        open={viewRow != null}
        onClose={() => setViewRow(null)}
      />
    </AccountsPageShell>
  );
}
