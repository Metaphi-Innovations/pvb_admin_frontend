"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ActionItemConfig, ColumnConfig } from "@/components/listing/types";
import { StackedQtyDisplay, type QtyStackMeta } from "@/app/(app)/sales/shared/StackedQtyDisplay";
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

function inventoryViewHref(productId: string, warehouseId?: string) {
  if (!warehouseId) return `/warehouse/stockoverview/view/${productId}`;
  return `/warehouse/stockoverview/view/${productId}?warehouse_id=${encodeURIComponent(warehouseId)}`;
}

export function QcPassedListing({ warehouseId, onFiltersApplied }: QcPassedListingProps) {
  const router = useRouter();
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
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, setPage]);

  useEffect(() => {
    if (!warehouseId) {
      setRecords([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

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

  const handleExport = useCallback(() => {
    if (!warehouseId || exporting) return;
    setExporting(true);
    setError(null);
    StockOverviewApi.exportInventory({
      search: String(appliedFilters.search ?? ""),
      ordering: toStockOrdering(sort.key, sort.direction),
      warehouse_id: warehouseId,
      filters: appliedFilters,
    })
      .catch((err) => {
        setError(StockOverviewApi.getErrorMessage(err, "Failed to export inventory."));
      })
      .finally(() => setExporting(false));
  }, [appliedFilters, exporting, sort.direction, sort.key, warehouseId]);

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
        <Link href={inventoryViewHref(row.id, warehouseId)} className="block group/name">
          <span className="text-xs font-semibold text-foreground group-hover/name:text-brand-700">
            {row.product_name}
          </span>
        </Link>
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
      key: "expired_qty",
      header: "Expired Qty",
      sortable: true,
      align: "right",
      width: "150px",
      render: (_val, row) => {
        const n = Number(row.expired_qty) || 0;
        if (n <= 0) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <StackedQtyDisplay
            baseQty={n}
            meta={toInventoryQtyMeta(row)}
            layout="compact"
            className="ml-auto [&_p:first-child]:text-rose-700"
          />
        );
      },
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
  ];

  const actions: ActionItemConfig<InventoryListRow>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(inventoryViewHref(row.id, warehouseId)),
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
        actions={actions}
        emptyMessage=""
        searchPlaceholder="Search product or SKU..."
        currentFilters={draftFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
        onExport={handleExport}
      />
    </div>
  );
}
