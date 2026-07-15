"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MasterListing } from "@/components/listing/MasterListing";
import type { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { SalesReturnService } from "@/services/sales-return.service";
import {
  type SalesReturnRecord,
  formatProductReturnQuantity,
  formatReturnAmount,
  getReturnTotalAmount,
} from "../sales-return-data";

function mapBackendReturnToFrontend(item: any): SalesReturnRecord {
  const products = (item.items || []).map((p: any, index: number) => {
    const snap = p.product_snapshot || {};
    const unitPerPacking = Number(snap.unit_per_packing) || 10;
    const totalPieces = Number(p.total_return_pieces || p.base_qty || 0);
    const cases = Math.floor(totalPieces / unitPerPacking);
    const pieces = totalPieces % unitPerPacking;
    return {
      product: snap.product_name || "Unknown Product",
      sku: snap.sku || snap.product_code || "",
      packedQty: 0,
      dispatchQty: 0,
      returnQty: totalPieces,
      unitRate: Number(p.amount || 0),
      batchNo: p.batch_code || "",
      returnCaseQty: cases,
      returnLooseQty: pieces,
      returnTotalPieces: totalPieces,
      lineAmount: Number(p.amount || 0),
    };
  });

  return {
    id: item.id,
    returnNumber: item.return_number,
    dispatchNumber: item.dispatch?.dispatch_number || "",
    salesOrderNumber: item.sales_order?.so_number || "",
    customer: item.customer?.customer_name || "",
    returnDate: item.return_date ? new Date(item.return_date).toISOString().split('T')[0] : "",
    warehouse: item.warehouse?.warehouse_name || "",
    products: products,
    totalAmount: Number(item.return_amount || 0),
    status: item.status?.toLowerCase() as any,
  };
}

export function SalesReturnTab({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const router = useRouter();
  const [returnFilters, setReturnFilters] = useState<FilterState>({});
  const [returnSort, setReturnSort] = useState<SortState>({ key: "", direction: "none" });
  const [returnPage, setReturnPage] = useState(1);
  const [returnPageSize, setReturnPageSize] = useState(25);
  
  const [salesReturns, setSalesReturns] = useState<SalesReturnRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);

  const [returnNumberOptions, setReturnNumberOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    SalesReturnService.getFilterDropdown("return_number")
      .then((res) => {
        setReturnNumberOptions(res.map((x: any) => ({ label: x.return_number, value: x.return_number })));
      })
      .catch((err) => console.error("Failed to load return number filter options", err));

    SalesReturnService.getFilterDropdown("customer__customer_name")
      .then((res) => {
        setCustomerOptions(res.map((x: any) => ({ label: x["customer__customer_name"], value: x["customer__customer_name"] })));
      })
      .catch((err) => console.error("Failed to load customer filter options", err));
  }, []);

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: Record<string, any> = {};
      
      if (returnFilters.returnNumber && Array.isArray(returnFilters.returnNumber) && returnFilters.returnNumber.length > 0) {
        apiFilters.return_number = returnFilters.returnNumber[0];
      } else if (returnFilters.returnNumber && typeof returnFilters.returnNumber === "string") {
        apiFilters.return_number = returnFilters.returnNumber;
      }

      if (returnFilters.customer && Array.isArray(returnFilters.customer) && returnFilters.customer.length > 0) {
        apiFilters.customer = { customer_name: returnFilters.customer[0] };
      } else if (returnFilters.customer && typeof returnFilters.customer === "string") {
        apiFilters.customer = { customer_name: returnFilters.customer };
      }

      let ordering = undefined;
      if (returnSort.key && returnSort.direction !== "none") {
        ordering = returnSort.direction === "desc" ? `-${returnSort.key}` : returnSort.key;
        if (returnSort.key === "returnNumber") ordering = returnSort.direction === "desc" ? "-return_number" : "return_number";
        if (returnSort.key === "returnDate") ordering = returnSort.direction === "desc" ? "-return_date" : "return_date";
      }

      const res = await SalesReturnService.list({
        page: returnPage,
        pageSize: returnPageSize,
        search: (returnFilters.search as string) || undefined,
        ordering,
        apiFilters,
      });

      const mapped = (res.items || []).map(mapBackendReturnToFrontend);
      setSalesReturns(mapped);
      setTotalRecords(res.total || 0);
      onCountChange?.(res.total || 0);
    } catch (err) {
      console.error("Failed to load sales returns:", err);
    } finally {
      setLoading(false);
    }
  }, [returnPage, returnPageSize, returnFilters, returnSort, onCountChange]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const returnColumns: ColumnConfig<SalesReturnRecord>[] = useMemo(() => [
    {
      key: "returnNumber",
      header: "Return No",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: returnNumberOptions,
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
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: customerOptions,
      width: "160px"
    },
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
  ], [returnNumberOptions, customerOptions]);

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
      data={salesReturns}
      totalRecords={totalRecords}
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
