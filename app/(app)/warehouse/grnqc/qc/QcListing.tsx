"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { getQcRecords } from "./mock-data";
import { QcRecord } from "./types";
import { useRouter } from "next/navigation";
import Link from "next/link";

const QC_STATUS_CONFIG = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export function QcListing() {
  const router = useRouter();
  const [qcList, setQcList] = useState<QcRecord[]>([]);

  // Filtering states
  const [qcFilters, setQcFilters] = useState<FilterState>({});
  const [qcSort, setQcSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPage, setQcPage] = useState(1);
  const [qcPageSize, setQcPageSize] = useState(10);

  // Loading lists
  useEffect(() => {
    setQcList(getQcRecords());
  }, []);

  // Filter & Sort QC list client-side
  const processedQcs = useMemo(() => {
    let result = [...qcList];
    Object.keys(qcFilters).forEach((key) => {
      const val = qcFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.qcNo.toLowerCase().includes(q) ||
          item.grnNo.toLowerCase().includes(q) ||
          (item.poNumber ?? "").toLowerCase().includes(q) ||
          item.vendorName.toLowerCase().includes(q)
        );
      } else if (key === "qcNo" || key === "grnNo" || key === "vendorName") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof QcRecord]).toLowerCase().includes(q));
      } else if (key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof QcRecord])));
      } else if (key === "inspectionDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.inspectionDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.inspectionDate <= range.toDate);
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
  }, [qcList, qcFilters, qcSort]);

  const paginatedQcs = useMemo(() => {
    const start = (qcPage - 1) * qcPageSize;
    return processedQcs.slice(start, start + qcPageSize);
  }, [processedQcs, qcPage, qcPageSize]);

  // QC Column Configurations
  const qcColumns: ColumnConfig<QcRecord>[] = [
    {
      key: "qcNo",
      header: "QC No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => (
        <Link href={`/warehouse/grnqc/qc/view/${row.id}`} className="block group/name">
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">{row.qcNo}</span>
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
      render: (val, row) => (
        <span className="font-mono text-xs text-foreground">{row.grnNo}</span>
      ),
    },
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <span className="font-mono text-xs text-foreground">{row.poNumber || "—"}</span>
      ),
    },
    {
      key: "vendorName",
      header: "Vendor",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <span className="text-xs text-foreground">{row.vendorName}</span>,
    },
    {
      key: "inspectionDate",
      header: "Inspection Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "145px",
      render: (val, row) => <span className="text-xs text-foreground">{row.inspectionDate}</span>,
    },
    {
      key: "totalAcceptedQty",
      header: "Total Accepted Qty",
      sortable: true,
      align: "right",
      width: "140px",
      render: (val) => <span className="text-xs font-medium tabular-nums text-foreground">{val != null ? val.toLocaleString() : "—"}</span>,
    },
    {
      key: "totalRejectedQty",
      header: "Total Rejected Qty",
      sortable: true,
      align: "right",
      width: "140px",
      render: (val) => <span className="text-xs font-medium tabular-nums text-foreground">{val != null ? val.toLocaleString() : "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Pending", value: "pending" },
        { label: "Completed", value: "completed" },
      ],
      width: "120px",
      render: (val: any) => {
        const cfg = QC_STATUS_CONFIG[val as keyof typeof QC_STATUS_CONFIG] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown" };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  // Action Configurations for QC
  const qcActions: ActionItemConfig<QcRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grnqc/qc/view/${row.id}`),
    },
  ];

  return (
    <MasterListing<QcRecord>
      columns={qcColumns}
      data={paginatedQcs}
      totalRecords={processedQcs.length}
      page={qcPage}
      pageSize={qcPageSize}
      onPageChange={setQcPage}
      onPageSizeChange={setQcPageSize}
      onSortChange={setQcSort}
      onFilterChange={setQcFilters}
      actions={qcActions}
      emptyMessage="QC records"
      searchPlaceholder="Search QC..."
    />
  );
}
