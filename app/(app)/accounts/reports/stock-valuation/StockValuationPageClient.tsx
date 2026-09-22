"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Check, Download, FileDown, FileSpreadsheet, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS, roundMoney } from "@/lib/accounts/money-format";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilters,
  ColumnValueOption,
} from "@/lib/accounts/column-filter-types";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildStockValuationColumnFilterParams,
  buildStockValuationOrdering,
  mapStockValuationFilterOptions,
  STOCK_VALUATION_FILTER_FIELD_BY_COLUMN,
  StockValuationApiError,
  StockValuationApiService,
} from "@/services/stock-valuation.service";
import type {
  StockValuationDetailApiRow,
  StockValuationDetailsResult,
  StockValuationFiltersConfig,
  StockValuationQueryParams,
  StockValuationSummaryApiRow,
  StockValuationSummaryResult,
  StockValuationTab,
} from "@/types/stock-valuation.types";
import { formatQtyWithUnit, formatStockValuationDate } from "./stock-valuation-data";
import "./stock-valuation-compact.css";

const TABS: { id: StockValuationTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Accounting Details" },
];

const SUMMARY_SORT_FIELD_MAP: Record<string, string> = {
  productName: "product_name",
  warehouse: "warehouse_name",
  closingQty: "closing_qty",
  costValue: "cost_value",
  finalStockValue: "final_value",
};

const DETAILS_SORT_FIELD_MAP: Record<string, string> = {
  date: "voucher_date",
  voucherNumber: "voucher_number",
  productName: "product_name",
  warehouse: "warehouse_name",
};

const STOCK_VALUATION_LAZY_FILTER_COLUMNS = [
  "productName",
  "warehouse",
  "voucherNumber",
] as const;

type ColumnFilterHeaderProps = {
  columnFilters: AccountsColumnFilters;
  onFilterChange: (
    colKey: string,
    value: AccountsColumnFilterState | undefined,
  ) => void;
  filterOptionsByColumn: Record<string, ColumnValueOption[]>;
  filterLoadingByColumn: Record<string, boolean>;
  filterReadyByColumn: Record<string, boolean>;
  onOpenFilter: (colKey: string) => void;
};

function sortFieldMapForTab(tab: StockValuationTab): Record<string, string> {
  return tab === "detailed" ? DETAILS_SORT_FIELD_MAP : SUMMARY_SORT_FIELD_MAP;
}

function sortKeyForHeader(
  tab: StockValuationTab,
  backendSortBy: string | null,
): string {
  if (!backendSortBy) return "";
  const map = sortFieldMapForTab(tab);
  const entry = Object.entries(map).find(([, value]) => value === backendSortBy);
  return entry?.[0] ?? backendSortBy;
}

function ServerSortTh({
  label,
  colKey,
  activeKey,
  sortDir,
  onSort,
  align = "left",
  filterable = false,
  filterValue,
  onFilterChange,
  valueOptions,
  onFilterOpen,
  optionsLoading,
  optionsReady,
}: {
  label: string;
  colKey: string;
  activeKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  align?: "left" | "right";
  filterable?: boolean;
  filterValue?: AccountsColumnFilterState;
  onFilterChange?: (value: AccountsColumnFilterState | undefined) => void;
  valueOptions?: ColumnValueOption[];
  onFilterOpen?: () => void;
  optionsLoading?: boolean;
  optionsReady?: boolean;
}) {
  return (
    <AccountsColumnHeader
      label={label}
      colKey={colKey}
      align={align}
      sortable
      filterable={filterable}
      filterType="text"
      sortKey={activeKey}
      sortDir={sortDir}
      onSort={onSort}
      filterValue={filterValue}
      onFilterChange={onFilterChange}
      valueOptions={valueOptions}
      onFilterOpen={onFilterOpen}
      optionsLoading={optionsLoading}
      optionsReady={optionsReady}
    />
  );
}

