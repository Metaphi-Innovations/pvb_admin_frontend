"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2 } from "lucide-react";
import { getGrnRecords } from "../shared/mock-data";
import { GrnRecord } from "../shared/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_DESTINATION_WAREHOUSE } from "@/lib/warehouse/grn-source";

interface SampleReturnListingProps {
  destinationWarehouse: string;
}

const GRN_STATUS_CONFIG = {
  pending_qc: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC" },
  qc_in_progress: { bg: "bg-navy-50 text-navy-700 border-navy-200", label: "QC In Progress" },
  qc_completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed" },
};

export function SampleReturnListing({ destinationWarehouse }: SampleReturnListingProps) {
  const router = useRouter();
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);

  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setGrnList(getGrnRecords());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [destinationWarehouse]);

  const sampleReturnRows = useMemo(() => {
    const warehouseFilter =
      destinationWarehouse === "All" ? DEFAULT_DESTINATION_WAREHOUSE : destinationWarehouse;

    return grnList.filter(
      (g) =>
        g.sourceType === "sample_return" &&
        (warehouseFilter === "All" || (g.warehouse ?? g.toWarehouse) === warehouseFilter)
    );
  }, [grnList, destinationWarehouse]);

  const processedRows = useMemo(() => {
    let result = [...sampleReturnRows];
    const search = filters.search as string | undefined;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (row) =>
          row.grnNo.toLowerCase().includes(q) ||
          (row.sampleReturnNo ?? "").toLowerCase().includes(q) ||
          (row.customerName ?? "").toLowerCase().includes(q) ||
          row.warehouse.toLowerCase().includes(q)
      );
    }

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const key = sort.key as keyof GrnRecord;
        const valA = a[key];
        const valB = b[key];
        if (typeof valA === "number" && typeof valB === "number") {
          return sort.direction === "asc" ? valA - valB : valB - valA;
        }
        const strA = String(valA || "");
        const strB = String(valB || "");
        return sort.direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }
    return result;
  }, [sampleReturnRows, filters, sort]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, page, pageSize]);

  const totalRecords = processedRows.length;

  const columns: ColumnConfig<GrnRecord>[] = [
    {
      key: "grnNo",
      header: "GRN No.",
      sortable: true,
      width: "140px",
      render: (_val, row) => (
        <Link href={`/warehouse/grn/sample-return/${row.id}`}>
          <span className="font-mono text-xs font-semibold text-brand-700 hover:text-brand-800">
            {row.grnNo}
          </span>
        </Link>
      ),
    },
    {
      key: "sampleReturnNo",
      header: "Sample Return No.",
      sortable: true,
      width: "140px",
      render: (val) => <span className="font-mono text-xs text-foreground font-medium">{val || "—"}</span>,
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      width: "160px",
      render: (val) => <span className="text-xs text-foreground">{val || "—"}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      width: "140px",
      render: (val) => <span className="text-xs text-foreground">{val}</span>,
    },
    {
      key: "grnDate",
      header: "GRN Date",
      sortable: true,
      width: "120px",
      render: (val) => <span className="text-xs text-foreground">{val}</span>,
    },
    {
      key: "totalQty",
      header: "Returned Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums">{val.toLocaleString()}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "140px",
      render: (val: string) => {
        const cfg = GRN_STATUS_CONFIG[val as keyof typeof GRN_STATUS_CONFIG] || {
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

  const actions: ActionItemConfig<GrnRecord>[] = [
    {
      label: "View GRN",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grn/sample-return/${row.id}`),
    },
    {
      label: "Perform QC",
      action: "qc",
      icon: FileCheck2,
      onClick: (row) => {
        if (row.status === "qc_completed") {
          alert("QC is already completed for this GRN.");
          return;
        }
        router.push(`/warehouse/qc/create?grnId=${row.id}`);
      },
      hide: (row) => row.status === "qc_completed",
    },
  ];

  return (
    <div className="space-y-3">
      <MasterListing<GrnRecord>
        columns={columns}
        data={paginatedRows}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onFilterChange={setFilters}
        onSortChange={setSort}
        actions={actions}
        emptyMessage="No Sample Return GRNs found"
        searchPlaceholder="Search sample return GRN..."
        addLabel="Create Sample Return GRN"
        onAdd={() => router.push("/warehouse/grn/sample-return/create")}
      />
    </div>
  );
}
