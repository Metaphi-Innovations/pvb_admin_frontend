"use client";

import React, { useEffect, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QC_PASSED_STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";
import { useStockOverviewListFilters } from "../hooks/use-stock-overview-list-filters";
import { ProductDropdownService } from "@/services/product-dropdown.service";
import {
  InventoryListRow,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";

interface QcPassedListingProps {
  warehouseId?: string;
  onFiltersApplied?: () => void;
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
  const [productLookups, setProductLookups] = useState<{
    sku: Array<{ label: string; value: string }>;
    uom: Array<{ label: string; value: string }>;
  }>({ sku: [], uom: [] });

  useEffect(() => {
    setPage(1);
  }, [warehouseId, setPage]);

  useEffect(() => {
    let mounted = true;
    ProductDropdownService.dropdown()
      .then((products) => {
        if (!mounted) return;
        const skuSeen = new Set<string>();
        const uomSeen = new Set<string>();
        const sku: Array<{ label: string; value: string }> = [];
        const uom: Array<{ label: string; value: string }> = [];

        for (const p of products) {
          const skuVal = String(p.sku ?? "").trim();
          if (skuVal && !skuSeen.has(skuVal)) {
            skuSeen.add(skuVal);
            sku.push({ label: skuVal, value: skuVal });
          }
          const uomVal = String(p.unit ?? "").trim();
          if (uomVal && !uomSeen.has(uomVal)) {
            uomSeen.add(uomVal);
            uom.push({ label: uomVal, value: uomVal });
          }
        }

        setProductLookups({
          sku: sku.sort((a, b) => a.label.localeCompare(b.label)),
          uom: uom.sort((a, b) => a.label.localeCompare(b.label)),
        });
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

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

    if (columnKey === "sku") {
      setFilterOptions((prev) => ({ ...prev, sku: productLookups.sku }));
      return;
    }
    if (columnKey === "uom") {
      setFilterOptions((prev) => ({ ...prev, uom: productLookups.uom }));
      return;
    }

    const keyMap: Record<string, string> = {
      product_name: "inventory_detail__product__product_name",
      warehouse_name: "inventory_detail__warehouse__warehouse_name",
      batch_no: "batch_no",
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
        <Link href={`/warehouse/stockoverview/view/${row.id}`} className="block group/name">
          <span className="text-xs font-semibold text-foreground group-hover/name:text-brand-700">{row.product_name}</span>
        </Link>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.sku || productLookups.sku,
      width: "120px",
      render: (val) => <span className="font-mono text-xs text-foreground">{val || "—"}</span>,
    },
    {
      key: "uom",
      header: "UOM",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.uom || productLookups.uom,
      width: "72px",
      render: (val) => <span className="text-xs text-foreground">{val || "—"}</span>,
    },
    {
      key: "available_qty",
      header: "Available Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {val != null ? Number(val).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "reserved_qty",
      header: "Reserved Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {val != null ? Number(val).toLocaleString() : "—"}
        </span>
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
      key: "status",
      header: "Status",
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

  const actions: ActionItemConfig<InventoryListRow>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/stockoverview/view/${row.id}`),
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
        searchPlaceholder="Search product or batch..."
        currentFilters={draftFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />
    </div>
  );
}
