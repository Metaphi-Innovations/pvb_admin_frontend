"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, ClipboardCheck, Edit3 } from "lucide-react";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import { QcRecord, QcStatus } from "../types";
import { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getQcSourceType } from "@/lib/warehouse/grn-source";
import { QcService } from "@/services/qc.service";

type QcTab = "pending" | "completed";
type QcStockTransferRow = QcRecord;

const QC_STATUS_CONFIG: Record<QcStatus, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export function StockTransferQcListing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destinationWarehouse = searchParams.get("destinationWarehouse") || "All";
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [activeTab, setActiveTab] = useState<QcTab>("pending");

  const [qcFilters, setQcFilters] = useState<FilterState>({});
  const [qcSort, setQcSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPage, setQcPage] = useState(1);
  const [qcPageSize, setQcPageSize] = useState(10);

  const [apiQcList, setApiQcList] = useState<QcRecord[]>([]);

  useEffect(() => {
    setGrnList(getGrnRecords());
  }, []);

  useEffect(() => {
    setQcPage(1);
  }, [activeTab]);

  useEffect(() => {
    const fetchQcs = async () => {
      try {
        const filters: any = {};
        filters.source_type = "STOCK_TRANSFER";
        if (destinationWarehouse && destinationWarehouse !== "All") {
          if (activeTab === "pending") {
            filters.warehouse = filters.warehouse || {};
            filters.warehouse.warehouse_name = destinationWarehouse;
          } else {
            filters.grn = filters.grn || {};
            filters.grn.warehouse = filters.grn.warehouse || {};
            filters.grn.warehouse.warehouse_name = destinationWarehouse;
          }
        }

        const fetchMethod = activeTab === "pending" ? QcService.listPending : QcService.list;
        const res = await fetchMethod({
          page: 1,
          page_size: 100,
          filters,
        });

        setApiQcList(res.data || []);
      } catch (err) {
        console.error("Failed to fetch stock transfer QCs:", err);
      }
    };

    fetchQcs();
  }, [activeTab, destinationWarehouse]);

  const processedStockTransferRows = useMemo(() => {
    let result = [...apiQcList];

    result = result.filter((item) => item.status === activeTab);

    if (destinationWarehouse && destinationWarehouse !== "All") {
      result = result.filter(
        (item) => (item.toWarehouse || item.warehouse || "").toLowerCase() === destinationWarehouse.toLowerCase()
      );
    }

    const search = qcFilters.search as string | undefined;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (row) =>
          row.qcNo.toLowerCase().includes(q) ||
          row.grnNo.toLowerCase().includes(q) ||
          (row.stockTransferNo && row.stockTransferNo.toLowerCase().includes(q)) ||
          row.items.some(it =>
            it.productName.toLowerCase().includes(q) ||
            (it.productCode && it.productCode.toLowerCase().includes(q)) ||
            it.batchNumber.toLowerCase().includes(q)
          )
      );
    }

    if (qcSort.key && qcSort.direction !== "none") {
      result.sort((a, b) => {
        let valA = "";
        let valB = "";

        if (qcSort.key === "receivedQty") {
          const qtyA = a.totalReceivedQty ?? a.items.reduce((s, it) => s + it.receivedQty, 0);
          const qtyB = b.totalReceivedQty ?? b.items.reduce((s, it) => s + it.receivedQty, 0);
          return qcSort.direction === "asc" ? qtyA - qtyB : qtyB - qtyA;
        } else if (qcSort.key === "stockTransferNo") {
          valA = a.stockTransferNo ?? a.poNumber ?? "";
          valB = b.stockTransferNo ?? b.poNumber ?? "";
        } else if (qcSort.key === "fromWarehouse") {
          valA = a.fromWarehouse ?? a.vendorName ?? "";
          valB = b.fromWarehouse ?? b.vendorName ?? "";
        } else if (qcSort.key === "toWarehouse") {
          valA = a.toWarehouse ?? a.warehouse ?? "";
          valB = b.toWarehouse ?? b.warehouse ?? "";
        } else {
          valA = String((a as any)[qcSort.key] || "");
          valB = String((b as any)[qcSort.key] || "");
        }
        return qcSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return result;
  }, [apiQcList, qcFilters, qcSort, activeTab, destinationWarehouse]);

  const paginatedStockTransfer = useMemo(() => {
    const start = (qcPage - 1) * qcPageSize;
    return processedStockTransferRows.slice(start, start + qcPageSize);
  }, [processedStockTransferRows, qcPage, qcPageSize]);

  const stockTransferColumns: ColumnConfig<QcStockTransferRow>[] = [
    {
      key: "stockTransferNo",
      header: "Stock Transfer No.",
      sortable: true,
      width: "140px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-brand-700">{row.stockTransferNo || row.poNumber || "—"}</span>
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
      width: "140px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.fromWarehouse || row.vendorName || "—"}</span>,
    },
    {
      key: "toWarehouse",
      header: "To Warehouse",
      sortable: true,
      width: "140px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.toWarehouse || row.warehouse || "—"}</span>,
    },
    {
      key: "products",
      header: "Products",
      sortable: false,
      width: "160px",
      render: (_val, row) => {
        const productNames = row.items.map((it) => it.productName).filter(Boolean);
        const productsLabel =
          productNames.length === 0
            ? "—"
            : productNames.length <= 2
            ? productNames.join(", ")
            : `${productNames.slice(0, 2).join(", ")} +${productNames.length - 2}`;
        return <span className="text-xs text-foreground">{productsLabel}</span>;
      },
    },
    {
      key: "receivedQty",
      header: "Received Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (_val, row) => {
        const totalReceived = row.totalReceivedQty ?? row.items.reduce((sum, it) => sum + it.receivedQty, 0);
        return <span className="text-xs font-medium tabular-nums">{totalReceived.toLocaleString()}</span>;
      },
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

  const stockTransferActions: ActionItemConfig<QcStockTransferRow>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/qc/view/${row.id}`),
      hide: (row) => row.status === "pending",
    },
    {
      label: "Perform QC",
      action: "inspect",
      icon: ClipboardCheck,
      onClick: (row) => router.push(`/warehouse/qc/create?grnId=${row.id}`),
      hide: (row) => row.status !== "pending",
    },
    {
      label: "Edit QC",
      action: "edit",
      icon: Edit3,
      onClick: (row) => router.push(`/warehouse/qc/create?qcId=${row.id}&edit=true`),
      hide: (row) => row.status === "pending",
      disabled: (row) => !row.isEditable,
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

      <MasterListing<QcStockTransferRow>
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
