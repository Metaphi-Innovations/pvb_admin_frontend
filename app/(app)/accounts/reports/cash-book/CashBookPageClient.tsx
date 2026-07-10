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
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  useReportDateRange,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildCashBookStatement,
  CASH_BOOK_VOUCHER_TYPE_OPTIONS,
  getCashBookLedgers,
  type CashBookDisplayRow,
} from "./cash-book-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { exportCashBookToExcel, exportCashBookToPdf } from "./cash-book-export";
import { CashBookTable } from "./CashBookTable";

function CashBookPageContent() {
  const mounted = useClientMounted();
  const [refreshKey, setRefreshKey] = useState(0);
  const [ledgerId, setLedgerId] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [voucherType, setVoucherType] = useState("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const ledgers = useMemo(() => {
    void refreshKey;
    return getCashBookLedgers();
  }, [refreshKey]);

  useEffect(() => {
    if (ledgers.length === 0) return;
    if (ledgerId && ledgers.some((l) => l.id === ledgerId)) return;
    setLedgerId(ledgers[0].id);
  }, [ledgers, ledgerId]);

  const statement = useMemo(() => {
    if (!mounted || !ledgerId) return null;
    return buildCashBookStatement(ledgerId, {
      dateFrom,
      dateTo,
      voucherType,
      search,
    });
  }, [mounted, ledgerId, dateFrom, dateTo, voucherType, search]);

  const transactionRows = statement?.transactionRows ?? [];

  const getCellValue = useCallback((row: CashBookDisplayRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      voucherNo: { type: "text" as const },
      voucherType: { type: "text" as const },
      particular: { type: "text" as const },
      narration: { type: "text" as const },
      receipt: { type: "amount" as const },
      payment: { type: "amount" as const },
    }),
    [],
  );

  return (
    <AccountsColumnFilterProvider
      rows={transactionRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <CashBookPageBody
        ledgerId={ledgerId}
        setLedgerId={setLedgerId}
        ledgers={ledgers}
        statement={statement}
        transactionRows={transactionRows}
        exporting={exporting}
        setExporting={setExporting}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        voucherType={voucherType}
        setVoucherType={setVoucherType}
        search={search}
        setSearch={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}

function CashBookPageBody({
  ledgerId,
  setLedgerId,
  ledgers,
  statement,
  transactionRows,
  exporting,
  setExporting,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  voucherType,
  setVoucherType,
  search,
  setSearch,
}: {
  ledgerId: string;
  setLedgerId: (v: string) => void;
  ledgers: ReturnType<typeof getCashBookLedgers>;
  statement: ReturnType<typeof buildCashBookStatement> | null;
  transactionRows: CashBookDisplayRow[];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  voucherType: string;
  setVoucherType: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const columnFilteredRows = useAccountsFilteredRows(transactionRows);
  const openingRow = statement?.displayRows[0] ?? null;

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
    }),
    [dateFrom, dateTo],
  );

  const canExport = Boolean(statement && ledgerId);

  const handleExportExcel = async () => {
    if (!statement || !openingRow) return;
    setExporting(true);
    try {
      const exportRows = [openingRow, ...columnFilteredRows];
      await exportCashBookToExcel(exportRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement || !openingRow) return;
    const exportRows = [openingRow, ...columnFilteredRows];
    exportCashBookToPdf(exportRows, statement.summary, exportMeta);
  };

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
    ledgerId && statement && statement.hasPeriodTransactions && transactionRows.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Cash Book")}
      title="Cash Book"
      description="Read-only cash ledger report from posted receipt, payment, contra, and journal vouchers."
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
              Cash Ledger <span className="text-red-500">*</span>
            </Label>
            <Select value={ledgerId || undefined} onValueChange={setLedgerId}>
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
              <CashBookTable
                openingRow={openingRow}
                transactionRows={transactionRows}
                summary={statement.summary}
              />
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
