"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2, PackageCheck } from "lucide-react";
import { getGrnRecords } from "../shared/mock-data";
import { GrnRecord } from "../shared/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getDispatchedStockTransfersForGrn,
  getStockTransferDispatchLines,
} from "@/app/(app)/sales/stock-transfer/warehouse-receipt-sync";
import {
  DEFAULT_DESTINATION_WAREHOUSE,
  getStockTransferGrnDisplayStatus,
  ST_GRN_STATUS_BADGE,
} from "@/lib/warehouse/grn-source";

type StockTransferGrnRow = {
  id: string;
  rowType: "pending_transfer" | "grn_record";
  transferId?: number;
  grnId?: string;
  stockTransferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  dispatchDate: string;
  products: string;
  dispatchedQty: number;
  receivedQty: number;
  displayStatus: string;
  grnRecord?: GrnRecord;
};

function summarizeProducts(names: string[]): string {
  const unique = [...new Set(names)];
  if (unique.length <= 2) return unique.join(", ");
  return `${unique.slice(0, 2).join(", ")} +${unique.length - 2}`;
}

function buildStockTransferRows(
  grns: GrnRecord[],
  destinationWarehouse: string,
): { pending: StockTransferGrnRow[]; received: StockTransferGrnRow[] } {
  const stGrns = grns.filter((g) => g.sourceType === "stock_transfer");
  const warehouseFilter = destinationWarehouse || "All";

  const pending = getDispatchedStockTransfersForGrn(warehouseFilter).map((transfer) => {
    const lines = getStockTransferDispatchLines(transfer);
    const dispatchedQty = lines.reduce((s, l) => s + l.dispatchedQty, 0);
    return {
      id: `pending-${transfer.id}`,
      rowType: "pending_transfer" as const,
      transferId: transfer.id,
      stockTransferNo: transfer.transferNumber,
      fromWarehouse: transfer.sourceWarehouseName,
      toWarehouse: transfer.targetWarehouseName,
      dispatchDate: transfer.updatedDate || transfer.transferDate,
      products: summarizeProducts(lines.map((l) => l.productName)),
      dispatchedQty,
      receivedQty: 0,
      displayStatus: getStockTransferGrnDisplayStatus({ isPendingTransfer: true }),
    };
  });

  const received = stGrns
    .filter((g) => {
      if (destinationWarehouse === "All") return true;
      return (g.toWarehouse ?? g.warehouse) === destinationWarehouse;
    })
    .map((grn) => {
      const dispatchedQty = grn.items.reduce((s, it) => s + (it.orderedQty ?? it.pendingQty ?? 0), 0);
      const receivedQty = grn.items.reduce((s, it) => s + (it.receivedQty ?? 0), 0);
      const displayStatus = getStockTransferGrnDisplayStatus({
        isPendingTransfer: false,
        receiptStatus: grn.receiptStatus,
        grnStatus: grn.status,
      });

      return {
        id: grn.id,
        rowType: "grn_record" as const,
        grnId: grn.id,
        stockTransferNo: grn.stockTransferNo ?? grn.poNumber,
        fromWarehouse: grn.fromWarehouse ?? grn.vendorName,
        toWarehouse: grn.toWarehouse ?? grn.warehouse,
        dispatchDate: grn.dispatchDate ?? grn.grnDate,
        products: summarizeProducts(grn.items.map((i) => i.productName)),
        dispatchedQty,
        receivedQty,
        displayStatus,
        grnRecord: grn,
      };
    });

  return { pending, received };
}

interface StockTransferListingProps {
  destinationWarehouse: string;
}

export function StockTransferListing({ destinationWarehouse }: StockTransferListingProps) {
  const router = useRouter();
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [subTab, setSubTab] = useState<"pending" | "received">("pending");

  const [grnFilters, setGrnFilters] = useState<FilterState>({});
  const [grnSort, setGrnSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(10);

  useEffect(() => {
    setGrnList(getGrnRecords());
  }, []);

  useEffect(() => {
    setGrnPage(1);
  }, [destinationWarehouse, subTab]);

  const { pending, received } = useMemo(
    () => buildStockTransferRows(grnList, destinationWarehouse),
    [grnList, destinationWarehouse],
  );

  const activeRows = useMemo(() => {
    return subTab === "pending" ? pending : received;
  }, [subTab, pending, received]);

  const processedRows = useMemo(() => {
    let result = [...activeRows];
    const search = grnFilters.search as string | undefined;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (row) =>
          row.stockTransferNo.toLowerCase().includes(q) ||
          row.fromWarehouse.toLowerCase().includes(q) ||
          row.toWarehouse.toLowerCase().includes(q) ||
          row.products.toLowerCase().includes(q),
      );
    }

    if (grnSort.key && grnSort.direction !== "none") {
      result.sort((a, b) => {
        const key = grnSort.key as keyof StockTransferGrnRow;
        const valA = a[key];
        const valB = b[key];
        if (typeof valA === "number" && typeof valB === "number") {
          return grnSort.direction === "asc" ? valA - valB : valB - valA;
        }
        const strA = String(valA || "");
        const strB = String(valB || "");
        return grnSort.direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }
    return result;
  }, [activeRows, grnFilters, grnSort]);

  const paginatedRows = useMemo(() => {
    const start = (grnPage - 1) * grnPageSize;
    return processedRows.slice(start, start + grnPageSize);
  }, [processedRows, grnPage, grnPageSize]);

  const totalRecords = processedRows.length;

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
      label: "Create GRN",
      action: "receive",
      icon: PackageCheck,
      onClick: (row) => {
        if (row.rowType === "pending_transfer" && row.transferId) {
          router.push(`/warehouse/grn/stock-transfer/create?dispatchId=${row.transferId}`);
        }
      },
      hide: (row) => row.rowType !== "pending_transfer",
    },
    {
      label: "View Dispatch",
      action: "view_dispatch",
      icon: Eye,
      onClick: (row) => {
        if (row.rowType === "pending_transfer" && row.transferId) {
          router.push(`/warehouse/grn/stock-transfer/dispatch-view/${row.transferId}`);
        }
      },
      hide: (row) => row.rowType !== "pending_transfer",
    },
    {
      label: "View GRN",
      action: "view",
      icon: Eye,
      onClick: (row) => {
        if (row.grnId) router.push(`/warehouse/grn/stock-transfer/${row.grnId}`);
      },
      hide: (row) => row.rowType !== "grn_record",
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
      hide: (row) =>
        row.rowType !== "grn_record" || row.grnRecord?.status === "qc_completed",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs switch */}
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
          Pending ({pending.length})
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
          Received ({received.length})
        </button>
      </div>

      <MasterListing<StockTransferGrnRow>
        columns={stockTransferColumns}
        data={paginatedRows}
        totalRecords={totalRecords}
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
