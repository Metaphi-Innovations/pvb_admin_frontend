"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileDown, FileSpreadsheet, X } from "lucide-react";
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
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTableEmpty, AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { SortTh } from "../../components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  DayBookVoucherTypeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildDayBookEntries,
  computeDayBookSummary,
  DAY_BOOK_VOUCHER_TYPE_OPTIONS,
  filterDayBookEntries,
  formatDayBookDate,
  sortDayBookEntries,
  type DayBookEntry,
  type DayBookSortKey,
} from "@/lib/accounts/day-book-data";
import { resolveDateRangePreset } from "@/lib/accounts/report-date-presets";
import {
  exportDayBookToExcel,
  exportDayBookToPdf,
} from "@/lib/accounts/day-book-export";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export default function DayBookPageClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const [voucherType, setVoucherType] = useState("all");
  const [sortKey, setSortKey] = useState<DayBookSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const allEntries = useMemo(() => buildDayBookEntries(), []);

  const filtered = useMemo(
    () =>
      filterDayBookEntries(allEntries, {
        search,
        dateFrom,
        dateTo,
        voucherType: voucherType as DayBookEntry["voucherType"] | "all",
        financialYearId: "all",
      }),
    [allEntries, search, dateFrom, dateTo, voucherType],
  );

  const sorted = useMemo(
    () => sortDayBookEntries(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const summary = useMemo(() => computeDayBookSummary(filtered), [filtered]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const hasFilters =
    Boolean(search.trim()) ||
    preset !== "this_month" ||
    voucherType !== "all";

  const voucherTypeLabel =
    DAY_BOOK_VOUCHER_TYPE_OPTIONS.find((o) => o.value === voucherType)?.label ?? "All Types";

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

  const handleSort = (key: DayBookSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const onColumnSort = (key: string) => handleSort(key as DayBookSortKey);

  const clearFilters = useCallback(() => {
    setSearch("");
    setPreset("this_month");
    const { from, to } = resolveDateRangePreset("this_month");
    setDateFrom(from);
    setDateTo(to);
    setVoucherType("all");
    setPage(1);
  }, [setPreset, setDateFrom, setDateTo]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, voucherType, pageSize]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportDayBookToExcel(sorted, exportMeta, summary);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportDayBookToPdf(sorted, exportMeta, summary);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Day Book")}
      title="Day Book"
      description="All accounting transactions for the selected date range."
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium gap-1.5" disabled={exporting}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={exporting || sorted.length === 0}
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={sorted.length === 0}
              onClick={handleExportPdf}
            >
              <FileDown className="w-4 h-4" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      filters={
        <ReportFilterRow className="items-end">
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <DayBookVoucherTypeFilter value={voucherType} onChange={setVoucherType} />
          <div className="space-y-1 min-w-[180px] flex-1">
            <Label className="text-[10px] font-medium uppercase text-muted-foreground">Search</Label>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Voucher no., type, party, narration…"
                className="h-9 text-[13px] font-medium pr-8"
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
              className="h-9 text-[13px] font-medium"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsTable minWidth={960}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <SortTh label="Voucher No." colKey="voucherNo" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <SortTh label="Voucher Type" colKey="voucherType" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <SortTh label="Ledger / Party" colKey="partyLedger" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <SortTh label="Narration" colKey="narration" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <SortTh label="Debit" colKey="debit" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} align="right" />
                <SortTh label="Credit" colKey="credit" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} align="right" />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {sorted.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={7}
                  message="No Day Book entries found for the selected period."
                  onClear={hasFilters ? clearFilters : undefined}
                />
              ) : (
                paginated.map((row) => (
                  <AccountsTableRow key={row.id}>
                    <AccountsTableCell className="whitespace-nowrap">
                      {formatDayBookDate(row.date)}
                    </AccountsTableCell>
                    <AccountsTableCell mono className="font-semibold text-brand-700 whitespace-nowrap">
                      {row.voucherNo}
                    </AccountsTableCell>
                    <AccountsTableCell className="whitespace-nowrap">{row.voucherTypeLabel}</AccountsTableCell>
                    <AccountsTableCell className="max-w-[160px] truncate" title={row.partyLedger}>
                      {row.partyLedger}
                    </AccountsTableCell>
                    <AccountsTableCell className="max-w-[220px] truncate text-muted-foreground" title={row.narration}>
                      {row.narration}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="whitespace-nowrap">
                      {formatMoneyOrDash(row.debit)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="whitespace-nowrap">
                      {formatMoneyOrDash(row.credit)}
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
            {sorted.length > 0 && (
              <AccountsTableFoot>
                <AccountsTableRow>
                  <AccountsTableCell colSpan={5} className="font-semibold text-foreground text-[11px]">
                    Total
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

        {sorted.length > 0 && (
          <>
            <div
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border-t text-[11px]",
                summary.isBalanced
                  ? "bg-emerald-50/80 border-emerald-100 text-emerald-700"
                  : "bg-amber-50/80 border-amber-100 text-amber-800",
              )}
            >
              {summary.isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Total Debit and Total Credit are balanced.
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Total Debit ({formatMoney(summary.totalDebit)}) and Total Credit ({formatMoney(summary.totalCredit)}) do not match.
                  Difference: {formatMoney(summary.difference)}.
                </>
              )}
            </div>
            <div className="flex-shrink-0">
              <AccountsTablePagination
                page={page}
                pageSize={pageSize}
                totalRecords={sorted.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                recordLabel="entries"
              />
            </div>
          </>
        )}

      </div>
    </AccountsPageShell>
  );
}
