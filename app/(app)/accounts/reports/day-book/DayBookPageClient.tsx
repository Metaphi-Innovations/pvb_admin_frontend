"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTableEmpty, AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "../../components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportVoucherTypeMultiFilter,
  ReportFilterSummary,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  buildDayBookVoucherGroups,
  computeDayBookSummary,
  DAY_BOOK_VOUCHER_TYPE_OPTIONS,
  filterDayBookVoucherGroups,
  flattenDayBookGroups,
  formatDayBookDate,
  type DayBookVoucherGroup,
} from "@/lib/accounts/day-book-data";
import { ensureDayBookDemoOnPageLoad } from "@/lib/accounts/day-book-demo-seed";
import { scheduleAccountsSectionSeed } from "@/lib/accounts/accounts-section-seed";
import {
  DAY_BOOK_DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
} from "@/lib/accounts/report-date-presets";
import {
  exportDayBookToExcel,
  exportDayBookToPdf,
} from "@/lib/accounts/day-book-export";
import { useDayBookDataRefresh } from "@/lib/accounts/use-day-book-data-refresh";
import { useClientMounted } from "@/lib/use-client-mounted";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

function DayBookVoucherRow({
  group,
  isExpanded,
  onToggle,
}: {
  group: DayBookVoucherGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <AccountsTableRow
        className={cn(
          "group",
          group.isUnbalanced && "bg-red-50/40",
          isExpanded && "bg-brand-50/30",
        )}
      >
        <AccountsTableCell className="w-8 px-2">
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-muted/60 transition-colors"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse voucher lines" : "Expand voucher lines"}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </AccountsTableCell>
        <AccountsTableCell className="whitespace-nowrap">
          {formatDayBookDate(group.date)}
        </AccountsTableCell>
        <AccountsTableCell mono className="whitespace-nowrap">
          <Link
            href={group.viewHref}
            className="font-semibold text-brand-700 hover:underline"
          >
            {group.voucherNo}
          </Link>
          {group.isUnbalanced && (
            <span className="ml-1.5 inline-flex items-center text-[10px] font-semibold text-red-600">
              Unbalanced
            </span>
          )}
        </AccountsTableCell>
        <AccountsTableCell className="whitespace-nowrap">{group.voucherTypeLabel}</AccountsTableCell>
        <AccountsTableCell className="max-w-[180px] truncate" title={group.partyLedger}>
          <span className="font-medium text-foreground">{group.partyLedger}</span>
          <span className="text-[11px] text-muted-foreground ml-1">
            ({group.lines.length} {group.lines.length === 1 ? "line" : "lines"})
          </span>
        </AccountsTableCell>
        <AccountsTableCell className="max-w-[220px] truncate text-muted-foreground" title={group.narration}>
          {group.narration}
        </AccountsTableCell>
        <AccountsTableCell align="right" money className="whitespace-nowrap text-muted-foreground">
          —
        </AccountsTableCell>
        <AccountsTableCell align="right" money className="whitespace-nowrap text-muted-foreground">
          —
        </AccountsTableCell>
      </AccountsTableRow>

      {isExpanded &&
        group.lines.map((line) => (
          <AccountsTableRow
            key={line.id}
            className={cn("bg-muted/15 border-b border-border/40", group.isUnbalanced && "bg-red-50/20")}
          >
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell className="pl-6 max-w-[200px] truncate" title={line.ledgerName}>
              {line.ledgerId ? (
                <Link href={line.generalLedgerHref} className="text-xs font-medium hover:underline text-foreground">
                  {line.ledgerName}
                </Link>
              ) : (
                <span className="text-xs">{line.ledgerName}</span>
              )}
            </AccountsTableCell>
            <AccountsTableCell className="max-w-[220px] truncate text-[11px] text-muted-foreground" title={line.narration}>
              {line.narration}
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="whitespace-nowrap">
              {formatMoneyOrDash(line.debit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="whitespace-nowrap">
              {formatMoneyOrDash(line.credit)}
            </AccountsTableCell>
          </AccountsTableRow>
        ))}
    </>
  );
}

function DayBookTableBody({
  filtered,
  totalPosted,
  hasFilters,
  clearFilters,
}: {
  filtered: DayBookVoucherGroup[];
  totalPosted: number;
  hasFilters: boolean;
  clearFilters: () => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(filtered);
  const summary = useMemo(() => computeDayBookSummary(columnFilteredRows), [columnFilteredRows]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsTable minWidth={1000}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell className="w-8 px-2" />
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label="Voucher No." colKey="voucherNo" />
              <SortTh label="Voucher Type" colKey="voucherType" />
              <SortTh label="Ledger / Party" colKey="partyLedger" />
              <SortTh label="Narration" colKey="narration" />
              <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
              <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {filtered.length === 0 ? (
              <AccountsTableEmpty
                colSpan={8}
                message={
                  totalPosted === 0
                    ? "No posted accounting transactions found."
                    : hasFilters
                      ? "No Day Book entries match the selected filters. Try widening the date range or clearing filters."
                      : "No Day Book entries found for the selected period."
                }
                onClear={hasFilters ? clearFilters : undefined}
              />
            ) : columnFilteredRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={8} className="accounts-table-empty">
                  No records match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paginated.map((group) => (
                <DayBookVoucherRow
                  key={group.id}
                  group={group}
                  isExpanded={expandedIds.has(group.id)}
                  onToggle={() => toggleExpanded(group.id)}
                />
              ))
            )}
          </AccountsTableBody>
          {columnFilteredRows.length > 0 && (
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell colSpan={6} className="font-semibold text-foreground text-xs">
                  Total ({summary.lineCount} ledger lines)
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
          )}
        </AccountsTable>
      </AccountsTableScroll>

      {columnFilteredRows.length > 0 && (
        <>
          <div
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border-t text-xs",
              summary.isBalanced
                ? "bg-emerald-50/80 border-emerald-100 text-emerald-700"
                : "bg-amber-50/80 border-amber-100 text-amber-800",
            )}
          >
            {summary.isBalanced ? (
              <>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Total Debit and Total Credit are balanced across {summary.lineCount} ledger lines.
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Total Debit ({formatMoney(summary.totalDebit)}) and Total Credit (
                {formatMoney(summary.totalCredit)}) differ by {formatMoney(summary.difference)}.
                {summary.unbalancedVoucherCount > 0 && (
                  <span>
                    {" "}
                    {summary.unbalancedVoucherCount} voucher
                    {summary.unbalancedVoucherCount === 1 ? "" : "s"} highlighted as unbalanced.
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex-shrink-0">
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={columnFilteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="vouchers"
            />
          </div>
        </>
      )}
    </div>
  );
}

function DayBookPageContent({
  filtered,
  totalPosted,
  hasFilters,
  clearFilters,
  exportMeta,
  exporting,
  setExporting,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  voucherTypes,
  setVoucherTypes,
  search,
  setSearch,
  filterSummaryItems,
}: {
  filtered: DayBookVoucherGroup[];
  totalPosted: number;
  hasFilters: boolean;
  clearFilters: () => void;
  exportMeta: Parameters<typeof exportDayBookToExcel>[1];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  voucherTypes: string[];
  setVoucherTypes: (v: string[]) => void;
  search: string;
  setSearch: (v: string) => void;
  filterSummaryItems: ReportFilterSummaryItem[];
}) {
  const columnFilteredRows = useAccountsFilteredRows(filtered);
  const summary = useMemo(() => computeDayBookSummary(columnFilteredRows), [columnFilteredRows]);
  const exportRows = useMemo(
    () => flattenDayBookGroups(columnFilteredRows),
    [columnFilteredRows],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportDayBookToExcel(exportRows, exportMeta, {
        totalDebit: summary.totalDebit,
        totalCredit: summary.totalCredit,
        isBalanced: summary.isBalanced,
        lineCount: summary.lineCount,
        voucherCount: summary.voucherCount,
        unbalancedVoucherCount: summary.unbalancedVoucherCount,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportDayBookToPdf(exportRows, exportMeta, {
      totalDebit: summary.totalDebit,
      totalCredit: summary.totalCredit,
      isBalanced: summary.isBalanced,
      lineCount: summary.lineCount,
      voucherCount: summary.voucherCount,
      unbalancedVoucherCount: summary.unbalancedVoucherCount,
    });
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Day Book")}
      title="Day Book"
      description="All accounting transactions for the selected date range."
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium gap-1.5" disabled={exporting}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={exporting || columnFilteredRows.length === 0}
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={columnFilteredRows.length === 0}
              onClick={handleExportPdf}
            >
              <FileDown className="w-4 h-4" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      filters={
        <>
          <ReportFilterRow className="items-end">
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              presetOptions={DAY_BOOK_DATE_RANGE_PRESET_OPTIONS}
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={DAY_BOOK_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all")}
            />
            <div className="space-y-1 min-w-[180px] flex-1">
              <Label className="text-xs font-medium uppercase text-muted-foreground">Search</Label>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Voucher no., type, party, narration…"
                  className="h-9 text-sm font-medium pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm font-medium"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <DayBookTableBody
        filtered={filtered}
        totalPosted={totalPosted}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
      />
    </AccountsPageShell>
  );
}

export default function DayBookPageClient() {
  const mounted = useClientMounted();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_financial_year");
  const [search, setSearch] = useState("");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const dataRefresh = useDayBookDataRefresh();

  useEffect(() => {
    if (!mounted) return;
    scheduleAccountsSectionSeed("reports");
    ensureDayBookDemoOnPageLoad();
    void import("@/lib/accounts/general-ledger-demo-seed").then((m) =>
      m.ensureGeneralLedgerDemoOnPageLoad(),
    );
  }, [mounted, dataRefresh]);

  const allGroups = useMemo(() => {
    if (!mounted) return [];
    void dataRefresh;
    return buildDayBookVoucherGroups();
  }, [mounted, dataRefresh]);

  const dayBookVoucherTypeOptions = useMemo(
    () => DAY_BOOK_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all"),
    [],
  );

  const filtered = useMemo(
    () =>
      filterDayBookVoucherGroups(allGroups, {
        search,
        dateFrom,
        dateTo,
        voucherType: voucherTypes,
        financialYearId: "all",
      }),
    [allGroups, search, dateFrom, dateTo, voucherTypes],
  );

  const hasFilters =
    Boolean(search.trim()) ||
    preset !== "this_financial_year" ||
    voucherTypes.length > 0;

  const totalPosted = allGroups.length;

  const voucherTypeLabel = formatMultiSelectLabel(
    voucherTypes,
    dayBookVoucherTypeOptions,
    "Type",
    "All Types",
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        dayBookVoucherTypeOptions,
        () => setVoucherTypes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [voucherTypes, dayBookVoucherTypeOptions]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
      voucherType: voucherTypeLabel,
      search: search.trim(),
    }),
    [dateFrom, dateTo, voucherTypeLabel, search],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setPreset("this_financial_year");
    const { from, to } = resolveDateRangePreset("this_financial_year");
    setDateFrom(from);
    setDateTo(to);
    setVoucherTypes([]);
  }, [setPreset, setDateFrom, setDateTo]);

  const getCellValue = useCallback((row: DayBookVoucherGroup, key: string) => {
    if (key === "voucherType") return row.voucherTypeLabel;
    if (key === "debit") return row.totalDebit;
    if (key === "credit") return row.totalCredit;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      voucherNo: { type: "text" as const },
      voucherType: { type: "text" as const },
      partyLedger: { type: "text" as const },
      narration: { type: "text" as const },
      debit: { type: "amount" as const },
      credit: { type: "amount" as const },
    }),
    [],
  );

  return (
    <AccountsColumnFilterProvider
      rows={filtered}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <DayBookPageContent
        filtered={filtered}
        totalPosted={totalPosted}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        exportMeta={exportMeta}
        exporting={exporting}
        setExporting={setExporting}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        voucherTypes={voucherTypes}
        setVoucherTypes={setVoucherTypes}
        search={search}
        setSearch={setSearch}
        filterSummaryItems={filterSummaryItems}
      />
    </AccountsColumnFilterProvider>
  );
}
