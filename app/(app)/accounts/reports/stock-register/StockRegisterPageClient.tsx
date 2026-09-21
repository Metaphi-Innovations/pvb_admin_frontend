"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Layers,
  Loader2,
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
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import { SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
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
  buildEntityFilterSummary,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  StockRegisterApiError,
  StockRegisterApiService,
} from "@/services/stock-register.service";
import type {
  StockRegisterBatchApiRow,
  StockRegisterBatchResult,
  StockRegisterDetailedApiRow,
  StockRegisterDetailedResult,
  StockRegisterExportView,
  StockRegisterFiltersConfig,
  StockRegisterQueryParams,
  StockRegisterSortOrder,
  StockRegisterStockType,
  StockRegisterSummaryApiRow,
  StockRegisterSummaryResult,
  StockRegisterTab,
} from "@/types/stock-register.types";

const TABS: { id: StockRegisterTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Detailed" },
  { id: "batch-wise", label: "Batch Wise" },
];

const SUMMARY_SORT_FIELD_MAP: Record<string, string> = {
  productName: "product_name",
  warehouse: "warehouse_name",
  openingQty: "opening_qty",
  inwardQty: "inward_qty",
  outwardQty: "outward_qty",
  closingQty: "closing_qty",
};

const DETAILED_SORT_FIELD_MAP: Record<string, string> = {
  date: "movement_date",
  voucherNumber: "document_no",
  productName: "product_name",
  warehouse: "warehouse_name",
  quantityIn: "quantity_in",
  quantityOut: "quantity_out",
};

const BATCH_SORT_FIELD_MAP: Record<string, string> = {
  productName: "product_name",
  batchNo: "batch_no",
  warehouse: "warehouse_name",
  openingQty: "opening_qty",
  inwardQty: "inward_qty",
  outwardQty: "outward_qty",
  closingQty: "closing_qty",
};

type TabReport =
  | { tab: "summary"; data: StockRegisterSummaryResult }
  | { tab: "detailed"; data: StockRegisterDetailedResult }
  | { tab: "batch-wise"; data: StockRegisterBatchResult };

function defaultSortForTab(tab: StockRegisterTab): string {
  return tab === "detailed" ? "movement_date" : "product_name";
}

function sortFieldMapForTab(tab: StockRegisterTab): Record<string, string> {
  if (tab === "detailed") return DETAILED_SORT_FIELD_MAP;
  if (tab === "batch-wise") return BATCH_SORT_FIELD_MAP;
  return SUMMARY_SORT_FIELD_MAP;
}

function sortKeyForHeader(
  tab: StockRegisterTab,
  backendSortBy: string,
): string {
  const map = sortFieldMapForTab(tab);
  const entry = Object.entries(map).find(([, value]) => value === backendSortBy);
  return entry?.[0] ?? backendSortBy;
}

function parseTab(value: string | null): StockRegisterTab {
  if (value === "detailed" || value === "batch-wise") return value;
  return "summary";
}

function tabToExportView(tab: StockRegisterTab): StockRegisterExportView {
  if (tab === "detailed") return "detailed";
  if (tab === "batch-wise") return "batch_wise";
  return "summary";
}

function num(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(value: number, allowNegative = false): string {
  if (!Number.isFinite(value)) return "0";
  void allowNegative;
  const abs = Math.abs(value);
  const formatted =
    abs % 1 === 0
      ? abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })
      : abs.toLocaleString("en-IN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        });
  return value < 0 ? `-${formatted}` : formatted;
}

function StockTypeBadge({ type }: { type: StockRegisterStockType }) {
  const isRejected = type === "rejected";
  return (
    <span
      className={
        isRejected
          ? "inline-flex items-center rounded-md border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
          : "inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
      }
    >
      {isRejected ? "Rejected" : "Sellable"}
    </span>
  );
}

