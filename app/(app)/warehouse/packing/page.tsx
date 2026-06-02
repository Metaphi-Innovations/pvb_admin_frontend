"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import {
  Boxes, Package, Eye, FileText, ClipboardCheck, ArrowLeftRight,
  PlusCircle, AlertTriangle, CheckCircle2, Clock, ShieldAlert, User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKPICard } from "@/components/ui/KPICard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SalesOrderRecord, PackingRecord } from "./types";
import { getSalesOrders, getPackingRecordsList } from "./services";
import {
  WAREHOUSE_OPTIONS,
  PRODUCT_OPTIONS,
  CUSTOMER_OPTIONS,
  PACKED_BY_OPTIONS,
  PRIORITY_OPTIONS,
  READY_STATUS_OPTIONS,
  DONE_STATUS_OPTIONS,
  PRIORITY_BADGE_CONFIG,
  STATUS_BADGE_CONFIG
} from "./constants";

export default function PackingManagementPage() {
  const router = useRouter();

  // Tab State & Warehouse filter
  const [activeTab, setActiveTab] = useState("ready-for-packing");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");

  // Raw mock lists
  const [rawOrders, setRawOrders] = useState<SalesOrderRecord[]>([]);
  const [rawPackings, setRawPackings] = useState<PackingRecord[]>([]);

  // Filtering / Sorting / Pagination States per Tab
  // Tab 1: Ready For Packing
  const [readyFilters, setReadyFilters] = useState<FilterState>({});
  const [readySort, setReadySort] = useState<SortState>({ key: "", direction: "none" });
  const [readyPage, setReadyPage] = useState(1);
  const [readyPageSize, setReadyPageSize] = useState(10);

  // Tab 2: Packing Done
  const [doneFilters, setDoneFilters] = useState<FilterState>({});
  const [doneSort, setDoneSort] = useState<SortState>({ key: "", direction: "none" });
  const [donePage, setDonePage] = useState(1);
  const [donePageSize, setDonePageSize] = useState(10);

  // Load lists on mount
  useEffect(() => {
    setRawOrders(getSalesOrders("All"));
    setRawPackings(getPackingRecordsList("All"));
  }, []);

  // Filter based on selected warehouse
  const ordersForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawOrders;
    return rawOrders.filter(o => o.warehouse === selectedWarehouse);
  }, [rawOrders, selectedWarehouse]);

  const packingsForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawPackings;
    return rawPackings.filter(p => p.warehouse === selectedWarehouse);
  }, [rawPackings, selectedWarehouse]);

  // KPIs
  const stats = useMemo(() => {
    const totalOrdersCount = ordersForWarehouse.length;
    const highUrgentCount = ordersForWarehouse.filter(o => o.priority === "High" || o.priority === "Urgent").length;
    const completedPackingsCount = packingsForWarehouse.length;
    const totalQtyPacked = packingsForWarehouse.reduce((acc, curr) => acc + curr.packedQuantity, 0);

    return {
      totalOrdersCount,
      highUrgentCount,
      completedPackingsCount,
      totalQtyPacked,
    };
  }, [ordersForWarehouse, packingsForWarehouse]);

  // Tab 1: Ready For Packing - Process filters/sort client side
  const processedReady = useMemo(() => {
    let result = [...ordersForWarehouse];
    Object.keys(readyFilters).forEach((key) => {
      const val = readyFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.salesOrderNo.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q)
        );
      } else if (key === "salesOrderNo") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => item.salesOrderNo.toLowerCase().includes(q));
      } else if (key === "customer" || key === "priority" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof SalesOrderRecord])));
      } else if (key === "orderDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.orderDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.orderDate <= range.toDate);
      } else if (key === "deliveryDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.deliveryDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.deliveryDate <= range.toDate);
      }
    });

    if (readySort.key && readySort.direction !== "none") {
      result.sort((a, b) => {
        if (readySort.key === "totalItems" || readySort.key === "totalQuantity" || readySort.key === "orderAmount") {
          return readySort.direction === "asc"
            ? (a[readySort.key as keyof SalesOrderRecord] as number) - (b[readySort.key as keyof SalesOrderRecord] as number)
            : (b[readySort.key as keyof SalesOrderRecord] as number) - (a[readySort.key as keyof SalesOrderRecord] as number);
        }
        const valA = String(a[readySort.key as keyof SalesOrderRecord] || "");
        const valB = String(b[readySort.key as keyof SalesOrderRecord] || "");
        return readySort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [ordersForWarehouse, readyFilters, readySort]);

  const paginatedReady = useMemo(() => {
    const start = (readyPage - 1) * readyPageSize;
    return processedReady.slice(start, start + readyPageSize);
  }, [processedReady, readyPage, readyPageSize]);

  // Tab 2: Packing Done - Process filters/sort client side
  const processedDone = useMemo(() => {
    let result = [...packingsForWarehouse];
    Object.keys(doneFilters).forEach((key) => {
      const val = doneFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.packingNo.toLowerCase().includes(q) ||
          item.salesOrderNo.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q)
        );
      } else if (key === "packingNo" || key === "salesOrderNo") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof PackingRecord]).toLowerCase().includes(q));
      } else if (key === "customer" || key === "packedBy" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof PackingRecord])));
      } else if (key === "packingDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.packingDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.packingDate <= range.toDate);
      }
    });

    if (doneSort.key && doneSort.direction !== "none") {
      result.sort((a, b) => {
        if (doneSort.key === "totalItems" || doneSort.key === "packedQuantity") {
          return doneSort.direction === "asc"
            ? (a[doneSort.key as keyof PackingRecord] as number) - (b[doneSort.key as keyof PackingRecord] as number)
            : (b[doneSort.key as keyof PackingRecord] as number) - (a[doneSort.key as keyof PackingRecord] as number);
        }
        const valA = String(a[doneSort.key as keyof PackingRecord] || "");
        const valB = String(b[doneSort.key as keyof PackingRecord] || "");
        return doneSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [packingsForWarehouse, doneFilters, doneSort]);

  const paginatedDone = useMemo(() => {
    const start = (donePage - 1) * donePageSize;
    return processedDone.slice(start, start + donePageSize);
  }, [processedDone, donePage, donePageSize]);

  // Tab 1: Ready For Packing Columns
  const readyColumns: ColumnConfig<SalesOrderRecord>[] = [
    { key: "salesOrderNo", header: "Sales Order No", sortable: true, filterable: true, filterType: "text", width: "135px" },
    { key: "customer", header: "Customer", sortable: true, filterable: true, filterType: "dropdown", filterOptions: CUSTOMER_OPTIONS },
    { key: "totalItems", header: "Total Items", sortable: true, align: "center", width: "110px" },
    { key: "totalQuantity", header: "Total Qty", sortable: true, align: "center", width: "110px" },
    {
      key: "orderAmount",
      header: "Order Amount",
      sortable: true,
      align: "right",
      width: "125px",
      render: (val: any) => `₹${Number(val).toLocaleString("en-IN")}`
    },
    { key: "orderDate", header: "Order Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    { key: "deliveryDate", header: "Delivery Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PRIORITY_OPTIONS,
      width: "110px",
      render: (val: any) => {
        const cfg = PRIORITY_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: READY_STATUS_OPTIONS,
      width: "155px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      }
    },
  ];

  // Tab 2: Packing Done Columns
  const doneColumns: ColumnConfig<PackingRecord>[] = [
    { key: "packingNo", header: "Packing No", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "salesOrderNo", header: "Sales Order No", sortable: true, filterable: true, filterType: "text", width: "135px" },
    { key: "customer", header: "Customer", sortable: true, filterable: true, filterType: "dropdown", filterOptions: CUSTOMER_OPTIONS },
    { key: "totalItems", header: "Total Items", sortable: true, align: "center", width: "110px" },
    { key: "packedQuantity", header: "Packed Quantity", sortable: true, align: "center", width: "130px" },
    { key: "packingDate", header: "Packing Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    { key: "packedBy", header: "Packed By", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PACKED_BY_OPTIONS, width: "130px" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: DONE_STATUS_OPTIONS,
      width: "130px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      }
    },
  ];

  // Tab 1 Actions
  const readyActions: ActionItemConfig<SalesOrderRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
    {
      label: "Create Packing",
      action: "create_packing",
      icon: PlusCircle,
      onClick: (row) => router.push(`/warehouse/packing/create/${row.id}`),
    },
  ];

  // Tab 2 Actions
  const doneActions: ActionItemConfig<PackingRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
  ];

  return (
    <AppLayout>
      <div className="w-full space-y-5">
        {/* Page Header */}
        <div className="flex flex-col gap-1 border-b pb-4">
          <p className="text-[11px] text-muted-foreground mb-0.5">
            Warehouse &rsaquo; Packing Management
          </p>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Boxes className="w-5 h-5 text-brand-600" />
            Packing Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage sales order packing lists, track item quantities, and record completed packaging sessions.
          </p>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPICard label="Orders to Pack" value={stats.totalOrdersCount} icon={Package} accent={true} />
          <MiniKPICard label="High/Urgent Priority" value={stats.highUrgentCount} icon={AlertTriangle} accent={false} />
          <MiniKPICard label="Completed Packings" value={stats.completedPackingsCount} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Total Packed Qty" value={stats.totalQtyPacked} icon={Boxes} accent={false} />
        </div>

        {/* Tabs and Inline Warehouse Selector */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex">
              <TabsTrigger
                value="ready-for-packing"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Ready For Packing
              </TabsTrigger>
              <TabsTrigger
                value="packing-done"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Packing Done
              </TabsTrigger>
            </TabsList>

            {/* Warehouse Dropdown inline with tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Warehouse:</span>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="h-9 w-[200px] text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Warehouses</SelectItem>
                  {WAREHOUSE_OPTIONS.map(w => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TAB 1: Ready For Packing */}
          <TabsContent value="ready-for-packing" className="mt-0 outline-none">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-foreground">Orders Ready for Packaging</h2>
              </div>
              <MasterListing<SalesOrderRecord>
                columns={readyColumns}
                data={paginatedReady}
                totalRecords={processedReady.length}
                page={readyPage}
                pageSize={readyPageSize}
                onPageChange={setReadyPage}
                onPageSizeChange={setReadyPageSize}
                onSortChange={setReadySort}
                onFilterChange={setReadyFilters}
                actions={readyActions}
                emptyMessage="ready sales orders"
                searchPlaceholder="Search SO..."
              />
            </div>
          </TabsContent>

          {/* TAB 2: Packing Done */}
          <TabsContent value="packing-done" className="mt-0 outline-none">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-foreground">Completed Packing Receipts</h2>
              </div>
              <MasterListing<PackingRecord>
                columns={doneColumns}
                data={paginatedDone}
                totalRecords={processedDone.length}
                page={donePage}
                pageSize={donePageSize}
                onPageChange={setDonePage}
                onPageSizeChange={setDonePageSize}
                onSortChange={setDoneSort}
                onFilterChange={setDoneFilters}
                actions={doneActions}
                emptyMessage="completed packing records"
                searchPlaceholder="Search Packing No..."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
