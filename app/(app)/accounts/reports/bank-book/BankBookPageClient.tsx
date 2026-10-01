"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportLedgerMultiFilter,
  ReportVoucherTypeMultiFilter,
  ReportFilterSummary,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  BANK_BOOK_VOUCHER_TYPE_OPTIONS,
  buildBankBookStatement,
  getBankBookAccountOptions,
  type BankBookDisplayRow,
} from "./bank-book-data";
import { ensureBankAccountsReady } from "@/lib/accounts/bank-accounts-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { exportBankBookToExcel, exportBankBookToPdf } from "./bank-book-export";
import { BankBookTable } from "./BankBookTable";

function BankBookPageContent() {
  const mounted = useClientMounted();
  const [refreshKey, setRefreshKey] = useState(0);

  const [bankLedgerIds, setBankLedgerIds] = useState<string[]>([]);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    ensureBankAccountsReady();
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const bankOptions = useMemo(() => {
    void refreshKey;
    return getBankBookAccountOptions();
  }, [refreshKey]);

  const bankLedgerOptions = useMemo(
    () =>
      bankOptions.map((b) => ({
        id: b.ledgerId,
        name: b.label,
      })),
    [bankOptions],
  );

  const bankVoucherTypeOptions = useMemo(
    () => BANK_BOOK_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all"),
    [],
  );

  const effectiveBankLedgerId = useMemo(() => {
    if (bankLedgerIds.length > 0) return bankLedgerIds[0];
    const defaultBank = bankOptions[0];
    return defaultBank ? String(defaultBank.ledgerId) : "";
  }, [bankLedgerIds, bankOptions]);

  const statement = useMemo(() => {
    if (!mounted || !effectiveBankLedgerId) return null;
    return buildBankBookStatement(Number(effectiveBankLedgerId), {
      dateFrom,
      dateTo,
      financialYearId: "all",
      voucherType: voucherTypes,
      search,
    });
  }, [mounted, effectiveBankLedgerId, dateFrom, dateTo, voucherTypes, search]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary(
        "bank",
        "Bank Accounts",
        bankLedgerIds,
        bankLedgerOptions.map((b) => ({ value: String(b.id), label: b.name })),
        () => setBankLedgerIds([]),
      ),
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        bankVoucherTypeOptions,
        () => setVoucherTypes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [bankLedgerIds, voucherTypes, bankLedgerOptions, bankVoucherTypeOptions]);

  const transactionRows = statement?.transactionRows ?? [];

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
    }),
    [dateFrom, dateTo],
  );

  const canExport = Boolean(statement && effectiveBankLedgerId);

  const getCellValue = useCallback((row: BankBookDisplayRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      voucherNo: { type: "text" as const },
      voucherType: { type: "text" as const },
      particular: { type: "text" as const },
      narration: { type: "text" as const },
      reference: { type: "text" as const },
      status: { type: "text" as const },
      receipt: { type: "amount" as const },
      payment: { type: "amount" as const },
    }),
    [],
  );

  const showNoTransactions =
    effectiveBankLedgerId &&
    statement &&
    !statement.hasPeriodTransactions &&
    !search.trim() &&
    voucherTypes.length === 0;

  const showNoFilterResults =
    effectiveBankLedgerId &&
    statement &&
    statement.hasPeriodTransactions &&
    transactionRows.length === 0;

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

  return (
    <AccountsColumnFilterProvider
      rows={transactionRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <BankBookPageBody
        effectiveBankLedgerId={effectiveBankLedgerId}
        statement={statement}
        transactionRows={transactionRows}
        canExport={canExport}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
        summaryItems={summaryItems}
        showNoTransactions={Boolean(showNoTransactions)}
        showNoFilterResults={Boolean(showNoFilterResults)}
        filterSummaryItems={filterSummaryItems}
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setPreset={setPreset}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        bankLedgerOptions={bankLedgerOptions}
        bankLedgerIds={bankLedgerIds}
        setBankLedgerIds={setBankLedgerIds}
        bankVoucherTypeOptions={bankVoucherTypeOptions}
        voucherTypes={voucherTypes}
        setVoucherTypes={setVoucherTypes}
        search={search}
        setSearch={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}

function BankBookPageBody({
  effectiveBankLedgerId,
  statement,
  transactionRows,
  canExport,
  exporting,
  setExporting,
  exportMeta,
  summaryItems,
  showNoTransactions,
  showNoFilterResults,
  filterSummaryItems,
  preset,
  dateFrom,
  dateTo,
  setPreset,
  setDateFrom,
  setDateTo,
  bankLedgerOptions,
  bankLedgerIds,
  setBankLedgerIds,
  bankVoucherTypeOptions,
  voucherTypes,
  setVoucherTypes,
  search,
  setSearch,
}: {
  effectiveBankLedgerId: string;
  statement: ReturnType<typeof buildBankBookStatement> | null;
  transactionRows: BankBookDisplayRow[];
  canExport: boolean;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: { dateFrom: string; dateTo: string; financialYear: string };
  summaryItems: { label: string; value: string }[];
  showNoTransactions: boolean;
  showNoFilterResults: boolean;
  filterSummaryItems: ReportFilterSummaryItem[];
  preset: ReturnType<typeof useReportDateRange>["preset"];
  dateFrom: string;
  dateTo: string;
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  bankLedgerOptions: { id: number; name: string }[];
  bankLedgerIds: string[];
  setBankLedgerIds: (v: string[]) => void;
  bankVoucherTypeOptions: { value: string; label: string }[];
  voucherTypes: string[];
  setVoucherTypes: (v: string[]) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const columnFilteredRows = useAccountsFilteredRows(transactionRows);

  const handleExportExcel = async () => {
    if (!statement) return;
    setExporting(true);
    try {
      await exportBankBookToExcel(
        statement.openingRow,
        columnFilteredRows,
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
      columnFilteredRows,
      statement.summary,
      exportMeta,
    );
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Book")}
      title="Bank Book"
      description="Read-only bank ledger report from posted accounting vouchers."
      filters={
        <>
          <ReportFilterRow
            className="items-end"
            end={
              <>
                <AccountsClearAllColumnFiltersButton />
                <AccountsExportMenu
                  onExcel={handleExportExcel}
                  onPdf={handleExportPdf}
                  disabled={!canExport || exporting}
                />
              </>
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
              values={bankLedgerIds}
              onChange={setBankLedgerIds}
              ledgers={bankLedgerOptions}
              label="Bank Account"
            />
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={bankVoucherTypeOptions}
            />
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Voucher no., particular, narration…"
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0">
        {!effectiveBankLedgerId ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-1.5 max-w-sm">
              <Landmark className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-medium text-foreground">
                Please select a Bank Account to view Bank Book.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && <AccountsSummaryBar items={summaryItems} />}

            {showNoTransactions ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  No Bank Book transactions found for the selected period.
                </p>
              </div>
            ) : showNoFilterResults ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center space-y-1.5">
                  <p className="text-xs text-muted-foreground">
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
            ) : statement ? (
              <BankBookTable
                openingRow={statement.openingRow}
                transactionRows={transactionRows}
                summary={statement.summary}
              />
            ) : null}
          </>
        )}
      </div>
      </AccountsListingTableCard>
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
