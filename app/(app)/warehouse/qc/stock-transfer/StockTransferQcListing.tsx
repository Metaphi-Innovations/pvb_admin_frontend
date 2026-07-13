"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, ClipboardCheck } from "lucide-react";
import { getQcRecords } from "../mock-data";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import { QcRecord, QcStatus } from "../types";
import { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQcSourceType } from "@/lib/warehouse/grn-source";
import { QcService } from "@/services/qc.service";

type QcTab = "pending" | "completed";

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

export function StockTransferQcListing() {
  const router = useRouter();
  const [qcList, setQcList] = useState<QcRecord[]>([]);
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [activeTab, setActiveTab] = useState<QcTab>("pending");

  const [qcFilters, setQcFilters] = useState<FilterState>({});
  const [qcSort, setQcSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPage, setQcPage] = useState(1);
  const [qcPageSize, setQcPageSize] = useState(10);

  const [apiQcList, setApiQcList] = useState<QcRecord[]>([]);

  useEffect(() => {
    setQcList(getQcRecords());
    setGrnList(getGrnRecords());
  }, []);

  useEffect(() => {
    setQcPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "completed") return;

    QcService.list({ page: 1, page_size: 100 }).then((res) => {
      const stockTransferOnly = res.data.filter((q) => getQcSourceType(q) === "stock_transfer");
      setApiQcList(stockTransferOnly);
    }).catch((err) => {
      console.error("Failed to fetch completed stock transfers:", err);
    });
  }, [activeTab]);

  const stockTransferLineRows = useMemo(() => {
    const listToFlatten = activeTab === "pending" ? qcList : apiQcList;
    return flattenStockTransferQcRows(listToFlatten, grnList);
  }, [qcList, apiQcList, grnList, activeTab]);

  const processedStockTransferRows = useMemo(() => {
    let result = [...stockTransferLineRows];

    result = result.filter((item) => item.status === activeTab);

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

    if (qcSort.key && qcSort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[qcSort.key as keyof QcStockTransferLineRow] || "");
        const valB = String(b[qcSort.key as keyof QcStockTransferLineRow] || "");
        return qcSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return result;
  }, [stockTransferLineRows, qcFilters, qcSort, activeTab]);

  const paginatedStockTransfer = useMemo(() => {
    const start = (qcPage - 1) * qcPageSize;
    return processedStockTransferRows.slice(start, start + qcPageSize);
  }, [processedStockTransferRows, qcPage, qcPageSize]);

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

  const stockTransferActions: ActionItemConfig<QcStockTransferLineRow>[] = [
    {
      label: "Perform QC",
      action: "inspect",
      icon: ClipboardCheck,
      onClick: (row) => router.push(`/warehouse/qc/create?qcId=${row.qcId}`),
      hide: (row) => row.status !== "pending",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs for QC Status */}
      <div className="flex flex-wrap gap-2">
        {[{ id: "pending", label: "Pending QC" }, { id: "completed", label: "Completed" }].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as QcTab)}
            className={`h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <MasterListing<QcStockTransferLineRow>
        data={paginatedStockTransfer}
        columns={stockTransferColumns}
        actions={stockTransferActions}
        totalRecords={processedStockTransferRows.length}
        page={qcPage}
        pageSize={qcPageSize}
        onPageChange={setQcPage}
        onPageSizeChange={setQcPageSize}
        currentFilters={qcFilters}
        onFilterChange={setQcFilters}
        currentSort={qcSort}
        onSortChange={setQcSort}
        searchPlaceholder="Search QC, GRN, Transfer No or Product..."
      />
    </div>
  );
}
