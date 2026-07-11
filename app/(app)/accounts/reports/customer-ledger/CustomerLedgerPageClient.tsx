"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
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
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildCustomerLedgerStatement,
  CUSTOMER_LEDGER_VOUCHER_TYPE_OPTIONS,
  getCustomerLedgerCustomers,
  type CustomerLedgerDisplayRow,
} from "./customer-ledger-data";
import {
  exportCustomerLedgerToExcel,
  exportCustomerLedgerToPdf,
} from "./customer-ledger-export";
import { CustomerLedgerTable } from "./CustomerLedgerTable";

function CustomerLedgerPageContent() {
  const mounted = useClientMounted();

  const [customerId, setCustomerId] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const customers = useMemo(() => getCustomerLedgerCustomers(), []);

  

  const statement = useMemo(() => {
    if (!mounted || !customerId) return null;
    return buildCustomerLedgerStatement(customerId, {
      dateFrom,
      dateTo,
      voucherType: voucherTypes,
      search,
    });
  }, [mounted, customerId, dateFrom, dateTo, voucherTypes, search]);

  const voucherTypeOptions = useMemo(
    () => CUSTOMER_LEDGER_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all"),
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

  const openingRow = statement?.displayRows[0] ?? null;
  const closingRow = statement ? statement.displayRows[statement.displayRows.length - 1] : null;
  const allTransactionRows = statement?.transactionRows ?? [];

  const getCellValue = useCallback((row: CustomerLedgerDisplayRow, key: string) => {
    switch (key) {
      case "voucher":
        return row.voucherNo;
      case "type":
        return row.voucherType;
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      voucher: { type: "text" as const },
      type: { type: "text" as const },
      particular: { type: "text" as const },
      narration: { type: "text" as const },
      debit: { type: "amount" as const },
      credit: { type: "amount" as const },
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

  const canExport = Boolean(statement && customerId);

  return (
    <AccountsColumnFilterProvider
      rows={allTransactionRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <CustomerLedgerPageBody
        customerId={customerId}
        setCustomerId={setCustomerId}
        customers={customers}
        statement={statement}
        allTransactionRows={allTransactionRows}
        openingRow={openingRow}
        closingRow={closingRow}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
        canExport={canExport}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        voucherTypes={voucherTypes}
        setVoucherTypes={setVoucherTypes}
        voucherTypeOptions={voucherTypeOptions}
        filterSummaryItems={filterSummaryItems}
        search={search}
        setSearch={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}

function CustomerLedgerPageBody({
  customerId,
  setCustomerId,
  customers,
  statement,
  allTransactionRows,
  openingRow,
  closingRow,
  exporting,
  setExporting,
  exportMeta,
  canExport,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  voucherTypes,
  setVoucherTypes,
  voucherTypeOptions,
  filterSummaryItems,
  search,
  setSearch,
}: {
  customerId: string;
  setCustomerId: (v: string) => void;
  customers: ReturnType<typeof getCustomerLedgerCustomers>;
  statement: ReturnType<typeof buildCustomerLedgerStatement> | null;
  allTransactionRows: CustomerLedgerDisplayRow[];
  openingRow: CustomerLedgerDisplayRow | null;
  closingRow: CustomerLedgerDisplayRow | null | undefined;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: { dateFrom: string; dateTo: string; financialYear: string };
  canExport: boolean;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  voucherTypes: string[];
  setVoucherTypes: (v: string[]) => void;
  voucherTypeOptions: { value: string; label: string }[];
  filterSummaryItems: ReportFilterSummaryItem[];
  search: string;
  setSearch: (v: string) => void;
}) {
  const columnFilteredRows = useAccountsFilteredRows(allTransactionRows);

  const handleExportExcel = async () => {
    if (!statement || !openingRow || !closingRow) return;
    setExporting(true);
    try {
      const exportRows = [openingRow, ...columnFilteredRows, closingRow];
      await exportCustomerLedgerToExcel(exportRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement || !openingRow || !closingRow) return;
    const exportRows = [openingRow, ...columnFilteredRows, closingRow];
    exportCustomerLedgerToPdf(exportRows, statement.summary, exportMeta);
  };

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
    allTransactionRows.length === 0 &&
    statement.summary.openingBalance === 0 &&
    statement.summary.closingBalance === 0 &&
    !search.trim() &&
    !isMultiFilterActive(voucherTypes);

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
            <div className="space-y-1 min-w-[200px]">
              <Label className={filterLabelClass}>
                Customer <span className="text-red-500">*</span>
              </Label>
              <Select
                value={customerId || undefined}
                onValueChange={setCustomerId}
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
            <ReportVoucherTypeMultiFilter
              values={voucherTypes}
              onChange={setVoucherTypes}
              options={voucherTypeOptions}
            />
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
          {customerId ? <ReportFilterSummary items={filterSummaryItems} /> : null}
        </>
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
                      setVoucherTypes([]);
                    }}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            ) : statement && openingRow && closingRow ? (
              <CustomerLedgerTable
                openingRow={openingRow}
                transactionRows={allTransactionRows}
                closingRow={closingRow}
              />
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
