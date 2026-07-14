"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  ReportMoreFilters,
  ReportFilterSummary,
  ReportFromDateFilter,
  ReportToDateFilter,
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
import {
  buildPandLStatement,
  flattenPandLHorizontalForExport,
  getPandLActivePartyOptions,
  getPandLBranchOptions,
  getPandLLedgerGroupOptions,
  getPandLLedgerOptions,
  getPandLWarehouseOptions,
  resolveFinancialYearLabel,
  type PandLFilters,
  type PandLTab,
} from "./pl-data";
import { exportPandLToExcel, exportPandLToPdf } from "./pl-export";
import { ProfitLossHorizontalView } from "./ProfitLossHorizontalView";
import { ProfitLossViewTabs, profitLossViewLabel } from "./ProfitLossViewTabs";
import { formatPlReportPeriod } from "./pl-display";
import "../trial-balance/trial-balance-compact.css";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { ensurePlDemoOnPageLoad } from "@/lib/accounts/pl-demo-seed";
import { PL_MOCK_PERIOD_FROM } from "@/lib/accounts/pl-traditional-mock";
import {
  ACCOUNTS_SECTION_SEEDED_EVENT,
  ACCOUNTS_VOUCHERS_UPDATED_EVENT,
} from "@/lib/accounts/accounts-section-seed";

const PLACEHOLDER_DATE = PL_MOCK_PERIOD_FROM;
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

  const [activeTab, setActiveTab] = useState<PandLTab>("normal");
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
  const [exporting, setExporting] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
    ensurePlDemoOnPageLoad();
    setDataRevision((n) => n + 1);
  }, []);

  useEffect(() => {
    const refresh = () => setDataRevision((n) => n + 1);
    window.addEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, refresh);
    window.addEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, refresh);
      window.removeEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, refresh);
    };
  }, []);

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
    viewType: activeTab,
    search: "",
  }), [
    financialYearId,
    dateFrom,
    dateTo,
    branches,
    warehouses,
    partyIds,
    ledgerGroupIds,
    ledgerIds,
    activeTab,
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
        debitRows: [],
        creditRows: [],
        tradingTotal: 0,
        grossProfit: 0,
        netProfit: 0,
        finalDebitTotal: 0,
        finalCreditTotal: 0,
        totalIncome: 0,
        totalExpenses: 0,
        isBalanced: true,
        hasData: false,
      };
    }
    const built = buildPandLStatement(plFilters);
    return built;
  }, [mounted, datesReady, plFilters, dataRevision]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenPandLHorizontalForExport(sourceStatement);
      await exportPandLToExcel(rows, exportMeta, sourceStatement);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenPandLHorizontalForExport(sourceStatement);
    exportPandLToPdf(rows, exportMeta, sourceStatement);
  };

  const defaultFyRange = useMemo(() => defaultFyDateRange(), []);

  const moreFiltersActiveCount = countActiveMoreFilters({
    warehouse: warehouses,
    partyId: partyIds,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
  });

  const hasFilters =
    (datesReady &&
      (preset !== "custom" ||
        financialYearId !== defaultFyRange.fyId ||
        isMultiFilterActive(branches) ||
        isMultiFilterActive(warehouses) ||
        isMultiFilterActive(partyIds) ||
        isMultiFilterActive(ledgerGroupIds) ||
        isMultiFilterActive(ledgerIds)));

  const resetFilters = useCallback(() => {
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
      viewType: profitLossViewLabel(activeTab),
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
      activeTab,
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

  const filterBar = (
    <ReportFilterRow
      end={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || !mounted || !sourceStatement.hasData}
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
        onPresetChange={handlePresetChange}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        inlineCustomDates={false}
      />
      <ReportFromDateFilter value={dateFrom} onChange={setDateFrom} />
      <ReportToDateFilter value={dateTo} onChange={setDateTo} />
      <ReportBranchMultiFilter
        values={branches}
        onChange={setBranches}
        options={branchOptions}
      />
      <ReportMoreFilters activeCount={moreFiltersActiveCount}>
        <ReportWarehouseMultiFilter
          values={warehouses}
          onChange={setWarehouses}
          options={warehouseOptions}
        />
        <ReportPartyMultiFilter
          values={partyIds}
          onChange={setPartyIds}
          parties={partyOptions}
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
      subHeader={
        <ProfitLossViewTabs value={activeTab} onChange={setActiveTab} />
      }
      filters={filterBar}
    >
      <AccountsListingTableCard className="trial-balance-compact flex flex-col flex-1 min-h-0 overflow-hidden">
        {mounted && datesReady && (
          <p className="flex-shrink-0 px-3 py-1 border-b border-border/60 text-left text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Period:</span>{" "}
            {formatPlReportPeriod(dateFrom, dateTo)}
          </p>
        )}
        {filterSummaryItems.length > 0 && (
          <ReportFilterSummary items={filterSummaryItems} />
        )}
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
          />
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
