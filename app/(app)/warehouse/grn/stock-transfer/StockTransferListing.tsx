"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2, FilePlus2, Pencil, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getStockTransferGrnDisplayStatus,
  ST_GRN_STATUS_BADGE,
} from "@/lib/warehouse/grn-source";
import { getStockTransferReceivedApiContext } from "@/lib/warehouse/grn-list-config";
import { useGrnLazyFilters, useGrnListData } from "../shared/useGrnListData";
import { type GrnListItem } from "@/services/grn-list.service";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import {
  fetchDispatchFilterOptions,
  fetchPendingStockTransferDispatches,
  PENDING_ST_FILTER_FIELD_MAP,
  type PendingStockTransferDispatchRow,
} from "./stock-transfer-grn-utils";

type ReceivedStockTransferGrnRow = {
  id: string;
  rowType: "grn_record";
  grnId: string;
  stockTransferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  dispatchDate: string;
  itemCount: number;
  receivedQty: number;
  displayStatus: string;
  grnRecord: GrnListItem;
};

function mapToReceivedRow(item: GrnListItem): ReceivedStockTransferGrnRow {
  return {
    id: item.id,
    rowType: "grn_record",
    grnId: item.id,
    stockTransferNo: item.stockTransferNo || item.grnNo,
    fromWarehouse: item.fromWarehouse ?? item.vendorName ?? "—",
    toWarehouse: item.toWarehouse ?? item.warehouse,
    dispatchDate: item.dispatchDate ?? item.grnDate,
    itemCount: item.totalProducts || 0,
    receivedQty: item.receivedQty,
    displayStatus: getStockTransferGrnDisplayStatus({
      isPendingTransfer: false,
      grnStatus: item.status,
    }),
    grnRecord: item,
  };
}

interface StockTransferListingProps {
  destinationWarehouse: string;
}

