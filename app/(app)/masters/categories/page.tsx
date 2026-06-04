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
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadCategories, saveCategories, type Category, type CategoryStatus, todayStr } from "./category-data";

type SortKey = "categoryCode" | "categoryName" | "description" | "status";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function StatusToggle({ record, onToggle }: { record: Category; onToggle: (item: Category) => void }) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={() => onToggle(record)}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
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

function FilterPopover({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(values);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-muted",
            values.length ? "bg-brand-50 text-brand-600" : "text-muted-foreground/40 hover:text-muted-foreground/80",
          )}
        >
          <SlidersHorizontal className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 w-[220px] p-2.5 shadow-xl">
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
          <div className="max-h-44 space-y-1 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted/60",
                  draft.includes(option) && "bg-brand-50 text-brand-700",
                )}
                onClick={() =>
                  setDraft((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]))
                }
              >
                <span>{option}</span>
                {draft.includes(option) ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <Button type="button" variant="outline" className="h-8 px-2.5 text-[11px]" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-8 px-2.5 text-[11px] bg-brand-600 text-white hover:bg-brand-700"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function CategoryMasterPage() {
  const [records, setRecords] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("categoryCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setRecords(loadCategories());
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
          r.categoryCode.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      })
      .filter((r) => (filterStatus.length ? filterStatus.includes(r.status) : true))
      .sort((a, b) => {
        const aVal = String(a[sortKey]).toLowerCase();
        const bVal = String(b[sortKey]).toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, filterStatus, sortKey, sortDir]);

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
  }, [search, filterStatus, sortKey, sortDir, pageSize]);

  const toggleStatus = (record: Category) => {
    const nextStatus: CategoryStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : item,
    );
    setRecords(updated);
    saveCategories(updated);
    setToast({ msg: `Category status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Category Master</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Manage product categories used across the masters</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 border-border bg-white text-xs text-foreground hover:bg-muted">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Link href="/masters/categories/add">
              <Button size="sm" className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700">
                <Plus className="h-3.5 w-3.5" /> Add Category
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="text-base font-bold text-foreground">{records.length}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Total Categories</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="text-base font-bold text-foreground">{records.filter((r) => r.status === "active").length}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Active</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="text-base font-bold text-foreground">{records.filter((r) => r.status === "inactive").length}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Inactive</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category code, name, description..."
              className="h-8 pl-9 text-xs"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {filterStatus.length > 0 && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0 bg-white border shadow-lg border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter Category</p>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-1.5 border-t-0 pt-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  {["active", "inactive"].map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterStatus.includes(v)}
                        onChange={() => {
                          setFilterStatus((prev) =>
                            prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v],
                          );
                        }}
                      />
                      <span className="text-xs capitalize text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border bg-muted/10">
                  <button
                    onClick={() => setFilterStatus([])}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed w-max">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <SortTh label="Category Code" colKey="categoryCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[120px] pl-4 py-3" />
                  <SortTh label="Category Name" colKey="categoryName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[220px]" />
                  <SortTh label="Description" colKey="description" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[320px]" />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[110px]" />
                  <th className="sticky right-0 z-30 w-[80px] min-w-[80px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id} className="align-top transition-colors border-b border-border/60 hover:bg-muted/20 group">
                    <td className="px-4 py-2.5 text-xs font-semibold font-mono text-brand-700 whitespace-nowrap">{row.categoryCode}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-foreground">{row.categoryName}</td>
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">{row.description}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => toggleStatus(row)} className="inline-flex items-center gap-1.5 rounded-full px-0.5 py-0.5 transition-opacity focus:outline-none hover:opacity-90" title="Click to toggle status">
                        <StatusToggle record={row} onToggle={toggleStatus} />
                      </button>
                    </td>
                    <td className="sticky right-0 z-20 w-[80px] min-w-[80px] px-3 py-2.5 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 bg-white border shadow-lg border-border">
                          <DropdownMenuItem asChild>
                            <Link href={`/masters/categories/${row.id}`} className="flex items-center gap-2">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/masters/categories/${row.id}/edit`} className="flex items-center gap-2">
                              <Edit2 className="h-3.5 w-3.5" /> Edit
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
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
                  <span className="font-medium text-foreground">{filtered.length}</span> categories
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
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}






