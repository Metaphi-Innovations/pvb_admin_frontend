"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ListTree } from "lucide-react";
import { masterToday } from "@/lib/masters/common";
import {
  DEFAULT_STOCK_POSITION_FILTERS,
  type StockPositionFilters,
} from "../types/stock-position";
import { StockPositionFiltersBar } from "./StockPositionFiltersBar";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  BatchMovementListRow,
  BatchMovementSummary,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";

const EMPTY_SUMMARY: BatchMovementSummary = {
  totalMovements: 0,
  inwardQty: 0,
  outwardQty: 0,
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toApiPeriod(filters: StockPositionFilters): {
  period: string;
  from_date?: string;
  to_date?: string;
} {
  if (filters.datePreset === "today") {
    return { period: "Today's Position" };
  }
  if (filters.datePreset === "current_fy") {
    return { period: "Current Financial Year" };
  }
  if (filters.datePreset === "previous_fy") {
    return { period: "Previous Financial Year" };
  }
  if (filters.datePreset.startsWith("month-")) {
    const ym = filters.datePreset.replace("month-", "");
    const [y, m] = ym.split("-").map(Number);
    return { period: `${MONTH_NAMES[(m || 1) - 1]} ${y}` };
  }
  return {
    period: "Custom Date",
    from_date: filters.fromDate || undefined,
    to_date: filters.toDate || undefined,
  };
}

function dateLabelFor(filters: StockPositionFilters): string {
  if (filters.datePreset === "custom" || filters.dateMode === "range") {
    return `${filters.fromDate || "—"} → ${filters.toDate || "—"}`;
  }
  return filters.asOnDate || filters.toDate || "";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return raw;
}

function formatQty(value: number): string {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 3,
  });
}

function isActiveColFilter(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return false;
  return true;
}

/** Unique dropdown options from the rows currently shown in the listing. */
function optionsFromRecords(
  rows: BatchMovementListRow[],
  key: keyof BatchMovementListRow,
): Array<{ label: string; value: string }> {
  const values = [
    ...new Set(
      rows
        .map((r) => String(r[key] ?? "").trim())
        .filter((v) => v && v !== "—"),
    ),
  ].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
  );
  return values.map((value) => ({ label: value, value }));
}

/**
 * Cascading filter options:
 * - Active column → keep server facet list (exclude-self) so the user can change it
 * - Other columns, when another filter is applied and the full filtered set is loaded
 *   → only values that appear in the listing (what the user sees)
 * - Otherwise → server filter_options
 */
function resolveFilterOptions(
  columnKey: string,
  serverOptions: Array<{ label: string; value: string }>,
  records: BatchMovementListRow[],
  totalRecords: number,
  appliedFilters: FilterState,
): Array<{ label: string; value: string }> {
  const activeKeys = Object.keys(appliedFilters).filter(
    (k) => k !== "search" && isActiveColFilter(appliedFilters[k]),
  );
  const selfFiltered = activeKeys.includes(columnKey);
  const otherFiltersActive = activeKeys.some((k) => k !== columnKey);
  const fullFilteredSetLoaded =
    records.length > 0 && records.length === totalRecords;

  if (!selfFiltered && otherFiltersActive && fullFilteredSetLoaded) {
    return optionsFromRecords(
      records,
      columnKey as keyof BatchMovementListRow,
    );
  }
  return serverOptions;
}

