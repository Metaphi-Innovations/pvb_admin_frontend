"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Package,
  Scale,
} from "lucide-react";
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
  ReportBranchFilter,
  ReportWarehouseMultiFilter,
  ReportProductMultiFilter,
  ReportFilterSummary,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { resolveFinancialYearLabel } from "@/lib/accounts/pl-compute";
import { formatMoney, MONEY_AMOUNT_CLASS, roundMoney } from "@/lib/accounts/money-format";
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
  getStockRegisterBatchOptions,
  getStockRegisterCategoryOptions,
  getStockRegisterProductOptions,
  getStockRegisterWarehouseOptions,
  type StockRegisterBatchWiseRow,
  type StockRegisterBatchWiseTotals,
  type StockRegisterDetailedRow,
  type StockRegisterDetailedTotals,
  type StockRegisterFilters,
  type StockRegisterSummaryRow,
  type StockRegisterSummaryTotals,
  type StockRegisterTab,
} from "@/lib/accounts/stock-register-compute";
import {
  exportStockRegisterToExcel,
  exportStockRegisterToPdf,
  type StockRegisterExportMeta,
} from "./stock-register-export";

const PLACEHOLDER_DATE = "2025-04-01";

const TABS: { id: StockRegisterTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Detailed" },
  { id: "batch-wise", label: "Batch Wise" },
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

function parseTab(raw: string | null): StockRegisterTab {
  if (raw === "detailed" || raw === "batch-wise" || raw === "summary") return raw;
  return "summary";
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
  // #region agent log
  const debugMountAt = useRef(typeof performance !== "undefined" ? performance.now() : Date.now());
  useEffect(() => {
    fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
      body: JSON.stringify({
        sessionId: "8fbc9e",
        runId: "post-fix",
        hypothesisId: "H3_H4",
        location: "StockRegisterPageClient.tsx:mount",
        message: "Stock Register client mounted",
        data: {
          tab: searchParams.get("tab"),
          href: typeof window !== "undefined" ? window.location.href : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    const onErr = (event: ErrorEvent) => {
      fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
        body: JSON.stringify({
          sessionId: "8fbc9e",
          runId: "post-fix",
          hypothesisId: "H4",
          location: "StockRegisterPageClient.tsx:window.error",
          message: "Stock Register window error",
          data: { msg: String(event.message ?? ""), file: String(event.filename ?? "") },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };
    window.addEventListener("error", onErr);
    return () => window.removeEventListener("error", onErr);
  }, [searchParams]);
  // #endregion

  const [tab, setTab] = useState<StockRegisterTab>(() => parseTab(searchParams.get("tab")));
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branch, setBranch] = useState("all");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [category, setCategory] = useState("all");
  const [batchNos, setBatchNos] = useState<string[]>([]);
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
    summary?: StockRegisterSummaryTotals;
    detailed?: StockRegisterDetailedTotals;
    batch?: StockRegisterBatchWiseTotals;
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
    const batch = searchParams.get("batch");
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    const fy = searchParams.get("fy");
    const tabParam = searchParams.get("tab");
    const branchParam = searchParams.get("branch");
    if (!product && !warehouse && !batch && !from && !to && !fy && !tabParam && !branchParam) return;

    drilldownApplied.current = true;
    setPreset("custom");
    if (tabParam) setTab(parseTab(tabParam));
    if (product) setProductIds([product]);
    if (warehouse) setWarehouses([warehouse]);
    if (batch) setBatchNos([batch]);
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
    if (fy) setFinancialYearId(fy);
    if (branchParam) setBranch(branchParam);
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
  const categoryOptions = useMemo(
    () => (mounted ? getStockRegisterCategoryOptions() : []),
    [mounted, refreshKey],
  );
  const batchOptions = useMemo(
    () => (mounted ? getStockRegisterBatchOptions().map((b) => ({ value: b, label: b })) : []),
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
      batchNo: batchNos,
    }),
    [dateFrom, dateTo, financialYearId, branch, warehouses, productIds, category, batchNos, refreshKey],
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
      },
      hasData: false,
    }),
    [],
  );
  const emptyDetailed = useMemo(
    () => ({
      rows: [] as StockRegisterDetailedRow[],
      totals: {
        totalProducts: 0,
        totalBatches: 0,
        totalOpeningQty: 0,
        totalClosingQty: 0,
        totalClosingValue: 0,
      },
      hasData: false,
    }),
    [],
  );
  const emptyBatch = useMemo(
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

  const summaryReport = useMemo(() => {
    if (!mounted || !datesReady || tab !== "summary") return emptySummary;
    // #region agent log
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    // #endregion
    const result = buildStockRegisterSummary(filters);
    // #region agent log
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
      body: JSON.stringify({
        sessionId: "8fbc9e",
        runId: "post-fix",
        hypothesisId: "H3",
        location: "StockRegisterPageClient.tsx:summaryReport",
        message: "buildStockRegisterSummary timing",
        data: {
          ms: Math.round(ms),
          rows: result.rows.length,
          sinceMountMs: Math.round(
            (typeof performance !== "undefined" ? performance.now() : Date.now()) - debugMountAt.current,
          ),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return result;
  }, [mounted, datesReady, filters, tab, emptySummary]);

  const detailedReport = useMemo(() => {
    if (!mounted || !datesReady || tab !== "detailed") return emptyDetailed;
    // #region agent log
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    // #endregion
    const result = buildStockRegisterDetailed(filters);
    // #region agent log
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
      body: JSON.stringify({
        sessionId: "8fbc9e",
        runId: "post-fix",
        hypothesisId: "H3",
        location: "StockRegisterPageClient.tsx:detailedReport",
        message: "buildStockRegisterDetailed timing",
        data: { ms: Math.round(ms), rows: result.rows.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return result;
  }, [mounted, datesReady, filters, tab, emptyDetailed]);

  const batchReport = useMemo(() => {
    if (!mounted || !datesReady || tab !== "batch-wise") return emptyBatch;
    // #region agent log
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    // #endregion
    const result = buildStockRegisterBatchWise(filters);
    // #region agent log
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
      body: JSON.stringify({
        sessionId: "8fbc9e",
        runId: "post-fix",
        hypothesisId: "H3",
        location: "StockRegisterPageClient.tsx:batchReport",
        message: "buildStockRegisterBatchWise timing",
        data: { ms: Math.round(ms), rows: result.rows.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return result;
  }, [mounted, datesReady, filters, tab, emptyBatch]);

  const handleSummaryTotals = useCallback((totals: StockRegisterSummaryTotals) => {
    setKpiState((s) => (s.summary === totals ? s : { ...s, summary: totals }));
  }, []);
  const handleDetailedTotals = useCallback((totals: StockRegisterDetailedTotals) => {
    setKpiState((s) => (s.detailed === totals ? s : { ...s, detailed: totals }));
  }, []);
  const handleBatchTotals = useCallback((totals: StockRegisterBatchWiseTotals) => {
    setKpiState((s) => (s.batch === totals ? s : { ...s, batch: totals }));
  }, []);

  const recomputeSummaryTotals = useCallback((filtered: StockRegisterSummaryRow[]) => {
    return {
      totalProducts: filtered.length,
      totalOpeningQty: filtered.reduce((s, r) => s + r.openingQty, 0),
      totalInwardQty: filtered.reduce((s, r) => s + r.inwardQty, 0),
      totalOutwardQty: filtered.reduce((s, r) => s + r.outwardQty, 0),
      totalClosingValue: roundMoney(filtered.reduce((s, r) => s + r.closingValue, 0)),
    };
  }, []);

  const recomputeDetailedTotals = useCallback((filtered: StockRegisterDetailedRow[]) => {
    return {
      totalProducts: new Set(filtered.map((r) => r.productCode)).size,
      totalBatches: filtered.length,
      totalOpeningQty: filtered.reduce((s, r) => s + r.openingStock, 0),
      totalClosingQty: filtered.reduce((s, r) => s + r.closingStock, 0),
      totalClosingValue: roundMoney(filtered.reduce((s, r) => s + r.closingValue, 0)),
    };
  }, []);

  const recomputeBatchTotals = useCallback((filtered: StockRegisterBatchWiseRow[]) => {
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

  useEffect(() => {
    setPage(1);
  }, [tab, dateFrom, dateTo, financialYearId, branch, warehouses, productIds, category, batchNos, pageSize]);

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
      buildEntityFilterSummary("batch", "Batches", batchNos, batchOptions, () => setBatchNos([])),
      category !== "all"
        ? { id: "category", label: "Category", value: category, onRemove: () => setCategory("all") }
        : null,
      branch !== "all"
        ? { id: "branch", label: "Branch", value: branch, onRemove: () => setBranch("all") }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [productIds, warehouses, batchNos, category, branch, productOptions, warehouseOptions, batchOptions]);

  const exportMeta = useMemo((): StockRegisterExportMeta => {
    return {
      dateFrom,
      dateTo,
      financialYear: resolveFinancialYearLabel(financialYearId) || "All",
      branch: branch === "all" ? "All" : branch,
      warehouse: formatMultiSelectLabel(
        warehouses,
        warehouseOptions.map((w) => ({ value: w, label: w })),
        "Warehouse",
        "All",
      ),
      product: formatMultiSelectLabel(productIds, productOptions, "Product", "All"),
      category: category === "all" ? "All" : category,
      batchNo: formatMultiSelectLabel(batchNos, batchOptions, "Batch", "All"),
      tab,
    };
  }, [
    dateFrom,
    dateTo,
    financialYearId,
    branch,
    warehouses,
    warehouseOptions,
    productIds,
    productOptions,
    category,
    batchNos,
    batchOptions,
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
        { label: "Total Closing Value", value: formatMoney(t.totalClosingValue), icon: Scale },
      ];
    }
    if (tab === "detailed") {
      const t = kpiState.detailed ?? detailedReport.totals;
      return [
        { label: "Total Products", value: String(t.totalProducts), icon: Package },
        { label: "Total Batches", value: String(t.totalBatches), icon: Boxes },
        { label: "Total Opening Quantity", value: formatQty(t.totalOpeningQty, true), icon: ArrowDownToLine },
        { label: "Total Closing Quantity", value: formatQty(t.totalClosingQty, true), icon: ArrowUpFromLine },
        { label: "Total Closing Value", value: formatMoney(t.totalClosingValue), icon: Scale },
      ];
    }
    const t = kpiState.batch ?? batchReport.totals;
    return [
      { label: "Total Transactions", value: String(t.totalTransactions), icon: Package },
      { label: "Total Quantity In", value: formatQty(t.totalQuantityIn, true), icon: ArrowDownToLine },
      { label: "Total Quantity Out", value: formatQty(t.totalQuantityOut, true), icon: ArrowUpFromLine },
      { label: "Current Balance Quantity", value: formatQty(t.currentBalanceQty, true), icon: Boxes },
      { label: "Total Movement Value", value: formatMoney(t.totalMovementValue), icon: Scale },
    ];
  }, [tab, kpiState, summaryReport.totals, detailedReport.totals, batchReport.totals]);

  const summaryGetCell = useCallback((row: StockRegisterSummaryRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);
  const detailedGetCell = useCallback((row: StockRegisterDetailedRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);
  const batchGetCell = useCallback((row: StockRegisterBatchWiseRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Register")}
      title="Stock Register"
      description="Product summary, batch-level stock movement, and transaction-wise batch register."
      filters={
        <>
          <ReportFilterRow
            className="items-end"
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
            <ReportBranchFilter value={branch} onChange={setBranch} />
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
            <div className="space-y-0.5 min-w-[140px]">
              <Label className={filterLabelClass}>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={cn(filterControlClass, "w-[140px]")}>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ReportProductMultiFilter
              values={batchNos}
              onChange={setBatchNos}
              products={batchOptions}
              label="Batch Number"
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
              rate: { type: "amount" },
              closingValue: { type: "amount" },
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
              productName: { type: "text" },
              batchNo: { type: "text" },
              mfgDate: { type: "date" },
              expiryDate: { type: "date" },
              openingStock: { type: "amount" },
              purchaseQty: { type: "amount" },
              purchaseReturnQty: { type: "amount" },
              netPurchase: { type: "amount" },
              salesQty: { type: "amount" },
              salesReturnQty: { type: "amount" },
              netSales: { type: "amount" },
              stockTransferIn: { type: "amount" },
              stockTransferOut: { type: "amount" },
              sampleReturn: { type: "amount" },
              sampleIssue: { type: "amount" },
              positiveAdjustment: { type: "amount" },
              negativeAdjustment: { type: "amount" },
              closingStock: { type: "amount" },
              rate: { type: "amount" },
              closingValue: { type: "amount" },
            }}
            defaultSortKey="productName"
            defaultSortDir="asc"
          >
            <TabListing
              tab="detailed"
              sourceRows={detailedReport.rows}
              emptyLabel="No batch rows match the selected filters."
              page={page}
              setPage={setPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              recordLabel="batches"
              exporting={exporting}
              setExporting={setExporting}
              exportMeta={exportMeta}
              baseTotals={detailedReport.totals}
              setExportBridge={setExportBridge}
              onTotals={handleDetailedTotals}
              recomputeTotals={recomputeDetailedTotals}
              renderTable={(rows, totals) => <DetailedTable rows={rows} totals={totals} />}
            />
          </AccountsColumnFilterProvider>
        )}

        {tab === "batch-wise" && (
          <AccountsColumnFilterProvider
            rows={batchReport.rows}
            getCellValue={batchGetCell}
            columnConfig={{
              date: { type: "date" },
              voucherType: { type: "text" },
              voucherNumber: { type: "text" },
              productName: { type: "text" },
              batchNo: { type: "text" },
              mfgDate: { type: "date" },
              expiryDate: { type: "date" },
              warehouse: { type: "text" },
              partyName: { type: "text" },
              quantityIn: { type: "amount" },
              quantityOut: { type: "amount" },
              runningBalanceQty: { type: "amount" },
              rate: { type: "amount" },
              value: { type: "amount" },
              remarks: { type: "text" },
            }}
            defaultSortKey="date"
            defaultSortDir="asc"
          >
            <TabListing
              tab="batch-wise"
              sourceRows={batchReport.rows}
              emptyLabel="No stock movements match the selected filters."
              page={page}
              setPage={setPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              recordLabel="transactions"
              exporting={exporting}
              setExporting={setExporting}
              exportMeta={exportMeta}
              baseTotals={batchReport.totals}
              setExportBridge={setExportBridge}
              onTotals={handleBatchTotals}
              recomputeTotals={recomputeBatchTotals}
              renderTable={(rows) => <BatchWiseTable rows={rows} />}
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
  totals: StockRegisterSummaryTotals;
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
            <SortTh label="Rate" colKey="rate" align="right" filterType="amount" />
            <SortTh label="Closing Stock Value" colKey="closingValue" align="right" filterType="amount" />
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
              <AccountsTableCell className={cn("text-right tabular-nums", MONEY_AMOUNT_CLASS)}>{formatMoney(row.rate)}</AccountsTableCell>
              <AccountsTableCell className={cn("text-right tabular-nums font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(row.closingValue)}</AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow>
            <AccountsTableCell className="font-semibold">Totals</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalOpeningQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalInwardQty, true)}</AccountsTableCell>
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalOutwardQty, true)}</AccountsTableCell>
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell className={cn("text-right font-semibold tabular-nums", MONEY_AMOUNT_CLASS)}>
              {formatMoney(totals.totalClosingValue)}
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function DetailedTable({
  rows,
  totals,
}: {
  rows: StockRegisterDetailedRow[];
  totals: StockRegisterDetailedTotals;
}) {
  return (
    <AccountsTableScroll>
      <AccountsTable className="min-w-[1600px]">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Product Name" colKey="productName" filterType="text" />
            <SortTh label="Batch Number" colKey="batchNo" filterType="text" />
            <SortTh label="Manufacturing Date" colKey="mfgDate" filterType="date" />
            <SortTh label="Expiry Date" colKey="expiryDate" filterType="date" />
            <SortTh label="Opening Stock" colKey="openingStock" align="right" filterType="amount" />
            <SortTh label="Purchase Quantity" colKey="purchaseQty" align="right" filterType="amount" />
            <SortTh label="Purchase Return Quantity" colKey="purchaseReturnQty" align="right" filterType="amount" />
            <SortTh label="Net Purchase" colKey="netPurchase" align="right" filterType="amount" />
            <SortTh label="Sales Quantity" colKey="salesQty" align="right" filterType="amount" />
            <SortTh label="Sales Return Quantity" colKey="salesReturnQty" align="right" filterType="amount" />
            <SortTh label="Net Sales" colKey="netSales" align="right" filterType="amount" />
            <SortTh label="Stock Transfer In" colKey="stockTransferIn" align="right" filterType="amount" />
            <SortTh label="Stock Transfer Out" colKey="stockTransferOut" align="right" filterType="amount" />
            <SortTh label="Sample Return" colKey="sampleReturn" align="right" filterType="amount" />
            <SortTh label="Sample Issue" colKey="sampleIssue" align="right" filterType="amount" />
            <SortTh label="Positive Adjustment" colKey="positiveAdjustment" align="right" filterType="amount" />
            <SortTh label="Negative Adjustment" colKey="negativeAdjustment" align="right" filterType="amount" />
            <SortTh label="Closing Stock" colKey="closingStock" align="right" filterType="amount" />
            <SortTh label="Rate" colKey="rate" align="right" filterType="amount" />
            <SortTh label="Closing Value" colKey="closingValue" align="right" filterType="amount" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => (
            <AccountsTableRow key={row.rowKey}>
              <AccountsTableCell className="font-medium whitespace-nowrap">{row.productName}</AccountsTableCell>
              <AccountsTableCell className="font-mono text-xs text-brand-700">{row.batchNo}</AccountsTableCell>
              <AccountsTableCell>{row.mfgDate ? formatStockRegisterDate(row.mfgDate) : "—"}</AccountsTableCell>
              <AccountsTableCell>{row.expiryDate ? formatStockRegisterDate(row.expiryDate) : "—"}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.openingStock, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.purchaseQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.purchaseReturnQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.netPurchase, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.salesQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.salesReturnQty, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.netSales, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.stockTransferIn, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.stockTransferOut, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.sampleReturn, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.sampleIssue, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.positiveAdjustment, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.negativeAdjustment, true)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums font-medium">{formatQty(row.closingStock, true)}</AccountsTableCell>
              <AccountsTableCell className={cn("text-right tabular-nums", MONEY_AMOUNT_CLASS)}>{formatMoney(row.rate)}</AccountsTableCell>
              <AccountsTableCell className={cn("text-right tabular-nums font-medium", MONEY_AMOUNT_CLASS)}>{formatMoney(row.closingValue)}</AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow>
            <AccountsTableCell className="font-semibold">Totals</AccountsTableCell>
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalOpeningQty, true)}</AccountsTableCell>
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell />
            <AccountsTableCell className="text-right font-semibold tabular-nums">{formatQty(totals.totalClosingQty, true)}</AccountsTableCell>
            <AccountsTableCell />
            <AccountsTableCell className={cn("text-right font-semibold tabular-nums", MONEY_AMOUNT_CLASS)}>
              {formatMoney(totals.totalClosingValue)}
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function BatchWiseTable({ rows }: { rows: StockRegisterBatchWiseRow[] }) {
  const router = useRouter();
  return (
    <AccountsTableScroll>
      <AccountsTable className="min-w-[1400px]">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Date" colKey="date" filterType="date" />
            <SortTh label="Voucher Type" colKey="voucherType" filterType="text" />
            <SortTh label="Voucher Number" colKey="voucherNumber" filterType="text" />
            <SortTh label="Product Name" colKey="productName" filterType="text" />
            <SortTh label="Batch Number" colKey="batchNo" filterType="text" />
            <SortTh label="Manufacturing Date" colKey="mfgDate" filterType="date" />
            <SortTh label="Expiry Date" colKey="expiryDate" filterType="date" />
            <SortTh label="Warehouse" colKey="warehouse" filterType="text" />
            <SortTh label="Party Name" colKey="partyName" filterType="text" />
            <SortTh label="Quantity In" colKey="quantityIn" align="right" filterType="amount" />
            <SortTh label="Quantity Out" colKey="quantityOut" align="right" filterType="amount" />
            <SortTh label="Running Balance Quantity" colKey="runningBalanceQty" align="right" filterType="amount" />
            <SortTh label="Rate" colKey="rate" align="right" filterType="amount" />
            <SortTh label="Value" colKey="value" align="right" filterType="amount" />
            <SortTh label="Remarks" colKey="remarks" filterType="text" />
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
              <AccountsTableCell className="font-mono text-xs">{row.batchNo}</AccountsTableCell>
              <AccountsTableCell>{row.mfgDate ? formatStockRegisterDate(row.mfgDate) : "—"}</AccountsTableCell>
              <AccountsTableCell>{row.expiryDate ? formatStockRegisterDate(row.expiryDate) : "—"}</AccountsTableCell>
              <AccountsTableCell>{row.warehouse}</AccountsTableCell>
              <AccountsTableCell>{row.partyName}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.quantityIn)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums">{formatQty(row.quantityOut)}</AccountsTableCell>
              <AccountsTableCell className="text-right tabular-nums font-medium">{formatQty(row.runningBalanceQty, true)}</AccountsTableCell>
              <AccountsTableCell className={cn("text-right tabular-nums", MONEY_AMOUNT_CLASS)}>{formatMoney(row.rate)}</AccountsTableCell>
              <AccountsTableCell className={cn("text-right tabular-nums", MONEY_AMOUNT_CLASS)}>{formatMoney(row.value)}</AccountsTableCell>
              <AccountsTableCell className="max-w-[180px] truncate">{row.remarks || "—"}</AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
