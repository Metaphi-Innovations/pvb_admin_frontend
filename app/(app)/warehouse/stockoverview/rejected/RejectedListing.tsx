"use client";

import React, { useEffect, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { REJECTED_STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";
import { useStockOverviewListFilters } from "../hooks/use-stock-overview-list-filters";
import {
  RejectedListRow,
  StockOverviewApi,
  toStockOrdering,
} from "../services/stock-overview-api";

interface RejectedListingProps {
  warehouseId?: string;
  onFiltersApplied?: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

export function RejectedListing({ warehouseId, onFiltersApplied }: RejectedListingProps) {
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
  const [records, setRecords] = useState<RejectedListRow[]>([]);
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
    StockOverviewApi.listRejected({
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
        setError(StockOverviewApi.getErrorMessage(err, "Failed to load rejected inventory."));
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
    const keyMap: Record<string, string> = {
      product_name: "inventory_detail__product__product_name",
      warehouse_name: "inventory_detail__warehouse__warehouse_name",
      batch_no: "batch_no",
    };
    const field = keyMap[columnKey];
    if (!field || filterOptions[columnKey] || loadingFilters.has(columnKey)) return;

    setLoadingFilters((prev) => new Set(prev).add(columnKey));
    StockOverviewApi.filterDropdown("rejected", field)
      .then((options) => setFilterOptions((prev) => ({ ...prev, [columnKey]: options })))
      .finally(() => {
        setLoadingFilters((prev) => {
          const next = new Set(prev);
          next.delete(columnKey);
          return next;
        });
      });
  };

  const columns: ColumnConfig<RejectedListRow>[] = [
    {
      key: "product_name",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.product_name || [],
      render: (_val, row) => (
        <Link href={`/warehouse/stockoverview/view/${row.id}?type=rejected`} className="block group/name">
          <span className="text-xs font-semibold text-foreground group-hover/name:text-brand-700">{row.product_name}</span>
        </Link>
      ),
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
      key: "rejected_qty",
      header: "Rejected Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums">{Number(val).toLocaleString()}</span>,
    },
    {
      key: "reject_reason",
      header: "Reject Reason",
      sortable: true,
    },
    {
      key: "qc_number",
      header: "QC No",
      sortable: true,
      width: "120px",
      render: (val) => <span className="font-mono text-xs">{val || "—"}</span>,
    },
    {
      key: "inspection_date",
      header: "Inspection Date",
      sortable: true,
      width: "130px",
      render: (val) => <span className="text-xs">{formatDate(val as string | null)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: REJECTED_STATUS_OPTIONS,
      width: "150px",
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

  const actions: ActionItemConfig<RejectedListRow>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/stockoverview/view/${row.id}?type=rejected`),
    },
  ];

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <MasterListing<RejectedListRow>
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
        searchPlaceholder="Search product, batch or reason..."
        currentFilters={draftFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />
    </div>
  );
}
