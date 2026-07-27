"use client";

import React, { useEffect, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { ReorderLevel } from "../types";
import Link from "next/link";
import { ReorderLevelService, toOrdering } from "../services";
import { ListingStatusToggle } from "@/components/listing";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";

const STOCK_STATUS_OPTIONS = [
  { label: "In Stock", value: "in stock" },
  { label: "Low Stock", value: "low stock" },
];

interface WarehouseWiseListingProps {
  selectedWarehouseId?: string;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === "Low Stock"
    ? { bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" }
    : { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

export function WarehouseWiseListing({ selectedWarehouseId }: WarehouseWiseListingProps) {
  const router = useRouter();
  const {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
  } = useAppliedListFilters();
  const [records, setRecords] = useState<ReorderLevel[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);

  const [sort, setSort] = useState<SortState>({ key: "updatedDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<ReorderLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(1);
  }, [selectedWarehouseId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    ReorderLevelService.list({
      page,
      pageSize,
      search: String(appliedFilters.search ?? ""),
      ordering: toOrdering(sort.key, sort.direction),
      reorder_type: "WAREHOUSE",
      warehouse_id: selectedWarehouseId,
      filters: appliedFilters,
      signal: controller.signal,
    })
      .then((result) => {
        setRecords(result.items);
        setTotalRecords(result.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError((err as { message?: string })?.message || "Failed to load reorder levels.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, pageSize, sort.key, sort.direction, appliedFilters, selectedWarehouseId]);

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
      filterOptions: filterOptions.product || [],
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
      key: "productCode",
      header: "Product Code",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.productCode || [],
      width: "130px",
      render: (v: any) => <span className="font-mono text-xs text-foreground font-semibold">{v}</span>,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.category || [],
      width: "140px",
    },
    {
      key: "unit",
      header: "Unit",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: filterOptions.unit || [],
      width: "100px",
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
      filterOptions: STOCK_STATUS_OPTIONS,
      width: "155px",
      render: (v: any) => <StatusBadge status={v} />,
    },
    {
      key: "activeStatus",
      header: "Active",
      sortable: false,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      width: "110px",
      render: (_v: any, row) => (
        <ListingStatusToggle
          active={row.isActive}
          onChange={() => {
            ReorderLevelService.toggleStatus(row.id)
              .then(() => {
                setRecords((prev) =>
                  prev.map((item) => (item.id === row.id ? { ...item, isActive: !item.isActive } : item)),
                );
              })
              .catch(() => undefined);
          }}
        />
      ),
    },
  ];

  const actions: ActionItemConfig<ReorderLevel>[] = [
    { label: "View", action: "view", icon: Eye, onClick: (row) => router.push(`/warehouse/reorder-level/view/${row.id}`) },
    { label: "Edit", action: "edit", icon: Pencil, onClick: (row) => router.push(`/warehouse/reorder-level/edit/${row.id}`) },
    { label: "Delete", action: "delete", icon: Trash2, onClick: (row) => setDeleteTarget(row) },
  ];

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    ReorderLevelService.delete(deleteTarget.id)
      .then(() => {
        setDeleteTarget(null);
        setPage(1);
      })
      .catch(() => {
        setDeleteTarget(null);
      });
  };

  const handleOpenFilter = (columnKey: string) => {
    const keyMap: Record<string, "product_name" | "product_code" | "category_name" | "unit_name" | "warehouse_name"> = {
      product: "product_name",
      productCode: "product_code",
      category: "category_name",
      unit: "unit_name",
      warehouse: "warehouse_name",
    };
    const field = keyMap[columnKey];
    if (!field || filterOptions[columnKey] || loadingFilters.has(columnKey)) return;

    setLoadingFilters((prev) => new Set(prev).add(columnKey));
    ReorderLevelService.filterDropdown(field, {
      reorder_type: "WAREHOUSE",
      warehouse_id: selectedWarehouseId,
    })
      .then((options) => {
        setFilterOptions((prev) => ({ ...prev, [columnKey]: options }));
      })
      .finally(() => {
        setLoadingFilters((prev) => {
          const next = new Set(prev);
          next.delete(columnKey);
          return next;
        });
      });
  };

  return (
    <>
      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
      <MasterListing<ReorderLevel>
        columns={columns}
        data={records}
        loading={loading}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={(next) => {
          setDraftFilters(next);
          applyFilters(next);
          setPage(1);
        }}
        actions={actions}
        onAdd={() => router.push(`/warehouse/reorder-level/create?warehouse=${encodeURIComponent(selectedWarehouseId || "")}`)}
        addLabel="Set Reorder Level"
        emptyMessage=""
        searchPlaceholder="Search product or code..."
        currentFilters={draftFilters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
        onExport={() =>
          ReorderLevelService.export({
            search: String(appliedFilters.search ?? ""),
            ordering: toOrdering(sort.key, sort.direction),
            reorder_type: "WAREHOUSE",
            warehouse_id: selectedWarehouseId,
            export_type: "excel",
            filters: appliedFilters,
          })
        }
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
