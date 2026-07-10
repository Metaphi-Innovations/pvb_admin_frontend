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
import {
  AccountsColumnFilterProvider,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
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
  STOCK_LEDGER_TRANSACTION_TYPE_OPTIONS,
  type StockLedgerRow,
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

  const summary = useMemo(() => computeStockLedgerSummary(filteredRows), [filteredRows]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, productId, warehouse, batchNo, transactionType, documentNo, search, pageSize]);

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

  const getCellValue = useCallback((row: StockLedgerRow, key: string) => {
    if (key === "transactionType") {
      return (
        STOCK_LEDGER_TRANSACTION_TYPE_OPTIONS.find((o) => o.value === row.transactionType)?.label ??
        row.transactionType
      );
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      documentNo: { type: "text" as const },
      transactionType: { type: "text" as const },
      productName: { type: "text" as const },
      productCode: { type: "text" as const },
      warehouse: { type: "text" as const },
      batchNo: { type: "text" as const },
      mfgDate: { type: "date" as const },
      expiryDate: { type: "date" as const },
      openingQty: { type: "amount" as const },
      inQty: { type: "amount" as const },
      outQty: { type: "amount" as const },
      closingQty: { type: "amount" as const },
      unit: { type: "text" as const },
      rate: { type: "amount" as const },
      value: { type: "amount" as const },
      referenceModule: { type: "text" as const },
      createdBy: { type: "text" as const },
      remarks: { type: "text" as const },
    }),
    [],
  );

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
    <AccountsColumnFilterProvider
      rows={filteredRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <StockLedgerPageBody
        filteredRows={filteredRows}
        sourceRows={sourceRows}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        exportMeta={exportMeta}
        exporting={exporting}
        setExporting={setExporting}
        summaryItems={summaryItems}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        productId={productId}
        setProductId={setProductId}
        productOptions={productOptions}
        warehouse={warehouse}
        setWarehouse={setWarehouse}
        warehouseOptions={warehouseOptions}
        batchNo={batchNo}
        setBatchNo={setBatchNo}
        batchOptions={batchOptions}
        transactionType={transactionType}
        setTransactionType={setTransactionType}
        documentNo={documentNo}
        setDocumentNo={setDocumentNo}
        search={search}
        setSearch={setSearch}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    </AccountsColumnFilterProvider>
  );
}

function StockLedgerPageBody({
  filteredRows,
  sourceRows,
  hasFilters,
  clearFilters,
  exportMeta,
  exporting,
  setExporting,
  summaryItems,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  productId,
  setProductId,
  productOptions,
  warehouse,
  setWarehouse,
  warehouseOptions,
  batchNo,
  setBatchNo,
  batchOptions,
  transactionType,
  setTransactionType,
  documentNo,
  setDocumentNo,
  search,
  setSearch,
  page,
  setPage,
  pageSize,
  setPageSize,
}: {
  filteredRows: StockLedgerRow[];
  sourceRows: StockLedgerRow[];
  hasFilters: boolean;
  clearFilters: () => void;
  exportMeta: Parameters<typeof exportStockLedgerToExcel>[2];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  summaryItems: { label: string; value: string; warn?: boolean }[];
  preset: DateRangePresetId;
  setPreset: (v: DateRangePresetId) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  productId: string;
  setProductId: (v: string) => void;
  productOptions: { id: string; name: string; code: string }[];
  warehouse: string;
  setWarehouse: (v: string) => void;
  warehouseOptions: string[];
  batchNo: string;
  setBatchNo: (v: string) => void;
  batchOptions: string[];
  transactionType: string;
  setTransactionType: (v: string) => void;
  documentNo: string;
  setDocumentNo: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(filteredRows);
  const exportSummary = useMemo(
    () => computeStockLedgerSummary(columnFilteredRows),
    [columnFilteredRows],
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const handleExportExcel = useCallback(async () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportStockLedgerToExcel(columnFilteredRows, exportSummary, exportMeta);
    } finally {
      setExporting(false);
    }
  }, [columnFilteredRows, exportSummary, exportMeta, exporting, setExporting]);

  const handleExportPdf = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    exportStockLedgerToPdf(columnFilteredRows, exportSummary, exportMeta);
  }, [columnFilteredRows, exportSummary, exportMeta, exporting]);

  const handleExportCsv = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    exportStockLedgerToCsv(columnFilteredRows, exportSummary, exportMeta);
  }, [columnFilteredRows, exportSummary, exportMeta, exporting]);

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
              disabled={exporting || columnFilteredRows.length === 0}
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
            columnFilteredRows.length > 0 ? (
              <AccountsTablePagination
                page={page}
                pageSize={pageSize}
                totalRecords={columnFilteredRows.length}
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
          ) : columnFilteredRows.length === 0 ? (
            <div className="accounts-table-empty py-8 text-center text-sm text-muted-foreground">
              No records match the column filters.
            </div>
          ) : (
            <StockLedgerTable rows={paginatedRows} />
          )}
        </AccountsTableListing>
      </div>
    </AccountsPageShell>
  );
}
