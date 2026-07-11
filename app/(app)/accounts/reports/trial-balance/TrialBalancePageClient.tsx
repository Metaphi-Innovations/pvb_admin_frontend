"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
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
  ReportLedgerGroupMultiFilter,
  ReportLedgerMultiFilter,
  ReportShowZeroBalanceToggle,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportTrialBalanceViewTypeFilter,
  ReportIncludeOpeningBalanceToggle,
  ReportFromDateFilter,
  ReportToDateFilter,
  ReportParticularSearchFilter,
  ReportVoucherTypeMultiFilter,
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
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildTrialBalanceDetailedGroups,
  collectAllDetailedGroupKeys,
  collectAllDetailedSubgroupKeys,
  collectAllPrimaryHeadKeys,
  computeTrialBalanceSummaryFromDetailedGroups,
  filterTrialBalanceDetailedGroups,
  findTrialBalanceExceptions,
  flattenTrialBalanceDetailedGroups,
  getTrialBalanceBranchOptions,
  getTrialBalanceLedgerGroupOptions,
  getTrialBalanceLedgerOptions,
  type TrialBalanceDetailedFlatRow,
  type TrialBalanceFilters,
  type TrialBalanceTab,
  type TrialBalanceVoucherException,
} from "./trial-balance-data";
import {
  balanceSideAbbrev,
  flattenTrialBalanceNormalRows,
  netBalanceFromSplit,
  TB_DETAILED_INDENT,
  TB_NORMAL_INDENT,
  type TrialBalanceNormalFlatRow,
} from "./trial-balance-display";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  exportTrialBalanceDetailedToExcel,
  exportTrialBalanceDetailedToPdf,
  exportTrialBalanceNormalToExcel,
  exportTrialBalanceNormalToPdf,
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

function rowKey(
  row: TrialBalanceNormalFlatRow | TrialBalanceDetailedFlatRow,
  index: number,
): string {
  if ("type" in row) {
    if (row.type === "primary") return `p-${row.primaryHeadId}`;
    if (row.type === "group") return `g-${row.groupKey}`;
    if (row.type === "subgroup") return `sg-${row.subgroupKey}`;
    if (row.type === "ledger") return `l-${row.ledger.ledgerId}`;
  }
  return `row-${index}`;
}

