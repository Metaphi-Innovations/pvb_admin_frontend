"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, PlusCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  STATUS_BADGE_CONFIG,
} from "../constants";
import {
  resolveWarehouseOrderType,
  ORDER_TYPE_BADGE_CONFIG,
  formatWarehouseOrderAmount,
  type OrderTypeFilterTab,
} from "@/app/(app)/warehouse/lib/order-document-type";
import { getPackingListOrderNoHeader } from "../lib/packing-document-labels";
import {
  PackingListService,
  buildPackingListApiFilters,
  buildPackingListOrdering,
  type PackingListListItem,
  type PackingListFilterField,
} from "@/services/packing-list.service";

type PackingSourceTab = Exclude<OrderTypeFilterTab, "all">;

interface ReadyPackingListingProps {
  ordersForWarehouse: any[]; // Kept for prop-type compatibility, but ignored in favor of real API calls
  sourceFilter: PackingSourceTab;
}

function OrderTypeBadge({ row }: { row: PackingListListItem }) {
  const type = resolveWarehouseOrderType({
    source_type: row.sourceType,
  });
  const cfg = ORDER_TYPE_BADGE_CONFIG[type];
  return (
    <span
      className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  );
}

function readyStatusLabel(row: PackingListListItem): string {
  const type = resolveWarehouseOrderType({
    source_type: row.sourceType,
  });
  if (type === "sample_order" && row.status === "Ready For Packing") {
    return "Pending Packing";
  }
  return row.status;
}

export function ReadyPackingListing({ sourceFilter }: ReadyPackingListingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedWarehouse = searchParams.get("warehouse") || "All";

  // API parameters state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dynamic filter options state
  const [packingNoOptions, setPackingNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ label: string; value: string }[]>([]);

  // List data state
  const [items, setItems] = useState<PackingListListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Reset page when source tab changes
  useEffect(() => {
    setPage(1);
  }, [sourceFilter]);

  // Track which filter columns have already been loaded
  const loadedFiltersRef = useRef<Set<string>>(new Set());

  // Lazy-load filter options only when the user opens a specific filter popover
  const FILTER_FIELD_MAP: Record<string, { field: PackingListFilterField; setter: (opts: { label: string; value: string }[]) => void }> = useMemo(() => ({
    packingNo: { field: "packing_number", setter: setPackingNoOptions },
    customer: { field: "customer_name", setter: setCustomerOptions },
    warehouse: { field: "warehouse__warehouse_name", setter: setWarehouseOptions },
    status: { field: "status", setter: setStatusOptions },
  }), []);

  const handleOpenFilter = useCallback(async (columnKey: string) => {
    if (loadedFiltersRef.current.has(columnKey)) return;
    const mapping = FILTER_FIELD_MAP[columnKey];
    if (!mapping) return;
    loadedFiltersRef.current.add(columnKey);
    try {
      const options = await PackingListService.getFilterDropdown(mapping.field);
      mapping.setter(options);
    } catch (err) {
      console.error(`Error loading filter options for ${columnKey}:`, err);
      loadedFiltersRef.current.delete(columnKey);
    }
  }, [FILTER_FIELD_MAP]);

  // Fetch list data from backend
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      try {
        const apiFilters = buildPackingListApiFilters(filters, selectedWarehouse);
        // Force the source_type based on the active tab
        apiFilters.source_type = sourceFilter === "sales" ? "normal_sales" : sourceFilter;

        const ordering = buildPackingListOrdering(sort.key, sort.direction);

        const result = await PackingListService.list({
          page,
          pageSize,
          search: (filters.search as string) || "",
          ordering,
          apiFilters,
          signal: controller.signal,
        });

        if (active) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (err) {
        console.error("Error loading packing list data:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [page, pageSize, sort, filters, sourceFilter, selectedWarehouse]);

  const columns = useMemo(() => {
    const isPurchaseReturn = sourceFilter === "purchase_return";

    const baseColumns: ColumnConfig<PackingListListItem>[] = [
      {
        key: "orderType",
        header: "Order Type",
        width: "100px",
        render: (_: unknown, row: PackingListListItem) => <OrderTypeBadge row={row} />,
      },
      {
        key: "packingNo",
        header: getPackingListOrderNoHeader(sourceFilter),
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: packingNoOptions,
        width: "140px",
        render: (_: unknown, row: PackingListListItem) => (
          <Link
            href={`/warehouse/packing/create/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.packingNumber}
          </Link>
        ),
      },
      {
        key: "customer",
        header:
          sourceFilter === "sample"
            ? "Issued To Employee"
            : sourceFilter === "purchase_return"
              ? "Supplier"
              : "Customer / Issued To",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: customerOptions,
        width: "180px",
        render: (_: unknown, row: PackingListListItem) => (
          <div className="min-w-0">
            <span className="text-xs text-foreground font-semibold block truncate">{row.customerName}</span>
          </div>
        ),
      },
      {
        key: "warehouse",
        header: "Source Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: warehouseOptions,
        width: "160px",
        render: (_: unknown, row: PackingListListItem) => (
          <span className="text-xs text-foreground">
            {row.warehouseName}
          </span>
        ),
      },
      {
        key: "totalItems",
        header: "Items",
        sortable: true,
        align: "right",
        width: "80px",
        render: (val: unknown) => (
          <span className="font-mono text-xs tabular-nums">{val as number}</span>
        ),
      },
    ];

    if (isPurchaseReturn) {
      baseColumns.push({
        key: "totalQuantity",
        header: "Return Qty",
        sortable: true,
        align: "right",
        width: "90px",
        render: (val: unknown) => (
          <span className="font-mono text-xs tabular-nums">{val as number}</span>
        ),
      });
    }

    baseColumns.push(
      {
        key: "orderAmount",
        header: "Amount",
        sortable: true,
        align: "right",
        width: "100px",
        render: (_: unknown, row: PackingListListItem) => {
          const type = resolveWarehouseOrderType({
            source_type: row.sourceType,
          });
          return (
            <span className="font-mono text-xs tabular-nums">
              {formatWarehouseOrderAmount(type, row.orderAmount)}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "140px",
        render: (_: unknown, row: PackingListListItem) => {
          const label = readyStatusLabel(row);
          const cfg = STATUS_BADGE_CONFIG[label] || {
            bg: "bg-slate-100 text-slate-700 border-slate-200",
            label,
          };
          return (
            <span
              className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
            >
              {cfg.label}
            </span>
          );
        },
      },
    );

    return baseColumns;
  }, [sourceFilter, packingNoOptions, customerOptions, warehouseOptions, statusOptions]);

  const actions: ActionItemConfig<PackingListListItem>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
    {
      label: "Create Packing",
      action: "create_packing",
      icon: PlusCircle,
      onClick: (row) => router.push(`/warehouse/packing/create/${row.id}`),
    },
  ];

  return (
    <MasterListing<PackingListListItem>
      columns={columns}
      data={items}
      loading={loading}
      totalRecords={total}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onSortChange={setSort}
      onFilterChange={setFilters}
      actions={actions}
      emptyMessage="packing lists"
      searchPlaceholder={sourceFilter === "purchase_return" ? "Search returns..." : "Search orders..."}
      onOpenFilter={handleOpenFilter}
    />
  );
}
