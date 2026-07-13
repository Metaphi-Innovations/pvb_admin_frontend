"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, FileCheck2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GrnListingLayout } from "../shared/GrnListingLayout";
import { getGrnTabApiContext } from "@/lib/warehouse/grn-list-config";
import { GRN_STATUS_CONFIG } from "@/lib/warehouse/grn-status";
import { useGrnLazyFilters, useGrnListData } from "../shared/useGrnListData";
import type { GrnListItem } from "@/services/grn-list.service";

const PURCHASE_TAB_CONTEXT = getGrnTabApiContext("purchase");

export default function PurchaseListingRoutePage() {
  const router = useRouter();
  const [grnFilters, setGrnFilters] = useState<FilterState>({});
  const [grnSort, setGrnSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(10);
  const { handleOpenFilter, getFilterOptionsForColumn } = useGrnLazyFilters();

  const { items, total, loading } = useGrnListData({
    tabContext: PURCHASE_TAB_CONTEXT,
    filters: grnFilters,
    sort: grnSort,
    page: grnPage,
    pageSize: grnPageSize,
  });

  useEffect(() => {
    setGrnPage(1);
  }, [grnFilters, grnPageSize]);

  useEffect(() => {
    setGrnPage(1);
  }, [grnSort.key, grnSort.direction]);

  const grnColumns: ColumnConfig<GrnListItem>[] = useMemo(
    () => [
      {
        key: "grnNo",
        header: "GRN No",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("grnNo"),
        width: "130px",
        render: (_val, row) => (
          <Link href={`/warehouse/grn/purchase/${row.id}`} className="block group/name">
            <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">
              {row.grnNo}
            </span>
          </Link>
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
        key: "poNumber",
        header: "PO No.",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("poNumber"),
        width: "120px",
        render: (_val, row) => (
          <span className="font-mono text-xs text-foreground">{row.poNumber || "—"}</span>
        ),
      },
      {
        key: "vendorName",
        header: "Supplier",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("vendorName"),
        width: "130px",
        render: (_val, row) => <span className="text-xs text-foreground">{row.vendorName || "—"}</span>,
      },
      {
        key: "warehouse",
        header: "Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("warehouse"),
        width: "140px",
        render: (_val, row) => (
          <span className="text-xs text-foreground">{row.warehouse || "—"}</span>
        ),
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
      // {
      //   key: "acceptedQty",
      //   header: "Accepted Qty",
      //   sortable: true,
      //   align: "right",
      //   width: "110px",
      //   render: (val) => (
      //     <span className="text-xs font-medium tabular-nums text-emerald-600">
      //       {val != null ? val.toLocaleString() : "—"}
      //     </span>
      //   ),
      // },
      // {
      //   key: "rejectedQty",
      //   header: "Rejected Qty",
      //   sortable: true,
      //   align: "right",
      //   width: "110px",
      //   render: (val) => (
      //     <span className="text-xs font-medium tabular-nums text-red-600">
      //       {val != null ? val.toLocaleString() : "—"}
      //     </span>
      //   ),
      // },
      
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: getFilterOptionsForColumn("status"),
        width: "130px",
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
    [getFilterOptionsForColumn],
  );

  const grnActions: ActionItemConfig<GrnListItem>[] = [
    {
      label: "View GRN Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grn/purchase/${row.id}`),
    },
    {
      label: "Perform QC Check",
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
    <GrnListingLayout>
      <MasterListing<GrnListItem>
        columns={grnColumns}
        data={items}
        loading={loading}
        totalRecords={total}
        page={grnPage}
        pageSize={grnPageSize}
        onPageChange={setGrnPage}
        onPageSizeChange={setGrnPageSize}
        onFilterChange={setGrnFilters}
        onSortChange={setGrnSort}
        actions={grnActions}
        emptyMessage="No GRNs found"
        searchPlaceholder="Search by GRN No, PO No, Supplier..."
        addLabel="Create Purchase GRN"
        onAdd={() => router.push("/warehouse/grn/purchase/create")}
        onOpenFilter={handleOpenFilter}
      />
    </GrnListingLayout>
  );
}
