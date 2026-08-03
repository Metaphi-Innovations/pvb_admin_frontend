"use client";

import React, { useEffect, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig } from "@/components/listing/types";
import { SAMPLE_RETURN_STOCK_STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";
import { useStockOverviewListFilters } from "../hooks/use-stock-overview-list-filters";
import { ProductDropdownService } from "@/services/product-dropdown.service";
import {
  ReturnStockListRow,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";

interface SampleReturnStockListingProps {
  warehouseId?: string;
  onFiltersApplied?: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return String(value).slice(0, 10);
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

  const handleOpenFilter = (columnKey: string) => {
    if (filterOptions[columnKey] || loadingFilters.has(columnKey)) return;

    if (columnKey === "product_name") {
      setLoadingFilters((prev) => new Set(prev).add(columnKey));
      ProductDropdownService.dropdown()
        .then((items) => {
          const options = items
            .map((p) => ({ label: p.product_name, value: p.product_name }))
            .filter((o) => o.value);
          setFilterOptions((prev) => ({ ...prev, product_name: options }));
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

    if (columnKey === "batch_no") {
      setLoadingFilters((prev) => new Set(prev).add(columnKey));
      StockOverviewApi.filterDropdown("inventory", "batch_no")
        .then((options) => setFilterOptions((prev) => ({ ...prev, batch_no: options })))
        .finally(() => {
          setLoadingFilters((prev) => {
            const next = new Set(prev);
            next.delete(columnKey);
            return next;
          });
        });
      return;
    }

    const keyMap: Record<string, string> = {
      warehouse_name: "sample_return__warehouse__warehouse_name",
      customer_name: "sample_return__customer__customer_name",
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
      key: "return_no",
      header: "Sample Return No.",
      sortable: true,
      width: "150px",
      render: (val) => <span className="font-mono text-xs font-semibold">{val}</span>,
    },
    {
      key: "product_name",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.product_name || [],
    },
    {
      key: "customer_name",
      header: "Customer",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.customer_name || [],
    },
    {
      key: "warehouse_name",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.warehouse_name || [],
    },
    {
      key: "batch_no",
      header: "Batch No",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.batch_no || [],
      width: "130px",
      render: (val) => <span className="font-mono text-xs">{val}</span>,
    },
    {
      key: "available_qty",
      header: "Available Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums">{Number(val).toLocaleString()}</span>,
    },
    {
      key: "return_date",
      header: "Return Date",
      sortable: true,
      width: "120px",
      render: (val) => <span className="text-xs">{formatDate(val as string | null)}</span>,
    },
    {
      key: "expiry_date",
      header: "Expiry Date",
      sortable: true,
      width: "120px",
      render: (val) => <span className="text-xs">{formatDate(val as string | null)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: SAMPLE_RETURN_STOCK_STATUS_OPTIONS,
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
        emptyMessage=""
        searchPlaceholder="Search product, batch or return no..."
        currentFilters={draftFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />
    </div>
  );
}
