"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RejectedStockRecord } from "../types";
import {
  PRODUCT_OPTIONS,
  WAREHOUSE_OPTIONS,
  REJECTED_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG
} from "../constants";

interface RejectedListingProps {
  rejectedForWarehouse: RejectedStockRecord[];
}

export function RejectedListing({ rejectedForWarehouse }: RejectedListingProps) {
  const router = useRouter();

  // Filtering / Sorting / Pagination States
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Sort
  const processed = useMemo(() => {
    let result = [...rejectedForWarehouse];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.product.toLowerCase().includes(q) ||
          item.warehouse.toLowerCase().includes(q) ||
          item.batchNumber.toLowerCase().includes(q) ||
          item.qcNumber.toLowerCase().includes(q) ||
          item.rejectionReason.toLowerCase().includes(q)
        );
      } else if (key === "batchNumber" || key === "qcNumber") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof RejectedStockRecord]).toLowerCase().includes(q));
      } else if (key === "product" || key === "warehouse" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof RejectedStockRecord])));
      } else if (key === "inspectionDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.inspectionDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.inspectionDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "rejectedQuantity") {
          return sort.direction === "asc"
            ? a.rejectedQuantity - b.rejectedQuantity
            : b.rejectedQuantity - a.rejectedQuantity;
        }
        const valA = String(a[sort.key as keyof RejectedStockRecord] || "");
        const valB = String(b[sort.key as keyof RejectedStockRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [rejectedForWarehouse, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  const columns: ColumnConfig<RejectedStockRecord>[] = [
    {
      key: "product",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRODUCT_OPTIONS,
      render: (val, row) => (
        <Link href={`/warehouse/stockoverview/view/${row.id}`} className="block group/name">
          <span className="text-xs font-semibold text-foreground group-hover/name:text-brand-700">{row.product}</span>
        </Link>
      ),
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
      key: "rejectedQuantity",
      header: "Rejected Qty",
      sortable: true,
      align: "right",
      width: "130px",
      render: (val) => <span className="text-xs font-medium tabular-nums text-foreground">{val != null ? val.toLocaleString() : "—"}</span>,
    },
    {
      key: "rejectionReason",
      header: "Rejection Reason",
      sortable: true,
      render: (val, row) => <span className="text-xs text-foreground">{row.rejectionReason}</span>,
    },
    {
      key: "qcNumber",
      header: "QC Number",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <span className="font-mono text-xs text-brand-700">{row.qcNumber}</span>,
    },
    {
      key: "inspectionDate",
      header: "Inspection Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "140px",
      render: (val, row) => <span className="text-xs text-foreground">{row.inspectionDate}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: REJECTED_STATUS_OPTIONS,
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

  const actions: ActionItemConfig<RejectedStockRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/stockoverview/view/${row.id}`),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        {/* <h2 className="text-sm font-semibold text-foreground">QC Rejected Stock</h2> */}
      </div>
      <MasterListing<RejectedStockRecord>
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
        emptyMessage="rejected stock records"
        searchPlaceholder="Search Rejected Stock..."
      />
    </div>
  );
}
