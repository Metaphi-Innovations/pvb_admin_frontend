"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Layers,
  Package,
} from "lucide-react";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsReportBody,
  AccountsReportKpiCard,
  AccountsReportKpiGrid,
} from "@/components/accounts/AccountsReportLayout";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsColumnFilterProvider,
  SectionTabs,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
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
  buildEntityFilterSummary,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { resolveFinancialYearLabel } from "@/lib/accounts/pl-compute";
import { roundMoney } from "@/lib/accounts/money-format";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  buildStockRegisterBatchWise,
  buildStockRegisterDetailed,
  buildStockRegisterSummary,
  formatQty,
  formatStockRegisterDate,
  getStockRegisterProductOptions,
  getStockRegisterWarehouseOptions,
  type StockRegisterBatchWiseRow,
  type StockRegisterBatchWiseTotals,
  type StockRegisterDetailedRow,
  type StockRegisterFilters,
  type StockRegisterSummaryRow,
  type StockRegisterSummaryTotals,
  type StockRegisterTab,
} from "@/lib/accounts/stock-register-compute";
import {
  exportStockRegisterToExcel,
  exportStockRegisterToPdf,
  type StockRegisterBatchSummaryRow,
  type StockRegisterBatchSummaryTotals,
  type StockRegisterExportMeta,
} from "./stock-register-export";

const PLACEHOLDER_DATE = "2025-04-01";
const EMPTY_BATCH_NOS: string[] = [];

const TABS: { id: StockRegisterTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Detailed" },
  { id: "batch-wise", label: "Batch Wise" },
];

type SummaryDisplayTotals = StockRegisterSummaryTotals & { totalClosingQty: number };

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

function parseTab(raw: string | null): StockRegisterTab {
  if (raw === "detailed" || raw === "batch-wise" || raw === "summary") return raw;
  return "summary";
}

/** Map existing product+batch+warehouse aggregates into Batch Wise summary rows (presentation only). */
function toBatchSummaryRow(r: StockRegisterDetailedRow): StockRegisterBatchSummaryRow {
  const inwardQty =
    r.purchaseQty + r.salesReturnQty + r.stockTransferIn + r.sampleReturn + r.positiveAdjustment;
  const outwardQty =
    r.salesQty + r.purchaseReturnQty + r.stockTransferOut + r.sampleIssue + r.negativeAdjustment;
  return {
    rowKey: r.rowKey,
    productName: r.productName,
    productCode: r.productCode,
    batchNo: r.batchNo,
    mfgDate: r.mfgDate,
    expiryDate: r.expiryDate,
    warehouse: r.warehouse,
    openingQty: r.openingStock,
    inwardQty,
    outwardQty,
    closingQty: r.closingStock,
  };
}

function buildBatchSummaryTotals(rows: StockRegisterBatchSummaryRow[]): StockRegisterBatchSummaryTotals {
  return {
    totalProducts: new Set(rows.map((r) => r.productCode)).size,
    totalBatches: rows.length,
    totalOpeningQty: rows.reduce((s, r) => s + r.openingQty, 0),
    totalInwardQty: rows.reduce((s, r) => s + r.inwardQty, 0),
    totalOutwardQty: rows.reduce((s, r) => s + r.outwardQty, 0),
    totalClosingQty: rows.reduce((s, r) => s + r.closingQty, 0),
  };
}

type ExportBridge = {
  onExcel: () => void | Promise<void>;
  onPdf: () => void;
  disabled: boolean;
};