type SummaryUiRow = {
  rowKey: string;
  stockType: StockRegisterStockType;
  productName: string;
  productCode: string;
  warehouse: string;
  uom: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
};

type DetailedUiRow = {
  id: string;
  stockType: StockRegisterStockType;
  date: string;
  voucherType: string;
  voucherNumber: string;
  productName: string;
  warehouse: string;
  partyName: string;
  batchNo: string;
  rejectReason: string;
  quantityIn: number;
  quantityOut: number;
  runningBalanceQty: number;
};

type BatchUiRow = {
  rowKey: string;
  stockType: StockRegisterStockType;
  productName: string;
  productCode: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  warehouse: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
};

function mapSummaryRow(row: StockRegisterSummaryApiRow): SummaryUiRow {
  return {
    rowKey: `${row.stock_type}:${row.id}`,
    stockType: row.stock_type,
    productName: row.product_name,
    productCode: row.product_code ?? "",
    warehouse: row.warehouse_name ?? "—",
    uom: row.uom ?? "",
    openingQty: num(row.opening_qty),
    inwardQty: num(row.inward_qty),
    outwardQty: num(row.outward_qty),
    closingQty: num(row.closing_qty),
  };
}

function mapDetailedRow(row: StockRegisterDetailedApiRow): DetailedUiRow {
  return {
    id: `${row.stock_type}:${row.id}`,
    stockType: row.stock_type,
    date: row.movement_date,
    voucherType: row.voucher_type,
    voucherNumber: row.voucher_number,
    productName: row.product_name,
    warehouse: row.warehouse_name ?? "—",
    partyName: row.party_name?.trim() || "—",
    batchNo: row.batch_no?.trim() || "—",
    rejectReason: row.reject_reason?.trim() || "—",
    quantityIn: num(row.quantity_in),
    quantityOut: num(row.quantity_out),
    runningBalanceQty: num(row.running_balance),
  };
}

function mapBatchRow(row: StockRegisterBatchApiRow): BatchUiRow {
  return {
    rowKey: `${row.stock_type}:${row.id}`,
    stockType: row.stock_type,
    productName: row.product_name,
    productCode: row.product_code ?? "",
    batchNo: row.batch_no,
    mfgDate: row.manufacture_date ?? "",
    expiryDate: row.expiry_date ?? "",
    warehouse: row.warehouse_name ?? "—",
    openingQty: num(row.opening_qty),
    inwardQty: num(row.inward_qty),
    outwardQty: num(row.outward_qty),
    closingQty: num(row.closing_qty),
  };
}

