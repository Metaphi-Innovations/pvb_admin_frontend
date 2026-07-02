"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MasterListing } from "@/components/listing/MasterListing";
import type { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import {
  type SalesReturnRecord,
  formatProductReturnQuantity,
  formatReturnAmount,
  getReturnTotalAmount,
  getSalesReturnRecords,
} from "../sales-return-data";

export function SalesReturnTab({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [returnFilters, setReturnFilters] = useState<FilterState>({});
  const [returnSort, setReturnSort] = useState<SortState>({ key: "", direction: "none" });
  const [returnPage, setReturnPage] = useState(1);
  const [returnPageSize, setReturnPageSize] = useState(10);
  const [salesReturns, setSalesReturns] = useState<SalesReturnRecord[]>([]);

  const refreshReturns = useCallback(() => {
    const records = getSalesReturnRecords();
    setSalesReturns(records);
    onCountChange?.(records.length);
  }, [onCountChange]);

  useEffect(() => {
    refreshReturns();
  }, [pathname, refreshReturns]);

  const returnProcessed = useMemo(() => {
    let result = [...salesReturns];
    Object.keys(returnFilters).forEach((key) => {
      const value = returnFilters[key];
      if (!value) return;
      if (key === "search") {
        const query = (value as string).toLowerCase();
        result = result.filter(
          (record) =>
            record.returnNumber.toLowerCase().includes(query) ||
            record.dispatchNumber.toLowerCase().includes(query) ||
            record.salesOrderNumber.toLowerCase().includes(query) ||
            record.customer.toLowerCase().includes(query),
        );
      }
    });
    if (returnSort.key && returnSort.direction !== "none") {
      result.sort((left, right) => {
        const leftValue = String(left[returnSort.key as keyof SalesReturnRecord] || "");
        const rightValue = String(right[returnSort.key as keyof SalesReturnRecord] || "");
        return returnSort.direction === "asc" ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
      });
    }
    return result;
  }, [salesReturns, returnFilters, returnSort]);

  const returnPaginated = useMemo(() => {
    const start = (returnPage - 1) * returnPageSize;
    return returnProcessed.slice(start, start + returnPageSize);
  }, [returnProcessed, returnPage, returnPageSize]);

  const returnColumns: ColumnConfig<SalesReturnRecord>[] = [
    {
      key: "returnNumber",
      header: "Return No",
      sortable: true,
      width: "135px",
      render: (value) => <span className="font-mono text-xs font-semibold text-brand-700">{value}</span>,
    },
    {
      key: "dispatchNumber",
      header: "Dispatch No",
      sortable: true,
      width: "135px",
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: "salesOrderNumber",
      header: "Sales Order No",
      sortable: true,
      width: "140px",
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    { key: "customer", header: "Customer", sortable: true, width: "160px" },
    { key: "returnDate", header: "Return Date", sortable: true, width: "120px" },
    {
      key: "totalAmount",
      header: "Return Amount",
      sortable: true,
      width: "130px",
      render: (_value, row) => <span className="text-xs font-semibold text-foreground">{formatReturnAmount(getReturnTotalAmount(row))}</span>,
    },
    {
      key: "products",
      header: "Returned Products",
      width: "280px",
      render: (_value, row) => (
        <div className="space-y-0.5 text-xs">
          {row.products.map((product, index) => (
            <div key={`${product.sku}-${product.batchNo || index}`} className="font-medium text-foreground">
              {product.product}
              <span className="font-semibold text-muted-foreground"> ({formatProductReturnQuantity(product)})</span>
              {product.batchNo ? <span className="ml-1 text-[11px] text-muted-foreground">{product.batchNo}</span> : null}
            </div>
          ))}
        </div>
      ),
    },
  ];

  const returnActions: ActionItemConfig<SalesReturnRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/sales/orders/sales-return/${row.id}`),
    },
  ];

  return (
    <MasterListing<SalesReturnRecord>
      columns={returnColumns}
      data={returnPaginated}
      totalRecords={returnProcessed.length}
      page={returnPage}
      pageSize={returnPageSize}
      onPageChange={setReturnPage}
      onPageSizeChange={setReturnPageSize}
      onSortChange={setReturnSort}
      onFilterChange={setReturnFilters}
      actions={returnActions}
      onAdd={() => router.push("/sales/orders/sales-return/new")}
      addLabel="Create Return"
      emptyMessage="sales return records"
      searchPlaceholder="Search return number, dispatch number, customer..."
      currentFilters={returnFilters}
      currentSort={returnSort}
    />
  );
}
