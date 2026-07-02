"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, X } from "lucide-react";
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
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildStockLedgerStatement,
  formatQty,
  getStockLedgerBatchOptions,
  getStockLedgerProducts,
  sortStockLedgerTransactions,
  STOCK_LEDGER_WAREHOUSE_OPTIONS,
  type StockLedgerSortKey,
} from "./stock-ledger-data";
import {
  exportStockLedgerToExcel,
  exportStockLedgerToPdf,
} from "./stock-ledger-export";
import { StockLedgerTable } from "./StockLedgerTable";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-8 text-xs";
const PLACEHOLDER_FROM = "2026-04-01";
const PLACEHOLDER_TO = "2026-06-30";

export default function StockLedgerPageClient() {
  const mounted = useClientMounted();

  const [productId, setProductId] = useState("");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_FROM);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_TO);
  const [datesReady, setDatesReady] = useState(false);
  const [warehouse, setWarehouse] = useState("all");
  const [batchNo, setBatchNo] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<StockLedgerSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const products = useMemo(() => getStockLedgerProducts(), []);

  const batchOptions = useMemo(
    () => (productId ? getStockLedgerBatchOptions(productId) : []),
    [productId],
  );

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

  useEffect(() => {
    setBatchNo("all");
    setPage(1);
  }, [productId]);

  const statement = useMemo(() => {
    if (!mounted || !productId || !datesReady) return null;
    return buildStockLedgerStatement({
      productId,
      dateFrom,
      dateTo,
      financialYearId,
      warehouse,
      batchNo,
      search,
    });
  }, [
    mounted,
    productId,
    dateFrom,
    dateTo,
    financialYearId,
    warehouse,
    batchNo,
    search,
    datesReady,
  ]);

  const sortedTransactions = useMemo(() => {
    if (!statement) return [];
    return sortStockLedgerTransactions(statement.transactionRows, sortKey, sortDir);
  }, [statement, sortKey, sortDir]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, page, pageSize]);

  const openingRow = statement?.displayRows[0] ?? null;
  const closingRow = statement ? statement.displayRows[statement.displayRows.length - 1] : null;

  useEffect(() => {
    setPage(1);
  }, [productId, dateFrom, dateTo, financialYearId, warehouse, batchNo, search, sortKey, sortDir, pageSize]);

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((fy) => String(fy.id) === financialYearId)?.name ?? "—";
  }, [financialYearId]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
      warehouse: warehouse === "all" ? "All" : warehouse,
      batchNo: batchNo === "all" ? "All" : batchNo,
      search,
    }),
    [dateFrom, dateTo, financialYearLabel, warehouse, batchNo, search],
  );

  const canExport = Boolean(statement && productId);

  const handleExportExcel = async () => {
    if (!statement) return;
    setExporting(true);
    try {
      await exportStockLedgerToExcel(statement.displayRows, statement.summary, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!statement) return;
    exportStockLedgerToPdf(statement.displayRows, statement.summary, exportMeta);
  };

  const handleSort = useCallback((key: string) => {
    const k = key as StockLedgerSortKey;
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return k;
    });
  }, []);

  const summaryItems = statement
    ? [
        { label: "Product", value: statement.summary.productName },
        { label: "SKU", value: statement.summary.sku },
        { label: "Category", value: statement.summary.category },
        { label: "Warehouse", value: statement.summary.warehouseLabel },
        { label: "Batch No.", value: statement.summary.batchLabel },
        { label: "Unit", value: statement.summary.unit },
        {
          label: "Opening Qty",
          value: `${formatQty(statement.summary.openingQty, true)} ${statement.summary.unit}`,
        },
        {
          label: "Total In",
          value: `${formatQty(statement.summary.totalInQty, true)} ${statement.summary.unit}`,
        },
        {
          label: "Total Out",
          value: `${formatQty(statement.summary.totalOutQty, true)} ${statement.summary.unit}`,
        },
        {
          label: "Closing Qty",
          value: `${formatQty(statement.summary.closingQty, true)} ${statement.summary.unit}`,
        },
      ]
    : [];

  const showNoTransactions =
    productId &&
    statement &&
    !statement.hasPeriodTransactions &&
    !search.trim();

  const showNoFilterResults =
    productId &&
    statement &&
    statement.hasPeriodTransactions &&
    sortedTransactions.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Ledger")}
      title="Stock Ledger"
      description="Complete stock movement history for a selected product with running balance."
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
              Product <span className="text-red-500">*</span>
            </Label>
            <Select value={productId || undefined} onValueChange={setProductId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[200px]")}>
                <SelectValue placeholder="Select product…" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[150px]">
            <Label className={filterLabelClass}>Warehouse</Label>
            <Select value={warehouse} onValueChange={setWarehouse} disabled={!productId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[150px]")}>
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {STOCK_LEDGER_WAREHOUSE_OPTIONS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[130px]">
            <Label className={filterLabelClass}>Batch No.</Label>
            <Select value={batchNo} onValueChange={setBatchNo} disabled={!productId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[130px]")}>
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batchOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
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
                placeholder="Document no., batch, warehouse, type…"
                className={cn(filterControlClass, "mt-0 pr-8")}
                disabled={!productId}
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
        {!productId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2 max-w-sm">
              <Package className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">
                Please select a Product to view Stock Ledger.
              </p>
              <p className="text-xs text-muted-foreground">
                Choose a product from the filter above to load its complete stock movement history.
              </p>
            </div>
          </div>
        ) : (
          <>
            {statement && (
              <AccountsSummaryBar items={summaryItems} className="lg:grid-cols-5 xl:grid-cols-10" />
            )}

            {showNoTransactions ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No stock ledger transactions found for the selected period.
                </p>
              </div>
            ) : showNoFilterResults ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No transactions match your search filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            ) : statement && openingRow && closingRow ? (
              <>
                <StockLedgerTable
                  openingRow={openingRow}
                  transactionRows={paginatedTransactions}
                  closingRow={closingRow}
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
                      recordLabel="movements"
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
