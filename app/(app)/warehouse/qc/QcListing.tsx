"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, ClipboardCheck } from "lucide-react";
import { getQcRecords } from "./mock-data";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import { QcRecord, QcStatus } from "./types";
import { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getQcSourceType, type GrnSourceFilter } from "@/lib/warehouse/grn-source";

type QcTab = "all" | QcStatus;

type QcPurchaseRow = QcRecord;

type QcStockTransferLineRow = {
  id: string;
  qcId: string;
  qcNo: string;
  grnNo: string;
  stockTransferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  productName: string;
  productCode: string;
  batchNumber: string;
  expiryDate: string;
  receivedQty: number;
  status: QcStatus;
};

const QC_TABS: { id: QcTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending QC" },
  { id: "completed", label: "Completed" },
];

const SOURCE_TABS: { id: GrnSourceFilter; label: string }[] = [
  { id: "purchase", label: "Purchase" },
  { id: "stock_transfer", label: "Stock Transfer" },
];

const QC_STATUS_CONFIG: Record<QcStatus, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

function flattenStockTransferQcRows(qcs: QcRecord[], grns: GrnRecord[]): QcStockTransferLineRow[] {
  return qcs
    .filter((q) => getQcSourceType(q) === "stock_transfer")
    .flatMap((qc) =>
      qc.items.map((item, index) => {
        const grn = grns.find((g) => g.grnNo === qc.grnNo);
        const batch = grn?.batches.find(
          (b) => b.batchNumber === item.batchNumber && b.productId === item.productId,
        );
        return {
          id: `${qc.id}-${index}`,
          qcId: qc.id,
          qcNo: qc.qcNo,
          grnNo: qc.grnNo,
          stockTransferNo: qc.stockTransferNo ?? qc.poNumber ?? "—",
          fromWarehouse: qc.fromWarehouse ?? qc.vendorName,
          toWarehouse: qc.toWarehouse ?? qc.warehouse,
          productName: item.productName,
          productCode: item.productCode ?? item.productId,
          batchNumber: item.batchNumber,
          expiryDate: batch?.expDate ?? "—",
          receivedQty: item.receivedQty,
          status: qc.status,
        };
      }),
    );
}

