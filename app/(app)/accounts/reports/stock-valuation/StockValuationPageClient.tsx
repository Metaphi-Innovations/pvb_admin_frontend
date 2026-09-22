"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportWarehouseMultiFilter,
  ReportProductMultiFilter,
  ReportFilterSummary,
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  SectionTabs,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatMoney, MONEY_AMOUNT_CLASS, roundMoney } from "@/lib/accounts/money-format";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import {
  buildEntityFilterSummary,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildStockLedgerRows,
  STOCK_LEDGER_TRANSACTION_TYPE_LABELS,
  type StockLedgerRow,
} from "@/lib/accounts/stock-movement-ledger";
import {
  buildStockLedgerDrillHref,
  buildStockValuationRows,
  computeStockValuationTotals,
  filterStockValuationRows,
  formatQtyWithUnit,
  formatStockValuationDate,
  getStockValuationProductOptions,
  getValuationPeriodStart,
  type AccountingDetailRow,
  type CostRateMethod,
  type StockValuationRow,
  type StockValuationTab,
} from "./stock-valuation-data";
import {
  exportStockValuationToExcel,
  exportStockValuationToPdf,
  type StockValuationExportBasis,
  type StockValuationExportMeta,
} from "./stock-valuation-export";
import "./stock-valuation-compact.css";

/** Default backend valuation method — not shown as a UI filter. */
const DEFAULT_COST_RATE_METHOD: CostRateMethod = "weighted_average";

const PLACEHOLDER_DATE = "2025-04-01";

const TABS: { id: StockValuationTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Accounting Details" },
];

function defaultFyDateRange(): { from: string; to: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { from: PLACEHOLDER_DATE, to: today, fyId: "all" };
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

/** UI placeholder rows for Accounting Details — mapped from existing movement ledger until SIH API exists. */
function mapLedgerRowToAccountingDetail(row: StockLedgerRow): AccountingDetailRow {
  const debitQty = row.inQty > 0 ? row.inQty : 0;
  const creditQty = row.outQty > 0 ? row.outQty : 0;
  const debitValue = roundMoney(debitQty * (row.rate > 0 ? row.rate : 0));
  const creditValue = roundMoney(creditQty * (row.rate > 0 ? row.rate : 0));
  return {
    id: row.id,
    date: row.date,
    voucherType: STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType] ?? row.transactionType,
    voucherNumber: row.documentNo,
    productName: row.productName,
    productCode: row.productCode,
    warehouse: row.warehouse,
    debitQty,
    creditQty,
    debitValue,
    creditValue,
    netValue: roundMoney(debitValue - creditValue),
  };
}

function StockValuationExportMenu({
  disabled,
  onExport,
}: {
  disabled?: boolean;
  onExport: (format: "excel" | "pdf", basis: StockValuationExportBasis) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "text-xs px-2.5 h-8")}
          disabled={disabled}
        >
          <Download className="w-4 h-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("excel", "cost")}
        >
          <FileSpreadsheet className="w-4 h-4" /> Excel (Cost Valuation)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("excel", "market")}
        >
          <FileSpreadsheet className="w-4 h-4" /> Excel (Market Valuation)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("pdf", "cost")}
        >
          <FileDown className="w-4 h-4" /> PDF (Cost Valuation)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("pdf", "market")}
        >
          <FileDown className="w-4 h-4" /> PDF (Market Valuation)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatMoneyOrDash(
  value: number | null | undefined,
  missing: boolean,
): string {
  if (missing || value == null) return "—";
  return formatMoney(value);
}

function formatCostValue(row: StockValuationRow): string {
  if (row.costRateMissing && row.closingQty !== 0) return "—";
  return formatMoney(row.costValue);
}

