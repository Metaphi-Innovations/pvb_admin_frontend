"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getStockTransferGrnDisplayStatus,
  ST_GRN_STATUS_BADGE,
} from "@/lib/warehouse/grn-source";
import { getStockTransferSubTabApiContext } from "@/lib/warehouse/grn-list-config";
import { useGrnListData } from "../shared/useGrnListData";
import type { GrnListItem } from "@/services/grn-list.service";

type StockTransferGrnRow = {
  id: string;
  rowType: "grn_record";
  grnId: string;
  stockTransferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  dispatchDate: string;
  products: string;
  dispatchedQty: number;
  receivedQty: number;
  displayStatus: string;
  grnRecord: GrnListItem;
};

function mapToStockTransferRow(item: GrnListItem): StockTransferGrnRow {
  return {
    id: item.id,
    rowType: "grn_record",
    grnId: item.id,
    stockTransferNo: item.stockTransferNo ?? item.grnNo,
    fromWarehouse: item.fromWarehouse ?? item.vendorName ?? "—",
    toWarehouse: item.toWarehouse ?? item.warehouse,
    dispatchDate: item.dispatchDate ?? item.grnDate,
    products: "—",
    dispatchedQty: item.receivedQty,
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
  const [grnFilters, setGrnFilters] = useState<FilterState>({});
  const [grnSort, setGrnSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(10);
  const [pendingCount, setPendingCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);

  const tabContext = useMemo(
    () => getStockTransferSubTabApiContext(subTab),
    [subTab],
  );

  const { items, total, loading } = useGrnListData({
    tabContext,
    filters: grnFilters,
    sort: grnSort,
    page: grnPage,
    pageSize: grnPageSize,
    destinationWarehouse,
  });

  const rows = useMemo(() => items.map(mapToStockTransferRow), [items]);

  useEffect(() => {
    setGrnPage(1);
  }, [destinationWarehouse, subTab, grnFilters, grnPageSize]);

  useEffect(() => {
    setGrnPage(1);
  }, [grnSort.key, grnSort.direction]);

  useEffect(() => {
    if (subTab === "pending") {
      setPendingCount(total);
    } else {
      setReceivedCount(total);
    }
  }, [subTab, total]);

  const stockTransferColumns = useMemo(() => {
    const cols: ColumnConfig<StockTransferGrnRow>[] = [
      {
        key: "stockTransferNo",
        header: "Stock Transfer No.",
        sortable: true,
        width: "140px",
        render: (_val, row) => (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.stockTransferNo}</span>
        ),
      },
      {
        key: "fromWarehouse",
        header: "From Warehouse",
        sortable: true,
        width: "140px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.fromWarehouse}</span>,
      },
      {
        key: "toWarehouse",
        header: "To Warehouse",
        sortable: true,
        width: "140px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.toWarehouse}</span>,
      },
      {
        key: "dispatchDate",
        header: subTab === "pending" ? "Dispatch Date" : "Received Date",
        sortable: true,
        width: "120px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.dispatchDate}</span>,
      },
      {
        key: "products",
        header: "Products",
        sortable: false,
        width: "160px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.products}</span>,
      },
      {
        key: "dispatchedQty",
        header: subTab === "pending" ? "Dispatched Qty" : "Received Qty",
        sortable: true,
        align: "right",
        width: "110px",
        render: (_val, row) => {
          const qty = subTab === "pending" ? row.dispatchedQty : row.receivedQty;
          return <span className="text-xs font-medium tabular-nums">{qty.toLocaleString()}</span>;
        },
      },
    ];

    if (subTab === "received") {
      cols.push({
        key: "displayStatus",
        header: "Status",
        sortable: true,
        width: "140px",
        render: (val: string) => {
          const cfg =
            ST_GRN_STATUS_BADGE[val as keyof typeof ST_GRN_STATUS_BADGE] ??
            ST_GRN_STATUS_BADGE["Pending Receipt"];
          return (
            <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
              {cfg.label}
            </span>
          );
        },
      });
    }

    return cols;
  }, [subTab]);

  const stockTransferActions: ActionItemConfig<StockTransferGrnRow>[] = [
    {
      label: "View GRN",
      action: "view",
      icon: Eye,
      onClick: (row) => {
        if (row.grnId) router.push(`/warehouse/grn/stock-transfer/${row.grnId}`);
      },
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

      <MasterListing<StockTransferGrnRow>
        columns={stockTransferColumns}
        data={rows}
        loading={loading}
        totalRecords={total}
        page={grnPage}
        pageSize={grnPageSize}
        onPageChange={setGrnPage}
        onPageSizeChange={setGrnPageSize}
        onFilterChange={setGrnFilters}
        onSortChange={setGrnSort}
        actions={stockTransferActions}
        emptyMessage={subTab === "pending" ? "No pending stock transfers found" : "No received stock transfers found"}
        searchPlaceholder="Search stock transfer..."
      />
    </div>
  );
}
