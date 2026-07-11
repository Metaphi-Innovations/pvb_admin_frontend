"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportWarehouseMultiFilter,
  ReportPartyMultiFilter,
  ReportLedgerGroupMultiFilter,
  ReportLedgerMultiFilter,
  ReportViewTypeFilter,
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
  formatMultiSelectLabel,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildPandLStatement,
  collectPandLGroupIds,
  filterPandLStatement,
  flattenPandLHorizontalForExport,
  getPandLActivePartyOptions,
  getPandLBranchOptions,
  getPandLLedgerGroupOptions,
  getPandLLedgerOptions,
  getPandLWarehouseOptions,
  resolveFinancialYearLabel,
  splitPandLHorizontal,
  type PandLFilters,
  type PandLViewType,
} from "./pl-data";
import { exportPandLToExcel, exportPandLToPdf } from "./pl-export";
import { ProfitLossHorizontalView } from "./ProfitLossHorizontalView";
import { useDebouncedValue } from "./pl-hooks";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";

const PLACEHOLDER_DATE = "2025-04-01";
const EMPTY_MESSAGE = "No Profit & Loss data available for the selected period.";

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

function mergeLedgerOptions(
  getOptions: (ledgerGroupId: string) => { id: number; name: string }[],
  ledgerGroupIds: string[],
): { id: number; name: string }[] {
  if (ledgerGroupIds.length === 0) return getOptions("all");
  const seen = new Map<number, { id: number; name: string }>();
  for (const groupId of ledgerGroupIds) {
    for (const ledger of getOptions(groupId)) {
      seen.set(ledger.id, ledger);
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function ProfitLossPageClient() {
  const mounted = useClientMounted();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [partyIds, setPartyIds] = useState<string[]>([]);
  const [ledgerGroupIds, setLedgerGroupIds] = useState<string[]>([]);
  const [ledgerIds, setLedgerIds] = useState<string[]>([]);
  const [viewType, setViewType] = useState<PandLViewType>("summary");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        const today = new Date().toISOString().slice(0, 10);
        setDateFrom(fy.startDate);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const handleLedgerGroupChange = useCallback((values: string[]) => {
    setLedgerGroupIds(values);
    setLedgerIds([]);
  }, []);

  const handlePresetChange = useCallback((value: DateRangePresetId) => {
    setPreset(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const plFilters = useMemo((): PandLFilters => ({
    financialYearId,
    dateFrom,
    dateTo,
    branch: branches,
    warehouse: warehouses,
    partyId: partyIds,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
    viewType,
    search: debouncedSearch,
  }), [
    financialYearId,
    dateFrom,
    dateTo,
    branches,
    warehouses,
    partyIds,
    ledgerGroupIds,
    ledgerIds,
    viewType,
    debouncedSearch,
  ]);

  const ledgerGroupOptions = useMemo(
    () => (mounted ? getPandLLedgerGroupOptions() : []),
    [mounted, plFilters],
  );
  const ledgerOptions = useMemo(
    () => (mounted ? mergeLedgerOptions(getPandLLedgerOptions, ledgerGroupIds) : []),
    [mounted, ledgerGroupIds, plFilters],
  );
  const branchOptions = useMemo(
    () => (mounted ? getPandLBranchOptions() : [...REPORT_BRANCH_OPTIONS]),
    [mounted, plFilters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getPandLWarehouseOptions() : []),
    [mounted, plFilters],
  );
  const partyOptions = useMemo(
    () => (mounted ? getPandLActivePartyOptions() : []),
    [mounted, plFilters],
  );

  const warehouseSelectOptions = useMemo(
    () => warehouseOptions.filter((w) => w !== "all").map((w) => ({ value: w, label: w })),
    [warehouseOptions],
  );
  const ledgerGroupSelectOptions = useMemo(
    () => ledgerGroupOptions.map((g) => ({ value: String(g.id), label: g.name })),
    [ledgerGroupOptions],
  );
  const ledgerSelectOptions = useMemo(
    () => ledgerOptions.map((l) => ({ value: String(l.id), label: l.name })),
    [ledgerOptions],
  );

  const sourceStatement = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        lines: [],
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        isBalanced: true,
        hasData: false,
      };
    }
    const built = buildPandLStatement(plFilters);
    return filterPandLStatement(built, { search: debouncedSearch });
  }, [mounted, datesReady, plFilters, debouncedSearch]);

  const exportExpandedIds = useMemo(() => {
    const { expenses, income } = splitPandLHorizontal(sourceStatement);
    return new Set([
      ...collectPandLGroupIds(expenses.tree),
      ...collectPandLGroupIds(income.tree),
    ]);
  }, [sourceStatement]);

  const defaultFyRange = useMemo(() => defaultFyDateRange(), []);

  const moreFiltersActiveCount = countActiveMoreFilters({
    warehouse: warehouses,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
  });

  const hasFilters =
    Boolean(search.trim()) ||
    (datesReady &&
      (preset !== "custom" ||
        financialYearId !== defaultFyRange.fyId ||
        isMultiFilterActive(branches) ||
        isMultiFilterActive(warehouses) ||
        isMultiFilterActive(partyIds) ||
        isMultiFilterActive(ledgerGroupIds) ||
        isMultiFilterActive(ledgerIds) ||
        viewType !== "summary"));

  const resetFilters = useCallback(() => {
    setSearch("");
    setPreset("custom");
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setBranches([]);
    setWarehouses([]);
    setPartyIds([]);
    setLedgerGroupIds([]);
    setLedgerIds([]);
    setViewType("summary");
  }, []);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: resolveFinancialYearLabel(financialYearId),
      branch: branches.length === 0
        ? "All branches"
        : formatMultiSelectLabel(
            branches,
            branchOptions.map((b) => ({ value: b, label: b })),
            "Branch",
          ),
      warehouse: warehouses.length === 0
        ? "All warehouses"
        : formatMultiSelectLabel(warehouses, warehouseSelectOptions, "Warehouse"),
      party: partyIds.length === 0
        ? "All parties"
        : formatMultiSelectLabel(
            partyIds,
            partyOptions.map((p) => ({
              value: p.id,
              label: p.kind === "vendor" ? `${p.name} (Vendor)` : `${p.name} (Customer)`,
            })),
            "Party",
          ),
      viewType: viewType === "summary" ? "Summary" : "Detailed",
    }),
    [
      dateFrom,
      dateTo,
      financialYearId,
      branches,
      branchOptions,
      warehouses,
      warehouseSelectOptions,
      partyIds,
      partyOptions,
      viewType,
    ],
  );

  const drillDownFilters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branch: branches[0],
      warehouse: warehouses[0],
      partyId: partyIds[0],
    }),
    [dateFrom, dateTo, branches, warehouses, partyIds],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
      [
        {
          id: "period",
          label: "Period",
          value: `${dateFrom} to ${dateTo}`,
        },
        buildBranchFilterSummary(branches, () => setBranches([])),
        buildEntityFilterSummary(
          "party",
          "Party",
          partyIds,
          partyOptions.map((p) => ({
            value: p.id,
            label: p.kind === "vendor" ? `${p.name} (Vendor)` : `${p.name} (Customer)`,
          })),
          () => setPartyIds([]),
        ),
        buildEntityFilterSummary(
          "warehouse",
          "Warehouse",
          warehouses,
          warehouseSelectOptions,
          () => setWarehouses([]),
        ),
        buildEntityFilterSummary(
          "ledgerGroup",
          "Account Group",
          ledgerGroupIds,
          ledgerGroupSelectOptions,
          () => setLedgerGroupIds([]),
        ),
        buildEntityFilterSummary(
          "ledger",
          "Ledger",
          ledgerIds,
          ledgerSelectOptions,
          () => setLedgerIds([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [
      dateFrom,
      dateTo,
      branches,
      partyIds,
      partyOptions,
      warehouses,
      warehouseSelectOptions,
      ledgerGroupIds,
      ledgerGroupSelectOptions,
      ledgerIds,
      ledgerSelectOptions,
    ],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenPandLHorizontalForExport(sourceStatement, exportExpandedIds);
      await exportPandLToExcel(rows, exportMeta, sourceStatement);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenPandLHorizontalForExport(sourceStatement, exportExpandedIds);
    exportPandLToPdf(rows, exportMeta, sourceStatement);
  };

  const filterBar = (
    <ReportFilterRow className="items-end gap-2">
      <ReportFinancialYearFilter
        value={financialYearId}
        onChange={handleFinancialYearChange}
      />
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={handlePresetChange}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <ReportBranchMultiFilter
        values={branches}
        onChange={setBranches}
        options={branchOptions}
      />
      <ReportPartyMultiFilter
        values={partyIds}
        onChange={setPartyIds}
        parties={partyOptions}
      />
      <ReportViewTypeFilter value={viewType} onChange={setViewType} />
      <ReportMoreFilters activeCount={moreFiltersActiveCount}>
        <ReportWarehouseMultiFilter
          values={warehouses}
          onChange={setWarehouses}
          options={warehouseOptions}
        />
        <ReportLedgerGroupMultiFilter
          values={ledgerGroupIds}
          onChange={handleLedgerGroupChange}
          groups={ledgerGroupOptions}
        />
        <ReportLedgerMultiFilter
          values={ledgerIds}
          onChange={setLedgerIds}
          ledgers={ledgerOptions}
        />
      </ReportMoreFilters>
      <div className="space-y-0.5 min-w-[180px] flex-1">
        <Label className={filterLabelClass}>Search Particular</Label>
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name…"
            className={cn(filterControlClass, "pr-7")}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </ReportFilterRow>
  );

  const showTable = mounted && datesReady && sourceStatement.hasData;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Profit & Loss")}
      title="Profit & Loss"
      description="Income and expense statement for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || !mounted || !sourceStatement.hasData}
        />
      }
      filters={filterBar}
    >
      <AccountsListingTableCard className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ReportFilterSummary items={filterSummaryItems} />
        {!mounted || !datesReady ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading Profit & Loss…
          </div>
        ) : !showTable ? (
          <div className="accounts-table-empty py-4 text-center">
            {EMPTY_MESSAGE}
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="block mx-auto mt-1 text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ProfitLossHorizontalView
            statement={sourceStatement}
            drillDownFilters={drillDownFilters}
            viewType={viewType}
          />
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
