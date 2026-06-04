"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import {
  Package, Boxes, CalendarDays, Eye, AlertTriangle,
  CheckCircle2, XCircle, Clock, ShieldAlert, FileText, ClipboardCheck, ArrowUpDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord } from "./types";
import { getQcPassedStockList, getRejectedStockList, getGrnPendingStockList } from "./services";
import {
  PRODUCT_OPTIONS,
  WAREHOUSE_OPTIONS,
  VENDOR_OPTIONS,
  QC_PASSED_STATUS_OPTIONS,
  REJECTED_STATUS_OPTIONS,
  GRN_PENDING_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG
} from "./constants";

export default function StockOverviewPage() {
  const router = useRouter();

  // Tabs state
  const [activeTab, setActiveTab] = useState("qc-passed");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");

  // Raw mock lists
  const [rawQcPassed, setRawQcPassed] = useState<QcPassedStockRecord[]>([]);
  const [rawRejected, setRawRejected] = useState<RejectedStockRecord[]>([]);
  const [rawGrnPending, setRawGrnPending] = useState<GrnPendingStockRecord[]>([]);

  // Filtering / Sorting / Pagination States per Tab
  // Tab 1: QC Passed
  const [qcPassedFilters, setQcPassedFilters] = useState<FilterState>({});
  const [qcPassedSort, setQcPassedSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPassedPage, setQcPassedPage] = useState(1);
  const [qcPassedPageSize, setQcPassedPageSize] = useState(10);

  // Tab 2: Rejected
  const [rejectedFilters, setRejectedFilters] = useState<FilterState>({});
  const [rejectedSort, setRejectedSort] = useState<SortState>({ key: "", direction: "none" });
  const [rejectedPage, setRejectedPage] = useState(1);
  const [rejectedPageSize, setRejectedPageSize] = useState(10);

  // Tab 3: GRN Pending
  const [grnPendingFilters, setGrnPendingFilters] = useState<FilterState>({});
  const [grnPendingSort, setGrnPendingSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPendingPage, setGrnPendingPage] = useState(1);
  const [grnPendingPageSize, setGrnPendingPageSize] = useState(10);

  // Load stock lists
  useEffect(() => {
    setRawQcPassed(getQcPassedStockList());
    setRawRejected(getRejectedStockList());
    setRawGrnPending(getGrnPendingStockList());
  }, []);

  // Filter lists based on the selected warehouse dropdown at the top
  const qcPassedForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawQcPassed;
    return rawQcPassed.filter(item => item.warehouse === selectedWarehouse);
  }, [rawQcPassed, selectedWarehouse]);

  const rejectedForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawRejected;
    return rawRejected.filter(item => item.warehouse === selectedWarehouse);
  }, [rawRejected, selectedWarehouse]);

  const grnPendingForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawGrnPending;
    return rawGrnPending.filter(item => item.warehouse === selectedWarehouse);
  }, [rawGrnPending, selectedWarehouse]);

  // Dynamic KPI calculations based on selected warehouse
  const stats = useMemo(() => {
    const totalStock = qcPassedForWarehouse.reduce((acc, curr) => acc + curr.availableQuantity + curr.reservedQuantity, 0);
    const qcPassedQty = qcPassedForWarehouse.reduce((acc, curr) => acc + curr.availableQuantity, 0);
    const rejectedQty = rejectedForWarehouse.reduce((acc, curr) => acc + curr.rejectedQuantity, 0);
    const grnPendingQty = grnPendingForWarehouse.reduce((acc, curr) => acc + curr.receivedQuantity, 0);
    const nearExpiry = qcPassedForWarehouse.filter(r => r.status === "Near Expiry").length;
    const expired = qcPassedForWarehouse.filter(r => r.status === "Expired").length;

    return {
      totalStock,
      qcPassedQty,
      rejectedQty,
      grnPendingQty,
      nearExpiry,
      expired,
    };
  }, [qcPassedForWarehouse, rejectedForWarehouse, grnPendingForWarehouse]);

  // Tab 1: QC Passed - Processing
  const processedQcPassed = useMemo(() => {
    let result = [...qcPassedForWarehouse];
    Object.keys(qcPassedFilters).forEach((key) => {
      const val = qcPassedFilters[key];
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

    if (qcPassedSort.key && qcPassedSort.direction !== "none") {
      result.sort((a, b) => {
        if (qcPassedSort.key === "availableQuantity" || qcPassedSort.key === "reservedQuantity") {
          const valA = a[qcPassedSort.key as "availableQuantity" | "reservedQuantity"];
          const valB = b[qcPassedSort.key as "availableQuantity" | "reservedQuantity"];
          return qcPassedSort.direction === "asc" ? valA - valB : valB - valA;
        }
        const valA = String(a[qcPassedSort.key as keyof QcPassedStockRecord] || "");
        const valB = String(b[qcPassedSort.key as keyof QcPassedStockRecord] || "");
        return qcPassedSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [qcPassedForWarehouse, qcPassedFilters, qcPassedSort]);

  const paginatedQcPassed = useMemo(() => {
    const start = (qcPassedPage - 1) * qcPassedPageSize;
    return processedQcPassed.slice(start, start + qcPassedPageSize);
  }, [processedQcPassed, qcPassedPage, qcPassedPageSize]);

  // Tab 2: Rejected - Processing
  const processedRejected = useMemo(() => {
    let result = [...rejectedForWarehouse];
    Object.keys(rejectedFilters).forEach((key) => {
      const val = rejectedFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.product.toLowerCase().includes(q) ||
          item.warehouse.toLowerCase().includes(q) ||
          item.batchNumber.toLowerCase().includes(q) ||
          item.qcNumber.toLowerCase().includes(q) ||
          item.rejectionReason.toLowerCase().includes(q)
        );
      } else if (key === "batchNumber" || key === "qcNumber") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof RejectedStockRecord]).toLowerCase().includes(q));
      } else if (key === "product" || key === "warehouse" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof RejectedStockRecord])));
      } else if (key === "inspectionDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.inspectionDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.inspectionDate <= range.toDate);
      }
    });

    if (rejectedSort.key && rejectedSort.direction !== "none") {
      result.sort((a, b) => {
        if (rejectedSort.key === "rejectedQuantity") {
          return rejectedSort.direction === "asc"
            ? a.rejectedQuantity - b.rejectedQuantity
            : b.rejectedQuantity - a.rejectedQuantity;
        }
        const valA = String(a[rejectedSort.key as keyof RejectedStockRecord] || "");
        const valB = String(b[rejectedSort.key as keyof RejectedStockRecord] || "");
        return rejectedSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [rejectedForWarehouse, rejectedFilters, rejectedSort]);

  const paginatedRejected = useMemo(() => {
    const start = (rejectedPage - 1) * rejectedPageSize;
    return processedRejected.slice(start, start + rejectedPageSize);
  }, [processedRejected, rejectedPage, rejectedPageSize]);

  // Tab 3: GRN Pending - Processing
  const processedGrnPending = useMemo(() => {
    let result = [...grnPendingForWarehouse];
    Object.keys(grnPendingFilters).forEach((key) => {
      const val = grnPendingFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.grnNo.toLowerCase().includes(q) ||
          item.product.toLowerCase().includes(q) ||
          item.warehouse.toLowerCase().includes(q) ||
          item.vendor.toLowerCase().includes(q) ||
          item.batchNumber.toLowerCase().includes(q)
        );
      } else if (key === "grnNo" || key === "batchNumber") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof GrnPendingStockRecord]).toLowerCase().includes(q));
      } else if (key === "product" || key === "warehouse" || key === "vendor" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof GrnPendingStockRecord])));
      } else if (key === "grnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.grnDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.grnDate <= range.toDate);
      }
    });

    if (grnPendingSort.key && grnPendingSort.direction !== "none") {
      result.sort((a, b) => {
        if (grnPendingSort.key === "receivedQuantity") {
          return grnPendingSort.direction === "asc"
            ? a.receivedQuantity - b.receivedQuantity
            : b.receivedQuantity - a.receivedQuantity;
        }
        const valA = String(a[grnPendingSort.key as keyof GrnPendingStockRecord] || "");
        const valB = String(b[grnPendingSort.key as keyof GrnPendingStockRecord] || "");
        return grnPendingSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [grnPendingForWarehouse, grnPendingFilters, grnPendingSort]);

  const paginatedGrnPending = useMemo(() => {
    const start = (grnPendingPage - 1) * grnPendingPageSize;
    return processedGrnPending.slice(start, start + grnPendingPageSize);
  }, [processedGrnPending, grnPendingPage, grnPendingPageSize]);

  // Tab 1: QC Passed Columns
  const qcPassedColumns: ColumnConfig<QcPassedStockRecord>[] = [
    { key: "product", header: "Product", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PRODUCT_OPTIONS },
    { key: "warehouse", header: "Warehouse", sortable: true, filterable: true, filterType: "dropdown", filterOptions: WAREHOUSE_OPTIONS },
    { key: "batchNumber", header: "Batch Number", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "availableQuantity", header: "Available Qty", sortable: true, filterable: true, filterType: "text", align: "center", width: "130px" },
    { key: "reservedQuantity", header: "Reserved Qty", sortable: true, filterable: true, filterType: "text", align: "center", width: "130px" },
    { key: "manufacturingDate", header: "Mfg Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    { key: "expiryDate", header: "Expiry Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: QC_PASSED_STATUS_OPTIONS,
      width: "135px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  // Tab 2: Rejected Columns
  const rejectedColumns: ColumnConfig<RejectedStockRecord>[] = [
    { key: "product", header: "Product", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PRODUCT_OPTIONS },
    { key: "warehouse", header: "Warehouse", sortable: true, filterable: true, filterType: "dropdown", filterOptions: WAREHOUSE_OPTIONS },
    { key: "batchNumber", header: "Batch Number", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "rejectedQuantity", header: "Rejected Qty", sortable: true, align: "center", width: "130px" },
    { key: "rejectionReason", header: "Rejection Reason", sortable: true },
    { key: "qcNumber", header: "QC Number", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "inspectionDate", header: "Inspection Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: REJECTED_STATUS_OPTIONS,
      width: "145px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  // Tab 3: GRN Pending Columns
  const grnPendingColumns: ColumnConfig<GrnPendingStockRecord>[] = [
    { key: "grnNo", header: "GRN No", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "product", header: "Product", sortable: true, filterable: true, filterType: "dropdown", filterOptions: PRODUCT_OPTIONS },
    { key: "warehouse", header: "Warehouse", sortable: true, filterable: true, filterType: "dropdown", filterOptions: WAREHOUSE_OPTIONS },
    { key: "batchNumber", header: "Batch Number", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "receivedQuantity", header: "Received Qty", sortable: true, align: "center", width: "130px" },
    { key: "grnDate", header: "GRN Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    { key: "vendor", header: "Vendor", sortable: true, filterable: true, filterType: "dropdown", filterOptions: VENDOR_OPTIONS },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: GRN_PENDING_STATUS_OPTIONS,
      width: "145px",
      render: (val: any) => {
        const cfg = STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  // Action Menu configs
  const qcPassedActions: ActionItemConfig<QcPassedStockRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/stockoverview/view/${row.id}`),
    },
  ];

  const rejectedActions: ActionItemConfig<RejectedStockRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/stockoverview/view/${row.id}`),
    },
  ];

  const grnPendingActions: ActionItemConfig<GrnPendingStockRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/stockoverview/view/${row.id}`),
    },
    {
      label: "Generate QC",
      action: "generate_qc",
      icon: CheckCircle2,
      onClick: (row) => router.push(`/warehouse/grnqc/qc/create?grnId=${row.grnNo}`),
    },
  ];

  return (
    <AppLayout>
      <div className="w-full space-y-5">
        {/* Page Header */}
        <div className="flex flex-col gap-1 border-b pb-4">
          <p className="text-[11px] text-muted-foreground mb-0.5">
            Warehouse &rsaquo; Stock Overview
          </p>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Boxes className="w-5 h-5 text-brand-600" />
            Stock Overview Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Monitor warehouse stages of inventory from arrival to inspection and dispatch.
          </p>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKPICard label="Total Stock" value={stats.totalStock} icon={Boxes} accent={true} />
          <MiniKPICard label="QC Passed Stock" value={stats.qcPassedQty} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Rejected Stock" value={stats.rejectedQty} icon={XCircle} accent={false} />
          <MiniKPICard label="GRN Pending Stock" value={stats.grnPendingQty} icon={Clock} accent={false} />
          <MiniKPICard label="Near Expiry" value={stats.nearExpiry} icon={CalendarDays} accent={false} />
          <MiniKPICard label="Expired Stock" value={stats.expired} icon={ShieldAlert} accent={false} />
        </div>

        {/* Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex">
              <TabsTrigger
                value="qc-passed"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                QC Passed Stock
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Rejected Stock
              </TabsTrigger>
              <TabsTrigger
                value="grn-pending"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                GRN Pending Stock
              </TabsTrigger>
            </TabsList>

            {/* Warehouse Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Warehouse:</span>
              <AutocompleteSelect
                options={[
                  { value: "All", label: "All Warehouses" },
                  ...WAREHOUSE_OPTIONS
                ]}
                value={selectedWarehouse}
                onChange={setSelectedWarehouse}
                placeholder="All Warehouses"
                searchPlaceholder="Search warehouse..."
                className="h-9 w-[200px] text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
              />
            </div>
          </div>

          {/* TAB 1: QC Passed Stock */}
          <TabsContent value="qc-passed" className="mt-0 outline-none">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-foreground">QC Passed Available Inventory</h2>
              </div>
              <MasterListing<QcPassedStockRecord>
                columns={qcPassedColumns}
                data={paginatedQcPassed}
                totalRecords={processedQcPassed.length}
                page={qcPassedPage}
                pageSize={qcPassedPageSize}
                onPageChange={setQcPassedPage}
                onPageSizeChange={setQcPassedPageSize}
                onSortChange={setQcPassedSort}
                onFilterChange={setQcPassedFilters}
                actions={qcPassedActions}
                emptyMessage="QC Passed stock records"
                searchPlaceholder="Search QC Passed..."
              />
            </div>
          </TabsContent>

          {/* TAB 2: Rejected Stock */}
          <TabsContent value="rejected" className="mt-0 outline-none">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-foreground">QC Rejected Stock</h2>
              </div>
              <MasterListing<RejectedStockRecord>
                columns={rejectedColumns}
                data={paginatedRejected}
                totalRecords={processedRejected.length}
                page={rejectedPage}
                pageSize={rejectedPageSize}
                onPageChange={setRejectedPage}
                onPageSizeChange={setRejectedPageSize}
                onSortChange={setRejectedSort}
                onFilterChange={setRejectedFilters}
                actions={rejectedActions}
                emptyMessage="rejected stock records"
                searchPlaceholder="Search Rejected Stock..."
              />
            </div>
          </TabsContent>

          {/* TAB 3: GRN Pending Stock */}
          <TabsContent value="grn-pending" className="mt-0 outline-none">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-foreground">GRN Received Awaiting Quality Control</h2>
              </div>
              <MasterListing<GrnPendingStockRecord>
                columns={grnPendingColumns}
                data={paginatedGrnPending}
                totalRecords={processedGrnPending.length}
                page={grnPendingPage}
                pageSize={grnPendingPageSize}
                onPageChange={setGrnPendingPage}
                onPageSizeChange={setGrnPendingPageSize}
                onSortChange={setGrnPendingSort}
                onFilterChange={setGrnPendingFilters}
                actions={grnPendingActions}
                emptyMessage="GRN pending stock records"
                searchPlaceholder="Search GRN Pending..."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
