"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Landmark, X } from "lucide-react";
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
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  useReportDateRange,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { toSignedBalance } from "@/lib/accounts/running-balance";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  BANK_BOOK_VOUCHER_TYPE_OPTIONS,
  buildBankBookStatement,
  getBankBookAccountOptions,
  sortBankBookTransactions,
  type BankBookSortKey,
} from "./bank-book-data";
import { ensureBankBookDemoOnPageLoad } from "./bank-book-demo-seed";
import { exportBankBookToExcel, exportBankBookToPdf } from "./bank-book-export";
import { BankBookTable } from "./BankBookTable";

function BankBookPageContent() {
  const mounted = useClientMounted();
  const [refreshKey, setRefreshKey] = useState(0);

  const [bankLedgerId, setBankLedgerId] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [voucherType, setVoucherType] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<BankBookSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    ensureBankBookDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  const bankOptions = useMemo(() => {
    void refreshKey;
    return getBankBookAccountOptions();
  }, [refreshKey]);

  useEffect(() => {
    if (bankOptions.length === 0) return;
    if (bankLedgerId && bankOptions.some((b) => String(b.ledgerId) === bankLedgerId)) return;
    const defaultBank =
      bankOptions.find((b) => b.defaultForReceipts) ?? bankOptions[0];
    if (defaultBank) setBankLedgerId(String(defaultBank.ledgerId));
  }, [bankOptions, bankLedgerId]);

  const statement = useMemo(() => {
    if (!mounted || !bankLedgerId) return null;
    return buildBankBookStatement(Number(bankLedgerId), {
      dateFrom,
      dateTo,
      financialYearId: "all",
      voucherType,
      search,
    });
  }, [mounted, bankLedgerId, dateFrom, dateTo, voucherType, search]);

  const sortedTransactions = useMemo(() => {
    if (!statement) return [];
    const openingSigned = toSignedBalance(
      statement.summary.openingBalance,
      statement.summary.openingBalanceType,
    );
    return sortBankBookTransactions(
      statement.transactionRows,
      sortKey,
      sortDir,
      openingSigned,
    );
  }, [statement, sortKey, sortDir]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, page, pageSize]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
    }),
    [dateFrom, dateTo],
  );

  const canExport = Boolean(statement && bankLedgerId);

  const handleExportExcel = async () => {
    if (!statement) return;
    setExporting(true);
    try {
      await exportBankBookToExcel(
        statement.openingRow,
        sortedTransactions,
        statement.summary,
        exportMeta,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement) return;
    exportBankBookToPdf(
      statement.openingRow,
      sortedTransactions,
      statement.summary,
      exportMeta,
    );
  };

  const handleSort = (key: string) => {
    const nextKey = key as BankBookSortKey;
    if (sortKey === nextKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [bankLedgerId, dateFrom, dateTo, voucherType, search, sortKey, sortDir, pageSize]);

  const summaryItems = statement
    ? [
        { label: "Bank Name", value: statement.summary.bankName },
        { label: "Account No.", value: statement.summary.maskedAccountNumber },
        {
          label: "Opening Balance",
          value: formatBalanceAmount(
            statement.summary.openingBalance,
            statement.summary.openingBalanceType,
          ),
        },
        { label: "Total Receipts", value: formatMoney(statement.summary.totalReceipts) },
        { label: "Total Payments", value: formatMoney(statement.summary.totalPayments) },
        {
          label: "Closing Balance",
          value: formatBalanceAmount(
            statement.summary.closingBalance,
            statement.summary.closingBalanceType,
          ),
        },
      ]
    : [];

  const showNoTransactions =
    bankLedgerId &&
    statement &&
    !statement.hasPeriodTransactions &&
    !search.trim() &&
    voucherType === "all";

  const showNoFilterResults =
    bankLedgerId &&
    statement &&
    statement.hasPeriodTransactions &&
    sortedTransactions.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Book")}
      title="Bank Book"
      description="Read-only bank ledger report from posted accounting vouchers."
      filters={
        <ReportFilterRow
          className="items-end"
          end={
            <AccountsExportMenu
              onExcel={handleExportExcel}
              onPdf={handleExportPdf}
              disabled={!canExport || exporting}
            />
          }
        >
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="space-y-1 min-w-[200px]">
            <Label className={filterLabelClass}>
              Bank Account <span className="text-red-500">*</span>
            </Label>
            <Select
              value={bankLedgerId || undefined}
              onValueChange={(value) => {
                setBankLedgerId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[200px]")}>
                <SelectValue placeholder="Select bank account…" />
              </SelectTrigger>
              <SelectContent>
                {bankOptions.map((bank) => (
                  <SelectItem key={bank.ledgerId} value={String(bank.ledgerId)}>
                    {bank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <Label className={filterLabelClass}>Voucher Type</Label>
            <Select value={voucherType} onValueChange={setVoucherType} disabled={!bankLedgerId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {BANK_BOOK_VOUCHER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
                placeholder="Voucher no., particular, narration…"
                className={cn(filterControlClass, "mt-0 pr-8")}
                disabled={!bankLedgerId}
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
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {!bankLedgerId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2 max-w-sm">
              <Landmark className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Please select a Bank Account to view Bank Book.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && <AccountsSummaryBar items={summaryItems} className="lg:grid-cols-3" />}

            {showNoTransactions ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No Bank Book transactions found for the selected period.
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
            ) : statement ? (
              <>
                <BankBookTable
                  openingRow={statement.openingRow}
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

function BankBookFallback() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Book")}
      title="Bank Book"
      description="Read-only bank ledger report from posted accounting vouchers."
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading Bank Book…
      </div>
    </AccountsPageShell>
  );
}

export default function BankBookPageClient() {
  return (
    <Suspense fallback={<BankBookFallback />}>
      <BankBookPageContent />
    </Suspense>
  );
}