export function BatchMovementsTab() {
  const [today, setToday] = useState("");
  const [draftFilters, setDraftFilters] = useState<StockPositionFilters>(
    DEFAULT_STOCK_POSITION_FILTERS,
  );
  const [appliedTopFilters, setAppliedTopFilters] = useState<StockPositionFilters>(
    DEFAULT_STOCK_POSITION_FILTERS,
  );
  const {
    draftFilters: draftColFilters,
    setDraftFilters: setDraftColFilters,
    appliedFilters: appliedColFilters,
    applyFilters: applyColFilters,
    resetFilters: resetColFilters,
  } = useAppliedListFilters();

  const [records, setRecords] = useState<BatchMovementListRow[]>([]);
  const [summary, setSummary] = useState<BatchMovementSummary>(EMPTY_SUMMARY);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState>({ key: "movement_at", direction: "desc" });
  const [listNonce, setListNonce] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<
    Record<string, Array<{ label: string; value: string }>>
  >({});

  useEffect(() => {
    const t = masterToday();
    setToday(t);
    const initial = {
      ...DEFAULT_STOCK_POSITION_FILTERS,
      datePreset: "today",
      asOnDate: t,
      fromDate: t,
      toDate: t,
    };
    setDraftFilters(initial);
    setAppliedTopFilters(initial);
  }, []);

  useEffect(() => {
    if (!today) return;
    if (
      appliedTopFilters.datePreset === "custom" &&
      (!appliedTopFilters.fromDate || !appliedTopFilters.toDate)
    ) {
      return;
    }

    const controller = new AbortController();
    const periodParams = toApiPeriod(appliedTopFilters);
    setLoading(true);
    setError(null);

    StockOverviewApi.listBatchMovements({
      page,
      page_size: pageSize,
      search: String(appliedColFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction) || "-movement_at",
      warehouse_id: "all",
      product_id: "all",
      period: periodParams.period,
      from_date: periodParams.from_date,
      to_date: periodParams.to_date,
      filters: appliedColFilters,
      signal: controller.signal,
    })
      .then((result) => {
        setRecords(result.items);
        setTotalRecords(result.total);
        setSummary(result.summary);
        // Only values present in period data — no static / inventory extras
        setFilterOptions(result.filter_options || {});
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(
          StockOverviewApi.getErrorMessage(err, "Failed to load batch movements."),
        );
        setRecords([]);
        setTotalRecords(0);
        setSummary(EMPTY_SUMMARY);
        setFilterOptions({});
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [
    appliedTopFilters,
    appliedColFilters,
    page,
    pageSize,
    sort.key,
    sort.direction,
    today,
    listNonce,
  ]);

  const handleApplyTopFilters = useCallback(() => {
    setAppliedTopFilters(draftFilters);
    setPage(1);
  }, [draftFilters]);

  const handleResetTopFilters = useCallback(() => {
    const t = today || masterToday();
    const next = {
      ...DEFAULT_STOCK_POSITION_FILTERS,
      datePreset: "today",
      asOnDate: t,
      fromDate: t,
      toDate: t,
    };
    setDraftFilters(next);
    setAppliedTopFilters(next);
    resetColFilters();
    setSort({ key: "movement_at", direction: "desc" });
    setPage(1);
    setListNonce((n) => n + 1);
  }, [today, resetColFilters]);

  const handleColFilterChange = useCallback(
    (next: FilterState) => {
      const cleared = Object.keys(next).length === 0;
      if (cleared) {
        resetColFilters();
        setSort({ key: "movement_at", direction: "desc" });
        setPage(1);
        setListNonce((n) => n + 1);
        return;
      }
      setDraftColFilters(next);
      applyColFilters(next);
      setPage(1);
    },
    [applyColFilters, resetColFilters, setDraftColFilters],
  );

  const handleExport = useCallback(() => {
    if (exporting) return;
    const periodParams = toApiPeriod(appliedTopFilters);
    setExporting(true);
    setError(null);
    StockOverviewApi.exportBatchMovements({
      search: String(appliedColFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction) || "-movement_at",
      warehouse_id: "all",
      product_id: "all",
      period: periodParams.period,
      from_date: periodParams.from_date,
      to_date: periodParams.to_date,
      filters: appliedColFilters,
    })
      .catch((err) => {
        setError(
          StockOverviewApi.getErrorMessage(err, "Failed to export batch movements."),
        );
      })
      .finally(() => setExporting(false));
  }, [appliedTopFilters, appliedColFilters, exporting, sort.key, sort.direction]);

  const dateLabel = useMemo(() => dateLabelFor(appliedTopFilters), [appliedTopFilters]);

  const columns: ColumnConfig<BatchMovementListRow>[] = useMemo(() => {
    const opts = (key: string) =>
      resolveFilterOptions(
        key,
        filterOptions[key] || [],
        records,
        totalRecords,
        appliedColFilters,
      );

    return [
      {
        key: "movement_at",
        header: "Date",
        sortable: true,
        width: "160px",
        render: (v) => (
          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
            {formatDateTime(v as string)}
          </span>
        ),
      },
      {
        key: "direction",
        header: "Direction",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("direction"),
        width: "100px",
        render: (v) => {
          const dir = String(v || "").toUpperCase();
          const isIn = dir === "IN";
          return (
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                isIn
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {isIn ? (
                <ArrowDownLeft className="w-3 h-3" />
              ) : (
                <ArrowUpRight className="w-3 h-3" />
              )}
              {dir || "—"}
            </span>
          );
        },
      },
      {
        key: "movement_type",
        header: "Movement Type",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("movement_type"),
        width: "180px",
      },
      {
        key: "order_type",
        header: "Order Type",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("order_type"),
        width: "140px",
      },
      {
        key: "document_no",
        header: "Document No",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("document_no"),
        width: "140px",
        render: (v) => (
          <span className="font-mono text-xs font-semibold text-brand-700">
            {String(v || "—")}
          </span>
        ),
      },
      {
        key: "order_no",
        header: "Order / ST No",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("order_no"),
        width: "140px",
        render: (v) => (
          <span className="font-mono text-xs">{String(v || "—")}</span>
        ),
      },
      {
        key: "party_name",
        header: "Party / Customer",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("party_name"),
        width: "220px",
        wrap: true,
      },
      {
        key: "product_code",
        header: "Product Code",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("product_code"),
        width: "120px",
        render: (v) => (
          <span className="font-mono text-xs font-semibold text-brand-700">
            {String(v || "—")}
          </span>
        ),
      },
      {
        key: "product_name",
        header: "Product Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("product_name"),
      },
      {
        key: "sku",
        header: "SKU",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("sku"),
        width: "110px",
        render: (v) => (
          <span className="font-mono text-xs text-muted-foreground">{String(v || "—")}</span>
        ),
      },
      {
        key: "batch_no",
        header: "Batch No",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("batch_no"),
        width: "120px",
        render: (v) => (
          <span className="font-mono text-xs font-semibold text-brand-700">
            {String(v || "—")}
          </span>
        ),
      },
      {
        key: "warehouse_name",
        header: "Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterMultiple: true,
        filterOptions: opts("warehouse_name"),
        filterPopoverClassName: "w-[420px]",
        filterWrapOptions: true,
        width: "280px",
        truncate: false,
      },
      {
        key: "case_count",
        header: "Cases",
        sortable: true,
        align: "right",
        width: "80px",
        render: (v) => (
          <span className="tabular-nums text-xs">{Number(v) || 1}</span>
        ),
      },
      {
        key: "qty",
        header: "Qty",
        sortable: true,
        align: "right",
        width: "100px",
        render: (v) => (
          <span className="tabular-nums text-xs font-medium">{formatQty(Number(v))}</span>
        ),
      },
    ];
  }, [filterOptions, records, totalRecords, appliedColFilters]);

  return (
    <div className="flex flex-col gap-2.5 min-h-[calc(100vh-220px)]">
      <StockPositionFiltersBar
        filters={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={handleApplyTopFilters}
        onReset={handleResetTopFilters}
        onExport={handleExport}
        exportDisabled={loading || exporting || totalRecords === 0}
        dateLabel={dateLabel}
        today={today}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MiniKPICard
          label="Movements"
          value={summary.totalMovements.toLocaleString("en-IN")}
          icon={ListTree}
          accent
        />
        <MiniKPICard
          label="Inward Qty"
          value={formatQty(summary.inwardQty)}
          icon={ArrowDownLeft}
        />
        <MiniKPICard
          label="Outward Qty"
          value={formatQty(summary.outwardQty)}
          icon={ArrowUpRight}
        />
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <MasterListing<BatchMovementListRow>
        columns={columns}
        data={records}
        loading={loading}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSortChange={setSort}
        onFilterChange={handleColFilterChange}
        emptyMessage="No batch movements for the selected period."
        searchPlaceholder="Search product, batch, or document..."
        currentFilters={draftColFilters}
        currentSort={sort}
      />
    </div>
  );
}
