"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportSearchFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { demoFinancialYearStart, demoToday } from "@/lib/accounts/demo-date-utils";
import { formatMoney } from "@/lib/accounts/money-format";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildStockLedgerRows,
  computeStockLedgerSummary,
  filterStockLedgerRows,
  formatQty,
  sortStockLedgerRows,
  STOCK_LEDGER_TRANSACTION_TYPE_OPTIONS,
  type StockLedgerSortKey,
} from "./stock-ledger-data";
import {
  exportStockLedgerToCsv,
  exportStockLedgerToExcel,
  exportStockLedgerToPdf,
} from "./stock-ledger-export";
import { StockLedgerTable } from "./StockLedgerTable";

export default function StockLedgerPageClient() {
  const mounted = useClientMounted();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(() => demoFinancialYearStart());
  const [dateTo, setDateTo] = useState(() => demoToday());
  const [productId, setProductId] = useState("all");
  const [warehouse, setWarehouse] = useState("all");
  const [batchNo, setBatchNo] = useState("all");
  const [transactionType, setTransactionType] = useState("all");
  const [documentNo, setDocumentNo] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<StockLedgerSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const sourceRows = useMemo(() => (mounted ? buildStockLedgerRows() : []), [mounted]);

  const productOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    for (const row of sourceRows) {
      if (!map.has(row.productCode)) {
        map.set(row.productCode, { id: row.productCode, name: row.productName, code: row.productCode });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceRows]);

  const warehouseOptions = useMemo(
    () => Array.from(new Set(sourceRows.map((r) => r.warehouse))).sort(),
    [sourceRows],
  );

  const batchOptions = useMemo(
    () =>
      Array.from(new Set(sourceRows.map((r) => r.batchNo).filter((b) => b && b !== "—"))).sort(),
    [sourceRows],
  );

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId: "all",
      productId,
      warehouse,
      batchNo,
      transactionType,
      documentNo,
      search,
    }),
    [dateFrom, dateTo, productId, warehouse, batchNo, transactionType, documentNo, search],
  );

  const filteredRows = useMemo(
    () => filterStockLedgerRows(sourceRows, filterParams),
    [sourceRows, filterParams],
  );

  const sortedRows = useMemo(
    () => sortStockLedgerRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir],
  );

  const summary = useMemo(() => computeStockLedgerSummary(filteredRows), [filteredRows]);

  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    productId,
    warehouse,
    batchNo,
    transactionType,
    documentNo,
    search,
    sortKey,
    sortDir,
    pageSize,
  ]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const hasFilters =
    search.trim() !== "" ||
    documentNo.trim() !== "" ||
    productId !== "all" ||
    warehouse !== "all" ||
    batchNo !== "all" ||
    transactionType !== "all";

  const clearFilters = () => {
    setSearch("");
    setDocumentNo("");
    setProductId("all");
    setWarehouse("all");
    setBatchNo("all");
    setTransactionType("all");
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

  const exportMeta = useMemo(() => {
    const product =
      productId === "all"
        ? "All"
        : (productOptions.find((p) => p.id === productId)?.name ?? productId);
    const txnLabel =
      STOCK_LEDGER_TRANSACTION_TYPE_OPTIONS.find((o) => o.value === transactionType)?.label ??
      transactionType;

    return {
      dateFrom,
      dateTo,
      financialYear: "",
      warehouse: warehouse === "all" ? "All" : warehouse,
      product,
      batchNo: batchNo === "all" ? "All" : batchNo,
      transactionType: txnLabel,
      documentNo: documentNo || "All",
      search,
    };
  }, [
    dateFrom,
    dateTo,
    warehouse,
    productId,
    productOptions,
    batchNo,
    transactionType,
    documentNo,
    search,
  ]);

  const handleExportExcel = useCallback(async () => {
    if (filteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportStockLedgerToExcel(filteredRows, summary, exportMeta);
    } finally {
      setExporting(false);
    }
  }, [filteredRows, summary, exportMeta, exporting]);

  const handleExportPdf = useCallback(() => {
    if (filteredRows.length === 0 || exporting) return;
    exportStockLedgerToPdf(filteredRows, summary, exportMeta);
  }, [filteredRows, summary, exportMeta, exporting]);

  const handleExportCsv = useCallback(() => {
    if (filteredRows.length === 0 || exporting) return;
    exportStockLedgerToCsv(filteredRows, summary, exportMeta);
  }, [filteredRows, summary, exportMeta, exporting]);

  const summaryItems = [
    { label: "Total Products", value: String(summary.totalProducts) },
    { label: "Total Inward Qty", value: formatQty(summary.totalInwardQty, true) },
    { label: "Total Outward Qty", value: formatQty(summary.totalOutwardQty, true) },
    {
      label: "Net Movement",
      value: formatQty(summary.netMovement, true),
      warn: summary.netMovement < 0,
    },
    { label: "Current Closing Stock", value: formatQty(summary.closingStock, true) },
    { label: "Current Stock Value", value: formatMoney(summary.stockValue) },
  ];

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Ledger")}
      title="Stock Ledger"
      description="Complete stock movement history across all products with running balance."
      filters={
        <ReportFilterRow
          className="items-end"
          end={
            <AccountsExportMenu
              onExcel={handleExportExcel}
              onPdf={handleExportPdf}
              onCsv={handleExportCsv}
              disabled={exporting || filteredRows.length === 0}
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
          <div className="space-y-1 min-w-[150px]">
            <Label className={filterLabelClass}>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className={cn(filterControlClass, "w-[150px]")}>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {productOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <Label className={filterLabelClass}>Warehouse</Label>
            <Select value={warehouse} onValueChange={setWarehouse}>
              <SelectTrigger className={cn(filterControlClass, "w-[140px]")}>
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouseOptions.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[120px]">
            <Label className={filterLabelClass}>Batch No.</Label>
            <Select value={batchNo} onValueChange={setBatchNo}>
              <SelectTrigger className={cn(filterControlClass, "w-[120px]")}>
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
          <div className="space-y-1 min-w-[145px]">
            <Label className={filterLabelClass}>Transaction Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger className={cn(filterControlClass, "w-[145px]")}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_LEDGER_TRANSACTION_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[130px]">
            <Label className={filterLabelClass}>Document No.</Label>
            <Input
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              placeholder="Document no…"
              className={cn(filterControlClass, "w-[130px]")}
            />
          </div>
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Product, batch, document…"
            className="min-w-[160px] max-w-[220px]"
          />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsSummaryBar items={summaryItems} className="lg:grid-cols-3 xl:grid-cols-6" />

        <AccountsTableListing
          footer={
            filteredRows.length > 0 ? (
              <AccountsTablePagination
                page={page}
                pageSize={pageSize}
                totalRecords={filteredRows.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                recordLabel="movements"
              />
            ) : undefined
          }
        >
          {filteredRows.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {sourceRows.length === 0
                ? "No stock movements recorded yet."
                : "No movements match your filters."}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="block mx-auto mt-1.5 text-brand-600 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <StockLedgerTable
              rows={paginatedRows}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </AccountsTableListing>
      </div>
    </AccountsPageShell>
  );
}
