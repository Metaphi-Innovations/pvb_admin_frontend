"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { /* Eye, */ PlusCircle, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/lib/toast";
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
  buildPackingCreateHref,
  buildPackingListHref,
  packingListPathForSource,
} from "../lib/packing-list-nav";
import {
  PackingListService,
  buildPackingListApiFilters,
  buildPackingListOrdering,
  type PackingListListItem,
  type PackingListFilterField,
} from "@/services/packing-list.service";

type PackingSourceTab = Exclude<OrderTypeFilterTab, "all">;

interface ReadyPackingListingProps {
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

  const listReturnTo = useMemo(
    () =>
      buildPackingListHref(packingListPathForSource(sourceFilter), {
        tab: "ready-for-packing",
        warehouse: selectedWarehouse,
        searchParams,
      }),
    [sourceFilter, selectedWarehouse, searchParams],
  );

  // API parameters state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dynamic filter options state
  const [packingNoOptions, setPackingNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ label: string; value: string }[]>([]);

  // List data state
  const [items, setItems] = useState<PackingListListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState<PackingListListItem | null>(null);

  // Track which filter columns have already been loaded
  const loadedFiltersRef = useRef<Set<string>>(new Set());

  // Reset page / filter caches when source tab or warehouse changes
  useEffect(() => {
    setPage(1);
    setFilters({});
    setSort({ key: "", direction: "none" });
    setItems([]);
    setTotal(0);
    setLoading(true);
    loadedFiltersRef.current.clear();
    setPackingNoOptions([]);
    setCustomerOptions([]);
    setWarehouseOptions([]);
    setStatusOptions([]);
  }, [sourceFilter, selectedWarehouse]);

  // Lazy-load filter options only when the user opens a specific filter popover
  const FILTER_FIELD_MAP: Record<string, { field: PackingListFilterField; setter: (opts: { label: string; value: string }[]) => void }> = useMemo(() => ({
    packingNo: { field: "source_document_no", setter: setPackingNoOptions },
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
      const apiSourceType = sourceFilter === "sales" ? "normal_sales" : sourceFilter;
      const options = await PackingListService.getFilterDropdown(mapping.field, apiSourceType);
      mapping.setter(options);
    } catch (err) {
      console.error(`Error loading filter options for ${columnKey}:`, err);
      loadedFiltersRef.current.delete(columnKey);
    }
  }, [FILTER_FIELD_MAP, sourceFilter]);

  const handleFilterChange = useCallback((next: FilterState) => {
    setFilters(next);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((next: SortState) => {
    setSort(next);
    setPage(1);
  }, []);

  // Fetch list data from backend
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);

    async function loadData() {
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
        if ((err as { name?: string } | null)?.name === "CanceledError" ||
            (err as { name?: string } | null)?.name === "AbortError" ||
            (err as { code?: string } | null)?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Error loading packing list data:", err);
        if (active) {
          setItems([]);
          setTotal(0);
        }
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
  }, [page, pageSize, sort, filters, sourceFilter, selectedWarehouse, refreshKey]);

  const columns = useMemo(() => {
    const isPurchaseReturn = sourceFilter === "purchase_return";

    const baseColumns: ColumnConfig<PackingListListItem>[] = [
      {
        key: "packingNo",
        header: getPackingListOrderNoHeader(sourceFilter),
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: packingNoOptions,
        width: "140px",
        render: (_: unknown, row: PackingListListItem) => (
          <div className="flex flex-col">
            <Link
              href={buildPackingCreateHref(row.id, listReturnTo)}
              className="font-mono text-xs font-semibold text-brand-700 hover:underline"
            >
              {row.sourceDocumentNo || row.packingNumber}
            </Link>
          </div>
        ),
      },
      {
        key: "customer",
        header:
          sourceFilter === "sample"
            ? "Issued To Employee"
            : sourceFilter === "purchase_return"
              ? "Supplier"
              : sourceFilter === "stock_transfer"
                ? "Target Warehouse"
                : "Customer / Issued To",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: customerOptions,
        width: "180px",
        render: (_: unknown, row: PackingListListItem) => {
          const label = sourceFilter === "stock_transfer" ? (row.targetWarehouse || row.customerName) : row.customerName;
          return (
            <div className="min-w-0">
              <span className="text-xs text-foreground font-semibold block truncate">{label}</span>
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
        render: (_: unknown, row: PackingListListItem) => (
          <span className="text-xs text-foreground">
            {sourceFilter === "stock_transfer" ? (row.sourceWarehouse || row.warehouseName) : row.warehouseName}
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
        width: "130px",
        truncate: false,
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
        width: "180px",
        truncate: false,
        render: (_: unknown, row: PackingListListItem) => {
          const label = readyStatusLabel(row);
          const cfg = STATUS_BADGE_CONFIG[label] || {
            bg: "bg-slate-100 text-slate-700 border-slate-200",
            label,
          };
          return (
            <span
              className={`inline-flex items-center whitespace-nowrap text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
            >
              {cfg.label}
            </span>
          );
        },
      },
    );

    return baseColumns;
  }, [sourceFilter, packingNoOptions, customerOptions, warehouseOptions, statusOptions, listReturnTo]);

  const actions: ActionItemConfig<PackingListListItem>[] = [
    // View is redundant on Ready For Packing (order already has its own view).
    // Keep commented for easy reuse later.
    // {
    //   label: "View",
    //   action: "view",
    //   icon: Eye,
    //   onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    // },
    {
      label: "Create Packing",
      action: "create_packing",
      icon: PlusCircle,
      onClick: (row) => router.push(buildPackingCreateHref(row.id, listReturnTo)),
      disabled: (row) => row.status === "Fully Packed",
    },
    {
      label: "Revert",
      action: "revert",
      icon: RotateCcw,
      onClick: (row) => setRevertTarget(row),
      disabled: (row) => row.status !== "Ready For Packing",
      variant: "destructive",
    },
  ];

  const handleRevertConfirm = async () => {
    if (!revertTarget) return;
    try {
      await PackingListService.revert(revertTarget.id);
      showToast("Packing List reverted successfully.", "success");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error("Error reverting packing list:", err);
      showToast(
        err?.response?.data?.error || err?.response?.data?.message || "Failed to revert Packing List",
        "error",
      );
    } finally {
      setRevertTarget(null);
    }
  };

  const revertDescription =
    revertTarget?.sourceType === "purchase_return"
      ? "The linked PO Return can be edited again."
      : "This will release the reserved inventory back to available stock.";

  return (
    <>
      <MasterListing<PackingListListItem>
        columns={columns}
        data={items}
        loading={loading}
        totalRecords={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
        currentFilters={filters}
        currentSort={sort}
        actions={actions}
        emptyMessage="packing lists"
        searchPlaceholder={sourceFilter === "purchase_return" ? "Search returns..." : "Search orders..."}
        onOpenFilter={handleOpenFilter}
      />

      <Dialog open={!!revertTarget} onOpenChange={() => setRevertTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-500" />
              </div>
              Revert Packing List?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to revert{" "}
            <span className="font-semibold text-foreground">
              {revertTarget?.sourceDocumentNo || revertTarget?.packingNumber}
            </span>
            ? {revertDescription}
          </p>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRevertTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleRevertConfirm}
            >
              Confirm Revert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
