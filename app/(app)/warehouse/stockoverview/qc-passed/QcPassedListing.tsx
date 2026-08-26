"use client";

import React, { useEffect, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig } from "@/components/listing/types";
import { StackedQtyDisplay, type QtyStackMeta } from "@/app/(app)/sales/shared/StackedQtyDisplay";
import { QC_PASSED_STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";
import { useStockOverviewListFilters } from "../hooks/use-stock-overview-list-filters";
import {
  InventoryListRow,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";

interface QcPassedListingProps {
  warehouseId?: string;
  onFiltersApplied?: () => void;
}

function toInventoryQtyMeta(row: InventoryListRow): QtyStackMeta {
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

export function QcPassedListing({ warehouseId, onFiltersApplied }: QcPassedListingProps) {
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
  } = useStockOverviewListFilters();
  const [records, setRecords] = useState<InventoryListRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(1);
  }, [warehouseId, setPage]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    StockOverviewApi.listInventory({
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
        setError(StockOverviewApi.getErrorMessage(err, "Failed to load inventory."));
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

  const handleOpenFilter = (columnKey: string) => {
    if (filterOptions[columnKey] || loadingFilters.has(columnKey)) return;

    const keyMap: Record<string, string> = {
      product_name: "inventory_detail__product__product_name",
      sku: "inventory_detail__product__sku",
      uom: "inventory_detail__product__unit",
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

  const columns: ColumnConfig<InventoryListRow>[] = [
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
      key: "available_qty",
      header: "Available Qty",
      sortable: true,
      align: "right",
      width: "150px",
      render: (_val, row) => (
        <StackedQtyDisplay
          baseQty={Number(row.available_qty) || 0}
          meta={toInventoryQtyMeta(row)}
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
      render: (val) => {
        const text = String(val ?? "");
        const missing = text.toLowerCase().includes("missing");
        return (
          <span className={`text-xs tabular-nums ${missing ? "text-amber-700 text-[10px]" : "text-foreground"}`}>
            {text || "—"}
          </span>
        );
      },
    },
    {
      key: "stock_value",
      header: "Stock Value",
      sortable: true,
      align: "right",
      width: "120px",
      render: (val) => {
        const text = String(val ?? "");
        const missing = text.toLowerCase().includes("missing");
        return (
          <span className={`text-xs font-medium tabular-nums ${missing ? "text-amber-700 text-[10px]" : "text-foreground"}`}>
            {text || "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Stock Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: QC_PASSED_STATUS_OPTIONS,
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

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <MasterListing<InventoryListRow>
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
        emptyMessage=""
        searchPlaceholder="Search product or SKU..."
        currentFilters={draftFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />
    </div>
  );
}
