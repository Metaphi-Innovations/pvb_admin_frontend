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
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { ACCOUNTS_VOUCHERS_UPDATED_EVENT } from "@/lib/accounts/accounts-section-seed";
import {
  buildCashFlowStatement,
  flattenCashFlowForExport,
  getCashFlowActivePartyOptions,
  getCashFlowBranchOptions,
  getCashFlowLedgerGroupOptions,
  getCashFlowLedgerOptions,
  getCashFlowWarehouseOptions,
  resolveFinancialYearLabel,
  type CashFlowFilters,
} from "./cash-flow-data";
import { exportCashFlowToExcel, exportCashFlowToPdf } from "./cash-flow-export";
import { CashFlowCompareToggle } from "./CashFlowCompareToggle";
import { CashFlowStatementView } from "./CashFlowStatementView";
import "../trial-balance/trial-balance-compact.css";

const PLACEHOLDER_DATE = "2025-04-01";
const EMPTY_MESSAGE = "No Cash Flow data available for the selected period.";

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

export default function CashFlowPageClient() {
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
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dataTick, setDataTick] = useState(0);

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/accounts/general-ledger-demo-seed").then(
      ({ ensureGeneralLedgerDemoOnPageLoad }) => {
        ensureGeneralLedgerDemoOnPageLoad();
        if (!cancelled) setDataTick((t) => t + 1);
      },
    );
    const onVouchersUpdated = () => setDataTick((t) => t + 1);
    window.addEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, onVouchersUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, onVouchersUpdated);
    };
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

  const handlePresetChange = useCallback((value: DateRangePresetId) => {
    setPreset(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const handleLedgerGroupChange = useCallback((values: string[]) => {
    setLedgerGroupIds(values);
    setLedgerIds([]);
  }, []);

  const cfFilters = useMemo((): CashFlowFilters => ({
    financialYearId,
    dateFrom,
    dateTo,
    branch: branches,
    warehouse: warehouses,
    partyId: partyIds,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
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
    dataTick,
  ]);

  const ledgerGroupOptions = useMemo(
    () => (mounted ? getCashFlowLedgerGroupOptions() : []),
    [mounted, dataTick],
  );
  const ledgerOptions = useMemo(
    () => (mounted ? mergeLedgerOptions(getCashFlowLedgerOptions, ledgerGroupIds) : []),
    [mounted, ledgerGroupIds, dataTick],
  );
  const branchOptions = useMemo(
    () => (mounted ? getCashFlowBranchOptions() : [...REPORT_BRANCH_OPTIONS]),
    [mounted, dataTick],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getCashFlowWarehouseOptions() : []),
    [mounted, dataTick],
  );
  const partyOptions = useMemo(
    () => (mounted ? getCashFlowActivePartyOptions() : []),
    [mounted, dataTick],
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

  const statement = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        lines: [],
        netOperating: 0,
        netInvesting: 0,
        netFinancing: 0,
        netChange: 0,
        openingBalance: 0,
        closingBalance: 0,
        hasData: false,
      };
    }
    const built = buildCashFlowStatement(cfFilters, { comparePreviousPeriod });
    return built;
  }, [mounted, datesReady, cfFilters, comparePreviousPeriod]);

  const moreFilterCount =
    countActiveMoreFilters({
      warehouse: warehouses,
      partyId: partyIds,
      ledgerGroupId: ledgerGroupIds,
      ledgerId: ledgerIds,
    }) + (comparePreviousPeriod ? 1 : 0);

  const hasFilters =
    isMultiFilterActive(branches) ||
    isMultiFilterActive(warehouses) ||
    isMultiFilterActive(partyIds) ||
    isMultiFilterActive(ledgerGroupIds) ||
    isMultiFilterActive(ledgerIds) ||
    comparePreviousPeriod ||
    (datesReady && preset !== "custom" && financialYearId === "all");

  const resetFilters = useCallback(() => {
    setBranches([]);
    setWarehouses([]);
    setPartyIds([]);
    setLedgerGroupIds([]);
    setLedgerIds([]);
    setComparePreviousPeriod(false);
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setPreset("custom");
  }, []);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: resolveFinancialYearLabel(financialYearId),
      comparePreviousPeriod,
      currentPeriodLabel: statement.currentPeriodLabel,
      previousPeriodLabel: statement.previousPeriodLabel,
    }),
    [
      dateFrom,
      dateTo,
      financialYearId,
      comparePreviousPeriod,
      statement.currentPeriodLabel,
      statement.previousPeriodLabel,
    ],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenCashFlowForExport(statement);
      await exportCashFlowToExcel(rows, exportMeta, statement);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenCashFlowForExport(statement);
    exportCashFlowToPdf(rows, exportMeta, statement);
  };

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
      [
        {
          id: "period",
          label: "Period",
          value: `${dateFrom} to ${dateTo}`,
        },
        comparePreviousPeriod
          ? {
              id: "compare",
              label: "Comparison",
              value: "Previous period",
            }
          : null,
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
      comparePreviousPeriod,
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
      <ReportMoreFilters activeCount={moreFilterCount}>
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
        <CashFlowCompareToggle
          checked={comparePreviousPeriod}
          onChange={setComparePreviousPeriod}
        />
      </ReportMoreFilters>
      {hasFilters && (
        <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </ReportFilterRow>
  );

  const filterSummary =
    filterSummaryItems.length > 0 ? (
      <ReportFilterSummary items={filterSummaryItems} className="mt-1" />
    ) : null;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Cash Flow")}
      title="Cash Flow"
      description="Cash flow statement for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0 trial-balance-compact"
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || !mounted || !statement.hasData}
        />
      }
      filters={
        <>
          {filterBar}
          {filterSummary}
        </>
      }
    >
      <AccountsListingTableCard className="flex flex-col flex-1 min-h-0">
        {!mounted ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading Cash Flow…
          </div>
        ) : !statement.hasData ? (
          <div className="accounts-table-empty py-4 text-center text-sm text-muted-foreground">
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
          <CashFlowStatementView statement={statement} />
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
