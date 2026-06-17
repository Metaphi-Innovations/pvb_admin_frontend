"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type Vendor,
  loadVendors,
  saveVendors,
  todayStr,
} from "./vendor-data";
import { CURRENT_USER } from "@/lib/procurement/config";
import { MiniKPICard } from "@/components/ui/KPICard";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingUserCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export default function VendorMasterPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Vendor[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "vendorName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);

  const refresh = useCallback(() => setRecords(loadVendors()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: Vendor) => {
    const nextStatus = record.status === "active" ? "inactive" : "active";
    const updated: Vendor = {
      ...record,
      status: nextStatus,
      updatedBy: CURRENT_USER,
      updatedDate: todayStr(),
    };
    const updatedList = records.map((x) => (x.id === record.id ? updated : x));
    saveVendors(updatedList);
    setRecords(updatedList);
    setToast({ msg: `Vendor status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updatedList = records.map((v) =>
      v.id === deleteTarget.id
        ? {
            ...v,
            status: "inactive" as const,
            updatedBy: CURRENT_USER,
            updatedDate: todayStr(),
          }
        : v,
    );
    saveVendors(updatedList);
    setRecords(updatedList);
    setDeleteTarget(null);
    setToast({ msg: `"${deleteTarget.vendorName}" marked as inactive`, type: "success" });
  };

  const columns: ColumnConfig<Vendor>[] = [
    {
      key: "vendorCode",
      header: "Vendor Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-foreground">{row.vendorCode || "—"}</span>
      ),
    },
    {
      key: "vendorName",
      header: "Vendor Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
      render: (_val, row) => (
        <button
          type="button"
          className="block group/name text-left w-full"
          onClick={() => router.push(`/masters/vendors/${row.id}`)}
        >
          <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">{row.vendorName}</p>
        </button>
      ),
    },
    {
      key: "vendorType",
      header: "Vendor Type",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "160px",
      render: (_val, row) => row.vendorType || "—",
    },
    {
      key: "contactPerson",
      header: "Contact Person",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (_val, row) => row.contactPerson || "—",
    },
    {
      key: "mobile",
      header: "Mobile Number",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (_val, row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.mobile ? `${row.mobileCountryCode} ${row.mobile}` : "—"}
        </span>
      ),
    },
    {
      key: "gstNumber",
      header: "GST Number",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "150px",
      render: (_val, row) => (
        <span className="font-mono text-[11px]">{row.gstNumber || "—"}</span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdDate} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedDate} />
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      width: "110px",
      render: (_val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
      ),
    },
  ];

  const actions: ActionItemConfig<Vendor>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/vendors/${row.id}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/vendors/${row.id}/edit`),
    },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const filtered = useMemo(() => {
    let result = [...records];

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (v) =>
          (v.vendorCode || "").toLowerCase().includes(q) ||
          v.vendorName.toLowerCase().includes(q) ||
          (v.vendorType || "").toLowerCase().includes(q) ||
          (v.contactPerson || "").toLowerCase().includes(q) ||
          v.mobile.includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.gstNumber.toLowerCase().includes(q)
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[sort.key] ?? "");
        const bv = String((b as unknown as Record<string, unknown>)[sort.key] ?? "");
        const cmp = av.localeCompare(bv);
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  const handleExport = () => {
    const rows = filtered.map((row) => ({
      "Vendor Code": row.vendorCode || "",
      "Vendor Name": row.vendorName,
      "Vendor Type": row.vendorType || "",
      "Contact Person": row.contactPerson || "",
      "Mobile Number": `${row.mobileCountryCode} ${row.mobile || ""}`.trim(),
      "GST Number": row.gstNumber || "",
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
    a.download = `vendor-master-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Vendor Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage vendors and supplier information</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Vendors" value={records.length} icon={Building2} accent={true} />
          <MiniKPICard label="Active" value={records.filter((v) => v.status === "active").length} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={records.filter((v) => v.status === "inactive").length} icon={XCircle} accent={false} />
        </div>

        <MasterListing<Vendor>
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
          onAdd={() => router.push("/masters/vendors/new")}
          addLabel="Create Vendor"
          onExport={handleExport}
          emptyMessage="vendors"
          searchPlaceholder="Search vendor code, name, type, contact, GST…"
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                Deactivate Vendor?
              </DialogTitle>
              <DialogDescription className="pt-1 text-xs">
                <strong className="text-foreground">{deleteTarget.vendorName}</strong> will be marked as inactive.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
              >
                Mark Inactive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
