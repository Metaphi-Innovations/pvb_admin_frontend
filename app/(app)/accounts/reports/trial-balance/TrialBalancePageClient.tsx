"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchFilter,
  ReportLedgerFilter,
  ReportShowZeroBalanceToggle,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportFromDateFilter,
  ReportToDateFilter,
} from "@/components/accounts/ReportFilters";
import {
  countActiveMoreFilters,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  AccountsTableListing,
} from "@/components/accounts/AccountsTableListing";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  formatMoneyString,
  formatMoneyStringOrDash,
} from "@/lib/accounts/money-format";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY } from "@/lib/fy-store";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AccountsCoaHierarchyRowLabel } from "@/lib/accounts/accounts-coa-hierarchy-ui";
import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";
import { LedgerService } from "@/services/ledger.service";
import { TrialBalanceApiService } from "@/services/trial-balance.service";
import type {
  TrialBalanceBalanceType,
  TrialBalanceFiltersConfig,
  TrialBalanceHierarchyNode,
  TrialBalanceQueryParams,
  TrialBalanceReportResult,
  TrialBalanceTab,
} from "@/types/trial-balance.types";
import { tabToReportType } from "@/types/trial-balance.types";
import { TrialBalanceViewTabs } from "./TrialBalanceViewTabs";
import {
  collectPrimaryHeadIds,
  flattenDetailedHierarchy,
  isHierarchyData,
  toNormalPrimaryHeadRows,
  TB_DETAILED_INDENT,
  TB_NORMAL_INDENT,
} from "./trial-balance-api-display";
import "./trial-balance-compact.css";

const BALANCE_TYPE_OPTIONS: { value: TrialBalanceBalanceType; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DEBIT", label: "Debit" },
  { value: "CREDIT", label: "Credit" },
];

