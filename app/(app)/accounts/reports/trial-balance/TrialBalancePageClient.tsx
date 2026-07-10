"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
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
  balanceSideLabel,
  formatMoney,
  formatMoneyOrDash,
} from "@/lib/accounts/money-format";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildTrialBalanceDetailedGroups,
  buildTrialBalanceDisplayRows,
  buildTrialBalanceSummaryRows,
  collectAllDetailedGroupKeys,
  computeTrialBalanceSummaryFromDetailedGroups,
  computeTrialBalanceSummaryFromGroups,
  filterTrialBalanceDetailedGroups,
  filterTrialBalanceSummaryRows,
  flattenTrialBalanceDetailedGroups,
  type TrialBalanceDetailedFlatRow,
  type TrialBalanceSummaryGroupRow,
  type TrialBalanceTab,
} from "./trial-balance-data";
import {
  exportTrialBalanceDetailedToExcel,
  exportTrialBalanceDetailedToPdf,
  exportTrialBalanceSummaryToExcel,
  exportTrialBalanceSummaryToPdf,
} from "./trial-balance-export";
import { useDebouncedValue } from "./trial-balance-hooks";
import "./trial-balance-compact.css";

const PLACEHOLDER_DATE = "2025-04-01";

export default function TrialBalancePageClient() {
  const mounted = useClientMounted();

  const [activeTab, setActiveTab] = useState<TrialBalanceTab>("summary");
  const [preset, setPreset] = useState<DateRangePresetId>("this_month");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const { from, to } = resolveDateRangePreset("this_month");
    setDateFrom(from);
    setDateTo(to);
    setDatesReady(true);
  }, []);

  const handlePresetChange = useCallback((value: DateRangePresetId) => {
    setPreset(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const sourceLedgers = useMemo(() => {
    if (!mounted) return [];
    return buildTrialBalanceDisplayRows();
  }, [mounted]);

  const sourceSummaryRows = useMemo(() => {
    if (!mounted || activeTab !== "summary") return [];
    return buildTrialBalanceSummaryRows();
  }, [mounted, activeTab]);

  const sourceDetailedGroups = useMemo(() => {
    if (!mounted || activeTab !== "detailed") return [];
    return buildTrialBalanceDetailedGroups();
  }, [mounted, activeTab]);

  useEffect(() => {
    if (!mounted || sourceDetailedGroups.length === 0) return;
    if (debouncedSearch.trim()) {
      const filtered = filterTrialBalanceDetailedGroups(sourceDetailedGroups, {
        search: debouncedSearch,
      });
      setExpandedGroupIds(collectAllDetailedGroupKeys(filtered));
      return;
    }
    setExpandedGroupIds(collectAllDetailedGroupKeys(sourceDetailedGroups));
  }, [mounted, sourceDetailedGroups, debouncedSearch]);

  const filteredSummaryRows = useMemo(
    () => filterTrialBalanceSummaryRows(sourceSummaryRows, { search: debouncedSearch }, sourceLedgers),
    [sourceSummaryRows, sourceLedgers, debouncedSearch],
  );

  const filteredDetailedGroups = useMemo(
    () => filterTrialBalanceDetailedGroups(sourceDetailedGroups, { search: debouncedSearch }),
    [sourceDetailedGroups, debouncedSearch],
  );

  const detailedFlatRows = useMemo(
    () => flattenTrialBalanceDetailedGroups(filteredDetailedGroups, expandedGroupIds),
    [filteredDetailedGroups, expandedGroupIds],
  );

  const providerRows = useMemo(
    () => (activeTab === "summary" ? filteredSummaryRows : detailedFlatRows),
    [activeTab, filteredSummaryRows, detailedFlatRows],
  );

  const getCellValue = useCallback(
    (row: TrialBalanceSummaryGroupRow | TrialBalanceDetailedFlatRow, key: string) => {
      if (activeTab === "summary") {
        return (row as TrialBalanceSummaryGroupRow)[key as keyof TrialBalanceSummaryGroupRow];
      }
      const flat = row as TrialBalanceDetailedFlatRow;
      if (flat.type === "group") {
        if (key === "particular") return flat.groupName;
        return "";
      }
      const ledger = flat.ledger;
      switch (key) {
        case "particular":
          return ledger.ledgerName;
        case "opening":
          return ledger.openingAmount;
        case "debit":
          return ledger.debit;
        case "credit":
          return ledger.credit;
        case "closing":
          return ledger.closingAmount;
        case "balanceType":
          return ledger.closingBalanceType;
        default:
          return "";
      }
    },
    [activeTab],
  );

  const columnConfig = useMemo(
    (): AccountsColumnFilterConfig => ({
      particular: { type: "text" },
      debit: { type: "amount" },
      credit: { type: "amount" },
      opening: { type: "amount" },
      closing: { type: "amount" },
      balanceType: { type: "text" },
    }),
    [],
  );

  const hasFilters =
    Boolean(search.trim()) ||
    (datesReady && preset !== "this_month");

  const resetFilters = useCallback(() => {
    setSearch("");
    setPreset("this_month");
    const { from, to } = resolveDateRangePreset("this_month");
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, activeTab]);

  

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
      view: activeTab,
    }),
    [dateFrom, dateTo, activeTab],
  );

  const hasExportData =
    activeTab === "summary"
      ? filteredSummaryRows.length > 0
      : filteredDetailedGroups.length > 0;

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
        sourceLedgers={sourceLedgers}
        expandedGroupIds={expandedGroupIds}
        toggleGroup={toggleGroup}
        hasFilters={hasFilters}
        resetFilters={resetFilters}
        preset={preset}
        handlePresetChange={handlePresetChange}
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
  sourceLedgers,
  expandedGroupIds,
  toggleGroup,
  hasFilters,
  resetFilters,
  preset,
  handlePresetChange,
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
}: {
  mounted: boolean;
  activeTab: TrialBalanceTab;
  setActiveTab: (v: TrialBalanceTab) => void;
  filteredSummaryRows: TrialBalanceSummaryGroupRow[];
  filteredDetailedGroups: ReturnType<typeof buildTrialBalanceDetailedGroups>;
  detailedFlatRows: TrialBalanceDetailedFlatRow[];
  sourceLedgers: ReturnType<typeof buildTrialBalanceDisplayRows>;
  expandedGroupIds: Set<string>;
  toggleGroup: (groupKey: string) => void;
  hasFilters: boolean;
  resetFilters: () => void;
  preset: DateRangePresetId;
  handlePresetChange: (value: DateRangePresetId) => void;
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
            ledgers: [],
          });
        }
        groupMap.get(ledger.groupKey)!.ledgers.push(ledger);
      }
      return [...groupMap.values()];
    },
    [filteredDetailedGroups],
  );

  const summary = useMemo(() => {
    if (activeTab === "summary") {
      return computeTrialBalanceSummaryFromGroups(
        columnFilteredSummaryRows,
        sourceLedgers,
      );
    }
    return computeTrialBalanceSummaryFromDetailedGroups(
      rebuildDetailedGroupsFromFlatRows(columnFilteredDetailedRows),
    );
  }, [
    activeTab,
    columnFilteredSummaryRows,
    columnFilteredDetailedRows,
    sourceLedgers,
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
        <ReportFilterRow className="items-end gap-2">
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={handlePresetChange}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
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
      <AccountsListingTableCard className="trial-balance-compact flex-1 min-h-0">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TrialBalanceTab)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="flex-shrink-0 bg-transparent border-b border-border px-1">
          <TabsTrigger value="summary" className="text-xs px-3 pb-2">
            Summary
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
              <AccountsTable minWidth={520}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <SortTh label="Particular" colKey="particular" />
                    <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
                    <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {paginatedSummaryRows.map((row) => (
                    <AccountsTableRow key={row.groupId}>
                      <AccountsTableCell className="font-semibold text-foreground">
                        {row.particular}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoneyOrDash(row.debit)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoneyOrDash(row.credit)}
                      </AccountsTableCell>
                    </AccountsTableRow>
                  ))}
                </AccountsTableBody>
                <AccountsTableFoot>
                  <AccountsTableRow>
                    <AccountsTableCell className="font-semibold text-foreground text-xs">
                      Grand Total
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.totalDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.totalCredit)}
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
              <AccountsTable minWidth={900}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <SortTh label="Particular" colKey="particular" />
                    <SortTh label="Opening Balance" colKey="opening" filterType="amount" align="right" />
                    <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
                    <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
                    <SortTh label="Closing Balance" colKey="closing" filterType="amount" align="right" />
                    <SortTh label="Balance Type" colKey="balanceType" align="center" />
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {paginatedDetailedRows.map((row, i) =>
                    row.type === "group" ? (
                      <AccountsTableRow key={`g-${row.groupKey}`} className="bg-muted/20">
                        <AccountsTableCell colSpan={6} className="!h-8">
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
                      </AccountsTableRow>
                    ) : (
                      <AccountsTableRow key={`l-${row.ledger.ledgerId}-${i}`}>
                        <AccountsTableCell className="pl-8">
                          <Link
                            href={buildGeneralLedgerHref(row.ledger.ledgerId)}
                            className="text-xs font-semibold text-brand-700 hover:underline"
                          >
                            {row.ledger.ledgerName}
                          </Link>
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.openingAmount)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.debit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.credit)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoneyOrDash(row.ledger.closingAmount)}
                        </AccountsTableCell>
                        <AccountsTableCell align="center">
                          <span className="text-xs font-medium text-muted-foreground">
                            {balanceSideLabel(row.ledger.closingBalanceType)}
                          </span>
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
                    <AccountsTableCell />
                    <AccountsTableCell
                      align="right"
                      money
                      className="font-semibold"
                    >
                      {formatMoney(summary.periodDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className="font-semibold"
                    >
                      {formatMoney(summary.periodCredit)}
                    </AccountsTableCell>
                    <AccountsTableCell colSpan={2} />
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
