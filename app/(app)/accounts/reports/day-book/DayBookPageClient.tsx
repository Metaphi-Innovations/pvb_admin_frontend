"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Receipt,
  Scale,
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
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { SortTh } from "../../components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { EmptySearch } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/listing/Pagination";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  ReportFilterRow,
  ReportFromToDateFilter,
  ReportBranchFilter,
  DayBookVoucherTypeFilter,
  ReportFinancialYearFilter,
} from "@/components/accounts/ReportFilters";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import {
  buildDayBookEntries,
  computeDayBookSummary,
  filterDayBookEntries,
  formatDayBookDate,
  defaultDayBookDateFrom,
  getActiveFinancialYearId,
  sortDayBookEntries,
  todayIso,
  type DayBookEntry,
  type DayBookSortKey,
  type DayBookStatus,
} from "@/lib/accounts/day-book-data";
import { ensureDayBookDemoOnPageLoad } from "@/lib/accounts/day-book-demo-seed";
import {
  exportDayBookToExcel,
  exportDayBookToPdf,
} from "@/lib/accounts/day-book-export";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { buildGeneralLedgerHref, resolveLedgerIdByName } from "@/lib/accounts/general-ledger-data";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";

const STATUS_CFG: Record<
  DayBookStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  posted: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Posted" },
  draft: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400", label: "Draft" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Cancelled" },
};

function DayBookStatusPill({ status }: { status: DayBookStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function DayBookPageClient() {
  const today = todayIso();
  const defaultFrom = defaultDayBookDateFrom();
  const activeFyId = getActiveFinancialYearId();

  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(today);
  const [voucherType, setVoucherType] = useState("all");
  const [branch, setBranch] = useState("all");
  const [financialYearId, setFinancialYearId] = useState(
    activeFyId ? String(activeFyId) : "all",
  );
  const [sortKey, setSortKey] = useState<DayBookSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    ensureDayBookDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  const allEntries = useMemo(() => {
    void refreshKey;
    return buildDayBookEntries();
  }, [refreshKey]);

  const filtered = useMemo(
    () =>
      filterDayBookEntries(allEntries, {
        search,
        dateFrom,
        dateTo,
        voucherType: voucherType as DayBookEntry["voucherType"] | "all",
        branch,
        financialYearId:
          financialYearId === "all" ? "all" : Number(financialYearId),
      }),
    [allEntries, search, dateFrom, dateTo, voucherType, branch, financialYearId],
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
    dateFrom !== defaultFrom ||
    dateTo !== today ||
    voucherType !== "all" ||
    branch !== "all" ||
    financialYearId !== (activeFyId ? String(activeFyId) : "all");

  const fyLabel =
    financialYearId === "all"
      ? "All Financial Years"
      : loadFinancialYears().find((fy) => String(fy.id) === financialYearId)?.name ?? "";

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
    setDateFrom(defaultFrom);
    setDateTo(today);
    setVoucherType("all");
    setBranch("all");
    setFinancialYearId(activeFyId ? String(activeFyId) : "all");
    setPage(1);
  }, [today, defaultFrom, activeFyId]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, voucherType, branch, financialYearId, pageSize]);

  const { openTransaction, drawer: transactionDrawer } = useTransactionDetailsDrawer();

  const openEntry = useCallback(
    (entry: DayBookEntry) => {
      openTransaction({ type: "day_book", entry });
    },
    [openTransaction],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportDayBookToExcel(sorted, {
        dateFrom,
        dateTo,
        financialYear: fyLabel,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportDayBookToPdf(sorted, {
      dateFrom,
      dateTo,
      financialYear: fyLabel,
    });
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Day Book")}
      title="Day Book"
      description="View all accounting vouchers posted during the selected period."
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={exporting}>
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={exporting || sorted.length === 0}
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              disabled={sorted.length === 0}
              onClick={handleExportPdf}
            >
              <FileDown className="w-3.5 h-3.5" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      filters={
        <ReportFilterRow className="items-end">
          <div className="space-y-1 min-w-[180px] flex-1">
            <Label className="text-[10px] font-medium uppercase text-muted-foreground">Search</Label>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Voucher no., party, narration…"
                className="h-8 text-xs pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <ReportFromToDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <DayBookVoucherTypeFilter value={voucherType} onChange={setVoucherType} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
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
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-border/60 bg-muted/10">
          <MiniKPICard label="Total Vouchers" value={String(summary.totalVouchers)} icon={BookMarked} accent />
          <MiniKPICard label="Total Debit" value={formatMoney(summary.totalDebit)} icon={Receipt} />
          <MiniKPICard label="Total Credit" value={formatMoney(summary.totalCredit)} icon={Receipt} />
          <MiniKPICard
            label="Net Difference"
            value={formatMoney(summary.netDifference)}
            icon={Scale}
            accent={summary.netDifference === 0}
          />
        </div>

        <AccountsTableScroll>
          {sorted.length === 0 ? (
            <EmptySearch onClear={hasFilters ? clearFilters : undefined} />
          ) : (
            <AccountsTable minWidth={1100}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                  <SortTh label="Time" colKey="time" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                  <SortTh label="Voucher No." colKey="voucherNo" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                  <SortTh label="Voucher Type" colKey="voucherType" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                  <SortTh label="Party / Ledger" colKey="partyLedger" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                  <SortTh label="Debit" colKey="debit" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} align="right" />
                  <SortTh label="Credit" colKey="credit" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} align="right" />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                  <AccountsTableHeadCell align="center" uppercase className="w-14">
                    Action
                  </AccountsTableHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {paginated.map((row) => (
                  <AccountsTableRow key={row.id} className="group cursor-pointer" onClick={() => openEntry(row)}>
                    <AccountsTableCell className="whitespace-nowrap">{formatDayBookDate(row.date)}</AccountsTableCell>
                    <AccountsTableCell className="text-muted-foreground tabular-nums whitespace-nowrap">{row.time}</AccountsTableCell>
                    <AccountsTableCell mono className="font-semibold text-brand-700 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEntry(row);
                        }}
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {row.voucherNo}
                      </button>
                    </AccountsTableCell>
                    <AccountsTableCell className="whitespace-nowrap">{row.voucherTypeLabel}</AccountsTableCell>
                    <AccountsTableCell className="max-w-[140px] truncate" title={row.partyLedger}>
                      {(() => {
                        const partyLedgerId = resolveLedgerIdByName(row.partyLedger);
                        if (!partyLedgerId) return row.partyLedger;
                        return (
                          <Link
                            href={buildGeneralLedgerHref(partyLedgerId)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-700 hover:underline font-medium truncate block"
                          >
                            {row.partyLedger}
                          </Link>
                        );
                      })()}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="whitespace-nowrap">
                      {formatMoneyOrDash(row.debit)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="whitespace-nowrap">
                      {formatMoneyOrDash(row.credit)}
                    </AccountsTableCell>
                    <AccountsTableCell>
                      <DayBookStatusPill status={row.status} />
                    </AccountsTableCell>
                    <AccountsTableCell align="center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEntry(row);
                        }}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        aria-label={`View ${row.voucherNo}`}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
            </AccountsTable>
          )}
        </AccountsTableScroll>

        {sorted.length > 0 && (
          <div className="flex-shrink-0">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalRecords={sorted.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="vouchers"
            />
          </div>
        )}
      </div>
      {transactionDrawer}
    </AccountsPageShell>
  );
}
