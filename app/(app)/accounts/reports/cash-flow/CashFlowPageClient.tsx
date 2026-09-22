"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchFilter,
  ReportFilterSummary,
  ReportFromDateFilter,
  ReportToDateFilter,
  ReportLedgerFilter,
  ReportMoreFilters,
} from "@/components/accounts/ReportFilters";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import {
  canRequestCashFlow,
  defaultCashFlowRange,
  disabledCashFlowPresets,
  presetFitsFinancialYear,
  rangeInsideFy,
  resolveCashFlowDates,
  type FyDateBounds,
} from "@/lib/accounts/cash-flow-date-scope";
import { buildCashFlowSearchParams } from "@/lib/accounts/cash-flow-query";
import { formatCashFlowPeriodLabel, toCashFlowStatement } from "./cash-flow-api-display";
import { formatMoneyString } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY } from "@/lib/fy-store";
import { showToast } from "@/lib/toast";
import { CashFlowApiService } from "@/services/cash-flow.service";
import type {
  CashFlowActivityFilter,
  CashFlowFiltersConfig,
  CashFlowQueryParams,
  CashFlowReportResult,
} from "@/types/cash-flow.types";
import { CashFlowStatementView } from "./CashFlowStatementView";
import "../trial-balance/trial-balance-compact.css";

const filterLabelClass = "text-[11px] font-medium text-muted-foreground";
const filterSelectClass = "h-8 text-sm";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function readActivityType(value: string | null): CashFlowActivityFilter {
  const upper = (value ?? "").toUpperCase();
  if (
    upper === "OPERATING" ||
    upper === "INVESTING" ||
    upper === "FINANCING" ||
    upper === "ALL"
  ) {
    return upper;
  }
  return "ALL";
}

function isNonZeroAmount(amount: string | null | undefined): boolean {
  if (amount == null || amount === "") return false;
  const n = Number(amount);
  return Number.isFinite(n) && n !== 0;
}

