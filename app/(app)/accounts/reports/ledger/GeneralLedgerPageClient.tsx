"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsColumnFilterProvider,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportVoucherTypeMultiFilter,
  ReportFilterSummary,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { drCrSideFilterValue } from "@/lib/accounts/column-filter-display";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildGeneralLedgerStatement,
  getGeneralLedgerLedgers,
  type GeneralLedgerDisplayRow,
} from "./general-ledger-data";
import {
  exportGeneralLedgerToExcel,
  exportGeneralLedgerToPdf,
} from "./general-ledger-export";
import { GeneralLedgerTable } from "./GeneralLedgerTable";
import { GeneralLedgerSelect } from "./GeneralLedgerSelect";
function resolveLedgerFromUrl(urlLedgerId: string): string {
  if (!urlLedgerId) return "";
  const ledgers = getGeneralLedgerLedgers();
  if (ledgers.some((l) => l.id === urlLedgerId)) return urlLedgerId;
  const numericId = String(Number(urlLedgerId));
  if (numericId !== "NaN" && ledgers.some((l) => l.id === numericId)) return numericId;
  return "";
}

function GeneralLedgerPageContent() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ledgerId, setLedgerId] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dataTick, setDataTick] = useState(0);

  const ledgers = useMemo(
    () => (mounted ? getGeneralLedgerLedgers() : []),
    [mounted, dataTick],
  );

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setDataTick((t) => t + 1);
  }, [sectionRefresh]);

  useEffect(() => {
    if (!mounted) return;
    const urlLedger = searchParams.get("ledger") ?? "";
    const resolved = resolveLedgerFromUrl(urlLedger);
    if (resolved) setLedgerId(resolved);

    const urlFrom = searchParams.get("from");
    const urlTo = searchParams.get("to");
    if (urlFrom) {
      setDateFrom(urlFrom);
      setPreset("custom");
    }
    if (urlTo) {
      setDateTo(urlTo);
      setPreset("custom");
    }
  }, [searchParams, mounted, setDateFrom, setDateTo, setPreset]);

  const handleLedgerChange = useCallback(
    (value: string) => {
      setLedgerId(value);
      const params = new URLSearchParams();
      if (value) params.set("ledger", value);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();
      router.replace(qs ? `/accounts/reports/ledger?${qs}` : "/accounts/reports/ledger", {
        scroll: false,
      });
    },
    [router, dateFrom, dateTo],
  );

  const statement = useMemo(() => {
    if (!mounted || !ledgerId) return null;
    return buildGeneralLedgerStatement(ledgerId, {
      dateFrom,
      dateTo,
      voucherType: voucherTypes,
      search,
    });
  }, [mounted, ledgerId, dateFrom, dateTo, voucherTypes, search, dataTick]);

  const openingRow = statement?.displayRows[0] ?? null;
  const closingRow = statement ? statement.displayRows[statement.displayRows.length - 1] : null;
  const allTransactionRows = statement?.transactionRows ?? [];

  const getCellValue = useCallback((row: GeneralLedgerDisplayRow, key: string) => {
    switch (key) {
      case "type":
        return row.kind === "opening" ? "Opening" : row.voucherType;
      case "voucher":
        return row.voucherNo;
      case "reference":
        return row.referenceNo;
      case "particulars":
        return row.particularsNarration;
      case "balance":
        return row.runningBalance;
      case "side":
        return drCrSideFilterValue({
          debit: row.debit,
          credit: row.credit,
          runningBalanceType: row.runningBalanceType,
          runningBalance: row.runningBalance,
          isBalanceRow: row.kind === "opening" || row.kind === "closing",
        });
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      type: { type: "text" as const },
      voucher: { type: "text" as const },
      reference: { type: "text" as const },
      particulars: { type: "text" as const },
      debit: { type: "amount" as const },
      credit: { type: "amount" as const },
      side: { type: "text" as const },
    }),
    [],
  );

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
    }),
    [dateFrom, dateTo],
  );

  const canExport = Boolean(statement && ledgerId);

  return (
    <AccountsColumnFilterProvider
      rows={allTransactionRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <GeneralLedgerPageBody
        ledgerId={ledgerId}
        ledgers={ledgers}
        statement={statement}
        allTransactionRows={allTransactionRows}
        openingRow={openingRow}
        closingRow={closingRow}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
        canExport={canExport}
        handleLedgerChange={handleLedgerChange}
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

function GeneralLedgerPageBody({
  ledgerId,
  ledgers,
  statement,
  allTransactionRows,
  openingRow,
  closingRow,
  exporting,
  setExporting,
  exportMeta,
  canExport,
  handleLedgerChange,
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
  ledgerId: string;
  ledgers: ReturnType<typeof getGeneralLedgerLedgers>;
  statement: ReturnType<typeof buildGeneralLedgerStatement> | null;
  allTransactionRows: GeneralLedgerDisplayRow[];
  openingRow: GeneralLedgerDisplayRow | null;
  closingRow: GeneralLedgerDisplayRow | null | undefined;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: { dateFrom: string; dateTo: string; financialYear: string };
  canExport: boolean;
  handleLedgerChange: (value: string) => void;
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
  const columnFilteredRows = useAccountsFilteredRows(allTransactionRows);

  const voucherTypeOptions = useMemo(
    () =>
      (Object.entries(VOUCHER_TYPE_LABELS) as [VoucherTypeCode, string][]).map(([code, label]) => ({
        value: code,
        label,
      })),
    [],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        voucherTypeOptions,
        () => setVoucherTypes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [voucherTypes, voucherTypeOptions]);

  const handleExportExcel = async () => {
    if (!statement) return;
    setExporting(true);
    try {
      const exportRows = openingRow
        ? [openingRow, ...columnFilteredRows, ...(closingRow ? [closingRow] : [])]
        : columnFilteredRows;
      await exportGeneralLedgerToExcel(exportRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement) return;
    const exportRows = openingRow
      ? [openingRow, ...columnFilteredRows, ...(closingRow ? [closingRow] : [])]
      : columnFilteredRows;
    exportGeneralLedgerToPdf(exportRows, statement.summary, exportMeta);
  };

  const summaryItems = statement
    ? [
        { label: "Ledger", value: statement.summary.ledgerName },
        { label: "Type", value: statement.summary.ledgerType },
        {
          label: "Opening Balance",
          value: formatBalanceAmount(
            statement.summary.openingBalance,
            statement.summary.openingBalanceType,
          ),
        },
        {
          label: "Closing Balance",
          value: formatBalanceAmount(
            statement.summary.closingBalance,
            statement.summary.closingBalanceType,
          ),
        },
        { label: "Total Debit", value: formatMoney(statement.summary.totalDebit) },
        { label: "Total Credit", value: formatMoney(statement.summary.totalCredit) },
        {
          label: "Current Balance",
          value: formatBalanceAmount(
            statement.summary.currentBalance,
            statement.summary.currentBalanceType,
          ),
        },
      ]
    : [];

  const showNoTransactions =
    ledgerId &&
    statement &&
    !statement.hasPeriodTransactions &&
    !search.trim() &&
    voucherTypes.length === 0;

  const showNoFilterResults =
    ledgerId &&
    statement &&
    statement.hasPeriodTransactions &&
    allTransactionRows.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "General Ledger")}
      title="General Ledger"
      description="Complete transaction history for a selected ledger with running balance."
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
            />
            <GeneralLedgerSelect
              value={ledgerId}
              ledgers={ledgers}
              onChange={handleLedgerChange}
            />
            <ReportVoucherTypeMultiFilter values={voucherTypes} onChange={setVoucherTypes} />
            <div className="space-y-1 min-w-[200px] flex-1">
              <Label className={filterLabelClass}>Search</Label>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Voucher no., party, GSTIN, narration, reference…"
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
            <AccountsExportMenu
              onExcel={handleExportExcel}
              onPdf={handleExportPdf}
              disabled={!canExport || exporting}
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
        {!ledgerId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2 max-w-sm">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Please select a Ledger to view transactions.
              </p>
              <p className="text-xs text-muted-foreground">
                Search and select a ledger from the filter above to load its posting history and running balance.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && <AccountsSummaryBar items={summaryItems} />}

            {showNoTransactions ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No transactions found for the selected ledger during the selected period.
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
            ) : statement && openingRow && closingRow ? (
              <GeneralLedgerTable
                openingRow={openingRow}
                transactionRows={allTransactionRows}
                closingRow={closingRow}
              />
            ) : null}
          </>
        )}
      </div>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}

function GeneralLedgerFallback() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "General Ledger")}
      title="General Ledger"
      description="Complete transaction history for a selected ledger with running balance."
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading General Ledger…
      </div>
    </AccountsPageShell>
  );
}

export default function GeneralLedgerPageClient() {
  return (
    <Suspense fallback={<GeneralLedgerFallback />}>
      <GeneralLedgerPageContent />
    </Suspense>
  );
}
