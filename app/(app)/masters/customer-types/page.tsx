"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Users,
  X,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadCustomerTypes, saveCustomerTypes, type CustomerTypeRecord } from "./customer-type-data";
import { MiniKPICard } from "@/components/ui/KPICard";

import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

function AuditCell({
  name,
  date,
}: {
  name?: string;
  date?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold leading-4 text-brand-700">{name || "—"}</p>
      <p className="text-[10px] font-mono leading-3 text-muted-foreground">{date || "—"}</p>
    </div>
  );
}

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

function StatusToggle({
  record,
  onToggle,
}: {
  record: CustomerTypeRecord;
  onToggle: (item: CustomerTypeRecord) => void;
}) {
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
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
      title="Click to toggle status"
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export default function CustomerTypesPage() {
  const router = useRouter();
  const [records, setRecords] = useState<CustomerTypeRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "customerType", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerTypeRecord | null>(null);

  useEffect(() => {
    setRecords(loadCustomerTypes());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const columns: ColumnConfig<CustomerTypeRecord>[] = [
    {
      key: "customerTypeCode",
      header: "Customer Type Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
      render: (val, row) => <span className="font-mono font-medium text-foreground">{row.customerTypeCode}</span>,
    },
    {
      key: "customerType",
      header: "Customer Type",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "240px",
      render: (val, row) => (
        <Link href={`/masters/customer-types/${row.id}`} className="font-semibold text-foreground hover:text-brand-700">
          {row.customerType}
        </Link>
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
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      width: "120px",
      render: (val, row) => <StatusToggle record={row} onToggle={toggleStatus} />,
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <AuditCell name={row.createdBy} date={row.createdDate} />,
    },
    {
      key: "updatedDate",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <AuditCell name={row.updatedBy} date={row.updatedDate} />,
    },
  ];

  const actions: ActionItemConfig<CustomerTypeRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/customer-types/${row.id}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/customer-types/${row.id}/edit`),
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
        (r) =>
          r.customerTypeCode.toLowerCase().includes(q) ||
          r.customerType.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof CustomerTypeRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof CustomerTypeRecord] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const toggleStatus = (record: CustomerTypeRecord) => {
    const nextStatus: "active" | "inactive" = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: new Date().toISOString().slice(0, 10) }
        : item,
    );
    saveCustomerTypes(updated);
    setRecords(updated);
    setToast({ msg: `Customer Type status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadCustomerTypes().filter((r) => r.id !== deleteTarget.id);
    saveCustomerTypes(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Customer Type deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Customer Type Code", "Customer Type", "Description"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.customerTypeCode.replace(/"/g, '""')}"`,
          `"${r.customerType.replace(/"/g, '""')}"`,
          `"${r.description.replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `customer_types_export.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Customer Types exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export customer types", type: "error" });
    }
  };

  const handleAdd = () => {
    router.push("/masters/customer-types/add");
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customer Type Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage types of customers used in the system</p>
        </div>

        {/* <div className="grid grid-cols-1 gap-3">
          <MiniKPICard label="Total Customer Types" value={records.length} icon={Users} accent={true} />
        </div> */}

        <MasterListing<CustomerTypeRecord>
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
          onAdd={handleAdd}
          addLabel="Add Customer Type"
          onExport={handleExport}
          emptyMessage="customer types"
          searchPlaceholder="Search customer type code, customer type, description..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete record?</DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. The record will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs text-white bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
