"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  X,
  Trash2,
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
  loadVendorTypes,
  saveVendorTypes,
  type VendorTypeRecord,
} from "./vendor-type-data";
import { masterToday, type MasterStatus } from "@/lib/masters/common";
import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingUserCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

type StatusTab = "all" | "active" | "inactive";
const TAB_KEY = "vendor-type-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(TAB_KEY);
  return v === "active" || v === "inactive" ? v : "all";
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
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function VendorTypeMasterPage() {
  const router = useRouter();
  const [records, setRecords] = useState<VendorTypeRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "vendorTypeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [deleteTarget, setDeleteTarget] = useState<VendorTypeRecord | null>(null);

  useEffect(() => {
    setRecords(loadVendorTypes());
    setStatusTab(readStoredStatusTab());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(TAB_KEY, next);
    setPage(1);
  };

  const statusTabCounts = useMemo(
    () => ({
      all: records.length,
      active: records.filter((r) => r.status === "active").length,
      inactive: records.filter((r) => r.status === "inactive").length,
    }),
    [records],
  );

  const toggleStatus = (record: VendorTypeRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: nextStatus,
            updatedBy: "Admin",
            updatedAt: masterToday(),
          }
        : item,
    );
    saveVendorTypes(updated);
    setRecords(updated);
    setToast({
      msg: `Vendor type status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const columns: ColumnConfig<VendorTypeRecord>[] = [
    {
      key: "vendorTypeCode",
      header: "Vendor Type Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-brand-700">{row.vendorTypeCode}</span>
      ),
    },
    {
      key: "vendorTypeName",
      header: "Vendor Type Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (_val, row) => (
        <Link
          href={`/masters/vendor-type/${row.id}`}
          className="text-xs font-semibold text-foreground hover:text-brand-700"
        >
          {row.vendorTypeName}
        </Link>
      ),
    },
    {
      key: "initialCode",
      header: "Initial Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-medium text-foreground">{row.initialCode}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "320px",
      render: (_val, row) => row.description || "—",
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
      render: (_val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdAt} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedAt} />
      ),
    },
  ];

  const actions: ActionItemConfig<VendorTypeRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/vendor-type/${row.id}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/vendor-type/${row.id}/edit`),
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

    if (statusTab !== "all") {
      result = result.filter((r) => r.status === statusTab);
    }

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.vendorTypeCode.toLowerCase().includes(q) ||
          r.vendorTypeName.toLowerCase().includes(q) ||
          r.initialCode.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof VendorTypeRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof VendorTypeRecord] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort, statusTab]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize, statusTab]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadVendorTypes().filter((r) => r.id !== deleteTarget.id);
    saveVendorTypes(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Vendor type deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "ID",
        "Vendor Type Code",
        "Vendor Type Name",
        "Initial Code",
        "Description",
        "Status",
      ];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        csvRows.push(
          [
            r.id,
            r.vendorTypeCode,
            `"${r.vendorTypeName.replace(/"/g, '""')}"`,
            r.initialCode,
            `"${(r.description || "").replace(/"/g, '""')}"`,
            r.status,
          ].join(","),
        );
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "vendor_types_export.csv";
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "Vendor types exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export vendor types", type: "error" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Vendor Type Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage vendor type classifications used across procurement and accounts
          </p>
        </div>

        <Tabs value={statusTab} onValueChange={handleStatusTabChange}>
          <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex h-auto">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
              >
                {tab.label} ({statusTabCounts[tab.value]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <MasterListing<VendorTypeRecord>
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
          onAdd={() => router.push("/masters/vendor-type/add")}
          addLabel="Add Vendor Type"
          onExport={handleExport}
          emptyMessage="vendor types"
          searchPlaceholder="Search vendor type code, name, initial code, description..."
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
