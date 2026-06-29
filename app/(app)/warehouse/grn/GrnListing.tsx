"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2, PackageCheck } from "lucide-react";
import { getGrnRecords } from "./mock-data";
import { getQcRecords } from "@/app/(app)/warehouse/qc/mock-data";
import { GrnRecord } from "./types";
import { QcRecord } from "@/app/(app)/warehouse/qc/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getDispatchedStockTransfersForGrn,
  getStockTransferDispatchLines,
} from "@/app/(app)/sales/stock-transfer/warehouse-receipt-sync";
import {
  DEFAULT_DESTINATION_WAREHOUSE,
  getGrnSourceType,
  getStockTransferGrnDisplayStatus,
  ST_GRN_STATUS_BADGE,
  type GrnSourceFilter,
} from "@/lib/warehouse/grn-source";
import { WAREHOUSE_OPTIONS } from "@/app/(app)/warehouse/dispatch/constants";

type GrnListingRow = GrnRecord & {
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
};

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

const SOURCE_TABS: { id: GrnSourceFilter; label: string }[] = [
  { id: "purchase", label: "Purchase" },
  { id: "stock_transfer", label: "Stock Transfer" },
];

function enrichGrnRow(grn: GrnRecord, qcs: QcRecord[]): GrnListingRow {
  const receivedQty = grn.items.reduce((s, it) => s + (it.receivedQty ?? 0), 0);
  const qc = qcs.find((q) => q.grnNo === grn.grnNo && q.status === "completed");
  return {
    ...grn,
    receivedQty,
    acceptedQty: qc?.totalAcceptedQty ?? 0,
    rejectedQty: qc?.totalRejectedQty ?? 0,
  };
}

const GRN_STATUS_CONFIG = {
  pending_qc: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  qc_in_progress: { bg: "bg-navy-50 text-navy-700 border-navy-200", label: "QC In Progress" },
  qc_completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed" },
};

function summarizeProducts(names: string[]): string {
  const unique = [...new Set(names)];
  if (unique.length <= 2) return unique.join(", ");
  return `${unique.slice(0, 2).join(", ")} +${unique.length - 2}`;
}

