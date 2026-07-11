"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportAsOnDateFilter,
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportSearchFilter,
  ReportWarehouseMultiFilter,
  ReportProductMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { WAREHOUSE_FILTER_OPTIONS } from "@/lib/accounts/inventory-accounting-data";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import {
  buildEntityFilterSummary,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildStockValuationRows,
  computeStockValuationTotals,
  filterStockValuationRows,
  getStockValuationCategoryOptions,
  getStockValuationProductOptions,
  getValuationBasisLabel,
  VALUATION_BASIS_OPTIONS,
  type StockValuationRow,
  type StockValuationStatusFilter,
  type ValuationBasis,
} from "./stock-valuation-data";
import {
  exportStockValuationToExcel,
  exportStockValuationToPdf,
  type StockValuationExportMeta,
} from "./stock-valuation-export";

const STOCK_STATUS_OPTIONS: { value: StockValuationStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Available", label: "Available" },
  { value: "Near Expiry", label: "Near Expiry" },
  { value: "Expired", label: "Expired" },
];

function ReportStockStatusFilter({
  value,
  onChange,
}: {
  value: StockValuationStatusFilter;
  onChange: (value: StockValuationStatusFilter) => void;
}) {
  return (
    <div className="space-y-1 min-w-[130px]">
      <Label className={filterLabelClass}>Stock Status</Label>
      <Select value={value} onValueChange={(v) => onChange(v as StockValuationStatusFilter)}>
        <SelectTrigger className={cn(filterControlClass, "w-[130px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STOCK_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ReportValuationBasisFilter({
  value,
  onChange,
}: {
  value: ValuationBasis;
  onChange: (value: ValuationBasis) => void;
}) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className={filterLabelClass}>Valuation Basis</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ValuationBasis)}>
        <SelectTrigger className={cn(filterControlClass, "w-[160px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VALUATION_BASIS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function StockValuationPageClient() {
  const mounted = useClientMounted();

  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [financialYearId, setFinancialYearId] = useState("all");
  const [valuationBasis, setValuationBasis] = useState<ValuationBasis>("cost_price");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [stockStatus, setStockStatus] = useState<StockValuationStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);
  const productOptions = useMemo(
    () =>
      mounted
        ? getStockValuationProductOptions().map((p) => ({ value: p, label: p }))
        : [],
    [mounted],
  );
  const categoryOptions = useMemo(
    () =>
      mounted
        ? getStockValuationCategoryOptions().map((c) => ({ value: c, label: c }))
        : [],
    [mounted],
  );
  const warehouseOptions = useMemo(
    () => WAREHOUSE_FILTER_OPTIONS.filter((w) => w !== "all"),
    [],
  );

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    if (activeFyId) setFinancialYearId(String(activeFyId));
    setAsOnDate(defaultAsOnDate());
  }, []);

  const sourceRows = useMemo(() => {
    if (!mounted) return [];
    return buildStockValuationRows(asOnDate, valuationBasis, stockStatus);
  }, [mounted, asOnDate, valuationBasis, stockStatus]);

  const filteredRows = useMemo(
    () =>
      filterStockValuationRows(sourceRows, {
        asOnDate,
        warehouse: warehouses,
        category: categories,
        product: products,
        stockStatus,
        search: debouncedSearch,
      }),
    [sourceRows, asOnDate, warehouses, categories, products, stockStatus, debouncedSearch],
  );

  const getCellValue = useCallback(
    (row: StockValuationRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const columnConfig = useMemo(
    () => ({
      productCode: { type: "text" as const },
      productName: { type: "text" as const },
      warehouse: { type: "text" as const },
      closingQty: { type: "amount" as const },
      valuationRate: { type: "amount" as const },
      totalStockValue: { type: "amount" as const },
    }),
    [],
  );

  const activeFyId = mounted ? getActiveFinancialYearId() : null;

  const hasFilters =
    Boolean(search.trim()) ||
    warehouses.length > 0 ||
    categories.length > 0 ||
    products.length > 0 ||
    stockStatus !== "all" ||
    valuationBasis !== "cost_price" ||
    financialYearId !== (activeFyId ? String(activeFyId) : "all");

  const clearFilters = useCallback(() => {
    setSearch("");
    setWarehouses([]);
    setCategories([]);
    setProducts([]);
    setStockStatus("all");
    setValuationBasis("cost_price");
    setFinancialYearId(activeFyId ? String(activeFyId) : "all");
    setAsOnDate(defaultAsOnDate());
  }, [activeFyId]);

  const exportMeta = useMemo((): StockValuationExportMeta => {
    const years = loadFinancialYears();
    const fy =
      financialYearId === "all"
        ? "All years"
        : (years.find((y) => String(y.id) === financialYearId)?.name ?? financialYearId);

    return {
      asOnDate,
      financialYear: fy,
      valuationBasis: getValuationBasisLabel(valuationBasis),
      warehouse: formatMultiSelectLabel(warehouses, warehouseOptions.map((w) => ({ value: w, label: w })), "Warehouse", "All warehouses"),
      category: formatMultiSelectLabel(categories, categoryOptions, "Category", "All categories"),
      product: formatMultiSelectLabel(products, productOptions, "Product", "All products"),
      stockStatus:
        STOCK_STATUS_OPTIONS.find((o) => o.value === stockStatus)?.label ?? stockStatus,
      search,
    };
  }, [
    asOnDate,
    financialYearId,
    valuationBasis,
    warehouses,
    categories,
    products,
    stockStatus,
    search,
    warehouseOptions,
    categoryOptions,
    productOptions,
  ]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary("warehouse", "Warehouses", warehouses, warehouseOptions.map((w) => ({ value: w, label: w })), () => setWarehouses([])),
      buildEntityFilterSummary("product", "Products", products, productOptions, () => setProducts([])),
      buildEntityFilterSummary("category", "Categories", categories, categoryOptions, () => setCategories([])),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [warehouses, products, categories, warehouseOptions, productOptions, categoryOptions]);

  const moreFiltersActiveCount = categories.length > 0 ? 1 : 0;

  useEffect(() => {
    setPage(1);
  }, [
    asOnDate,
    valuationBasis,
    warehouses,
    categories,
    products,
    stockStatus,
    debouncedSearch,
    pageSize,
  ]);

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
        title="Stock Valuation"
        description="Financial stock valuation as on date using Pricing Master rates."
      >
        <div className="p-6 text-sm text-muted-foreground">Loading stock valuation…</div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsColumnFilterProvider
      rows={filteredRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="productName"
      defaultSortDir="asc"
    >
      <StockValuationBody
        filteredRows={filteredRows}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        exportMeta={exportMeta}
        filterSummaryItems={filterSummaryItems}
        moreFiltersActiveCount={moreFiltersActiveCount}
        exporting={exporting}
        setExporting={setExporting}
        financialYearId={financialYearId}
        setFinancialYearId={setFinancialYearId}
        asOnDate={asOnDate}
        setAsOnDate={setAsOnDate}
        valuationBasis={valuationBasis}
        setValuationBasis={setValuationBasis}
        warehouses={warehouses}
        setWarehouses={setWarehouses}
        warehouseOptions={warehouseOptions}
        categories={categories}
        setCategories={setCategories}
        categoryOptions={categoryOptions}
        products={products}
        setProducts={setProducts}
        productOptions={productOptions}
        stockStatus={stockStatus}
        setStockStatus={setStockStatus}
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

function StockValuationBody({
  filteredRows,
  hasFilters,
  clearFilters,
  exportMeta,
  filterSummaryItems,
  moreFiltersActiveCount,
  exporting,
  setExporting,
  financialYearId,
  setFinancialYearId,
  asOnDate,
  setAsOnDate,
  valuationBasis,
  setValuationBasis,
  warehouses,
  setWarehouses,
  warehouseOptions,
  categories,
  setCategories,
  categoryOptions,
  products,
  setProducts,
  productOptions,
  stockStatus,
  setStockStatus,
  search,
  setSearch,
  page,
  setPage,
  pageSize,
  setPageSize,
}: {
  filteredRows: StockValuationRow[];
  hasFilters: boolean;
  clearFilters: () => void;
  exportMeta: StockValuationExportMeta;
  filterSummaryItems: ReportFilterSummaryItem[];
  moreFiltersActiveCount: number;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  financialYearId: string;
  setFinancialYearId: (v: string) => void;
  asOnDate: string;
  setAsOnDate: (v: string) => void;
  valuationBasis: ValuationBasis;
  setValuationBasis: (v: ValuationBasis) => void;
  warehouses: string[];
  setWarehouses: (v: string[]) => void;
  warehouseOptions: string[];
  categories: string[];
  setCategories: (v: string[]) => void;
  categoryOptions: { value: string; label: string }[];
  products: string[];
  setProducts: (v: string[]) => void;
  productOptions: { value: string; label: string }[];
  stockStatus: StockValuationStatusFilter;
  setStockStatus: (v: StockValuationStatusFilter) => void;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(filteredRows);
  const totals = useMemo(() => computeStockValuationTotals(columnFilteredRows), [columnFilteredRows]);

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
      await exportStockValuationToExcel(columnFilteredRows, exportMeta, totals);
    } finally {
      setExporting(false);
    }
  }, [columnFilteredRows, exportMeta, totals, exporting, setExporting]);

  const handleExportPdf = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    exportStockValuationToPdf(columnFilteredRows, exportMeta, totals);
  }, [columnFilteredRows, exportMeta, totals, exporting]);

  const valuationRateLabel = `Valuation Rate (${getValuationBasisLabel(valuationBasis)})`;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description={`Inventory stock value as on date. Valuation basis: ${getValuationBasisLabel(valuationBasis)}.`}
      filters={
        <>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={handleExportExcel}
                onPdf={handleExportPdf}
                disabled={exporting || columnFilteredRows.length === 0}
              />
            }
          >
            <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
            <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
            <ReportValuationBasisFilter value={valuationBasis} onChange={setValuationBasis} />
            <ReportWarehouseMultiFilter
              values={warehouses}
              onChange={setWarehouses}
              options={warehouseOptions}
            />
            <ReportProductMultiFilter
              values={products}
              onChange={setProducts}
              products={productOptions}
            />
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportProductMultiFilter
                values={categories}
                onChange={setCategories}
                products={categoryOptions}
                label="Category"
              />
            </ReportMoreFilters>
            <ReportStockStatusFilter value={stockStatus} onChange={setStockStatus} />
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Product, code, warehouse…"
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        footer={
          columnFilteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={columnFilteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="product lines"
            />
          ) : undefined
        }
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : columnFilteredRows.length === 0 ? (
          <div className="accounts-table-empty py-8 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTableScroll>
            <AccountsTable minWidth={960}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="Product Code" colKey="productCode" />
                  <SortTh label="Product Name" colKey="productName" />
                  <SortTh label="Warehouse" colKey="warehouse" />
                  <SortTh label="Closing Quantity" colKey="closingQty" filterType="amount" align="right" />
                  <SortTh label={valuationRateLabel} colKey="valuationRate" filterType="amount" align="right" />
                  <SortTh label="Total Stock Value" colKey="totalStockValue" filterType="amount" align="right" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {paginatedRows.map((row) => (
                  <AccountsTableRow key={row.id}>
                    <AccountsTableCell mono className="text-brand-700 font-semibold text-xs">
                      {row.productCode}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs font-medium">{row.productName}</AccountsTableCell>
                    <AccountsTableCell className="text-xs">{row.warehouse}</AccountsTableCell>
                    <AccountsTableCell align="right" className="text-xs tabular-nums font-medium">
                      {row.closingQty.toLocaleString("en-IN")}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                      {row.rateMissing ? "—" : formatMoney(row.valuationRate)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("font-medium", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(row.totalStockValue)}
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow>
                  <AccountsTableCell colSpan={3} className="font-semibold text-xs text-foreground">
                    Totals
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums">
                    {totals.totalClosingQty.toLocaleString("en-IN")}
                  </AccountsTableCell>
                  <AccountsTableCell />
                  <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(totals.totalStockValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          </AccountsTableScroll>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
