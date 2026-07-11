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
  ReportFinancialYearFilter,
  ReportAsOnDateFilter,
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
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildBalanceSheetStatement,
  collectBalanceSheetGroupIds,
  filterBalanceSheetStatement,
  flattenBalanceSheetHorizontalForExport,
  getBalanceSheetActivePartyOptions,
  getBalanceSheetBranchOptions,
  getBalanceSheetLedgerGroupOptions,
  getBalanceSheetLedgerOptions,
  getBalanceSheetWarehouseOptions,
  resolveFinancialYearLabel,
  splitBalanceSheetHorizontal,
  type BalanceSheetFilters,
  type BalanceSheetViewType,
} from "./balance-sheet-data";
import { exportBalanceSheetToExcel, exportBalanceSheetToPdf } from "./balance-sheet-export";
import { BalanceSheetHorizontalView } from "./BalanceSheetHorizontalView";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";

const PLACEHOLDER_DATE = "2025-04-01";
const EMPTY_MESSAGE = "No Balance Sheet data available for the selected date.";

function defaultFyAsOnDate(): { asOn: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { asOn: today, fyId: "all" };
  const asOn = today < fy.endDate ? today : fy.endDate;
  return { asOn, fyId: String(fy.id) };
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

export default function BalanceSheetPageClient() {
  const mounted = useClientMounted();

  const [asOnDate, setAsOnDate] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [partyIds, setPartyIds] = useState<string[]>([]);
  const [ledgerGroupIds, setLedgerGroupIds] = useState<string[]>([]);
  const [ledgerIds, setLedgerIds] = useState<string[]>([]);
  const [viewType, setViewType] = useState<BalanceSheetViewType>("summary");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const { asOn, fyId } = defaultFyAsOnDate();
    setAsOnDate(asOn);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        const today = new Date().toISOString().slice(0, 10);
        setAsOnDate(today < fy.endDate ? today : fy.endDate);
      }
    }
  }, []);

  const handleLedgerGroupChange = useCallback((values: string[]) => {
    setLedgerGroupIds(values);
    setLedgerIds([]);
  }, []);

  const bsFilters = useMemo((): BalanceSheetFilters => ({
    financialYearId,
    asOnDate,
    branch: branches,
    warehouse: warehouses,
    partyId: partyIds,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
    viewType,
    search: debouncedSearch,
  }), [
    financialYearId,
    asOnDate,
    branches,
    warehouses,
    partyIds,
    ledgerGroupIds,
    ledgerIds,
    viewType,
    debouncedSearch,
  ]);

  const ledgerGroupOptions = useMemo(
    () => (mounted ? getBalanceSheetLedgerGroupOptions() : []),
    [mounted, bsFilters],
  );
  const ledgerOptions = useMemo(
    () => (mounted ? mergeLedgerOptions(getBalanceSheetLedgerOptions, ledgerGroupIds) : []),
    [mounted, ledgerGroupIds, bsFilters],
  );
  const branchOptions = useMemo(
    () => (mounted ? getBalanceSheetBranchOptions() : [...REPORT_BRANCH_OPTIONS]),
    [mounted, bsFilters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getBalanceSheetWarehouseOptions() : []),
    [mounted, bsFilters],
  );
  const partyOptions = useMemo(
    () => (mounted ? getBalanceSheetActivePartyOptions() : []),
    [mounted, bsFilters],
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
        totalLiabilities: 0,
        totalAssets: 0,
        difference: 0,
        isBalanced: true,
        hasData: false,
        netProfit: 0,
        unpostedVoucherCount: 0,
      };
    }
    const built = buildBalanceSheetStatement(bsFilters);
    return filterBalanceSheetStatement(built, { search: debouncedSearch });
  }, [mounted, datesReady, bsFilters, debouncedSearch]);

  const exportExpandedIds = useMemo(() => {
    if (viewType === "summary") return new Set<string>();
    const { liabilities, assets } = splitBalanceSheetHorizontal(sourceStatement);
    return new Set([
      ...collectBalanceSheetGroupIds(liabilities.tree),
      ...collectBalanceSheetGroupIds(assets.tree),
    ]);
  }, [sourceStatement, viewType]);

  const defaultFy = useMemo(() => defaultFyAsOnDate(), []);

  const moreFiltersActiveCount = countActiveMoreFilters({
    warehouse: warehouses,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
  });

  const hasFilters =
    Boolean(search.trim()) ||
    (datesReady &&
      (financialYearId !== defaultFy.fyId ||
        asOnDate !== defaultFy.asOn ||
        isMultiFilterActive(branches) ||
        isMultiFilterActive(warehouses) ||
        isMultiFilterActive(partyIds) ||
        isMultiFilterActive(ledgerGroupIds) ||
        isMultiFilterActive(ledgerIds) ||
        viewType !== "summary"));

  const resetFilters = useCallback(() => {
    setSearch("");
    const { asOn, fyId } = defaultFyAsOnDate();
    setAsOnDate(asOn);
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
      asOnDate,
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
      asOnDate,
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
      asOnDate,
      branch: branches[0],
      warehouse: warehouses[0],
      partyId: partyIds[0],
    }),
    [asOnDate, branches, warehouses, partyIds],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
      [
        {
          id: "period",
          label: "As on",
          value: asOnDate,
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
      asOnDate,
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
      const rows = flattenBalanceSheetHorizontalForExport(sourceStatement, exportExpandedIds);
      await exportBalanceSheetToExcel(rows, exportMeta, sourceStatement);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenBalanceSheetHorizontalForExport(sourceStatement, exportExpandedIds);
    exportBalanceSheetToPdf(rows, exportMeta, sourceStatement);
  };

  const filterBar = (
    <ReportFilterRow className="items-end gap-2">
      <ReportFinancialYearFilter
        value={financialYearId}
        onChange={handleFinancialYearChange}
      />
      <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
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
      breadcrumbs={accountsBreadcrumb("Reports", "Balance Sheet")}
      title="Balance Sheet"
      description="Asset and liability statement as on the selected date."
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
            Loading Balance Sheet…
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
          <BalanceSheetHorizontalView
            statement={sourceStatement}
            drillDownFilters={drillDownFilters}
            viewType={viewType}
          />
        )}
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
