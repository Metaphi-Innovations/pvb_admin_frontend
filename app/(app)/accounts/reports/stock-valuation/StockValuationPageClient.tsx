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
import {
  AccountsColumnFilterProvider,
  SectionTabs,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS, roundMoney } from "@/lib/accounts/money-format";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import {
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
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
  const [sortBy, setSortBy] = useState("product_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      warehouse_ids: warehouses,
      product_ids: products,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
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
  ]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, tab, pageSize, financialYearId, warehouses, products, sortBy, sortOrder]);

  useEffect(() => {
    // Reset sort defaults when switching tabs
    if (tab === "detailed") {
      setSortBy("voucher_date");
      setSortOrder("asc");
    } else {
      setSortBy("product_name");
      setSortOrder("asc");
    }
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

  const hasFilters = warehouses.length > 0 || products.length > 0;

  const clearFilters = useCallback(() => {
    setWarehouses([]);
    setProducts([]);
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

  const getSummaryCellValue = useCallback((row: SummaryUiRow, key: string) => {
    const record = row as unknown as Record<string, unknown>;
    if (key === "marketRate") return row.marketRateMissing ? null : row.marketRate;
    if (key === "marketValue") return row.marketRateMissing ? null : row.marketValue;
    return record[key];
  }, []);

  const getDetailCellValue = useCallback((row: DetailUiRow, key: string) => {
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
      <AccountsColumnFilterProvider
        key="accounting-details"
        rows={detailRows}
        getCellValue={getDetailCellValue}
        columnConfig={detailColumnConfig}
        defaultSortKey="date"
        defaultSortDir="asc"
      >
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
        />
      </AccountsColumnFilterProvider>
    );
  }

  return (
    <AccountsColumnFilterProvider
      key="summary"
      rows={summaryRows}
      getCellValue={getSummaryCellValue}
      columnConfig={summaryColumnConfig}
      defaultSortKey="productName"
      defaultSortDir="asc"
    >
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
      />
    </AccountsColumnFilterProvider>
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
}) {
  const ctx = useAccountsColumnFilterContext();
  const [localRows, setLocalRows] = useState(rows);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const columnFilteredRows = useAccountsFilteredRows(localRows);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

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
  const pageTotals = useMemo(() => {
    return {
      closingQty: columnFilteredRows.reduce((s, r) => s + r.closingQty, 0),
      costValue: columnFilteredRows.reduce((s, r) => s + r.costValue, 0),
      marketValue: columnFilteredRows.reduce(
        (s, r) => s + (r.marketValue ?? 0),
        0,
      ),
      marketAvailable: columnFilteredRows.some((r) => !r.marketRateMissing),
      finalValue: columnFilteredRows.reduce((s, r) => s + r.finalStockValue, 0),
    };
  }, [columnFilteredRows]);

  const marketCardValue =
    serverTotals?.market_value_available && serverTotals.total_market_value != null
      ? formatMoney(num(serverTotals.total_market_value))
      : pageTotals.marketAvailable
        ? formatMoney(pageTotals.marketValue)
        : "Not Available";

  const summaryItems = [
    {
      label: "Total Closing Quantity",
      value: (serverTotals
        ? num(serverTotals.total_closing_qty)
        : pageTotals.closingQty
      ).toLocaleString("en-IN"),
    },
    {
      label: "Total Cost Value",
      value: formatMoney(
        serverTotals ? num(serverTotals.total_cost_value) : pageTotals.costValue,
      ),
    },
    { label: "Total Market Value", value: marketCardValue },
    {
      label: "Final Stock Value",
      value: formatMoney(
        serverTotals
          ? num(serverTotals.total_final_value)
          : pageTotals.finalValue,
      ),
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
              {columnFilteredRows.map((row) => (
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
                  {(serverTotals
                    ? num(serverTotals.total_closing_qty)
                    : pageTotals.closingQty
                  ).toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(
                    serverTotals
                      ? num(serverTotals.total_cost_value)
                      : pageTotals.costValue,
                  )}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {serverTotals?.market_value_available &&
                  serverTotals.total_market_value != null
                    ? formatMoney(num(serverTotals.total_market_value))
                    : pageTotals.marketAvailable
                      ? formatMoney(pageTotals.marketValue)
                      : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(
                    serverTotals
                      ? num(serverTotals.total_final_value)
                      : pageTotals.finalValue,
                  )}
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
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(rows);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const serverTotals = report?.summary;
  const pageTotals = useMemo(() => {
    return {
      debitQty: columnFilteredRows.reduce((s, r) => s + r.debitQty, 0),
      creditQty: columnFilteredRows.reduce((s, r) => s + r.creditQty, 0),
      debitValue: columnFilteredRows.reduce((s, r) => s + r.debitValue, 0),
      creditValue: columnFilteredRows.reduce((s, r) => s + r.creditValue, 0),
      netValue: columnFilteredRows.reduce((s, r) => s + r.netValue, 0),
    };
  }, [columnFilteredRows]);

  const summaryItems = [
    {
      label: "Lines (period)",
      value: String(serverTotals?.line_count ?? columnFilteredRows.length),
    },
    {
      label: "Net Amount",
      value: formatMoney(
        serverTotals ? num(serverTotals.total_net_amount) : pageTotals.netValue,
      ),
    },
    {
      label: "Debit Amount",
      value: formatMoney(
        serverTotals
          ? num(serverTotals.total_debit_amount)
          : pageTotals.debitValue,
      ),
    },
    {
      label: "Credit Amount",
      value: formatMoney(
        serverTotals
          ? num(serverTotals.total_credit_amount)
          : pageTotals.creditValue,
      ),
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
        ) : columnFilteredRows.length === 0 ? (
          <div className="accounts-table-empty py-6 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTable minWidth={1100}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Date" colKey="date" />
                <SortTh label="Voucher Type" colKey="voucherType" />
                <SortTh label="Voucher No" colKey="voucherNumber" />
                <SortTh label="Product" colKey="productName" />
                <SortTh label="Warehouse" colKey="warehouse" />
                <SortTh label="Debit Qty" colKey="debitQty" filterType="amount" align="right" />
                <SortTh label="Credit Qty" colKey="creditQty" filterType="amount" align="right" />
                <SortTh label="Debit Value" colKey="debitValue" filterType="amount" align="right" />
                <SortTh label="Credit Value" colKey="creditValue" filterType="amount" align="right" />
                <SortTh label="Net Value" colKey="netValue" filterType="amount" align="right" />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {columnFilteredRows.map((row) => (
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
                  {(serverTotals
                    ? num(serverTotals.total_debit_qty)
                    : pageTotals.debitQty
                  ).toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {(serverTotals
                    ? num(serverTotals.total_credit_qty)
                    : pageTotals.creditQty
                  ).toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(
                    serverTotals
                      ? num(serverTotals.total_debit_amount)
                      : pageTotals.debitValue,
                  )}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(
                    serverTotals
                      ? num(serverTotals.total_credit_amount)
                      : pageTotals.creditValue,
                  )}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(
                    serverTotals
                      ? num(serverTotals.total_net_amount)
                      : pageTotals.netValue,
                  )}
                </AccountsTableCell>
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