function ServerSortTh({
  label,
  colKey,
  activeKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  colKey: string;
  activeKey: string;
  sortDir: StockRegisterSortOrder;
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  return (
    <AccountsColumnHeader
      label={label}
      colKey={colKey}
      align={align}
      sortable
      filterable={false}
      sortKey={activeKey}
      sortDir={sortDir}
      onSort={onSort}
    />
  );
}

export default function StockRegisterPageClient() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const drilldownApplied = useRef(false);
  const appliedDefaults = useRef(false);

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");

  const [tab, setTab] = useState<StockRegisterTab>(() =>
    parseTab(searchParams.get("tab")),
  );
  const [filtersConfig, setFiltersConfig] =
    useState<StockRegisterFiltersConfig | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [financialYearId, setFinancialYearId] = useState("");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState("product_name");
  const [sortOrder, setSortOrder] = useState<StockRegisterSortOrder>("asc");
  const [exporting, setExporting] = useState(false);
  const [ready, setReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [report, setReport] = useState<TabReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setReady(true);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void StockRegisterApiService.getFilters(controller.signal)
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
            : "Failed to load Stock Register filters.",
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
    setSortBy(defaultSortForTab("summary"));
    setSortOrder(filtersConfig.defaults.sort_order || "asc");
    appliedDefaults.current = true;
  }, [filtersConfig, ready, setDateFrom, setDateTo, setPreset]);

  useEffect(() => {
    if (!mounted || !filtersConfig || drilldownApplied.current) return;
    const product = searchParams.get("product");
    const warehouse = searchParams.get("warehouse");
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    const fy = searchParams.get("fy");
    const tabParam = searchParams.get("tab");
    if (!product && !warehouse && !from && !to && !fy && !tabParam) return;

    drilldownApplied.current = true;
    setPreset("custom");
    if (tabParam) {
      const nextTab = parseTab(tabParam);
      setTab(nextTab);
      setSortBy(defaultSortForTab(nextTab));
      setSortOrder("asc");
    }
    if (product) setProductIds([product]);
    if (warehouse) setWarehouses([warehouse]);
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
    if (fy) setFinancialYearId(fy);
  }, [mounted, filtersConfig, searchParams, setDateFrom, setDateTo, setPreset]);

  const handleTabChange = useCallback(
    (id: string) => {
      const next = parseTab(id);
      setTab(next);
      setPage(1);
      setSortBy(defaultSortForTab(next));
      setSortOrder("asc");
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("tab", next);
      qs.delete("stock");
      router.replace(`/accounts/reports/stock-register?${qs.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

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

  const handleSort = useCallback(
    (colKey: string) => {
      const map = sortFieldMapForTab(tab);
      const backendField = map[colKey];
      if (!backendField) return;
      setSortBy((current) => {
        if (current === backendField) {
          setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
          return current;
        }
        setSortOrder("asc");
        return backendField;
      });
    },
    [tab],
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
        searchText: p.product_code ?? undefined,
      })),
    [filtersConfig],
  );

  const queryParams = useMemo<StockRegisterQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) {
      return null;
    }
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      warehouse_ids: warehouses,
      product_ids: productIds,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
      include_rejected: true,
    };
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    warehouses,
    productIds,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    tab,
    dateFrom,
    dateTo,
    financialYearId,
    warehouses,
    productIds,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (!queryParams) {
      setReport(null);
      return;
    }

    const controller = new AbortController();
    setReportLoading(true);
    setReportError(null);

    const run = async () => {
      if (tab === "summary") {
        const data = await StockRegisterApiService.getSummary(
          queryParams,
          controller.signal,
        );
        if (!controller.signal.aborted) setReport({ tab: "summary", data });
        return;
      }
      if (tab === "detailed") {
        const data = await StockRegisterApiService.getDetailed(
          queryParams,
          controller.signal,
        );
        if (!controller.signal.aborted) setReport({ tab: "detailed", data });
        return;
      }
      const data = await StockRegisterApiService.getBatchWise(
        queryParams,
        controller.signal,
      );
      if (!controller.signal.aborted) setReport({ tab: "batch-wise", data });
    };

    void run()
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setReportError(
          error instanceof StockRegisterApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to load Stock Register.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });

    return () => controller.abort();
  }, [queryParams, tab, retryKey]);

  const handleExport = useCallback(
    async (format: "excel" | "pdf") => {
      if (!queryParams || exporting) return;
      setExporting(true);
      try {
        await StockRegisterApiService.export({
          ...queryParams,
          format: format === "pdf" ? "PDF" : "EXCEL",
          view: tabToExportView(tab),
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

  const summaryReport =
    report?.tab === "summary" && tab === "summary" ? report.data : null;
  const detailedReport =
    report?.tab === "detailed" && tab === "detailed" ? report.data : null;
  const batchReport =
    report?.tab === "batch-wise" && tab === "batch-wise" ? report.data : null;

  const activeReport = summaryReport ?? detailedReport ?? batchReport;
  const totalRows = activeReport?.pagination.total_rows ?? 0;
  const activeSortCol = sortKeyForHeader(tab, sortBy);

  const summaryRows = useMemo(
    () => (summaryReport?.rows ?? []).map(mapSummaryRow),
    [summaryReport],
  );

  const detailedRows = useMemo(
    () => (detailedReport?.rows ?? []).map(mapDetailedRow),
    [detailedReport],
  );

  const batchRows = useMemo(
    () => (batchReport?.rows ?? []).map(mapBatchRow),
    [batchReport],
  );

  const kpiItems = useMemo(() => {
    if (detailedReport) {
      const s = detailedReport.summary;
      const r = detailedReport.rejected_summary;
      return [
        {
          label: "Sellable Movements",
          value: String(s.transaction_count),
          icon: Package,
        },
        {
          label: "Rejected Movements",
          value: String(r?.transaction_count ?? 0),
          icon: Package,
        },
        {
          label: "Sellable Net",
          value: formatQty(num(s.net_movement), true),
          icon: Boxes,
        },
        {
          label: "Rejected Net",
          value: formatQty(num(r?.net_movement), true),
          icon: Boxes,
        },
      ];
    }

    if (batchReport) {
      const s = batchReport.summary;
      const r = batchReport.rejected_summary;
      return [
        {
          label: "Sellable Batches",
          value: String(s.batch_count),
          icon: Layers,
        },
        {
          label: "Sellable Closing",
          value: formatQty(num(s.total_closing_qty), true),
          icon: Boxes,
        },
        {
          label: "Rejected Closing",
          value: formatQty(num(r?.total_closing_qty), true),
          icon: ArrowUpFromLine,
        },
        {
          label: "Rejected Products",
          value: String(r?.product_count ?? 0),
          icon: Package,
        },
      ];
    }

    if (summaryReport) {
      const s = summaryReport.summary;
      const r = summaryReport.rejected_summary;
      return [
        {
          label: "Sellable Closing Qty",
          value: formatQty(num(s.total_closing_qty), true),
          icon: Boxes,
        },
        {
          label: "Rejected Closing Qty",
          value: formatQty(num(r?.total_closing_qty), true),
          icon: Layers,
        },
        {
          label: "Sellable Inward",
          value: formatQty(num(s.total_inward_qty), true),
          icon: ArrowDownToLine,
        },
        {
          label: "Rejected In",
          value: formatQty(num(r?.total_rejected_in_qty), true),
          icon: ArrowDownToLine,
        },
        {
          label: "Sellable Outward",
          value: formatQty(num(s.total_outward_qty), true),
          icon: ArrowUpFromLine,
        },
        {
          label: "Rejected Out",
          value: formatQty(num(r?.total_rejected_out_qty), true),
          icon: ArrowUpFromLine,
        },
      ];
    }

    return [];
  }, [batchReport, detailedReport, summaryReport]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      buildEntityFilterSummary(
        "product",
        "Products",
        productIds,
        productOptions,
        () => setProductIds([]),
      ),
      buildEntityFilterSummary(
        "warehouse",
        "Warehouses",
        warehouses,
        warehouseOptions,
        () => setWarehouses([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [productIds, warehouses, productOptions, warehouseOptions]);

  const limitationNote = activeReport?.notes.limitation ?? null;

  const exportDisabled =
    exporting || reportLoading || !queryParams || totalRows === 0;

  const summaryTotals = summaryReport
    ? {
        totalOpeningQty:
          num(summaryReport.summary.total_opening_qty) +
          num(summaryReport.rejected_summary?.total_opening_qty),
        totalInwardQty:
          num(summaryReport.summary.total_inward_qty) +
          num(summaryReport.rejected_summary?.total_rejected_in_qty),
        totalOutwardQty:
          num(summaryReport.summary.total_outward_qty) +
          num(summaryReport.rejected_summary?.total_rejected_out_qty),
        totalClosingQty:
          num(summaryReport.summary.total_closing_qty) +
          num(summaryReport.rejected_summary?.total_closing_qty),
      }
    : null;

  const batchTotals = batchReport
    ? {
        totalOpeningQty:
          num(batchReport.summary.total_opening_qty) +
          num(batchReport.rejected_summary?.total_opening_qty),
        totalInwardQty:
          num(batchReport.summary.total_inward_qty) +
          num(batchReport.rejected_summary?.total_rejected_in_qty),
        totalOutwardQty:
          num(batchReport.summary.total_outward_qty) +
          num(batchReport.rejected_summary?.total_rejected_out_qty),
        totalClosingQty:
          num(batchReport.summary.total_closing_qty) +
          num(batchReport.rejected_summary?.total_closing_qty),
      }
    : null;

  const emptyLabel =
    tab === "detailed"
      ? "No stock movements match the selected filters."
      : tab === "batch-wise"
        ? "No batches match the selected filters."
        : "No products match the selected filters.";

  const recordLabel =
    tab === "detailed" ? "transactions" : "rows";

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "Stock Register")}
        title="Stock Register"
        description="Stock quantity movement for the selected period."
      >
        <div className="p-4 text-sm text-muted-foreground">
          Loading stock register…
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Register")}
      title="Stock Register"
      description="Sellable and Rejected stock in one register — each row is tagged by stock type."
      filters={
        <>
          <ReportFilterRow
            className="items-end"
            wrap
            end={
              <AccountsExportMenu
                onExcel={() => void handleExport("excel")}
                onPdf={() => void handleExport("pdf")}
                disabled={exportDisabled}
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

        {limitationNote ? (
          <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
            {limitationNote}
          </p>
        ) : null}

        {kpiItems.length > 0 ? (
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
        ) : null}

        {(filtersError || reportError) && (
          <div className="mt-3 flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span>{filtersError || reportError}</span>
            <button
              type="button"
              className="underline"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {!queryParams && !filtersError ? (
          <div className="mt-3 py-6 text-center text-xs text-muted-foreground">
            Select a financial year and date range to load the Stock Register.
          </div>
        ) : (
          <div className="mt-3 flex flex-col flex-1 min-h-0">
            <AccountsTableListing>
              {reportLoading && !activeReport ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading report…
                </div>
              ) : totalRows === 0 && !reportLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {emptyLabel}
                </div>
              ) : tab === "summary" && summaryTotals ? (
                <>
                  <SummaryTable
                    rows={summaryRows}
                    totals={summaryTotals}
                    activeSortCol={activeSortCol}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  {totalRows > 0 ? (
                    <AccountsTablePagination
                      page={page}
                      pageSize={pageSize}
                      totalRecords={totalRows}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                      }}
                      recordLabel={recordLabel}
                    />
                  ) : null}
                </>
              ) : tab === "detailed" ? (
                <>
                  <DetailedMovementTable
                    rows={detailedRows}
                    activeSortCol={activeSortCol}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  {totalRows > 0 ? (
                    <AccountsTablePagination
                      page={page}
                      pageSize={pageSize}
                      totalRecords={totalRows}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                      }}
                      recordLabel={recordLabel}
                    />
                  ) : null}
                </>
              ) : tab === "batch-wise" && batchTotals ? (
                <>
                  <BatchWiseSummaryTable
                    rows={batchRows}
                    totals={batchTotals}
                    activeSortCol={activeSortCol}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  {totalRows > 0 ? (
                    <AccountsTablePagination
                      page={page}
                      pageSize={pageSize}
                      totalRecords={totalRows}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                      }}
                      recordLabel={recordLabel}
                    />
                  ) : null}
                </>
              ) : null}
            </AccountsTableListing>
          </div>
        )}
      </AccountsReportBody>
    </AccountsPageShell>
  );
}

function SummaryTable({
  rows,
  totals,
  activeSortCol,
  sortOrder,
  onSort,
}: {
  rows: SummaryUiRow[];
  totals: {
    totalOpeningQty: number;
    totalInwardQty: number;
    totalOutwardQty: number;
    totalClosingQty: number;
  };
  activeSortCol: string;
  sortOrder: StockRegisterSortOrder;
  onSort: (key: string) => void;
}) {
  return (
    <AccountsTable>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsColumnHeader
            label="Stock Type"
            colKey="stockType"
            sortable={false}
            filterable={false}
          />
          <ServerSortTh
            label="Product Name"
            colKey="productName"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <ServerSortTh
            label="Warehouse"
            colKey="warehouse"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <AccountsColumnHeader
            label="UOM"
            colKey="uom"
            sortable={false}
            filterable={false}
          />
          <ServerSortTh
            label="Opening Qty"
            colKey="openingQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <ServerSortTh
            label="In Qty"
            colKey="inwardQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <ServerSortTh
            label="Out Qty"
            colKey="outwardQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <ServerSortTh
            label="Closing Qty"
            colKey="closingQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.map((row) => (
          <AccountsTableRow key={row.rowKey}>
            <AccountsTableCell>
              <StockTypeBadge type={row.stockType} />
            </AccountsTableCell>
            <AccountsTableCell className="font-medium">
              {row.productName}
            </AccountsTableCell>
            <AccountsTableCell>{row.warehouse}</AccountsTableCell>
            <AccountsTableCell>{row.uom || "—"}</AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.openingQty, true)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.inwardQty, true)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.outwardQty, true)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums font-medium">
              {formatQty(row.closingQty, true)}
            </AccountsTableCell>
          </AccountsTableRow>
        ))}
      </AccountsTableBody>
      <AccountsTableFoot>
        <AccountsTableRow>
          <AccountsTableCell className="font-semibold" colSpan={4}>
            Combined totals (do not treat as one stock bucket)
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalOpeningQty, true)}
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalInwardQty, true)}
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalOutwardQty, true)}
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalClosingQty, true)}
          </AccountsTableCell>
        </AccountsTableRow>
      </AccountsTableFoot>
    </AccountsTable>
  );
}

function DetailedMovementTable({
  rows,
  activeSortCol,
  sortOrder,
  onSort,
}: {
  rows: DetailedUiRow[];
  activeSortCol: string;
  sortOrder: StockRegisterSortOrder;
  onSort: (key: string) => void;
}) {
  return (
    <AccountsTable className="min-w-[1200px]">
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsColumnHeader
            label="Stock Type"
            colKey="stockType"
            sortable={false}
            filterable={false}
          />
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
            label="Voucher Number"
            colKey="voucherNumber"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <ServerSortTh
            label="Product Name"
            colKey="productName"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <ServerSortTh
            label="Warehouse"
            colKey="warehouse"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <AccountsColumnHeader
            label="Party Name"
            colKey="partyName"
            sortable={false}
            filterable={false}
          />
          <AccountsColumnHeader
            label="Batch Number"
            colKey="batchNo"
            sortable={false}
            filterable={false}
          />
          <AccountsColumnHeader
            label="Reject Reason"
            colKey="rejectReason"
            sortable={false}
            filterable={false}
          />
          <ServerSortTh
            label="Quantity In"
            colKey="quantityIn"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <ServerSortTh
            label="Quantity Out"
            colKey="quantityOut"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <AccountsColumnHeader
            label="Running Balance"
            colKey="runningBalanceQty"
            sortable={false}
            filterable={false}
            align="right"
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.map((row) => (
          <AccountsTableRow key={row.id}>
            <AccountsTableCell>
              <StockTypeBadge type={row.stockType} />
            </AccountsTableCell>
            <AccountsTableCell className="whitespace-nowrap">
              {formatDisplayDate(row.date)}
            </AccountsTableCell>
            <AccountsTableCell>{row.voucherType}</AccountsTableCell>
            <AccountsTableCell className="font-mono text-xs text-brand-700">
              {row.voucherNumber}
            </AccountsTableCell>
            <AccountsTableCell className="font-medium whitespace-nowrap">
              {row.productName}
            </AccountsTableCell>
            <AccountsTableCell>{row.warehouse}</AccountsTableCell>
            <AccountsTableCell>{row.partyName}</AccountsTableCell>
            <AccountsTableCell className="font-mono text-xs">
              {row.batchNo}
            </AccountsTableCell>
            <AccountsTableCell
              className="max-w-[160px] truncate"
              title={row.rejectReason}
            >
              {row.rejectReason}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.quantityIn)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.quantityOut)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums font-medium">
              {formatQty(row.runningBalanceQty, true)}
            </AccountsTableCell>
          </AccountsTableRow>
        ))}
      </AccountsTableBody>
    </AccountsTable>
  );
}

function BatchWiseSummaryTable({
  rows,
  totals,
  activeSortCol,
  sortOrder,
  onSort,
}: {
  rows: BatchUiRow[];
  totals: {
    totalOpeningQty: number;
    totalInwardQty: number;
    totalOutwardQty: number;
    totalClosingQty: number;
  };
  activeSortCol: string;
  sortOrder: StockRegisterSortOrder;
  onSort: (key: string) => void;
}) {
  return (
    <AccountsTable className="min-w-[1100px]">
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsColumnHeader
            label="Stock Type"
            colKey="stockType"
            sortable={false}
            filterable={false}
          />
          <ServerSortTh
            label="Product Name"
            colKey="productName"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <ServerSortTh
            label="Batch Number"
            colKey="batchNo"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <AccountsColumnHeader
            label="Mfg Date"
            colKey="mfgDate"
            sortable={false}
            filterable={false}
          />
          <AccountsColumnHeader
            label="Expiry Date"
            colKey="expiryDate"
            sortable={false}
            filterable={false}
          />
          <ServerSortTh
            label="Warehouse"
            colKey="warehouse"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
          />
          <ServerSortTh
            label="Opening Qty"
            colKey="openingQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <ServerSortTh
            label="In Qty"
            colKey="inwardQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <ServerSortTh
            label="Out Qty"
            colKey="outwardQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
          <ServerSortTh
            label="Closing Qty"
            colKey="closingQty"
            activeKey={activeSortCol}
            sortDir={sortOrder}
            onSort={onSort}
            align="right"
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {rows.map((row) => (
          <AccountsTableRow key={row.rowKey}>
            <AccountsTableCell>
              <StockTypeBadge type={row.stockType} />
            </AccountsTableCell>
            <AccountsTableCell className="font-medium whitespace-nowrap">
              {row.productName}
            </AccountsTableCell>
            <AccountsTableCell className="font-mono text-xs">
              {row.batchNo}
            </AccountsTableCell>
            <AccountsTableCell>
              {row.mfgDate ? formatDisplayDate(row.mfgDate) : "—"}
            </AccountsTableCell>
            <AccountsTableCell>
              {row.expiryDate ? formatDisplayDate(row.expiryDate) : "—"}
            </AccountsTableCell>
            <AccountsTableCell>{row.warehouse}</AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.openingQty, true)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.inwardQty, true)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums">
              {formatQty(row.outwardQty, true)}
            </AccountsTableCell>
            <AccountsTableCell className="text-right tabular-nums font-medium">
              {formatQty(row.closingQty, true)}
            </AccountsTableCell>
          </AccountsTableRow>
        ))}
      </AccountsTableBody>
      <AccountsTableFoot>
        <AccountsTableRow>
          <AccountsTableCell className="font-semibold" colSpan={6}>
            Combined totals (do not treat as one stock bucket)
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalOpeningQty, true)}
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalInwardQty, true)}
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalOutwardQty, true)}
          </AccountsTableCell>
          <AccountsTableCell className="text-right font-semibold tabular-nums">
            {formatQty(totals.totalClosingQty, true)}
          </AccountsTableCell>
        </AccountsTableRow>
      </AccountsTableFoot>
    </AccountsTable>
  );
}
