"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportFromToDateFilter,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildCashBookStatement,
  CASH_BOOK_VOUCHER_TYPE_OPTIONS,
  getCashBookLedgers,
  sortCashBookTransactions,
  type CashBookSortKey,
} from "./cash-book-data";
import { ensureCashBookDemoOnPageLoad } from "./cash-book-demo-seed";
import { exportCashBookToExcel, exportCashBookToPdf } from "./cash-book-export";
import { CashBookTable } from "./CashBookTable";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-8 text-xs";
const PLACEHOLDER_FROM = "2026-04-01";
const PLACEHOLDER_TO = "2026-06-30";

function CashBookPageContent() {
  const mounted = useClientMounted();
  const [refreshKey, setRefreshKey] = useState(0);
  const [ledgerId, setLedgerId] = useState("");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_FROM);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_TO);
  const [datesReady, setDatesReady] = useState(false);
  const [voucherType, setVoucherType] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<CashBookSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    ensureCashBookDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  const ledgers = useMemo(() => {
    void refreshKey;
    return getCashBookLedgers();
  }, [refreshKey]);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    const years = loadFinancialYears();
    const activeFy = years.find((fy) => fy.id === activeFyId) ?? years.find((fy) => fy.status === "active");

    if (activeFy) {
      setFinancialYearId(String(activeFy.id));
      setDateFrom(activeFy.startDate);
      setDateTo(activeFy.endDate > "2026-06-30" ? "2026-06-30" : activeFy.endDate);
    } else {
      setDateFrom(PLACEHOLDER_FROM);
      setDateTo(PLACEHOLDER_TO);
    }
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (!datesReady || ledgers.length === 0) return;
    if (ledgerId && ledgers.some((l) => l.id === ledgerId)) return;
    if (ledgers.length === 1) setLedgerId(ledgers[0].id);
  }, [datesReady, ledgers, ledgerId]);

  useEffect(() => {
    if (financialYearId === "all") return;
    const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
    if (!fy) return;
    setDateFrom(fy.startDate);
    setDateTo(fy.endDate);
  }, [financialYearId]);

  const statement = useMemo(() => {
    if (!mounted || !ledgerId || !datesReady) return null;
    return buildCashBookStatement(ledgerId, {
      dateFrom,
      dateTo,
      voucherType,
      search,
    });
  }, [mounted, ledgerId, dateFrom, dateTo, voucherType, search, datesReady]);

  const openingRow = statement?.displayRows[0] ?? null;

  const sortedTransactions = useMemo(() => {
    if (!statement) return [];
    return sortCashBookTransactions(statement.transactionRows, sortKey, sortDir);
  }, [statement, sortKey, sortDir]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, page, pageSize]);

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((fy) => String(fy.id) === financialYearId)?.name ?? "—";
  }, [financialYearId]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
    }),
    [dateFrom, dateTo, financialYearLabel],
  );

  const canExport = Boolean(statement && ledgerId);

  const handleExportExcel = async () => {
    if (!statement) return;
    setExporting(true);
    try {
      await exportCashBookToExcel(statement.displayRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement) return;
    exportCashBookToPdf(statement.displayRows, statement.summary, exportMeta);
  };

  const handleSort = useCallback((key: string) => {
    const k = key as CashBookSortKey;
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return k;
    });
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [ledgerId, dateFrom, dateTo, voucherType, search, pageSize]);

  const summaryItems = statement
    ? [
        { label: "Cash Ledger", value: statement.summary.ledgerName },
        {
          label: "Opening Cash Balance",
          value: formatBalanceAmount(
            statement.summary.openingBalance,
            statement.summary.openingBalanceType,
          ),
        },
        { label: "Total Cash Receipts", value: formatMoney(statement.summary.totalReceipts) },
        { label: "Total Cash Payments", value: formatMoney(statement.summary.totalPayments) },
        {
          label: "Closing Cash Balance",
          value: formatBalanceAmount(
            statement.summary.closingBalance,
            statement.summary.closingBalanceType,
          ),
        },
      ]
    : [];

  const showNoTransactions =
    ledgerId &&
    statement &&
    !statement.hasPeriodTransactions &&
    !search.trim() &&
    voucherType === "all";

  const showNoFilterResults =
    ledgerId && statement && statement.hasPeriodTransactions && sortedTransactions.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Cash Book")}
      title="Cash Book"
      description="Read-only cash ledger report from posted receipt, payment, contra, and journal vouchers."
      filters={
        <ReportFilterRow className="items-end">
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          <ReportFromToDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="space-y-1 min-w-[200px]">
            <Label className={filterLabelClass}>
              Cash Ledger <span className="text-red-500">*</span>
            </Label>
            <Select
              value={ledgerId || undefined}
              onValueChange={(value) => {
                setLedgerId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[200px]")}>
                <SelectValue placeholder="Select cash ledger…" />
              </SelectTrigger>
              <SelectContent>
                {ledgers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.ledgerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <Label className={filterLabelClass}>Voucher Type</Label>
            <Select value={voucherType} onValueChange={setVoucherType}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {CASH_BOOK_VOUCHER_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[200px] flex-1">
            <Label className={filterLabelClass}>Search</Label>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Voucher no., type, particular, narration…"
                className={cn(filterControlClass, "mt-0 pr-8")}
                disabled={!ledgerId}
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
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={!canExport || exporting}
          />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {!ledgerId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2 max-w-sm">
              <Banknote className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Please select a cash ledger to view the cash book.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && <AccountsSummaryBar items={summaryItems} className="lg:grid-cols-5" />}

            {showNoTransactions ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No Cash Book transactions found for the selected period.
                </p>
              </div>
            ) : showNoFilterResults ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No transactions match your search or voucher type filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setVoucherType("all");
                    }}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            ) : statement && openingRow ? (
              <>
                <CashBookTable
                  openingRow={openingRow}
                  transactionRows={paginatedTransactions}
                  summary={statement.summary}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                {sortedTransactions.length > 0 && (
                  <div className="flex-shrink-0 border-t border-border">
                    <AccountsTablePagination
                      page={page}
                      pageSize={pageSize}
                      totalRecords={sortedTransactions.length}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      recordLabel="transactions"
                    />
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </AccountsPageShell>
  );
}

export default function CashBookPageClient() {
  return (
    <Suspense fallback={null}>
      <CashBookPageContent />
    </Suspense>
  );
}
