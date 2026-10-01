"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, Edit3, Trash2, CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GrnData {
  id: number;
  grnNo: string;
  warehouse: string;
  grnDate: string;
  vendorName: string;
  status: "verified" | "partial" | "pending";
}

const MOCK_DATA: GrnData[] = [
  { id: 1, grnNo: "GRN-2024-001", warehouse: "Central Warehouse", grnDate: "2024-01-20", vendorName: "Agro Chem Distributors", status: "verified" },
  { id: 2, grnNo: "GRN-2024-002", warehouse: "North Zone Hub", grnDate: "2024-01-25", vendorName: "Seed Corp India Pvt Ltd", status: "verified" },
  { id: 3, grnNo: "GRN-2024-003", warehouse: "Central Warehouse", grnDate: "2024-02-06", vendorName: "Fertilizer World", status: "partial" },
  { id: 4, grnNo: "GRN-2024-004", warehouse: "South Zone Depot", grnDate: "2024-03-01", vendorName: "BioFert Organics", status: "pending" },
  { id: 5, grnNo: "GRN-2024-005", warehouse: "West Zone Hub", grnDate: "2024-03-08", vendorName: "Zinc Chem Industries", status: "verified" },
  { id: 6, grnNo: "GRN-2024-006", warehouse: "Central Warehouse", grnDate: "2024-03-12", vendorName: "National Seeds Ltd", status: "verified" },
  { id: 7, grnNo: "GRN-2024-007", warehouse: "North Zone Hub", grnDate: "2024-03-15", vendorName: "Royal Pesticides Corp", status: "pending" },
  { id: 8, grnNo: "GRN-2024-008", warehouse: "South Zone Depot", grnDate: "2024-03-18", vendorName: "Green Crop Systems", status: "partial" },
  { id: 9, grnNo: "GRN-2024-009", warehouse: "West Zone Hub", grnDate: "2024-03-22", vendorName: "AgriTech Solutions", status: "verified" },
  { id: 10, grnNo: "GRN-2024-010", warehouse: "Central Warehouse", grnDate: "2024-03-26", vendorName: "Crop Care Traders", status: "verified" },
];

const STATUS_CONFIG = {
  verified: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Verified" },
  partial: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Partial" },
  pending: { bg: "bg-navy-50 text-navy-700 border-navy-200", label: "Pending" },
};

export default function ListingDemoPage() {
  const [data, setData] = useState<GrnData[]>(MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });

  const columns: ColumnConfig<GrnData>[] = [
    {
      key: "grnNo",
      header: "GRN No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
    },
    {
      key: "vendorName",
      header: "Supplier Name",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
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
    {
      key: "grnDate",
      header: "GRN Date",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "150px",
      render: (val: any) => (
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60" />
          {val}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Verified", value: "verified" },
        { label: "Partial", value: "partial" },
        { label: "Pending", value: "pending" },
      ],
      width: "120px",
      render: (val: any) => {
        const config = STATUS_CONFIG[val as keyof typeof STATUS_CONFIG] || { bg: "bg-slate-100 text-slate-700", label: "Unknown" };
        return (
          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium border ${config.bg}`}>
            {config.label}
          </span>
        );
      },
    },
  ];

  const actions: ActionItemConfig<GrnData>[] = [
    {
      label: "View GRN",
      action: "view",
      icon: Eye,
      onClick: (row) => alert(`Viewing GRN: ${row.grnNo}`),
    },
    {
      label: "Edit Details",
      action: "edit",
      icon: Edit3,
      onClick: (row) => alert(`Editing GRN: ${row.grnNo}`),
    },
    {
      label: "Delete Record",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => {
        if (confirm(`Are you sure you want to delete ${row.grnNo}?`)) {
          setData(prev => prev.filter(item => item.id !== row.id));
        }
      },
    },
  ];

  // Process Mock Data client-side for dynamic filtering and sorting
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "grnNo" || key === "vendorName") {
        const q = (val as string).toLowerCase();
        result = result.filter(item => String(item[key as keyof GrnData]).toLowerCase().includes(q));
      } else if (key === "warehouse" || key === "status") {
        const selectedOptions = val as string[];
        result = result.filter(item => selectedOptions.includes(String(item[key as keyof GrnData])));
      } else if (key === "grnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) {
          result = result.filter(item => item.grnDate >= range.fromDate);
        }
        if (range.toDate) {
          result = result.filter(item => item.grnDate <= range.toDate);
        }
      }
    });

    // Apply sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[sort.key as keyof GrnData] || "");
        const valB = String(b[sort.key as keyof GrnData] || "");
        
        return sort.direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
    }

    return result;
  }, [data, filters, sort]);

  // Paginated subset
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize]);

  const handleAdd = () => {
    const nextId = Math.max(...data.map(item => item.id), 0) + 1;
    const newGrn: GrnData = {
      id: nextId,
      grnNo: `GRN-2024-0${nextId.toString().padStart(2, "0")}`,
      warehouse: "Central Warehouse",
      grnDate: new Date().toISOString().split("T")[0],
      vendorName: "New Auto-Added Vendor",
      status: "pending",
    };
    setData(prev => [newGrn, ...prev]);
  };

  const triggerSimulatedLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header Block */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              MasterListing Component Demo
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Production-ready reusable table component featuring text search, multiselect dropdown filters, and date range query filters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-border text-muted-foreground hover:bg-muted"
              onClick={triggerSimulatedLoading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Simulate Loading
            </Button>
          </div>
        </div>

        {/* MasterListing Component Mount */}
        <MasterListing<GrnData>
          columns={columns}
          data={paginatedData}
          loading={loading}
          totalRecords={processedData.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          onAdd={handleAdd}
          addLabel="Add GRN"
          emptyMessage="GRN records"
          searchPlaceholder="Filter GRN..."
        />
      </div>
    </AppLayout>
  );
}
