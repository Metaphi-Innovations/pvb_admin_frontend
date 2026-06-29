"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

import { ReorderLevel } from "../types";
import Link from "next/link";
import { PRODUCT_OPTIONS, WAREHOUSE_OPTIONS, STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";

interface ProductOverviewListingProps {
  allRecords: ReorderLevel[];
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

export function ProductOverviewListing({ allRecords }: ProductOverviewListingProps) {
  const router = useRouter();

  // Table state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Processing
  const processed = useMemo(() => {
    let result = [...allRecords];
    Object.keys(filters).forEach(key => {
      const val = filters[key];
      if (!val) return;
      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(r =>
          r.product.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.warehouse.toLowerCase().includes(q)
        );
      } else if (key === "product") {
        result = result.filter(r => (val as string[]).includes(r.product));
      } else if (key === "warehouse") {
        result = result.filter(r => (val as string[]).includes(r.warehouse));
      } else if (key === "status") {
        result = result.filter(r => (val as string[]).includes(r.status));
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const numKeys = ["currentStock", "reservedStock", "reorderLevelQty"];
        if (numKeys.includes(sort.key)) {
          const diff = (a[sort.key as keyof ReorderLevel] as number) - (b[sort.key as keyof ReorderLevel] as number);
          return sort.direction === "asc" ? diff : -diff;
        }
        const vA = String(a[sort.key as keyof ReorderLevel] || "");
        const vB = String(b[sort.key as keyof ReorderLevel] || "");
        return sort.direction === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      });
    }
    return result;
  }, [allRecords, filters, sort]);

  const paginated = useMemo(() => {
    const s = (page - 1) * pageSize;
    return processed.slice(s, s + pageSize);
  }, [processed, page, pageSize]);

  // Helper
  const numCol = (key: string, header: string, w = "120px"): ColumnConfig<ReorderLevel> => ({
    key: key as keyof ReorderLevel,
    header,
    sortable: true,
    align: "right" as const,
    width: w,
    render: (val) => <span className="font-mono text-xs tabular-nums">{val}</span>
  });

  const columns: ColumnConfig<ReorderLevel>[] = [
    {
      key: "product",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRODUCT_OPTIONS,
      width: "160px",
      render: (val, row) => (
        <Link
          href={`/warehouse/reorder-level/view/${row.id}`}
          className="text-xs font-bold text-foreground hover:underline"
        >
          {val}
        </Link>
      )
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: WAREHOUSE_OPTIONS,
      width: "150px",
    },
    numCol("currentStock", "Current Stock"),
    numCol("reservedStock", "Reserved Stock", "130px"),
    numCol("reorderLevelQty", "Reorder Level Qty", "145px"),
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: STATUS_OPTIONS,
      width: "155px",
      render: (v: any) => <StatusBadge status={v} />,
    },
  ];

  const actions: ActionItemConfig<ReorderLevel>[] = [
    { label: "View", action: "view", icon: Eye, onClick: (row) => router.push(`/warehouse/reorder-level/view/${row.id}`) },
  ];

  return (
    <MasterListing<ReorderLevel>
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
      onAdd={() => router.push("/warehouse/reorder-level/create?from=overview")}
      addLabel="Set Reorder Level"
      emptyMessage=""
      searchPlaceholder="Search product, SKU or warehouse..."
    />
  );
}