function BalanceStatusBanner({
  isBalanced,
  difference,
  visible,
}: {
  isBalanced: boolean;
  difference: number;
  visible: boolean;
}) {
  if (!visible) return null;
  if (isBalanced) {
    return (
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        Trial Balance is balanced
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border-t border-red-100 text-xs text-red-700">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      Trial Balance is not balanced — Difference: {formatMoney(difference)}
    </div>
  );
}

function DetailedAmountCells({
  amounts,
  bold,
  includeOpening,
}: {
  amounts: {
    openingDebit: number;
    openingCredit: number;
    debit: number;
    credit: number;
    closingDebit: number;
    closingCredit: number;
  };
  bold?: boolean;
  includeOpening: boolean;
}) {
  const opening = netBalanceFromSplit(amounts.openingDebit, amounts.openingCredit);
  const closing = netBalanceFromSplit(amounts.closingDebit, amounts.closingCredit);
  const cellClass = bold ? "font-semibold" : undefined;

  return (
    <>
      {includeOpening ? (
        <>
          <AccountsTableCell align="right" money className={cellClass}>
            {opening.amount ? formatMoney(opening.amount) : "—"}
          </AccountsTableCell>
          <AccountsTableCell align="center" className={cn("text-xs", cellClass)}>
            {balanceSideAbbrev(opening.side)}
          </AccountsTableCell>
        </>
      ) : (
        <>
          <AccountsTableCell align="right" className={cellClass}>
            —
          </AccountsTableCell>
          <AccountsTableCell align="center" className={cellClass}>
            —
          </AccountsTableCell>
        </>
      )}
      <AccountsTableCell align="right" money className={cellClass}>
        {formatMoneyOrDash(amounts.debit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cellClass}>
        {formatMoneyOrDash(amounts.credit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cellClass}>
        {closing.amount ? formatMoney(closing.amount) : "—"}
      </AccountsTableCell>
      <AccountsTableCell align="center" className={cn("text-xs", cellClass)}>
        {balanceSideAbbrev(closing.side)}
      </AccountsTableCell>
    </>
  );
}

export default function TrialBalancePageClient() {
  const mounted = useClientMounted();

  const [activeTab, setActiveTab] = useState<TrialBalanceTab>("normal");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [ledgerGroupIds, setLedgerGroupIds] = useState<string[]>([]);
  const [ledgerIds, setLedgerIds] = useState<string[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const [expandedPrimaryIds, setExpandedPrimaryIds] = useState<Set<number>>(new Set());
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [expandedSubgroupIds, setExpandedSubgroupIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebouncedValue(search, 300);

  const effectiveBranches = branches;

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
    branch: effectiveBranches,
    warehouse: [],
    ledgerGroupId: ledgerGroupIds,
    ledgerId: ledgerIds,
    showZeroBalance,
    search: debouncedSearch,
  }), [
    financialYearId,
    dateFrom,
    dateTo,
    effectiveBranches,
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

  const ledgerGroupSelectOptions = useMemo(
    () => ledgerGroupOptions.map((g) => ({ value: String(g.id), label: g.name })),
    [ledgerGroupOptions],
  );
  const ledgerSelectOptions = useMemo(
    () => ledgerOptions.map((l) => ({ value: String(l.id), label: l.name })),
    [ledgerOptions],
  );

  const moreFiltersActiveCount =
    countActiveMoreFilters({
      ledgerGroupId: ledgerGroupIds,
      ledgerId: ledgerIds,
      voucherType: voucherTypes,
      showZeroBalance,
    }) + (!includeOpeningBalance ? 1 : 0);

  const exceptions = useMemo(
    () => (mounted ? findTrialBalanceExceptions(tbFilters) : []),
    [mounted, tbFilters],
  );

  const sourceDetailedGroups = useMemo(() => {
    if (!mounted) return [];
    return buildTrialBalanceDetailedGroups(tbFilters);
  }, [mounted, tbFilters]);

  useEffect(() => {
    if (!mounted || sourceDetailedGroups.length === 0) return;
    if (debouncedSearch.trim()) {
      const filtered = filterTrialBalanceDetailedGroups(sourceDetailedGroups, {
        search: debouncedSearch,
      });
      setExpandedPrimaryIds(collectAllPrimaryHeadKeys(filtered));
      setExpandedGroupIds(collectAllDetailedGroupKeys(filtered));
      setExpandedSubgroupIds(collectAllDetailedSubgroupKeys(filtered));
      return;
    }
    setExpandedPrimaryIds(collectAllPrimaryHeadKeys(sourceDetailedGroups));
    setExpandedGroupIds(collectAllDetailedGroupKeys(sourceDetailedGroups));
    setExpandedSubgroupIds(collectAllDetailedSubgroupKeys(sourceDetailedGroups));
  }, [mounted, sourceDetailedGroups, debouncedSearch]);

  const filteredDetailedGroups = useMemo(
    () => filterTrialBalanceDetailedGroups(sourceDetailedGroups, { search: debouncedSearch }),
    [sourceDetailedGroups, debouncedSearch],
  );

  const normalFlatRows = useMemo(
    () => flattenTrialBalanceNormalRows(filteredDetailedGroups),
    [filteredDetailedGroups],
  );

  const detailedFlatRows = useMemo(
    () =>
      flattenTrialBalanceDetailedGroups(
        filteredDetailedGroups,
        expandedPrimaryIds,
        expandedGroupIds,
        expandedSubgroupIds,
      ),
    [filteredDetailedGroups, expandedPrimaryIds, expandedGroupIds, expandedSubgroupIds],
  );

  const providerRows = useMemo(
    () => (activeTab === "normal" ? normalFlatRows : detailedFlatRows),
    [activeTab, normalFlatRows, detailedFlatRows],
  );

  const getCellValue = useCallback(
    (row: TrialBalanceNormalFlatRow | TrialBalanceDetailedFlatRow, key: string) => {
      if (activeTab === "normal") {
        const normalRow = row as TrialBalanceNormalFlatRow;
        if (normalRow.type === "primary") {
          if (key === "particular") return normalRow.primaryHead;
          if (key === "debit") return normalRow.debit;
          if (key === "credit") return normalRow.credit;
          return "";
        }
        if (normalRow.type === "group") {
          if (key === "particular") return normalRow.groupName;
          if (key === "debit") return normalRow.debit;
          if (key === "credit") return normalRow.credit;
          return "";
        }
        if (normalRow.type === "subgroup") {
          if (key === "particular") return normalRow.subgroupName;
          if (key === "debit") return normalRow.debit;
          if (key === "credit") return normalRow.credit;
          return "";
        }
        const ledger = normalRow.ledger;
        if (key === "particular") return ledger.ledgerName;
        if (key === "debit") return ledger.closingDebit;
        if (key === "credit") return ledger.closingCredit;
        return "";
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
      if (flat.type === "subgroup") {
        if (key === "particular") return flat.subgroupName;
        return flat.amounts[key as keyof typeof flat.amounts] ?? "";
      }
      const ledger = flat.ledger;
      if (key === "particular") return ledger.ledgerName;
      return ledger[key as keyof typeof ledger] ?? "";
    },
    [activeTab],
  );

  const columnConfig = useMemo((): AccountsColumnFilterConfig => {
    if (activeTab === "normal") {
      return {
        particular: { type: "text" },
        debit: { type: "amount" },
        credit: { type: "amount" },
      };
    }
    return {
      particular: { type: "text" },
      openingDebit: { type: "amount" },
      debit: { type: "amount" },
      credit: { type: "amount" },
      closingDebit: { type: "amount" },
    };
  }, [activeTab]);

  const hasFilters =
    Boolean(search.trim()) ||
    isMultiFilterActive(branches) ||
    isMultiFilterActive(ledgerGroupIds) ||
    isMultiFilterActive(ledgerIds) ||
    isMultiFilterActive(voucherTypes) ||
    showZeroBalance ||
    !includeOpeningBalance ||
    (datesReady && financialYearId !== defaultFyDateRange().fyId);

  const resetFilters = useCallback(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setSearch("");
    setPreset("custom");
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setBranches([]);
    setLedgerGroupIds([]);
    setLedgerIds([]);
    setVoucherTypes([]);
    setShowZeroBalance(false);
    setIncludeOpeningBalance(true);
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    pageSize,
    activeTab,
    financialYearId,
    dateFrom,
    dateTo,
    branches,
    ledgerGroupIds,
    ledgerIds,
    voucherTypes,
    showZeroBalance,
    includeOpeningBalance,
  ]);

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
      branch:
        effectiveBranches.length === 0
          ? ""
          : formatMultiSelectLabel(
              effectiveBranches,
              branchOptions.map((b) => ({ value: b, label: b })),
              "Branch",
            ),
      includeOpeningBalance,
    }),
    [dateFrom, dateTo, activeTab, financialYearLabel, effectiveBranches, branchOptions, includeOpeningBalance],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
      [
        {
          id: "period",
          label: "Period",
          value: `${dateFrom} to ${dateTo}`,
        },
        buildBranchFilterSummary(effectiveBranches, () => setBranches([])),
        buildEntityFilterSummary(
          "ledgerGroup",
          "Ledger Group",
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
              value: "Included",
              onRemove: () => setShowZeroBalance(false),
            }
          : null,
        !includeOpeningBalance
          ? {
              id: "openingBalance",
              label: "Opening balance",
              value: "Hidden",
              onRemove: () => setIncludeOpeningBalance(true),
            }
          : null,
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [
      dateFrom,
      dateTo,
      effectiveBranches,
      ledgerGroupIds,
      ledgerGroupSelectOptions,
      ledgerIds,
      ledgerSelectOptions,
      showZeroBalance,
      includeOpeningBalance,
    ],
  );

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

  const toggleSubgroup = useCallback((subgroupKey: string) => {
    setExpandedSubgroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(subgroupKey)) next.delete(subgroupKey);
      else next.add(subgroupKey);
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
        filteredDetailedGroups={filteredDetailedGroups}
        normalFlatRows={normalFlatRows}
        detailedFlatRows={detailedFlatRows}
        expandedPrimaryIds={expandedPrimaryIds}
        expandedGroupIds={expandedGroupIds}
        expandedSubgroupIds={expandedSubgroupIds}
        togglePrimary={togglePrimary}
        toggleGroup={toggleGroup}
        toggleSubgroup={toggleSubgroup}
        hasFilters={hasFilters}
        resetFilters={resetFilters}
        preset={preset}
        handlePresetChange={handlePresetChange}
        financialYearId={financialYearId}
        onFinancialYearChange={handleFinancialYearChange}
        branch={branches}
        onBranchChange={setBranches}
        ledgerGroupIds={ledgerGroupIds}
        onLedgerGroupChange={handleLedgerGroupChange}
        ledgerIds={ledgerIds}
        onLedgerChange={setLedgerIds}
        voucherTypes={voucherTypes}
        onVoucherTypesChange={setVoucherTypes}
        showZeroBalance={showZeroBalance}
        onShowZeroBalanceChange={setShowZeroBalance}
        includeOpeningBalance={includeOpeningBalance}
        onIncludeOpeningBalanceChange={setIncludeOpeningBalance}
        moreFiltersActiveCount={moreFiltersActiveCount}
        filterSummaryItems={filterSummaryItems}
        ledgerGroupOptions={ledgerGroupOptions}
        ledgerOptions={ledgerOptions}
        branchOptions={branchOptions}
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
        exceptions={exceptions}
      />
    </AccountsColumnFilterProvider>
  );
}

function TrialBalancePageBody({
  mounted,
  activeTab,
  setActiveTab,
  filteredDetailedGroups,
  normalFlatRows,
  detailedFlatRows,
  expandedPrimaryIds,
  expandedGroupIds,
  expandedSubgroupIds,
  togglePrimary,
  toggleGroup,
  toggleSubgroup,
  hasFilters,
  resetFilters,
  preset,
  handlePresetChange,
  financialYearId,
  onFinancialYearChange,
  branch,
  onBranchChange,
  ledgerGroupIds,
  onLedgerGroupChange,
  ledgerIds,
  onLedgerChange,
  voucherTypes,
  onVoucherTypesChange,
  showZeroBalance,
  onShowZeroBalanceChange,
  includeOpeningBalance,
  onIncludeOpeningBalanceChange,
  moreFiltersActiveCount,
  filterSummaryItems,
  ledgerGroupOptions,
  ledgerOptions,
  branchOptions,
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
  exceptions,
}: {
  mounted: boolean;
  activeTab: TrialBalanceTab;
  setActiveTab: (v: TrialBalanceTab) => void;
  filteredDetailedGroups: ReturnType<typeof buildTrialBalanceDetailedGroups>;
  normalFlatRows: TrialBalanceNormalFlatRow[];
  detailedFlatRows: TrialBalanceDetailedFlatRow[];
  expandedPrimaryIds: Set<number>;
  expandedGroupIds: Set<string>;
  expandedSubgroupIds: Set<string>;
  togglePrimary: (id: number) => void;
  toggleGroup: (groupKey: string) => void;
  toggleSubgroup: (subgroupKey: string) => void;
  hasFilters: boolean;
  resetFilters: () => void;
  preset: DateRangePresetId;
  handlePresetChange: (value: DateRangePresetId) => void;
  financialYearId: string;
  onFinancialYearChange: (value: string) => void;
  branch: string[];
  onBranchChange: (value: string[]) => void;
  ledgerGroupIds: string[];
  onLedgerGroupChange: (value: string[]) => void;
  ledgerIds: string[];
  onLedgerChange: (value: string[]) => void;
  voucherTypes: string[];
  onVoucherTypesChange: (value: string[]) => void;
  showZeroBalance: boolean;
  onShowZeroBalanceChange: (value: boolean) => void;
  includeOpeningBalance: boolean;
  onIncludeOpeningBalanceChange: (value: boolean) => void;
  moreFiltersActiveCount: number;
  filterSummaryItems: ReportFilterSummaryItem[];
  ledgerGroupOptions: { id: number; name: string }[];
  ledgerOptions: { id: number; name: string }[];
  branchOptions: string[];
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
  exportMeta: Parameters<typeof exportTrialBalanceNormalToExcel>[1];
  exceptions: TrialBalanceVoucherException[];
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredNormalRows = useAccountsFilteredRows(normalFlatRows);
  const columnFilteredDetailedRows = useAccountsFilteredRows(detailedFlatRows);
  const columnFilteredRows =
    activeTab === "normal" ? columnFilteredNormalRows : columnFilteredDetailedRows;

  const summary = useMemo(
    () => computeTrialBalanceSummaryFromDetailedGroups(filteredDetailedGroups),
    [filteredDetailedGroups],
  );

  const paginatedNormalRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredNormalRows.slice(start, start + pageSize);
  }, [columnFilteredNormalRows, page, pageSize]);

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
      if (activeTab === "normal") {
        await exportTrialBalanceNormalToExcel(filteredDetailedGroups, exportMeta, summary);
      } else {
        await exportTrialBalanceDetailedToExcel(filteredDetailedGroups, exportMeta, summary);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (activeTab === "normal") {
      exportTrialBalanceNormalToPdf(filteredDetailedGroups, exportMeta, summary);
    } else {
      exportTrialBalanceDetailedToPdf(filteredDetailedGroups, exportMeta, summary);
    }
  };

  const totalRecords = columnFilteredRows.length;
  const recordLabel = activeTab === "normal" ? "rows" : "rows";
  const showEmpty = mounted && totalRecords === 0;
  const showTable = mounted && totalRecords > 0;
  const hasExportData = filteredDetailedGroups.length > 0;

  const openingTotal = netBalanceFromSplit(summary.openingDebit, summary.openingCredit);
  const closingTotal = netBalanceFromSplit(summary.closingDebit, summary.closingCredit);

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
        <ReportFilterRow className="items-end gap-x-2 gap-y-2.5">
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
            inlineCustomDates={false}
          />
          <ReportFromDateFilter value={dateFrom} onChange={setDateFrom} />
          <ReportToDateFilter value={dateTo} onChange={setDateTo} />
          <ReportBranchMultiFilter
            values={branch}
            onChange={onBranchChange}
            options={branchOptions.length ? branchOptions : REPORT_BRANCH_OPTIONS}
          />
          <ReportTrialBalanceViewTypeFilter value={activeTab} onChange={setActiveTab} />
          <ReportParticularSearchFilter value={search} onChange={setSearch} />
          <ReportMoreFilters activeCount={moreFiltersActiveCount}>
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
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={onVoucherTypesChange}
            />
            <ReportShowZeroBalanceToggle
              checked={showZeroBalance}
              onChange={onShowZeroBalanceChange}
            />
            <ReportIncludeOpeningBalanceToggle
              checked={includeOpeningBalance}
              onChange={onIncludeOpeningBalanceChange}
            />
            <ReportBranchMultiFilter
              values={branch}
              onChange={onBranchChange}
              options={branchOptions.length ? branchOptions : REPORT_BRANCH_OPTIONS}
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
      {mounted && exceptions.length > 0 && (
        <TrialBalanceExceptionsPanel exceptions={exceptions} />
      )}
      <AccountsListingTableCard className="trial-balance-compact flex-1 min-h-0">
        <ReportFilterSummary items={filterSummaryItems} />
        <AccountsTableListing
          footer={
            <>
              <BalanceStatusBanner
                isBalanced={summary.isBalanced}
                difference={summary.difference}
                visible={mounted && totalRecords > 0}
              />
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
          ) : showTable && activeTab === "normal" ? (
            <AccountsTable minWidth={720}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="Particular" colKey="particular" className="min-w-[280px]" />
                  <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
                  <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {paginatedNormalRows.map((row, i) => {
                  if (row.type === "primary") {
                    return (
                      <AccountsTableRow
                        key={rowKey(row, i)}
                        className="bg-muted/40 border-b border-border/80"
                      >
                        <AccountsTableCell
                          className={cn(
                            TB_NORMAL_INDENT.primary,
                            "font-bold text-foreground",
                          )}
                        >
                          {row.primaryHead}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.debit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.credit)}
                        </AccountsTableCell>
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "group") {
                    return (
                      <AccountsTableRow key={rowKey(row, i)} className="bg-muted/20">
                        <AccountsTableCell
                          className={cn(TB_NORMAL_INDENT.group, "font-bold text-foreground")}
                        >
                          {row.groupName}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.debit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money className="font-semibold">
                          {formatMoneyOrDash(row.credit)}
                        </AccountsTableCell>
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "subgroup") {
                    return (
                      <AccountsTableRow key={rowKey(row, i)}>
                        <AccountsTableCell
                          className={cn(
                            TB_NORMAL_INDENT.subgroup,
                            "font-semibold text-foreground",
                          )}
                        >
                          {row.subgroupName}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.debit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.credit)}
                        </AccountsTableCell>
                      </AccountsTableRow>
                    );
                  }
                  return (
                    <AccountsTableRow key={rowKey(row, i)}>
                      <AccountsTableCell className={TB_NORMAL_INDENT.ledger}>
                        <Link
                          href={buildGeneralLedgerHref(row.ledger.ledgerId)}
                          className="text-xs font-normal text-brand-700 hover:underline"
                        >
                          {row.ledger.ledgerName}
                        </Link>
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoneyOrDash(row.ledger.closingDebit)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoneyOrDash(row.ledger.closingCredit)}
                      </AccountsTableCell>
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
                    className={cn("font-bold", !summary.isBalanced && "text-red-600")}
                  >
                    {formatMoney(summary.totalDebit)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", !summary.isBalanced && "text-red-600")}
                  >
                    {formatMoney(summary.totalCredit)}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          ) : showTable && activeTab === "detailed" ? (
            <AccountsTable minWidth={980}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="Particular" colKey="particular" className="min-w-[260px]" />
                  <SortTh
                    label="Opening Balance"
                    colKey="openingDebit"
                    filterType="amount"
                    align="right"
                  />
                  <th className="accounts-table-th text-center w-14">
                    <span className="text-xs font-semibold text-foreground">Dr/Cr</span>
                  </th>
                  <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
                  <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
                  <SortTh
                    label="Closing Balance"
                    colKey="closingDebit"
                    filterType="amount"
                    align="right"
                  />
                  <th className="accounts-table-th text-center w-14">
                    <span className="text-xs font-semibold text-foreground">Dr/Cr</span>
                  </th>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {paginatedDetailedRows.map((row, i) => {
                  if (row.type === "primary") {
                    return (
                      <AccountsTableRow
                        key={rowKey(row, i)}
                        className="bg-muted/40 border-b border-border/80"
                      >
                        <AccountsTableCell className={TB_DETAILED_INDENT.primary}>
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
                        <DetailedAmountCells
                          amounts={row.amounts}
                          bold
                          includeOpening={includeOpeningBalance}
                        />
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "group") {
                    return (
                      <AccountsTableRow key={rowKey(row, i)} className="bg-muted/20">
                        <AccountsTableCell className={TB_DETAILED_INDENT.group}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(row.groupKey)}
                            className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-brand-700 w-full text-left"
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
                        <DetailedAmountCells
                          amounts={row.amounts}
                          bold
                          includeOpening={includeOpeningBalance}
                        />
                      </AccountsTableRow>
                    );
                  }
                  if (row.type === "subgroup") {
                    return (
                      <AccountsTableRow key={rowKey(row, i)}>
                        <AccountsTableCell className={TB_DETAILED_INDENT.subgroup}>
                          <button
                            type="button"
                            onClick={() => toggleSubgroup(row.subgroupKey)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-brand-700 w-full text-left"
                          >
                            <ChevronRight
                              className={cn(
                                "w-4 h-4 flex-shrink-0 transition-transform",
                                expandedSubgroupIds.has(row.subgroupKey) && "rotate-90",
                              )}
                            />
                            {row.subgroupName}
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              ({row.ledgerCount})
                            </span>
                          </button>
                        </AccountsTableCell>
                        <DetailedAmountCells
                          amounts={row.amounts}
                          includeOpening={includeOpeningBalance}
                        />
                      </AccountsTableRow>
                    );
                  }
                  return (
                    <AccountsTableRow key={rowKey(row, i)}>
                      <AccountsTableCell className={TB_DETAILED_INDENT.ledger}>
                        <Link
                          href={buildGeneralLedgerHref(row.ledger.ledgerId)}
                          className="text-xs font-normal text-brand-700 hover:underline"
                        >
                          {row.ledger.ledgerName}
                        </Link>
                      </AccountsTableCell>
                      <DetailedAmountCells
                        amounts={row.ledger}
                        includeOpening={includeOpeningBalance}
                      />
                    </AccountsTableRow>
                  );
                })}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="border-t-2 border-foreground/20">
                  <AccountsTableCell className="font-bold text-foreground text-xs">
                    TOTAL
                  </AccountsTableCell>
                  {includeOpeningBalance ? (
                    <>
                      <AccountsTableCell align="right" money className="font-bold">
                        {openingTotal.amount ? formatMoney(openingTotal.amount) : "—"}
                      </AccountsTableCell>
                      <AccountsTableCell align="center" className="font-bold text-xs">
                        {balanceSideAbbrev(openingTotal.side)}
                      </AccountsTableCell>
                    </>
                  ) : (
                    <>
                      <AccountsTableCell align="right" className="font-bold">
                        —
                      </AccountsTableCell>
                      <AccountsTableCell align="center" className="font-bold">
                        —
                      </AccountsTableCell>
                    </>
                  )}
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", !summary.isBalanced && "text-red-600")}
                  >
                    {formatMoney(summary.periodDebit)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", !summary.isBalanced && "text-red-600")}
                  >
                    {formatMoney(summary.periodCredit)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className="font-bold">
                    {closingTotal.amount ? formatMoney(closingTotal.amount) : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="center" className="font-bold text-xs">
                    {balanceSideAbbrev(closingTotal.side)}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          ) : null}
        </AccountsTableListing>
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
