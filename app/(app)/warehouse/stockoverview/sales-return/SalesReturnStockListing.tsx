"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import { SalesReturnStockRecord } from "../types";
import {
  PRODUCT_OPTIONS,
  WAREHOUSE_OPTIONS,
  SALES_RETURN_STOCK_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG,
} from "../constants";

interface SalesReturnStockListingProps {
  records: SalesReturnStockRecord[];
}

export function SalesReturnStockListing({ records }: SalesReturnStockListingProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const processed = useMemo(() => {
    let result = [...records];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (item) =>
            item.product.toLowerCase().includes(q) ||
            item.warehouse.toLowerCase().includes(q) ||
            item.batchNumber.toLowerCase().includes(q) ||
            item.salesReturnNo.toLowerCase().includes(q) ||
            item.customer.toLowerCase().includes(q),
        );
      } else if (key === "batchNumber" || key === "salesReturnNo") {
        const q = (val as string).toLowerCase();
        result = result.filter((item) =>
          String(item[key as keyof SalesReturnStockRecord]).toLowerCase().includes(q),
        );
      } else if (key === "product" || key === "warehouse" || key === "status") {
        const selected = val as string[];
        result = result.filter((item) => selected.includes(String(item[key as keyof SalesReturnStockRecord])));
      } else if (key === "returnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter((item) => item.returnDate >= range.fromDate);
        if (range.toDate) result = result.filter((item) => item.returnDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "availableQuantity") {
          return sort.direction === "asc"
            ? a.availableQuantity - b.availableQuantity
            : b.availableQuantity - a.availableQuantity;
        }
        const valA = String(a[sort.key as keyof SalesReturnStockRecord] || "");
        const valB = String(b[sort.key as keyof SalesReturnStockRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  const columns: ColumnConfig<SalesReturnStockRecord>[] = [
    {
      key: "salesReturnNo",
      header: "Sales Return No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-brand-700">{row.salesReturnNo}</span>
      ),
    },
    {
      key: "product",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRODUCT_OPTIONS,
      render: (_val, row) => <span className="text-xs font-semibold text-foreground">{row.product}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      filterable: true,
      filterType: "text",
      render: (_val, row) => <span className="text-xs text-foreground">{row.customer}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: WAREHOUSE_OPTIONS,
      render: (_val, row) => <span className="text-xs text-foreground">{row.warehouse}</span>,
    },
    {
      key: "batchNumber",
      header: "Batch No.",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.batchNumber}</span>,
    },
    {
      key: "availableQuantity",
      header: "Available Qty",
      sortable: true,
      align: "right",
      width: "110px",
      render: (val) => (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {val != null ? val.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "returnDate",
      header: "Return Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "120px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.returnDate}</span>,
    },
    {
      key: "expiryDate",
      header: "Expiry Date",
      sortable: true,
      width: "120px",
      render: (_val, row) => <span className="text-xs text-foreground">{row.expiryDate}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: SALES_RETURN_STOCK_STATUS_OPTIONS,
      width: "130px",
      render: (val: string) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  return (
    <MasterListing<SalesReturnStockRecord>
      columns={columns}
      data={paginated}
      totalRecords={processed.length}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onSortChange={setSort}
      onFilterChange={setFilters}
      emptyMessage="sales return stock"
      searchPlaceholder="Search sales return stock..."
    />
  );
}