function buildStockTransferRows(
  grns: GrnRecord[],
  destinationWarehouse: string,
): StockTransferGrnRow[] {
  const stGrns = grns.filter((g) => g.sourceType === "stock_transfer");
  const warehouseFilter =
    destinationWarehouse === "All" ? DEFAULT_DESTINATION_WAREHOUSE : destinationWarehouse;

  const pendingTransfers = getDispatchedStockTransfersForGrn(warehouseFilter).map((transfer) => {
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

  const savedRows = stGrns
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

  return [...pendingTransfers, ...savedRows];
}

export function GrnListing() {
  const router = useRouter();
  const [sourceFilter, setSourceFilter] = useState<GrnSourceFilter>("purchase");
  const [destinationWarehouse, setDestinationWarehouse] = useState(DEFAULT_DESTINATION_WAREHOUSE);
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [qcList, setQcList] = useState<QcRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [grnFilters, setGrnFilters] = useState<FilterState>({});
  const [grnSort, setGrnSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(10);

  useEffect(() => {
    setGrnList(getGrnRecords());
    setQcList(getQcRecords());
  }, [refreshKey]);

  useEffect(() => {
    setGrnPage(1);
  }, [sourceFilter, destinationWarehouse]);

  const grnListingRows = useMemo(
    () =>
      grnList
        .filter((g) => getGrnSourceType(g) === "purchase")
        .map((g) => enrichGrnRow(g, qcList)),
    [grnList, qcList],
  );

  const stockTransferRows = useMemo(
    () => buildStockTransferRows(grnList, destinationWarehouse),
    [grnList, destinationWarehouse, refreshKey],
  );

  const processedGrns = useMemo(() => {
    let result = [...grnListingRows];
    Object.keys(grnFilters).forEach((key) => {
      const val = grnFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (item) =>
            item.grnNo.toLowerCase().includes(q) ||
            item.poNumber.toLowerCase().includes(q) ||
            item.vendorName.toLowerCase().includes(q),
        );
      } else if (key === "grnNo" || key === "poNumber" || key === "vendorName") {
        const q = (val as string).toLowerCase();
        result = result.filter((item) =>
          String(item[key as keyof GrnListingRow]).toLowerCase().includes(q),
        );
      } else if (key === "warehouse" || key === "status") {
        const selected = val as string[];
        result = result.filter((item) => selected.includes(String(item[key as keyof GrnRecord])));
      } else if (key === "grnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter((item) => item.grnDate >= range.fromDate);
        if (range.toDate) result = result.filter((item) => item.grnDate <= range.toDate);
      }
    });

    if (grnSort.key && grnSort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[grnSort.key as keyof GrnListingRow] || "");
        const valB = String(b[grnSort.key as keyof GrnListingRow] || "");
        return grnSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [grnListingRows, grnFilters, grnSort]);

  const processedStockTransferRows = useMemo(() => {
    let result = [...stockTransferRows];
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
    return result;
  }, [stockTransferRows, grnFilters]);

  const paginatedGrns = useMemo(() => {
    const start = (grnPage - 1) * grnPageSize;
    const data = sourceFilter === "purchase" ? processedGrns : processedStockTransferRows;
    return data.slice(start, start + grnPageSize);
  }, [processedGrns, processedStockTransferRows, grnPage, grnPageSize, sourceFilter]);

  const totalRecords =
    sourceFilter === "purchase" ? processedGrns.length : processedStockTransferRows.length;

  const grnColumns: ColumnConfig<GrnListingRow>[] = [
    {
      key: "grnNo",
      header: "GRN No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (_val, row) => (
        <Link href={`/warehouse/grn/view/${row.id}`} className="block group/name">
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">
            {row.grnNo}
          </span>
        </Link>
      ),
    },
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.poNumber}</span>,
    },
    {
      key: "vendorName",
      header: "Supplier",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.vendorName}</span>,
    },
    {
      key: "receivedQty",
      header: "Received Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {val != null ? val.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "acceptedQty",
      header: "Accepted Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {val != null ? val.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "rejectedQty",
      header: "Rejected Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {val != null ? val.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "grnDate",
      header: "GRN Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "140px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.grnDate}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Pending QC", value: "pending_qc" },
        { label: "QC In Progress", value: "qc_in_progress" },
        { label: "QC Completed", value: "qc_completed" },
      ],
      width: "135px",
      render: (val: GrnRecord["status"]) => {
        const cfg = GRN_STATUS_CONFIG[val] || {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          label: "Unknown",
        };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  const stockTransferColumns: ColumnConfig<StockTransferGrnRow>[] = [
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
      header: "Dispatch Date",
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
      header: "Dispatched Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums">{val.toLocaleString()}</span>,
    },
    {
      key: "receivedQty",
      header: "Received Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums">{val.toLocaleString()}</span>,
    },
    {
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
    },
  ];

  const grnActions: ActionItemConfig<GrnListingRow>[] = [
    {
      label: "View Detail",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grn/view/${row.id}`),
    },
    {
      label: "Generate QC",
      action: "generate_qc",
      icon: FileCheck2,
      onClick: (row) => {
        if (row.status === "qc_completed") {
          alert("QC is already completed for this GRN.");
          return;
        }
        router.push(`/warehouse/qc/create?grnId=${row.id}`);
      },
    },
  ];

  const stockTransferActions: ActionItemConfig<StockTransferGrnRow>[] = [
    {
      label: "Receive Transfer",
      action: "receive",
      icon: PackageCheck,
      onClick: (row) => {
        if (row.rowType === "pending_transfer" && row.transferId) {
          router.push(`/warehouse/grn/receive-transfer/${row.transferId}`);
        }
      },
      hide: (row) => row.rowType !== "pending_transfer",
    },
    {
      label: "View GRN",
      action: "view",
      icon: Eye,
      onClick: (row) => {
        if (row.grnId) router.push(`/warehouse/grn/view/${row.grnId}`);
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

  const sourceCounts = useMemo(
    () => ({
      purchase: grnListingRows.length,
      stock_transfer: stockTransferRows.length,
    }),
    [grnListingRows.length, stockTransferRows.length],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSourceFilter(tab.id)}
            className={cn(
              "h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5",
              sourceFilter === tab.id
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                sourceFilter === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {sourceCounts[tab.id]}
            </span>
          </button>
        ))}

        {sourceFilter === "stock_transfer" && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Destination warehouse:</span>
            <select
              value={destinationWarehouse}
              onChange={(e) => {
                setDestinationWarehouse(e.target.value);
                setRefreshKey((k) => k + 1);
              }}
              className="h-8 px-2.5 text-xs border border-border rounded-lg bg-background"
            >
              {WAREHOUSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {sourceFilter === "purchase" ? (
        <MasterListing<GrnListingRow>
          columns={grnColumns}
          data={paginatedGrns as GrnListingRow[]}
          totalRecords={totalRecords}
          page={grnPage}
          pageSize={grnPageSize}
          onPageChange={setGrnPage}
          onPageSizeChange={setGrnPageSize}
          onSortChange={setGrnSort}
          onFilterChange={setGrnFilters}
          actions={grnActions}
          onAdd={() => router.push("/warehouse/grn/create")}
          addLabel="Generate GRN"
          emptyMessage=""
          searchPlaceholder="Search GRN..."
        />
      ) : (
        <MasterListing<StockTransferGrnRow>
          columns={stockTransferColumns}
          data={paginatedGrns as StockTransferGrnRow[]}
          totalRecords={totalRecords}
          page={grnPage}
          pageSize={grnPageSize}
          onPageChange={setGrnPage}
          onPageSizeChange={setGrnPageSize}
          onSortChange={setGrnSort}
          onFilterChange={setGrnFilters}
          actions={stockTransferActions}
          emptyMessage=""
          searchPlaceholder="Search stock transfer..."
        />
      )}
    </div>
  );
}
