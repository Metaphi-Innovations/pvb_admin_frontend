"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  IndianRupee,
  Receipt,
  ShieldOff,
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
  buildNilRatedExemptReport,
  buildNilRatedFilterQuery,
  getNilRatedBranchOptions,
  getNilRatedCustomerOptions,
  getNilRatedWarehouseOptions,
  parseNilRatedFiltersFromSearch,
  resolveNilRatedExceptionFixAction,
  type NilRatedExemptFilters,
  type NilRatedExemptRow,
  type NilStatusFilter,
  type NilSupplyTypeFilter,
} from "@/lib/accounts/gstr1-nil-rated-compute";
import { exportNilRatedExemptToExcel, exportNilRatedExemptToPdf } from "./gstr1-nil-rated-export";
import { NilRatedExemptDetailSheet } from "./components/NilRatedExemptDetailSheet";
import { useDebouncedValue } from "../../../pl/pl-hooks";

const PLACEHOLDER_DATE = "2025-04-01";

const SUPPLY_TYPE_OPTIONS: { value: NilSupplyTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "nil_rated", label: "Nil Rated" },
  { value: "exempt", label: "Exempt" },
  { value: "non_gst", label: "Non-GST" },
];

const STATUS_OPTIONS: { value: NilStatusFilter; label: string }[] = [
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

function RowStatusBadge({ status }: { status: "valid" | "exception" }) {
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

export default function NilRatedExemptPageClient() {
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
  const [supplyType, setSupplyType] = useState<NilSupplyTypeFilter>("all");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [status, setStatus] = useState<NilStatusFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [viewRow, setViewRow] = useState<NilRatedExemptRow | null>(null);
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
    const parsed = parseNilRatedFiltersFromSearch(qs, {
      financialYearId: fyId,
      dateFrom: from,
      dateTo: to,
      branch: [],
      warehouse: [],
      customerId: [],
      supplyType: "all",
      status: "all",
      invoiceNo: "",
    });
    setFinancialYearId(parsed.financialYearId);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setWarehouse(normalizeMultiFilter(parsed.warehouse));
    setCustomerId(normalizeMultiFilter(parsed.customerId));
    setSupplyType(parsed.supplyType);
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

  const filters = useMemo(
    (): NilRatedExemptFilters => ({
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      customerId,
      supplyType,
      invoiceNo: debouncedInvoiceNo,
      status,
    }),
    [
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      customerId,
      supplyType,
      debouncedInvoiceNo,
      status,
      refreshKey,
    ],
  );

  const branchOptions = useMemo(
    () => (mounted ? getNilRatedBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, filters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getNilRatedWarehouseOptions() : []),
    [mounted, filters],
  );
  const customerOptions = useMemo(
    () => (mounted ? getNilRatedCustomerOptions() : []),
    [mounted, filters],
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
          totalNilRatedValue: 0,
          totalExemptValue: 0,
          totalNonGstValue: 0,
          totalDocuments: 0,
          totalExceptions: 0,
        },
        hasData: false,
      };
    }
    return buildNilRatedExemptReport(filters);
  }, [mounted, datesReady, filters]);

  const backHref = `/accounts/reports/gst-summary/gstr1?${buildNilRatedFilterQuery({
    ...filters,
    customerId: [],
    supplyType: "all",
    status: "all",
    invoiceNo: "",
  })}`;

  const hasFilters =
    isMultiFilterActive(branch) ||
    isMultiFilterActive(warehouse) ||
    isMultiFilterActive(customerId) ||
    supplyType !== "all" ||
    status !== "all" ||
    invoiceNo.trim() !== "";

  const resetFilters = () => {
    setBranch([]);
    setWarehouse([]);
    setCustomerId([]);
    setSupplyType("all");
    setStatus("all");
    setInvoiceNo("");
  };

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
      supplyType: SUPPLY_TYPE_OPTIONS.find((o) => o.value === supplyType)?.label ?? supplyType,
      invoiceNo: debouncedInvoiceNo,
      status: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
    };
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    branch,
    warehouse,
    customerId,
    customerSelectOptions,
    supplyType,
    debouncedInvoiceNo,
    status,
  ]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportNilRatedExemptToExcel(report.rows, report.totals, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportNilRatedExemptToPdf(report.rows, report.totals, exportMeta);
  };

  const filterBar = (
    <>
      <ReportFilterRow className="items-end gap-2 flex-wrap">
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
        <ReportFilterField label="Supply Type" minWidthClass="min-w-[130px]">
          <Select
            value={supplyType}
            onValueChange={(v) => setSupplyType(v as NilSupplyTypeFilter)}
          >
            <SelectTrigger className={cn(filterControlClass, "mt-0 w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPLY_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ReportFilterField>
        <ReportFilterField label="Search" minWidthClass="min-w-[200px]">
          <Input
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="Invoice / product…"
            className={cn(filterControlClass, "mt-0 w-full")}
          />
        </ReportFilterField>
        <ReportFilterField label="Status" minWidthClass="min-w-[120px]">
          <Select value={status} onValueChange={(v) => setStatus(v as NilStatusFilter)}>
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
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "Nil Rated / Exempt")}
      title="Nil Rated / Exempt Supplies"
      description="Outward sales lines with Nil Rated, Exempt, or Non-GST tax treatment for GSTR-1."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link href={backHref}>
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </Button>
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={exporting || !report.hasData}
          />
        </div>
      }
      filters={filterBar}
    >
      <AccountsReportBody>
        <AccountsReportKpiGrid>
          <AccountsReportKpiCard
            label="Total Nil Rated Value"
            value={totals.totalNilRatedValue}
            icon={IndianRupee}
          />
          <AccountsReportKpiCard label="Total Exempt Value" value={totals.totalExemptValue} icon={ShieldOff} />
          <AccountsReportKpiCard label="Total Non-GST Value" value={totals.totalNonGstValue} icon={FileText} />
          <AccountsReportKpiCard label="Total Documents" value={totals.totalDocuments} icon={Receipt} isCount />
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
              Loading nil rated / exempt supplies…
            </div>
          ) : !report.hasData ? (
            <div className="accounts-table-empty py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No nil-rated, exempt, or non-GST supply lines match the selected filters.
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
              <AccountsTable minWidth={1600}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell>Invoice Date</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Invoice Number</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Customer Name</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Customer GSTIN</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Place of Supply</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Supply Type</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Product / Service</AccountsTableHeadCell>
                    <AccountsTableHeadCell>HSN / SAC</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Quantity</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Supply Value</AccountsTableHeadCell>
                    <AccountsTableHeadCell>GST Rate</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="w-24">Action</AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {report.rows.map((row) => {
                    const primaryFix =
                      row.status === "exception" && row.exceptions[0]
                        ? resolveNilRatedExceptionFixAction(row.exceptions[0].code, row)
                        : null;

                    return (
                      <AccountsTableRow
                        key={row.rowKey}
                        className={cn(
                          "group",
                          row.status === "exception" && "bg-amber-50/30",
                        )}
                      >
                        <AccountsTableCell className="text-xs whitespace-nowrap">
                          {row.invoiceDate}
                        </AccountsTableCell>
                        <AccountsTableCell className="font-mono text-xs font-semibold text-brand-700">
                          {row.invoiceNo}
                          {row.mixedInvoice && (
                            <span className="ml-1 text-[10px] font-sans font-medium text-muted-foreground">
                              (line)
                            </span>
                          )}
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs font-semibold">
                          {row.customerName}
                        </AccountsTableCell>
                        <AccountsTableCell className="font-mono text-xs">{row.gstin}</AccountsTableCell>
                        <AccountsTableCell className="text-xs">{row.placeOfSupply}</AccountsTableCell>
                        <AccountsTableCell className="text-xs">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium",
                              row.supplyType === "nil_rated" && "bg-navy-50 text-navy-700",
                              row.supplyType === "exempt" && "bg-slate-100 text-slate-700",
                              row.supplyType === "non_gst" && "bg-amber-50 text-amber-800",
                            )}
                          >
                            {row.supplyTypeLabel}
                          </span>
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs max-w-[160px] truncate" title={row.productName}>
                          {row.productName}
                        </AccountsTableCell>
                        <AccountsTableCell className="font-mono text-xs text-brand-700">
                          {row.hsn}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" className="text-xs">
                          {row.qty} {row.unit !== "—" ? row.unit : ""}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.supplyValue)}
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs">{row.gstRateLabel}</AccountsTableCell>
                        <AccountsTableCell>
                          <div className="flex flex-col gap-0.5">
                            <RowStatusBadge status={row.status} />
                            {row.status === "exception" && row.exceptions[0] && (
                              <span
                                className="text-[10px] text-amber-700 truncate max-w-[140px]"
                                title={row.exceptions.map((e) => e.message).join("; ")}
                              >
                                {row.exceptions[0].message}
                              </span>
                            )}
                          </div>
                        </AccountsTableCell>
                        <AccountsTableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => setViewRow(row)}
                            >
                              View
                            </Button>
                            {primaryFix && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] px-1.5 opacity-0 group-hover:opacity-100"
                                asChild
                              >
                                <Link href={primaryFix.href}>{primaryFix.label}</Link>
                              </Button>
                            )}
                          </div>
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

      <NilRatedExemptDetailSheet
        row={viewRow}
        open={viewRow != null}
        onClose={() => setViewRow(null)}
      />
    </AccountsPageShell>
  );
}