function buildAccountingDetailRows(params: {
  asOnDate: string;
  financialYearId: string;
  warehouses: string[];
  products: string[];
}): AccountingDetailRow[] {
  const years = loadFinancialYears();
  const fy =
    params.financialYearId && params.financialYearId !== "all"
      ? years.find((y) => String(y.id) === params.financialYearId)
      : null;

  return buildStockLedgerRows()
    .filter((row) => {
      if (row.date > params.asOnDate) return false;
      if (fy && (row.date < fy.startDate || row.date > fy.endDate)) return false;
      if (params.warehouses.length > 0 && !params.warehouses.includes(row.warehouse)) return false;
      if (
        params.products.length > 0 &&
        !params.products.includes(row.productName) &&
        !params.products.includes(row.productCode)
      ) {
        return false;
      }
      return true;
    })
    .map(mapLedgerRowToAccountingDetail)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export default function StockValuationPageClient() {
  const mounted = useClientMounted();

  const [tab, setTab] = useState<StockValuationTab>("summary");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  /** Valuation cutoff = To Date (same role as former As On Date). */
  const asOnDate = dateTo;

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        setDateFrom(fy.startDate);
        const today = new Date().toISOString().slice(0, 10);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const sourceRows = useMemo(() => {
    if (!mounted || !datesReady) return [];
    return buildStockValuationRows(asOnDate, DEFAULT_COST_RATE_METHOD, "all", {
      financialYearId,
      grouping: "product_warehouse",
    });
  }, [mounted, datesReady, asOnDate, financialYearId]);

  const warehouseOptions = useMemo(() => {
    if (!mounted) return [];
    return Array.from(new Set(sourceRows.map((r) => r.warehouse).filter(Boolean))).sort();
  }, [mounted, sourceRows]);

  const productOptions = useMemo(() => {
    if (!mounted) return [];
    const fromValuation = sourceRows.map((r) => ({
      value: r.productName,
      label: r.productName,
      searchText: r.productCode,
    }));
    if (fromValuation.length > 0) {
      const seen = new Set<string>();
      return fromValuation.filter((p) => {
        if (seen.has(p.value)) return false;
        seen.add(p.value);
        return true;
      });
    }
    return getStockValuationProductOptions().map((name) => ({
      value: name,
      label: name,
    }));
  }, [mounted, sourceRows]);

  const filteredRows = useMemo(
    () =>
      filterStockValuationRows(sourceRows, {
        asOnDate,
        financialYearId,
        warehouse: warehouses,
        product: products,
        stockStatus: "all",
      }),
    [sourceRows, asOnDate, financialYearId, warehouses, products],
  );

  const accountingDetailRows = useMemo(() => {
    if (!mounted || tab !== "detailed") return [];
    return buildAccountingDetailRows({
      asOnDate,
      financialYearId,
      warehouses,
      products,
    });
  }, [mounted, tab, asOnDate, financialYearId, warehouses, products]);

  const getSummaryCellValue = useCallback((row: StockValuationRow, key: string) => {
    const record = row as unknown as Record<string, unknown>;
    if (key === "marketRate") return row.marketRateMissing ? null : row.marketRate;
    if (key === "marketValue") return row.marketRateMissing ? null : row.marketValue;
    return record[key];
  }, []);

  const getDetailCellValue = useCallback((row: AccountingDetailRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const summaryColumnConfig = useMemo(
    () => ({
      productName: { type: "text" as const },
      warehouse: { type: "text" as const },
      closingQty: { type: "amount" as const },
      costRate: { type: "amount" as const },
      costValue: { type: "amount" as const },
      marketRate: { type: "amount" as const },
      marketValue: { type: "amount" as const },
      finalStockValue: { type: "amount" as const },
    }),
    [],
  );

  const detailColumnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      voucherType: { type: "text" as const },
      voucherNumber: { type: "text" as const },
      productName: { type: "text" as const },
      warehouse: { type: "text" as const },
      debitQty: { type: "amount" as const },
      creditQty: { type: "amount" as const },
      debitValue: { type: "amount" as const },
      creditValue: { type: "amount" as const },
      netValue: { type: "amount" as const },
    }),
    [],
  );

  const activeFyId = mounted ? getActiveFinancialYearId() : null;

  const hasFilters =
    warehouses.length > 0 ||
    products.length > 0 ||
    financialYearId !== (activeFyId ? String(activeFyId) : "all");

  const clearFilters = useCallback(() => {
    setWarehouses([]);
    setProducts([]);
    const { from, to, fyId } = defaultFyDateRange();
    setFinancialYearId(activeFyId ? String(activeFyId) : fyId);
    setDateFrom(from);
    setDateTo(to);
    setPreset("custom");
  }, [activeFyId]);

  const periodStart = useMemo(
    () => getValuationPeriodStart(financialYearId, asOnDate),
    [financialYearId, asOnDate],
  );

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      buildEntityFilterSummary("warehouse", "Warehouses", warehouses, warehouseOptions.map((w) => ({ value: w, label: w })), () =>
        setWarehouses([]),
      ),
      buildEntityFilterSummary("product", "Products", products, productOptions, () => setProducts([])),
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [warehouses, products, warehouseOptions, productOptions]);

  const buildExportMeta = useCallback(
    (exportBasis: StockValuationExportBasis): StockValuationExportMeta => {
      const years = loadFinancialYears();
      const fy =
        financialYearId === "all"
          ? "All years"
          : (years.find((y) => String(y.id) === financialYearId)?.name ?? financialYearId);

      return {
        asOnDate,
        financialYear: fy,
        costRateMethod: DEFAULT_COST_RATE_METHOD,
        warehouse: formatMultiSelectLabel(
          warehouses,
          warehouseOptions.map((w) => ({ value: w, label: w })),
          "Warehouse",
          "All warehouses",
        ),
        product: formatMultiSelectLabel(products, productOptions, "Product", "All products"),
        stockStatus: "All",
        grouping: "Product + Warehouse-wise",
        tab,
        showWarehouse: true,
        exportBasis,
      };
    },
    [asOnDate, financialYearId, warehouses, warehouseOptions, products, productOptions, tab],
  );

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, tab, pageSize, financialYearId, warehouses, products]);

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
        title="Stock Valuation"
        description="Accounting inventory value as on date."
        hideDescription
        className="stock-valuation-compact"
      >
        <div className="p-4 text-sm text-muted-foreground">Loading stock valuation…</div>
      </AccountsPageShell>
    );
  }

  if (tab === "detailed") {
    return (
      <AccountsColumnFilterProvider
        key="accounting-details"
        rows={accountingDetailRows}
        getCellValue={getDetailCellValue}
        columnConfig={detailColumnConfig}
        defaultSortKey="date"
        defaultSortDir="asc"
      >
        <StockValuationAccountingBody
          tab={tab}
          setTab={setTab}
          accountingRows={accountingDetailRows}
          summaryRows={filteredRows}
          hasFilters={hasFilters}
          clearFilters={clearFilters}
          buildExportMeta={buildExportMeta}
          exporting={exporting}
          setExporting={setExporting}
          financialYearId={financialYearId}
          onFinancialYearChange={handleFinancialYearChange}
          preset={preset}
          setPreset={setPreset}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          asOnDate={asOnDate}
          warehouses={warehouses}
          setWarehouses={setWarehouses}
          warehouseOptions={warehouseOptions}
          products={products}
          setProducts={setProducts}
          productOptions={productOptions}
          filterSummaryItems={filterSummaryItems}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
        />
      </AccountsColumnFilterProvider>
    );
  }

  return (
    <AccountsColumnFilterProvider
      key="summary"
      rows={filteredRows}
      getCellValue={getSummaryCellValue}
      columnConfig={summaryColumnConfig}
      defaultSortKey="productName"
      defaultSortDir="asc"
    >
      <StockValuationSummaryBody
        tab={tab}
        setTab={setTab}
        filteredRows={filteredRows}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        buildExportMeta={buildExportMeta}
        exporting={exporting}
        setExporting={setExporting}
        financialYearId={financialYearId}
        onFinancialYearChange={handleFinancialYearChange}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        asOnDate={asOnDate}
        periodStart={periodStart}
        warehouses={warehouses}
        setWarehouses={setWarehouses}
        warehouseOptions={warehouseOptions}
        products={products}
        setProducts={setProducts}
        productOptions={productOptions}
        filterSummaryItems={filterSummaryItems}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    </AccountsColumnFilterProvider>
  );
}

