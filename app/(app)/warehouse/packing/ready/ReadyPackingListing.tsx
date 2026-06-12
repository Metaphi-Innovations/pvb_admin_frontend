"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, PlusCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { SalesOrderRecord } from "../types";
import Link from "next/link";
import {
  CUSTOMER_OPTIONS,
  PRIORITY_OPTIONS,
  READY_STATUS_OPTIONS,
  PRIORITY_BADGE_CONFIG,
  STATUS_BADGE_CONFIG
} from "../constants";

interface ReadyPackingListingProps {
  ordersForWarehouse: SalesOrderRecord[];
}

export function ReadyPackingListing({ ordersForWarehouse }: ReadyPackingListingProps) {
  const router = useRouter();

  // Table state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Process filters/sort client side
  const processed = useMemo(() => {
    let result = [...ordersForWarehouse];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.salesOrderNo.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q)
        );
      } else if (key === "salesOrderNo") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => item.salesOrderNo.toLowerCase().includes(q));
      } else if (key === "customer" || key === "priority" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof SalesOrderRecord])));
      } else if (key === "orderDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.orderDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.orderDate <= range.toDate);
      } else if (key === "deliveryDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.deliveryDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.deliveryDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "totalItems" || sort.key === "totalQuantity" || sort.key === "orderAmount") {
          return sort.direction === "asc"
            ? (a[sort.key as keyof SalesOrderRecord] as number) - (b[sort.key as keyof SalesOrderRecord] as number)
            : (b[sort.key as keyof SalesOrderRecord] as number) - (a[sort.key as keyof SalesOrderRecord] as number);
        }
        const valA = String(a[sort.key as keyof SalesOrderRecord] || "");
        const valB = String(b[sort.key as keyof SalesOrderRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [ordersForWarehouse, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  // Columns
  const columns: ColumnConfig<SalesOrderRecord>[] = [
    {
      key: "salesOrderNo",
      header: "Sales Order No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "135px",
      render: (val, row) => (
        <Link
          href={`/warehouse/packing/create/${row.id}`}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
        >
          {val}
        </Link>
      )
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
      key: "totalQuantity",
      header: "Total Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => <span className="font-mono text-xs tabular-nums">{val}</span>
    },
    {
      key: "orderAmount",
      header: "Order Amount",
      sortable: true,
      align: "right",
      width: "125px",
      render: (val: any) => `₹${Number(val).toLocaleString("en-IN")}`
    },
    { key: "orderDate", header: "Order Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    { key: "deliveryDate", header: "Delivery Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRIORITY_OPTIONS,
      width: "110px",
      render: (val: any) => {
        const cfg = PRIORITY_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: READY_STATUS_OPTIONS,
      width: "155px",
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
  const actions: ActionItemConfig<SalesOrderRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
    {
      label: "Create Packing",
      action: "create_packing",
      icon: PlusCircle,
      onClick: (row) => router.push(`/warehouse/packing/create/${row.id}`),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        {/* <h2 className="text-sm font-semibold text-foreground">Orders Ready for Packaging</h2> */}
      </div>
      <MasterListing<SalesOrderRecord>
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
        emptyMessage="ready sales orders"
        searchPlaceholder="Search SO..."
      />
    </div>
  );
}
