"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import {
  AlertTriangle, BarChart2, CheckCircle2, Eye, Pencil, Trash2,
  ShieldAlert, Activity, PackageX, Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKPICard } from "@/components/ui/KPICard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { ReorderLevel } from "./types";
import { getReordersByWarehouse, getAllReorders, generateStats, deleteReorder } from "./services";
import { WAREHOUSE_OPTIONS, PRODUCT_OPTIONS, STATUS_OPTIONS, STATUS_BADGE_CONFIG } from "./constants";

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

export default function ReorderLevelPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("warehouse-wise");
  const [selectedWarehouse, setSelectedWarehouse] = useState("Central Warehouse");
  const [allRecords, setAllRecords] = useState<ReorderLevel[]>([]);
  const [warehouseRecords, setWarehouseRecords] = useState<ReorderLevel[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ReorderLevel | null>(null);

  // Warehouse-wise table state
  const [wwFilters, setWwFilters] = useState<FilterState>({});
  const [wwSort, setWwSort] = useState<SortState>({ key: "", direction: "none" });
  const [wwPage, setWwPage] = useState(1);
  const [wwPageSize, setWwPageSize] = useState(10);

  // Product overview table state
  const [poFilters, setPoFilters] = useState<FilterState>({});
  const [poSort, setPoSort] = useState<SortState>({ key: "", direction: "none" });
  const [poPage, setPoPage] = useState(1);
  const [poPageSize, setPoPageSize] = useState(10);

  const reload = useCallback(() => {
    setAllRecords(getAllReorders());
    setWarehouseRecords(getReordersByWarehouse(selectedWarehouse));
  }, [selectedWarehouse]);

  useEffect(() => { reload(); }, [reload]);

  const stats = useMemo(() => generateStats(allRecords), [allRecords]);

  // ── Warehouse-wise processing ──────────────────────────────────────────────
  const processedWW = useMemo(() => {
    let result = [...warehouseRecords];
    Object.keys(wwFilters).forEach(key => {
      const val = wwFilters[key];
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
    if (wwSort.key && wwSort.direction !== "none") {
      result.sort((a, b) => {
        const numKeys = ["currentStock", "reservedStock", "reorderLevelQty"];
        if (numKeys.includes(wwSort.key)) {
          const diff = (a[wwSort.key as keyof ReorderLevel] as number) - (b[wwSort.key as keyof ReorderLevel] as number);
          return wwSort.direction === "asc" ? diff : -diff;
        }
        const vA = String(a[wwSort.key as keyof ReorderLevel] || "");
        const vB = String(b[wwSort.key as keyof ReorderLevel] || "");
        return wwSort.direction === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      });
    }
    return result;
  }, [warehouseRecords, wwFilters, wwSort]);

  const paginatedWW = useMemo(() => {
    const s = (wwPage - 1) * wwPageSize;
    return processedWW.slice(s, s + wwPageSize);
  }, [processedWW, wwPage, wwPageSize]);

  // ── Product overview processing ────────────────────────────────────────────
  const processedPO = useMemo(() => {
    let result = [...allRecords];
    Object.keys(poFilters).forEach(key => {
      const val = poFilters[key];
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
    if (poSort.key && poSort.direction !== "none") {
      result.sort((a, b) => {
        const numKeys = ["currentStock", "reservedStock", "reorderLevelQty"];
        if (numKeys.includes(poSort.key)) {
          const diff = (a[poSort.key as keyof ReorderLevel] as number) - (b[poSort.key as keyof ReorderLevel] as number);
          return poSort.direction === "asc" ? diff : -diff;
        }
        const vA = String(a[poSort.key as keyof ReorderLevel] || "");
        const vB = String(b[poSort.key as keyof ReorderLevel] || "");
        return poSort.direction === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      });
    }
    return result;
  }, [allRecords, poFilters, poSort]);

  const paginatedPO = useMemo(() => {
    const s = (poPage - 1) * poPageSize;
    return processedPO.slice(s, s + poPageSize);
  }, [processedPO, poPage, poPageSize]);

  // ── Columns ────────────────────────────────────────────────────────────────
  const numCol = (key: string, header: string, w = "120px"): ColumnConfig<ReorderLevel> => ({
    key: key as keyof ReorderLevel,
    header,
    sortable: true,
    align: "center" as const,
    width: w,
  });

  const wwColumns: ColumnConfig<ReorderLevel>[] = [
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

  const poColumns: ColumnConfig<ReorderLevel>[] = [
    {
      key: "product",
      header: "Product",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRODUCT_OPTIONS,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: WAREHOUSE_OPTIONS,
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

  // ── Actions ────────────────────────────────────────────────────────────────
  const wwActions: ActionItemConfig<ReorderLevel>[] = [
    { label: "View", action: "view", icon: Eye, onClick: (row) => router.push(`/warehouse/reorder-level/view/${row.id}`) },
    { label: "Edit", action: "edit", icon: Pencil, onClick: (row) => router.push(`/warehouse/reorder-level/edit/${row.id}`) },
    { label: "Delete", action: "delete", icon: Trash2, onClick: (row) => setDeleteTarget(row) },
  ];

  const poActions: ActionItemConfig<ReorderLevel>[] = [
    { label: "View", action: "view", icon: Eye, onClick: (row) => router.push(`/warehouse/reorder-level/view/${row.id}`) },
  ];

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteReorder(deleteTarget.id);
    setDeleteTarget(null);
    reload();
  };

  return (
    <AppLayout>
      <div className="w-full space-y-5">
        {/* Page Header */}
        <div className="flex flex-col gap-1 border-b pb-4">
          <p className="text-[11px] text-muted-foreground mb-0.5">Warehouse &rsaquo; Reorder Level Management</p>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" />
            Reorder Level Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Define minimum stock thresholds per warehouse. Set for one warehouse or apply across all at once.
          </p>
        </div>

        {/* KPI Cards — global stats across all warehouses */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MiniKPICard label="Total Configured" value={stats.totalConfigured} icon={Layers} accent={true} />
          <MiniKPICard label="In Stock" value={stats.inStock} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Low Stock" value={stats.lowStock} icon={ShieldAlert} accent={false} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex">
              <TabsTrigger
                value="warehouse-wise"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
                Warehouse Wise
              </TabsTrigger>
              <TabsTrigger
                value="product-overview"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Product Overview
              </TabsTrigger>
            </TabsList>

            {/* Warehouse selector + Create button — only on Warehouse Wise tab */}
            {activeTab === "warehouse-wise" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Warehouse:</span>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="h-9 w-[200px] text-xs rounded-lg border-border bg-white focus:ring-1 focus:ring-brand-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WAREHOUSE_OPTIONS.map(w => (
                      <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5 whitespace-nowrap"
                  onClick={() => router.push(`/warehouse/reorder-level/create?warehouse=${encodeURIComponent(selectedWarehouse)}`)}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Set Reorder Level
                </Button>
              </div>
            )}

            {/* Product Overview button at the end of the tab list header row */}
            {activeTab === "product-overview" && (
              <Button
                size="sm"
                className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5 whitespace-nowrap"
                onClick={() => router.push("/warehouse/reorder-level/create?from=overview")}
              >
                <Activity className="w-3.5 h-3.5" />
                Set Reorder Level
              </Button>
            )}
          </div>

          {/* TAB 1: Warehouse Wise */}
          <TabsContent value="warehouse-wise" className="mt-0 outline-none">
            <div className="space-y-3">
              <MasterListing<ReorderLevel>
                columns={wwColumns}
                data={paginatedWW}
                totalRecords={processedWW.length}
                page={wwPage}
                pageSize={wwPageSize}
                onPageChange={setWwPage}
                onPageSizeChange={setWwPageSize}
                onSortChange={setWwSort}
                onFilterChange={setWwFilters}
                actions={wwActions}
                emptyMessage="reorder level configurations"
                searchPlaceholder="Search product or SKU..."
              />
            </div>
          </TabsContent>

          {/* TAB 2: Product Overview */}
          <TabsContent value="product-overview" className="mt-0 outline-none">
            <div className="space-y-3">
              <MasterListing<ReorderLevel>
                columns={poColumns}
                data={paginatedPO}
                totalRecords={processedPO.length}
                page={poPage}
                pageSize={poPageSize}
                onPageChange={setPoPage}
                onPageSizeChange={setPoPageSize}
                onSortChange={setPoSort}
                onFilterChange={setPoFilters}
                actions={poActions}
                emptyMessage="product reorder configurations"
                searchPlaceholder="Search product, SKU or warehouse..."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
    </AppLayout>
  );
}