export default function StockRegisterPageClient() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const drilldownApplied = useRef(false);

  const [tab, setTab] = useState<StockRegisterTab>(() => parseTab(searchParams.get("tab")));
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  /** Kept at "all"/[] — Branch/Category/Batch are not shown (shared filter bar with Stock Valuation). */
  const branch = "all";
  const category = "all";
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportBridge, setExportBridge] = useState<ExportBridge>({
    onExcel: () => undefined,
    onPdf: () => undefined,
    disabled: true,
  });
  const [kpiState, setKpiState] = useState<{
    summary?: SummaryDisplayTotals;
    detailedMovement?: StockRegisterBatchWiseTotals;
    batch?: StockRegisterBatchSummaryTotals;
  }>({});

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (!mounted || drilldownApplied.current) return;
    const product = searchParams.get("product");
    const warehouse = searchParams.get("warehouse");
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    const fy = searchParams.get("fy");
    const tabParam = searchParams.get("tab");
    if (!product && !warehouse && !from && !to && !fy && !tabParam) return;

    drilldownApplied.current = true;
    setPreset("custom");
    if (tabParam) setTab(parseTab(tabParam));
    if (product) setProductIds([product]);
    if (warehouse) setWarehouses([warehouse]);
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
    if (fy) setFinancialYearId(fy);
  }, [mounted, searchParams]);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleTabChange = useCallback(
    (id: string) => {
      const next = parseTab(id);
      setTab(next);
      setPage(1);
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("tab", next);
      router.replace(`/accounts/reports/stock-register?${qs.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

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

  const productOptions = useMemo(
    () =>
      mounted
        ? getStockRegisterProductOptions().map((p) => ({
            value: p.id,
            label: p.name,
            searchText: p.code,
          }))
        : [],
    [mounted, refreshKey],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getStockRegisterWarehouseOptions() : []),
    [mounted, refreshKey],
  );

  const filters = useMemo(
    (): StockRegisterFilters => ({
      dateFrom,
      dateTo,
      financialYearId,
      branch,
      warehouse: warehouses,
      productId: productIds,
      category,
      batchNo: EMPTY_BATCH_NOS,
    }),
    [dateFrom, dateTo, financialYearId, branch, warehouses, productIds, category, refreshKey],
  );

  const emptySummary = useMemo(
    () => ({
      rows: [] as StockRegisterSummaryRow[],
      totals: {
        totalProducts: 0,
        totalOpeningQty: 0,
        totalInwardQty: 0,
        totalOutwardQty: 0,
        totalClosingValue: 0,
        totalClosingQty: 0,
      } satisfies SummaryDisplayTotals,
      hasData: false,
    }),
    [],
  );
  const emptyDetailed = useMemo(
    () => ({
      rows: [] as StockRegisterBatchWiseRow[],
      totals: {
        totalTransactions: 0,
        totalQuantityIn: 0,
        totalQuantityOut: 0,
        currentBalanceQty: 0,
        totalMovementValue: 0,
      },
      hasData: false,
    }),
    [],
  );
  const emptyBatchSummary = useMemo(
    () => ({
      rows: [] as StockRegisterBatchSummaryRow[],
      totals: {
        totalProducts: 0,
        totalBatches: 0,
        totalOpeningQty: 0,
        totalInwardQty: 0,
        totalOutwardQty: 0,
        totalClosingQty: 0,
      },
      hasData: false,
    }),
    [],
  );

  const summaryReport = useMemo(() => {
    if (!mounted || !datesReady || tab !== "summary") return emptySummary;
    const report = buildStockRegisterSummary(filters);
    return {
      ...report,
      totals: {
        ...report.totals,
        totalClosingQty: report.rows.reduce((s, r) => s + r.closingQty, 0),
      },
    };
  }, [mounted, datesReady, filters, tab, emptySummary]);

  /** Detailed = transaction / document movement rows. */
  const detailedReport = useMemo(() => {
    if (!mounted || !datesReady || tab !== "detailed") return emptyDetailed;
    return buildStockRegisterBatchWise(filters);
  }, [mounted, datesReady, filters, tab, emptyDetailed]);

  /**
   * Batch Wise = product + batch + warehouse summary (reuses existing detailed aggregate builder;
   * presentation maps buckets → Opening / Inward / Outward / Closing).
   */
  const batchSummaryReport = useMemo(() => {
    if (!mounted || !datesReady || tab !== "batch-wise") return emptyBatchSummary;
    const report = buildStockRegisterDetailed(filters);
    const rows = report.rows.map(toBatchSummaryRow);
    return {
      rows,
      totals: buildBatchSummaryTotals(rows),
      hasData: rows.length > 0,
    };
  }, [mounted, datesReady, filters, tab, emptyBatchSummary]);

  const handleSummaryTotals = useCallback((totals: SummaryDisplayTotals) => {
    setKpiState((s) => (s.summary === totals ? s : { ...s, summary: totals }));
  }, []);
  const handleDetailedTotals = useCallback((totals: StockRegisterBatchWiseTotals) => {
    setKpiState((s) => (s.detailedMovement === totals ? s : { ...s, detailedMovement: totals }));
  }, []);
  const handleBatchTotals = useCallback((totals: StockRegisterBatchSummaryTotals) => {
    setKpiState((s) => (s.batch === totals ? s : { ...s, batch: totals }));
  }, []);

  const recomputeSummaryTotals = useCallback((filtered: StockRegisterSummaryRow[]): SummaryDisplayTotals => {
    return {
      totalProducts: filtered.length,
      totalOpeningQty: filtered.reduce((s, r) => s + r.openingQty, 0),
      totalInwardQty: filtered.reduce((s, r) => s + r.inwardQty, 0),
      totalOutwardQty: filtered.reduce((s, r) => s + r.outwardQty, 0),
      totalClosingValue: roundMoney(filtered.reduce((s, r) => s + r.closingValue, 0)),
      totalClosingQty: filtered.reduce((s, r) => s + r.closingQty, 0),
    };
  }, []);

  const recomputeDetailedTotals = useCallback((filtered: StockRegisterBatchWiseRow[]): StockRegisterBatchWiseTotals => {
    const latestByKey = new Map<string, StockRegisterBatchWiseRow>();
    for (const row of filtered) {
      const key = `${row.productCode}|${row.warehouse}|${row.batchNo}`;
      const existing = latestByKey.get(key);
      if (!existing || row.date.localeCompare(existing.date) >= 0) {
        latestByKey.set(key, row);
      }
    }
    let currentBalanceQty = 0;
    for (const row of latestByKey.values()) currentBalanceQty += row.runningBalanceQty;
    return {
      totalTransactions: filtered.length,
      totalQuantityIn: filtered.reduce((s, r) => s + r.quantityIn, 0),
      totalQuantityOut: filtered.reduce((s, r) => s + r.quantityOut, 0),
      currentBalanceQty,
      totalMovementValue: roundMoney(filtered.reduce((s, r) => s + r.value, 0)),
    };
  }, []);

  const recomputeBatchSummaryTotals = useCallback(
    (filtered: StockRegisterBatchSummaryRow[]) => buildBatchSummaryTotals(filtered),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [tab, dateFrom, dateTo, financialYearId, warehouses, productIds, pageSize]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      buildEntityFilterSummary("product", "Products", productIds, productOptions, () => setProductIds([])),
      buildEntityFilterSummary(
        "warehouse",
        "Warehouses",
        warehouses,
        warehouseOptions.map((w) => ({ value: w, label: w })),
        () => setWarehouses([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [productIds, warehouses, productOptions, warehouseOptions]);

  const exportMeta = useMemo((): StockRegisterExportMeta => {
    return {
      dateFrom,
      dateTo,
      financialYear: resolveFinancialYearLabel(financialYearId) || "All",
      branch: "All",
      warehouse: formatMultiSelectLabel(
        warehouses,
        warehouseOptions.map((w) => ({ value: w, label: w })),
        "Warehouse",
        "All",
      ),
      product: formatMultiSelectLabel(productIds, productOptions, "Product", "All"),
      category: "All",
      batchNo: "All",
      tab,
    };
  }, [
    dateFrom,
    dateTo,
    financialYearId,
    warehouses,
    warehouseOptions,
    productIds,
    productOptions,
    tab,
  ]);

  const kpiItems = useMemo(() => {
    if (tab === "summary") {
      const t = kpiState.summary ?? summaryReport.totals;
      return [
        { label: "Total Products", value: String(t.totalProducts), icon: Package },
        { label: "Total Opening Quantity", value: formatQty(t.totalOpeningQty, true), icon: Boxes },
        { label: "Total Inward Quantity", value: formatQty(t.totalInwardQty, true), icon: ArrowDownToLine },
        { label: "Total Outward Quantity", value: formatQty(t.totalOutwardQty, true), icon: ArrowUpFromLine },
        { label: "Total Closing Quantity", value: formatQty(t.totalClosingQty, true), icon: Layers },
      ];
    }
    if (tab === "detailed") {
      const t = kpiState.detailedMovement ?? detailedReport.totals;
      return [
        { label: "Total Transactions", value: String(t.totalTransactions), icon: Package },
        { label: "Total Quantity In", value: formatQty(t.totalQuantityIn, true), icon: ArrowDownToLine },
        { label: "Total Quantity Out", value: formatQty(t.totalQuantityOut, true), icon: ArrowUpFromLine },
        { label: "Net Movement", value: formatQty(t.totalQuantityIn - t.totalQuantityOut, true), icon: Boxes },
      ];
    }
    const t = kpiState.batch ?? batchSummaryReport.totals;
    return [
      { label: "Total Products", value: String(t.totalProducts), icon: Package },
      { label: "Total Batches", value: String(t.totalBatches), icon: Layers },
      { label: "Total Opening Quantity", value: formatQty(t.totalOpeningQty, true), icon: Boxes },
      { label: "Total Inward Quantity", value: formatQty(t.totalInwardQty, true), icon: ArrowDownToLine },
      { label: "Total Outward Quantity", value: formatQty(t.totalOutwardQty, true), icon: ArrowUpFromLine },
      { label: "Total Closing Quantity", value: formatQty(t.totalClosingQty, true), icon: Boxes },
    ];
  }, [tab, kpiState, summaryReport.totals, detailedReport.totals, batchSummaryReport.totals]);

  const summaryGetCell = useCallback((row: StockRegisterSummaryRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);
  const detailedGetCell = useCallback((row: StockRegisterBatchWiseRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);
  const batchGetCell = useCallback((row: StockRegisterBatchSummaryRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Register")}
      title="Stock Register"
      description="Stock movement for the selected period — Summary (product), Detailed (transactions), Batch Wise (batch balance)."
      filters={
        <>
          <ReportFilterRow
            className="items-end"
            wrap
            end={
              <AccountsExportMenu
                onExcel={exportBridge.onExcel}
                onPdf={exportBridge.onPdf}
                disabled={exporting || exportBridge.disabled}
              />
            }
          >
            <ReportFinancialYearFilter value={financialYearId} onChange={handleFinancialYearChange} />
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
              values={productIds}
              onChange={setProductIds}
              products={productOptions}
            />
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsReportBody>
        <SectionTabs tabs={TABS} active={tab} onChange={handleTabChange} compact />

        <AccountsReportKpiGrid className="mt-3">
          {kpiItems.map((item) => (
            <AccountsReportKpiCard
              key={item.label}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </AccountsReportKpiGrid>

        {tab === "summary" && (
          <AccountsColumnFilterProvider
            rows={summaryReport.rows}
            getCellValue={summaryGetCell}
            columnConfig={{
              productName: { type: "text" },
              openingQty: { type: "amount" },
              inwardQty: { type: "amount" },
              outwardQty: { type: "amount" },
              closingQty: { type: "amount" },
            }}
            defaultSortKey="productName"
            defaultSortDir="asc"
          >
            <TabListing
              tab="summary"
              sourceRows={summaryReport.rows}
              emptyLabel="No products match the selected filters."
              page={page}
              setPage={setPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              recordLabel="products"
              exporting={exporting}
              setExporting={setExporting}
              exportMeta={exportMeta}
              baseTotals={summaryReport.totals}
              setExportBridge={setExportBridge}
              onTotals={handleSummaryTotals}
              recomputeTotals={recomputeSummaryTotals}
              renderTable={(rows, totals) => <SummaryTable rows={rows} totals={totals} />}
            />
          </AccountsColumnFilterProvider>
        )}

        {tab === "detailed" && (
          <AccountsColumnFilterProvider
            rows={detailedReport.rows}
            getCellValue={detailedGetCell}
            columnConfig={{
              date: { type: "date" },
              voucherType: { type: "text" },
              voucherNumber: { type: "text" },
              productName: { type: "text" },
              warehouse: { type: "text" },
              partyName: { type: "text" },
              quantityIn: { type: "amount" },
              quantityOut: { type: "amount" },
              runningBalanceQty: { type: "amount" },
            }}
            defaultSortKey="date"
            defaultSortDir="asc"
          >
            <TabListing
              tab="detailed"
              sourceRows={detailedReport.rows}
              emptyLabel="No stock movements match the selected filters."
              page={page}
              setPage={setPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              recordLabel="transactions"
              exporting={exporting}
              setExporting={setExporting}
              exportMeta={exportMeta}
              baseTotals={detailedReport.totals}
              setExportBridge={setExportBridge}
              onTotals={handleDetailedTotals}
              recomputeTotals={recomputeDetailedTotals}
              renderTable={(rows) => <DetailedMovementTable rows={rows} />}
            />
          </AccountsColumnFilterProvider>
        )}

        {tab === "batch-wise" && (
          <AccountsColumnFilterProvider
            rows={batchSummaryReport.rows}
            getCellValue={batchGetCell}
            columnConfig={{
              productName: { type: "text" },
              batchNo: { type: "text" },
              mfgDate: { type: "date" },
              expiryDate: { type: "date" },
              warehouse: { type: "text" },
              openingQty: { type: "amount" },
              inwardQty: { type: "amount" },
              outwardQty: { type: "amount" },
              closingQty: { type: "amount" },
            }}
            defaultSortKey="productName"
            defaultSortDir="asc"
          >
            <TabListing
              tab="batch-wise"
              sourceRows={batchSummaryReport.rows}
              emptyLabel="No batches match the selected filters."
              page={page}
              setPage={setPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              recordLabel="batches"
              exporting={exporting}
              setExporting={setExporting}
              exportMeta={exportMeta}
              baseTotals={batchSummaryReport.totals}
              setExportBridge={setExportBridge}
              onTotals={handleBatchTotals}
              recomputeTotals={recomputeBatchSummaryTotals}
              renderTable={(rows, totals) => <BatchWiseSummaryTable rows={rows} totals={totals} />}
            />
          </AccountsColumnFilterProvider>
        )}
      </AccountsReportBody>
    </AccountsPageShell>
  );
}

function TabListing<TRow extends object, TTotals extends object>({
  tab,
  sourceRows,
  emptyLabel,
  page,
  setPage,
  pageSize,
  setPageSize,
  recordLabel,
  exporting,
  setExporting,
  exportMeta,
  baseTotals,
  setExportBridge,
  onTotals,
  recomputeTotals,
  renderTable,
}: {
  tab: StockRegisterTab;
  sourceRows: TRow[];
  emptyLabel: string;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  recordLabel: string;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: StockRegisterExportMeta;
  baseTotals: TTotals;
  setExportBridge: (bridge: ExportBridge) => void;
  onTotals: (totals: TTotals) => void;
  recomputeTotals: (rows: TRow[]) => TTotals;
  renderTable: (rows: TRow[], totals: TTotals) => React.ReactNode;
}) {
  const columnFilteredRows = useAccountsFilteredRows(sourceRows);
  const totals = useMemo(
    () => (columnFilteredRows.length === sourceRows.length ? baseTotals : recomputeTotals(columnFilteredRows)),
    [columnFilteredRows, sourceRows.length, baseTotals, recomputeTotals],
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    onTotals(totals);
  }, [totals, onTotals]);

  const handleExportExcel = useCallback(async () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportStockRegisterToExcel(tab, columnFilteredRows as never, totals as never, exportMeta);
    } finally {
      setExporting(false);
    }
  }, [columnFilteredRows, exporting, setExporting, tab, totals, exportMeta]);

  const handleExportPdf = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    exportStockRegisterToPdf(tab, columnFilteredRows as never, totals as never, exportMeta);
  }, [columnFilteredRows, exporting, tab, totals, exportMeta]);

  const exportHandlersRef = useRef({ onExcel: handleExportExcel, onPdf: handleExportPdf });
  exportHandlersRef.current = { onExcel: handleExportExcel, onPdf: handleExportPdf };
  const exportDisabled = columnFilteredRows.length === 0;

  useEffect(() => {
    setExportBridge({
      onExcel: () => exportHandlersRef.current.onExcel(),
      onPdf: () => exportHandlersRef.current.onPdf(),
      disabled: exportDisabled,
    });
  }, [setExportBridge, exportDisabled]);

  return (
    <div className="mt-3 flex flex-col flex-1 min-h-0">
      <AccountsTableListing
        footer={
          columnFilteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={columnFilteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel={recordLabel}
            />
          ) : undefined
        }
      >
        {sourceRows.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</div>
        ) : columnFilteredRows.length === 0 ? (
          <div className="accounts-table-empty py-8 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          renderTable(paginatedRows, totals)
        )}
      </AccountsTableListing>
    </div>
  );
}

function SummaryTable({
  rows,
  totals,
}: {
  rows: StockRegisterSummaryRow[];
  totals: SummaryDisplayTotals;
}) {
  return (
    <AccountsTableScroll>
      <AccountsTable>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Product Name" colKey="productName" filterType="text" />
            <SortTh label="Opening Quantity" colKey="openingQty" align="right" filterType="amount" />
            <SortTh label="Inward Quantity" colKey="inwardQty" align="right" filterType="amount" />
            <SortTh label="Outward Quantity" colKey="outwardQty" align="right" filterType="amount" />
            <SortTh label="Closing Quantity" colKey="closingQty" align="right" filterType="amount" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => (
            <AccountsTableRow key={row.rowKey}>
              <AccountsTableCell className="font-medium">{row.productName}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.openingQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.inwardQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.outwardQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums font-medium">{formatQty(row.closingQty, true)}</AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow>
            <AccountsTableCell className="font-semibold">Totals</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalOpeningQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalInwardQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalOutwardQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalClosingQty, true)}</AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function DetailedMovementTable({ rows }: { rows: StockRegisterBatchWiseRow[] }) {
  const router = useRouter();
  return (
    <AccountsTableScroll>
      <AccountsTable className="min-w-[1000px]">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Date" colKey="date" filterType="date" />
            <SortTh label="Voucher Type" colKey="voucherType" filterType="text" />
            <SortTh label="Voucher Number" colKey="voucherNumber" filterType="text" />
            <SortTh label="Product Name" colKey="productName" filterType="text" />
            <SortTh label="Warehouse" colKey="warehouse" filterType="text" />
            <SortTh label="Party Name" colKey="partyName" filterType="text" />
            <SortTh label="Quantity In" colKey="quantityIn" align="right" filterType="amount" />
            <SortTh label="Quantity Out" colKey="quantityOut" align="right" filterType="amount" />
            <SortTh label="Balance Quantity" colKey="runningBalanceQty" align="right" filterType="amount" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => (
            <AccountsTableRow
              key={row.id}
              className={cn(row.viewHref && "cursor-pointer")}
              onClick={() => {
                if (row.viewHref) router.push(row.viewHref);
              }}
            >
              <AccountsTableCell className="whitespace-nowrap">{formatStockRegisterDate(row.date)}</AccountsTableCell>
              <AccountsTableCell>{row.voucherType}</AccountsTableCell>
              <AccountsTableCell className="font-mono text-xs text-brand-700">{row.voucherNumber}</AccountsTableCell>
              <AccountsTableCell className="font-medium whitespace-nowrap">{row.productName}</AccountsTableCell>
              <AccountsTableCell>{row.warehouse}</AccountsTableCell>
              <AccountsTableCell>{row.partyName}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.quantityIn)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.quantityOut)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums font-medium">{formatQty(row.runningBalanceQty, true)}</AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function BatchWiseSummaryTable({
  rows,
  totals,
}: {
  rows: StockRegisterBatchSummaryRow[];
  totals: StockRegisterBatchSummaryTotals;
}) {
  return (
    <AccountsTableScroll>
      <AccountsTable className="min-w-[1100px]">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Product Name" colKey="productName" filterType="text" />
            <SortTh label="Batch Number" colKey="batchNo" filterType="text" />
            <SortTh label="Manufacturing Date" colKey="mfgDate" filterType="date" />
            <SortTh label="Expiry Date" colKey="expiryDate" filterType="date" />
            <SortTh label="Warehouse" colKey="warehouse" filterType="text" />
            <SortTh label="Opening Quantity" colKey="openingQty" align="right" filterType="amount" />
            <SortTh label="Inward Quantity" colKey="inwardQty" align="right" filterType="amount" />
            <SortTh label="Outward Quantity" colKey="outwardQty" align="right" filterType="amount" />
            <SortTh label="Closing Quantity" colKey="closingQty" align="right" filterType="amount" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => (
            <AccountsTableRow key={row.rowKey}>
              <AccountsTableCell className="font-medium whitespace-nowrap">{row.productName}</AccountsTableCell>
              <AccountsTableCell className="font-mono text-xs">{row.batchNo}</AccountsTableCell>
              <AccountsTableCell>{row.mfgDate ? formatStockRegisterDate(row.mfgDate) : "—"}</AccountsTableCell>
              <AccountsTableCell>{row.expiryDate ? formatStockRegisterDate(row.expiryDate) : "—"}</AccountsTableCell>
              <AccountsTableCell>{row.warehouse}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.openingQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.inwardQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.outwardQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums font-medium">{formatQty(row.closingQty, true)}</AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow>
            <AccountsTableCell className="font-semibold" colSpan={5}>
              Totals
            </AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalOpeningQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalInwardQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalOutwardQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalClosingQty, true)}</AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
