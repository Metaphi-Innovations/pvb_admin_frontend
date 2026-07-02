"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QcPassedStockRecord } from "../types";
import {
  PRODUCT_OPTIONS,
  WAREHOUSE_OPTIONS,
  QC_PASSED_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG
} from "../constants";
import { enrichStockRecord } from "@/lib/accounts/inventory-accounting-data";
import { formatMoney } from "@/lib/accounts/money-format";

const CP_MISSING_MSG = "CP missing in Pricing Master.";

type QcPassedDisplayRow = QcPassedStockRecord & {
  sku: string;
  uom: string;
  costPrice: number;
  cpMissing: boolean;
  stockValue: number;
};

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
  const enrichedRows = useMemo<QcPassedDisplayRow[]>(
    () =>
      qcPassedForWarehouse.map((item) => {
        const val = enrichStockRecord(item);
        return {
          ...item,
          sku: val.sku,
          uom: val.uom,
          costPrice: val.costPrice,
          cpMissing: val.cpMissing,
          stockValue: val.stockValue,
        };
      }),
    [qcPassedForWarehouse],
  );

  const processed = useMemo(() => {
    let result = [...enrichedRows];
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
        if (sort.key === "availableQuantity" || sort.key === "costPrice" || sort.key === "stockValue") {
          const valA = a[sort.key as keyof QcPassedDisplayRow] as number;
          const valB = b[sort.key as keyof QcPassedDisplayRow] as number;
          return sort.direction === "asc" ? valA - valB : valB - valA;
        }
        const valA = String(a[sort.key as keyof QcPassedStockRecord] || "");
        const valB = String(b[sort.key as keyof QcPassedStockRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [enrichedRows, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  const columns: ColumnConfig<QcPassedDisplayRow>[] = [
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
      key: "sku",
      header: "SKU",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <span className="font-mono text-xs text-foreground">{row.sku}</span>,
    },
    {
      key: "uom",
      header: "UOM",
      sortable: true,
      width: "72px",
      render: (val, row) => <span className="text-xs text-foreground">{row.uom || "—"}</span>,
    },
    {
      key: "availableQuantity",
      header: "Available Qty",
      sortable: true,
      filterable: true,
      filterType: "text",
      align: "right",
      width: "110px",
      render: (val) => <span className="text-xs font-medium tabular-nums text-foreground">{val != null ? val.toLocaleString() : "—"}</span>,
    },
    {
      key: "costPrice",
      header: "CP",
      sortable: true,
      align: "right",
      width: "100px",
      render: (_val, row) => (
        <span className={`text-xs tabular-nums ${row.cpMissing ? "text-amber-700 text-[10px]" : "text-foreground"}`}>
          {row.cpMissing ? CP_MISSING_MSG : formatMoney(row.costPrice)}
        </span>
      ),
    },
    {
      key: "stockValue",
      header: "Stock Value",
      sortable: true,
      align: "right",
      width: "120px",
      render: (_val, row) => (
        <span className={`text-xs font-medium tabular-nums ${row.cpMissing && row.availableQuantity > 0 ? "text-amber-700 text-[10px]" : "text-foreground"}`}>
          {row.cpMissing && row.availableQuantity > 0 ? CP_MISSING_MSG : formatMoney(row.stockValue)}
        </span>
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
      header: "Batch No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <span className="font-mono text-xs text-foreground">{row.batchNumber}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: QC_PASSED_STATUS_OPTIONS,
      width: "135px",
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

  const actions: ActionItemConfig<QcPassedDisplayRow>[] = [
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
      <MasterListing<QcPassedDisplayRow>
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
        emptyMessage=""
        searchPlaceholder="Search QC Passed..."
      />
    </div>
  );
}
