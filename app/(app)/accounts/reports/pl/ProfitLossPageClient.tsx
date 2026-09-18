"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchFilter,
  ReportFilterSummary,
  ReportFromDateFilter,
  ReportToDateFilter,
} from "@/components/accounts/ReportFilters";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import {
  canRequestProfitLoss,
  defaultProfitLossRange,
  disabledProfitLossPresets,
  presetFitsFinancialYear,
  rangeInsideFy,
  resolveProfitLossDates,
  type FyDateBounds,
} from "@/lib/accounts/profit-loss-date-scope";
import { buildProfitLossSearchParams } from "@/lib/accounts/profit-loss-query";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY } from "@/lib/fy-store";
import { showToast } from "@/lib/toast";
import { ProfitLossApiService } from "@/services/profit-loss.service";
import type {
  ProfitLossFiltersConfig,
  ProfitLossQueryParams,
  ProfitLossReportResult,
  ProfitLossTab,
} from "@/types/profit-loss.types";
import { tabToReportType } from "@/types/profit-loss.types";
import { ProfitLossViewTabs, profitLossViewLabel } from "./ProfitLossViewTabs";
import { formatPlReportPeriod } from "./pl-display";
import { toProfitLossScreen } from "./profit-loss-api-display";
import { ProfitLossHorizontalView } from "./ProfitLossHorizontalView";
import "../trial-balance/trial-balance-compact.css";

