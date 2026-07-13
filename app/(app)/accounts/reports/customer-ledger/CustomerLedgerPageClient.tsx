"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import {
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { Users, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  ReportVoucherTypeMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  countActiveMoreFilters,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildCustomerGeneralLedgerHref,
  buildCustomerLedgerStatement,
  CUSTOMER_LEDGER_VOUCHER_TYPE_OPTIONS,
  getCustomerLedgerCustomers,
} from "./customer-ledger-data";
import {
  exportCustomerLedgerToExcel,
  exportCustomerLedgerToPdf,
} from "./customer-ledger-export";
import { CustomerLedgerTable } from "./CustomerLedgerTable";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import "../trial-balance/trial-balance-compact.css";

function CustomerLedgerPageContent() {
  const mounted = useClientMounted();
  const ledgerDataTick = useAccountsSectionRefresh([
    "ledgers",
    "receipt-vouchers",
    "payment-vouchers",
    "journal-vouchers",
    "sales-invoices",
    "credit-notes",
    "debit-notes",
  ]);

  const [customerId, setCustomerId] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const customers = useMemo(() => getCustomerLedgerCustomers(), []);

  const statement = useMemo(() => {
    if (!mounted || !customerId) return null;
    return buildCustomerLedgerStatement(customerId, {
      dateFrom,
      dateTo,
      voucherType: voucherTypes,
      search: "",
    });
  }, [mounted, customerId, dateFrom, dateTo, voucherTypes, ledgerDataTick]);

  const voucherTypeOptions = useMemo(
    () => CUSTOMER_LEDGER_VOUCHER_TYPE_OPTIONS.filter((o) => o.value !== "all"),
    [],
  );

  const moreFiltersActiveCount = countActiveMoreFilters({
    voucherType: voucherTypes,
  });

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

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
    }),
    [dateFrom, dateTo],
  );

  const canExport = Boolean(statement && customerId);

  const generalLedgerHref = useMemo(
    () =>
      customerId ? buildCustomerGeneralLedgerHref(customerId, { dateFrom, dateTo }) : null,
    [customerId, dateFrom, dateTo],
  );

  const handleExportExcel = async () => {
    if (!statement || !openingRow || !closingRow) return;
    setExporting(true);
    try {
      const exportRows = [openingRow, ...allTransactionRows, closingRow];
      await exportCustomerLedgerToExcel(exportRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement || !openingRow || !closingRow) return;
    const exportRows = [openingRow, ...allTransactionRows, closingRow];
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
      layout="split"
      className="h-full min-h-0 trial-balance-compact"
      actions={
        <div className="flex items-center gap-2">
          {generalLedgerHref ? (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
              <Link href={generalLedgerHref}>
                <FileText className="w-3.5 h-3.5" />
                General Ledger
              </Link>
            </Button>
          ) : null}
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={!canExport || exporting}
          />
        </div>
      }
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
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportVoucherTypeMultiFilter
                values={voucherTypes}
                onChange={setVoucherTypes}
                options={voucherTypeOptions}
              />
            </ReportMoreFilters>
          </ReportFilterRow>
          {customerId ? <ReportFilterSummary items={filterSummaryItems} /> : null}
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 financial-report">
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
            {statement && <AccountsSummaryBar items={summaryItems} />}

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
                    No transactions match the selected voucher type filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setVoucherTypes([])}
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
