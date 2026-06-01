"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Download, Search, MoreVertical, Eye, Edit2, Trash2,
  Building2, CheckCircle2, XCircle, X, AlertTriangle,
  SlidersHorizontal, ChevronDown, ChevronsUpDown, Calendar, Clock,
} from "lucide-react";
import DepartmentSheet, { type Department } from "./components/DepartmentSheet";
import DepartmentDetailSheet from "./components/DepartmentDetailSheet";

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED: Department[] = [
  { id: 1, code: "DEPT-001", name: "Sales",        status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-10", updatedBy: "Admin", updatedDate: "2024-01-10", lastStatusChange: "2024-01-10" },
  { id: 2, code: "DEPT-002", name: "HR",           status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-12", updatedBy: "Admin", updatedDate: "2024-01-12", lastStatusChange: "2024-01-12" },
  { id: 3, code: "DEPT-003", name: "Accounts",     status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-15", updatedBy: "Admin", updatedDate: "2024-01-15", lastStatusChange: "2024-01-15" },
  { id: 4, code: "DEPT-004", name: "Procurement",  status: "inactive", remarks: "Under restructuring", createdBy: "Admin", createdDate: "2024-01-18", updatedBy: "Admin", updatedDate: "2024-01-20", lastStatusChange: "2024-01-20" },
  { id: 5, code: "DEPT-005", name: "Field Force",  status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-22", updatedBy: "Admin", updatedDate: "2024-01-22", lastStatusChange: "2024-01-22" },
  { id: 6, code: "DEPT-006", name: "Retail Sales", status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-02-01", updatedBy: "Admin", updatedDate: "2024-02-01", lastStatusChange: "2024-02-01" },
  { id: 7, code: "DEPT-007", name: "Territory",    status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-02-05", updatedBy: "Admin", updatedDate: "2024-02-05", lastStatusChange: "2024-02-05" },
  { id: 8, code: "DEPT-008", name: "Collections",  status: "inactive", remarks: "Merged with Accounts", createdBy: "Admin", createdDate: "2024-02-10", updatedBy: "Admin", updatedDate: "2024-02-15", lastStatusChange: "2024-02-15" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nextId(list: Department[]) {
  return Math.max(0, ...list.map(d => d.id)) + 1;
}

// ── Status Pill ───────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  archived: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
      cfg.bg, cfg.text,
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <XCircle      className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}

function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", destructive }: ConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              destructive ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200",
            )}>
              <AlertTriangle className={cn("w-4 h-4", destructive ? "text-red-500" : "text-amber-500")} />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5",
              destructive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-brand-600 hover:bg-brand-700 text-white",
            )}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accent }: {
  label: string; value: number; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        accent ? "bg-brand-600" : "bg-muted",
      )}>
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ── Sort header helper ─────────────────────────────────────────────────────────
type SortKey = "name" | "status";

function SortTh({
  label, colKey, sortKey, sortDir, onSort, className,
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-foreground cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : ""}>{label}</span>
        {active
          ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        }
      </div>
    </th>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentPage() {
  const [departments, setDepartments] = useState<Department[]>(SEED);
  const [search,      setSearch]      = useState("");

  // Filter state (multi-select via Popover)
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Column sort
  const [sortKey, setSortKey]   = useState<SortKey>("name");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("asc");

  // Drawers
  const [sheetMode,  setSheetMode]  = useState<"add" | "edit" | null>(null);
  const [viewDept,   setViewDept]   = useState<Department | null>(null);
  const [activeDept, setActiveDept] = useState<Department | null>(null);

  // Confirm
  type ConfirmType = "toggle-status" | "delete";
  const [confirmTarget, setConfirmTarget] = useState<{ type: ConfirmType; dept: Department } | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Sort handler ────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Filter toggle ───────────────────────────────────────────────────────────
  const toggleFilterStatus = (v: string) => {
    setFilterStatus(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v],
    );
  };

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = departments.filter(d => d.status !== "archived");

    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(d =>
        d.name.toLowerCase().includes(t),
      );
    }
    if (filterStatus.length > 0) {
      r = r.filter(d => filterStatus.includes(d.status));
    }

    r.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const c = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? c : -c;
    });

    return r;
  }, [departments, search, filterStatus, sortKey, sortDir]);

  const summary = useMemo(() => ({
    total:    departments.filter(d => d.status !== "archived").length,
    active:   departments.filter(d => d.status === "active").length,
    inactive: departments.filter(d => d.status === "inactive").length,
  }), [departments]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd  = () => { setActiveDept(null); setSheetMode("add"); };
  const openEdit = (dept: Department) => { setActiveDept(dept); setSheetMode("edit"); };
  const closeSheet = () => { setSheetMode(null); setActiveDept(null); };

  const handleSave = (data: { name: string; status: string; remarks: string }) => {
    if (sheetMode === "add") {
      const newDept: Department = {
        id: nextId(departments),
        code:    "",
        name:    data.name,
        status:  data.status,
        remarks: data.remarks,
        createdBy:        "Admin",
        createdDate:      todayStr(),
        updatedBy:        "Admin",
        updatedDate:      todayStr(),
        lastStatusChange: todayStr(),
      };
      setDepartments(p => [newDept, ...p]);
      showToast("Department created successfully");
    } else if (sheetMode === "edit" && activeDept) {
      setDepartments(p => p.map(d =>
        d.id === activeDept.id
          ? { ...d, ...data, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: data.status !== d.status ? todayStr() : d.lastStatusChange }
          : d,
      ));
      showToast("Department updated successfully");
    }
    closeSheet();
  };

  const handleQuickToggle = (dept: Department) => {
    setConfirmTarget({ type: "toggle-status", dept });
  };

  const confirmToggleStatus = () => {
    if (!confirmTarget) return;
    const { dept } = confirmTarget;
    const newStatus = dept.status === "active" ? "inactive" : "active";
    setDepartments(p => p.map(d =>
      d.id === dept.id
        ? { ...d, status: newStatus, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() }
        : d,
    ));
    showToast(`Department ${newStatus === "active" ? "activated" : "deactivated"}`);
  };

  const handleDelete = (dept: Department) => {
    setConfirmTarget({ type: "delete", dept });
  };

  const confirmDelete = () => {
    if (!confirmTarget) return;
    setDepartments(p => p.map(d =>
      d.id === confirmTarget.dept.id
        ? { ...d, status: "archived", updatedBy: "Admin", updatedDate: todayStr() }
        : d,
    ));
    showToast("Department archived");
  };

  const hasActiveFilters = search.trim() !== "" || filterStatus.length > 0;

  const confirmConfig = confirmTarget ? (
    confirmTarget.type === "delete"
      ? {
          title:        "Delete Department?",
          description:  `"${confirmTarget.dept.name}" will be archived and removed from the listing.`,
          confirmLabel: "Archive",
          destructive:  true,
          onConfirm:    confirmDelete,
        }
      : {
          title: confirmTarget.dept.status === "active"
            ? "Deactivate Department?"
            : "Activate Department?",
          description: confirmTarget.dept.status === "active"
            ? `"${confirmTarget.dept.name}" will be marked inactive.`
            : `"${confirmTarget.dept.name}" will be marked active.`,
          confirmLabel: confirmTarget.dept.status === "active" ? "Deactivate" : "Activate",
          destructive:  confirmTarget.dept.status === "active",
          onConfirm:    confirmToggleStatus,
        }
  ) : null;

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Department</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage company departments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={openAdd}
            >
              <Plus className="w-3.5 h-3.5" /> Add Department
            </Button>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Departments" value={summary.total}    icon={Building2}    accent />
          <KpiCard label="Active"            value={summary.active}   icon={CheckCircle2}        />
          <KpiCard label="Inactive"          value={summary.inactive} icon={XCircle}             />
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-xl border border-border px-4 py-2 flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>

          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium",
                filterStatus.length > 0
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {filterStatus.length > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full font-bold">
                    {filterStatus.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter by Status</p>
              </div>
              <div className="px-3 py-2.5 space-y-2">
                {["active", "inactive"].map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filterStatus.includes(v)}
                      onChange={() => toggleFilterStatus(v)}
                      className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                    />
                    <span className="text-xs text-foreground capitalize group-hover:text-brand-700 transition-colors">
                      {v}
                    </span>
                  </label>
                ))}
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button
                    onClick={() => setFilterStatus([])}
                    className="text-xs text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Active filter chips */}
          {filterStatus.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v.charAt(0).toUpperCase() + v.slice(1)}
              <button onClick={() => toggleFilterStatus(v)} className="ml-0.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Result count */}
          <p className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
            {filtered.length} of {summary.total}
          </p>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setFilterStatus([]); }}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border flex">
                  <SortTh label="Department Name"  colKey="name"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[1.5]" />
                  <SortTh label="Status"           colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[0.8]" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-1">Created</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-1">Updated</th>
                  <th className="px-3 py-3 flex-shrink-0 w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr className="flex">
                    <td colSpan={5} className="py-16 text-center w-full">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No departments found</p>
                        <p className="text-xs text-muted-foreground">
                          {hasActiveFilters ? "Try adjusting your filters." : "Add your first department to get started."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={() => { setSearch(""); setFilterStatus([]); }}
                            className="text-xs text-brand-600 hover:underline mt-1"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(dept => (
                    <tr
                      key={dept.id}
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors flex"
                    >
                      {/* Department Name — clickable to view */}
                      <td className="px-4 py-2 flex-[1.5]">
                        <button
                          className="text-xs font-semibold text-foreground hover:text-brand-600 transition-colors text-left"
                          onClick={() => setViewDept(dept)}
                        >
                          {dept.name}
                        </button>
                      </td>

                      {/* Status toggle */}
                      <td className="px-4 py-2 flex-[0.8]">
                        <Switch
                          checked={dept.status === "active"}
                          onCheckedChange={() => handleQuickToggle(dept)}
                        />
                      </td>

                      {/* Created */}
                      <td className="px-4 py-2 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Calendar className="w-3 h-3 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-tight truncate">
                              By <span className="font-medium text-foreground">{dept.createdBy}</span> on{" "}
                              <span className="font-medium text-foreground">{dept.createdDate}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-2 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="w-3 h-3 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-tight truncate">
                              By <span className="font-medium text-foreground">{dept.updatedBy}</span> on{" "}
                              <span className="font-medium text-foreground">{dept.updatedDate}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Actions — always visible */}
                      <td className="px-3 py-2.5 text-right flex-shrink-0 w-12">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <button
                              onClick={() => setViewDept(dept)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={() => openEdit(dept)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleQuickToggle(dept)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                            >
                              {dept.status === "active"
                                ? <><XCircle className="w-3.5 h-3.5 text-amber-500" /> Deactivate</>
                                : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Activate</>}
                            </button>
                            <DropdownMenuSeparator />
                            <button
                              onClick={() => handleDelete(dept)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{summary.total}</span> departments
            </p>
          </div>
        </div>

      </div>

      {/* ── Drawers ── */}
      <DepartmentSheet
        open={sheetMode !== null}
        onClose={closeSheet}
        onSave={handleSave}
        dept={sheetMode === "edit" ? activeDept : null}
      />

      <DepartmentDetailSheet
        open={!!viewDept}
        onClose={() => setViewDept(null)}
        dept={viewDept}
        onEdit={(dept) => { setViewDept(null); openEdit(dept); }}
      />

      {/* ── Confirm Dialog ── */}
      {confirmConfig && (
        <ConfirmDialog
          open={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
