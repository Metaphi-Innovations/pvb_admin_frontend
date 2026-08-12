"use client";

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, Truck, RotateCcw, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PackingRecord } from "../types";
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
import { STATUS_BADGE_CONFIG } from "../constants";
import {
  resolveWarehouseOrderType,
  ORDER_TYPE_BADGE_CONFIG,
  formatWarehouseOrderAmount,
  type OrderTypeFilterTab,
} from "@/app/(app)/warehouse/lib/order-document-type";
import { getPackingListOrderNoHeader } from "../lib/packing-document-labels";
import {
  buildPackingEditHref,
  buildPackingListHref,
  buildPackingViewHref,
  packingListPathForSource,
} from "../lib/packing-list-nav";
import {
  PackingDoneService,
  buildPackingDoneApiFilters,
  buildPackingDoneOrdering,
  type PackingDoneFilterField,
} from "@/services/packing-done.service";
import { invalidatePurchaseOrderModuleListingQueries } from "@/lib/procurement/invalidate-po-listing-queries";

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
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const selectedWarehouse = searchParams.get("warehouse") || "All";

  const listReturnTo = useMemo(
    () =>
      buildPackingListHref(packingListPathForSource(sourceFilter), {
        tab: "packing-done",
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
  const [salesOrderNoOptions, setSalesOrderNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [poNumberOptions, setPoNumberOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const [packedByOptions, setPackedByOptions] = useState<{ label: string; value: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ label: string; value: string }[]>([]);

  // List data state
  const [items, setItems] = useState<PackingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState<PackingRecord | null>(null);

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
    setSalesOrderNoOptions([]);
    setPoNumberOptions([]);
    setCustomerOptions([]);
    setWarehouseOptions([]);
    setPackedByOptions([]);
    setStatusOptions([]);
  }, [sourceFilter, selectedWarehouse]);

  // Lazy-load filter options only when the user opens a specific filter popover
  const FILTER_FIELD_MAP: Record<string, { field: PackingDoneFilterField; setter: (opts: { label: string; value: string }[]) => void }> = useMemo(() => ({
    packingNo: { field: "packing_done_no", setter: setPackingNoOptions },
    salesOrderNo: { field: "source_document_no", setter: setSalesOrderNoOptions },
    poNumber: { field: "po_number", setter: setPoNumberOptions },
    customer: { field: "packing_list__customer_name", setter: setCustomerOptions },
    warehouse: { field: "packing_list__warehouse__warehouse_name", setter: setWarehouseOptions },
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
        if ((err as { name?: string } | null)?.name === "CanceledError" ||
            (err as { name?: string } | null)?.name === "AbortError" ||
            (err as { code?: string } | null)?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Error loading packing done data:", err);
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
            href={buildPackingViewHref(row.id, listReturnTo)}
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
        filterType: "dropdown",
        filterOptions: poNumberOptions,
        width: "130px",
        render: (_: unknown, row: PackingRecord) => (
          <span className="font-mono text-xs text-foreground font-semibold">{row.poNumber || "—"}</span>
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
        width: "130px",
        truncate: false,
        render: (_: unknown, row: PackingRecord) => {
          const type = resolveWarehouseOrderType(row);
          return (
            <span className="font-mono text-xs tabular-nums">
              {formatWarehouseOrderAmount(type, row.orderAmount)}
            </span>
          );
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
        width: "180px",
        truncate: false,
        render: (_: unknown, row: PackingRecord) => {
          const label = doneStatusLabel(row);
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
    return cols;
  }, [
    partyHeader,
    isPurchaseReturn,
    sourceFilter,
    packingNoOptions,
    salesOrderNoOptions,
    poNumberOptions,
    customerOptions,
    warehouseOptions,
    packedByOptions,
    statusOptions,
    listReturnTo,
  ]);

  const actions: ActionItemConfig<PackingRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(buildPackingViewHref(row.id, listReturnTo)),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Pencil,
      hide: (row) => row.status !== "Available for Dispatch" && row.status !== "Ready For Dispatch",
      onClick: (row) => router.push(buildPackingEditHref(row.id, listReturnTo)),
    },
    {
      label: "Create Dispatch",
      action: "dispatch",
      icon: Truck,
      hide: (row) => row.status !== "Available for Dispatch" && row.status !== "Ready For Dispatch",
      onClick: (row) => {
        const sourceType =
          sourceFilter === "sales" ? "normal_sales" : sourceFilter;
        const params = new URLSearchParams();
        params.set("packingId", row.id);
        params.set("sourceType", sourceType);
        router.push(`/warehouse/dispatch/create?${params.toString()}`);
      },
    },
    {
      label: "Revert",
      action: "revert",
      icon: RotateCcw,
      onClick: (row) => setRevertTarget(row),
      disabled: (row) => row.status !== "Available for Dispatch" && row.status !== "Ready For Dispatch",
      variant: "destructive",
    },
  ];

  const handleRevertConfirm = async () => {
    if (!revertTarget) return;
    try {
      await PackingDoneService.revert(revertTarget.id);
      await invalidatePurchaseOrderModuleListingQueries(queryClient);
      showToast("Packing Done reverted successfully.", "success");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error("Error reverting packing done:", err);
      showToast(
        err?.response?.data?.error || err?.response?.data?.message || "Failed to revert Packing Done",
        "error",
      );
    } finally {
      setRevertTarget(null);
    }
  };

  return (
    <>
      <MasterListing<PackingRecord>
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
        emptyMessage="packing done records"
        searchPlaceholder="Search packing done..."
        onOpenFilter={handleOpenFilter}
      />

      <Dialog open={!!revertTarget} onOpenChange={() => setRevertTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-500" />
              </div>
              Revert Packing Done?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to revert{" "}
            <span className="font-semibold text-foreground">
              {revertTarget?.packingNo || revertTarget?.salesOrderNo}
            </span>
            ? This will release the items back to Packing List.
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
