"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Edit2,
  Eye,
  MoreVertical,
  Plus,
  Search,
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

type SortKey = "customerType" | "description";

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
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn("px-3 py-3 text-left text-[13px] font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60", className)}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
      </div>
    </th>
  );
}

export default function CustomerTypesPage() {
  const [records, setRecords] = useState<CustomerTypeRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("customerType");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          r.customerType.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aVal = String(a[sortKey]).toLowerCase();
        const bVal = String(b[sortKey]).toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const start = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filtered.length);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, pageSize]);

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
      const headers = ["ID", "Customer Type", "Description"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
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

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Customer Type Master</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Manage types of customers used in the system</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 border-border bg-white text-xs text-foreground hover:bg-muted" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Link href="/masters/customer-types/add">
              <Button size="sm" className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700">
                <Plus className="h-3.5 w-3.5" /> Add Customer Type
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <MiniKPICard label="Total Customer Types" value={records.length} icon={Users} accent={true} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer type, description..."
              className="h-8 pl-9 text-xs"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed w-max">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <SortTh label="Customer Type" colKey="customerType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[240px] pl-4 py-3" />
                  <SortTh label="Description" colKey="description" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[480px]" />
                  <th className="sticky right-0 z-30 w-[80px] min-w-[80px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      className="align-top transition-colors border-b border-border/60 hover:bg-muted/20 group"
                    >
                      <td className="px-4 py-2.5 text-xs font-semibold text-foreground">
                        <Link href={`/masters/customer-types/${row.id}`} className="hover:text-brand-700">
                          {row.customerType}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-normal font-medium">{row.description || "—"}</td>
                      <td className="sticky right-0 z-20 w-[80px] min-w-[80px] px-3 py-2.5 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border shadow-lg border-border">
                            <DropdownMenuItem asChild className="flex items-center gap-2 cursor-pointer">
                              <Link href={`/masters/customer-types/${row.id}`}>
                                <Eye className="h-3.5 w-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="flex items-center gap-2 cursor-pointer">
                              <Link href={`/masters/customer-types/${row.id}/edit`}>
                                <Edit2 className="h-3.5 w-3.5" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(row)} className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              {filtered.length === 0 ? (
                "No records"
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{start}-{end}</span> of{" "}
                  <span className="font-medium text-foreground">{filtered.length}</span> customer types
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 text-xs bg-white border rounded-md h-7 border-border text-foreground"
              >
                {[10, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} / page
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="flex items-center justify-center text-xs border rounded-md w-7 h-7 border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-2 min-w-[48px] text-center">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center text-xs border rounded-md w-7 h-7 border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
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
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
