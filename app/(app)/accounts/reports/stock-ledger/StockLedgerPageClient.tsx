"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  ReportProductMultiFilter,
  ReportWarehouseMultiFilter,
  ReportStatusMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  countActiveMoreFilters,
  formatMultiSelectLabel,
  isMultiFilterActive,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
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
  type StockLedgerTransactionType,
} from "./stock-ledger-data";
import {
  exportStockLedgerToCsv,
  exportStockLedgerToExcel,
  exportStockLedgerToPdf,
} from "./stock-ledger-export";
import { StockLedgerTable } from "./StockLedgerTable";

const STOCK_TXN_TYPE_OPTIONS = STOCK_LEDGER_TRANSACTION_TYPE_OPTIONS.filter(
  (o): o is { value: StockLedgerTransactionType; label: string } => o.value !== "all",
);

export default function StockLedgerPageClient() {
  const mounted = useClientMounted();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(() => demoFinancialYearStart());
  const [dateTo, setDateTo] = useState(() => demoToday());
  const [productIds, setProductIds] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [batchNos, setBatchNos] = useState<string[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<string[]>([]);
  const [documentNo, setDocumentNo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const sourceRows = useMemo(() => (mounted ? buildStockLedgerRows() : []), [mounted]);

  const productOptions = useMemo(
    () =>
      Array.from(
        new Map(
          sourceRows.map((row) => [
            row.productCode,
            { value: row.productCode, label: row.productName, searchText: row.productCode },
          ]),
        ).values(),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [sourceRows],
  );

  const batchOptions = useMemo(
    () =>
      Array.from(new Set(sourceRows.map((r) => r.batchNo).filter((b) => b && b !== "—")))
        .sort()
        .map((b) => ({ value: b, label: b })),
    [sourceRows],
  );

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId: "all",
      productIds,
      warehouse: warehouses,
      batchNos,
      transactionTypes,
      documentNo,
      search,
    }),
    [dateFrom, dateTo, productIds, warehouses, batchNos, transactionTypes, documentNo, search],
  );

  const filteredRows = useMemo(
    () => filterStockLedgerRows(sourceRows, filterParams),
    [sourceRows, filterParams],
  );

  const summary = useMemo(() => computeStockLedgerSummary(filteredRows), [filteredRows]);

  const warehouseOptions = useMemo(
    () => Array.from(new Set(sourceRows.map((r) => r.warehouse))).sort(),
    [sourceRows],
  );

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, productIds, warehouses, batchNos, transactionTypes, documentNo, search, pageSize]);

  const moreFiltersActiveCount = countActiveMoreFilters({
    batchNos,
    transactionTypes,
    documentNo: documentNo.trim() || undefined,
  });

  const hasFilters =
    search.trim() !== "" ||
    documentNo.trim() !== "" ||
    isMultiFilterActive(productIds) ||
    isMultiFilterActive(warehouses) ||
    isMultiFilterActive(batchNos) ||
    isMultiFilterActive(transactionTypes);

  const clearFilters = () => {
    setSearch("");
    setDocumentNo("");
    setProductIds([]);
    setWarehouses([]);
    setBatchNos([]);
    setTransactionTypes([]);
  };

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary("product", "Products", productIds, productOptions, () => setProductIds([])),
      buildEntityFilterSummary(
        "warehouse",
        "Warehouses",
        warehouses,
        warehouseOptions.map((w) => ({ value: w, label: w })),
        () => setWarehouses([]),
      ),
      buildEntityFilterSummary("batch", "Batches", batchNos, batchOptions, () => setBatchNos([])),
      buildEntityFilterSummary(
        "transactionType",
        "Transaction Types",
        transactionTypes,
        STOCK_TXN_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        () => setTransactionTypes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [productIds, warehouses, batchNos, transactionTypes, productOptions, warehouseOptions, batchOptions]);

  const exportMeta = useMemo(() => {
    return {
      dateFrom,
      dateTo,
      financialYear: "",
      warehouse: formatMultiSelectLabel(
        warehouses,
        warehouseOptions.map((w) => ({ value: w, label: w })),
        "Warehouse",
        "All",
      ),
      product: formatMultiSelectLabel(productIds, productOptions, "Product", "All"),
      batchNo: formatMultiSelectLabel(batchNos, batchOptions, "Batch", "All"),
      transactionType: formatMultiSelectLabel(
        transactionTypes,
        STOCK_TXN_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        "Type",
        "All",
      ),
      documentNo: documentNo || "All",
      search,
    };
  }, [
    dateFrom,
    dateTo,
    warehouses,
    warehouseOptions,
    productIds,
    productOptions,
    batchNos,
    batchOptions,
    transactionTypes,
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
        productIds={productIds}
        setProductIds={setProductIds}
        productOptions={productOptions}
        warehouses={warehouses}
        setWarehouses={setWarehouses}
        warehouseOptions={warehouseOptions}
        batchNos={batchNos}
        setBatchNos={setBatchNos}
        batchOptions={batchOptions}
        transactionTypes={transactionTypes}
        setTransactionTypes={setTransactionTypes}
        filterSummaryItems={filterSummaryItems}
        moreFiltersActiveCount={moreFiltersActiveCount}
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
  productIds,
  setProductIds,
  productOptions,
  warehouses,
  setWarehouses,
  warehouseOptions,
  batchNos,
  setBatchNos,
  batchOptions,
  transactionTypes,
  setTransactionTypes,
  filterSummaryItems,
  moreFiltersActiveCount,
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
  productIds: string[];
  setProductIds: (v: string[]) => void;
  productOptions: { value: string; label: string; searchText?: string }[];
  warehouses: string[];
  setWarehouses: (v: string[]) => void;
  warehouseOptions: string[];
  batchNos: string[];
  setBatchNos: (v: string[]) => void;
  batchOptions: { value: string; label: string }[];
  transactionTypes: string[];
  setTransactionTypes: (v: string[]) => void;
  filterSummaryItems: ReportFilterSummaryItem[];
  moreFiltersActiveCount: number;
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
        <>
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
            <ReportProductMultiFilter
              values={productIds}
              onChange={setProductIds}
              products={productOptions}
            />
            <ReportWarehouseMultiFilter
              values={warehouses}
              onChange={setWarehouses}
              options={warehouseOptions}
            />
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportProductMultiFilter
                values={batchNos}
                onChange={setBatchNos}
                products={batchOptions}
                label="Batch No."
              />
              <ReportStatusMultiFilter
                values={transactionTypes}
                onChange={setTransactionTypes}
                options={STOCK_TXN_TYPE_OPTIONS}
                label="Transaction Type"
              />
              <div className="space-y-1 min-w-full">
                <Label className={filterLabelClass}>Document No.</Label>
                <Input
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  placeholder="Document no…"
                  className={cn(filterControlClass, "w-full")}
                />
              </div>
            </ReportMoreFilters>
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Product, batch, document…"
              className="min-w-[160px] max-w-[220px]"
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsSummaryBar items={summaryItems} />

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
