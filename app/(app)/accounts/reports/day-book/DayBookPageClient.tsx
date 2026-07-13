"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
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
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportVoucherTypeMultiFilter,
  ReportBranchMultiFilter,
  ReportFilterSummary,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  ACCOUNTS_VOUCHERS_UPDATED_EVENT,
  scheduleAccountsSectionSeed,
} from "@/lib/accounts/accounts-section-seed";
import {
  buildDayBookDisplayRows,
  buildDayBookExportEntries,
  buildDayBookVoucherGroups,
  computeDayBookSummaryFromTransactions,
  countDayBookSourceVouchers,
  DAY_BOOK_VOUCHER_TYPE_OPTIONS,
  defaultDayBookFyDateRange,
  filterDayBookVoucherGroups,
  flattenToDayBookTransactions,
  formatDayBookDate,
  formatDayBookDateForTotal,
  getDayBookBranchOptions,
  type DayBookDisplayRow,
  type DayBookDrillDownContext,
} from "@/lib/accounts/day-book-data";
import { ensureDayBookDemoOnPageLoad } from "@/lib/accounts/day-book-demo-seed";
import {
  DAY_BOOK_DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import {
  exportDayBookToExcel,
  exportDayBookToPdf,
} from "@/lib/accounts/day-book-export";
import { useClientMounted } from "@/lib/use-client-mounted";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { cn } from "@/lib/utils";

function DayBookDisplayTableRow({ row }: { row: DayBookDisplayRow }) {
  if (row.kind === "dateTotal") {
    return (
      <AccountsTableRow className="bg-muted/25 font-semibold border-t border-border/80">
        <AccountsTableCell colSpan={5} className="text-xs font-bold py-2">
          Date Total ({formatDayBookDateForTotal(row.date)})
        </AccountsTableCell>
        <AccountsTableCell align="right" money className="py-2 font-bold">
          {formatMoney(row.debit)}
        </AccountsTableCell>
        <AccountsTableCell align="right" money className="py-2 font-bold">
          {formatMoney(row.credit)}
        </AccountsTableCell>
        <AccountsTableCell className="py-2" />
        <AccountsTableCell className="py-2" />
      </AccountsTableRow>
    );
  }

  return (
    <AccountsTableRow className={cn("group", row.isUnbalancedVoucher && "bg-red-50/40")}>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {formatDayBookDate(row.date)}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">{row.voucherTypeLabel}</AccountsTableCell>
      <AccountsTableCell mono className="whitespace-nowrap py-2">
        {row.viewHref ? (
          <Link href={row.viewHref} className="font-semibold text-brand-700 hover:underline">
            {row.voucherNo}
          </Link>
        ) : (
          <span className="font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="max-w-[180px] truncate py-2" title={row.ledgerPartyName}>
        {row.ledgerId && row.generalLedgerHref ? (
          <Link href={row.generalLedgerHref} className="font-medium hover:underline text-foreground">
            {row.ledgerPartyName}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{row.ledgerPartyName}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell
        className="max-w-[200px] truncate py-2 text-muted-foreground"
        title={row.particulars}
      >
        {row.particulars}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className="whitespace-nowrap py-2">
        {formatMoneyOrDash(row.debit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className="whitespace-nowrap py-2">
        {formatMoneyOrDash(row.credit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2">
        <MoneyAmount
          amount={row.runningBalance}
          side={row.runningBalanceType}
          sideBadge
          className="text-xs justify-end"
        />
      </AccountsTableCell>
      <AccountsTableCell
        className="max-w-[220px] truncate py-2 text-muted-foreground"
        title={row.narration}
      >
        {row.narration}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

export default function DayBookPageClient() {
  const mounted = useClientMounted();
  const [dataTick, setDataTick] = useState(0);
  const [datesReady, setDatesReady] = useState(false);
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    ensureFinancialYearsCurrent();
    const { from, to, fyId } = defaultDayBookFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    scheduleAccountsSectionSeed("reports");
    ensureDayBookDemoOnPageLoad();
    void import("@/lib/accounts/general-ledger-demo-seed").then((m) => {
      m.ensureGeneralLedgerDemoOnPageLoad();
      setDataTick((t) => t + 1);
    });
    const onVouchersUpdated = () => setDataTick((t) => t + 1);
    window.addEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, onVouchersUpdated);
    return () => window.removeEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, onVouchersUpdated);
  }, [mounted]);

  const allGroups = useMemo(() => {
    if (!mounted) return [];
    void dataTick;
    return buildDayBookVoucherGroups();
  }, [mounted, dataTick]);

  const sourceVoucherCount = useMemo(() => {
    if (!mounted) return 0;
    void dataTick;
    return countDayBookSourceVouchers();
  }, [mounted, dataTick]);

  const branchOptions = useMemo(() => {
    if (!mounted) return [...REPORT_BRANCH_OPTIONS];
    void dataTick;
    const fromData = getDayBookBranchOptions();
    return fromData.length > 0 ? fromData : [...REPORT_BRANCH_OPTIONS];
  }, [mounted, dataTick]);

  const dayBookVoucherTypeOptions = useMemo(
    () => DAY_BOOK_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all"),
    [],
  );

  const filteredGroups = useMemo(() => {
    if (!datesReady) return [];
    return filterDayBookVoucherGroups(allGroups, {
      dateFrom,
      dateTo,
      voucherType: voucherTypes,
      financialYearId,
      branch: branches,
    });
  }, [allGroups, datesReady, dateFrom, dateTo, voucherTypes, financialYearId, branches]);

  const drillContext = useMemo(
    (): DayBookDrillDownContext => ({
      dateFrom,
      dateTo,
      financialYearId,
      branch: branches,
    }),
    [dateFrom, dateTo, financialYearId, branches],
  );

  const orderedTransactions = useMemo(
    () => flattenToDayBookTransactions(filteredGroups, drillContext),
    [filteredGroups, drillContext],
  );

  const displayRows = useMemo(
    () => buildDayBookDisplayRows(orderedTransactions),
    [orderedTransactions],
  );

  const summary = useMemo(
    () => computeDayBookSummaryFromTransactions(orderedTransactions),
    [orderedTransactions],
  );

  const exportRows = useMemo(
    () => buildDayBookExportEntries(orderedTransactions, summary, filteredGroups),
    [orderedTransactions, summary, filteredGroups],
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, financialYearId, voucherTypes, branches, dataTick]);

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

  const handlePresetChange = useCallback((next: DateRangePresetId) => {
    setPreset(next);
    if (next !== "custom") {
      const { from, to } = resolveDateRangePreset(next);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const defaultFy = useMemo(() => defaultDayBookFyDateRange(), []);

  const hasFilters =
    datesReady &&
    (preset !== "custom" ||
      financialYearId !== defaultFy.fyId ||
      dateFrom !== defaultFy.from ||
      dateTo !== defaultFy.to ||
      voucherTypes.length > 0 ||
      branches.length > 0);

  const clearFilters = useCallback(() => {
    const { from, to, fyId } = defaultDayBookFyDateRange();
    setPreset("custom");
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setVoucherTypes([]);
    setBranches([]);
  }, []);

  const voucherTypeLabel = formatMultiSelectLabel(
    voucherTypes,
    dayBookVoucherTypeOptions,
    "Type",
    "All Types",
  );

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((f) => String(f.id) === financialYearId)?.name ?? "";
  }, [financialYearId]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildBranchFilterSummary(branches, () => setBranches([])),
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        dayBookVoucherTypeOptions,
        () => setVoucherTypes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [branches, voucherTypes, dayBookVoucherTypeOptions]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
      voucherType: voucherTypeLabel,
      branch:
        branches.length === 0
          ? undefined
          : branches.length === 1
            ? branches[0]
            : `${branches.length} selected`,
    }),
    [dateFrom, dateTo, financialYearLabel, voucherTypeLabel, branches],
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
              disabled={exporting || orderedTransactions.length === 0}
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={orderedTransactions.length === 0}
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
              presetOptions={DAY_BOOK_DATE_RANGE_PRESET_OPTIONS}
            />
            <ReportBranchMultiFilter
              values={branches}
              onChange={setBranches}
              options={branchOptions}
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={dayBookVoucherTypeOptions}
            />
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
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsTable minWidth={1180} className="text-xs financial-report">
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <FinancialReportHeadCell>Date</FinancialReportHeadCell>
                <FinancialReportHeadCell>Voucher Type</FinancialReportHeadCell>
                <FinancialReportHeadCell>Voucher No.</FinancialReportHeadCell>
                <FinancialReportHeadCell>Ledger / Party Name</FinancialReportHeadCell>
                <FinancialReportHeadCell>Particulars</FinancialReportHeadCell>
                <FinancialReportHeadCell align="right">Debit</FinancialReportHeadCell>
                <FinancialReportHeadCell align="right">Credit</FinancialReportHeadCell>
                <FinancialReportHeadCell align="right">Running Balance</FinancialReportHeadCell>
                <FinancialReportHeadCell>Narration</FinancialReportHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {!datesReady ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={9} className="accounts-table-empty">
                    Loading Day Book…
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : sourceVoucherCount === 0 ? (
                <AccountsTableEmpty
                  colSpan={9}
                  message="No posted accounting transactions found."
                />
              ) : orderedTransactions.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={9}
                  message="No Day Book entries match the selected filters. Try widening the date range or clearing filters."
                  onClear={hasFilters ? clearFilters : undefined}
                />
              ) : (
                paginated.map((row) => <DayBookDisplayTableRow key={row.id} row={row} />)
              )}
            </AccountsTableBody>
            {orderedTransactions.length > 0 && (
              <AccountsTableFoot>
                <AccountsTableRow className="bg-brand-50/30 font-semibold border-t-2 border-foreground/20">
                  <AccountsTableCell colSpan={5} className="text-xs font-bold py-2">
                    Grand Total
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("py-2 font-bold", !summary.isBalanced && "text-red-600")}
                  >
                    {formatMoney(summary.totalDebit)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("py-2 font-bold", !summary.isBalanced && "text-red-600")}
                  >
                    {formatMoney(summary.totalCredit)}
                  </AccountsTableCell>
                  <AccountsTableCell colSpan={2} className="py-2" />
                </AccountsTableRow>
              </AccountsTableFoot>
            )}
          </AccountsTable>
        </AccountsTableScroll>

        {orderedTransactions.length > 0 && (
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
                totalRecords={displayRows.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                recordLabel="rows"
              />
            </div>
          </>
        )}
      </div>
    </AccountsPageShell>
  );
}
