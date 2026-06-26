"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2 } from "lucide-react";
import { getGrnRecords } from "./mock-data";
import { getQcRecords } from "../qc/mock-data";
import { GrnRecord } from "./types";
import { QcRecord } from "../qc/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

type GrnListingRow = GrnRecord & {
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
};

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
  draft: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Draft" },
  submitted: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Submitted" },
  qc_pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "QC Pending" },
  qc_completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed" },
};

export function GrnListing() {
  const router = useRouter();
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [qcList, setQcList] = useState<QcRecord[]>([]);

  // Filtering states
  const [grnFilters, setGrnFilters] = useState<FilterState>({});
  const [grnSort, setGrnSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(10);

  // Loading lists
  useEffect(() => {
    setGrnList(getGrnRecords());
    setQcList(getQcRecords());
  }, []);

  const grnListingRows = useMemo(
    () => grnList.map((g) => enrichGrnRow(g, qcList)),
    [grnList, qcList],
  );

  // Filter & Sort GRN list client-side
  const processedGrns = useMemo(() => {
    let result = [...grnListingRows];
    Object.keys(grnFilters).forEach((key) => {
      const val = grnFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.grnNo.toLowerCase().includes(q) ||
          item.poNumber.toLowerCase().includes(q) ||
          item.vendorName.toLowerCase().includes(q)
        );
      } else if (key === "grnNo" || key === "poNumber" || key === "vendorName") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof GrnListingRow]).toLowerCase().includes(q));
      } else if (key === "warehouse" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof GrnRecord])));
      } else if (key === "grnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.grnDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.grnDate <= range.toDate);
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

  const paginatedGrns = useMemo(() => {
    const start = (grnPage - 1) * grnPageSize;
    return processedGrns.slice(start, start + grnPageSize);
  }, [processedGrns, grnPage, grnPageSize]);

  // GRN Column Configurations
  const grnColumns: ColumnConfig<GrnListingRow>[] = [
    {
      key: "grnNo",
      header: "GRN No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => (
        <Link href={`/warehouse/grnqc/grn/view/${row.id}`} className="block group/name">
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">{row.grnNo}</span>
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
      render: (val, row) => (
        <span className="font-mono text-xs text-foreground">{row.poNumber}</span>
      ),
    },
    {
      key: "vendorName",
      header: "Supplier",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <span className="text-xs text-foreground">{row.vendorName}</span>,
    },
    {
      key: "receivedQty",
      header: "Received Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums text-foreground">{val != null ? val.toLocaleString() : "—"}</span>,
    },
    {
      key: "acceptedQty",
      header: "Accepted Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums text-foreground">{val != null ? val.toLocaleString() : "—"}</span>,
    },
    {
      key: "rejectedQty",
      header: "Rejected Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums text-foreground">{val != null ? val.toLocaleString() : "—"}</span>,
    },
    {
      key: "grnDate",
      header: "GRN Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "140px",
      render: (val, row) => <span className="text-xs text-foreground">{row.grnDate}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "QC Pending", value: "qc_pending" },
        { label: "QC Completed", value: "qc_completed" },
      ],
      width: "135px",
      render: (val: any) => {
        const cfg = GRN_STATUS_CONFIG[val as keyof typeof GRN_STATUS_CONFIG] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown" };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  // Action Configurations for GRN
  const grnActions: ActionItemConfig<GrnListingRow>[] = [
    {
      label: "View Detail",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grnqc/grn/view/${row.id}`),
    },
    {
      label: "Generate QC",
      action: "generate_qc",
      icon: FileCheck2,
      onClick: (row) => {
        if (row.status === "draft") {
          alert("This GRN is currently in draft state. Please submit the GRN before performing quality control.");
          return;
        }
        router.push(`/warehouse/grnqc/qc/create?grnId=${row.id}`);
      },
    },
  ];

  return (
    <MasterListing<GrnListingRow>
      columns={grnColumns}
      data={paginatedGrns}
      totalRecords={processedGrns.length}
      page={grnPage}
      pageSize={grnPageSize}
      onPageChange={setGrnPage}
      onPageSizeChange={setGrnPageSize}
      onSortChange={setGrnSort}
      onFilterChange={setGrnFilters}
      actions={grnActions}
      onAdd={() => router.push("/warehouse/grnqc/grn/create")}
      addLabel="Generate GRN"
      emptyMessage="GRN records"
      searchPlaceholder="Search GRN..."
    />
  );
}
