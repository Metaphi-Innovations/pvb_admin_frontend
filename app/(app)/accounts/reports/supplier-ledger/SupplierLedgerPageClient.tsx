"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { useRouter, useSearchParams } from "next/navigation";
import { Truck, X } from "lucide-react";
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
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildSupplierLedgerStatement,
  getSupplierLedgerSuppliers,
  SUPPLIER_LEDGER_VOUCHER_TYPE_OPTIONS,
  type SupplierLedgerDisplayRow,
} from "./supplier-ledger-data";
import {
  exportSupplierLedgerToExcel,
  exportSupplierLedgerToPdf,
} from "./supplier-ledger-export";
import { SupplierLedgerTable } from "./SupplierLedgerTable";

function SupplierLedgerPageContent() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [supplierId, setSupplierId] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [voucherType, setVoucherType] = useState("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const suppliers = useMemo(() => getSupplierLedgerSuppliers(), []);

  useEffect(() => {
    if (!mounted) return;
    const urlSupplier = searchParams.get("supplier") ?? "";
    if (urlSupplier && suppliers.some((s) => s.id === urlSupplier)) {
      setSupplierId(urlSupplier);
    }
  }, [searchParams, mounted, suppliers]);

  

  const handleSupplierChange = useCallback(
    (value: string) => {
      setSupplierId(value);
      if (value) {
        router.replace(`/accounts/reports/supplier-ledger?supplier=${encodeURIComponent(value)}`, {
          scroll: false,
        });
      } else {
        router.replace("/accounts/reports/supplier-ledger", { scroll: false });
      }
    },
    [router],
  );

  const statement = useMemo(() => {
    if (!mounted || !supplierId) return null;
    return buildSupplierLedgerStatement(supplierId, {
      dateFrom,
      dateTo,
      voucherType,
      search,
    });
  }, [mounted, supplierId, dateFrom, dateTo, voucherType, search]);

  const openingRow = statement?.displayRows[0] ?? null;
  const closingRow = statement ? statement.displayRows[statement.displayRows.length - 1] : null;
  const allTransactionRows = statement?.transactionRows ?? [];

  const getCellValue = useCallback((row: SupplierLedgerDisplayRow, key: string) => {
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

  const canExport = Boolean(statement && supplierId);

  return (
    <AccountsColumnFilterProvider
      rows={allTransactionRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <SupplierLedgerPageBody
        supplierId={supplierId}
        suppliers={suppliers}
        handleSupplierChange={handleSupplierChange}
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
        voucherType={voucherType}
        setVoucherType={setVoucherType}
        search={search}
        setSearch={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}

function SupplierLedgerPageBody({
  supplierId,
  suppliers,
  handleSupplierChange,
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
  voucherType,
  setVoucherType,
  search,
  setSearch,
}: {
  supplierId: string;
  suppliers: ReturnType<typeof getSupplierLedgerSuppliers>;
  handleSupplierChange: (value: string) => void;
  statement: ReturnType<typeof buildSupplierLedgerStatement> | null;
  allTransactionRows: SupplierLedgerDisplayRow[];
  openingRow: SupplierLedgerDisplayRow | null;
  closingRow: SupplierLedgerDisplayRow | null | undefined;
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
  voucherType: string;
  setVoucherType: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const columnFilteredRows = useAccountsFilteredRows(allTransactionRows);

  const handleExportExcel = async () => {
    if (!statement || !openingRow || !closingRow) return;
    setExporting(true);
    try {
      const exportRows = [openingRow, ...columnFilteredRows, closingRow];
      await exportSupplierLedgerToExcel(exportRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement || !openingRow || !closingRow) return;
    const exportRows = [openingRow, ...columnFilteredRows, closingRow];
    exportSupplierLedgerToPdf(exportRows, statement.summary, exportMeta);
  };

  const summaryItems = statement
    ? [
        { label: "Supplier Name", value: statement.summary.supplierName },
        { label: "Supplier Code", value: statement.summary.supplierCode },
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
    supplierId &&
    statement &&
    allTransactionRows.length === 0 &&
    statement.summary.openingBalance === 0 &&
    statement.summary.closingBalance === 0 &&
    !search.trim() &&
    voucherType === "all";

  const showNoFilterResults =
    supplierId &&
    statement &&
    statement.hasPeriodTransactions &&
    allTransactionRows.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Supplier Ledger")}
      title="Supplier Ledger"
      description="Complete supplier-wise transaction history with running balance."
      filters={
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
              Supplier <span className="text-red-500">*</span>
            </Label>
            <Select value={supplierId || undefined} onValueChange={handleSupplierChange}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[200px]")}>
                <SelectValue placeholder="Select supplier…" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[150px]">
            <Label className={filterLabelClass}>Voucher Type</Label>
            <Select value={voucherType} onValueChange={setVoucherType} disabled={!supplierId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[150px]")}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_LEDGER_VOUCHER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
                disabled={!supplierId}
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
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {!supplierId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2 max-w-sm">
              <Truck className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Please select a supplier to view ledger.
              </p>
              <p className="text-xs text-muted-foreground">
                Choose a supplier from the filter above to load transaction history and running balance.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && <AccountsSummaryBar items={summaryItems} className="lg:grid-cols-8" />}

            {showNoTransactions ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No supplier ledger transactions found for the selected period.
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
                <SupplierLedgerTable
                  openingRow={openingRow}
                  transactionRows={allTransactionRows}
                  closingRow={closingRow}
                />
                <div className="flex-shrink-0 border-t border-border bg-muted/10 px-4 py-2 flex flex-wrap items-center justify-end gap-x-6 gap-y-1">
                  <p className="text-xs text-muted-foreground">
                    Total Debit:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatMoney(columnFilteredRows.reduce((s, r) => s + r.debit, 0))}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Credit:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatMoney(columnFilteredRows.reduce((s, r) => s + r.credit, 0))}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Closing Balance:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatBalanceAmount(
                        statement.summary.closingBalance,
                        statement.summary.closingBalanceType,
                      )}
                    </span>
                  </p>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </AccountsPageShell>
  );
}

function SupplierLedgerFallback() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Supplier Ledger")}
      title="Supplier Ledger"
      description="Complete supplier-wise transaction history with running balance."
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading Supplier Ledger…
      </div>
    </AccountsPageShell>
  );
}

export default function SupplierLedgerPageClient() {
  return (
    <Suspense fallback={<SupplierLedgerFallback />}>
      <SupplierLedgerPageContent />
    </Suspense>
  );
}