type SharedFilterProps = {
  tab: StockValuationTab;
  setTab: (t: StockValuationTab) => void;
  hasFilters: boolean;
  clearFilters: () => void;
  buildExportMeta: (basis: StockValuationExportBasis) => StockValuationExportMeta;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  financialYearId: string;
  onFinancialYearChange: (v: string) => void;
  preset: DateRangePresetId;
  setPreset: (v: DateRangePresetId) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  asOnDate: string;
  warehouses: string[];
  setWarehouses: (v: string[]) => void;
  warehouseOptions: string[];
  products: string[];
  setProducts: (v: string[]) => void;
  productOptions: { value: string; label: string; searchText?: string }[];
  filterSummaryItems: ReportFilterSummaryItem[];
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
};

function ValuationFilters({
  financialYearId,
  onFinancialYearChange,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  warehouses,
  setWarehouses,
  warehouseOptions,
  products,
  setProducts,
  productOptions,
  filterSummaryItems,
  onExport,
  exporting,
  exportDisabled,
}: {
  financialYearId: string;
  onFinancialYearChange: (v: string) => void;
  preset: DateRangePresetId;
  setPreset: (v: DateRangePresetId) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  warehouses: string[];
  setWarehouses: (v: string[]) => void;
  warehouseOptions: string[];
  products: string[];
  setProducts: (v: string[]) => void;
  productOptions: { value: string; label: string; searchText?: string }[];
  filterSummaryItems: ReportFilterSummaryItem[];
  onExport: (format: "excel" | "pdf", basis: StockValuationExportBasis) => void;
  exporting: boolean;
  exportDisabled: boolean;
}) {
  return (
    <>
      <ReportFilterRow
        className="items-end"
        wrap
        end={
          <StockValuationExportMenu onExport={onExport} disabled={exporting || exportDisabled} />
        }
      >
        <ReportFinancialYearFilter value={financialYearId} onChange={onFinancialYearChange} />
        <ReportDateRangeFilter
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPresetChange={setPreset}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
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
      </ReportFilterRow>
      <ReportFilterSummary items={filterSummaryItems} />
    </>
  );
}

