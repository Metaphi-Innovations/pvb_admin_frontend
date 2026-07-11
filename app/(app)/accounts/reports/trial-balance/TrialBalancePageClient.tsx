"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
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
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportWarehouseMultiFilter,
  ReportLedgerGroupMultiFilter,
  ReportLedgerMultiFilter,
  ReportShowZeroBalanceToggle,
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
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import {
  formatMoney,
  formatMoneyOrDash,
  roundMoney,
} from "@/lib/accounts/money-format";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildTrialBalanceDetailedGroups,
  buildTrialBalanceSummaryRows,
  collectAllDetailedGroupKeys,
  collectAllPrimaryHeadKeys,
  computeTrialBalanceSummaryFromDetailedGroups,
  computeTrialBalanceSummaryFromGroups,
  filterTrialBalanceDetailedGroups,
  filterTrialBalanceSummaryRows,
  findTrialBalanceExceptions,
  flattenTrialBalanceDetailedGroups,
  getTrialBalanceBranchOptions,
  getTrialBalanceLedgerGroupOptions,
  getTrialBalanceLedgerOptions,
  getTrialBalanceWarehouseOptions,
  type TrialBalanceDetailedFlatRow,
  type TrialBalanceFilters,
  type TrialBalanceSummaryGroupRow,
  type TrialBalanceTab,
  type TrialBalanceVoucherException,
} from "./trial-balance-data";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  exportTrialBalanceDetailedToExcel,
  exportTrialBalanceDetailedToPdf,
  exportTrialBalanceSummaryToExcel,
  exportTrialBalanceSummaryToPdf,
} from "./trial-balance-export";
import { useDebouncedValue } from "./trial-balance-hooks";
import "./trial-balance-compact.css";

const PLACEHOLDER_DATE = "2025-04-01";

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

