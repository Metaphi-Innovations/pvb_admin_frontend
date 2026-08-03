"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { masterToday } from "@/lib/masters/common";
import { DEFAULT_STOCK_POSITION_FILTERS, type StockPositionFilters, type StockPositionLine, type StockLineStatus } from "../types/stock-position";
import { StockPositionFiltersBar } from "./StockPositionFiltersBar";
import { StockPositionKpiRow } from "./StockPositionKpiRow";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { ProductDropdownService } from "@/services/product-dropdown.service";
import { HsnListService } from "@/services/hsn-list.service";
import {
  DailyLogListRow,
  DailyLogSummary,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";
import { QC_PASSED_STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";
import { formatMoney } from "@/lib/accounts/money-format";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function displayHsn(
  value: string | null | undefined,
  hsnOptions?: Array<{ label: string; value: string }>,
): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return "—";
  if (UUID_RE.test(raw)) {
    const match = hsnOptions?.find((o) => o.value === raw);
    return match?.label || "—";
  }
  return raw;
}

const EMPTY_KPIS: DailyLogSummary = {
  openingStockQty: 0,
  dayInQty: 0,
  dayOutQty: 0,
  closingStockQty: 0,
  closingStockValue: 0,
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

function mapDailyLogRow(row: DailyLogListRow): StockPositionLine {
  const dayIn = row.day_in === "-" || row.day_in == null ? 0 : Number(row.day_in);
  const dayOut = row.day_out === "-" || row.day_out == null ? 0 : Number(row.day_out);
  return {
    id: row.id,
    productCode: row.product_code,
    productName: row.product_name,
    hsn: String(row.hsn ?? "").trim() || "—",
    scientificName: row.scientific_name,
    category: row.category,
    packSize: row.pack_size,
    batchNumber: row.batch_no,
    expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : "—",
    warehouse: row.warehouse_name,
    cp: Number(row.cp) || 0,
    status: (row.status || "Available") as StockLineStatus,
    openingQty: Number(row.opening_qty) || 0,
    dayIn: Number.isFinite(dayIn) ? dayIn : 0,
    dayOut: Number.isFinite(dayOut) ? dayOut : 0,
    closingQty: Number(row.closing_qty) || 0,
    availableQty: Number(row.available_qty) || 0,
    stockValuation: Number(row.valuation) || 0,
  };
}

function dateLabelFor(filters: StockPositionFilters): string {
  if (filters.datePreset === "custom" || filters.dateMode === "range") {
    return `${filters.fromDate || "—"} → ${filters.toDate || "—"}`;
  }
  return filters.asOnDate || filters.toDate || "";
}

export function DailyLogsTab() {
  const [today, setToday] = useState("");
  const [draftFilters, setDraftFilters] = useState<StockPositionFilters>(DEFAULT_STOCK_POSITION_FILTERS);
  const [appliedTopFilters, setAppliedTopFilters] = useState<StockPositionFilters>(DEFAULT_STOCK_POSITION_FILTERS);
  const {
    draftFilters: draftColFilters,
    setDraftFilters: setDraftColFilters,
    appliedFilters: appliedColFilters,
    applyFilters: applyColFilters,
    resetFilters: resetColFilters,
  } = useAppliedListFilters();

  const [warehouses, setWarehouses] = useState<Array<{ value: string; label: string }>>([]);
  const [products, setProducts] = useState<Array<{ value: string; label: string }>>([]);
  const [productMetaOptions, setProductMetaOptions] = useState<{
    productCode: Array<{ label: string; value: string }>;
    productName: Array<{ label: string; value: string }>;
    hsn: Array<{ label: string; value: string }>;
    scientificName: Array<{ label: string; value: string }>;
    category: Array<{ label: string; value: string }>;
  }>({
    productCode: [],
    productName: [],
    hsn: [],
    scientificName: [],
    category: [],
  });
  const [filterOptions, setFilterOptions] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<StockPositionLine[]>([]);
  const [kpis, setKpis] = useState<DailyLogSummary>(EMPTY_KPIS);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [listNonce, setListNonce] = useState(0);

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
    let mounted = true;
    Promise.all([
      StockOverviewApi.warehouseDropdown(),
      ProductDropdownService.dropdown(),
      HsnListService.dropdown(),
    ])
      .then(([wh, prod, hsnList]) => {
        if (!mounted) return;
        setWarehouses(wh);
        setProducts(
          prod.map((p) => ({
            value: p.product_id,
            label: `${p.product_name}${p.product_code ? ` (${p.product_code})` : ""}`,
          })),
        );

        const uniq = (values: Array<string | null | undefined>) =>
          [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b))
            .map((value) => ({ label: value, value }));

        const hsnFromMaster = hsnList
          .filter((h) => h.id && h.hsnDescription?.trim())
          .map((h) => ({
            label: h.hsnDescription.trim(),
            value: h.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        const hsnFromProducts = (() => {
          const seen = new Set<string>();
          const options: Array<{ label: string; value: string }> = [];
          for (const p of prod) {
            const id = p.hsn?.id?.trim();
            const name = p.hsn?.hsnDescription?.trim();
            if (!id || !name || seen.has(id)) continue;
            seen.add(id);
            options.push({ label: name, value: id });
          }
          return options.sort((a, b) => a.label.localeCompare(b.label));
        })();

        setProductMetaOptions({
          productCode: uniq(prod.map((p) => p.product_code)),
          productName: uniq(prod.map((p) => p.product_name)),
          hsn: hsnFromMaster.length > 0 ? hsnFromMaster : hsnFromProducts,
          scientificName: uniq(prod.map((p) => p.scientific_name)),
          category: uniq(prod.map((p) => p.category?.categoryName)),
        });
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!today) return;
    if (appliedTopFilters.datePreset === "custom" && (!appliedTopFilters.fromDate || !appliedTopFilters.toDate)) {
      return;
    }

    const controller = new AbortController();
    const periodParams = toApiPeriod(appliedTopFilters);
    setLoading(true);
    setError(null);

    StockOverviewApi.listDailyLog({
      page,
      page_size: pageSize,
      search: String(appliedColFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction),
      warehouse_id: appliedTopFilters.warehouse === "All" ? "all" : appliedTopFilters.warehouse,
      product_id: appliedTopFilters.product || "all",
      period: periodParams.period,
      from_date: periodParams.from_date,
      to_date: periodParams.to_date,
      filters: appliedColFilters,
      signal: controller.signal,
    })
      .then((result) => {
        setRecords(result.items.map(mapDailyLogRow));
        setTotalRecords(result.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(StockOverviewApi.getErrorMessage(err, "Failed to load daily log."));
        setRecords([]);
        setTotalRecords(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [appliedTopFilters, appliedColFilters, page, pageSize, sort.key, sort.direction, today, listNonce]);

  useEffect(() => {
    if (!today) return;
    if (appliedTopFilters.datePreset === "custom" && (!appliedTopFilters.fromDate || !appliedTopFilters.toDate)) {
      return;
    }

    const controller = new AbortController();
    const periodParams = toApiPeriod(appliedTopFilters);

    StockOverviewApi.dailyLogSummary({
      search: String(appliedColFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction),
      warehouse_id: appliedTopFilters.warehouse === "All" ? "all" : appliedTopFilters.warehouse,
      product_id: appliedTopFilters.product || "all",
      period: periodParams.period,
      from_date: periodParams.from_date,
      to_date: periodParams.to_date,
      filters: appliedColFilters,
      signal: controller.signal,
    })
      .then((summary) => {
        setKpis(summary);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setKpis(EMPTY_KPIS);
        setError((prev) => prev || StockOverviewApi.getErrorMessage(err, "Failed to load daily log summary."));
      });

    return () => controller.abort();
  }, [appliedTopFilters, appliedColFilters, sort.key, sort.direction, today, listNonce]);

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
    setSort({ key: "", direction: "none" });
    setPage(1);
    setListNonce((n) => n + 1);
  }, [today, resetColFilters]);

  const handleColFilterChange = useCallback(
    (next: FilterState) => {
      const cleared = Object.keys(next).length === 0;
      if (cleared) {
        resetColFilters();
        setSort({ key: "", direction: "none" });
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

  const handleOpenFilter = (columnKey: string) => {
    if (filterOptions[columnKey] || loadingFilters.has(columnKey)) return;

    if (columnKey === "productCode") {
      setFilterOptions((prev) => ({ ...prev, productCode: productMetaOptions.productCode }));
      return;
    }
    if (columnKey === "productName") {
      setFilterOptions((prev) => ({ ...prev, productName: productMetaOptions.productName }));
      return;
    }
    if (columnKey === "hsn") {
      if (productMetaOptions.hsn.length > 0) {
        setFilterOptions((prev) => ({ ...prev, hsn: productMetaOptions.hsn }));
        return;
      }
      setLoadingFilters((prev) => new Set(prev).add(columnKey));
      HsnListService.dropdown()
        .then((hsnList) => {
          const options = hsnList
            .filter((h) => h.id && h.hsnDescription?.trim())
            .map((h) => ({
              label: h.hsnDescription.trim(),
              value: h.id,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
          setFilterOptions((prev) => ({ ...prev, hsn: options }));
          setProductMetaOptions((prev) => ({ ...prev, hsn: options }));
        })
        .finally(() => {
          setLoadingFilters((prev) => {
            const next = new Set(prev);
            next.delete(columnKey);
            return next;
          });
        });
      return;
    }
    if (columnKey === "scientificName") {
      setFilterOptions((prev) => ({ ...prev, scientificName: productMetaOptions.scientificName }));
      return;
    }
    if (columnKey === "category") {
      setFilterOptions((prev) => ({ ...prev, category: productMetaOptions.category }));
      return;
    }

    const keyMap: Record<string, string> = {
      warehouse: "inventory_detail__warehouse__warehouse_name",
      batchNumber: "batch_no",
    };
    const field = keyMap[columnKey];
    if (!field) return;

    setLoadingFilters((prev) => new Set(prev).add(columnKey));
    StockOverviewApi.filterDropdown("inventory", field)
      .then((options) => setFilterOptions((prev) => ({ ...prev, [columnKey]: options })))
      .finally(() => {
        setLoadingFilters((prev) => {
          const next = new Set(prev);
          next.delete(columnKey);
          return next;
        });
      });
  };

  const handleExport = useCallback(() => {
    const periodParams = toApiPeriod(appliedTopFilters);
    StockOverviewApi.exportDailyLog({
      search: String(appliedColFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction),
      warehouse_id: appliedTopFilters.warehouse === "All" ? "all" : appliedTopFilters.warehouse,
      product_id: appliedTopFilters.product || "all",
      period: periodParams.period,
      from_date: periodParams.from_date,
      to_date: periodParams.to_date,
      filters: appliedColFilters,
    }).catch((err) => {
      setError(StockOverviewApi.getErrorMessage(err, "Failed to export daily log."));
    });
  }, [appliedTopFilters, appliedColFilters, sort.key, sort.direction]);

  const dateLabel = useMemo(() => dateLabelFor(appliedTopFilters), [appliedTopFilters]);

  const columns: ColumnConfig<StockPositionLine>[] = [
    {
      key: "productCode",
      header: "Product Code",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.productCode || productMetaOptions.productCode,
      width: "120px",
      render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{v}</span>,
    },
    {
      key: "productName",
      header: "Product Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.productName || productMetaOptions.productName,
    },
    {
      key: "hsn",
      header: "HSN",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.hsn || productMetaOptions.hsn,
      width: "160px",
      render: (v) => {
        const name = displayHsn(String(v ?? ""), productMetaOptions.hsn);
        return (
          <span className="text-xs text-muted-foreground truncate max-w-[150px] block" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: "scientificName",
      header: "Scientific Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.scientificName || productMetaOptions.scientificName,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.category || productMetaOptions.category,
    },
    { key: "packSize", header: "Pack Size", sortable: true, width: "90px" },
    { key: "openingQty", header: "Opening Qty", sortable: true, align: "right", width: "100px",
      render: (v) => <span className="tabular-nums text-xs">{Number(v).toLocaleString("en-IN")}</span> },
    { key: "dayIn", header: "Day In", sortable: true, align: "right", width: "90px",
      render: (v) => <span className="tabular-nums text-xs text-emerald-700 font-medium">{Number(v) > 0 ? Number(v).toLocaleString("en-IN") : "—"}</span> },
    { key: "dayOut", header: "Day Out", sortable: true, align: "right", width: "90px",
      render: (v) => <span className="tabular-nums text-xs text-red-700 font-medium">{Number(v) > 0 ? Number(v).toLocaleString("en-IN") : "—"}</span> },
    { key: "closingQty", header: "Closing Qty", sortable: true, align: "right", width: "100px",
      render: (v) => <span className="tabular-nums text-xs font-semibold">{Number(v).toLocaleString("en-IN")}</span> },
    { key: "availableQty", header: "Available", sortable: true, align: "right", width: "90px",
      render: (v) => <span className="tabular-nums text-xs">{Number(v).toLocaleString("en-IN")}</span> },
    {
      key: "batchNumber",
      header: "Batch No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.batchNumber || [],
      width: "120px",
      render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{v}</span>,
    },
    { key: "expiryDate", header: "Expiry", sortable: true, width: "100px" },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.warehouse || [],
    },
    { key: "cp", header: "CP", sortable: true, align: "right", width: "80px",
      render: (v) => <span className="tabular-nums text-xs">{Number(v).toLocaleString("en-IN")}</span> },
    { key: "stockValuation", header: "Valuation", sortable: true, align: "right", width: "110px",
      render: (v) => <span className="tabular-nums text-xs font-medium">{formatMoney(Number(v))}</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: QC_PASSED_STATUS_OPTIONS,
      width: "130px",
      render: (val: string) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 min-h-[calc(100vh-220px)]">
      <StockPositionFiltersBar
        filters={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        warehouses={warehouses}
        products={products}
        onApply={handleApplyTopFilters}
        onReset={handleResetTopFilters}
        onExport={handleExport}
        exportDisabled={loading || totalRecords === 0}
        dateLabel={dateLabel}
        today={today}
      />

      <StockPositionKpiRow kpis={kpis} dateMode={appliedTopFilters.dateMode} />

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <MasterListing<StockPositionLine>
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
        emptyMessage=""
        searchPlaceholder="Search product or batch..."
        currentFilters={draftColFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />
    </div>
  );
}
