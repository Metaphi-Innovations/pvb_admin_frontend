"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  Edit2,
  FileText,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import {
  DocumentTypeMaster,
  loadDocumentTypes,
  saveDocumentTypes,
  todayStr,
} from "./document-type-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

function StatusToggle({ record, onToggle }: { record: DocumentTypeMaster; onToggle: (item: DocumentTypeMaster) => void }) {
  const active = record.status === "Active";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(record);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export default function DocumentTypesPage() {
  const router = useRouter();
  const [records, setRecords] = useState<DocumentTypeMaster[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "title", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setRecords(loadDocumentTypes());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: DocumentTypeMaster) => {
    const nextStatus: "Active" | "Inactive" = record.status === "Active" ? "Inactive" : "Active";
    const updated = records.map((r) =>
      r.id === record.id
        ? {
            ...r,
            status: nextStatus,
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : r
    );
    saveDocumentTypes(updated);
    setRecords(updated);
    setToast({ msg: `Document Type status updated to ${nextStatus}`, type: "success" });
  };

  const columns: ColumnConfig<DocumentTypeMaster>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "280px",
      render: (val, row) => (
        <span className="font-semibold text-foreground">
          {row.title}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "480px",
      render: (val, row) => row.description || "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
      ],
      width: "160px",
      render: (val, row) => (
        <StatusToggle record={row} onToggle={toggleStatus} />
      ),
    },
  ];

  const actions: ActionItemConfig<DocumentTypeMaster>[] = [
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/document-types/${row.id}/edit`),
    },
  ];

  const filtered = useMemo(() => {
    let result = [...records];

    // Search
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let aVal = a[sort.key as keyof DocumentTypeMaster];
        let bVal = b[sort.key as keyof DocumentTypeMaster];
        if (aVal === undefined) aVal = "";
        if (bVal === undefined) bVal = "";
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const total = records.length;
  const active = records.filter(r => r.status === "Active").length;
  const inactive = records.filter(r => r.status === "Inactive").length;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Document Type Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage required document types
          </p>
        </div>

        {/* KPI Cards */}
        {/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Document Types" value={total} icon={FileText} accent={true} />
          <MiniKPICard label="Active" value={active} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={inactive} icon={XCircle} accent={false} />
        </div> */}

        {/* Table Listing */}
        <MasterListing<DocumentTypeMaster>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          onAdd={() => router.push("/masters/document-types/add")}
          addLabel="Add Document Type"
          emptyMessage="document types"
          searchPlaceholder="Search document type..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-top-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          )}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="flex-shrink-0 ml-1 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </AppLayout>
  );
}