export default function CashFlowPageClient() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFY } = useFY();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");
  const [activityType, setActivityType] = useState<CashFlowActivityFilter>("ALL");
  const [cashBankLedgerId, setCashBankLedgerId] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CashFlowReportResult | null>(null);
  const [filtersConfig, setFiltersConfig] = useState<CashFlowFiltersConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [urlReady, setUrlReady] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!mounted || urlReady) return;
    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId") ?? "";
    const urlBranch = searchParams.get("branch") ?? searchParams.get("warehouse") ?? "";
    if (urlFy && urlFy !== "all") setFinancialYearId(urlFy);
    if (urlBranch && urlBranch !== "all" && !urlBranch.includes(",")) {
      setWarehouseId(urlBranch);
    }
    setActivityType(readActivityType(searchParams.get("activityType")));
    const urlLedger =
      searchParams.get("cashBankLedgerId") ?? searchParams.get("ledgerId") ?? "";
    if (urlLedger && urlLedger !== "all") setCashBankLedgerId(urlLedger);
    setUrlReady(true);
  }, [mounted, searchParams, urlReady]);

  useEffect(() => {
    if (!mounted || !urlReady || bootstrapped.current) return;
    let cancelled = false;
    void CashFlowApiService.getFilters()
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
          setError("Select a financial year. Cash Flow is not available for All years.");
          return;
        }
        const resolved = resolveCashFlowDates({
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
        if (!searchParams.get("activityType") && config.defaults.activity_type) {
          setActivityType(config.defaults.activity_type);
        }
        setDatesReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        bootstrapped.current = true;
        if (selectedFY?.id && selectedFY.startDate && selectedFY.endDate) {
          const resolved = resolveCashFlowDates({
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
        setError(err instanceof Error ? err.message : "Unable to load Cash Flow filters.");
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
    () => (fyBounds ? disabledCashFlowPresets(fyBounds) : []),
    [fyBounds],
  );

  const branchOptions = useMemo(
    () =>
      (filtersConfig?.branches ?? []).map((branch) => ({
        id: branch.warehouse_id,
        name: branch.warehouse_name,
      })),
    [filtersConfig],
  );

  const cashBankLedgerOptions = useMemo(
    () =>
      (filtersConfig?.cash_bank_ledgers ?? []).map((ledger) => ({
        id: ledger.ledger_id,
        name: `${ledger.ledger_code} — ${ledger.ledger_name}`,
        group: ledger.kind === "CASH" ? "Cash" : "Bank",
      })),
    [filtersConfig],
  );

  const activityOptions = filtersConfig?.activity_types ?? [];

  const queryParams = useMemo((): CashFlowQueryParams | null => {
    if (!datesReady) return null;
    if (!canRequestCashFlow({ financialYearId, from: dateFrom, to: dateTo, bounds: fyBounds })) {
      return null;
    }
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
      activity_type: activityType,
      cash_bank_ledger_id: cashBankLedgerId !== "all" ? cashBankLedgerId : undefined,
    };
  }, [
    datesReady,
    financialYearId,
    dateFrom,
    dateTo,
    warehouseId,
    activityType,
    cashBankLedgerId,
    fyBounds,
  ]);

  useEffect(() => {
    if (!mounted || !queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setReport(null);
    void CashFlowApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setReport(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load Cash Flow.");
        setReport(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [mounted, queryParams, refreshKey]);

  useEffect(() => {
    if (
      !datesReady ||
      !canRequestCashFlow({ financialYearId, from: dateFrom, to: dateTo, bounds: fyBounds })
    ) {
      return;
    }
    const params = buildCashFlowSearchParams({
      financialYearId,
      fromDate: dateFrom,
      toDate: dateTo,
      warehouseId,
      activityType,
      cashBankLedgerId,
    });
    const next = params.toString();
    if (searchParams.toString() === next) return;
    router.replace(`/accounts/reports/cash-flow?${next}`, { scroll: false });
  }, [
    datesReady,
    financialYearId,
    dateFrom,
    dateTo,
    warehouseId,
    activityType,
    cashBankLedgerId,
    fyBounds,
    router,
    searchParams,
  ]);

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      if (!fyId || fyId === "all") {
        setFinancialYearId(fyId);
        setReport(null);
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
      const next = resolveCashFlowDates({
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
    const range = bounds ? defaultCashFlowRange(bounds, today) : { from: dateFrom, to: dateTo };
    setPreset("custom");
    setFinancialYearId(fyId);
    setDateFrom(range.from);
    setDateTo(range.to);
    setWarehouseId("all");
    setActivityType(filtersConfig?.defaults.activity_type ?? "ALL");
    setCashBankLedgerId("all");
  }, [filtersConfig, selectedFY, financialYearId, dateFrom, dateTo]);

  const handleExport = async (format: "EXCEL" | "PDF") => {
    if (!queryParams || exporting) return;
    setExporting(true);
    try {
      await CashFlowApiService.exportReport({ ...queryParams, format });
      showToast(
        format === "EXCEL" ? "Excel exported successfully." : "PDF exported successfully.",
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to export Cash Flow.");
    } finally {
      setExporting(false);
    }
  };

  const statement = useMemo(
    () =>
      report
        ? toCashFlowStatement(report, {
            financialYearId,
            fromDate: report.scope.from_date,
            toDate: report.scope.to_date,
            warehouseId: warehouseId !== "all" ? warehouseId : undefined,
          })
        : null,
    [report, financialYearId, warehouseId],
  );

  const warnings = report?.health.warnings ?? [];
  const listedWarnings = warnings.filter(
    (warning) =>
      warning.code !== "UNCLASSIFIED_CASH_FLOW" &&
      warning.code !== "CASH_FLOW_RECONCILIATION_DIFFERENCE",
  );
  const moreFilterCount =
    (activityType !== "ALL" ? 1 : 0) + (cashBankLedgerId !== "all" ? 1 : 0);
  const hasFilters =
    warehouseId !== "all" ||
    activityType !== "ALL" ||
    cashBankLedgerId !== "all" ||
    preset !== "custom";

  const needsFinancialYear = !financialYearId || financialYearId === "all";
  const dateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const datesOutsideFy = Boolean(
    fyBounds && dateFrom && dateTo && !rangeInsideFy(dateFrom, dateTo, fyBounds),
  );
  const periodFrom = report?.scope.from_date || dateFrom;
  const periodTo = report?.scope.to_date || dateTo;

  const scopeSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const fyName = selectedFy?.name || selectedFY?.label || financialYearId;
    const items: ReportFilterSummaryItem[] = [];
    if (fyName) items.push({ id: "fy", label: "Financial Year", value: fyName });
    if (dateFrom && dateTo) {
      items.push({
        id: "period",
        label: "Period",
        value: formatCashFlowPeriodLabel(dateFrom, dateTo),
      });
    }
    items.push({
      id: "branch",
      label: "Branch",
      value:
        warehouseId === "all"
          ? "All branches"
          : branchOptions.find((branch) => branch.id === warehouseId)?.name ?? warehouseId,
    });
    if (activityType !== "ALL") {
      items.push({
        id: "activity",
        label: "Activity",
        value: activityOptions.find((opt) => opt.value === activityType)?.label ?? activityType,
        onRemove: () => setActivityType("ALL"),
      });
    }
    if (cashBankLedgerId !== "all") {
      items.push({
        id: "cashBank",
        label: "Cash/Bank Ledger",
        value:
          cashBankLedgerOptions.find((opt) => String(opt.id) === cashBankLedgerId)?.name ??
          cashBankLedgerId,
        onRemove: () => setCashBankLedgerId("all"),
      });
    }
    return items;
  }, [
    selectedFy,
    selectedFY,
    financialYearId,
    dateFrom,
    dateTo,
    warehouseId,
    branchOptions,
    activityType,
    activityOptions,
    cashBankLedgerId,
    cashBankLedgerOptions,
  ]);

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
      <ReportFromDateFilter
        value={dateFrom}
        onChange={setDateFrom}
        min={fyMin}
        max={dateTo || fyMax}
      />
      <ReportToDateFilter
        value={dateTo}
        onChange={setDateTo}
        min={dateFrom || fyMin}
        max={fyMax}
      />
      <ReportBranchFilter value={warehouseId} onChange={setWarehouseId} options={branchOptions} />
      <ReportMoreFilters activeCount={moreFilterCount}>
        <div className="space-y-0.5 min-w-[160px]">
          <span className={filterLabelClass}>Activity Type</span>
          <Select
            value={activityType}
            onValueChange={(value) => setActivityType(readActivityType(value))}
          >
            <SelectTrigger className={`${filterSelectClass} mt-0 w-[180px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ReportLedgerFilter
          value={cashBankLedgerId === "all" ? "" : cashBankLedgerId}
          onChange={(value) => setCashBankLedgerId(value || "all")}
          ledgers={cashBankLedgerOptions}
          label="Cash / Bank Ledger"
        />
      </ReportMoreFilters>
      {hasFilters && (
        <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </ReportFilterRow>
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Cash Flow")}
      title="Cash Flow"
      description="Cash flow statement for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0 trial-balance-compact"
      filters={
        <>
          {filterBar}
          {scopeSummaryItems.length > 0 && datesReady ? (
            <ReportFilterSummary heading="Report scope" items={scopeSummaryItems} className="mt-1" />
          ) : null}
        </>
      }
    >
      <AccountsListingTableCard className="flex flex-col flex-1 min-h-0">
        {datesReady && (
          <p className="flex-shrink-0 px-3 py-1 border-b border-border/60 text-left text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Period:</span>{" "}
            {formatCashFlowPeriodLabel(periodFrom, periodTo)}
            {report?.scope.warehouse_name
              ? ` · ${report.scope.warehouse_name}`
              : " · All branches"}
            {" · Direct Method"}
          </p>
        )}

        {error && (
          <div className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>{error}</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => setRefreshKey((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {report && !report.summary.is_reconciled && (
          <div className="mx-3 mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <p className="inline-flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Cash Flow does not reconcile with accounting Cash &amp; Bank closing balance.
            </p>
            <p className="mt-1">
              Calculated closing: {formatMoneyString(report.summary.calculated_closing_cash_bank)}
              {" · "}
              Actual closing: {formatMoneyString(report.summary.actual_closing_cash_bank)}
              {" · "}
              Difference: {formatMoneyString(report.summary.reconciliation_difference)}
            </p>
          </div>
        )}

        {report &&
          (report.health.unclassified_count > 0 ||
            isNonZeroAmount(report.health.unclassified_amount)) && (
            <div className="mx-3 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="inline-flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Some Cash/Bank movements could not be classified into Operating, Investing or
                Financing activities.
              </p>
              <p className="mt-1">
                Unclassified count: {report.health.unclassified_count}
                {" · "}
                Unclassified amount: {formatMoneyString(report.health.unclassified_amount)}
              </p>
            </div>
          )}

        {listedWarnings.length > 0 && (
          <div className="mx-3 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="mb-1 inline-flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Accounting notes
            </p>
            <ul className="list-disc space-y-0.5 pl-4">
              {listedWarnings.map((warning) => (
                <li key={`${warning.code}-${warning.message.slice(0, 24)}`}>
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report && isNonZeroAmount(report.health.excluded_internal_transfer_amount) && (
          <p className="px-3 pt-2 text-[11px] text-muted-foreground">
            Internal Cash/Bank transfers totaling{" "}
            {formatMoneyString(report.health.excluded_internal_transfer_amount)} are excluded from
            consolidated Cash Flow.
          </p>
        )}

        {(!datesReady && !error) || (loading && !statement) ? (
          <div className="space-y-2 px-3 py-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : needsFinancialYear ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            Select a financial year. Cash Flow is not available for All years.
          </div>
        ) : datesOutsideFy ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-red-700">
            Dates must fall within the selected financial year.
          </div>
        ) : dateInvalid ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-red-700">
            From date cannot be after To date.
          </div>
        ) : error && !statement ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            {error}
          </div>
        ) : !statement ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            Unable to load Cash Flow for the selected period.
          </div>
        ) : (
          <CashFlowStatementView statement={statement} />
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
