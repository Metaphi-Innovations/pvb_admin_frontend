"use client";

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackingRecord } from "../types";
import Link from "next/link";
import { STATUS_BADGE_CONFIG } from "../constants";
import {
  resolveWarehouseOrderType,
  ORDER_TYPE_BADGE_CONFIG,
  formatWarehouseOrderAmount,
  type OrderTypeFilterTab,
} from "@/app/(app)/warehouse/lib/order-document-type";
import { getPackingListOrderNoHeader } from "../lib/packing-document-labels";
import {
  PackingDoneService,
  buildPackingDoneApiFilters,
  buildPackingDoneOrdering,
  type PackingDoneFilterField,
} from "@/services/packing-done.service";

type PackingSourceTab = Exclude<OrderTypeFilterTab, "all">;

interface DonePackingListingProps {
  sourceFilter: PackingSourceTab;
}

function OrderTypeBadge({ row }: { row: PackingRecord }) {
  const type = resolveWarehouseOrderType(row);
  const cfg = ORDER_TYPE_BADGE_CONFIG[type];
  return (
    <span
      className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  );
}

function doneStatusLabel(row: PackingRecord): string {
  const type = resolveWarehouseOrderType(row);
  if (type === "sample_order" && row.status === "Packed") {
    return "Packed";
  }
  return row.status;
}

