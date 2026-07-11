"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Hash,
  IndianRupee,
  Layers,
  Package,
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
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
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
  buildHsnSummaryFilterQuery,
  buildHsnSummaryReport,
  getHsnCodeOptions,
  getHsnSummaryBranchOptions,
  getHsnSummaryWarehouseOptions,
  parseHsnSummaryFiltersFromSearch,
  resolveHsnExceptionFixAction,
  type HsnGstRateFilter,
  type HsnStatusFilter,
  type HsnSummaryFilters,
  type HsnSummaryRow,
} from "@/lib/accounts/gstr1-hsn-summary-compute";
import { exportHsnSummaryToExcel, exportHsnSummaryToPdf } from "./gstr1-hsn-summary-export";
import { HsnSummaryDetailSheet } from "./components/HsnSummaryDetailSheet";
import { useDebouncedValue } from "../../../pl/pl-hooks";

const PLACEHOLDER_DATE = "2025-04-01";

const GST_RATE_OPTIONS: { value: HsnGstRateFilter; label: string }[] = [
  { value: "all", label: "All rates" },
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const STATUS_OPTIONS: { value: HsnStatusFilter; label: string }[] = [
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

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  warning?: boolean;
  isCount?: boolean;
}

function SummaryCard({ label, value, icon: Icon, warning, isCount }: SummaryCardProps) {
  const display =
    typeof value === "number" ? (isCount ? String(value) : formatMoney(value)) : value;
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm min-w-0",
        warning && "border-amber-300 bg-amber-50/40",
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          warning ? "bg-amber-100" : "bg-muted",
        )}
      >
        <Icon className={cn("w-4 h-4", warning ? "text-amber-600" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-none">{display}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
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

export default function HsnSummaryPageClient() {
  const mounted = useClientMounted();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branch, setBranch] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState<string[]>([]);
  const [hsnCode, setHsnCode] = useState("");
  const [gstRate, setGstRate] = useState<HsnGstRateFilter>("all");
  const [status, setStatus] = useState<HsnStatusFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [viewRow, setViewRow] = useState<HsnSummaryRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedHsn = useDebouncedValue(hsnCode, 300);

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
    const parsed = parseHsnSummaryFiltersFromSearch(qs, {
      financialYearId: fyId,
      dateFrom: from,
      dateTo: to,
      branch: [],
      warehouse: [],
      hsnCode: "",
      gstRate: "all",
      status: "all",
    });
    setFinancialYearId(parsed.financialYearId);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setWarehouse(normalizeMultiFilter(parsed.warehouse));
    setHsnCode(parsed.hsnCode);
    setGstRate(parsed.gstRate);
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
    (): HsnSummaryFilters => ({
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      hsnCode: debouncedHsn,
      gstRate,
      status,
    }),
    [
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      debouncedHsn,
      gstRate,
      status,
      refreshKey,
    ],
  );

  const branchOptions = useMemo(
    () => (mounted ? getHsnSummaryBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, filters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getHsnSummaryWarehouseOptions() : []),
    [mounted, filters],
  );
  const hsnOptions = useMemo(() => (mounted ? getHsnCodeOptions() : []), [mounted, filters]);
  const warehouseOptionsForFilter = warehouseOptions.filter((w) => w !== "all");
  const moreFilterCount = countActiveMoreFilters({ warehouse });

  const report = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        rows: [],
        totals: {
          totalHsnCodes: 0,
          totalQuantity: 0,
          totalGrossValue: 0,
          totalSalesReturnValue: 0,
          totalNetTaxableValue: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalCess: 0,
          totalExceptions: 0,
        },
        hasData: false,
      };
    }
    return buildHsnSummaryReport(filters);
  }, [mounted, datesReady, filters]);

  const backHref = `/accounts/reports/gst?${buildHsnSummaryFilterQuery({
    ...filters,
    hsnCode: "",
    gstRate: "all",
    status: "all",
  })}`;

  const hasFilters =
    isMultiFilterActive(branch) ||
    isMultiFilterActive(warehouse) ||
    hsnCode.trim() !== "" ||
    gstRate !== "all" ||
    status !== "all";

  const resetFilters = () => {
    setBranch([]);
    setWarehouse([]);
    setHsnCode("");
    setGstRate("all");
    setStatus("all");
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
      hsnCode: debouncedHsn,
      gstRate: GST_RATE_OPTIONS.find((o) => o.value === gstRate)?.label ?? gstRate,
      status: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
    }),
    [financialYearId, dateFrom, dateTo, branch, warehouse, debouncedHsn, gstRate, status],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportHsnSummaryToExcel(report.rows, report.totals, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportHsnSummaryToPdf(report.rows, report.totals, exportMeta);
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
        <ReportMoreFilters activeCount={moreFilterCount}>
          <ReportWarehouseMultiFilter
            values={warehouse}
            onChange={setWarehouse}
            options={warehouseOptionsForFilter}
          />
        </ReportMoreFilters>
        <div className="space-y-0.5 min-w-[160px]">
        <Label className={filterLabelClass}>HSN / SAC</Label>
        <Input
          value={hsnCode}
          onChange={(e) => setHsnCode(e.target.value)}
          placeholder="Search HSN…"
          list="hsn-code-options"
          className={cn(filterControlClass, "mt-0 w-[160px]")}
        />
        <datalist id="hsn-code-options">
          {hsnOptions.map((o) => (
            <option key={o.code} value={o.code}>
              {o.description}
            </option>
          ))}
        </datalist>
      </div>
      <div className="space-y-0.5 min-w-[110px]">
        <Label className={filterLabelClass}>GST Rate</Label>
        <Select value={gstRate} onValueChange={(v) => setGstRate(v as HsnGstRateFilter)}>
          <SelectTrigger className={cn(filterControlClass, "mt-0 w-[110px]")}>
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
      </div>
      <div className="space-y-0.5 min-w-[120px]">
        <Label className={filterLabelClass}>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as HsnStatusFilter)}>
          <SelectTrigger className={cn(filterControlClass, "mt-0 w-[120px]")}>
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
      </div>
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
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "HSN-wise Summary")}
      title="HSN-wise Summary"
      description="GST sales grouped by HSN / SAC code with returns and tax breakup for GSTR-1."
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
      <div className="flex flex-col gap-4 min-h-0 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard label="Total HSN / SAC Codes" value={totals.totalHsnCodes} icon={Barcode} isCount />
          <SummaryCard label="Total Quantity" value={totals.totalQuantity} icon={Package} isCount />
          <SummaryCard label="Total Gross Value" value={totals.totalGrossValue} icon={IndianRupee} />
          <SummaryCard label="Total Sales Return Value" value={totals.totalSalesReturnValue} icon={Layers} />
          <SummaryCard label="Total Net Taxable Value" value={totals.totalNetTaxableValue} icon={IndianRupee} />
          <SummaryCard label="Total CGST" value={totals.totalCgst} icon={Scale} />
          <SummaryCard label="Total SGST" value={totals.totalSgst} icon={Scale} />
          <SummaryCard label="Total IGST" value={totals.totalIgst} icon={Scale} />
          <SummaryCard label="Total Cess" value={totals.totalCess} icon={Hash} />
          <SummaryCard
            label="Total Exceptions"
            value={totals.totalExceptions}
            icon={AlertTriangle}
            warning={totals.totalExceptions > 0}
            isCount
          />
        </div>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading HSN summary…
            </div>
          ) : !report.hasData ? (
            <div className="accounts-table-empty py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No HSN / SAC summary rows match the selected filters.
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
            <AccountsTableScroll>
              <AccountsTable minWidth={1900}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell>HSN / SAC</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Description</AccountsTableHeadCell>
                    <AccountsTableHeadCell>UQC / Unit</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Total Qty</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Gross Value</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Sales Return</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Net Taxable</AccountsTableHeadCell>
                    <AccountsTableHeadCell>GST Rate</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">CGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">SGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">IGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Cess</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Total Tax</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="w-28">Action</AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {report.rows.map((row) => {
                    const primaryFix =
                      row.status === "exception" && row.exceptions[0]
                        ? resolveHsnExceptionFixAction(row.exceptions[0].code, row)
                        : null;

                    return (
                      <AccountsTableRow
                        key={row.rowKey}
                        className={cn(
                          "group",
                          row.status === "exception" && "bg-amber-50/30",
                        )}
                      >
                        <AccountsTableCell className="font-mono text-xs font-semibold text-brand-700">
                          {row.hsnCode}
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs max-w-[160px] truncate" title={row.description}>
                          {row.description}
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs">{row.uqc}</AccountsTableCell>
                        <AccountsTableCell align="right" className="text-xs">
                          {row.totalQuantity}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.grossValue)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.salesReturnValue)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.netTaxableValue)}
                        </AccountsTableCell>
                        <AccountsTableCell className="text-xs">{row.gstRateLabel}</AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.cgst)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.sgst)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.igst)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.cess)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                          {formatMoney(row.totalTax)}
                        </AccountsTableCell>
                        <AccountsTableCell>
                          <div className="flex flex-col gap-0.5">
                            <RowStatusBadge status={row.status} />
                            {row.status === "exception" && row.exceptions[0] && (
                              <span
                                className="text-[10px] text-amber-700 truncate max-w-[120px]"
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
                              View Details
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
      </div>

      <HsnSummaryDetailSheet
        row={viewRow}
        open={viewRow != null}
        onClose={() => setViewRow(null)}
      />
    </AccountsPageShell>
  );
}