function StockValuationSummaryBody({
  tab,
  setTab,
  filteredRows,
  hasFilters,
  clearFilters,
  buildExportMeta,
  exporting,
  setExporting,
  financialYearId,
  onFinancialYearChange,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  asOnDate,
  periodStart,
  warehouses,
  setWarehouses,
  warehouseOptions,
  products,
  setProducts,
  productOptions,
  filterSummaryItems,
  page,
  setPage,
  pageSize,
  setPageSize,
}: SharedFilterProps & {
  filteredRows: StockValuationRow[];
  periodStart: string;
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

  const handleExport = useCallback(
    async (format: "excel" | "pdf", basis: StockValuationExportBasis) => {
      if (columnFilteredRows.length === 0 || exporting) return;
      const meta = buildExportMeta(basis);
      if (format === "excel") {
        setExporting(true);
        try {
          await exportStockValuationToExcel(columnFilteredRows, meta, totals);
        } finally {
          setExporting(false);
        }
      } else {
        exportStockValuationToPdf(columnFilteredRows, meta, totals);
      }
    },
    [columnFilteredRows, buildExportMeta, totals, exporting, setExporting],
  );

  const marketCardValue =
    !totals.marketValueAvailable || totals.totalMarketValue == null
      ? "Not Available"
      : formatMoney(totals.totalMarketValue);

  const summaryItems = [
    {
      label: "Total Closing Quantity",
      value: totals.totalClosingQty.toLocaleString("en-IN"),
    },
    { label: "Total Cost Value", value: formatMoney(totals.totalCostValue) },
    { label: "Total Market Value", value: marketCardValue },
    { label: "Final Stock Value", value: formatMoney(totals.totalFinalStockValue) },
  ];

  const drillHref = (row: StockValuationRow) =>
    buildStockLedgerDrillHref({
      productCode: row.productCode,
      warehouse: row.warehouse,
      financialYearId,
      asOnDate,
      periodStart,
    });

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description="Accounting value of recognized inventory as on the selected date — Closing Quantity → Cost Rate → Cost Value → Final Stock Value."
      layout="split"
      className="stock-valuation-compact h-full min-h-0"
      filters={
        <ValuationFilters
          financialYearId={financialYearId}
          onFinancialYearChange={onFinancialYearChange}
          preset={preset}
          setPreset={setPreset}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          warehouses={warehouses}
          setWarehouses={setWarehouses}
          warehouseOptions={warehouseOptions}
          products={products}
          setProducts={setProducts}
          productOptions={productOptions}
          filterSummaryItems={filterSummaryItems}
          onExport={handleExport}
          exporting={exporting}
          exportDisabled={columnFilteredRows.length === 0}
        />
      }
    >
      <AccountsTableListing
        className="h-full min-h-0"
        subheader={
          <SectionTabs
            tabs={TABS}
            active={tab}
            onChange={(id) => setTab(id as StockValuationTab)}
            compact
          />
        }
        summary={<AccountsSummaryBar items={summaryItems} className="!border-b" />}
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
          <div className="accounts-table-empty py-6 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTable minWidth={980}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Product Name" colKey="productName" />
                <SortTh label="Warehouse" colKey="warehouse" />
                <SortTh label="Closing Quantity" colKey="closingQty" filterType="amount" align="right" />
                <SortTh label="Cost Rate" colKey="costRate" filterType="amount" align="right" />
                <SortTh label="Cost Value" colKey="costValue" filterType="amount" align="right" />
                <SortTh label="Market Rate" colKey="marketRate" filterType="amount" align="right" />
                <SortTh label="Market Value" colKey="marketValue" filterType="amount" align="right" />
                <SortTh label="Final Stock Value" colKey="finalStockValue" filterType="amount" align="right" />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {paginatedRows.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="text-xs font-medium align-middle">
                    <Link href={drillHref(row)} className="text-brand-700 hover:underline">
                      {row.productName}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">{row.warehouse}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums font-medium align-middle">
                    <Link href={drillHref(row)} className="text-brand-700 hover:underline">
                      {formatQtyWithUnit(row.closingQty, row.unit)}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {row.costRateMissing ? "—" : formatMoney(row.costRate)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatCostValue(row)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatMoneyOrDash(row.marketRate, row.marketRateMissing)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatMoneyOrDash(row.marketValue, row.marketRateMissing)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-medium align-middle", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(row.finalStockValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell colSpan={2} className="font-semibold text-xs text-foreground align-middle">
                  Totals
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {totals.totalClosingQty.toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(totals.totalCostValue)}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {!totals.marketValueAvailable || totals.totalMarketValue == null
                    ? "—"
                    : formatMoney(totals.totalMarketValue)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(totals.totalFinalStockValue)}
                </AccountsTableCell>
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

function StockValuationAccountingBody({
  tab,
  setTab,
  accountingRows,
  summaryRows,
  hasFilters,
  clearFilters,
  buildExportMeta,
  exporting,
  setExporting,
  financialYearId,
  onFinancialYearChange,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  warehouses,
  setWarehouses,
  warehouseOptions,
  products,
  setProducts,
  productOptions,
  filterSummaryItems,
  page,
  setPage,
  pageSize,
  setPageSize,
}: SharedFilterProps & {
  accountingRows: AccountingDetailRow[];
  summaryRows: StockValuationRow[];
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(accountingRows);

  const detailTotals = useMemo(() => {
    return {
      totalDebitQty: columnFilteredRows.reduce((s, r) => s + r.debitQty, 0),
      totalCreditQty: columnFilteredRows.reduce((s, r) => s + r.creditQty, 0),
      totalDebitValue: roundMoney(columnFilteredRows.reduce((s, r) => s + r.debitValue, 0)),
      totalCreditValue: roundMoney(columnFilteredRows.reduce((s, r) => s + r.creditValue, 0)),
      totalNetValue: roundMoney(columnFilteredRows.reduce((s, r) => s + r.netValue, 0)),
    };
  }, [columnFilteredRows]);

  const summaryTotals = useMemo(() => computeStockValuationTotals(summaryRows), [summaryRows]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const handleExport = useCallback(
    async (format: "excel" | "pdf", basis: StockValuationExportBasis) => {
      if (summaryRows.length === 0 || exporting) return;
      const meta = buildExportMeta(basis);
      if (format === "excel") {
        setExporting(true);
        try {
          await exportStockValuationToExcel(summaryRows, meta, summaryTotals, columnFilteredRows);
        } finally {
          setExporting(false);
        }
      } else {
        exportStockValuationToPdf(summaryRows, meta, summaryTotals, columnFilteredRows);
      }
    },
    [summaryRows, summaryTotals, columnFilteredRows, buildExportMeta, exporting, setExporting],
  );

  const marketCardValue =
    !summaryTotals.marketValueAvailable || summaryTotals.totalMarketValue == null
      ? "Not Available"
      : formatMoney(summaryTotals.totalMarketValue);

  const summaryItems = [
    {
      label: "Total Closing Quantity",
      value: summaryTotals.totalClosingQty.toLocaleString("en-IN"),
    },
    { label: "Total Cost Value", value: formatMoney(summaryTotals.totalCostValue) },
    { label: "Total Market Value", value: marketCardValue },
    { label: "Final Stock Value", value: formatMoney(summaryTotals.totalFinalStockValue) },
  ];

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description="Accounting value of recognized inventory as on the selected date — Closing Quantity → Cost Rate → Cost Value → Final Stock Value."
      layout="split"
      className="stock-valuation-compact h-full min-h-0"
      filters={
        <ValuationFilters
          financialYearId={financialYearId}
          onFinancialYearChange={onFinancialYearChange}
          preset={preset}
          setPreset={setPreset}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          warehouses={warehouses}
          setWarehouses={setWarehouses}
          warehouseOptions={warehouseOptions}
          products={products}
          setProducts={setProducts}
          productOptions={productOptions}
          filterSummaryItems={filterSummaryItems}
          onExport={handleExport}
          exporting={exporting}
          exportDisabled={summaryRows.length === 0}
        />
      }
    >
      <AccountsTableListing
        className="h-full min-h-0"
        subheader={
          <SectionTabs
            tabs={TABS}
            active={tab}
            onChange={(id) => setTab(id as StockValuationTab)}
            compact
          />
        }
        summary={<AccountsSummaryBar items={summaryItems} className="!border-b" />}
        footer={
          columnFilteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={columnFilteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="entries"
            />
          ) : undefined
        }
      >
        {accountingRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : columnFilteredRows.length === 0 ? (
          <div className="accounts-table-empty py-6 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTable minWidth={1180}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Date" colKey="date" filterType="date" />
                <SortTh label="Voucher Type" colKey="voucherType" filterType="text" />
                <SortTh label="Voucher Number" colKey="voucherNumber" filterType="text" />
                <SortTh label="Product Name" colKey="productName" filterType="text" />
                <SortTh label="Warehouse" colKey="warehouse" filterType="text" />
                <SortTh label="Debit Quantity" colKey="debitQty" filterType="amount" align="right" />
                <SortTh label="Credit Quantity" colKey="creditQty" filterType="amount" align="right" />
                <SortTh label="Debit Value" colKey="debitValue" filterType="amount" align="right" />
                <SortTh label="Credit Value" colKey="creditValue" filterType="amount" align="right" />
                <SortTh label="Net Value" colKey="netValue" filterType="amount" align="right" />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {paginatedRows.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="text-xs whitespace-nowrap align-middle">
                    {formatStockValuationDate(row.date)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">{row.voucherType}</AccountsTableCell>
                  <AccountsTableCell className="text-xs font-mono text-brand-700 align-middle">
                    {row.voucherNumber}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs font-medium align-middle">
                    {row.productName}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">{row.warehouse}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums align-middle">
                    {row.debitQty > 0 ? row.debitQty.toLocaleString("en-IN") : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums align-middle">
                    {row.creditQty > 0 ? row.creditQty.toLocaleString("en-IN") : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {row.debitValue > 0 ? formatMoney(row.debitValue) : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {row.creditValue > 0 ? formatMoney(row.creditValue) : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-medium align-middle", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(row.netValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell colSpan={5} className="font-semibold text-xs text-foreground align-middle">
                  Totals
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {detailTotals.totalDebitQty.toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {detailTotals.totalCreditQty.toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(detailTotals.totalDebitValue)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(detailTotals.totalCreditValue)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(detailTotals.totalNetValue)}
                </AccountsTableCell>
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
