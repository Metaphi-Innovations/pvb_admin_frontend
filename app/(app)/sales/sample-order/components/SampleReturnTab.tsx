"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MasterListing } from "@/components/listing/MasterListing";
import type { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { useSampleReturns, useSampleReturnFilterOptions } from "@/hooks/sales/use-return-documents";
import {
  type SampleReturnRecord,
  formatReturnAmount,
  getReturnTotalAmount,
} from "../sample-return-data";

function mapBackendReturnToFrontend(item: any): SampleReturnRecord {
  const products = (item.items || []).map((p: any, index: number) => {
    const snap = p.product_snapshot || {};
    const unitPerPacking = Number(snap.unit_per_packing) || 10;
    const returnedQtyVal = Number(p.returned_qty || 0);
    const isPieceType = p.quantity_type === "Piece" || p.quantity_type === "piece";
    
    const totalPieces = isPieceType 
      ? returnedQtyVal 
      : Math.round(returnedQtyVal * unitPerPacking);

    const cases = isPieceType 
      ? Math.floor(returnedQtyVal / unitPerPacking) 
      : Math.floor(returnedQtyVal);

    const pieces = isPieceType 
      ? Math.floor(returnedQtyVal % unitPerPacking) 
      : Math.round((returnedQtyVal - cases) * unitPerPacking);

    const dispatchQtyVal = Number(p.dispatch_qty || 0);
    const dispatchCases = Math.floor(dispatchQtyVal / unitPerPacking);

    return {
      product: snap.product_name || "Unknown Product",
      sku: snap.sku || snap.product_code || "",
      packedQty: dispatchQtyVal,
      dispatchQty: dispatchCases > 0 ? dispatchCases : dispatchQtyVal,
      returnQty: totalPieces,
      unitRate: Number(p.unit_price || 0),
      batchNo: p.batch_code || p.dispatch_item?.inventory_batch?.batch_no || "",
      returnCaseQty: cases,
      returnLooseQty: pieces,
      returnTotalPieces: totalPieces,
      lineAmount: Number(p.return_amount || 0),
      quantityType: p.quantity_type || "Piece",
    };
  });

  return {
    id: item.sample_return_id || item.id,
    returnNumber: item.return_no,
    dispatchNumber: item.dispatch?.dispatch_number || "",
    salesOrderNumber: item.sample_order?.order_no || item.sample_order?.sample_order_no || "",
    customer: item.customer?.customer_name || "",
    returnDate: item.return_date ? new Date(item.return_date).toISOString().split('T')[0] : "",
    warehouse: item.warehouse?.warehouse_name || "",
    products: products,
    totalAmount: Number(item.return_value || 0),
    status: item.status?.toLowerCase() as any,
  };
}

export function SampleReturnTab({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const router = useRouter();
  const [returnFilters, setReturnFilters] = useState<FilterState>({});
  const [returnSort, setReturnSort] = useState<SortState>({ key: "", direction: "none" });
  const [returnPage, setReturnPage] = useState(1);
  const [returnPageSize, setReturnPageSize] = useState(25);

  const { data: customerFilterRaw } = useSampleReturnFilterOptions("customer__customer_name");
  
  const customerOptions = useMemo(() => {
    return (customerFilterRaw || []).map((x: any) => ({
      label: x["customer__customer_name"],
      value: x["customer__customer_name"],
    }));
  }, [customerFilterRaw]);

  const apiFilters = useMemo(() => {
    const f: Record<string, any> = {};
    if (returnFilters.customer && Array.isArray(returnFilters.customer) && returnFilters.customer.length > 0) {
      f.customer = { customer_name: returnFilters.customer[0] };
    } else if (returnFilters.customer && typeof returnFilters.customer === "string") {
      f.customer = { customer_name: returnFilters.customer };
    }
    return f;
  }, [returnFilters]);

  const ordering = useMemo(() => {
    if (!returnSort.key || returnSort.direction === "none") return undefined;
    const fieldMap: Record<string, string> = {
      returnNumber: "return_no",
      returnDate: "return_date",
      dispatchNumber: "dispatch__dispatch_number",
      salesOrderNumber: "sample_order__sample_order_no",
      customer: "customer__customer_name",
      totalAmount: "return_value",
    };
    const backendKey = fieldMap[returnSort.key] || returnSort.key;
    return returnSort.direction === "desc" ? `-${backendKey}` : backendKey;
  }, [returnSort]);

  const { data: listData, isLoading } = useSampleReturns({
    page: returnPage,
    pageSize: returnPageSize,
    search: (returnFilters.search as string) || undefined,
    ordering,
    apiFilters,
  });

  const sampleReturnsList = useMemo(() => {
    return (listData?.items || []).map(mapBackendReturnToFrontend);
  }, [listData]);

  const totalRecords = listData?.total || 0;

  useEffect(() => {
    if (onCountChange) {
      onCountChange(totalRecords);
    }
  }, [totalRecords, onCountChange]);

  const returnColumns: ColumnConfig<SampleReturnRecord>[] = useMemo(() => [
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
      header: "Sample Order No",
      sortable: true,
      width: "140px",
      render: (val) => <span className="font-mono text-xs">{val}</span>,
    },
    {
      key: "customer",
      header: "Customer / Farmer",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: customerOptions,
      width: "160px"
    },
    { key: "returnDate", header: "Return Date", sortable: true, width: "120px" },
    {
      key: "totalAmount",
      header: "Return Value",
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
                ({p.quantityType === "Piece" || p.quantityType === "piece"
                  ? `${p.returnTotalPieces} Pieces`
                  : `${p.returnCaseQty} Cases`} / {p.dispatchQty} Cases)
              </span>
            </div>
          ))}
        </div>
      ),
    },
  ], [customerOptions]);

  const returnActions: ActionItemConfig<SampleReturnRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/sales/sample-order/sample-return/${row.id}`),
    },
  ];

  return (
    <MasterListing<SampleReturnRecord>
      columns={returnColumns}
      data={sampleReturnsList}
      totalRecords={totalRecords}
      page={returnPage}
      pageSize={returnPageSize}
      onPageChange={setReturnPage}
      onPageSizeChange={setReturnPageSize}
      onSortChange={setReturnSort}
      onFilterChange={setReturnFilters}
      actions={returnActions}
      onAdd={() => router.push("/sales/sample-order/sample-return/new")}
      addLabel="Create Sample Return"
      emptyMessage="sample return records"
      searchPlaceholder="Search return number, dispatch number, customer..."
      currentFilters={returnFilters}
      currentSort={returnSort}
    />
  );
}
