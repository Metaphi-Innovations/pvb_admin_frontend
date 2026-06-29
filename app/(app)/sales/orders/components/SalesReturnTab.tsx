"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MasterListing } from "@/components/listing/MasterListing";
import type { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import {
  type SalesReturnRecord,
  getSalesReturnRecords,
  formatReturnAmount,
  getReturnTotalAmount,
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
      const val = returnFilters[key];
      if (!val) return;
      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (r) =>
            r.returnNumber.toLowerCase().includes(q) ||
            r.dispatchNumber.toLowerCase().includes(q) ||
            r.salesOrderNumber.toLowerCase().includes(q) ||
            r.customer.toLowerCase().includes(q),
        );
      }
    });
    if (returnSort.key && returnSort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[returnSort.key as keyof SalesReturnRecord] || "");
        const valB = String(b[returnSort.key as keyof SalesReturnRecord] || "");
        return returnSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
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
      render: (val) => <span className="font-mono text-xs font-semibold text-brand-700">{val}</span>,
    },
    {
      key: "dispatchNumber",
      header: "Dispatch No",
      sortable: true,
      width: "135px",
      render: (val) => <span className="font-mono text-xs">{val}</span>,
    },
    {
      key: "salesOrderNumber",
      header: "Sales Order No",
      sortable: true,
      width: "140px",
      render: (val) => <span className="font-mono text-xs">{val}</span>,
    },
    { key: "customer", header: "Customer", sortable: true, width: "160px" },
    { key: "returnDate", header: "Return Date", sortable: true, width: "120px" },
    {
      key: "totalAmount",
      header: "Return Amount",
      sortable: true,
      width: "130px",
      render: (_val, row) => (
        <span className="text-xs font-semibold text-foreground">{formatReturnAmount(getReturnTotalAmount(row))}</span>
      ),
    },
    {
      key: "products",
      header: "Returned Products",
      width: "250px",
      render: (_val, row) => (
        <div className="space-y-0.5 text-xs">
          {row.products.map((p, idx) => (
            <div key={idx} className="text-foreground font-medium">
              {p.product}{" "}
              <span className="text-muted-foreground font-semibold">
                ({p.returnQty} / {p.dispatchQty})
              </span>
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
