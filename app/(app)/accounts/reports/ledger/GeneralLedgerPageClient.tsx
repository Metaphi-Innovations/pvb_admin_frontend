"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, X } from "lucide-react";
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
  ReportVoucherTypeFilter,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { ensureGeneralLedgerDemoOnPageLoad } from "@/lib/accounts/general-ledger-demo-seed";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildGeneralLedgerStatement,
  getGeneralLedgerLedgers,
} from "./general-ledger-data";
import {
  exportGeneralLedgerToExcel,
  exportGeneralLedgerToPdf,
} from "./general-ledger-export";
import { GeneralLedgerTable } from "./GeneralLedgerTable";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-8 text-xs";
const PLACEHOLDER_FROM = "2026-04-01";
const PLACEHOLDER_TO = "2026-06-30";

function defaultGeneralLedgerDateRange(fy: { startDate: string; endDate: string }): {
  from: string;
  to: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  if (fy.endDate < PLACEHOLDER_FROM && today >= PLACEHOLDER_FROM) {
    return { from: PLACEHOLDER_FROM, to: PLACEHOLDER_TO };
  }
  const to = fy.endDate > PLACEHOLDER_TO ? PLACEHOLDER_TO : fy.endDate;
  return { from: fy.startDate, to: today < to ? today : to };
}

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
  const [financialYearId, setFinancialYearId] = useState("all");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_FROM);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_TO);
  const [datesReady, setDatesReady] = useState(false);
  const [voucherType, setVoucherType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [dataTick, setDataTick] = useState(0);

  const ledgers = useMemo(
    () => (mounted ? getGeneralLedgerLedgers() : []),
    [mounted, dataTick],
  );

  useEffect(() => {
    ensureGeneralLedgerDemoOnPageLoad();
    setDataTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    const years = loadFinancialYears();
    const activeFy = years.find((fy) => fy.id === activeFyId) ?? years.find((fy) => fy.status === "active");

    if (activeFy) {
      setFinancialYearId(String(activeFy.id));
      const { from, to } = defaultGeneralLedgerDateRange(activeFy);
      setDateFrom(from);
      setDateTo(to);
    } else {
      setDateFrom(PLACEHOLDER_FROM);
      setDateTo(PLACEHOLDER_TO);
    }
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (!datesReady) return;
    const urlLedger = searchParams.get("ledger") ?? "";
    const resolved = resolveLedgerFromUrl(urlLedger);
    if (resolved) setLedgerId(resolved);
  }, [searchParams, datesReady]);

  useEffect(() => {
    if (financialYearId === "all") return;
    const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
    if (!fy) return;
    const { from, to } = defaultGeneralLedgerDateRange(fy);
    setDateFrom(from);
    setDateTo(to);
  }, [financialYearId]);

  const handleLedgerChange = useCallback(
    (value: string) => {
      setLedgerId(value);
      setPage(1);
      if (value) {
        router.replace(`/accounts/reports/ledger?ledger=${encodeURIComponent(value)}`, { scroll: false });
      } else {
        router.replace("/accounts/reports/ledger", { scroll: false });
      }
    },
    [router],
  );

  const statement = useMemo(() => {
    if (!mounted || !ledgerId || !datesReady) return null;
    return buildGeneralLedgerStatement(ledgerId, {
      dateFrom,
      dateTo,
      voucherType,
      search,
    });
  }, [mounted, ledgerId, dateFrom, dateTo, voucherType, search, datesReady, dataTick]);

  const openingRow = statement?.displayRows[0] ?? null;
  const closingRow = statement ? statement.displayRows[statement.displayRows.length - 1] : null;
  const allTransactionRows = statement?.transactionRows ?? [];

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allTransactionRows.slice(start, start + pageSize);
  }, [allTransactionRows, page, pageSize]);

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
      await exportGeneralLedgerToExcel(statement.displayRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement) return;
    exportGeneralLedgerToPdf(statement.displayRows, statement.summary, exportMeta);
  };

  useEffect(() => {
    setPage(1);
  }, [ledgerId, dateFrom, dateTo, voucherType, search, pageSize]);

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
    voucherType === "all";

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
              Ledger <span className="text-red-500">*</span>
            </Label>
            <Select value={ledgerId || undefined} onValueChange={handleLedgerChange}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[200px]")}>
                <SelectValue placeholder="Select ledger…" />
              </SelectTrigger>
              <SelectContent>
                {ledgers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ReportVoucherTypeFilter value={voucherType} onChange={setVoucherType} />
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
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Please select a Ledger to view transactions.
              </p>
              <p className="text-xs text-muted-foreground">
                Choose a ledger from the filter above to load its posting history and running balance.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && <AccountsSummaryBar items={summaryItems} className="lg:grid-cols-7" />}

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
                      setVoucherType("all");
                    }}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            ) : statement && openingRow && closingRow ? (
              <>
                <GeneralLedgerTable
                  openingRow={openingRow}
                  transactionRows={paginatedTransactions}
                  closingRow={closingRow}
                />
                {allTransactionRows.length > 0 && (
                  <div className="flex-shrink-0 border-t border-border">
                    <AccountsTablePagination
                      page={page}
                      pageSize={pageSize}
                      totalRecords={allTransactionRows.length}
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
