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
  ReportWarehouseFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildStockValuationRows,
  computeStockValuationTotals,
  filterStockValuationRows,
  formatStockValuationDate,
  getStockValuationProductOptions,
  STOCK_VALUATION_CATEGORIES,
  type StockValuationRow,
  type StockValuationStatusFilter,
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

function ReportCategoryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className={filterLabelClass}>Category</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "w-[140px]")}>
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {STOCK_VALUATION_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ReportStockValuationProductFilter({
  value,
  onChange,
  products,
}: {
  value: string;
  onChange: (value: string) => void;
  products: string[];
}) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className={filterLabelClass}>Product</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "w-[160px]")}>
          <SelectValue placeholder="All products" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All products</SelectItem>
          {products.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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

export default function StockValuationPageClient() {
  const mounted = useClientMounted();

  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [financialYearId, setFinancialYearId] = useState("all");
  const [warehouse, setWarehouse] = useState("all");
  const [category, setCategory] = useState("all");
  const [product, setProduct] = useState("all");
  const [stockStatus, setStockStatus] = useState<StockValuationStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);
  const productOptions = useMemo(() => getStockValuationProductOptions(), []);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    if (activeFyId) setFinancialYearId(String(activeFyId));
    setAsOnDate(defaultAsOnDate());
  }, []);

  const sourceRows = useMemo(() => {
    if (!mounted) return [];
    return buildStockValuationRows(asOnDate);
  }, [mounted, asOnDate]);

  const filteredRows = useMemo(
    () =>
      filterStockValuationRows(sourceRows, {
        asOnDate,
        warehouse,
        category,
        product,
        stockStatus,
        search: debouncedSearch,
      }),
    [sourceRows, asOnDate, warehouse, category, product, stockStatus, debouncedSearch],
  );

  const getCellValue = useCallback(
    (row: StockValuationRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const columnConfig = useMemo(
    () => ({
      product: { type: "text" as const },
      sku: { type: "text" as const },
      uom: { type: "text" as const },
      packSize: { type: "text" as const },
      unitsPerPack: { type: "amount" as const },
      batchNo: { type: "text" as const },
      warehouse: { type: "text" as const },
      availableQty: { type: "amount" as const },
      costPrice: { type: "amount" as const },
      stockValue: { type: "amount" as const },
      mfgDate: { type: "date" as const },
      expiryDate: { type: "date" as const },
    }),
    [],
  );

  const activeFyId = mounted ? getActiveFinancialYearId() : null;

  const hasFilters =
    Boolean(search.trim()) ||
    warehouse !== "all" ||
    category !== "all" ||
    product !== "all" ||
    stockStatus !== "all" ||
    financialYearId !== (activeFyId ? String(activeFyId) : "all");

  const clearFilters = useCallback(() => {
    setSearch("");
    setWarehouse("all");
    setCategory("all");
    setProduct("all");
    setStockStatus("all");
    setFinancialYearId(activeFyId ? String(activeFyId) : "all");
    setAsOnDate(defaultAsOnDate());
  }, [activeFyId]);

  const exportMeta = useMemo((): StockValuationExportMeta => {
    const years = loadFinancialYears();
    const fy =
      financialYearId === "all"
        ? "All years"
        : (years.find((y) => String(y.id) === financialYearId)?.name ?? financialYearId);
    const warehouseLabel = warehouse === "all" ? "All warehouses" : warehouse;
    const categoryLabel = category === "all" ? "All categories" : category;
    const productLabel = product === "all" ? "All products" : product;
    const statusLabel =
      STOCK_STATUS_OPTIONS.find((o) => o.value === stockStatus)?.label ?? stockStatus;

    return {
      asOnDate,
      financialYear: fy,
      warehouse: warehouseLabel,
      category: categoryLabel,
      product: productLabel,
      stockStatus: statusLabel,
      search,
    };
  }, [asOnDate, financialYearId, warehouse, category, product, stockStatus, search]);

  useEffect(() => {
    setPage(1);
  }, [asOnDate, warehouse, category, product, stockStatus, debouncedSearch, pageSize]);

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
        title="Stock Valuation"
        description="Financial stock valuation as on date using cost price."
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
      defaultSortKey="product"
      defaultSortDir="asc"
    >
      <StockValuationBody
        filteredRows={filteredRows}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        exportMeta={exportMeta}
        exporting={exporting}
        setExporting={setExporting}
        financialYearId={financialYearId}
        setFinancialYearId={setFinancialYearId}
        asOnDate={asOnDate}
        setAsOnDate={setAsOnDate}
        warehouse={warehouse}
        setWarehouse={setWarehouse}
        category={category}
        setCategory={setCategory}
        product={product}
        setProduct={setProduct}
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
  exporting,
  setExporting,
  financialYearId,
  setFinancialYearId,
  asOnDate,
  setAsOnDate,
  warehouse,
  setWarehouse,
  category,
  setCategory,
  product,
  setProduct,
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
  exporting: boolean;
  setExporting: (v: boolean) => void;
  financialYearId: string;
  setFinancialYearId: (v: string) => void;
  asOnDate: string;
  setAsOnDate: (v: string) => void;
  warehouse: string;
  setWarehouse: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  product: string;
  setProduct: (v: string) => void;
  productOptions: string[];
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

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description="Read-only financial view of inventory stock value as on date. Valuation uses cost price (CP)."
      filters={
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
          <ReportWarehouseFilter value={warehouse} onChange={setWarehouse} />
          <ReportCategoryFilter value={category} onChange={setCategory} />
          <ReportStockValuationProductFilter
            value={product}
            onChange={setProduct}
            products={productOptions}
          />
          <ReportStockStatusFilter value={stockStatus} onChange={setStockStatus} />
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Product, SKU, batch, warehouse…"
          />
        </ReportFilterRow>
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
              recordLabel="batch lines"
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
            <AccountsTable minWidth={1480}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="Product" colKey="product" />
                  <SortTh label="SKU" colKey="sku" />
                  <SortTh label="UOM" colKey="uom" />
                  <SortTh label="Pack Size" colKey="packSize" />
                  <SortTh label="Units Per Pack" colKey="unitsPerPack" filterType="amount" align="right" />
                  <SortTh label="Batch No" colKey="batchNo" />
                  <SortTh label="Warehouse" colKey="warehouse" />
                  <SortTh label="Available Qty" colKey="availableQty" filterType="amount" align="right" />
                  <SortTh label="Cost Price (CP)" colKey="costPrice" filterType="amount" align="right" />
                  <SortTh label="Stock Value" colKey="stockValue" filterType="amount" align="right" />
                  <SortTh label="Manufacturing Date" colKey="mfgDate" filterType="date" />
                  <SortTh label="Expiry Date" colKey="expiryDate" filterType="date" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {paginatedRows.map((row) => (
                  <AccountsTableRow key={row.id}>
                    <AccountsTableCell className="text-xs font-medium">{row.product}</AccountsTableCell>
                    <AccountsTableCell mono className="text-brand-700 font-semibold text-xs">
                      {row.sku}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs">{row.uom}</AccountsTableCell>
                    <AccountsTableCell className="text-xs">{row.packSize}</AccountsTableCell>
                    <AccountsTableCell align="right" className="text-xs tabular-nums">
                      {row.unitsPerPack.toLocaleString("en-IN")}
                    </AccountsTableCell>
                    <AccountsTableCell mono className="text-xs">
                      {row.batchNo}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs">{row.warehouse}</AccountsTableCell>
                    <AccountsTableCell align="right" className="text-xs tabular-nums font-medium">
                      {row.availableQty.toLocaleString("en-IN")}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                      {formatMoney(row.costPrice)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("font-medium", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(row.stockValue)}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs whitespace-nowrap">
                      {formatStockValuationDate(row.mfgDate)}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs whitespace-nowrap">
                      {formatStockValuationDate(row.expiryDate)}
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow>
                  <AccountsTableCell colSpan={7} className="font-semibold text-xs text-foreground">
                    Totals
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums">
                    {totals.totalAvailableQty.toLocaleString("en-IN")}
                  </AccountsTableCell>
                  <AccountsTableCell />
                  <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                    {formatMoney(totals.totalStockValue)}
                  </AccountsTableCell>
                  <AccountsTableCell colSpan={2} />
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          </AccountsTableScroll>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
