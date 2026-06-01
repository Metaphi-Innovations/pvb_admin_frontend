"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Download, Search, MoreVertical, Eye, Edit2, Trash2,
  Shield, CheckCircle2, XCircle, X, AlertTriangle, SlidersHorizontal,
  ChevronDown, ChevronsUpDown, Clock,
} from "lucide-react";
import {
  type Role, DEPARTMENTS, MOCK_USER_COUNTS,
  loadRoles, saveRoles, todayStr,
} from "./roles-data";
import RoleDetailSheet from "./components/RoleDetailSheet";

// ─────────────────────────────────────────────────────────────────────────────
// Types (top-level — keeps SWC parser happy)
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = "roleName" | "department" | "status" | "geoLevel";
type ConfirmKind = "toggle-status" | "delete";

interface ConfirmTarget {
  kind: ConfirmKind;
  role: Role;
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (outside component — SWC-safe)
// ─────────────────────────────────────────────────────────────────────────────

function getConfirmConfig(
  target: ConfirmTarget | null,
  onDelete: () => void,
  onToggle: () => void,
): ConfirmConfig | null {
  if (target === null) {
    return null;
  }
  if (target.kind === "delete") {
    return {
      title: "Delete Role?",
      description: target.role.roleName + " will be archived.",
      confirmLabel: "Archive",
      destructive: true,
      onConfirm: onDelete,
    };
  }
  const isActive = target.role.status === "active";
  return {
    title: isActive ? "Deactivate Role?" : "Activate Role?",
    description: isActive
      ? target.role.roleName + " will be marked inactive."
      : target.role.roleName + " will be marked active again.",
    confirmLabel: isActive ? "Deactivate" : "Activate",
    destructive: isActive,
    onConfirm: onToggle,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusPill
// ─────────────────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"  },
  };
  const c = map[status] ?? map.inactive;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GeoBadge
// ─────────────────────────────────────────────────────────────────────────────

function GeoBadge({ level }: { level: string }) {
  if (level === "None") {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-medium">
      {level}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const bg = toast.type === "success" ? "bg-emerald-600" : "bg-red-600";
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      bg,
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  config: ConfirmConfig;
}

function ConfirmDialog({ open, onClose, config }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              config.destructive
                ? "bg-red-50 border border-red-200"
                : "bg-amber-50 border border-amber-200",
            )}>
              <AlertTriangle className={cn("w-4 h-4", config.destructive ? "text-red-500" : "text-amber-500")} />
            </div>
            {config.title}
          </DialogTitle>
          <DialogDescription className="pt-1">{config.description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5",
              config.destructive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-brand-600 hover:bg-brand-700 text-white",
            )}
            onClick={() => { config.onConfirm(); onClose(); }}
          >
            {config.confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KpiCard
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: boolean;
}

function KpiCard({ label, value, icon: Icon, accent }: KpiCardProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// SortTh
// ─────────────────────────────────────────────────────────────────────────────

interface SortThProps {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}

function SortTh({ label, colKey, sortKey, sortDir, onSort, className }: SortThProps) {
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
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />}
      </div>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RolesPage (main)
// ─────────────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const router = useRouter();

  const [roles,         setRoles]         = useState<Role[]>([]);
  const [search,        setSearch]        = useState("");
  const [filterDept,    setFilterDept]    = useState<number[]>([]);
  const [filterStatus,  setFilterStatus]  = useState<string[]>([]);
  const [sortKey,       setSortKey]       = useState<SortKey>("roleName");
  const [sortDir,       setSortDir]       = useState<"asc" | "desc">("asc");
  const [viewRole,      setViewRole]      = useState<Role | null>(null);
  const [toast,         setToast]         = useState<ToastState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  useEffect(() => { setRoles(loadRoles()); }, []);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) setSortDir(d => d === "asc" ? "desc" : "asc");
      else setSortDir("asc");
      return key;
    });
  }, []);

  const toggleDept   = (id: number) => setFilterDept(p  => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleStatus = (v: string)  => setFilterStatus(p => p.includes(v)  ? p.filter(x => x !== v)  : [...p, v]);
  const clearFilters = () => { setSearch(""); setFilterDept([]); setFilterStatus([]); };

  const filtered = useMemo(() => {
    let r = roles.filter(role => role.status !== "archived");
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(role =>
        role.roleName.toLowerCase().includes(q) ||
        role.department.toLowerCase().includes(q),
      );
    }
    if (filterDept.length   > 0) r = r.filter(role => filterDept.includes(role.departmentId ?? -1));
    if (filterStatus.length > 0) r = r.filter(role => filterStatus.includes(role.status));
    r.sort((a, b) => {
      const av = String(a[sortKey]).toLowerCase();
      const bv = String(b[sortKey]).toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return r;
  }, [roles, search, filterDept, filterStatus, sortKey, sortDir]);

  const visible  = roles.filter(r => r.status !== "archived");
  const total    = visible.length;
  const active   = visible.filter(r => r.status === "active").length;
  const inactive = visible.filter(r => r.status === "inactive").length;
  const hasFilters = search.trim() !== "" || filterDept.length > 0 || filterStatus.length > 0;

  const openAdd  = () => router.push("/user-management/roles/add");
  const openEdit = (role: Role) => router.push("/user-management/roles/" + role.id + "/edit");

  const handleQuickToggle = (role: Role) => setConfirmTarget({ kind: "toggle-status", role });
  const handleDelete      = (role: Role) => {
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    if (count > 0) { showToast("Cannot delete: " + count + " user(s) assigned to this role", "error"); return; }
    setConfirmTarget({ kind: "delete", role });
  };

  const confirmDelete = () => {
    if (!confirmTarget) return;
    const next = roles.map(r =>
      r.id === confirmTarget.role.id
        ? { ...r, status: "archived", updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    ) as Role[];
    setRoles(next); saveRoles(next); showToast("Role archived");
  };

  const confirmToggleStatus = () => {
    if (!confirmTarget) return;
    const role = confirmTarget.role;
    const newStatus = role.status === "active" ? "inactive" : "active";
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    if (newStatus === "inactive" && count > 0) {
      showToast("Cannot deactivate: " + count + " user(s) assigned to this role", "error"); return;
    }
    const next = roles.map(r =>
      r.id === role.id
        ? { ...r, status: newStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    ) as Role[];
    setRoles(next); saveRoles(next);
    showToast("Role " + (newStatus === "active" ? "activated" : "deactivated"));
  };

  // Computed outside JSX via top-level pure function — SWC-safe
  const cfg = getConfirmConfig(confirmTarget, confirmDelete, confirmToggleStatus);

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Roles</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage roles and optional approval hierarchies</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" /> Add Role
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Roles" value={total}    icon={Shield}       accent />
          <KpiCard label="Active"      value={active}   icon={CheckCircle2}        />
          <KpiCard label="Inactive"    value={inactive} icon={XCircle}             />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-border px-4 py-2 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search role or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>

          {/* Department filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium",
                filterDept.length > 0
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Department
                {filterDept.length > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full font-bold">
                    {filterDept.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter by Department</p>
              </div>
              <div className="px-3 py-2.5 space-y-2">
                {DEPARTMENTS.map(dept => (
                  <label key={dept.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={filterDept.includes(dept.id)}
                      onChange={() => toggleDept(dept.id)} className="w-4 h-4 rounded accent-brand-600 cursor-pointer" />
                    <span className="text-xs text-foreground group-hover:text-brand-700 transition-colors">{dept.name}</span>
                  </label>
                ))}
              </div>
              {filterDept.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button onClick={() => setFilterDept([])} className="text-xs text-brand-600 hover:underline">Clear filter</button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Status filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium",
                filterStatus.length > 0
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Status
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
                    <input type="checkbox" checked={filterStatus.includes(v)}
                      onChange={() => toggleStatus(v)} className="w-4 h-4 rounded accent-brand-600 cursor-pointer" />
                    <span className="text-xs text-foreground capitalize group-hover:text-brand-700 transition-colors">{v}</span>
                  </label>
                ))}
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button onClick={() => setFilterStatus([])} className="text-xs text-brand-600 hover:underline">Clear filter</button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Active chips */}
          {filterDept.map(id => {
            const d = DEPARTMENTS.find(x => x.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                {d?.name}
                <button onClick={() => toggleDept(id)} className="ml-0.5 hover:text-brand-900"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
          {filterStatus.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v.charAt(0).toUpperCase() + v.slice(1)}
              <button onClick={() => toggleStatus(v)} className="ml-0.5 hover:text-brand-900"><X className="w-3 h-3" /></button>
            </span>
          ))}

          <p className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">{filtered.length} of {total}</p>
          {hasFilters && (
            <button onClick={clearFilters} className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border flex">
                  <SortTh label="Role Name"  colKey="roleName"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[1.5]" />
                  <SortTh label="Department" colKey="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-1" />
                  <SortTh label="Geo Level"  colKey="geoLevel"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[0.8]" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-[0.8]">Approval</th>
                  <SortTh label="Status"     colKey="status"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[0.8]" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-[0.8]">Created By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-1">Updated</th>
                  <th className="px-3 py-3 flex-shrink-0 w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr className="flex">
                    <td colSpan={8} className="py-16 text-center w-full">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No roles found</p>
                        <p className="text-xs text-muted-foreground">
                          {hasFilters ? "Try adjusting your filters." : "Add your first role to get started."}
                        </p>
                        {hasFilters ? (
                          <button onClick={clearFilters} className="text-xs text-brand-600 hover:underline mt-1">Clear filters</button>
                        ) : (
                          <button onClick={openAdd} className="text-xs text-brand-600 hover:underline mt-1">+ Add Role</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(role => (
                  <tr key={role.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors flex">
                    <td className="px-4 py-2 flex-[1.5]">
                      <button className="text-xs font-semibold text-foreground hover:text-brand-600 transition-colors text-left" onClick={() => setViewRole(role)}>
                        {role.roleName}
                      </button>
                    </td>
                    <td className="px-4 py-2 flex-1">
                      <span className="text-xs text-foreground">{role.department}</span>
                    </td>
                    <td className="px-4 py-2 flex-[0.8]">
                      <GeoBadge level={role.geoLevel} />
                    </td>
                    <td className="px-4 py-2 flex-[0.8]">
                      {role.approvalChain.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">Not set</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                          {role.approvalChain.length} step{role.approvalChain.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 flex-[0.8]">
                      <Switch checked={role.status === "active"} onCheckedChange={() => handleQuickToggle(role)} />
                    </td>
                    <td className="px-4 py-2 flex-[0.8]">
                      <p className="text-[11px] text-muted-foreground">{role.createdBy} · {role.createdDate}</p>
                    </td>
                    <td className="px-4 py-2 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-500" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">{role.updatedBy} · {role.updatedDate}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right flex-shrink-0 w-12">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <button onClick={() => setViewRole(role)} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm">
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button onClick={() => openEdit(role)} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => handleQuickToggle(role)} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm">
                            {role.status === "active"
                              ? <><XCircle className="w-3.5 h-3.5 text-amber-500" /> Deactivate</>
                              : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Activate</>}
                          </button>
                          <DropdownMenuSeparator />
                          <button onClick={() => handleDelete(role)} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-sm">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
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
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> roles
            </p>
          </div>
        </div>

      </div>

      <RoleDetailSheet
        open={viewRole !== null}
        onClose={() => setViewRole(null)}
        role={viewRole}
        onEdit={(role) => { setViewRole(null); openEdit(role); }}
      />

      {cfg !== null && (
        <ConfirmDialog
          open={confirmTarget !== null}
          onClose={() => setConfirmTarget(null)}
          config={cfg}
        />
      )}

      {toast !== null && <Toast toast={toast} onDismiss={() => setToast(null)} />}

    </AppLayout>
  );
}
