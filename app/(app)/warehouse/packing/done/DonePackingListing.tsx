"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { PackingRecord } from "../types";
import Link from "next/link";
import {
  CUSTOMER_OPTIONS,
  PACKED_BY_OPTIONS,
  DONE_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG
} from "../constants";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [subTab, setSubTab] = useState<"sales_order" | "sample_order" | "stock_transfer">("sales_order");

  React.useEffect(() => {
    setPage(1);
  }, [subTab]);

  const filteredPackings = useMemo(() => {
    return packingsForWarehouse.filter(item => {
      const type = item.sourceDocumentType === "Stock Transfer" 
        ? "stock_transfer" 
        : (item.salesOrderNo.startsWith("SM-") || item.salesOrderNo.startsWith("SMP-") || item.sourceDocumentType === "Sample Order" ? "sample_order" : "sales_order");
      return type === subTab;
    });
  }, [packingsForWarehouse, subTab]);

  // Process filters/sort client side
  const processed = useMemo(() => {
    let result = [...filteredPackings];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.packingNo.toLowerCase().includes(q) ||
          item.salesOrderNo.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q) ||
          (item.sourceDocumentNo && item.sourceDocumentNo.toLowerCase().includes(q)) ||
          (item.packingListNo && item.packingListNo.toLowerCase().includes(q))
        );
      } else if (key === "packingNo" || key === "salesOrderNo" || key === "packingListNo") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => 
          String(item.packingNo).toLowerCase().includes(q) || 
          String(item.salesOrderNo).toLowerCase().includes(q) ||
          (item.packingListNo && item.packingListNo.toLowerCase().includes(q))
        );
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
  }, [filteredPackings, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  // Columns
  const salesOrderColumns = useMemo(() => {
    return [
      {
        key: "salesOrderNo",
        header: "Sales Order No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (val: any, row: PackingRecord) => (
          <Link
            href={`/warehouse/packing/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.salesOrderNo}
          </Link>
        )
      },
      {
        key: "customer",
        header: "Customer",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: CUSTOMER_OPTIONS,
        width: "180px",
        render: (val: any, row: PackingRecord) => <span className="text-xs text-foreground font-semibold">{row.customer}</span>
      },
      {
        key: "totalItems",
        header: "Total Items",
        sortable: true,
        align: "right",
        width: "100px",
        render: (val: any) => <span className="font-mono text-xs tabular-nums">{val}</span>
      },
      {
        key: "packedQuantity",
        header: "Packed Quantity",
        sortable: true,
        align: "right",
        width: "120px",
        render: (val: any) => <span className="font-mono text-xs tabular-nums">{val}</span>
      },
      { key: "packedBy", header: "Packed By", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PACKED_BY_OPTIONS, width: "120px" },
      {
        key: "packingDate",
        header: "Packing Date",
        sortable: true,
        width: "120px",
        render: (val: any) => <span className="text-xs text-muted-foreground">{val}</span>
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: DONE_STATUS_OPTIONS,
        width: "110px",
        render: (val: any) => {
          const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
          return (
            <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
              {cfg.label}
            </span>
          );
        }
      },
    ] as ColumnConfig<PackingRecord>[];
  }, []);

  const sampleOrderColumns = useMemo(() => {
    return [
      {
        key: "salesOrderNo",
        header: "Sample Order No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (val: any, row: PackingRecord) => (
          <Link
            href={`/warehouse/packing/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.salesOrderNo}
          </Link>
        )
      },
      {
        key: "customer",
        header: "Customer",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: CUSTOMER_OPTIONS,
        width: "180px",
        render: (val: any, row: PackingRecord) => <span className="text-xs text-foreground font-semibold">{row.customer}</span>
      },
      {
        key: "totalItems",
        header: "Total Items",
        sortable: true,
        align: "right",
        width: "100px",
        render: (val: any) => <span className="font-mono text-xs tabular-nums">{val}</span>
      },
      {
        key: "packedQuantity",
        header: "Packed Quantity",
        sortable: true,
        align: "right",
        width: "120px",
        render: (val: any) => <span className="font-mono text-xs tabular-nums">{val}</span>
      },
      { key: "packedBy", header: "Packed By", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PACKED_BY_OPTIONS, width: "120px" },
      {
        key: "packingDate",
        header: "Packing Date",
        sortable: true,
        width: "120px",
        render: (val: any) => <span className="text-xs text-muted-foreground">{val}</span>
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: DONE_STATUS_OPTIONS,
        width: "110px",
        render: (val: any) => {
          const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
          return (
            <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
              {cfg.label}
            </span>
          );
        }
      },
    ] as ColumnConfig<PackingRecord>[];
  }, []);

  const stockTransferColumns = useMemo(() => {
    return [
      {
        key: "salesOrderNo",
        header: "Stock Transfer No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (val: any, row: PackingRecord) => (
          <Link
            href={`/warehouse/packing/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.salesOrderNo}
          </Link>
        )
      },
      {
        key: "sourceWarehouse",
        header: "Source Warehouse",
        sortable: true,
        width: "160px",
        render: (val: any, row: PackingRecord) => <span className="text-xs text-foreground font-medium">{row.sourceWarehouse || row.warehouse}</span>
      },
      {
        key: "targetWarehouse",
        header: "Target Warehouse",
        sortable: true,
        width: "180px",
        render: (val: any, row: PackingRecord) => <span className="text-xs text-foreground font-semibold">{row.targetWarehouse}</span>
      },
      {
        key: "totalItems",
        header: "Total Items",
        sortable: true,
        align: "right",
        width: "100px",
        render: (val: any) => <span className="font-mono text-xs tabular-nums">{val}</span>
      },
      {
        key: "packedQuantity",
        header: "Packed Quantity",
        sortable: true,
        align: "right",
        width: "120px",
        render: (val: any) => <span className="font-mono text-xs tabular-nums">{val}</span>
      },
      { key: "packedBy", header: "Packed By", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PACKED_BY_OPTIONS, width: "120px" },
      {
        key: "packingDate",
        header: "Packing Date",
        sortable: true,
        width: "120px",
        render: (val: any) => <span className="text-xs text-muted-foreground">{val}</span>
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: DONE_STATUS_OPTIONS,
        width: "110px",
        render: (val: any) => {
          const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
          return (
            <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
              {cfg.label}
            </span>
          );
        }
      },
    ] as ColumnConfig<PackingRecord>[];
  }, []);

  const columns = useMemo(() => {
    if (subTab === "sales_order") return salesOrderColumns;
    if (subTab === "sample_order") return sampleOrderColumns;
    return stockTransferColumns;
  }, [subTab, salesOrderColumns, sampleOrderColumns, stockTransferColumns]);

  // Actions
  const actions: ActionItemConfig<PackingRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
    {
      label: "Create Dispatch",
      action: "dispatch",
      icon: Truck,
      hide: (row) => row.status !== "Packed",
      onClick: (row) => router.push(`/warehouse/dispatch/create?packingId=${row.id}`),
    },
  ];

  return (
    <div className="space-y-3">
      <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} className="w-full">
        <TabsList>
          <TabsTrigger value="sales_order" className="text-xs">Sales Order</TabsTrigger>
          <TabsTrigger value="sample_order" className="text-xs">Sample Order</TabsTrigger>
          <TabsTrigger value="stock_transfer" className="text-xs">Stock Transfer</TabsTrigger>
        </TabsList>
      </Tabs>
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
