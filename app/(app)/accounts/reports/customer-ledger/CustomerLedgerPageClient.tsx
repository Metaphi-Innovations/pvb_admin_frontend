"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Users, X } from "lucide-react";
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
  buildCustomerLedgerStatement,
  CUSTOMER_LEDGER_VOUCHER_TYPE_OPTIONS,
  getCustomerLedgerCustomers,
} from "./customer-ledger-data";
import {
  exportCustomerLedgerToExcel,
  exportCustomerLedgerToPdf,
} from "./customer-ledger-export";
import { CustomerLedgerTable } from "./CustomerLedgerTable";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-8 text-xs";
const PLACEHOLDER_FROM = "2026-04-01";
const PLACEHOLDER_TO = "2026-06-30";

function CustomerLedgerPageContent() {
  const mounted = useClientMounted();

  const [customerId, setCustomerId] = useState("");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_FROM);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_TO);
  const [datesReady, setDatesReady] = useState(false);
  const [voucherType, setVoucherType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const customers = useMemo(() => getCustomerLedgerCustomers(), []);

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
    if (financialYearId === "all") return;
    const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
    if (!fy) return;
    setDateFrom(fy.startDate);
    setDateTo(fy.endDate);
  }, [financialYearId]);

  const statement = useMemo(() => {
    if (!mounted || !customerId || !datesReady) return null;
    return buildCustomerLedgerStatement(customerId, {
      dateFrom,
      dateTo,
      voucherType,
      search,
    });
  }, [mounted, customerId, dateFrom, dateTo, voucherType, search, datesReady]);

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

  const canExport = Boolean(statement && customerId);

  const handleExportExcel = async () => {
    if (!statement) return;
    setExporting(true);
    try {
      await exportCustomerLedgerToExcel(statement.displayRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement) return;
    exportCustomerLedgerToPdf(statement.displayRows, statement.summary, exportMeta);
  };

  useEffect(() => {
    setPage(1);
  }, [customerId, dateFrom, dateTo, voucherType, search, pageSize]);

  const summaryItems = statement
    ? [
        { label: "Customer Name", value: statement.summary.customerName },
        { label: "Customer Code", value: statement.summary.customerCode },
        { label: "GSTIN", value: statement.summary.gstin },
        { label: "PAN", value: statement.summary.pan },
        {
          label: "Opening Balance",
          value: formatBalanceAmount(
            statement.summary.openingBalance,
            statement.summary.openingBalanceType,
          ),
        },
        { label: "Total Debit", value: formatMoney(statement.summary.totalDebit) },
        { label: "Total Credit", value: formatMoney(statement.summary.totalCredit) },
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
    customerId &&
    statement &&
    !statement.hasPeriodTransactions &&
    !search.trim() &&
    voucherType === "all";

  const showNoFilterResults =
    customerId &&
    statement &&
    statement.hasPeriodTransactions &&
    allTransactionRows.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Customer Ledger")}
      title="Customer Ledger"
      description="Complete customer-wise transaction history with running balance."
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
              Customer <span className="text-red-500">*</span>
            </Label>
            <Select
              value={customerId || undefined}
              onValueChange={(value) => {
                setCustomerId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[200px]")}>
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.customerName}
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
                {CUSTOMER_LEDGER_VOUCHER_TYPE_OPTIONS.map((o) => (
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
                placeholder="Voucher no., particular, narration, amount…"
                className={cn(filterControlClass, "mt-0 pr-8")}
                disabled={!customerId}
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
        {!customerId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2 max-w-sm">
              <Users className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Please select a customer to view ledger.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && <AccountsSummaryBar items={summaryItems} className="lg:grid-cols-4" />}

            {showNoTransactions ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No customer ledger transactions found for the selected period.
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
                <CustomerLedgerTable
                  openingRow={openingRow}
                  transactionRows={paginatedTransactions}
                  closingRow={closingRow}
                  totalDebit={statement.summary.totalDebit}
                  totalCredit={statement.summary.totalCredit}
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

function CustomerLedgerFallback() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Customer Ledger")}
      title="Customer Ledger"
      description="Complete customer-wise transaction history with running balance."
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading Customer Ledger…
      </div>
    </AccountsPageShell>
  );
}

export default function CustomerLedgerPageClient() {
  return (
    <Suspense fallback={<CustomerLedgerFallback />}>
      <CustomerLedgerPageContent />
    </Suspense>
  );
}