const EMPTY_MESSAGE = "No Profit & Loss data found for the selected period.";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProfitLossPageClient() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFY } = useFY();

  const [activeTab, setActiveTab] = useState<ProfitLossTab>("normal");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ProfitLossReportResult | null>(null);
  const [filtersConfig, setFiltersConfig] = useState<ProfitLossFiltersConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [urlReady, setUrlReady] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!mounted || urlReady) return;
    const tab = searchParams.get("reportType");
    if (tab === "detailed" || tab === "DETAILED") setActiveTab("detailed");
    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId") ?? "";
    const urlBranch = searchParams.get("branch") ?? searchParams.get("warehouse") ?? "";
    if (urlFy && urlFy !== "all") setFinancialYearId(urlFy);
    if (urlBranch && urlBranch !== "all" && !urlBranch.includes(",")) setWarehouseId(urlBranch);
    setUrlReady(true);
  }, [mounted, searchParams, urlReady]);

  useEffect(() => {
    if (!mounted || !urlReady || bootstrapped.current) return;
    let cancelled = false;
    void ProfitLossApiService.getFilters()
      .then((config) => {
        if (cancelled) return;
        bootstrapped.current = true;
        setFiltersConfig(config);
        const urlFy = searchParams.get("fy") ?? searchParams.get("fyId") ?? "";
        const fyId =
          (urlFy && urlFy !== "all" ? urlFy : "") ||
          selectedFY?.id ||
          config.defaults.financial_year_id ||
          config.financial_years.find((fy) => fy.is_current)?.financial_year_id ||
          "";
        const fy = config.financial_years.find((item) => item.financial_year_id === fyId);
        const today = todayIso();
        if (!fyId || !fy) {
          setError("Select a financial year. Profit & Loss is not available for All years.");
          return;
        }
        const resolved = resolveProfitLossDates({
          from: searchParams.get("fromDate") ?? searchParams.get("from") ?? "",
          to: searchParams.get("toDate") ?? searchParams.get("to") ?? "",
          preset: "custom",
          bounds: { start: fy.start_date, end: fy.end_date },
          today,
        });
        setFinancialYearId(fyId);
        setDateFrom(resolved.from);
        setDateTo(resolved.to);
        setPreset(resolved.preset);
        setDatesReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        bootstrapped.current = true;
        if (selectedFY?.id && selectedFY.startDate && selectedFY.endDate) {
          const resolved = resolveProfitLossDates({
            from: searchParams.get("fromDate") ?? searchParams.get("from") ?? "",
            to: searchParams.get("toDate") ?? searchParams.get("to") ?? "",
            preset: "custom",
            bounds: { start: selectedFY.startDate, end: selectedFY.endDate },
            today: todayIso(),
          });
          setFinancialYearId(selectedFY.id);
          setDateFrom(resolved.from);
          setDateTo(resolved.to);
          setPreset(resolved.preset);
          setDatesReady(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load Profit & Loss filters.");
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, urlReady, selectedFY, searchParams]);

  const selectedFy = filtersConfig?.financial_years.find(
    (fy) => fy.financial_year_id === financialYearId,
  );
  const fyBounds = useMemo((): FyDateBounds | null => {
    if (selectedFy?.start_date && selectedFy.end_date) {
      return { start: selectedFy.start_date, end: selectedFy.end_date };
    }
    if (selectedFY?.id === financialYearId && selectedFY.startDate && selectedFY.endDate) {
      return { start: selectedFY.startDate, end: selectedFY.endDate };
    }
    return null;
  }, [selectedFy, selectedFY, financialYearId]);
  const fyMin = fyBounds?.start;
  const fyMax = fyBounds?.end;
  const disabledPresets = useMemo(
    () => (fyBounds ? disabledProfitLossPresets(fyBounds) : []),
    [fyBounds],
  );
  const showZeroDefault = filtersConfig?.defaults.show_zero ?? false;

  const branchOptions = useMemo(
    () =>
      (filtersConfig?.branches ?? []).map((branch) => ({
        id: branch.warehouse_id,
        name: branch.warehouse_name,
      })),
    [filtersConfig],
  );

  const queryParams = useMemo((): ProfitLossQueryParams | null => {
    if (!datesReady) return null;
    if (!canRequestProfitLoss({ financialYearId, from: dateFrom, to: dateTo, bounds: fyBounds })) {
      return null;
    }
    return {
      report_type: tabToReportType(activeTab),
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
      show_zero: showZeroDefault,
    };
  }, [
    datesReady,
    financialYearId,
    dateFrom,
    dateTo,
    warehouseId,
    showZeroDefault,
    activeTab,
    fyBounds,
  ]);

  useEffect(() => {
    if (!mounted || !queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setReport(null);
    void ProfitLossApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setReport(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load Profit & Loss.");
        setReport(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [mounted, queryParams, refreshKey]);

  useEffect(() => {
    if (!datesReady || !canRequestProfitLoss({ financialYearId, from: dateFrom, to: dateTo, bounds: fyBounds })) {
      return;
    }
    const params = buildProfitLossSearchParams({
      financialYearId,
      fromDate: dateFrom,
      toDate: dateTo,
      reportType: activeTab,
      warehouseId,
      groupId: "all",
      subGroupId: "all",
      ledgerId: "all",
      showZero: false,
    });
    const next = params.toString();
    if (searchParams.toString() === next) return;
    router.replace(`/accounts/reports/pl?${next}`, { scroll: false });
  }, [
    datesReady,
    financialYearId,
    dateFrom,
    dateTo,
    warehouseId,
    activeTab,
    fyBounds,
    router,
    searchParams,
  ]);

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      if (!fyId || fyId === "all") {
        setFinancialYearId(fyId);
        return;
      }
      const fy = filtersConfig?.financial_years.find((item) => item.financial_year_id === fyId);
      const bounds = fy
        ? { start: fy.start_date, end: fy.end_date }
        : selectedFY?.id === fyId
          ? { start: selectedFY.startDate, end: selectedFY.endDate }
          : null;
      if (!bounds) {
        setFinancialYearId(fyId);
        return;
      }
      const next = resolveProfitLossDates({
        from: dateFrom,
        to: dateTo,
        preset,
        bounds,
        today: todayIso(),
      });
      setFinancialYearId(fyId);
      setDateFrom(next.from);
      setDateTo(next.to);
      setPreset(next.preset);
    },
    [filtersConfig, selectedFY, dateFrom, dateTo, preset],
  );

  const handlePresetChange = useCallback(
    (value: DateRangePresetId) => {
      if (!fyBounds || (value !== "custom" && !presetFitsFinancialYear(value, fyBounds))) {
        setPreset("custom");
        return;
      }
      if (value === "custom") {
        setPreset("custom");
        return;
      }
      const { from, to } = resolveDateRangePreset(value);
      if (!rangeInsideFy(from, to, fyBounds)) {
        setPreset("custom");
        return;
      }
      setDateFrom(from);
      setDateTo(to);
      setPreset(value);
    },
    [fyBounds],
  );

  const resetFilters = useCallback(() => {
    const fyId =
      selectedFY?.id ||
      filtersConfig?.defaults.financial_year_id ||
      filtersConfig?.financial_years.find((fy) => fy.is_current)?.financial_year_id ||
      financialYearId;
    const fy = filtersConfig?.financial_years.find((item) => item.financial_year_id === fyId);
    const today = todayIso();
    const bounds = fy
      ? { start: fy.start_date, end: fy.end_date }
      : selectedFY?.id === fyId
        ? { start: selectedFY.startDate, end: selectedFY.endDate }
        : null;
    const range = bounds ? defaultProfitLossRange(bounds, today) : { from: dateFrom, to: dateTo };
    setPreset("custom");
    setActiveTab("normal");
    setFinancialYearId(fyId);
    setDateFrom(range.from);
    setDateTo(range.to);
    setWarehouseId("all");
  }, [filtersConfig, selectedFY, financialYearId, dateFrom, dateTo]);

  const handleExport = async (format: "EXCEL" | "PDF") => {
    if (!queryParams || exporting) return;
    setExporting(true);
    try {
      await ProfitLossApiService.exportReport({
        ...queryParams,
        report_type: tabToReportType(activeTab),
        format,
      });
      showToast(format === "EXCEL" ? "Excel exported successfully." : "PDF exported successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to export Profit & Loss.");
    } finally {
      setExporting(false);
    }
  };

  const screen = useMemo(() => (report ? toProfitLossScreen(report) : null), [report]);
  const warnings = report?.health.warnings ?? [];
  const totalsUnequal = Boolean(
    report && (!report.trading_account.is_balanced || !report.profit_and_loss_account.is_balanced),
  );

  const hasFilters = warehouseId !== "all" || activeTab !== "normal" || preset !== "custom";

  const scopeSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const fyName = selectedFy?.name || selectedFY?.label || financialYearId;
    const items: ReportFilterSummaryItem[] = [];
    if (fyName) items.push({ id: "fy", label: "Financial Year", value: fyName });
    if (dateFrom && dateTo) {
      items.push({ id: "period", label: "Period", value: formatPlReportPeriod(dateFrom, dateTo) });
    }
    items.push({
      id: "branch",
      label: "Branch",
      value:
        warehouseId === "all"
          ? "All branches"
          : branchOptions.find((branch) => branch.id === warehouseId)?.name ?? warehouseId,
    });
    return items;
  }, [selectedFy, selectedFY, financialYearId, dateFrom, dateTo, warehouseId, branchOptions]);

  const filterBar = (
    <ReportFilterRow
      end={
        <AccountsExportMenu
          onExcel={() => void handleExport("EXCEL")}
          onPdf={() => void handleExport("PDF")}
          disabled={exporting || loading || !queryParams}
        />
      }
    >
      <ReportFinancialYearFilter
        value={financialYearId || "all"}
        onChange={handleFinancialYearChange}
      />
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={handlePresetChange}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        inlineCustomDates={false}
        dateBounds={fyBounds ? { min: fyBounds.start, max: fyBounds.end } : undefined}
        disabledPresetIds={disabledPresets}
      />
      <ReportFromDateFilter value={dateFrom} onChange={setDateFrom} min={fyMin} max={dateTo || fyMax} />
      <ReportToDateFilter value={dateTo} onChange={setDateTo} min={dateFrom || fyMin} max={fyMax} />
      <ReportBranchFilter value={warehouseId} onChange={setWarehouseId} options={branchOptions} />
      {hasFilters && (
        <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </ReportFilterRow>
  );

  const needsFinancialYear = !financialYearId || financialYearId === "all";
  const dateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const datesOutsideFy = Boolean(fyBounds && dateFrom && dateTo && !rangeInsideFy(dateFrom, dateTo, fyBounds));
  const periodFrom = report?.scope.from_date || dateFrom;
  const periodTo = report?.scope.to_date || dateTo;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Profit & Loss")}
      title="Profit & Loss"
      description="Income and expense statement for the selected period."
      hideDescription
      layout="form"
      className="min-h-0"
      subHeader={<ProfitLossViewTabs value={activeTab} onChange={setActiveTab} />}
      filters={filterBar}
    >
      <AccountsListingTableCard className="trial-balance-compact flex flex-col !overflow-visible !flex-none">
        {datesReady && (
          <p className="flex-shrink-0 px-3 py-1 border-b border-border/60 text-left text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Period:</span>{" "}
            {formatPlReportPeriod(periodFrom, periodTo)}
            {report?.scope.warehouse_name ? ` · ${report.scope.warehouse_name}` : " · All branches"}
            {` · ${profitLossViewLabel(activeTab)}`}
          </p>
        )}
        {scopeSummaryItems.length > 0 && datesReady && (
          <ReportFilterSummary heading="Report scope" items={scopeSummaryItems} />
        )}
        {error && (
          <div className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>{error}</span>
            <button type="button" className="font-medium underline" onClick={() => setRefreshKey((n) => n + 1)}>
              Retry
            </button>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mx-3 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="mb-1 inline-flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Accounting notes
            </p>
            <ul className="list-disc space-y-0.5 pl-4">
              {warnings.map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
            </ul>
          </div>
        )}
        {report?.health.internal_transfer_excluded &&
          !warnings.some((warning) => warning.code === "INTERNAL_TRANSFER_EXCLUDED") && (
          <p className="px-3 pt-2 text-[11px] text-muted-foreground">
            Internal stock-transfer sales/costs are excluded from the consolidated P&L.
          </p>
        )}
        {totalsUnequal && (
          <p className="px-3 pt-2 text-[11px] text-red-700">
            Backend report totals are not balanced. The screen is showing the returned totals and has not adjusted them.
          </p>
        )}
        {(!datesReady && !error) || (loading && !screen) ? (
          <div className="space-y-2 px-3 py-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : needsFinancialYear ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            Select a financial year. Profit &amp; Loss is not available for All years.
          </div>
        ) : datesOutsideFy ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-red-700">
            Dates must fall within the selected financial year.
          </div>
        ) : dateInvalid ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-red-700">
            From date cannot be after To date.
          </div>
        ) : error && !screen ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            {error}
          </div>
        ) : !screen ? (
          <div className="accounts-table-empty py-4 text-center">
            {EMPTY_MESSAGE}
          </div>
        ) : (
          <ProfitLossHorizontalView
            model={screen}
            scope={{
              dateFrom: periodFrom,
              dateTo: periodTo,
              financialYearId,
              warehouseId: warehouseId !== "all" ? warehouseId : undefined,
            }}
          />
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
