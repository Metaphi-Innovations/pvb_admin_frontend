"use client";

import React, { useState, useMemo } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { ReorderLevel } from "../types";
import { deleteReorder } from "../services";
import { PRODUCT_OPTIONS, STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "../constants";

interface WarehouseWiseListingProps {
  warehouseRecords: ReorderLevel[];
  selectedWarehouse: string;
  reload: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

export function WarehouseWiseListing({ warehouseRecords, selectedWarehouse, reload }: WarehouseWiseListingProps) {
  const router = useRouter();

  // Table state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<ReorderLevel | null>(null);

  // Processing
  const processed = useMemo(() => {
    let result = [...warehouseRecords];
    Object.keys(filters).forEach(key => {
      const val = filters[key];
      if (!val) return;
      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(r =>
          r.product.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      } else if (key === "product") {
        result = result.filter(r => (val as string[]).includes(r.product));
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
  }, [warehouseRecords, filters, sort]);

  const paginated = useMemo(() => {
    const s = (page - 1) * pageSize;
    return processed.slice(s, s + pageSize);
  }, [processed, page, pageSize]);

  // Helper
  const numCol = (key: string, header: string, w = "120px"): ColumnConfig<ReorderLevel> => ({
    key: key as keyof ReorderLevel,
    header,
    sortable: true,
    align: "center" as const,
    width: w,
  });

  const columns: ColumnConfig<ReorderLevel>[] = [
    {
      key: "product",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRODUCT_OPTIONS,
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      width: "130px",
      render: (v: any) => <span className="font-mono text-xs text-brand-700 font-bold">{v}</span>,
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
    { label: "Edit", action: "edit", icon: Pencil, onClick: (row) => router.push(`/warehouse/reorder-level/edit/${row.id}`) },
    { label: "Delete", action: "delete", icon: Trash2, onClick: (row) => setDeleteTarget(row) },
  ];

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteReorder(deleteTarget.id);
    setDeleteTarget(null);
    reload();
  };

  return (
    <>
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
        onAdd={() => router.push(`/warehouse/reorder-level/create?warehouse=${encodeURIComponent(selectedWarehouse)}`)}
        addLabel="Set Reorder Level"
        emptyMessage="reorder level configurations"
        searchPlaceholder="Search product or SKU..."
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-rose-500" />
              </div>
              Delete Reorder Level?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove reorder configuration for{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.product}</span>{" "}
            in <span className="font-semibold text-foreground">{deleteTarget?.warehouse}</span>?
            This cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1" onClick={handleDeleteConfirm}>
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