export default function TrialBalancePageClient() {
  const mounted = useClientMounted();

  const [activeTab, setActiveTab] = useState<TrialBalanceTab>("summary");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [ledgerGroupIds, setLedgerGroupIds] = useState<string[]>([]);
  const [ledgerIds, setLedgerIds] = useState<string[]>([]);
  const [showZeroBalance, setShowZeroBalance] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const [expandedPrimaryIds, setExpandedPrimaryIds] = useState<Set<number>>(new Set());
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

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

  const tbFilters = useMemo((): TrialBalanceFilters => ({
    financialYearId,
    dateFrom,
    dateTo,
    branch: branches,
    warehouse: warehouses,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
    showZeroBalance,
    search: debouncedSearch,
  }), [
    financialYearId,
    dateFrom,
    dateTo,
    branches,
    warehouses,
    ledgerGroupIds,
    ledgerIds,
    showZeroBalance,
    debouncedSearch,
  ]);

  const ledgerGroupOptions = useMemo(
    () => (mounted ? getTrialBalanceLedgerGroupOptions() : []),
    [mounted, tbFilters],
  );
  const ledgerOptions = useMemo(
    () => (mounted ? mergeLedgerOptions(getTrialBalanceLedgerOptions, ledgerGroupIds) : []),
    [mounted, ledgerGroupIds, tbFilters],
  );
  const branchOptions = useMemo(
    () => (mounted ? getTrialBalanceBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, tbFilters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getTrialBalanceWarehouseOptions() : []),
    [mounted, tbFilters],
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

  const moreFiltersActiveCount = countActiveMoreFilters({
    warehouse: warehouses,
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
    showZeroBalance,
  });

  const exceptions = useMemo(
    () => (mounted ? findTrialBalanceExceptions(tbFilters) : []),
    [mounted, tbFilters],
  );

  const sourceSummaryRows = useMemo(() => {
    if (!mounted || activeTab !== "summary") return [];
    return buildTrialBalanceSummaryRows(tbFilters);
  }, [mounted, activeTab, tbFilters]);

  const sourceDetailedGroups = useMemo(() => {
    if (!mounted || activeTab !== "detailed") return [];
    return buildTrialBalanceDetailedGroups(tbFilters);
  }, [mounted, activeTab, tbFilters]);

  useEffect(() => {
    if (!mounted || sourceDetailedGroups.length === 0) return;
    if (debouncedSearch.trim()) {
      const filtered = filterTrialBalanceDetailedGroups(sourceDetailedGroups, {
        search: debouncedSearch,
      });
      setExpandedPrimaryIds(collectAllPrimaryHeadKeys(filtered));
      setExpandedGroupIds(collectAllDetailedGroupKeys(filtered));
      return;
    }
    setExpandedPrimaryIds(collectAllPrimaryHeadKeys(sourceDetailedGroups));
    setExpandedGroupIds(collectAllDetailedGroupKeys(sourceDetailedGroups));
  }, [mounted, sourceDetailedGroups, debouncedSearch]);

  const filteredSummaryRows = useMemo(
    () => filterTrialBalanceSummaryRows(sourceSummaryRows, { search: debouncedSearch }),
    [sourceSummaryRows, debouncedSearch],
  );

  const filteredDetailedGroups = useMemo(
    () => filterTrialBalanceDetailedGroups(sourceDetailedGroups, { search: debouncedSearch }),
    [sourceDetailedGroups, debouncedSearch],
  );

  const detailedFlatRows = useMemo(
    () =>
      flattenTrialBalanceDetailedGroups(
        filteredDetailedGroups,
        expandedPrimaryIds,
        expandedGroupIds,
      ),
    [filteredDetailedGroups, expandedPrimaryIds, expandedGroupIds],
  );

  const providerRows = useMemo(
    () => (activeTab === "summary" ? filteredSummaryRows : detailedFlatRows),
    [activeTab, filteredSummaryRows, detailedFlatRows],
  );

  const getCellValue = useCallback(
    (row: TrialBalanceSummaryGroupRow | TrialBalanceDetailedFlatRow, key: string) => {
      if (activeTab === "summary") {
        const summaryRow = row as TrialBalanceSummaryGroupRow;
        return summaryRow[key as keyof TrialBalanceSummaryGroupRow];
      }
      const flat = row as TrialBalanceDetailedFlatRow;
      if (flat.type === "primary") {
        if (key === "particular") return flat.primaryHead;
        return flat.amounts[key as keyof typeof flat.amounts] ?? "";
      }
      if (flat.type === "group") {
        if (key === "particular") return flat.groupName;
        return flat.amounts[key as keyof typeof flat.amounts] ?? "";
      }
      const ledger = flat.ledger;
      if (key === "particular") return ledger.ledgerName;
      return ledger[key as keyof typeof ledger] ?? "";
    },
    [activeTab],
  );

  const columnConfig = useMemo(
    (): AccountsColumnFilterConfig => ({
      particular: { type: "text" },
      openingDebit: { type: "amount" },
      openingCredit: { type: "amount" },
      debit: { type: "amount" },
      credit: { type: "amount" },
      closingDebit: { type: "amount" },
      closingCredit: { type: "amount" },
    }),
    [],
  );

  const hasFilters =
    Boolean(search.trim()) ||
    isMultiFilterActive(branches) ||
    isMultiFilterActive(warehouses) ||
    isMultiFilterActive(ledgerGroupIds) ||
    isMultiFilterActive(ledgerIds) ||
    showZeroBalance ||
    (datesReady && financialYearId !== defaultFyDateRange().fyId);

  const resetFilters = useCallback(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setSearch("");
    setPreset("custom");
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setBranches([]);
    setWarehouses([]);
    setLedgerGroupIds([]);
    setLedgerIds([]);
    setShowZeroBalance(false);
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, activeTab, financialYearId, dateFrom, dateTo, branches, warehouses, ledgerGroupIds, ledgerIds, showZeroBalance]);

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((f) => String(f.id) === financialYearId)?.name ?? "";
  }, [financialYearId]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
      view: activeTab,
      branch: branches.length === 0
        ? ""
        : formatMultiSelectLabel(
            branches,
            branchOptions.map((b) => ({ value: b, label: b })),
            "Branch",
          ),
      warehouse: warehouses.length === 0
        ? ""
        : formatMultiSelectLabel(warehouses, warehouseSelectOptions, "Warehouse"),
    }),
    [
      dateFrom,
      dateTo,
      activeTab,
      financialYearLabel,
      branches,
      branchOptions,
      warehouses,
      warehouseSelectOptions,
    ],
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
        showZeroBalance
          ? {
              id: "zeroBalance",
              label: "Zero balance",
              value: "Shown",
              onRemove: () => setShowZeroBalance(false),
            }
          : null,
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [
      dateFrom,
      dateTo,
      branches,
      warehouses,
      warehouseSelectOptions,
      ledgerGroupIds,
      ledgerGroupSelectOptions,
      ledgerIds,
      ledgerSelectOptions,
      showZeroBalance,
    ],
  );

  const hasExportData =
    activeTab === "summary"
      ? filteredSummaryRows.length > 0
      : filteredDetailedGroups.length > 0;

  const togglePrimary = useCallback((primaryHeadId: number) => {
    setExpandedPrimaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(primaryHeadId)) next.delete(primaryHeadId);
      else next.add(primaryHeadId);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  return (
    <AccountsColumnFilterProvider
      key={activeTab}
      rows={providerRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="particular"
      defaultSortDir="asc"
    >
      <TrialBalancePageBody
        mounted={mounted}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        filteredSummaryRows={filteredSummaryRows}
        filteredDetailedGroups={filteredDetailedGroups}
        detailedFlatRows={detailedFlatRows}
        expandedPrimaryIds={expandedPrimaryIds}
        expandedGroupIds={expandedGroupIds}
        togglePrimary={togglePrimary}
        toggleGroup={toggleGroup}
        hasFilters={hasFilters}
        resetFilters={resetFilters}
        preset={preset}
        handlePresetChange={handlePresetChange}
        financialYearId={financialYearId}
        onFinancialYearChange={handleFinancialYearChange}
        branch={branches}
        onBranchChange={setBranches}
        warehouse={warehouses}
        onWarehouseChange={setWarehouses}
        ledgerGroupIds={ledgerGroupIds}
        onLedgerGroupChange={handleLedgerGroupChange}
        ledgerIds={ledgerIds}
        onLedgerChange={setLedgerIds}
        showZeroBalance={showZeroBalance}
        onShowZeroBalanceChange={setShowZeroBalance}
        moreFiltersActiveCount={moreFiltersActiveCount}
        filterSummaryItems={filterSummaryItems}
        ledgerGroupOptions={ledgerGroupOptions}
        ledgerOptions={ledgerOptions}
        branchOptions={branchOptions}
        warehouseOptions={warehouseOptions}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        search={search}
        setSearch={setSearch}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
        hasExportData={hasExportData}
        exceptions={exceptions}
      />
    </AccountsColumnFilterProvider>
  );
}

function TrialBalancePageBody({
  mounted,
  activeTab,
  setActiveTab,
  filteredSummaryRows,
  filteredDetailedGroups,
  detailedFlatRows,
  expandedPrimaryIds,
  expandedGroupIds,
  togglePrimary,
  toggleGroup,
  hasFilters,
  resetFilters,
  preset,
  handlePresetChange,
  financialYearId,
  onFinancialYearChange,
  branch,
  onBranchChange,
  warehouse,
  onWarehouseChange,
  ledgerGroupIds,
  onLedgerGroupChange,
  ledgerIds,
  onLedgerChange,
  showZeroBalance,
  onShowZeroBalanceChange,
  moreFiltersActiveCount,
  filterSummaryItems,
  ledgerGroupOptions,
  ledgerOptions,
  branchOptions,
  warehouseOptions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  search,
  setSearch,
  page,
  setPage,
  pageSize,
  setPageSize,
  exporting,
  setExporting,
  exportMeta,
  hasExportData,
  exceptions,
}: {
  mounted: boolean;
  activeTab: TrialBalanceTab;
  setActiveTab: (v: TrialBalanceTab) => void;
  filteredSummaryRows: TrialBalanceSummaryGroupRow[];
  filteredDetailedGroups: ReturnType<typeof buildTrialBalanceDetailedGroups>;
  detailedFlatRows: TrialBalanceDetailedFlatRow[];
  expandedPrimaryIds: Set<number>;
  expandedGroupIds: Set<string>;
  togglePrimary: (id: number) => void;
  toggleGroup: (groupKey: string) => void;
  hasFilters: boolean;
  resetFilters: () => void;
  preset: DateRangePresetId;
  handlePresetChange: (value: DateRangePresetId) => void;
  financialYearId: string;
  onFinancialYearChange: (value: string) => void;
  branch: string[];
  onBranchChange: (value: string[]) => void;
  warehouse: string[];
  onWarehouseChange: (value: string[]) => void;
  ledgerGroupIds: string[];
  onLedgerGroupChange: (value: string[]) => void;
  ledgerIds: string[];
  onLedgerChange: (value: string[]) => void;
  showZeroBalance: boolean;
  onShowZeroBalanceChange: (value: boolean) => void;
  moreFiltersActiveCount: number;
  filterSummaryItems: ReportFilterSummaryItem[];
  ledgerGroupOptions: { id: number; name: string }[];
  ledgerOptions: { id: number; name: string }[];
  branchOptions: string[];
  warehouseOptions: string[];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: Parameters<typeof exportTrialBalanceSummaryToExcel>[1];
  hasExportData: boolean;
  exceptions: TrialBalanceVoucherException[];
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredSummaryRows = useAccountsFilteredRows(filteredSummaryRows);
  const columnFilteredDetailedRows = useAccountsFilteredRows(detailedFlatRows);
  const columnFilteredRows =
    activeTab === "summary" ? columnFilteredSummaryRows : columnFilteredDetailedRows;

  const rebuildDetailedGroupsFromFlatRows = useCallback(
    (rows: TrialBalanceDetailedFlatRow[]) => {
      const ledgerRows = rows
        .filter((r): r is Extract<TrialBalanceDetailedFlatRow, { type: "ledger" }> => r.type === "ledger")
        .map((r) => r.ledger);
      const groupMap = new Map<string, (typeof filteredDetailedGroups)[number]>();
      for (const ledger of ledgerRows) {
        if (!groupMap.has(ledger.groupKey)) {
          groupMap.set(ledger.groupKey, {
            groupKey: ledger.groupKey,
            groupName: ledger.groupName,
            sortOrder: ledger.groupSortOrder,
            primaryHead: ledger.primaryHead,
            primaryHeadId: ledger.primaryHeadId,
            primaryHeadSort: ledger.primaryHeadSort,
            openingDebit: 0,
            openingCredit: 0,
            debit: 0,
            credit: 0,
            closingDebit: 0,
            closingCredit: 0,
            ledgers: [],
          });
        }
        const group = groupMap.get(ledger.groupKey)!;
        group.ledgers.push(ledger);
        group.openingDebit = roundMoney(group.openingDebit + ledger.openingDebit);
        group.openingCredit = roundMoney(group.openingCredit + ledger.openingCredit);
        group.debit = roundMoney(group.debit + ledger.debit);
        group.credit = roundMoney(group.credit + ledger.credit);
        group.closingDebit = roundMoney(group.closingDebit + ledger.closingDebit);
        group.closingCredit = roundMoney(group.closingCredit + ledger.closingCredit);
      }
      return [...groupMap.values()];
    },
    [filteredDetailedGroups],
  );

  const summary = useMemo(() => {
    if (activeTab === "summary") {
      return computeTrialBalanceSummaryFromGroups(columnFilteredSummaryRows);
    }
    return computeTrialBalanceSummaryFromDetailedGroups(
      rebuildDetailedGroupsFromFlatRows(columnFilteredDetailedRows),
    );
  }, [
    activeTab,
    columnFilteredSummaryRows,
    columnFilteredDetailedRows,
    rebuildDetailedGroupsFromFlatRows,
  ]);

  const paginatedSummaryRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredSummaryRows.slice(start, start + pageSize);
  }, [columnFilteredSummaryRows, page, pageSize]);

  const paginatedDetailedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredDetailedRows.slice(start, start + pageSize);
  }, [columnFilteredDetailedRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (activeTab === "summary") {
        await exportTrialBalanceSummaryToExcel(
          columnFilteredSummaryRows,
          exportMeta,
          summary,
        );
      } else {
        await exportTrialBalanceDetailedToExcel(
          rebuildDetailedGroupsFromFlatRows(columnFilteredDetailedRows),
          exportMeta,
          summary,
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (activeTab === "summary") {
      exportTrialBalanceSummaryToPdf(
        columnFilteredSummaryRows,
        exportMeta,
        summary,
      );
    } else {
      exportTrialBalanceDetailedToPdf(
        rebuildDetailedGroupsFromFlatRows(columnFilteredDetailedRows),
        exportMeta,
        summary,
      );
    }
  };

  const totalRecords = columnFilteredRows.length;
  const recordLabel = activeTab === "summary" ? "groups" : "rows";
  const showEmpty = mounted && totalRecords === 0;
  const showTable = mounted && totalRecords > 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Trial Balance")}
      title="Trial Balance"
      description="Account group and ledger-wise trial balance for the selected period."
      hideDescription
      layout="split"
      className="trial-balance-compact h-full min-h-0"
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || !mounted || !hasExportData}
        />
      }
      filters={
        <ReportFilterRow className="items-end gap-2 flex-wrap">
          <ReportFinancialYearFilter
            value={financialYearId}
            onChange={onFinancialYearChange}
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
            values={branch}
            onChange={onBranchChange}
            options={branchOptions.length ? branchOptions : REPORT_BRANCH_OPTIONS}
          />
          <ReportMoreFilters activeCount={moreFiltersActiveCount}>
            <ReportWarehouseMultiFilter
              values={warehouse}
              onChange={onWarehouseChange}
              options={warehouseOptions}
            />
            <ReportLedgerGroupMultiFilter
              values={ledgerGroupIds}
              onChange={onLedgerGroupChange}
              groups={ledgerGroupOptions}
            />
            <ReportLedgerMultiFilter
              values={ledgerIds}
              onChange={onLedgerChange}
              ledgers={ledgerOptions}
            />
            <ReportShowZeroBalanceToggle
              checked={showZeroBalance}
              onChange={onShowZeroBalanceChange}
            />
          </ReportMoreFilters>
          <div className="space-y-0.5 min-w-[180px] flex-1">
            <Label className={filterLabelClass}>Search Ledger / Group</Label>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or code…"
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
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-sm px-2"
              onClick={resetFilters}
            >
              Reset
            </Button>
          )}
        </ReportFilterRow>
      }
    >
      {mounted && exceptions.length > 0 && (
        <TrialBalanceExceptionsPanel exceptions={exceptions} />
      )}
      <AccountsListingTableCard className="trial-balance-compact flex-1 min-h-0">
      <ReportFilterSummary items={filterSummaryItems} />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TrialBalanceTab)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="flex-shrink-0 bg-transparent border-b border-border px-1">
          <TabsTrigger value="summary" className="text-xs px-3 pb-2">
            Group Wise
          </TabsTrigger>
          <TabsTrigger value="detailed" className="text-xs px-3 pb-2">
            Detailed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <AccountsTableListing
            summary={
              <AccountsSummaryBar
                items={[
                  { label: "Total Debit", value: formatMoney(summary.totalDebit) },
                  { label: "Total Credit", value: formatMoney(summary.totalCredit) },
                  {
                    label: "Difference",
                    value: formatMoney(summary.isBalanced ? 0 : summary.difference),
                    warn: !summary.isBalanced,
                  },
                  { label: "Total Groups", value: String(summary.totalGroups) },
                ]}
              />
            }
            footer={
              <>
                {mounted && !summary.isBalanced && totalRecords > 0 && (
                  <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-50/70 border-t border-red-100 text-xs text-red-700 leading-tight">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Trial Balance is not balanced.
                  </div>
                )}
                {mounted && totalRecords > 0 && (
                  <AccountsTablePagination
                    page={page}
                    pageSize={pageSize}
                    totalRecords={totalRecords}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    recordLabel={recordLabel}
                  />
                )}
              </>
            }
          >
            {!mounted ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                Loading trial balance…
              </div>
            ) : showEmpty ? (
              <EmptyState hasFilters={hasFilters} onClear={resetFilters} />
            ) : showTable && activeTab === "summary" ? (
              <AccountsTable minWidth={900}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <SortTh label="Account Name" colKey="particular" />
                    <SortTh label="Opening Debit" colKey="openingDebit" filterType="amount" align="right" />
                    <SortTh label="Opening Credit" colKey="openingCredit" filterType="amount" align="right" />
                    <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
                    <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
                    <SortTh label="Closing Debit" colKey="closingDebit" filterType="amount" align="right" />
                    <SortTh label="Closing Credit" colKey="closingCredit" filterType="amount" align="right" />
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {paginatedSummaryRows.map((row, i, arr) => {
                    const showHead =
                      i === 0 || row.primaryHead !== arr[i - 1]?.primaryHead;
                    return (
                      <React.Fragment key={row.groupId}>
                        {showHead && (
                          <AccountsTableRow className="bg-muted/30">
                            <AccountsTableCell colSpan={7} className="font-bold text-foreground text-xs">
                              {row.primaryHead}
                            </AccountsTableCell>
                          </AccountsTableRow>
                        )}
                        <AccountsTableRow>
                          <AccountsTableCell className="font-semibold text-foreground pl-6">
                            {row.particular}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money>
                            {formatMoneyOrDash(row.openingDebit)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money>
                            {formatMoneyOrDash(row.openingCredit)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money>
                            {formatMoneyOrDash(row.debit)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money>
                            {formatMoneyOrDash(row.credit)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money>
                            {formatMoneyOrDash(row.closingDebit)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money>
                            {formatMoneyOrDash(row.closingCredit)}
                          </AccountsTableCell>
                        </AccountsTableRow>
                      </React.Fragment>
                    );
                  })}
                </AccountsTableBody>
                <AccountsTableFoot>
                  <AccountsTableRow>
                    <AccountsTableCell className="font-semibold text-foreground text-xs">
                      Grand Total
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="font-semibold">
                      {formatMoney(summary.openingDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="font-semibold">
                      {formatMoney(summary.openingCredit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.periodDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.periodCredit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.closingDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.closingCredit)}
                    </AccountsTableCell>
                  </AccountsTableRow>
                </AccountsTableFoot>
              </AccountsTable>
            ) : null}
          </AccountsTableListing>
        </TabsContent>

        <TabsContent value="detailed" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <AccountsTableListing
            summary={
              <AccountsSummaryBar
                items={[
                  { label: "Total Debit", value: formatMoney(summary.totalDebit) },
                  { label: "Total Credit", value: formatMoney(summary.totalCredit) },
                  {
                    label: "Difference",
                    value: formatMoney(summary.isBalanced ? 0 : summary.difference),
                    warn: !summary.isBalanced,
                  },
                  { label: "Total Ledgers", value: String(summary.totalLedgers) },
                ]}
              />
            }
            footer={
              <>
                {mounted && !summary.isBalanced && totalRecords > 0 && (
                  <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-50/70 border-t border-red-100 text-xs text-red-700 leading-tight">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Trial Balance is not balanced.
                  </div>
                )}
                {mounted && totalRecords > 0 && (
                  <AccountsTablePagination
                    page={page}
                    pageSize={pageSize}
                    totalRecords={totalRecords}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    recordLabel={recordLabel}
                  />
                )}
              </>
            }
          >
            {!mounted ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                Loading trial balance…
              </div>
            ) : showEmpty ? (
              <EmptyState hasFilters={hasFilters} onClear={resetFilters} />
            ) : showTable && activeTab === "detailed" ? (
              <AccountsTable minWidth={1100}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <SortTh label="Account Name" colKey="particular" />
                    <SortTh label="Opening Debit" colKey="openingDebit" filterType="amount" align="right" />
                    <SortTh label="Opening Credit" colKey="openingCredit" filterType="amount" align="right" />
                    <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
                    <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
                    <SortTh label="Closing Debit" colKey="closingDebit" filterType="amount" align="right" />
                    <SortTh label="Closing Credit" colKey="closingCredit" filterType="amount" align="right" />
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {paginatedDetailedRows.map((row, i) =>
                    row.type === "primary" ? (
                      <AccountsTableRow key={`p-${row.primaryHeadId}`} className="bg-muted/30">
                        <AccountsTableCell colSpan={7} className="!h-8">
                          <button
                            type="button"
                            onClick={() => togglePrimary(row.primaryHeadId)}
                            className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-brand-700 w-full text-left"
                          >
                            <ChevronRight
                              className={cn(
                                "w-4 h-4 flex-shrink-0 transition-transform",
                                expandedPrimaryIds.has(row.primaryHeadId) && "rotate-90",
                              )}
                            />
                            {row.primaryHead}
                          </button>
                        </AccountsTableCell>
                      </AccountsTableRow>
                    ) : row.type === "group" ? (
                      <AccountsTableRow key={`g-${row.groupKey}`} className="bg-muted/20">
                        <AccountsTableCell className="font-semibold text-foreground pl-6">
                          <button
                            type="button"
                            onClick={() => toggleGroup(row.groupKey)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-brand-700 w-full text-left"
                          >
                            <ChevronRight
                              className={cn(
                                "w-4 h-4 flex-shrink-0 transition-transform",
                                expandedGroupIds.has(row.groupKey) && "rotate-90",
                              )}
                            />
                            {row.groupName}
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              ({row.ledgerCount})
                            </span>
                          </button>
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.amounts.openingDebit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.amounts.openingCredit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.amounts.debit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.amounts.credit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.amounts.closingDebit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.amounts.closingCredit)}
                        </AccountsTableCell>
                      </AccountsTableRow>
                    ) : (
                      <AccountsTableRow key={`l-${row.ledger.ledgerId}-${i}`}>
                        <AccountsTableCell className="pl-12">
                          <Link
                            href={buildGeneralLedgerHref(row.ledger.ledgerId)}
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            {row.ledger.ledgerName}
                          </Link>
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.openingDebit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.openingCredit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.debit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.credit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.closingDebit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.closingCredit)}
                        </AccountsTableCell>
                      </AccountsTableRow>
                    ),
                  )}
                </AccountsTableBody>
                <AccountsTableFoot>
                  <AccountsTableRow>
                    <AccountsTableCell className="font-semibold text-foreground text-xs">
                      Grand Total
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="font-semibold">
                      {formatMoney(summary.openingDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="font-semibold">
                      {formatMoney(summary.openingCredit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.periodDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.periodCredit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.closingDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.closingCredit)}
                    </AccountsTableCell>
                  </AccountsTableRow>
                </AccountsTableFoot>
              </AccountsTable>
            ) : null}
          </AccountsTableListing>
        </TabsContent>
      </Tabs>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}

function TrialBalanceExceptionsPanel({
  exceptions,
}: {
  exceptions: TrialBalanceVoucherException[];
}) {
  return (
    <div className="flex-shrink-0 mb-2 rounded-lg border border-red-200 bg-red-50/70 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-red-100">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-red-700">
          Unbalanced Vouchers ({exceptions.length})
        </span>
        <span className="text-[11px] text-red-600/80">
          — these vouchers do not satisfy Total Debit = Total Credit and must be corrected at source.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-red-100/40 text-red-700">
              <th className="px-3 py-1.5 text-left font-semibold">Voucher No.</th>
              <th className="px-3 py-1.5 text-left font-semibold">Date</th>
              <th className="px-3 py-1.5 text-left font-semibold">Type</th>
              <th className="px-3 py-1.5 text-right font-semibold">Total Debit</th>
              <th className="px-3 py-1.5 text-right font-semibold">Total Credit</th>
              <th className="px-3 py-1.5 text-right font-semibold">Difference</th>
              <th className="px-3 py-1.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((ex) => (
              <tr key={ex.voucherId} className="border-t border-red-100">
                <td className="px-3 py-1.5 font-mono text-brand-700">{ex.voucherNo}</td>
                <td className="px-3 py-1.5 text-foreground">{ex.date}</td>
                <td className="px-3 py-1.5 text-foreground">{ex.voucherTypeLabel}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(ex.totalDebit)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(ex.totalCredit)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-red-600">
                  {formatMoney(ex.difference)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Link href={ex.viewHref} className="text-brand-700 hover:underline font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <div className="accounts-table-empty py-4 text-center">
      No records found.
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="block mx-auto mt-1 text-brand-600 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
