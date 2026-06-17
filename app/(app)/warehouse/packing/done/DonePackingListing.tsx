"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { PackingRecord } from "../types";
import Link from "next/link";
import {
  CUSTOMER_OPTIONS,
  PACKED_BY_OPTIONS,
  DONE_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG
} from "../constants";

interface DonePackingListingProps {
  packingsForWarehouse: PackingRecord[];
}

export function DonePackingListing({ packingsForWarehouse }: DonePackingListingProps) {
  const router = useRouter();

  // Table state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Process filters/sort client side
  const processed = useMemo(() => {
    let result = [...packingsForWarehouse];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.packingNo.toLowerCase().includes(q) ||
          item.salesOrderNo.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q)
        );
      } else if (key === "packingNo" || key === "salesOrderNo") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof PackingRecord]).toLowerCase().includes(q));
      } else if (key === "customer" || key === "packedBy" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof PackingRecord])));
      } else if (key === "packingDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.packingDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.packingDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "totalItems" || sort.key === "packedQuantity") {
          return sort.direction === "asc"
            ? (a[sort.key as keyof PackingRecord] as number) - (b[sort.key as keyof PackingRecord] as number)
            : (b[sort.key as keyof PackingRecord] as number) - (a[sort.key as keyof PackingRecord] as number);
        }
        const valA = String(a[sort.key as keyof PackingRecord] || "");
        const valB = String(b[sort.key as keyof PackingRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [packingsForWarehouse, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  // Columns
  const columns: ColumnConfig<PackingRecord>[] = [
    {
      key: "packingNo",
      header: "Packing No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => (
        <Link
          href={`/warehouse/packing/view/${row.id}`}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
        >
          {val}
        </Link>
      )
    },
    {
      key: "salesOrderNo",
      header: "Sales Order No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "135px",
      render: (val) => <span className="font-mono text-xs font-semibold">{val}</span>
    },
    { key: "customer", header: "Customer", sortable: true, filterable: true, filterType: "dropdown", filterOptions: CUSTOMER_OPTIONS, width: "160px" },
    {
      key: "totalItems",
      header: "Total Items",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="font-mono text-xs tabular-nums">{val}</span>
    },
    {
      key: "packedQuantity",
      header: "Packed Quantity",
      sortable: true,
      align: "right",
      width: "130px",
      render: (val) => <span className="font-mono text-xs tabular-nums">{val}</span>
    },
    { key: "packingDate", header: "Packing Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    { key: "packedBy", header: "Packed By", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PACKED_BY_OPTIONS, width: "130px" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: DONE_STATUS_OPTIONS,
      width: "130px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      }
    },
  ];

  // Actions
  const actions: ActionItemConfig<PackingRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        {/* <h2 className="text-sm font-semibold text-foreground">Completed Packing Receipts</h2> */}
      </div>
      <MasterListing<PackingRecord>
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
        emptyMessage="completed packing records"
        searchPlaceholder="Search Packing No..."
      />
    </div>
  );
}
