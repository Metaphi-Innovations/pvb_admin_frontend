"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, ClipboardCheck } from "lucide-react";
import { getQcRecords } from "../mock-data";
import { QcRecord, QcStatus } from "../types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQcSourceType } from "@/lib/warehouse/grn-source";

type QcTab = "pending" | "completed";
type QcSalesReturnRow = QcRecord;

const QC_STATUS_CONFIG: Record<QcStatus, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export function SalesReturnQcListing() {
  const router = useRouter();
  const [qcList, setQcList] = useState<QcRecord[]>([]);
  const [activeTab, setActiveTab] = useState<QcTab>("pending");

  const [qcFilters, setQcFilters] = useState<FilterState>({});
  const [qcSort, setQcSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPage, setQcPage] = useState(1);
  const [qcPageSize, setQcPageSize] = useState(10);

  useEffect(() => {
    setQcList(getQcRecords());
  }, []);

  useEffect(() => {
    setQcPage(1);
  }, [activeTab]);

  const salesReturnQcs = useMemo(
    () => qcList.filter((q) => getQcSourceType(q) === "sales_return"),
    [qcList],
  );

  const processedSalesReturnQcs = useMemo(() => {
    let result = [...salesReturnQcs];

    result = result.filter((item) => item.status === activeTab);

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
  }, [salesReturnQcs, qcFilters, qcSort, activeTab]);

  const paginatedSalesReturn = useMemo(() => {
    const start = (qcPage - 1) * qcPageSize;
    return processedSalesReturnQcs.slice(start, start + qcPageSize);
  }, [processedSalesReturnQcs, qcPage, qcPageSize]);

  const salesReturnColumns: ColumnConfig<QcSalesReturnRow>[] = [
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
      header: "Sales Return No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.poNumber || "—"}</span>,
    },
    {
      key: "vendorName",
      header: "Customer",
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
      header: "Returned Qty",
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

  const salesReturnActions: ActionItemConfig<QcSalesReturnRow>[] = [
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

      <MasterListing<QcSalesReturnRow>
        data={paginatedSalesReturn}
        columns={salesReturnColumns}
        actions={salesReturnActions}
        totalRecords={processedSalesReturnQcs.length}
        page={qcPage}
        pageSize={qcPageSize}
        onPageChange={setQcPage}
        onPageSizeChange={setQcPageSize}
        currentFilters={qcFilters}
        onFilterChange={setQcFilters}
        currentSort={qcSort}
        onSortChange={setQcSort}
        searchPlaceholder="Search QC or GRN..."
      />
    </div>
  );
}
