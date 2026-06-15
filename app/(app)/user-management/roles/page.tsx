"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Eye, Edit2, Trash2,
  Shield, CheckCircle2, XCircle, X, AlertTriangle,
  Clock, MoreHorizontal
} from "lucide-react";
import {
  type Role, DEPARTMENTS, MOCK_USER_COUNTS,
  loadRoles, saveRoles, todayStr,
} from "./roles-data";
import RoleDetailSheet from "./components/RoleDetailSheet";

// Listing Container and Master Listing Imports
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Pure helpers ─────────────────────────────────────────────────────────────
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

// ── GeoBadge ─────────────────────────────────────────────────────────────────
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

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const bg = toast.type === "success" ? "bg-emerald-600" : "bg-red-600";
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      bg,
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
        : <XCircle className="flex-shrink-0 w-4 h-4" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── ConfirmDialog ────────────────────────────────────────────────────────────
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

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  draft:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  archived: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

function StatusToggle({ record, onToggle }: { record: Role; onToggle: (item: Role) => void }) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(record);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

function AuditCell({ name, date }: { name?: string; date?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold leading-4 text-brand-700">
        {name || "—"}
      </p>
      <p className="text-[10px] font-mono leading-3 text-muted-foreground">
        {date || "—"}
      </p>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  bgClass?: string;
}

function KpiCard({ label, value, icon: Icon, bgClass = "bg-brand-600" }: KpiCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        bgClass,
      )}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ── RolesPage (main) ─────────────────────────────────────────────────────────
export default function RolesPage() {
  const router = useRouter();

  const [roles,         setRoles]         = useState<Role[]>([]);
  
  // Listing state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "roleName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const filtered = useMemo(() => {
    let r = roles.filter(role => role.status !== "archived");
    
    const searchVal = filters.search as string;
    if (searchVal?.trim()) {
      const q = searchVal.toLowerCase();
      r = r.filter(role =>
        role.roleName.toLowerCase().includes(q) ||
        role.department.toLowerCase().includes(q),
      );
    }
    
    const deptIds = (filters.department as string[])?.map(Number) || [];
    if (deptIds.length > 0) {
      r = r.filter(role => deptIds.includes(role.departmentId ?? -1));
    }
    
    const statusVal = filters.status as string[];
    if (statusVal && statusVal.length > 0) {
      r = r.filter(role => statusVal.includes(role.status));
    }

    if (sort.key && sort.direction !== "none") {
      r = [...r].sort((a, b) => {
        const av = String(a[sort.key as keyof Role] ?? "").toLowerCase();
        const bv = String(b[sort.key as keyof Role] ?? "").toLowerCase();
        return sort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return r;
  }, [roles, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const visible  = roles.filter(r => r.status !== "archived");
  const total    = visible.length;
  const active   = visible.filter(r => r.status === "active").length;
  const inactive = visible.filter(r => r.status === "inactive").length;

  const openAdd  = () => router.push("/user-management/roles/add");
  const openEdit = (role: Role) => router.push("/user-management/roles/" + role.id + "/edit");

  const toggleStatus = (role: Role) => {
    const nextStatus = role.status === "active" ? "inactive" : "active";
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    if (nextStatus === "inactive" && count > 0) {
      showToast("Cannot deactivate: " + count + " user(s) assigned to this role", "error");
      return;
    }
    const next = roles.map(r =>
      r.id === role.id
        ? { ...r, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    ) as Role[];
    setRoles(next);
    saveRoles(next);
    showToast("Role status updated to " + (nextStatus === "active" ? "Active" : "Inactive"));
  };

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

  const cfg = getConfirmConfig(confirmTarget, confirmDelete, confirmToggleStatus);

  const columns: ColumnConfig<Role>[] = [
    {
      key: "roleName",
      header: "Role Name",
      sortable: true,
      render: (val, row) => (
        <button
          className="text-xs font-semibold text-left transition-colors text-foreground hover:text-brand-600"
          onClick={() => setViewRole(row)}
          className="text-xs font-semibold text-left transition-colors text-foreground hover:text-brand-600"
          onClick={() => router.push(`/user-management/roles/${row.id}`)}
        >
          {row.roleName}
        </button>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: DEPARTMENTS.map(d => ({ label: d.name, value: String(d.id) })),
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.department}</span>
      ),
    },
    {
      key: "geoLevel",
      header: "Geo Level",
      sortable: true,
      render: (val, row) => <GeoBadge level={row.geoLevel} />,
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
      render: (val, row) => <StatusToggle record={row} onToggle={toggleStatus} />,
    },
    {
      key: "createdBy",
      header: "Created By",
      render: (val, row) => <AuditCell name={row.createdBy} date={row.createdDate} />,
    },
    {
      key: "updatedDate",
      header: "Updated",
      render: (val, row) => <AuditCell name={row.updatedBy} date={row.updatedDate} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 z-[200]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/user-management/roles/${row.id}`)} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row)} className="cursor-pointer">
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem onClick={() => handleQuickToggle(row)} className="cursor-pointer">
              {row.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator /> */}
            <DropdownMenuItem onClick={() => handleDelete(row)} className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <ListingContainer
      title="Roles"
      titleIcon={Shield}
      metrics={
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Roles" value={total}    icon={Shield}       bgClass="bg-brand-600" />
          <KpiCard label="Active"      value={active}   icon={CheckCircle2} bgClass="bg-emerald-600" />
          <KpiCard label="Inactive"    value={inactive} icon={XCircle}      bgClass="bg-slate-400" />
        </div>
      }
    >
      <div>
        <MasterListing<Role>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          emptyMessage="roles"
          searchPlaceholder="Search role or department…"
          onAdd={openAdd}
          addLabel="Add Role"
          onExport={undefined}
          currentFilters={filters}
          currentSort={sort}
        />
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
    </ListingContainer>
  );
}
