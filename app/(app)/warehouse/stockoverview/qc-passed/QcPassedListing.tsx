"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { QcPassedStockRecord } from "../types";
import {
  PRODUCT_OPTIONS,
  WAREHOUSE_OPTIONS,
  QC_PASSED_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG
} from "../constants";

interface QcPassedListingProps {
  qcPassedForWarehouse: QcPassedStockRecord[];
}

export function QcPassedListing({ qcPassedForWarehouse }: QcPassedListingProps) {
  const router = useRouter();

  // Filtering / Sorting / Pagination States
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Sort
  const processed = useMemo(() => {
    let result = [...qcPassedForWarehouse];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.product.toLowerCase().includes(q) ||
          item.warehouse.toLowerCase().includes(q) ||
          item.batchNumber.toLowerCase().includes(q)
        );
      } else if (key === "batchNumber") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => item.batchNumber.toLowerCase().includes(q));
      } else if (key === "product" || key === "warehouse" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof QcPassedStockRecord])));
      } else if (key === "manufacturingDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.manufacturingDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.manufacturingDate <= range.toDate);
      } else if (key === "expiryDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.expiryDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.expiryDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "availableQuantity" || sort.key === "reservedQuantity") {
          const valA = a[sort.key as "availableQuantity" | "reservedQuantity"];
          const valB = b[sort.key as "availableQuantity" | "reservedQuantity"];
          return sort.direction === "asc" ? valA - valB : valB - valA;
        }
        const valA = String(a[sort.key as keyof QcPassedStockRecord] || "");
        const valB = String(b[sort.key as keyof QcPassedStockRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [qcPassedForWarehouse, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  const columns: ColumnConfig<QcPassedStockRecord>[] = [
    { key: "product", header: "Product", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PRODUCT_OPTIONS },
    { key: "warehouse", header: "Warehouse", sortable: true, filterable: true, filterType: "dropdown", filterOptions: WAREHOUSE_OPTIONS },
    { key: "batchNumber", header: "Batch Number", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "availableQuantity", header: "Available Qty", sortable: true, filterable: true, filterType: "text", align: "center", width: "130px" },
    { key: "reservedQuantity", header: "Reserved Qty", sortable: true, filterable: true, filterType: "text", align: "center", width: "130px" },
    { key: "manufacturingDate", header: "Mfg Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    { key: "expiryDate", header: "Expiry Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: QC_PASSED_STATUS_OPTIONS,
      width: "135px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  const actions: ActionItemConfig<QcPassedStockRecord>[] = [
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
        {/* <h2 className="text-sm font-semibold text-foreground">QC Passed Available Inventory</h2> */}
      </div>
      <MasterListing<QcPassedStockRecord>
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
        emptyMessage="QC Passed stock records"
        searchPlaceholder="Search QC Passed..."
      />
    </div>
  );
}
