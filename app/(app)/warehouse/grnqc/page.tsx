"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ClipboardCheck, FileCheck2, Eye, FileText, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { getGrnRecords, saveGrnRecord } from "./grn/mock-data";
import { getQcRecords } from "./qc/mock-data";
import { GrnRecord } from "./grn/types";
import { QcRecord } from "./qc/types";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MiniKPICard } from "@/components/ui/KPICard";

const GRN_STATUS_CONFIG = {
  draft: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Draft" },
  submitted: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Submitted" },
  qc_pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "QC Pending" },
  qc_completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed" },
};

const QC_STATUS_CONFIG = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export default function GrnQcDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("grn");
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [qcList, setQcList] = useState<QcRecord[]>([]);

  // Filtering states
  const [grnFilters, setGrnFilters] = useState<FilterState>({});
  const [grnSort, setGrnSort] = useState<SortState>({ key: "", direction: "none" });
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(10);

  const [qcFilters, setQcFilters] = useState<FilterState>({});
  const [qcSort, setQcSort] = useState<SortState>({ key: "", direction: "none" });
  const [qcPage, setQcPage] = useState(1);
  const [qcPageSize, setQcPageSize] = useState(10);

  // Loading lists
  useEffect(() => {
    setGrnList(getGrnRecords());
    setQcList(getQcRecords());
  }, []);

  // Filter & Sort GRN list client-side
  const processedGrns = useMemo(() => {
    let result = [...grnList];
    Object.keys(grnFilters).forEach((key) => {
      const val = grnFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.grnNo.toLowerCase().includes(q) ||
          item.poNumber.toLowerCase().includes(q) ||
          item.vendorName.toLowerCase().includes(q)
        );
      } else if (key === "grnNo" || key === "poNumber" || key === "vendorName") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof GrnRecord]).toLowerCase().includes(q));
      } else if (key === "warehouse" || key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof GrnRecord])));
      } else if (key === "grnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.grnDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.grnDate <= range.toDate);
      }
    });

    if (grnSort.key && grnSort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[grnSort.key as keyof GrnRecord] || "");
        const valB = String(b[grnSort.key as keyof GrnRecord] || "");
        return grnSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [grnList, grnFilters, grnSort]);

  const paginatedGrns = useMemo(() => {
    const start = (grnPage - 1) * grnPageSize;
    return processedGrns.slice(start, start + grnPageSize);
  }, [processedGrns, grnPage, grnPageSize]);

  // Filter & Sort QC list client-side
  const processedQcs = useMemo(() => {
    let result = [...qcList];
    Object.keys(qcFilters).forEach((key) => {
      const val = qcFilters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(item =>
          item.qcNo.toLowerCase().includes(q) ||
          item.grnNo.toLowerCase().includes(q) ||
          item.vendorName.toLowerCase().includes(q)
        );
      } else if (key === "qcNo" || key === "grnNo" || key === "vendorName") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof QcRecord]).toLowerCase().includes(q));
      } else if (key === "status") {
        const selected = val as string[];
        result = result.filter(item => selected.includes(String(item[key as keyof QcRecord])));
      } else if (key === "inspectionDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(item => item.inspectionDate >= range.fromDate);
        if (range.toDate) result = result.filter(item => item.inspectionDate <= range.toDate);
      }
    });

    if (qcSort.key && qcSort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[qcSort.key as keyof QcRecord] || "");
        const valB = String(b[qcSort.key as keyof QcRecord] || "");
        return qcSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [qcList, qcFilters, qcSort]);

  const paginatedQcs = useMemo(() => {
    const start = (qcPage - 1) * qcPageSize;
    return processedQcs.slice(start, start + qcPageSize);
  }, [processedQcs, qcPage, qcPageSize]);

  // GRN Column Configurations
  const grnColumns: ColumnConfig<GrnRecord>[] = [
    { key: "grnNo", header: "GRN No", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "poNumber", header: "PO No", sortable: true, filterable: true, filterType: "text", width: "120px" },
    { key: "vendorName", header: "Vendor Name", sortable: true, filterable: true, filterType: "text" },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Central Warehouse", value: "Central Warehouse" },
        { label: "North Zone Hub", value: "North Zone Hub" },
        { label: "South Zone Depot", value: "South Zone Depot" },
        { label: "West Zone Hub", value: "West Zone Hub" },
      ],
    },
    { key: "totalProducts", header: "Total Products", sortable: true, align: "center", width: "120px" },
    { key: "totalQty", header: "Total Qty", sortable: true, align: "right", width: "110px" },
    { key: "grnDate", header: "GRN Date", sortable: true, filterable: true, filterType: "date", width: "140px" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "QC Pending", value: "qc_pending" },
        { label: "QC Completed", value: "qc_completed" },
      ],
      width: "135px",
      render: (val: any) => {
        const cfg = GRN_STATUS_CONFIG[val as keyof typeof GRN_STATUS_CONFIG] || { bg: "bg-slate-100 text-slate-700", label: "Unknown" };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  // QC Column Configurations
  const qcColumns: ColumnConfig<QcRecord>[] = [
    { key: "qcNo", header: "QC No", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "grnNo", header: "GRN No", sortable: true, filterable: true, filterType: "text", width: "130px" },
    { key: "vendorName", header: "Vendor", sortable: true, filterable: true, filterType: "text" },
    { key: "inspectionDate", header: "Inspection Date", sortable: true, filterable: true, filterType: "date", width: "145px" },
    { key: "totalAcceptedQty", header: "Total Accepted Qty", sortable: true, align: "right", width: "140px" },
    { key: "totalRejectedQty", header: "Total Rejected Qty", sortable: true, align: "right", width: "140px" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Pending", value: "pending" },
        { label: "Completed", value: "completed" },
      ],
      width: "120px",
      render: (val: any) => {
        const cfg = QC_STATUS_CONFIG[val as keyof typeof QC_STATUS_CONFIG] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown" };
        return (
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
    },
  ];

  // Action Configurations for GRN
  const grnActions: ActionItemConfig<GrnRecord>[] = [
    {
      label: "View Detail",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grnqc/grn/view/${row.id}`),
    },
    {
      label: "Generate QC",
      action: "generate_qc",
      icon: FileCheck2,
      onClick: (row) => {
        if (row.status === "draft") {
          alert("This GRN is currently in draft state. Please submit the GRN before performing quality control.");
          return;
        }
        router.push(`/warehouse/grnqc/qc/create?grnId=${row.id}`);
      },
    },
  ];

  // Action Configurations for QC
  const qcActions: ActionItemConfig<QcRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/grnqc/qc/view/${row.id}`),
    },
  ];

  return (
    <AppLayout>
      <div className="w-full space-y-5">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground mb-0.5">
            Warehouse &rsaquo; GRN & QC
          </p>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-brand-600" />
            GRN & QC Module
          </h1>
          <p className="text-xs text-muted-foreground">
            Inward inventory validation center. Manage Goods Receipt Notes (GRN) and Quality Control (QC) operations.
          </p>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <MiniKPICard label="Total GRNs" value={grnList.length} icon={FileText} accent={true} />
          <MiniKPICard label="Pending QC GRNs" value={grnList.filter(g => g.status === "qc_pending").length} icon={Clock} accent={false} />
          <MiniKPICard label="Completed QC GRNs" value={grnList.filter(g => g.status === "qc_completed").length} icon={FileCheck2} accent={false} />
          <MiniKPICard label="Total QC Inspections" value={qcList.length} icon={ClipboardCheck} accent={false} />
          <MiniKPICard label="Completed Inspections" value={qcList.filter(q => q.status === "completed").length} icon={ShieldCheck} accent={false} />
        </div>

        {/* Tab container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex">
            <TabsTrigger
              value="grn"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              GRN Listing
            </TabsTrigger>
            <TabsTrigger
              value="qc"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              QC Listing
            </TabsTrigger>
          </TabsList>

          {/* GRN TAB */}
          <TabsContent value="grn" className="mt-0 outline-none">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-foreground">Goods Receipt Notes</h2>
              </div>
              <MasterListing<GrnRecord>
                columns={grnColumns}
                data={paginatedGrns}
                totalRecords={processedGrns.length}
                page={grnPage}
                pageSize={grnPageSize}
                onPageChange={setGrnPage}
                onPageSizeChange={setGrnPageSize}
                onSortChange={setGrnSort}
                onFilterChange={setGrnFilters}
                actions={grnActions}
                onAdd={() => router.push("/warehouse/grnqc/grn/create")}
                addLabel="Generate GRN"
                emptyMessage="GRN records"
                searchPlaceholder="Search GRN..."
              />
            </div>
          </TabsContent>

          {/* QC TAB */}
          <TabsContent value="qc" className="mt-0 outline-none">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-foreground">Quality Control Inspections</h2>
              </div>
              <MasterListing<QcRecord>
                columns={qcColumns}
                data={paginatedQcs}
                totalRecords={processedQcs.length}
                page={qcPage}
                pageSize={qcPageSize}
                onPageChange={setQcPage}
                onPageSizeChange={setQcPageSize}
                onSortChange={setQcSort}
                onFilterChange={setQcFilters}
                actions={qcActions}
                emptyMessage="QC records"
                searchPlaceholder="Search QC..."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
