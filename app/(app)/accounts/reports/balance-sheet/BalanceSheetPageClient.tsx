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
  ReportFinancialYearFilter,
  ReportAsOnDateFilter,
  ReportBranchFilter,
  ReportFilterSummary,
  ReportLedgerFilter,
  ReportMoreFilters,
  ReportShowZeroBalanceToggle,
} from "@/components/accounts/ReportFilters";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  buildBalanceSheetSearchParams,
  canRequestBalanceSheet,
  clearedBalanceSheetDisplayFilters,
  defaultAsOnDate,
  isBalanceSheetDisplayFilterActive,
  resolveAsOnDate,
  type FyDateBounds,
} from "@/lib/accounts/balance-sheet-query";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY } from "@/lib/fy-store";
import { showToast } from "@/lib/toast";
import { BalanceSheetApiService } from "@/services/balance-sheet.service";
import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";
import { LedgerService } from "@/services/ledger.service";
import type {
  BalanceSheetFiltersConfig,
  BalanceSheetQueryParams,
  BalanceSheetReportResult,
  BalanceSheetReportType,
} from "@/types/balance-sheet.types";
import { toBalanceSheetScreen } from "./balance-sheet-api-display";
import { BalanceSheetHorizontalView } from "./BalanceSheetHorizontalView";
import { BalanceSheetReportSummary } from "./BalanceSheetReportSummary";
import "../trial-balance/trial-balance-compact.css";

const DISPLAY_FILTER_NOTE =
  "Detail rows are filtered. Balance Sheet totals continue to represent the full selected financial scope.";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function readReportType(value: string | null): BalanceSheetReportType {
  return value === "NORMAL" || value === "normal" ? "NORMAL" : "DETAILED";
}

