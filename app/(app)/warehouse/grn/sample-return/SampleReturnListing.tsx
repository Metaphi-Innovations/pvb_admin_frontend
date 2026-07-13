"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getGrnTabApiContext } from "@/lib/warehouse/grn-list-config";
import { GRN_STATUS_CONFIG } from "@/lib/warehouse/grn-status";
import { useGrnListData } from "../shared/useGrnListData";
import type { GrnListItem } from "@/services/grn-list.service";

interface SampleReturnListingProps {
  destinationWarehouse: string;
}

const SAMPLE_RETURN_TAB_CONTEXT = getGrnTabApiContext("sample_return");

export function SampleReturnListing({ destinationWarehouse }: SampleReturnListingProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { items, total, loading, error } = useGrnListData({
    tabContext: SAMPLE_RETURN_TAB_CONTEXT,
    filters,
    sort,
    page,
    pageSize,
    destinationWarehouse,
  });

  useEffect(() => {
    setPage(1);
  }, [destinationWarehouse, filters, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [sort.key, sort.direction]);

  const columns: ColumnConfig<GrnListItem>[] = useMemo(
    () => [
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
    ],
    [],
  );

  const actions: ActionItemConfig<GrnListItem>[] = [
    {
      label: "View GRN",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grn/sample-return/${row.id}`),
    },
    {
      label: "Edit GRN",
      action: "edit",
      icon: Pencil,
      onClick: (row) => router.push(`/warehouse/grn/sample-return/${row.id}/edit`),
      hide: (row) => row.status === "qc_completed",
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
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <MasterListing<GrnListItem>
        columns={columns}
        data={items}
        loading={loading}
        totalRecords={total}
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
