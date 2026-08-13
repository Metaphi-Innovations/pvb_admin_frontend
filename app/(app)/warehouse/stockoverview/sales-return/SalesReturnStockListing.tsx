"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ActionItemConfig, ColumnConfig } from "@/components/listing/types";
import { SALES_RETURN_STOCK_STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";
import { useStockOverviewListFilters } from "../hooks/use-stock-overview-list-filters";
import {
  ReturnStockListRow,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";

interface SalesReturnStockListingProps {
  warehouseId?: string;
  onFiltersApplied?: () => void;
}

function formatDate(value: string | null): string {
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

export function SalesReturnStockListing({ warehouseId, onFiltersApplied }: SalesReturnStockListingProps) {
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
  const [records, setRecords] = useState<ReturnStockListRow[]>([]);
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
    StockOverviewApi.listSalesReturn({
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
        setError(StockOverviewApi.getErrorMessage(err, "Failed to load sales return stock."));
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
      warehouse_name: "inventory_detail__warehouse__warehouse_name",
      customer_name: "customer_name",
      batch_no: "batch_no",
      return_no: "return_no",
    };
    const field = keyMap[columnKey];
    if (!field) return;

    setLoadingFilters((prev) => new Set(prev).add(columnKey));
    StockOverviewApi.filterDropdown("sales_return", field)
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
      filterOptions: SALES_RETURN_STOCK_STATUS_OPTIONS,
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

  const actions: ActionItemConfig<ReturnStockListRow>[] = [
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
      />
    </div>
  );
}