export default function BalanceSheetPageClient() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFY } = useFY();

  const [reportType, setReportType] = useState<BalanceSheetReportType>("DETAILED");
  const [asOnDate, setAsOnDate] = useState("");
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [subGroupId, setSubGroupId] = useState("all");
  const [ledgerId, setLedgerId] = useState("all");
  const [showZero, setShowZero] = useState(false);
  const [groupOptions, setGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [subGroupOptions, setSubGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [ledgerOptions, setLedgerOptions] = useState<{ id: string; name: string }[]>([]);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BalanceSheetReportResult | null>(null);
  const [filtersConfig, setFiltersConfig] = useState<BalanceSheetFiltersConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [urlReady, setUrlReady] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!mounted || urlReady) return;
    setReportType(readReportType(searchParams.get("reportType")));
    const urlFy = searchParams.get("fy") ?? searchParams.get("fyId") ?? "";
    const urlBranch = searchParams.get("branch") ?? searchParams.get("warehouse") ?? "";
    if (urlFy && urlFy !== "all") setFinancialYearId(urlFy);
    if (urlBranch && urlBranch !== "all" && !urlBranch.includes(",")) setWarehouseId(urlBranch);
    const urlGroup = searchParams.get("groupId") ?? "";
    const urlSub = searchParams.get("subGroupId") ?? "";
    const urlLedger = searchParams.get("ledgerId") ?? "";
    if (urlGroup) setGroupId(urlGroup);
    if (urlSub) setSubGroupId(urlSub);
    if (urlLedger) setLedgerId(urlLedger);
    if (searchParams.get("showZero") === "true") setShowZero(true);
    setUrlReady(true);
  }, [mounted, searchParams, urlReady]);

  useEffect(() => {
    if (!mounted || !urlReady || bootstrapped.current) return;
    let cancelled = false;
    void BalanceSheetApiService.getFilters()
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
        if (!fyId || !fy) {
          setError("Select a financial year. Balance Sheet is not available for All years.");
          return;
        }
        const bounds = { start: fy.start_date, end: fy.end_date };
        const resolved = resolveAsOnDate({
          date: searchParams.get("asOnDate") ?? searchParams.get("asOn") ?? "",
          bounds,
          today: todayIso(),
        });
        setFinancialYearId(fyId);
        setAsOnDate(resolved.asOn);
        setShowZero(searchParams.get("showZero") === "true" || config.defaults.show_zero);
        setDatesReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        bootstrapped.current = true;
        if (selectedFY?.id && selectedFY.startDate && selectedFY.endDate) {
          const resolved = resolveAsOnDate({
            date: searchParams.get("asOnDate") ?? "",
            bounds: { start: selectedFY.startDate, end: selectedFY.endDate },
            today: todayIso(),
          });
          setFinancialYearId(selectedFY.id);
          setAsOnDate(resolved.asOn);
          setDatesReady(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load Balance Sheet filters.");
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

  const showZeroDefault = filtersConfig?.defaults.show_zero ?? false;
  const branchOptions = useMemo(
    () =>
      (filtersConfig?.branches ?? []).map((branch) => ({
        id: branch.warehouse_id,
        name: branch.warehouse_name,
      })),
    [filtersConfig],
  );

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void ChartOfAccountsService.getGroups({ signal: controller.signal })
      .then((rows) => setGroupOptions(rows.map((row) => ({ id: String(row.id), name: row.name }))))
      .catch(() => setGroupOptions([]));
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void ChartOfAccountsService.getSubGroups({
      accountGroupId: groupId !== "all" ? groupId : undefined,
      signal: controller.signal,
    })
      .then((rows) =>
        setSubGroupOptions(rows.map((row) => ({ id: String(row.id), name: row.name }))),
      )
      .catch(() => setSubGroupOptions([]));
    return () => controller.abort();
  }, [mounted, groupId]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void LedgerService.getDropdown(
      {
        accountGroupId: groupId !== "all" ? groupId : undefined,
        accountSubGroupId: subGroupId !== "all" ? subGroupId : undefined,
        status: "ACTIVE",
      },
      controller.signal,
    )
      .then((res) =>
        setLedgerOptions(
          res.ledgers.map((ledger) => ({
            id: ledger.ledgerId,
            name: `${ledger.ledgerCode} — ${ledger.ledgerName}`,
          })),
        ),
      )
      .catch(() => setLedgerOptions([]));
    return () => controller.abort();
  }, [mounted, groupId, subGroupId]);

  const queryParams = useMemo((): BalanceSheetQueryParams | null => {
    if (!datesReady) return null;
    if (!canRequestBalanceSheet({ financialYearId, asOnDate, bounds: fyBounds })) return null;
    return {
      report_type: reportType,
      financial_year_id: financialYearId,
      as_on_date: asOnDate,
      warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
      group_id: groupId !== "all" ? groupId : undefined,
      sub_group_id: subGroupId !== "all" ? subGroupId : undefined,
      ledger_id: ledgerId !== "all" ? ledgerId : undefined,
      show_zero: showZero,
    };
  }, [
    datesReady,
    financialYearId,
    asOnDate,
    warehouseId,
    reportType,
    groupId,
    subGroupId,
    ledgerId,
    showZero,
    fyBounds,
  ]);

  useEffect(() => {
    if (!mounted || !queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void BalanceSheetApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setReport(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load Balance Sheet.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [mounted, queryParams, refreshKey]);

  useEffect(() => {
    if (!datesReady || !canRequestBalanceSheet({ financialYearId, asOnDate, bounds: fyBounds })) {
      return;
    }
    const params = buildBalanceSheetSearchParams({
      financialYearId,
      asOnDate,
      reportType,
      warehouseId,
      groupId,
      subGroupId,
      ledgerId,
      showZero,
    });
    if (searchParams.toString() === params.toString()) return;
    router.replace(`/accounts/reports/balance-sheet?${params.toString()}`, { scroll: false });
  }, [
    datesReady,
    financialYearId,
    asOnDate,
    reportType,
    warehouseId,
    groupId,
    subGroupId,
    ledgerId,
    showZero,
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
      setFinancialYearId(fyId);
      if (!bounds) return;
      const next = resolveAsOnDate({ date: asOnDate, bounds, today: todayIso() });
      setAsOnDate(next.asOn);
    },
    [filtersConfig, selectedFY, asOnDate],
  );

  const clearDisplayFilters = useCallback(() => {
    const cleared = clearedBalanceSheetDisplayFilters(showZeroDefault);
    setGroupId(cleared.groupId);
    setSubGroupId(cleared.subGroupId);
    setLedgerId(cleared.ledgerId);
    setShowZero(cleared.showZero);
  }, [showZeroDefault]);

  const resetFilters = useCallback(() => {
    const fyId =
      selectedFY?.id ||
      filtersConfig?.defaults.financial_year_id ||
      filtersConfig?.financial_years.find((fy) => fy.is_current)?.financial_year_id ||
      financialYearId;
    const fy = filtersConfig?.financial_years.find((item) => item.financial_year_id === fyId);
    const bounds = fy
      ? { start: fy.start_date, end: fy.end_date }
      : selectedFY?.id === fyId
        ? { start: selectedFY.startDate, end: selectedFY.endDate }
        : null;
    setFinancialYearId(fyId);
    setAsOnDate(bounds ? defaultAsOnDate(bounds, todayIso()) : asOnDate);
    setWarehouseId("all");
    setReportType("DETAILED");
    clearDisplayFilters();
  }, [filtersConfig, selectedFY, financialYearId, asOnDate, clearDisplayFilters]);

  const handleExport = async (format: "EXCEL" | "PDF") => {
    if (!queryParams || exporting) return;
    setExporting(true);
    try {
      await BalanceSheetApiService.exportReport({ ...queryParams, format });
      showToast(format === "EXCEL" ? "Excel exported successfully." : "PDF exported successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to export Balance Sheet.");
    } finally {
      setExporting(false);
    }
  };

  const screen = useMemo(() => (report ? toBalanceSheetScreen(report) : null), [report]);
  const warnings = report?.warnings ?? [];
  const displayFiltered = isBalanceSheetDisplayFilterActive({
    groupId,
    subGroupId,
    ledgerId,
    showZero,
    showZeroDefault,
  });
  const moreFiltersActiveCount =
    (groupId !== "all" ? 1 : 0) +
    (subGroupId !== "all" ? 1 : 0) +
    (ledgerId !== "all" ? 1 : 0) +
    (showZero !== showZeroDefault ? 1 : 0);
  const scopeChanged =
    warehouseId !== "all" ||
    (selectedFy && asOnDate !== defaultAsOnDate(
      { start: selectedFy.start_date, end: selectedFy.end_date },
      todayIso(),
    ));
  const needsFinancialYear = !financialYearId || financialYearId === "all";
  const dateOutsideFy = Boolean(
    fyBounds && asOnDate && !canRequestBalanceSheet({ financialYearId, asOnDate, bounds: fyBounds }),
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const items: ReportFilterSummaryItem[] = [];
    if (groupId !== "all") {
      items.push({
        id: "group",
        label: "Group",
        value: groupOptions.find((item) => item.id === groupId)?.name ?? groupId,
        onRemove: () => {
          setGroupId("all");
          setSubGroupId("all");
          setLedgerId("all");
        },
      });
    }
    if (subGroupId !== "all") {
      items.push({
        id: "subgroup",
        label: "Sub-Group",
        value: subGroupOptions.find((item) => item.id === subGroupId)?.name ?? subGroupId,
        onRemove: () => {
          setSubGroupId("all");
          setLedgerId("all");
        },
      });
    }
    if (ledgerId !== "all") {
      items.push({
        id: "ledger",
        label: "Ledger",
        value: ledgerOptions.find((item) => item.id === ledgerId)?.name ?? ledgerId,
        onRemove: () => setLedgerId("all"),
      });
    }
    return items;
  }, [groupId, subGroupId, ledgerId, groupOptions, subGroupOptions, ledgerOptions]);

  const companyName = report?.scope.company_name ?? "";
  const financialYearLabel =
    report?.scope.financial_year_name ?? selectedFy?.name ?? selectedFY?.label ?? "";
  const branchLabel =
    report?.scope.warehouse_name ??
    (warehouseId === "all"
      ? "All Branches"
      : branchOptions.find((branch) => branch.id === warehouseId)?.name ?? warehouseId);
  const movementFrom = report?.scope.movement_from_date ?? fyBounds?.start ?? "";

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Balance Sheet")}
      title="Balance Sheet"
      description="Asset and liability statement as on the selected date."
      hideDescription
      layout="form"
      className="min-h-0"
      filters={
        <ReportFilterRow
          className="items-end gap-2"
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
          <ReportAsOnDateFilter
            value={asOnDate}
            onChange={setAsOnDate}
            min={fyBounds?.start}
            max={fyBounds?.end}
          />
          <ReportBranchFilter value={warehouseId} onChange={setWarehouseId} options={branchOptions} />
          <ReportMoreFilters activeCount={moreFiltersActiveCount}>
            <ReportLedgerFilter
              label="Group"
              value={groupId}
              onChange={(value) => {
                setGroupId(value || "all");
                setSubGroupId("all");
                setLedgerId("all");
              }}
              ledgers={groupOptions}
            />
            <ReportLedgerFilter
              label="Sub-Group"
              value={subGroupId}
              onChange={(value) => {
                setSubGroupId(value || "all");
                setLedgerId("all");
              }}
              ledgers={subGroupOptions}
            />
            <ReportLedgerFilter
              label="Ledger"
              value={ledgerId}
              onChange={(value) => setLedgerId(value || "all")}
              ledgers={ledgerOptions}
            />
            <ReportShowZeroBalanceToggle checked={showZero} onChange={setShowZero} />
          </ReportMoreFilters>
          {(scopeChanged || displayFiltered || reportType !== "DETAILED") && (
            <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </ReportFilterRow>
      }
    >
      <AccountsListingTableCard className="trial-balance-compact flex flex-col !overflow-visible !flex-none">
        <BalanceSheetReportSummary
          companyName={companyName}
          financialYearLabel={financialYearLabel}
          asOnDate={report?.scope.as_on_date || asOnDate}
          branchLabel={branchLabel}
        />
        {filterSummaryItems.length > 0 && <ReportFilterSummary items={filterSummaryItems} />}
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
                <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>
              ))}
            </ul>
          </div>
        )}
        {displayFiltered && report?.filters.filters_are_display_only && (
          <div className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <span>{DISPLAY_FILTER_NOTE}</span>
            <button type="button" className="shrink-0 font-medium text-brand-700 hover:underline" onClick={clearDisplayFilters}>
              Clear display filters
            </button>
          </div>
        )}
        {(!datesReady && !error) || (loading && !screen) ? (
          <div className="space-y-2 px-3 py-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : needsFinancialYear ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            Select a financial year. Balance Sheet is not available for All years.
          </div>
        ) : dateOutsideFy ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-red-700">
            As On Date must fall within the selected financial year.
          </div>
        ) : error && !screen ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            {error}
          </div>
        ) : !screen ? (
          <div className="accounts-table-empty py-4 text-center text-xs text-muted-foreground">
            Balance Sheet could not be loaded.
          </div>
        ) : (
          <BalanceSheetHorizontalView
            model={screen}
            drillDown={{
              financialYearId,
              fromDate: movementFrom,
              toDate: report?.scope.as_on_date || asOnDate,
              warehouseId: warehouseId !== "all" ? warehouseId : undefined,
            }}
          />
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