export function DonePackingListing({ sourceFilter }: DonePackingListingProps) {
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
  const [salesOrderNoOptions, setSalesOrderNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const [packedByOptions, setPackedByOptions] = useState<{ label: string; value: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ label: string; value: string }[]>([]);

  // List data state
  const [items, setItems] = useState<PackingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Reset page when source tab changes
  useEffect(() => {
    setPage(1);
  }, [sourceFilter]);

  // Track which filter columns have already been loaded
  const loadedFiltersRef = useRef<Set<string>>(new Set());

  // Lazy-load filter options only when the user opens a specific filter popover
  const FILTER_FIELD_MAP: Record<string, { field: PackingDoneFilterField; setter: (opts: { label: string; value: string }[]) => void }> = useMemo(() => ({
    packingDoneNo: { field: "packing_done_no", setter: setPackingNoOptions },
    salesOrderNo: { field: "packing_list__packing_number", setter: setSalesOrderNoOptions },
    customer: { field: "packing_list__customer_name", setter: setCustomerOptions },
    warehouse: { field: "warehouse__warehouse_name", setter: setWarehouseOptions },
    packedBy: { field: "packed_by_user__username", setter: setPackedByOptions },
    status: { field: "status", setter: setStatusOptions },
  }), []);

  const handleOpenFilter = useCallback(async (columnKey: string) => {
    if (loadedFiltersRef.current.has(columnKey)) return;
    const mapping = FILTER_FIELD_MAP[columnKey];
    if (!mapping) return;
    loadedFiltersRef.current.add(columnKey);
    try {
      const apiSourceType = sourceFilter === "sales" ? "normal_sales" : sourceFilter;
      const options = await PackingDoneService.getFilterDropdown(mapping.field, selectedWarehouse === "All" ? undefined : selectedWarehouse, apiSourceType);
      mapping.setter(options);
    } catch (err) {
      console.error(`Error loading filter options for ${columnKey}:`, err);
      loadedFiltersRef.current.delete(columnKey);
    }
  }, [FILTER_FIELD_MAP, sourceFilter, selectedWarehouse]);

  // Fetch list data from backend
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      try {
        const apiFilters = buildPackingDoneApiFilters(filters, selectedWarehouse);
        // Force the source_type based on the active tab
        apiFilters.source_type = sourceFilter === "sales" ? "normal_sales" : sourceFilter;

        const ordering = buildPackingDoneOrdering(sort.key, sort.direction);

        const result = await PackingDoneService.list({
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
        console.error("Error loading packing done data:", err);
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

  const isPurchaseReturn = sourceFilter === "purchase_return";

  const partyHeader =
    sourceFilter === "sample"
      ? "Issued To Employee"
      : sourceFilter === "stock_transfer"
        ? "Target Warehouse"
        : sourceFilter === "purchase_return"
          ? "Supplier"
          : "Customer";

  const columns = useMemo(() => {
    const cols: ColumnConfig<PackingRecord>[] = [
      {
        key: "packingNo",
        header: "Packing Done No",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: packingNoOptions,
        width: "140px",
        render: (_: unknown, row: PackingRecord) => (
          <Link
            href={`/warehouse/packing/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.packingNo}
          </Link>
        ),
      },
      {
        key: "salesOrderNo",
        header: getPackingListOrderNoHeader(sourceFilter),
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: salesOrderNoOptions,
        width: "140px",
        render: (_: unknown, row: PackingRecord) => (
          <span className="font-mono text-xs text-foreground font-semibold">{row.salesOrderNo}</span>
        ),
      },
    ];

    if (isPurchaseReturn) {
      cols.push({
        key: "poNumber",
        header: "PO No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "130px",
        render: (_: unknown, row: PackingRecord) => (
          <span className="font-mono text-xs font-semibold text-navy-700">{row.poNumber ?? "—"}</span>
        ),
      });
    }

    cols.push(
      {
        key: "customer",
        header: partyHeader,
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: customerOptions,
        width: "180px",
        render: (_: unknown, row: PackingRecord) => {
          const type = resolveWarehouseOrderType(row);
          const label = type === "stock_transfer" ? (row.targetWarehouse || row.customer) : row.customer;
          return (
            <div className="min-w-0">
              <span className="text-xs text-foreground font-semibold block truncate">{label}</span>
              {isPurchaseReturn && row.supplierCode && (
                <span className="text-[11px] text-muted-foreground font-mono">{row.supplierCode}</span>
              )}
            </div>
          );
        },
      },
      {
        key: "warehouse",
        header: "Source Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: warehouseOptions,
        width: "160px",
        render: (_: unknown, row: PackingRecord) => {
          const type = resolveWarehouseOrderType(row);
          return (
            <span className="text-xs text-foreground">
              {type === "stock_transfer" ? (row.sourceWarehouse || row.warehouse) : row.warehouse}
            </span>
          );
        },
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
      {
        key: "packedQuantity",
        header: "Packed Qty",
        sortable: true,
        align: "right",
        width: "100px",
        render: (val: unknown) => (
          <span className="font-mono text-xs tabular-nums">{val as number}</span>
        ),
      },
      {
        key: "orderAmount",
        header: "Amount",
        align: "right",
        width: "90px",
        render: (_: unknown, row: PackingRecord) => {
          const type = resolveWarehouseOrderType(row);
          if (type === "sample_order") {
            return (
              <span className="font-mono text-xs tabular-nums">
                {formatWarehouseOrderAmount(type, 0)}
              </span>
            );
          }
          if (type === "purchase_return" && row.orderAmount != null) {
            return (
              <span className="font-mono text-xs tabular-nums">
                {formatWarehouseOrderAmount(type, row.orderAmount)}
              </span>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
      {
        key: "packedBy",
        header: "Packed By",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: packedByOptions,
        width: "120px",
      },
      {
        key: "packingDate",
        header: "Packing Date",
        sortable: true,
        width: "120px",
        render: (val: unknown) => (
          <span className="text-xs text-muted-foreground">{val as string}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "110px",
        render: (_: unknown, row: PackingRecord) => {
          const label = doneStatusLabel(row);
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
    return cols;
  }, [
    partyHeader,
    isPurchaseReturn,
    sourceFilter,
    packingNoOptions,
    salesOrderNoOptions,
    customerOptions,
    warehouseOptions,
    packedByOptions,
    statusOptions,
  ]);

  const actions: ActionItemConfig<PackingRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
    {
      label: "Create Dispatch",
      action: "dispatch",
      icon: Truck,
      hide: (row) => row.status !== "Packed",
      onClick: (row) => router.push(`/warehouse/dispatch/create?packingId=${row.id}`),
    },
  ];

  return (
    <MasterListing<PackingRecord>
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
      emptyMessage="packing done records"
      searchPlaceholder="Search packing done..."
      onOpenFilter={handleOpenFilter}
    />
  );
}
