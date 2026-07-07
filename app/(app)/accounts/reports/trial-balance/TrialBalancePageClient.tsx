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
import { SortTh } from "@/app/(app)/accounts/components/AccountsUI";
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
  sortTrialBalanceDetailedGroups,
  sortTrialBalanceSummaryRows,
  type TrialBalanceDetailedSortKey,
  type TrialBalanceSummarySortKey,
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

  const [summarySortKey, setSummarySortKey] = useState<TrialBalanceSummarySortKey>("particular");
  const [summarySortDir, setSummarySortDir] = useState<"asc" | "desc">("asc");
  const [detailedSortKey, setDetailedSortKey] = useState<TrialBalanceDetailedSortKey>("particular");
  const [detailedSortDir, setDetailedSortDir] = useState<"asc" | "desc">("asc");
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

  const filteredSummaryRows = useMemo(() => {
    const filtered = filterTrialBalanceSummaryRows(sourceSummaryRows, { search: debouncedSearch }, sourceLedgers);
    return sortTrialBalanceSummaryRows(filtered, summarySortKey, summarySortDir);
  }, [sourceSummaryRows, sourceLedgers, debouncedSearch, summarySortKey, summarySortDir]);

  const filteredDetailedGroups = useMemo(() => {
    const filtered = filterTrialBalanceDetailedGroups(sourceDetailedGroups, { search: debouncedSearch });
    return sortTrialBalanceDetailedGroups(filtered, detailedSortKey, detailedSortDir);
  }, [sourceDetailedGroups, debouncedSearch, detailedSortKey, detailedSortDir]);

  const summary = useMemo(() => {
    if (activeTab === "summary") {
      return computeTrialBalanceSummaryFromGroups(filteredSummaryRows, sourceLedgers);
    }
    return computeTrialBalanceSummaryFromDetailedGroups(filteredDetailedGroups);
  }, [activeTab, filteredSummaryRows, sourceLedgers, filteredDetailedGroups]);

  const paginatedSummaryRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSummaryRows.slice(start, start + pageSize);
  }, [filteredSummaryRows, page, pageSize]);

  const detailedFlatRows = useMemo(
    () => flattenTrialBalanceDetailedGroups(filteredDetailedGroups, expandedGroupIds),
    [filteredDetailedGroups, expandedGroupIds],
  );

  const paginatedDetailedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return detailedFlatRows.slice(start, start + pageSize);
  }, [detailedFlatRows, page, pageSize]);

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

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (activeTab === "summary") {
        await exportTrialBalanceSummaryToExcel(filteredSummaryRows, exportMeta, summary);
      } else {
        await exportTrialBalanceDetailedToExcel(filteredDetailedGroups, exportMeta, summary);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (activeTab === "summary") {
      exportTrialBalanceSummaryToPdf(filteredSummaryRows, exportMeta, summary);
    } else {
      exportTrialBalanceDetailedToPdf(filteredDetailedGroups, exportMeta, summary);
    }
  };

  const handleSummarySort = useCallback((key: string) => {
    const col = key as TrialBalanceSummarySortKey;
    if (summarySortKey === col) {
      setSummarySortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSummarySortKey(col);
      setSummarySortDir("asc");
    }
  }, [summarySortKey]);

  const handleDetailedSort = useCallback((key: string) => {
    const col = key as TrialBalanceDetailedSortKey;
    if (detailedSortKey === col) {
      setDetailedSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setDetailedSortKey(col);
      setDetailedSortDir("asc");
    }
  }, [detailedSortKey]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const totalRecords =
    activeTab === "summary" ? filteredSummaryRows.length : detailedFlatRows.length;

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
                {mounted && !summary.isBalanced && filteredSummaryRows.length > 0 && (
                  <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-50/70 border-t border-red-100 text-xs text-red-700 leading-tight">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Trial Balance is not balanced.
                  </div>
                )}
                {mounted && filteredSummaryRows.length > 0 && (
                  <AccountsTablePagination
                    page={page}
                    pageSize={pageSize}
                    totalRecords={filteredSummaryRows.length}
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
                    <SortTh
                      label="Particular"
                      colKey="particular"
                      sortKey={summarySortKey}
                      sortDir={summarySortDir}
                      onSort={handleSummarySort}
                    />
                    <SortTh
                      label="Debit"
                      colKey="debit"
                      sortKey={summarySortKey}
                      sortDir={summarySortDir}
                      onSort={handleSummarySort}
                      align="right"
                    />
                    <SortTh
                      label="Credit"
                      colKey="credit"
                      sortKey={summarySortKey}
                      sortDir={summarySortDir}
                      onSort={handleSummarySort}
                      align="right"
                    />
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
                {mounted && !summary.isBalanced && filteredDetailedGroups.length > 0 && (
                  <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-50/70 border-t border-red-100 text-xs text-red-700 leading-tight">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Trial Balance is not balanced.
                  </div>
                )}
                {mounted && filteredDetailedGroups.length > 0 && (
                  <AccountsTablePagination
                    page={page}
                    pageSize={pageSize}
                    totalRecords={detailedFlatRows.length}
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
                    <SortTh
                      label="Particular"
                      colKey="particular"
                      sortKey={detailedSortKey}
                      sortDir={detailedSortDir}
                      onSort={handleDetailedSort}
                    />
                    <SortTh
                      label="Opening Balance"
                      colKey="opening"
                      sortKey={detailedSortKey}
                      sortDir={detailedSortDir}
                      onSort={handleDetailedSort}
                      align="right"
                    />
                    <SortTh
                      label="Debit"
                      colKey="debit"
                      sortKey={detailedSortKey}
                      sortDir={detailedSortDir}
                      onSort={handleDetailedSort}
                      align="right"
                    />
                    <SortTh
                      label="Credit"
                      colKey="credit"
                      sortKey={detailedSortKey}
                      sortDir={detailedSortDir}
                      onSort={handleDetailedSort}
                      align="right"
                    />
                    <SortTh
                      label="Closing Balance"
                      colKey="closing"
                      sortKey={detailedSortKey}
                      sortDir={detailedSortDir}
                      onSort={handleDetailedSort}
                      align="right"
                    />
                    <SortTh
                      label="Balance Type"
                      colKey="balanceType"
                      sortKey={detailedSortKey}
                      sortDir={detailedSortDir}
                      onSort={handleDetailedSort}
                      align="center"
                    />
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