export function StockTransferListing({ destinationWarehouse }: StockTransferListingProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"pending" | "received">("pending");

  // ── Pending (Dispatch) state ───────────────────────────────────────────
  const [pendingFilters, setPendingFilters] = useState<FilterState>({});
  const [pendingSort, setPendingSort] = useState<SortState>({ key: "", direction: "none" });
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [pendingRows, setPendingRows] = useState<PendingStockTransferDispatchRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingFilterOptions, setPendingFilterOptions] = useState<
    Partial<Record<string, { label: string; value: string }[]>>
  >({});
  const pendingFilterInFlightRef = useRef<Set<string>>(new Set());

  const {
    debouncedFilters: debouncedPendingFilters,
    debouncedSearch: debouncedPendingSearch,
    isDebouncing: pendingDebouncing,
  } = useDebouncedFilters(pendingFilters);

  // ── Received (GRN) state ───────────────────────────────────────────────
  const [grnFilters, setGrnFilters] = useState<FilterState>({});
  const [grnSort, setGrnSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(10);
  const [pendingCount, setPendingCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);

  const receivedTabContext = useMemo(() => getStockTransferReceivedApiContext(), []);
  const { handleOpenFilter: handleOpenReceivedFilter, getFilterOptionsForColumn } =
    useGrnLazyFilters(receivedTabContext.sourceType);

  const {
    items: grnItems,
    total: grnTotal,
    loading: grnLoading,
    error: grnError,
  } = useGrnListData({
    tabContext: receivedTabContext,
    filters: grnFilters,
    sort: grnSort,
    page: grnPage,
    pageSize: grnPageSize,
    destinationWarehouse,
    enabled: subTab === "received",
  });

  const receivedRows = useMemo(() => grnItems.map(mapToReceivedRow), [grnItems]);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      let ordering: string | undefined;
      if (pendingSort.key && pendingSort.direction !== "none") {
        const fieldMap: Record<string, string> = {
          stockTransferNo: "transfer_no",
          dispatchNumber: "dispatch_number",
          dispatchDate: "dispatch_date",
          fromWarehouse: "from_warehouse",
          toWarehouse: "to_warehouse",
          status: "status",
          itemCount: "item_count",
          dispatchedQty: "dispatched_qty",
        };
        const backendKey = fieldMap[pendingSort.key] || pendingSort.key;
        ordering =
          pendingSort.direction === "desc" ? `-${backendKey}` : backendKey;
      }

      const result = await fetchPendingStockTransferDispatches({
        page: pendingPage,
        pageSize: pendingPageSize,
        search: debouncedPendingSearch || undefined,
        ordering,
        filters: debouncedPendingFilters as Record<string, unknown>,
        destinationWarehouseId: destinationWarehouse,
      });

      setPendingRows(result.items);
      setPendingTotal(result.total);
      setPendingCount(result.total);
    } catch (err) {
      console.error(err);
      setPendingError(err instanceof Error ? err.message : "Failed to load pending dispatches.");
      setPendingRows([]);
      setPendingTotal(0);
    } finally {
      setPendingLoading(false);
    }
  }, [
    pendingPage,
    pendingPageSize,
    debouncedPendingFilters,
    debouncedPendingSearch,
    pendingSort.key,
    pendingSort.direction,
    destinationWarehouse,
  ]);

  useEffect(() => {
    if (subTab !== "pending") return;
    setPendingFilterOptions({});
  }, [subTab]);

  useEffect(() => {
    if (subTab === "pending") {
      void loadPending();
    }
  }, [subTab, loadPending]);

  useEffect(() => {
    setPendingPage(1);
  }, [destinationWarehouse, pendingFilters, pendingPageSize]);

  useEffect(() => {
    setPendingPage(1);
  }, [pendingSort.key, pendingSort.direction]);

  useEffect(() => {
    setGrnPage(1);
  }, [destinationWarehouse, grnFilters, grnPageSize]);

  useEffect(() => {
    setGrnPage(1);
  }, [grnSort.key, grnSort.direction]);

  useEffect(() => {
    if (subTab === "received") {
      setReceivedCount(grnTotal);
    }
  }, [subTab, grnTotal]);

  const handleOpenPendingFilter = useCallback(async (columnKey: string) => {
    const fieldName = PENDING_ST_FILTER_FIELD_MAP[columnKey];
    if (!fieldName) return;
    // Date range picker does not need dropdown options
    if (columnKey === "dispatchDate") return;
    if (pendingFilterInFlightRef.current.has(columnKey)) return;

    pendingFilterInFlightRef.current.add(columnKey);
    setPendingFilterOptions((prev) => ({ ...prev, [columnKey]: [] }));
    try {
      const options = await fetchDispatchFilterOptions(fieldName);
      setPendingFilterOptions((prev) => ({ ...prev, [columnKey]: options }));
    } catch (err) {
      console.error(err);
      setPendingFilterOptions((prev) => ({ ...prev, [columnKey]: [] }));
    } finally {
      pendingFilterInFlightRef.current.delete(columnKey);
    }
  }, []);

  const pendingColumns = useMemo(() => {
    const cols: ColumnConfig<PendingStockTransferDispatchRow>[] = [
      {
        key: "stockTransferNo",
        header: "Stock Transfer No.",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: pendingFilterOptions.stockTransferNo || [],
        width: "140px",
        render: (_val, row) => (
          <span className="font-mono text-xs font-semibold text-brand-700">
            {row.stockTransferNo}
          </span>
        ),
      },
      {
        key: "dispatchNumber",
        header: "Dispatch No.",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: pendingFilterOptions.dispatchNumber || [],
        width: "130px",
        render: (_val, row) => (
          <Link href={`/warehouse/grn/stock-transfer/dispatch-view/${row.dispatchId}`}>
            <span className="font-mono text-xs font-semibold text-brand-700 hover:text-brand-800">
              {row.dispatchNumber}
            </span>
          </Link>
        ),
      },
      {
        key: "fromWarehouse",
        header: "From Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: pendingFilterOptions.fromWarehouse || [],
        width: "140px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.fromWarehouse}</span>,
      },
      {
        key: "toWarehouse",
        header: "To Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: pendingFilterOptions.toWarehouse || [],
        width: "140px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.toWarehouse}</span>,
      },
      {
        key: "dispatchDate",
        header: "Dispatch Date",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "120px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.dispatchDate}</span>,
      },
      {
        key: "itemCount",
        header: "Items",
        sortable: true,
        align: "right",
        width: "80px",
        render: (_val, row) => (
          <span className="text-xs font-medium tabular-nums">{row.itemCount.toLocaleString()}</span>
        ),
      },
      {
        key: "dispatchedQty",
        header: "Dispatched Qty",
        sortable: true,
        align: "right",
        width: "110px",
        render: (_val, row) => (
          <span className="text-xs font-medium tabular-nums">{row.dispatchedQty.toLocaleString()}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: pendingFilterOptions.status || [],
        width: "120px",
        render: (_val, row) => (
          <span className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
            {row.status}
          </span>
        ),
      },
    ];
    return cols;
  }, [pendingFilterOptions]);

  const receivedColumns = useMemo(() => {
    const cols: ColumnConfig<ReceivedStockTransferGrnRow>[] = [
      {
        key: "stockTransferNo",
        header: "Stock Transfer No.",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("stockTransferNo"),
        width: "140px",
        render: (_val, row) => (
          <Link href={`/warehouse/grn/stock-transfer/${row.grnId}`}>
            <span className="font-mono text-xs font-semibold text-brand-700 hover:text-brand-800">
              {row.stockTransferNo || row.grnRecord.grnNo}
            </span>
          </Link>
        ),
      },
      {
        key: "fromWarehouse",
        header: "From Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("fromWarehouse"),
        width: "140px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.fromWarehouse}</span>,
      },
      {
        key: "toWarehouse",
        header: "To Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("toWarehouse"),
        width: "140px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.toWarehouse}</span>,
      },
      {
        key: "dispatchDate",
        header: "Received Date",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "120px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.dispatchDate}</span>,
      },
      {
        key: "itemCount",
        header: "Items",
        sortable: true,
        align: "right",
        width: "80px",
        render: (_val, row) => (
          <span className="text-xs font-medium tabular-nums">{row.itemCount.toLocaleString()}</span>
        ),
      },
      {
        key: "receivedQty",
        header: "Received Qty",
        sortable: true,
        align: "right",
        width: "110px",
        render: (_val, row) => (
          <span className="text-xs font-medium tabular-nums">{row.receivedQty.toLocaleString()}</span>
        ),
      },
      {
        key: "displayStatus",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("displayStatus"),
        width: "140px",
        render: (val: string) => {
          const cfg =
            ST_GRN_STATUS_BADGE[val as keyof typeof ST_GRN_STATUS_BADGE] ??
            ST_GRN_STATUS_BADGE["Pending Receipt"];
          return (
            <span
              className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
            >
              {cfg.label}
            </span>
          );
        },
      },
    ];
    return cols;
  }, [getFilterOptionsForColumn]);

  const pendingActions: ActionItemConfig<PendingStockTransferDispatchRow>[] = [
    {
      label: "Create GRN",
      action: "create_grn",
      icon: FilePlus2,
      onClick: (row) =>
        router.push(`/warehouse/grn/stock-transfer/create?dispatchId=${row.dispatchId}`),
    },
    {
      label: "View Dispatch",
      action: "view",
      icon: Truck,
      onClick: (row) =>
        router.push(`/warehouse/grn/stock-transfer/dispatch-view/${row.dispatchId}`),
    },
  ];

  const receivedActions: ActionItemConfig<ReceivedStockTransferGrnRow>[] = [
    {
      label: "View GRN",
      action: "view",
      icon: Eye,
      onClick: (row) => {
        if (row.grnId) router.push(`/warehouse/grn/stock-transfer/${row.grnId}`);
      },
    },
    {
      label: "Edit",
      action: "edit",
      icon: Pencil,
      onClick: (row) => {
        if (row.grnId) router.push(`/warehouse/grn/stock-transfer/${row.grnId}/edit`);
      },
      hide: (row) => row.grnRecord?.status === "qc_completed",
    },
    {
      label: "Perform QC",
      action: "qc",
      icon: FileCheck2,
      onClick: (row) => {
        if (row.grnRecord?.status === "qc_completed") {
          alert("QC is already completed for this GRN.");
          return;
        }
        if (row.grnId) router.push(`/warehouse/qc/create?grnId=${row.grnId}`);
      },
      hide: (row) => row.grnRecord?.status === "qc_completed",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setSubTab("pending")}
          className={cn(
            "h-8 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5",
            subTab === "pending"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border text-muted-foreground hover:bg-muted bg-white",
          )}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("received")}
          className={cn(
            "h-8 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5",
            subTab === "received"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border text-muted-foreground hover:bg-muted bg-white",
          )}
        >
          Received ({receivedCount})
        </button>
      </div>

      {subTab === "pending" ? (
        <div className="space-y-3">
          {pendingError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {pendingError}
            </div>
          )}
          <MasterListing<PendingStockTransferDispatchRow>
            columns={pendingColumns}
            data={pendingRows}
            loading={pendingLoading || pendingDebouncing}
            totalRecords={pendingTotal}
            page={pendingPage}
            pageSize={pendingPageSize}
            onPageChange={setPendingPage}
            onPageSizeChange={setPendingPageSize}
            onFilterChange={setPendingFilters}
            onSortChange={setPendingSort}
            onOpenFilter={handleOpenPendingFilter}
            actions={pendingActions}
            emptyMessage="No pending stock transfer dispatches found"
            searchPlaceholder="Search dispatch / stock transfer..."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {grnError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {grnError}
            </div>
          )}
          <MasterListing<ReceivedStockTransferGrnRow>
            columns={receivedColumns}
            data={receivedRows}
            loading={grnLoading}
            totalRecords={grnTotal}
            page={grnPage}
            pageSize={grnPageSize}
            onPageChange={setGrnPage}
            onPageSizeChange={setGrnPageSize}
            onFilterChange={setGrnFilters}
            onSortChange={setGrnSort}
            onOpenFilter={handleOpenReceivedFilter}
            actions={receivedActions}
            emptyMessage="No received stock transfer GRNs found"
            searchPlaceholder="Search stock transfer GRN..."
          />
        </div>
      )}
    </div>
  );
}