function DebitCreditCells({
  debit,
  credit,
  bold,
}: {
  debit: string;
  credit: string;
  bold?: boolean;
}) {
  const cellClass = bold ? "font-semibold" : undefined;
  return (
    <>
      <AccountsTableCell align="right" money className={cellClass}>
        {formatMoneyStringOrDash(debit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cellClass}>
        {formatMoneyStringOrDash(credit)}
      </AccountsTableCell>
    </>
  );
}

function BalanceStatusBanner({
  health,
  visible,
}: {
  health: TrialBalanceReportResult["trial_balance_health"] | null;
  visible: boolean;
}) {
  if (!visible || !health) return null;
  if (health.is_balanced) {
    return (
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        Trial Balance is balanced
      </div>
    );
  }

  const openingUnbalanced = !health.opening.is_balanced;
  const periodBalanced = health.period.is_balanced;

  return (
    <div className="flex-shrink-0 flex flex-col gap-1 px-3 py-1.5 bg-red-50 border-t border-red-100 text-xs text-red-700">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        Trial Balance is not balanced (total Debits ≠ total Credits)
      </span>
      <span className="flex flex-wrap gap-x-3 gap-y-1">
        <span>Opening Difference: {formatMoneyString(health.opening.difference)}</span>
        <span>Period Difference: {formatMoneyString(health.period.difference)}</span>
        <span>Closing Difference: {formatMoneyString(health.closing.difference)}</span>
      </span>
      {openingUnbalanced && periodBalanced && (
        <span className="text-red-600/90">
          Opening balances are unbalanced by {formatMoneyString(health.opening.difference)}.
          Period transactions are balanced.
        </span>
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <p className="text-sm font-medium text-foreground">
        No accounting entries found for the selected period.
      </p>
      <p className="text-xs text-muted-foreground">
        Adjust Financial Year, date range, branch, or More Filters and try again.
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-brand-600 hover:underline mt-1"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

export default function TrialBalancePageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();

  const [activeTab, setActiveTab] = useState<TrialBalanceTab>("normal");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("");

  const [warehouseId, setWarehouseId] = useState("all");
  const [primaryHeadId, setPrimaryHeadId] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [subGroupId, setSubGroupId] = useState("all");
  const [ledgerId, setLedgerId] = useState("all");
  const [balanceType, setBalanceType] = useState<TrialBalanceBalanceType>("ALL");
  const [showZeroBalance, setShowZeroBalance] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TrialBalanceReportResult | null>(null);
  const [filtersConfig, setFiltersConfig] = useState<TrialBalanceFiltersConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedPrimaryIds, setExpandedPrimaryIds] = useState<Set<string>>(new Set());
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [expandedSubgroupIds, setExpandedSubgroupIds] = useState<Set<string>>(new Set());

  const [primaryHeadOptions, setPrimaryHeadOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [groupOptions, setGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [subGroupOptions, setSubGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [ledgerOptions, setLedgerOptions] = useState<{ id: string; name: string }[]>([]);

  // Bootstrap FY + date range from global FY / filters config
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    async function init() {
      try {
        const config = await TrialBalanceApiService.getFilters();
        if (cancelled) return;
        setFiltersConfig(config);

        const fyId =
          selectedFY?.id ||
          config.defaults.financial_year_id ||
          config.financial_years.find((f) => f.is_current)?.financial_year_id ||
          config.financial_years[0]?.financial_year_id ||
          "";

        const fy =
          config.financial_years.find((f) => f.financial_year_id === fyId) ||
          null;
        const today = new Date().toISOString().slice(0, 10);
        const from = fy?.start_date || config.defaults.from_date || today;
        const toEnd = fy?.end_date || config.defaults.to_date || today;
        const to = today < toEnd ? today : toEnd;

        setFinancialYearId(fyId);
        setDateFrom(from);
        setDateTo(to);
        setShowZeroBalance(config.defaults.include_zero_balance ?? false);
        setBalanceType(config.defaults.balance_type ?? "ALL");
        setDatesReady(Boolean(fyId));
      } catch (err) {
        if (cancelled) return;
        // Fallback to global FY context
        if (selectedFY?.id) {
          setFinancialYearId(selectedFY.id);
          setDateFrom(selectedFY.startDate);
          const today = new Date().toISOString().slice(0, 10);
          setDateTo(today < selectedFY.endDate ? today : selectedFY.endDate);
          setDatesReady(true);
        }
        console.warn("Trial Balance filters config failed:", err);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [mounted, selectedFY?.id, selectedFY?.startDate, selectedFY?.endDate]);

  // Cascading COA options
  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void ChartOfAccountsService.getPrimaryHeads({ signal: controller.signal })
      .then((rows) =>
        setPrimaryHeadOptions(rows.map((r) => ({ id: r.id, name: r.name })))
      )
      .catch(() => setPrimaryHeadOptions([]));
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void ChartOfAccountsService.getGroups({
      primaryHeadId: primaryHeadId !== "all" ? primaryHeadId : undefined,
      signal: controller.signal,
    })
      .then((rows) =>
        setGroupOptions(rows.map((r) => ({ id: r.id, name: r.name })))
      )
      .catch(() => setGroupOptions([]));
    return () => controller.abort();
  }, [mounted, primaryHeadId]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void ChartOfAccountsService.getSubGroups({
      primaryHeadId: primaryHeadId !== "all" ? primaryHeadId : undefined,
      accountGroupId: groupId !== "all" ? groupId : undefined,
      signal: controller.signal,
    })
      .then((rows) =>
        setSubGroupOptions(rows.map((r) => ({ id: r.id, name: r.name })))
      )
      .catch(() => setSubGroupOptions([]));
    return () => controller.abort();
  }, [mounted, primaryHeadId, groupId]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void LedgerService.getDropdown(
      {
        primaryHeadId: primaryHeadId !== "all" ? primaryHeadId : undefined,
        accountGroupId: groupId !== "all" ? groupId : undefined,
        accountSubGroupId: subGroupId !== "all" ? subGroupId : undefined,
        status: "ACTIVE",
      },
      controller.signal
    )
      .then((res) =>
        setLedgerOptions(
          res.ledgers.map((l) => ({
            id: l.ledgerId,
            name: `${l.ledgerCode} — ${l.ledgerName}`,
          }))
        )
      )
      .catch(() => setLedgerOptions([]));
    return () => controller.abort();
  }, [mounted, primaryHeadId, groupId, subGroupId]);

  const branchOptions = useMemo(
    () =>
      (filtersConfig?.branches ?? []).map((b) => ({
        id: b.warehouse_id,
        name: b.warehouse_name,
      })),
    [filtersConfig]
  );

  const queryParams = useMemo((): TrialBalanceQueryParams | null => {
    if (!datesReady || !financialYearId || financialYearId === "all") return null;
    if (!dateFrom || !dateTo) return null;
    if (dateFrom > dateTo) return null;

    return {
      // Listing always uses DETAILED so Normal can show Primary Head roll-ups
      // from backend hierarchy (Assets / Liabilities / Income / Expenses).
      report_type: "DETAILED",
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
      primary_head_id: primaryHeadId !== "all" ? primaryHeadId : undefined,
      group_id: groupId !== "all" ? groupId : undefined,
      sub_group_id: subGroupId !== "all" ? subGroupId : undefined,
      ledger_id: ledgerId !== "all" ? ledgerId : undefined,
      balance_type: balanceType,
      include_zero_balance: showZeroBalance,
    };
  }, [
    datesReady,
    financialYearId,
    dateFrom,
    dateTo,
    warehouseId,
    primaryHeadId,
    groupId,
    subGroupId,
    ledgerId,
    balanceType,
    showZeroBalance,
  ]);

  // Fetch report — AbortController prevents stale overwrites
  useEffect(() => {
    if (!mounted || !queryParams) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void TrialBalanceApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        setReport(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Unable to load Trial Balance.";
        setError(message);
        setReport(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [mounted, queryParams, refreshKey]);

  const detailedNodes: TrialBalanceHierarchyNode[] = useMemo(() => {
    if (!report) return [];
    return isHierarchyData(report.data) ? report.data : [];
  }, [report]);

  /** Normal Report: one row per Primary Head (Assets, Liabilities, Income, Expenses). */
  const normalPrimaryHeadRows = useMemo(
    () => toNormalPrimaryHeadRows(detailedNodes),
    [detailedNodes]
  );

  const detailedExpandInitializedRef = React.useRef(false);

  useEffect(() => {
    if (activeTab !== "detailed") {
      detailedExpandInitializedRef.current = false;
      return;
    }
    if (detailedNodes.length === 0) return;
    if (detailedExpandInitializedRef.current) return;
    setExpandedPrimaryIds(collectPrimaryHeadIds(detailedNodes));
    setExpandedGroupIds(new Set());
    setExpandedSubgroupIds(new Set());
    detailedExpandInitializedRef.current = true;
  }, [activeTab, detailedNodes]);

  // Reset expansion when major filters change
  useEffect(() => {
    detailedExpandInitializedRef.current = false;
    setExpandedPrimaryIds(new Set());
    setExpandedGroupIds(new Set());
    setExpandedSubgroupIds(new Set());
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    warehouseId,
    primaryHeadId,
    groupId,
    subGroupId,
    ledgerId,
    balanceType,
    showZeroBalance,
  ]);

  const detailedFlatRows = useMemo(
    () =>
      activeTab === "detailed"
        ? flattenDetailedHierarchy(
            detailedNodes,
            expandedPrimaryIds,
            expandedGroupIds,
            expandedSubgroupIds
          )
        : [],
    [
      activeTab,
      detailedNodes,
      expandedPrimaryIds,
      expandedGroupIds,
      expandedSubgroupIds,
    ]
  );

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      setFinancialYearId(fyId);
      const fy = filtersConfig?.financial_years.find(
        (f) => f.financial_year_id === fyId
      );
      if (fy) {
        const today = new Date().toISOString().slice(0, 10);
        setDateFrom(fy.start_date);
        setDateTo(today < fy.end_date ? today : fy.end_date);
        setPreset("custom");
      }
    },
    [filtersConfig]
  );

  const handlePresetChange = useCallback((value: DateRangePresetId) => {
    setPreset(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const handlePrimaryHeadChange = useCallback((value: string) => {
    setPrimaryHeadId(value);
    setGroupId("all");
    setSubGroupId("all");
    setLedgerId("all");
  }, []);

  const handleGroupChange = useCallback((value: string) => {
    setGroupId(value);
    setSubGroupId("all");
    setLedgerId("all");
  }, []);

  const handleSubGroupChange = useCallback((value: string) => {
    setSubGroupId(value);
    setLedgerId("all");
  }, []);

  const resetFilters = useCallback(() => {
    const fyId =
      selectedFY?.id ||
      filtersConfig?.defaults.financial_year_id ||
      filtersConfig?.financial_years.find((f) => f.is_current)?.financial_year_id ||
      financialYearId;
    const fy = filtersConfig?.financial_years.find(
      (f) => f.financial_year_id === fyId
    );
    const today = new Date().toISOString().slice(0, 10);
    setPreset("custom");
    setFinancialYearId(fyId || "");
    if (fy) {
      setDateFrom(fy.start_date);
      setDateTo(today < fy.end_date ? today : fy.end_date);
    } else if (selectedFY) {
      setDateFrom(selectedFY.startDate);
      setDateTo(today < selectedFY.endDate ? today : selectedFY.endDate);
    }
    setWarehouseId("all");
    setPrimaryHeadId("all");
    setGroupId("all");
    setSubGroupId("all");
    setLedgerId("all");
    setBalanceType("ALL");
    setShowZeroBalance(false);
  }, [filtersConfig, selectedFY, financialYearId]);

  const hasFilters =
    warehouseId !== "all" ||
    primaryHeadId !== "all" ||
    groupId !== "all" ||
    subGroupId !== "all" ||
    ledgerId !== "all" ||
    balanceType !== "ALL" ||
    showZeroBalance;

  const moreFiltersActiveCount = countActiveMoreFilters({
    primaryHeadId: primaryHeadId !== "all" ? [primaryHeadId] : [],
    groupId: groupId !== "all" ? [groupId] : [],
    subGroupId: subGroupId !== "all" ? [subGroupId] : [],
    ledgerId: ledgerId !== "all" ? [ledgerId] : [],
    balanceType: balanceType !== "ALL" ? [balanceType] : [],
    showZeroBalance,
  });

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const items: Array<ReportFilterSummaryItem | null> = [
      warehouseId !== "all"
        ? {
            id: "branch",
            label: "Branch",
            value:
              branchOptions.find((b) => b.id === warehouseId)?.name ?? warehouseId,
            onRemove: () => setWarehouseId("all"),
          }
        : null,
      primaryHeadId !== "all"
        ? {
            id: "primaryHead",
            label: "Primary Head",
            value:
              primaryHeadOptions.find((o) => o.id === primaryHeadId)?.name ??
              primaryHeadId,
            onRemove: () => handlePrimaryHeadChange("all"),
          }
        : null,
      groupId !== "all"
        ? {
            id: "group",
            label: "Group",
            value: groupOptions.find((o) => o.id === groupId)?.name ?? groupId,
            onRemove: () => handleGroupChange("all"),
          }
        : null,
      subGroupId !== "all"
        ? {
            id: "subGroup",
            label: "Sub-Group",
            value:
              subGroupOptions.find((o) => o.id === subGroupId)?.name ?? subGroupId,
            onRemove: () => handleSubGroupChange("all"),
          }
        : null,
      ledgerId !== "all"
        ? {
            id: "ledger",
            label: "Ledger",
            value: ledgerOptions.find((o) => o.id === ledgerId)?.name ?? ledgerId,
            onRemove: () => setLedgerId("all"),
          }
        : null,
      balanceType !== "ALL"
        ? {
            id: "balanceType",
            label: "Balance Type",
            value: balanceType,
            onRemove: () => setBalanceType("ALL"),
          }
        : null,
      showZeroBalance
        ? {
            id: "zeroBalance",
            label: "Zero balance",
            value: "Included",
            onRemove: () => setShowZeroBalance(false),
          }
        : null,
    ];
    return items.filter((i): i is ReportFilterSummaryItem => i != null);
  }, [
    warehouseId,
    branchOptions,
    primaryHeadId,
    primaryHeadOptions,
    groupId,
    groupOptions,
    subGroupId,
    subGroupOptions,
    ledgerId,
    ledgerOptions,
    balanceType,
    showZeroBalance,
    handlePrimaryHeadChange,
    handleGroupChange,
    handleSubGroupChange,
  ]);

  const togglePrimary = useCallback((id: string) => {
    setExpandedPrimaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSubgroup = useCallback((id: string) => {
    setExpandedSubgroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExport = async (format: "EXCEL" | "PDF") => {
    if (!queryParams || exporting) return;
    setExporting(true);
    try {
      await TrialBalanceApiService.exportReport({
        ...queryParams,
        // Layout follows active tab; backend still builds DETAILED hierarchy.
        report_type: tabToReportType(activeTab),
        format,
      });
      showToast(
        format === "EXCEL" ? "Excel exported successfully." : "PDF exported successfully.",
        "success"
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to export Trial Balance.",
        "error"
      );
    } finally {
      setExporting(false);
    }
  };

  const health = report?.trial_balance_health ?? null;
  const displaySummary = report?.display_summary ?? null;
  const closingUnbalanced = health ? !health.closing.is_balanced : false;
  const branchNote = report?.notes?.opening_balance_branch_limitation ?? null;

  const hasData =
    activeTab === "normal"
      ? normalPrimaryHeadRows.length > 0
      : detailedFlatRows.length > 0;
  const dateInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Trial Balance")}
      title="Trial Balance"
      description="Account group and ledger-wise trial balance for the selected period."
      hideDescription
      layout="split"
      className="trial-balance-compact h-full min-h-0"
      subHeader={<TrialBalanceViewTabs value={activeTab} onChange={setActiveTab} />}
      filters={
        <ReportFilterRow
          className="gap-2"
          end={
            <AccountsExportMenu
              onExcel={() => void handleExport("EXCEL")}
              onPdf={() => void handleExport("PDF")}
              disabled={exporting || !mounted || !queryParams || !!error}
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
          />
          <ReportFromDateFilter value={dateFrom} onChange={setDateFrom} />
          <ReportToDateFilter value={dateTo} onChange={setDateTo} />
          <ReportBranchFilter
            value={warehouseId}
            onChange={setWarehouseId}
            options={branchOptions}
          />
          <ReportMoreFilters activeCount={moreFiltersActiveCount}>
            <ReportLedgerFilter
              label="Primary Head"
              value={primaryHeadId}
              onChange={handlePrimaryHeadChange}
              ledgers={primaryHeadOptions}
            />
            <ReportLedgerFilter
              label="Group"
              value={groupId}
              onChange={handleGroupChange}
              ledgers={groupOptions}
            />
            <ReportLedgerFilter
              label="Sub-Group"
              value={subGroupId}
              onChange={handleSubGroupChange}
              ledgers={subGroupOptions}
            />
            <ReportLedgerFilter
              label="Ledger"
              value={ledgerId}
              onChange={setLedgerId}
              ledgers={ledgerOptions}
            />
            <div className="space-y-0.5 min-w-[140px]">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Balance Type
              </span>
              <select
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                value={balanceType}
                onChange={(e) =>
                  setBalanceType(e.target.value as TrialBalanceBalanceType)
                }
              >
                {BALANCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <ReportShowZeroBalanceToggle
              checked={showZeroBalance}
              onChange={setShowZeroBalance}
            />
          </ReportMoreFilters>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2 shrink-0"
              onClick={resetFilters}
            >
              Reset
            </Button>
          )}
        </ReportFilterRow>
      }
    >
      <div className="accounts-listing-card trial-balance-compact flex flex-col flex-1 min-h-0">
        {filterSummaryItems.length > 0 && (
          <div className="flex-shrink-0 px-2">
            <ReportFilterSummary items={filterSummaryItems} />
          </div>
        )}

        {branchNote && (
          <div className="flex-shrink-0 mx-2 mt-1 px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            {branchNote}
          </div>
        )}

        <AccountsTableListing
          className="flex-1 min-h-0"
          footer={
            <>
              <BalanceStatusBanner
                health={health}
                visible={Boolean(mounted && report && !loading && !error)}
              />
            </>
          }
        >
          {!mounted || (!datesReady && loading) ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading trial balance…
            </div>
          ) : !queryParams && !dateInvalid ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              Select a Financial Year and date range to load the Trial Balance.
            </div>
          ) : dateInvalid ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-red-600">
              <AlertCircle className="w-4 h-4" />
              From Date must be less than or equal to To Date.
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
              Loading trial balance…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm font-medium text-foreground">
                Unable to load Trial Balance.
              </p>
              <p className="text-xs text-muted-foreground max-w-md">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs mt-1"
                onClick={() => {
                  setError(null);
                  setRefreshKey((k) => k + 1);
                }}
              >
                Retry
              </Button>
            </div>
          ) : !hasData ? (
            <EmptyState hasFilters={hasFilters} onClear={resetFilters} />
          ) : activeTab === "normal" ? (
            <AccountsTable minWidth={720}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <FinancialReportHeadCell className="min-w-[280px]">
                    Particular
                  </FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Debit</FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Credit</FinancialReportHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {normalPrimaryHeadRows.map((row) => (
                  <AccountsTableRow
                    key={row.id}
                    className="group border-b border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <AccountsTableCell className={TB_NORMAL_INDENT.primary}>
                      <AccountsCoaHierarchyRowLabel
                        level="primary_head"
                        name={row.name}
                      />
                    </AccountsTableCell>
                    <DebitCreditCells debit={row.debit} credit={row.credit} bold />
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="border-t-2 border-foreground/20">
                  <AccountsTableCell className="font-bold text-foreground text-xs">
                    TOTAL
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", closingUnbalanced && "text-red-600")}
                  >
                    {formatMoneyString(displaySummary?.closing.debit ?? "0")}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", closingUnbalanced && "text-red-600")}
                  >
                    {formatMoneyString(displaySummary?.closing.credit ?? "0")}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          ) : (
            <AccountsTable minWidth={720}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <FinancialReportHeadCell className="min-w-[280px]">
                    Particular
                  </FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Debit</FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right">Credit</FinancialReportHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {detailedFlatRows.map((row) => {
                  if (row.type === "primary") {
                    const expanded = expandedPrimaryIds.has(row.id);
                    return (
                      <AccountsTableRow
                        key={`p-${row.id}`}
                        className="group border-b border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.primary}>
                          <button
                            type="button"
                            onClick={() => togglePrimary(row.id)}
                            className="w-full text-left"
                          >
                            <AccountsCoaHierarchyRowLabel
                              level="primary_head"
                              name={row.name}
                              expandable
                              expanded={expanded}
                              ledgerCount={row.ledgerCount}
                              showTreeGuides
                            />
                          </button>
                        </AccountsTableCell>
                        <DebitCreditCells debit={row.debit} credit={row.credit} bold />
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "group") {
                    const expanded = expandedGroupIds.has(row.id);
                    return (
                      <AccountsTableRow
                        key={`g-${row.id}`}
                        className="group bg-muted/15 hover:bg-muted/30 transition-colors"
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.group}>
                          <AccountsCoaHierarchyRowLabel
                            level="account_group"
                            name={row.name}
                            ledgerCount={row.ledgerCount}
                            expandable={row.ledgerCount > 0}
                            expanded={expanded}
                            onExpandClick={() => toggleGroup(row.id)}
                            showTreeGuides
                          />
                        </AccountsTableCell>
                        <DebitCreditCells debit={row.debit} credit={row.credit} bold />
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "subgroup") {
                    const expanded = expandedSubgroupIds.has(row.id);
                    return (
                      <AccountsTableRow
                        key={`sg-${row.id}`}
                        className="group bg-muted/10 hover:bg-muted/30 transition-colors"
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.subgroup}>
                          <AccountsCoaHierarchyRowLabel
                            level="sub_group"
                            name={row.name}
                            ledgerCount={row.ledgerCount}
                            expandable={row.ledgerCount > 0}
                            expanded={expanded}
                            onExpandClick={() => toggleSubgroup(row.id)}
                            showTreeGuides
                          />
                        </AccountsTableCell>
                        <DebitCreditCells debit={row.debit} credit={row.credit} />
                      </AccountsTableRow>
                    );
                  }
                  return (
                    <AccountsTableRow
                      key={`l-${row.id}`}
                      className="group hover:bg-muted/20 transition-colors"
                    >
                      <AccountsTableCell className={TB_DETAILED_INDENT.ledger}>
                        <AccountsCoaHierarchyRowLabel
                          level="ledger"
                          name={row.code ? `${row.code} — ${row.name}` : row.name}
                          showTreeGuides
                        />
                      </AccountsTableCell>
                      <DebitCreditCells debit={row.debit} credit={row.credit} />
                    </AccountsTableRow>
                  );
                })}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="border-t-2 border-foreground/20">
                  <AccountsTableCell className="font-bold text-foreground text-xs">
                    TOTAL
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", closingUnbalanced && "text-red-600")}
                  >
                    {formatMoneyString(displaySummary?.closing.debit ?? "0")}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", closingUnbalanced && "text-red-600")}
                  >
                    {formatMoneyString(displaySummary?.closing.credit ?? "0")}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          )}
        </AccountsTableListing>
      </div>
    </AccountsPageShell>
  );
}
