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
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type Vendor,
  loadVendors,
  saveVendors,
  formatCreditPeriod,
  todayStr,
} from "./vendor-data";
import { CURRENT_USER } from "@/lib/procurement/config";
import { MiniKPICard } from "@/components/ui/KPICard";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

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

function StatusToggle({ record, onToggle }: { record: Vendor; onToggle: (item: Vendor) => void }) {
  const active = record.status === "active";
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
    const updatedList = records.filter((v) => v.id !== deleteTarget.id);
    saveVendors(updatedList);
    setRecords(updatedList);
    setDeleteTarget(null);
    setToast({ msg: "Vendor deleted successfully", type: "success" });
  };

  const columns: ColumnConfig<Vendor>[] = [
    {
      key: "vendorName",
      header: "Vendor Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
      render: (val, row) => (
        <div>
          <button
            type="button"
            className="font-medium text-[13px] text-brand-700 hover:underline text-left"
            onClick={() => router.push(`/masters/vendors/${row.id}`)}
          >
            {row.vendorName}
          </button>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{row.vendorCode}</p>
        </div>
      ),
    },
    {
      key: "companyName",
      header: "Company Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
      render: (val, row) => row.companyName || "—",
    },
    {
      key: "mobile",
      header: "Mobile Number",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (val, row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.mobileCountryCode} {row.mobile || "—"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email ID",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "160px",
      render: (val, row) => row.email || "—",
    },
    {
      key: "gstNumber",
      header: "GSTIN",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "150px",
      render: (val, row) => (
        <span className="font-mono text-[11px]">{row.gstApplicable ? row.gstNumber || "—" : "—"}</span>
      ),
    },
    {
      key: "creditPeriod",
      header: "Credit Period",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => formatCreditPeriod(row),
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
      render: (val, row) => (
        <StatusToggle record={row} onToggle={toggleStatus} />
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (val, row) => row.createdBy || "—",
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (val, row) => row.updatedBy || "—",
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

    // Search filter
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.vendorName.toLowerCase().includes(q) ||
          v.companyName.toLowerCase().includes(q) ||
          v.vendorCode.toLowerCase().includes(q) ||
          v.mobile.includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.gstNumber.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let av: string;
        let bv: string;
        if (sort.key === "creditPeriod") {
          av = formatCreditPeriod(a);
          bv = formatCreditPeriod(b);
        } else {
          av = String((a as unknown as Record<string, unknown>)[sort.key] ?? "");
          bv = String((b as unknown as Record<string, unknown>)[sort.key] ?? "");
        }
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
          emptyMessage="vendors"
          searchPlaceholder="Search name, company, mobile, GSTIN…"
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {/* Confirm Delete Dialog */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                Delete Vendor
              </DialogTitle>
              <DialogDescription className="pt-1">
                Are you sure you want to delete vendor "{deleteTarget.vendorName}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
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
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