function filterableColProps(
  filterProps: ColumnFilterHeaderProps,
  colKey: string,
) {
  return {
    filterable: true as const,
    filterValue: filterProps.columnFilters[colKey],
    onFilterChange: (value: AccountsColumnFilterState | undefined) =>
      filterProps.onFilterChange(colKey, value),
    valueOptions: filterProps.filterOptionsByColumn[colKey] ?? [],
    onFilterOpen: () => filterProps.onOpenFilter(colKey),
    optionsLoading: Boolean(filterProps.filterLoadingByColumn[colKey]),
    optionsReady: Boolean(filterProps.filterReadyByColumn[colKey]),
  };
}

function formatMoneyOrDash(
  value: number | null | undefined,
  missing: boolean,
): string {
  if (missing || value == null) return "—";
  return formatMoney(value);
}

function num(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type SummaryUiRow = {
  id: string;
  productId: string;
  warehouseId: string | null;
  productName: string;
  productCode: string;
  warehouse: string;
  unit: string;
  closingQty: number;
  costRate: number;
  costRateMissing: boolean;
  costValue: number;
  marketRate: number | null;
  marketRateMissing: boolean;
  marketValue: number | null;
  finalStockValue: number;
};

type DetailUiRow = {
  id: string;
  date: string;
  voucherType: string;
  voucherNumber: string;
  productName: string;
  productCode: string;
  warehouse: string;
  debitQty: number;
  creditQty: number;
  debitValue: number;
  creditValue: number;
  netValue: number;
};

function mapSummaryRow(row: StockValuationSummaryApiRow): SummaryUiRow {
  const marketRate = row.market_rate != null ? num(row.market_rate) : null;
  const marketRateMissing = marketRate == null || marketRate <= 0;
  const marketValue =
    !marketRateMissing && row.market_value != null
      ? num(row.market_value)
      : !marketRateMissing
        ? num(row.closing_qty) * marketRate
        : null;
  return {
    id: row.id,
    productId: row.product_id,
    warehouseId: row.warehouse_id,
    productName: row.product_name,
    productCode: row.product_code ?? "",
    warehouse: row.warehouse_name ?? "—",
    unit: row.uom ?? "",
    closingQty: num(row.closing_qty),
    costRate: num(row.cost_rate),
    costRateMissing: row.cost_rate_missing,
    costValue: num(row.cost_value),
    marketRate: marketRateMissing ? null : marketRate,
    marketRateMissing,
    marketValue: marketRateMissing ? null : marketValue,
    finalStockValue: num(row.final_value),
  };
}

function mapDetailRow(row: StockValuationDetailApiRow): DetailUiRow {
  return {
    id: row.id,
    date: row.voucher_date,
    voucherType: row.voucher_type,
    voucherNumber: row.voucher_number,
    productName: row.product_name,
    productCode: row.product_code ?? "",
    warehouse: row.warehouse_name ?? "—",
    debitQty: num(row.debit_qty),
    creditQty: num(row.credit_qty),
    debitValue: num(row.debit_amount),
    creditValue: num(row.credit_amount),
    netValue: num(row.net_amount),
  };
}

function StockValuationExportMenu({
  disabled,
  showBasisOptions,
  onExport,
}: {
  disabled?: boolean;
  /** Summary tab: Cost vs Market. Details tab: plain Excel/PDF. */
  showBasisOptions?: boolean;
  onExport: (
    format: "excel" | "pdf",
    basis?: "cost" | "market",
  ) => void;
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
      <DropdownMenuContent align="end" className="w-56">
        {showBasisOptions ? (
          <>
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
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="text-xs gap-2"
              onClick={() => onExport("excel")}
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs gap-2"
              onClick={() => onExport("pdf")}
            >
              <FileDown className="w-4 h-4" /> PDF
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function StockValuationPageClient() {
  const mounted = useClientMounted();
  const appliedDefaults = useRef(false);

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");

  const [tab, setTab] = useState<StockValuationTab>("summary");
  const [filtersConfig, setFiltersConfig] =
    useState<StockValuationFiltersConfig | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [financialYearId, setFinancialYearId] = useState("");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  /** Null = default listing order (no column chevron). */
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [columnFilters, setColumnFilters] = useState<AccountsColumnFilters>({});
  const [filterOptionsByColumn, setFilterOptionsByColumn] = useState<
    Record<string, ColumnValueOption[]>
  >({});
  const [filterLoadingByColumn, setFilterLoadingByColumn] = useState<
    Record<string, boolean>
  >({});
  const [filterReadyByColumn, setFilterReadyByColumn] = useState<
    Record<string, boolean>
  >({});
  const filterLoadedRef = useRef<Set<string>>(new Set());
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [exporting, setExporting] = useState(false);
  const [ready, setReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [summaryReport, setSummaryReport] =
    useState<StockValuationSummaryResult | null>(null);
  const [detailsReport, setDetailsReport] =
    useState<StockValuationDetailsResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setReady(true);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void StockValuationApiService.getFilters(controller.signal)
      .then((config) => {
        if (!controller.signal.aborted) {
          setFiltersConfig(config);
          setFiltersError(null);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFiltersConfig(null);
        setFiltersError(
          error instanceof Error
            ? error.message
            : "Failed to load Stock Valuation filters.",
        );
      });
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!ready || !filtersConfig || appliedDefaults.current) return;
    if (filtersConfig.defaults.financial_year_id) {
      setFinancialYearId(filtersConfig.defaults.financial_year_id);
    }
    if (filtersConfig.defaults.from_date) {
      setDateFrom(filtersConfig.defaults.from_date);
    }
    if (filtersConfig.defaults.to_date) {
      const today = new Date().toISOString().slice(0, 10);
      const fyEnd = filtersConfig.defaults.to_date;
      setDateTo(today < fyEnd ? today : fyEnd);
    }
    setPreset("custom");
    setPageSize(filtersConfig.defaults.page_size || 25);
    appliedDefaults.current = true;
  }, [filtersConfig, ready, setDateFrom, setDateTo, setPreset]);

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      setFinancialYearId(fyId);
      if (fyId !== "all" && filtersConfig) {
        const fy = filtersConfig.financial_years.find(
          (y) => y.financial_year_id === fyId,
        );
        if (fy) {
          setDateFrom(fy.start_date);
          const today = new Date().toISOString().slice(0, 10);
          setDateTo(today < fy.end_date ? today : fy.end_date);
          setPreset("custom");
        }
      }
    },
    [filtersConfig, setDateFrom, setDateTo, setPreset],
  );

  const warehouseOptions = useMemo(
    () =>
      (filtersConfig?.warehouses ?? []).map((w) => ({
        value: w.warehouse_id,
        label: w.warehouse_name,
      })),
    [filtersConfig],
  );

  const productOptions = useMemo(
    () =>
      (filtersConfig?.products ?? []).map((p) => ({
        value: p.product_id,
        label: p.product_name,
        searchText: p.product_code,
      })),
    [filtersConfig],
  );

  const queryParams = useMemo<StockValuationQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) {
      return null;
    }
    const ordering = buildStockValuationOrdering(sortBy, sortOrder);
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      warehouse_ids: warehouses,
      product_ids: products,
      page,
      page_size: pageSize,
      ...(ordering ? { ordering } : {}),
      column_filters: buildStockValuationColumnFilterParams(columnFilters),
    };
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    warehouses,
    products,
    page,
    pageSize,
    sortBy,
    sortOrder,
    columnFilters,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    tab,
    pageSize,
    financialYearId,
    warehouses,
    products,
    sortBy,
    sortOrder,
    columnFilters,
  ]);

  useEffect(() => {
    // Reset to default listing order (no column active) when switching tabs
    setSortBy(null);
    setSortOrder("asc");
  }, [tab]);

  useEffect(() => {
    if (!queryParams) {
      setSummaryReport(null);
      setDetailsReport(null);
      setReportError(
        !financialYearId || financialYearId === "all"
          ? "Select a financial year to load Stock Valuation."
          : null,
      );
      return;
    }

    const controller = new AbortController();
    setReportLoading(true);
    setReportError(null);

    const load =
      tab === "detailed"
        ? StockValuationApiService.getAccountingDetails(
            queryParams,
            controller.signal,
          ).then((result) => {
            if (!controller.signal.aborted) {
              setDetailsReport(result);
              setSummaryReport(null);
            }
          })
        : StockValuationApiService.getSummary(
            queryParams,
            controller.signal,
          ).then((result) => {
            if (!controller.signal.aborted) {
              setSummaryReport(result);
              setDetailsReport(null);
            }
          });

    void load
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSummaryReport(null);
        setDetailsReport(null);
        setReportError(
          error instanceof StockValuationApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to load Stock Valuation.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });

    return () => controller.abort();
  }, [queryParams, tab, retryKey, financialYearId]);

  const summaryRows = useMemo(
    () => (summaryReport?.rows ?? []).map(mapSummaryRow),
    [summaryReport],
  );

  const detailRows = useMemo(
    () => (detailsReport?.rows ?? []).map(mapDetailRow),
    [detailsReport],
  );

  const hasFilters =
    warehouses.length > 0 ||
    products.length > 0 ||
    Object.values(columnFilters).some(
      (f) => (f?.selectedValues?.length ?? 0) > 0,
    );

  const clearFilters = useCallback(() => {
    setWarehouses([]);
    setProducts([]);
    setColumnFilters({});
  }, []);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      buildEntityFilterSummary(
        "warehouse",
        "Warehouses",
        warehouses,
        warehouseOptions,
        () => setWarehouses([]),
      ),
      buildEntityFilterSummary(
        "product",
        "Products",
        products,
        productOptions,
        () => setProducts([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [warehouses, products, warehouseOptions, productOptions]);

  const handleExport = useCallback(
    async (format: "excel" | "pdf", basis?: "cost" | "market") => {
      if (!queryParams || exporting) return;
      setExporting(true);
      try {
        await StockValuationApiService.exportReport({
          ...queryParams,
          format: format === "pdf" ? "PDF" : "EXCEL",
          view: tab === "detailed" ? "accounting_details" : "summary",
          basis: tab === "detailed" ? undefined : (basis ?? "cost"),
        });
      } catch (error: unknown) {
        setReportError(
          error instanceof Error ? error.message : "Export failed.",
        );
      } finally {
        setExporting(false);
      }
    },
    [queryParams, exporting, tab],
  );

  const handleSort = useCallback(
    (colKey: string) => {
      const map = sortFieldMapForTab(tab);
      const backendField = map[colKey];
      if (!backendField) return;
      // ERP cycle: first ASC → DESC → clear to default (no column active)
      if (sortBy !== backendField) {
        setSortBy(backendField);
        setSortOrder("asc");
        return;
      }
      if (sortOrder === "asc") {
        setSortOrder("desc");
        return;
      }
      setSortBy(null);
      setSortOrder("asc");
    },
    [tab, sortBy, sortOrder],
  );

  const handleColumnFilterChange = useCallback(
    (colKey: string, value: AccountsColumnFilterState | undefined) => {
      setColumnFilters((prev) => {
        if (!value) {
          const next = { ...prev };
          delete next[colKey];
          return next;
        }
        return { ...prev, [colKey]: value };
      });
    },
    [],
  );

  const productNameFilterOpen = isFilterOpen("productName");
  const warehouseFilterOpen = isFilterOpen("warehouse");
  const voucherNumberFilterOpen = isFilterOpen("voucherNumber");

  useEffect(() => {
    const openByColumn: Record<string, boolean> = {
      productName: productNameFilterOpen,
      warehouse: warehouseFilterOpen,
      voucherNumber: voucherNumberFilterOpen,
    };
    const toLoad = STOCK_VALUATION_LAZY_FILTER_COLUMNS.filter(
      (colKey) => openByColumn[colKey] && !filterLoadedRef.current.has(colKey),
    );
    if (toLoad.length === 0) return;

    const controller = new AbortController();
    for (const colKey of toLoad) {
      const fieldName = STOCK_VALUATION_FILTER_FIELD_BY_COLUMN[colKey];
      if (!fieldName) continue;
      filterLoadedRef.current.add(colKey);
      setFilterLoadingByColumn((prev) => ({ ...prev, [colKey]: true }));
      void StockValuationApiService.getFilterDropdown(fieldName, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setFilterOptionsByColumn((prev) => ({
            ...prev,
            [colKey]: mapStockValuationFilterOptions(data, fieldName),
          }));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          filterLoadedRef.current.delete(colKey);
          setFilterOptionsByColumn((prev) => ({
            ...prev,
            [colKey]: prev[colKey] ?? [],
          }));
        })
        .finally(() => {
          if (controller.signal.aborted) {
            filterLoadedRef.current.delete(colKey);
            setFilterLoadingByColumn((prev) => ({ ...prev, [colKey]: false }));
            return;
          }
          setFilterLoadingByColumn((prev) => ({ ...prev, [colKey]: false }));
          setFilterReadyByColumn((prev) => ({ ...prev, [colKey]: true }));
        });
    }

    return () => controller.abort();
  }, [productNameFilterOpen, warehouseFilterOpen, voucherNumberFilterOpen]);

  const columnFilterHeaderProps: ColumnFilterHeaderProps = useMemo(
    () => ({
      columnFilters,
      onFilterChange: handleColumnFilterChange,
      filterOptionsByColumn,
      filterLoadingByColumn,
      filterReadyByColumn,
      onOpenFilter: handleOpenFilter,
    }),
    [
      columnFilters,
      handleColumnFilterChange,
      filterOptionsByColumn,
      filterLoadingByColumn,
      filterReadyByColumn,
      handleOpenFilter,
    ],
  );

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

  const filtersEl = (
    <>
      <ReportFilterRow
        className="items-end"
        wrap
        end={
          <StockValuationExportMenu
            onExport={handleExport}
            showBasisOptions={tab === "summary"}
            disabled={
              exporting ||
              reportLoading ||
              !queryParams ||
              (tab === "summary"
                ? (summaryReport?.pagination.total_rows ?? 0) === 0
                : (detailsReport?.pagination.total_rows ?? 0) === 0)
            }
          />
        }
      >
        <ReportFinancialYearFilter
          value={financialYearId || "all"}
          onChange={handleFinancialYearChange}
        />
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
          labeledOptions={warehouseOptions}
        />
        <ReportProductMultiFilter
          values={products}
          onChange={setProducts}
          products={productOptions}
        />
      </ReportFilterRow>
      <ReportFilterSummary items={filterSummaryItems} />
      {(filtersError || reportError) && (
        <div className="px-1 pt-1 text-xs text-destructive">
          {filtersError || reportError}{" "}
          {reportError ? (
            <button
              type="button"
              className="underline"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry
            </button>
          ) : null}
        </div>
      )}
    </>
  );

  if (tab === "detailed") {
    return (
      <DetailsBody
        tab={tab}
        setTab={setTab}
        rows={detailRows}
        report={detailsReport}
        loading={reportLoading}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        filtersEl={filtersEl}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        asOnDate={dateTo}
        periodLabel={`${formatStockValuationDate(dateFrom)} – ${formatStockValuationDate(dateTo)}`}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        filterProps={columnFilterHeaderProps}
      />
    );
  }

  return (
    <SummaryBody
      tab={tab}
      setTab={setTab}
      rows={summaryRows}
      report={summaryReport}
      setReport={setSummaryReport}
      loading={reportLoading}
      hasFilters={hasFilters}
      clearFilters={clearFilters}
      filtersEl={filtersEl}
      page={page}
      setPage={setPage}
      pageSize={pageSize}
      setPageSize={setPageSize}
      asOnDate={dateTo}
      financialYearId={financialYearId}
      onRefresh={() => setRetryKey((k) => k + 1)}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={handleSort}
      filterProps={columnFilterHeaderProps}
    />
  );
}