export function QcListing() {
  const router = useRouter();
  const [sourceFilter, setSourceFilter] = useState<GrnSourceFilter>("purchase");
  const [qcList, setQcList] = useState<QcRecord[]>([]);
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [activeTab, setActiveTab] = useState<QcTab>("all");

  const [qcFilters, setQcFilters] = useState<FilterState>({});
  const [qcSort, setQcSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPage, setQcPage] = useState(1);
  const [qcPageSize, setQcPageSize] = useState(10);

  useEffect(() => {
    setQcList(getQcRecords());
    setGrnList(getGrnRecords());
  }, []);

  useEffect(() => {
    setQcPage(1);
  }, [activeTab, sourceFilter]);

  const purchaseQcs = useMemo(
    () => qcList.filter((q) => getQcSourceType(q) === "purchase"),
    [qcList],
  );

  const stockTransferLineRows = useMemo(
    () => flattenStockTransferQcRows(qcList, grnList),
    [qcList, grnList],
  );

  const processedPurchaseQcs = useMemo(() => {
    let result = [...purchaseQcs];

    if (activeTab !== "all") {
      result = result.filter((item) => item.status === activeTab);
    }

    Object.keys(qcFilters).forEach((key) => {
      const val = qcFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (item) =>
            item.qcNo.toLowerCase().includes(q) ||
            item.grnNo.toLowerCase().includes(q) ||
            (item.poNumber ?? "").toLowerCase().includes(q) ||
            item.vendorName.toLowerCase().includes(q) ||
            item.warehouse.toLowerCase().includes(q),
        );
      } else if (key === "qcNo" || key === "grnNo" || key === "vendorName") {
        const q = (val as string).toLowerCase();
        result = result.filter((item) => String(item[key as keyof QcRecord]).toLowerCase().includes(q));
      } else if (key === "status") {
        const selected = val as string[];
        result = result.filter((item) => selected.includes(String(item.status)));
      } else if (key === "inspectionDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) {
          result = result.filter((item) => item.inspectionDate && item.inspectionDate >= range.fromDate);
        }
        if (range.toDate) {
          result = result.filter((item) => item.inspectionDate && item.inspectionDate <= range.toDate);
        }
      }
    });

    if (qcSort.key && qcSort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[qcSort.key as keyof QcRecord] || "");
        const valB = String(b[qcSort.key as keyof QcRecord] || "");
        return qcSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [purchaseQcs, qcFilters, qcSort, activeTab]);

  const processedStockTransferRows = useMemo(() => {
    let result = [...stockTransferLineRows];

    if (activeTab !== "all") {
      result = result.filter((item) => item.status === activeTab);
    }

    const search = qcFilters.search as string | undefined;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (row) =>
          row.qcNo.toLowerCase().includes(q) ||
          row.grnNo.toLowerCase().includes(q) ||
          row.stockTransferNo.toLowerCase().includes(q) ||
          row.productName.toLowerCase().includes(q) ||
          row.productCode.toLowerCase().includes(q) ||
          row.batchNumber.toLowerCase().includes(q),
      );
    }

    return result;
  }, [stockTransferLineRows, qcFilters, activeTab]);

  const paginatedPurchase = useMemo(() => {
    const start = (qcPage - 1) * qcPageSize;
    return processedPurchaseQcs.slice(start, start + qcPageSize);
  }, [processedPurchaseQcs, qcPage, qcPageSize]);

  const paginatedStockTransfer = useMemo(() => {
    const start = (qcPage - 1) * qcPageSize;
    return processedStockTransferRows.slice(start, start + qcPageSize);
  }, [processedStockTransferRows, qcPage, qcPageSize]);

  const tabCounts = useMemo(() => {
    const base = sourceFilter === "purchase" ? purchaseQcs : stockTransferLineRows;
    return {
      all: base.length,
      pending: base.filter((q) => q.status === "pending").length,
      completed: base.filter((q) => q.status === "completed").length,
    };
  }, [sourceFilter, purchaseQcs, stockTransferLineRows]);

  const purchaseColumns: ColumnConfig<QcPurchaseRow>[] = [
    {
      key: "qcNo",
      header: "QC No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (_val, row) => (
        <Link href={`/warehouse/qc/view/${row.id}`} className="block group/name">
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">
            {row.qcNo}
          </span>
        </Link>
      ),
    },
    {
      key: "grnNo",
      header: "GRN No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.grnNo}</span>,
    },
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.poNumber || "—"}</span>,
    },
    {
      key: "vendorName",
      header: "Supplier",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "150px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.vendorName}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      width: "140px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.warehouse}</span>,
    },
    {
      key: "inspectionDate",
      header: "Inspection Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "130px",
      render: (_val, row) => (
        <span className="text-xs text-foreground">{row.inspectionDate?.trim() ? row.inspectionDate : "—"}</span>
      ),
    },
    {
      key: "totalReceivedQty",
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
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Pending QC", value: "pending" },
        { label: "Completed", value: "completed" },
      ],
      width: "130px",
      render: (val: QcStatus) => {
        const cfg = QC_STATUS_CONFIG[val] ?? {
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

  const stockTransferColumns: ColumnConfig<QcStockTransferLineRow>[] = [
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
      key: "grnNo",
      header: "GRN No.",
      sortable: true,
      width: "130px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.grnNo}</span>,
    },
    {
      key: "fromWarehouse",
      header: "From Warehouse",
      sortable: true,
      width: "130px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.fromWarehouse}</span>,
    },
    {
      key: "toWarehouse",
      header: "To Warehouse",
      sortable: true,
      width: "130px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.toWarehouse}</span>,
    },
    {
      key: "productName",
      header: "Product",
      sortable: true,
      width: "140px",
      render: (_val, row) => <span className="text-xs font-semibold text-foreground">{row.productName}</span>,
    },
    {
      key: "productCode",
      header: "SKU",
      sortable: true,
      width: "110px",
      render: (_val, row) => <span className="text-xs font-mono text-brand-700">{row.productCode}</span>,
    },
    {
      key: "batchNumber",
      header: "Batch No.",
      sortable: true,
      width: "110px",
      render: (_val, row) => <span className="text-xs font-mono text-muted-foreground">{row.batchNumber}</span>,
    },
    {
      key: "expiryDate",
      header: "Expiry Date",
      sortable: true,
      width: "110px",
      render: (_val, row) => <span className="text-xs text-muted-foreground">{row.expiryDate}</span>,
    },
    {
      key: "receivedQty",
      header: "Received Qty",
      sortable: true,
      align: "right",
      width: "100px",
      render: (val) => <span className="text-xs font-medium tabular-nums">{val.toLocaleString()}</span>,
    },
    {
      key: "status",
      header: "QC Status",
      sortable: true,
      width: "120px",
      render: (val: QcStatus) => {
        const cfg = QC_STATUS_CONFIG[val] ?? {
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

  const purchaseActions: ActionItemConfig<QcPurchaseRow>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/qc/view/${row.id}`),
    },
    {
      label: "Perform QC",
      action: "inspect",
      icon: ClipboardCheck,
      onClick: (row) => router.push(`/warehouse/qc/create?qcId=${row.id}`),
      hide: (row) => row.status !== "pending",
    },
  ];

  const stockTransferActions: ActionItemConfig<QcStockTransferLineRow>[] = [
    {
      label: "Perform QC",
      action: "inspect",
      icon: ClipboardCheck,
      onClick: (row) => router.push(`/warehouse/qc/create?qcId=${row.qcId}`),
      hide: (row) => row.status !== "pending",
    },
  ];

  const sourceCounts = useMemo(
    () => ({
      purchase: purchaseQcs.length,
      stock_transfer: stockTransferLineRows.length,
    }),
    [purchaseQcs.length, stockTransferLineRows.length],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="flex flex-wrap gap-2">
        {QC_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5",
              activeTab === tab.id
                ? "bg-navy-600 text-white border-navy-600"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {sourceFilter === "purchase" ? (
        <MasterListing<QcPurchaseRow>
          columns={purchaseColumns}
          data={paginatedPurchase}
          totalRecords={processedPurchaseQcs.length}
          page={qcPage}
          pageSize={qcPageSize}
          onPageChange={setQcPage}
          onPageSizeChange={setQcPageSize}
          onSortChange={setQcSort}
          onFilterChange={setQcFilters}
          actions={purchaseActions}
          emptyMessage=""
          searchPlaceholder="Search QC..."
        />
      ) : (
        <MasterListing<QcStockTransferLineRow>
          columns={stockTransferColumns}
          data={paginatedStockTransfer}
          totalRecords={processedStockTransferRows.length}
          page={qcPage}
          pageSize={qcPageSize}
          onPageChange={setQcPage}
          onPageSizeChange={setQcPageSize}
          onSortChange={setQcSort}
          onFilterChange={setQcFilters}
          actions={stockTransferActions}
          emptyMessage=""
          searchPlaceholder="Search stock transfer QC..."
        />
      )}
    </div>
  );
}
