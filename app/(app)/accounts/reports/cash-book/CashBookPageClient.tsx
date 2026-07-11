"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportLedgerMultiFilter,
  ReportVoucherTypeMultiFilter,
  ReportFilterSummary,
  useReportDateRange,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
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
  const [ledgerIds, setLedgerIds] = useState<string[]>([]);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
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

  const cashLedgerOptions = useMemo(
    () =>
      ledgers.map((l) => ({
        id: Number(l.id),
        name: l.ledgerName,
      })),
    [ledgers],
  );

  const cashVoucherTypeOptions = useMemo(
    () => CASH_BOOK_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all"),
    [],
  );

  const effectiveLedgerId = useMemo(() => {
    if (ledgerIds.length > 0) return ledgerIds[0];
    return ledgers[0]?.id ?? "";
  }, [ledgerIds, ledgers]);

  const statement = useMemo(() => {
    if (!mounted || !effectiveLedgerId) return null;
    return buildCashBookStatement(effectiveLedgerId, {
      dateFrom,
      dateTo,
      voucherType: voucherTypes,
      search,
    });
  }, [mounted, effectiveLedgerId, dateFrom, dateTo, voucherTypes, search]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary(
        "ledger",
        "Cash Ledgers",
        ledgerIds,
        cashLedgerOptions.map((l) => ({ value: String(l.id), label: l.name })),
        () => setLedgerIds([]),
      ),
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        cashVoucherTypeOptions,
        () => setVoucherTypes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [ledgerIds, voucherTypes, cashLedgerOptions, cashVoucherTypeOptions]);

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
        effectiveLedgerId={effectiveLedgerId}
        ledgerIds={ledgerIds}
        setLedgerIds={setLedgerIds}
        cashLedgerOptions={cashLedgerOptions}
        cashVoucherTypeOptions={cashVoucherTypeOptions}
        filterSummaryItems={filterSummaryItems}
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
        voucherTypes={voucherTypes}
        setVoucherTypes={setVoucherTypes}
        search={search}
        setSearch={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}

function CashBookPageBody({
  effectiveLedgerId,
  ledgerIds,
  setLedgerIds,
  cashLedgerOptions,
  cashVoucherTypeOptions,
  filterSummaryItems,
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
  voucherTypes,
  setVoucherTypes,
  search,
  setSearch,
}: {
  effectiveLedgerId: string;
  ledgerIds: string[];
  setLedgerIds: (v: string[]) => void;
  cashLedgerOptions: { id: number; name: string }[];
  cashVoucherTypeOptions: { value: string; label: string }[];
  filterSummaryItems: ReportFilterSummaryItem[];
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
  voucherTypes: string[];
  setVoucherTypes: (v: string[]) => void;
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

  const canExport = Boolean(statement && effectiveLedgerId);

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
    effectiveLedgerId &&
    statement &&
    !statement.hasPeriodTransactions &&
    !search.trim() &&
    voucherTypes.length === 0;

  const showNoFilterResults =
    effectiveLedgerId && statement && statement.hasPeriodTransactions && transactionRows.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Cash Book")}
      title="Cash Book"
      description="Read-only cash ledger report from posted receipt, payment, contra, and journal vouchers."
      filters={
        <>
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
            <ReportLedgerMultiFilter
              values={ledgerIds}
              onChange={setLedgerIds}
              ledgers={cashLedgerOptions}
              label="Cash Ledger"
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={cashVoucherTypeOptions}
            />
            <div className="space-y-1 min-w-[200px] flex-1">
              <Label className={filterLabelClass}>Search</Label>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Voucher no., type, particular, narration…"
                  className={cn(filterControlClass, "mt-0 pr-8")}
                  disabled={!effectiveLedgerId}
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
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {!effectiveLedgerId ? (
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
                      setVoucherTypes([]);
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
    <Suspense fallback={<CashBookFallback />}>
      <CashBookPageContent />
    </Suspense>
  );
}

function CashBookFallback() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Cash Book")}
      title="Cash Book"
      description="Read-only cash ledger report from posted accounting vouchers."
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading Cash Book…
      </div>
    </AccountsPageShell>
  );
}