function MarketRateCell({
  row,
  asOnDate,
  financialYearId,
  onSaved,
}: {
  row: SummaryUiRow;
  asOnDate: string;
  financialYearId: string;
  onSaved: (next: {
    marketRate: number | null;
    marketValue: number | null;
  }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(row.marketRate != null && row.marketRate > 0 ? String(row.marketRate) : "");
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft("");
    setError(null);
  };

  const save = async () => {
    const trimmed = draft.trim();
    let rate: number | null = null;
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        setError("Enter a valid rate");
        return;
      }
      rate = n === 0 ? null : roundMoney(n);
    }

    setSaving(true);
    setError(null);
    try {
      const result = await StockValuationApiService.saveMarketRate(
        {
          product_id: row.productId,
          warehouse_id: row.warehouseId,
          as_on_date: asOnDate,
          market_rate: rate,
        },
        financialYearId,
      );
      const savedRate =
        result.market_rate != null ? num(result.market_rate) : null;
      const marketValue =
        savedRate != null && savedRate > 0
          ? roundMoney(row.closingQty * savedRate)
          : null;
      onSaved({
        marketRate: savedRate != null && savedRate > 0 ? savedRate : null,
        marketValue,
      });
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="inline-flex items-center gap-1">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") cancelEdit();
            }}
            className="h-7 w-[88px] text-xs text-right tabular-nums px-1.5"
            disabled={saving}
            autoFocus
          />
          <button
            type="button"
            className="p-1 rounded hover:bg-emerald-50 disabled:opacity-50"
            title="Save market rate"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-muted disabled:opacity-50"
            title="Cancel"
            disabled={saving}
            onClick={cancelEdit}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        {error ? <span className="text-[10px] text-destructive">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-end gap-1 w-full">
      <span className={cn(MONEY_AMOUNT_CLASS, "text-xs")}>
        {formatMoneyOrDash(row.marketRate, row.marketRateMissing)}
      </span>
      <button
        type="button"
        className="p-1 rounded hover:bg-muted"
        title="Edit market rate"
        onClick={startEdit}
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

function SummaryBody({
  tab,
  setTab,
  rows,
  report,
  setReport,
  loading,
  hasFilters,
  clearFilters,
  filtersEl,
  page,
  setPage,
  pageSize,
  setPageSize,
  asOnDate,
  financialYearId,
  onRefresh,
  sortBy,
  sortOrder,
  onSort,
  filterProps,
}: {
  tab: StockValuationTab;
  setTab: (t: StockValuationTab) => void;
  rows: SummaryUiRow[];
  report: StockValuationSummaryResult | null;
  setReport: Dispatch<SetStateAction<StockValuationSummaryResult | null>>;
  loading: boolean;
  hasFilters: boolean;
  clearFilters: () => void;
  filtersEl: ReactNode;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  asOnDate: string;
  financialYearId: string;
  onRefresh: () => void;
  sortBy: string | null;
  sortOrder: "asc" | "desc";
  onSort: (colKey: string) => void;
  filterProps: ColumnFilterHeaderProps;
}) {
  const [localRows, setLocalRows] = useState(rows);
  const activeSortCol = sortKeyForHeader("summary", sortBy);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const handleMarketSaved = useCallback(
    (rowId: string, next: { marketRate: number | null; marketValue: number | null }) => {
      setLocalRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                marketRate: next.marketRate,
                marketRateMissing: next.marketRate == null || next.marketRate <= 0,
                marketValue: next.marketValue,
              }
            : r,
        ),
      );
      // Update the saved row only — do NOT recompute KPI totals from the current page.
      setReport((prev) => {
        if (!prev) return prev;
        const nextRows = prev.rows.map((r) => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            market_rate:
              next.marketRate != null && next.marketRate > 0
                ? next.marketRate.toFixed(2)
                : null,
            market_value:
              next.marketValue != null ? next.marketValue.toFixed(2) : null,
          };
        });
        return {
          ...prev,
          rows: nextRows,
        };
      });
      // Refresh full-dataset KPIs from the server.
      onRefresh();
    },
    [setReport, onRefresh],
  );

  const serverTotals = report?.summary;

  const marketCardValue =
    serverTotals?.market_value_available && serverTotals.total_market_value != null
      ? formatMoney(num(serverTotals.total_market_value))
      : serverTotals
        ? "Not Available"
        : "—";

  const summaryItems = [
    {
      label: "Total Closing Quantity",
      value: serverTotals
        ? num(serverTotals.total_closing_qty).toLocaleString("en-IN")
        : "—",
    },
    {
      label: "Total Cost Value",
      value: serverTotals
        ? formatMoney(num(serverTotals.total_cost_value))
        : "—",
    },
    { label: "Total Market Value", value: marketCardValue },
    {
      label: "Final Stock Value",
      value: serverTotals
        ? formatMoney(num(serverTotals.total_final_value))
        : "—",
    },
  ];

  const totalRecords = report?.pagination.total_rows ?? 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description="Book value of inventory from STOCK_IN_HAND as on the selected To Date. Market rate is user-entered."
      layout="split"
      className="stock-valuation-compact h-full min-h-0"
      filters={filtersEl}
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
          totalRecords > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="product lines"
            />
          ) : undefined
        }
      >
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : localRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <AccountsTable minWidth={980}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <ServerSortTh
                  label="Product Name"
                  colKey="productName"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  {...filterableColProps(filterProps, "productName")}
                />
                <ServerSortTh
                  label="Warehouse"
                  colKey="warehouse"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  {...filterableColProps(filterProps, "warehouse")}
                />
                <ServerSortTh
                  label="Closing Quantity"
                  colKey="closingQty"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  align="right"
                />
                <AccountsColumnHeader
                  label="Cost Rate"
                  colKey="costRate"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
                <ServerSortTh
                  label="Cost Value"
                  colKey="costValue"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  align="right"
                />
                <AccountsColumnHeader
                  label="Market Rate"
                  colKey="marketRate"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="Market Value"
                  colKey="marketValue"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
                <ServerSortTh
                  label="Final Stock Value"
                  colKey="finalStockValue"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  align="right"
                />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {localRows.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="text-xs font-medium align-middle">
                    {row.productName}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">{row.warehouse}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums font-medium align-middle">
                    {formatQtyWithUnit(row.closingQty, row.unit)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {row.costRateMissing ? "—" : formatMoney(row.costRate)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {row.costRateMissing && row.closingQty !== 0
                      ? "—"
                      : formatMoney(row.costValue)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="align-middle">
                    <MarketRateCell
                      row={row}
                      asOnDate={asOnDate}
                      financialYearId={financialYearId}
                      onSaved={(next) => handleMarketSaved(row.id, next)}
                    />
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
                  Totals {asOnDate ? `(as on ${formatStockValuationDate(asOnDate)})` : ""}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {serverTotals
                    ? num(serverTotals.total_closing_qty).toLocaleString("en-IN")
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {serverTotals
                    ? formatMoney(num(serverTotals.total_cost_value))
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {serverTotals?.market_value_available &&
                  serverTotals.total_market_value != null
                    ? formatMoney(num(serverTotals.total_market_value))
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {serverTotals
                    ? formatMoney(num(serverTotals.total_final_value))
                    : "—"}
                </AccountsTableCell>
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

function DetailsBody({
  tab,
  setTab,
  rows,
  report,
  loading,
  hasFilters,
  clearFilters,
  filtersEl,
  page,
  setPage,
  pageSize,
  setPageSize,
  asOnDate,
  periodLabel,
  sortBy,
  sortOrder,
  onSort,
  filterProps,
}: {
  tab: StockValuationTab;
  setTab: (t: StockValuationTab) => void;
  rows: DetailUiRow[];
  report: StockValuationDetailsResult | null;
  loading: boolean;
  hasFilters: boolean;
  clearFilters: () => void;
  filtersEl: ReactNode;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  asOnDate: string;
  periodLabel: string;
  sortBy: string | null;
  sortOrder: "asc" | "desc";
  onSort: (colKey: string) => void;
  filterProps: ColumnFilterHeaderProps;
}) {
  const activeSortCol = sortKeyForHeader("detailed", sortBy);
  const serverTotals = report?.summary;

  const summaryItems = [
    {
      label: "Lines (period)",
      value: serverTotals ? String(serverTotals.line_count) : "—",
    },
    {
      label: "Net Amount",
      value: serverTotals
        ? formatMoney(num(serverTotals.total_net_amount))
        : "—",
    },
    {
      label: "Debit Amount",
      value: serverTotals
        ? formatMoney(num(serverTotals.total_debit_amount))
        : "—",
    },
    {
      label: "Credit Amount",
      value: serverTotals
        ? formatMoney(num(serverTotals.total_credit_amount))
        : "—",
    },
  ];

  const totalRecords = report?.pagination.total_rows ?? 0;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description={`STOCK_IN_HAND voucher lines for ${periodLabel}. Summary as-on remains ${formatStockValuationDate(asOnDate)}.`}
      layout="split"
      className="stock-valuation-compact h-full min-h-0"
      filters={filtersEl}
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
          totalRecords > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="voucher lines"
            />
          ) : undefined
        }
      >
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <AccountsTable minWidth={1100}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <ServerSortTh
                  label="Date"
                  colKey="date"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                />
                <AccountsColumnHeader
                  label="Voucher Type"
                  colKey="voucherType"
                  sortable={false}
                  filterable={false}
                />
                <ServerSortTh
                  label="Voucher No"
                  colKey="voucherNumber"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  {...filterableColProps(filterProps, "voucherNumber")}
                />
                <ServerSortTh
                  label="Product"
                  colKey="productName"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  {...filterableColProps(filterProps, "productName")}
                />
                <ServerSortTh
                  label="Warehouse"
                  colKey="warehouse"
                  activeKey={activeSortCol}
                  sortDir={sortOrder}
                  onSort={onSort}
                  {...filterableColProps(filterProps, "warehouse")}
                />
                <AccountsColumnHeader
                  label="Debit Qty"
                  colKey="debitQty"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="Credit Qty"
                  colKey="creditQty"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="Debit Value"
                  colKey="debitValue"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="Credit Value"
                  colKey="creditValue"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
                <AccountsColumnHeader
                  label="Net Value"
                  colKey="netValue"
                  align="right"
                  sortable={false}
                  filterable={false}
                />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {rows.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="text-xs align-middle">
                    {formatStockValuationDate(row.date)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">{row.voucherType}</AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">{row.voucherNumber}</AccountsTableCell>
                  <AccountsTableCell className="text-xs font-medium align-middle">
                    {row.productName}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">{row.warehouse}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums align-middle">
                    {row.debitQty.toLocaleString("en-IN")}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="text-xs tabular-nums align-middle">
                    {row.creditQty.toLocaleString("en-IN")}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatMoney(row.debitValue)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatMoney(row.creditValue)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatMoney(row.netValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell colSpan={5} className="font-semibold text-xs align-middle">
                  Period totals
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {serverTotals
                    ? num(serverTotals.total_debit_qty).toLocaleString("en-IN")
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {serverTotals
                    ? num(serverTotals.total_credit_qty).toLocaleString("en-IN")
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {serverTotals
                    ? formatMoney(num(serverTotals.total_debit_amount))
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {serverTotals
                    ? formatMoney(num(serverTotals.total_credit_amount))
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {serverTotals
                    ? formatMoney(num(serverTotals.total_net_amount))
                    : "—"}
                </AccountsTableCell>
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
