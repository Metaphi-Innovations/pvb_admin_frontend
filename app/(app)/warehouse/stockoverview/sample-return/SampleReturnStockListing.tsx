"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ActionItemConfig, ColumnConfig } from "@/components/listing/types";
import { StackedQtyDisplay, type QtyStackMeta } from "@/app/(app)/sales/shared/StackedQtyDisplay";
import { SAMPLE_RETURN_STOCK_STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";
import { MoveToRejectedDialog, type MoveToRejectedTarget } from "../components/MoveToRejectedDialog";
import { useStockOverviewListFilters } from "../hooks/use-stock-overview-list-filters";
import {
  ReturnStockListRow,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";

interface SampleReturnStockListingProps {
  warehouseId?: string;
  onFiltersApplied?: () => void;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function moneyCell(val: unknown) {
  const text = String(val ?? "");
  const missing = text.toLowerCase().includes("missing");
  return (
    <span className={`text-xs tabular-nums ${missing ? "text-amber-700 text-[10px]" : "text-foreground"}`}>
      {text || "—"}
    </span>
  );
}

function toReturnQtyMeta(row: ReturnStockListRow): QtyStackMeta {
  const unitsPerPacking = Number(row.unit_per_packing) || 1;
  const qtyType = String(row.quantity_type || "").trim().toLowerCase();
  const quantityType =
    qtyType === "piece" || qtyType === "pieces" || qtyType === "pcs" || qtyType === "unit"
      ? "Piece"
      : unitsPerPacking > 1
        ? "Case"
        : "Piece";

  return {
    unitsPerPacking: unitsPerPacking > 0 ? unitsPerPacking : 1,
    quantityType,
    uom: row.unit || row.uom || null,
    unitPackSize: row.pack_size != null && Number(row.pack_size) > 0 ? Number(row.pack_size) : null,
    netWeight: row.net_weight != null && Number(row.net_weight) > 0 ? Number(row.net_weight) : null,
  };
}

export function SampleReturnStockListing({ warehouseId, onFiltersApplied }: SampleReturnStockListingProps) {
  const {
    draftFilters,
    appliedFilters,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    handlePageSizeChange,
    handleFilterChange,
    listNonce,
    bumpListNonce,
  } = useStockOverviewListFilters();
  const [records, setRecords] = useState<ReturnStockListRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState<MoveToRejectedTarget | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, setPage]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    StockOverviewApi.listSampleReturn({
      page,
      page_size: pageSize,
      search: String(appliedFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction),
      warehouse_id: warehouseId,
      filters: appliedFilters,
      signal: controller.signal,
    })
      .then((result) => {
        setRecords(result.items);
        setTotalRecords(result.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(StockOverviewApi.getErrorMessage(err, "Failed to load sample return stock."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, pageSize, sort.key, sort.direction, appliedFilters, warehouseId, listNonce]);

  const onFilterChange = (next: typeof draftFilters) => {
    handleFilterChange(next);
    onFiltersApplied?.();
  };

  const handleExport = useCallback(() => {
    if (exporting) return;
    setExporting(true);
    setError(null);
    StockOverviewApi.exportSampleReturn({
      search: String(appliedFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction),
      warehouse_id: warehouseId,
      filters: appliedFilters,
    })
      .catch((err) => {
        setError(StockOverviewApi.getErrorMessage(err, "Failed to export sample return stock."));
      })
      .finally(() => setExporting(false));
  }, [appliedFilters, exporting, sort.direction, sort.key, warehouseId]);

  const handleOpenFilter = (columnKey: string) => {
    if (filterOptions[columnKey] || loadingFilters.has(columnKey)) return;

    const keyMap: Record<string, string> = {
      product_name: "inventory_detail__product__product_name",
      sku: "inventory_detail__product__sku",
      uom: "inventory_detail__product__unit",
      warehouse_name: "inventory_detail__warehouse__warehouse_name",
      customer_name: "customer_name",
      batch_no: "batch_no",
      return_no: "return_no",
    };
    const field = keyMap[columnKey];
    if (!field) return;

    setLoadingFilters((prev) => new Set(prev).add(columnKey));
    StockOverviewApi.filterDropdown("sample_return", field)
      .then((options) => setFilterOptions((prev) => ({ ...prev, [columnKey]: options })))
      .finally(() => {
        setLoadingFilters((prev) => {
          const next = new Set(prev);
          next.delete(columnKey);
          return next;
        });
      });
  };

  const columns: ColumnConfig<ReturnStockListRow>[] = [
    {
      key: "product_name",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.product_name || [],
      render: (_val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.product_name}</span>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.sku || [],
      width: "120px",
      render: (val) => <span className="font-mono text-xs text-foreground">{val || "—"}</span>,
    },
    {
      key: "uom",
      header: "UOM",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.uom || [],
      width: "72px",
      render: (val) => <span className="text-xs text-foreground">{val || "—"}</span>,
    },
    {
      key: "received_qty",
      header: "Received Qty",
      sortable: true,
      align: "right",
      width: "150px",
      render: (_val, row) => (
        <StackedQtyDisplay
          baseQty={Number(row.received_qty) || 0}
          meta={toReturnQtyMeta(row)}
          layout="compact"
          className="ml-auto"
        />
      ),
    },
    {
      key: "available_qty",
      header: "Available Qty",
      sortable: true,
      align: "right",
      width: "150px",
      render: (_val, row) => (
        <StackedQtyDisplay
          baseQty={Number(row.available_qty) || 0}
          meta={toReturnQtyMeta(row)}
          layout="compact"
          className="ml-auto"
        />
      ),
    },
    {
      key: "cp",
      header: "CP",
      sortable: true,
      align: "right",
      width: "120px",
      render: moneyCell,
    },
    {
      key: "stock_value",
      header: "Stock Value",
      sortable: true,
      align: "right",
      width: "120px",
      render: moneyCell,
    },
    {
      key: "warehouse_name",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.warehouse_name || [],
      render: (val) => <span className="text-xs text-foreground">{val}</span>,
    },
    {
      key: "batch_no",
      header: "Batch No",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.batch_no || [],
      width: "130px",
      render: (val) => <span className="font-mono text-xs text-foreground">{val}</span>,
    },
    {
      key: "manufacture_date",
      header: "Mfg Date",
      sortable: false,
      width: "110px",
      render: (_val, row) => (
        <span className="text-xs tabular-nums">{formatDate(row.manufacture_date)}</span>
      ),
    },
    {
      key: "expiry_date",
      header: "Expiry",
      sortable: true,
      width: "110px",
      render: (val) => <span className="text-xs">{formatDate(val as string | null)}</span>,
    },
    {
      key: "return_no",
      header: "Return No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.return_no || [],
      width: "140px",
      render: (val) => <span className="font-mono text-xs font-semibold">{val || "—"}</span>,
    },
    {
      key: "customer_name",
      header: "Customer",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.customer_name || [],
      render: (val) => <span className="text-xs text-foreground">{val || "—"}</span>,
    },
    {
      key: "status",
      header: "Stock Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: SAMPLE_RETURN_STOCK_STATUS_OPTIONS,
      width: "135px",
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

  const actions: ActionItemConfig<ReturnStockListRow>[] = [
    {
      label: "Move to Rejected",
      action: "move_to_rejected",
      icon: Ban,
      variant: "destructive",
      hide: (row) => Number(row.available_qty) <= 0,
      onClick: (row) =>
        setMoveTarget({
          productName: row.product_name,
          batchNo: row.batch_no,
          availableQty: Number(row.available_qty) || 0,
          availableCases: row.available_cases != null ? Number(row.available_cases) : null,
          status: row.status,
          qtyMeta: toReturnQtyMeta(row),
          sellableItemId: row.id,
          expiryDate: row.expiry_date,
        }),
    },
  ];

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <MasterListing<ReturnStockListRow>
        columns={columns}
        data={records}
        loading={loading}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={setSort}
        onFilterChange={onFilterChange}
        actions={actions}
        emptyMessage=""
        searchPlaceholder="Search product, batch, return no or customer..."
        currentFilters={draftFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
        onExport={handleExport}
      />
      <MoveToRejectedDialog
        open={!!moveTarget}
        target={moveTarget}
        onClose={() => setMoveTarget(null)}
        onSuccess={() => {
          bumpListNonce();
          onFiltersApplied?.();
        }}
      />
    </div>
  );
}
