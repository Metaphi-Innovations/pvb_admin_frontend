"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GrnPendingStockRecord } from "../types";
import {
  PRODUCT_OPTIONS,
  WAREHOUSE_OPTIONS,
  VENDOR_OPTIONS,
  GRN_PENDING_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG
} from "../constants";

interface GrnPendingListingProps {
  grnPendingForWarehouse: GrnPendingStockRecord[];
}

export function GrnPendingListing({ grnPendingForWarehouse }: GrnPendingListingProps) {
  const router = useRouter();

  // Filtering / Sorting / Pagination States
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Sort
  const processed = useMemo(() => {
    let result = [...grnPendingForWarehouse];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.grnNo.toLowerCase().includes(q) ||
          item.product.toLowerCase().includes(q) ||
          item.warehouse.toLowerCase().includes(q) ||
          item.vendor.toLowerCase().includes(q) ||
          item.batchNumber.toLowerCase().includes(q)
        );
      } else if (key === "grnNo" || key === "batchNumber") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof GrnPendingStockRecord]).toLowerCase().includes(q));
      } else if (key === "product" || key === "warehouse" || key === "vendor" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof GrnPendingStockRecord])));
      } else if (key === "grnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.grnDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.grnDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "receivedQuantity") {
          return sort.direction === "asc"
            ? a.receivedQuantity - b.receivedQuantity
            : b.receivedQuantity - a.receivedQuantity;
        }
        const valA = String(a[sort.key as keyof GrnPendingStockRecord] || "");
        const valB = String(b[sort.key as keyof GrnPendingStockRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [grnPendingForWarehouse, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  const columns: ColumnConfig<GrnPendingStockRecord>[] = [
    {
      key: "grnNo",
      header: "GRN No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => (
        <Link href={`/warehouse/stockoverview/view/${row.id}`} className="block group/name">
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover/name:text-brand-800">{row.grnNo}</span>
        </Link>
      ),
    },
    {
      key: "product",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRODUCT_OPTIONS,
      render: (val, row) => <span className="text-xs font-semibold text-foreground">{row.product}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: WAREHOUSE_OPTIONS,
      render: (val, row) => <span className="text-xs text-foreground">{row.warehouse}</span>,
    },
    {
      key: "batchNumber",
      header: "Batch Number",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <span className="font-mono text-xs text-foreground">{row.batchNumber}</span>,
    },
    {
      key: "receivedQuantity",
      header: "Received Qty",
      sortable: true,
      align: "right",
      width: "130px",
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
      key: "vendor",
      header: "Supplier",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: VENDOR_OPTIONS,
      width: "220px",
      render: (val, row) => <span className="text-xs text-foreground">{row.vendor}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: GRN_PENDING_STATUS_OPTIONS,
      width: "145px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  const actions: ActionItemConfig<GrnPendingStockRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/stockoverview/view/${row.id}`),
    },
    {
      label: "Generate QC",
      action: "generate_qc",
      icon: CheckCircle2,
      onClick: (row) => router.push(`/warehouse/qc/create?grnId=${row.grnNo}`),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        {/* <h2 className="text-sm font-semibold text-foreground">GRN Received Awaiting Quality Control</h2> */}
      </div>
      <MasterListing<GrnPendingStockRecord>
        columns={columns}
        data={paginated}
        totalRecords={processed.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        actions={actions}
        emptyMessage=""
        searchPlaceholder="Search GRN Pending..."
      />
    </div>
  );
}
