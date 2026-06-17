"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  Edit2,
  Eye,
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
import { MasterRecordDrawer, masterAuditFromRecord } from "@/components/masters/MasterRecordDrawer";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

export default function DocumentTypesPage() {
  const router = useRouter();
  const [records, setRecords] = useState<DocumentTypeMaster[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "title", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [viewTarget, setViewTarget] = useState<DocumentTypeMaster | null>(null);

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
      key: "documentTypeCode",
      header: "Document Type Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
      render: (val, row) => <span className="font-mono text-xs text-brand-700">{row.documentTypeCode}</span>,
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "280px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">
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
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
      ),
    },
    {
      key: "createdBy",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />,
    },
  ];

  const actions: ActionItemConfig<DocumentTypeMaster>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => setViewTarget(row),
    },
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
        r.documentTypeCode.toLowerCase().includes(q) ||
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

  const handleExport = () => {
    const rows = filtered.map((row) => ({
      "Document Type Code": row.documentTypeCode,
      Title: row.title,
      Description: row.description || "",
      Status: row.status,
      "Created By": row.createdBy || "",
      "Updated By": row.updatedBy || "",
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-types-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          onExport={handleExport}
          addLabel="Add Document Type"
          emptyMessage="document types"
          searchPlaceholder="Search document type..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {viewTarget && (
        <MasterRecordDrawer
          open={!!viewTarget}
          onOpenChange={(o) => !o && setViewTarget(null)}
          onClose={() => setViewTarget(null)}
          onEdit={() => {
            router.push(`/masters/document-types/${viewTarget.id}/edit`);
            setViewTarget(null);
          }}
          title="Document Type"
          icon={FileText}
          recordCode={viewTarget.documentTypeCode}
          status={viewTarget.status}
          basicInfo={[{ label: "Title", value: viewTarget.title }]}
          description={viewTarget.description}
          showDescription
          auditInfo={masterAuditFromRecord({
            createdBy: viewTarget.createdBy,
            createdDate: viewTarget.createdDate,
            updatedBy: viewTarget.updatedBy,
            updatedDate: viewTarget.updatedDate,
          })}
        />
      )}

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
