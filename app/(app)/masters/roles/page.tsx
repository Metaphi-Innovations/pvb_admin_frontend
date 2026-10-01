"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Search, Edit2, Trash2, Shield, CheckCircle2, XCircle,
  X, AlertTriangle, ChevronDown, ChevronRight, Globe, Users,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  type Role, type GeoLevel,
  GEO_LEVELS, GEO_LEVEL_LABEL, MOCK_USER_COUNTS,
  loadRoles, saveRoles, todayStr, formatChain,
} from "./roles-data";

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: "success" | "error" | "warning" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const bg = toast.type === "success"
    ? "bg-emerald-600"
    : toast.type === "warning"
      ? "bg-amber-500"
      : "bg-red-600";
  return (
    <div className={cn(
      "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium max-w-xs",
      "animate-in slide-in-from-top-2 fade-in-0 duration-300",
      bg,
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{toast.msg}</span>
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = "Confirm", destructive,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel?: string; destructive?: boolean;
}) {
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
          <DialogDescription className="pt-1 text-xs">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs gap-1.5",
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

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium",
      active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
        active ? "bg-emerald-500" : "bg-slate-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Geo level badge ───────────────────────────────────────────────────────────
const GEO_BADGE_CFG: Record<GeoLevel, { bg: string; text: string }> = {
  Country:   { bg: "bg-blue-100",   text: "text-blue-700"   },
  Zone:      { bg: "bg-indigo-100", text: "text-indigo-700" },
  Region:    { bg: "bg-purple-100", text: "text-purple-700" },
  State:     { bg: "bg-teal-100",   text: "text-teal-700"   },
  Area:      { bg: "bg-amber-100",  text: "text-amber-700"  },
  Territory: { bg: "bg-orange-100", text: "text-orange-700" },
  District:  { bg: "bg-rose-100",   text: "text-rose-700"   },
  City:      { bg: "bg-indigo-100", text: "text-indigo-700" },
  Town:      { bg: "bg-violet-100", text: "text-violet-700" },
  None:      { bg: "bg-slate-100",  text: "text-slate-600"  },
};

function GeoLevelBadge({ level }: { level: GeoLevel }) {
  const cfg = GEO_BADGE_CFG[level];
  return (
    <span className={cn(
      "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full",
      cfg.bg, cfg.text,
    )}>
      {level === "None" ? "Functional" : level}
    </span>
  );
}

// ── Filter Dropdown (generic) ─────────────────────────────────────────────────
function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "h-8 px-3 text-xs border rounded-lg flex items-center gap-1.5 font-medium transition-colors",
          value
            ? "border-brand-400 bg-brand-50 text-brand-700"
            : "border-border text-muted-foreground hover:bg-muted",
        )}>
          {selected?.label ?? label}
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-md transition-colors hover:bg-muted/60",
              value === opt.value && "bg-brand-50 text-brand-700 font-medium",
            )}
          >
            {value === opt.value && <CheckCircle2 className="w-3 h-3 text-brand-600 flex-shrink-0" />}
            <span className={value === opt.value ? "" : "pl-5"}>{opt.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── KPI mini card ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: number; sub?: string;
  icon: React.ElementType; accent?: boolean;
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
        {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
type SortKey = "roleName" | "geoLevel" | "status";

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RolesMasterPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "active" | "inactive">("");
  const [filterGeoLevel, setFilterGeoLevel] = useState<GeoLevel | "">("");
  const [sortKey, setSortKey] = useState<SortKey>("roleName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Confirm / delete
  const [confirmRole, setConfirmRole] = useState<Role | null>(null);
  const [confirmType, setConfirmType] = useState<"deactivate" | "activate" | "delete">("delete");

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback(
    (msg: string, type: ToastState["type"] = "success") => setToast({ msg, type }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load on mount
  useEffect(() => { setRoles(loadRoles()); }, []);

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalRoles      = roles.length;
  const activeRoles     = roles.filter(r => r.status === "active").length;
  const functionalRoles = roles.filter(r => r.geoLevel === "None").length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let r = [...roles];
    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(
        x => x.roleName.toLowerCase().includes(t) || x.description.toLowerCase().includes(t),
      );
    }
    if (filterStatus)   r = r.filter(x => x.status === filterStatus);
    if (filterGeoLevel) r = r.filter(x => x.geoLevel === filterGeoLevel);

    r.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "roleName") cmp = a.roleName.localeCompare(b.roleName);
      if (sortKey === "geoLevel") cmp = a.geoLevel.localeCompare(b.geoLevel);
      if (sortKey === "status")   cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [roles, search, filterStatus, filterGeoLevel, sortKey, sortDir]);

  const hasFilters = !!(search.trim() || filterStatus || filterGeoLevel);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDeleteClick = (role: Role) => {
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    if (count > 0) {
      showToast(
        `Cannot delete "${role.roleName}". ${count} user${count > 1 ? "s" : ""} have this role assigned.`,
        "error",
      );
      return;
    }
    setConfirmRole(role);
    setConfirmType("delete");
  };

  const handleToggleStatus = (role: Role) => {
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    setConfirmRole(role);
    setConfirmType(role.status === "active" ? "deactivate" : "activate");
    if (role.status === "active" && count > 0) {
      // Will show warning in the dialog
    }
  };

  const executeConfirm = () => {
    if (!confirmRole) return;
    const updated = roles.map(r => {
      if (r.id !== confirmRole.id) return r;
      if (confirmType === "delete")     return { ...r, status: "inactive" as const, updatedDate: todayStr(), updatedBy: "Admin" };
      if (confirmType === "deactivate") return { ...r, status: "inactive" as const, updatedDate: todayStr(), updatedBy: "Admin" };
      if (confirmType === "activate")   return { ...r, status: "active"   as const, updatedDate: todayStr(), updatedBy: "Admin" };
      return r;
    });
    setRoles(updated);
    saveRoles(updated);
    const msgs: Record<typeof confirmType, string> = {
      delete:     `"${confirmRole.roleName}" has been deactivated.`,
      deactivate: `"${confirmRole.roleName}" is now inactive.`,
      activate:   `"${confirmRole.roleName}" is now active.`,
    };
    showToast(msgs[confirmType]);
    setConfirmRole(null);
  };

  // ── Confirm dialog props ──────────────────────────────────────────────────
  const confirmProps = () => {
    if (!confirmRole) return { title: "", description: "", confirmLabel: "", destructive: false };
    const count = MOCK_USER_COUNTS[confirmRole.id] ?? 0;
    if (confirmType === "deactivate") {
      return {
        title: `Deactivate "${confirmRole.roleName}"?`,
        description: count > 0
          ? `Warning: ${count} user${count > 1 ? "s" : ""} have this role. They may lose their role assignment. Continue?`
          : `This will mark "${confirmRole.roleName}" as inactive. It can be reactivated later.`,
        confirmLabel: "Deactivate",
        destructive: true,
      };
    }
    if (confirmType === "activate") {
      return {
        title: `Activate "${confirmRole.roleName}"?`,
        description: `This will mark "${confirmRole.roleName}" as active and make it available for assignment.`,
        confirmLabel: "Activate",
        destructive: false,
      };
    }
    return {
      title: `Delete "${confirmRole.roleName}"?`,
      description: `This will deactivate the role. It will no longer appear in role assignments.`,
      confirmLabel: "Delete",
      destructive: true,
    };
  };

  // ── Sortable TH ──────────────────────────────────────────────────────────
  function SortTh({ label, col, flexClass }: { label: string; col: SortKey; flexClass?: string }) {
    const active = sortKey === col;
    return (
      <th
        onClick={() => handleSort(col)}
        className={cn(
          "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap group",
          active && "bg-brand-50/60",
          flexClass,
        )}
      >
        <span className={cn("inline-flex items-center gap-1",
          active ? "text-brand-700" : "text-foreground")}>
          {label}
          {active
            ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform",
                sortDir === "desc" && "rotate-180")} />
            : <ChevronRight className="w-3 h-3 text-muted-foreground/30 rotate-90 group-hover:text-muted-foreground transition-colors" />
          }
        </span>
      </th>
    );
  }

  const cp = confirmProps();

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
              <span>Masters</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">Roles</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Role Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage roles, geography levels and approval chains
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white flex-shrink-0"
            onClick={() => router.push("/masters/roles/create")}
          >
            <Plus className="w-3.5 h-3.5" /> Create Role
          </Button>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Roles" value={totalRoles} icon={Shield} accent />
          <KpiCard label="Active Roles" value={activeRoles} icon={CheckCircle2} />
          <KpiCard label="Functional Roles" value={functionalRoles} sub="No geography" icon={Users} />
        </div>

        {/* ── Filter toolbar ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search roles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <FilterDropdown<"" | "active" | "inactive">
            value={filterStatus}
            onChange={setFilterStatus}
            label="All Status"
            options={[
              { value: "",         label: "All Status" },
              { value: "active",   label: "Active"     },
              { value: "inactive", label: "Inactive"   },
            ]}
          />

          {/* Geo Level filter */}
          <FilterDropdown<GeoLevel | "">
            value={filterGeoLevel}
            onChange={setFilterGeoLevel}
            label="All Levels"
            options={[
              { value: "", label: "All Levels" },
              ...GEO_LEVELS.map(l => ({ value: l, label: GEO_LEVEL_LABEL[l] })),
            ]}
          />

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterGeoLevel(""); }}
              className="h-8 px-2.5 text-xs text-brand-600 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          {/* Record count */}
          <p className="ml-auto text-[11px] text-muted-foreground">
            {filtered.length} of {roles.length} roles
          </p>
        </div>

        {/* ── Table ── */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border flex">
                  <SortTh label="Role Name" col="roleName" flexClass="flex-1" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-[1.2]">
                    Description
                  </th>
                  <SortTh label="Geography Level" col="geoLevel" flexClass="flex-[0.8]" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-[1.2]">
                    Approval Chain
                  </th>
                  <SortTh label="Status" col="status" flexClass="flex-[0.8]" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground flex-shrink-0 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        </div>
                        {hasFilters ? (
                          <>
                            <p className="text-sm font-medium text-foreground">No roles match your filters</p>
                            <p className="text-xs text-muted-foreground">Try adjusting search or filter criteria.</p>
                            <button
                              onClick={() => { setSearch(""); setFilterStatus(""); setFilterGeoLevel(""); }}
                              className="text-xs text-brand-600 hover:underline"
                            >
                              Clear all filters
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">No roles created yet</p>
                            <p className="text-xs text-muted-foreground">
                              Create your first role to get started.
                            </p>
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1 bg-brand-600 hover:bg-brand-700 text-white mt-1"
                              onClick={() => router.push("/masters/roles/create")}
                            >
                              <Plus className="w-3 h-3" /> Create Role
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(role => {
                    const userCount = MOCK_USER_COUNTS[role.id] ?? 0;
                    const chainDisplay = formatChain(role.approvalChain);
                    return (
                      <tr
                        key={role.id}
                        className="border-b border-border/60 hover:bg-muted/20 transition-colors group flex"
                      >
                        {/* Role Name */}
                        <td className="px-4 py-3 whitespace-nowrap flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                              <Shield className="w-3.5 h-3.5 text-brand-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{role.roleName}</p>
                              {userCount > 0 && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-px">
                                  <Users className="w-2.5 h-2.5" />
                                  {userCount} user{userCount > 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 flex-[1.2] min-w-0">
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {role.description || <span className="text-muted-foreground/40">—</span>}
                          </p>
                        </td>

                        {/* Geo Level */}
                        <td className="px-4 py-3 whitespace-nowrap flex-[0.8]">
                          <GeoLevelBadge level={role.geoLevel} />
                        </td>

                        {/* Approval Chain */}
                        <td className="px-4 py-3 flex-[1.2] min-w-0">
                          {role.approvalChain.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              {role.geoLevel === "None" || role.geoLevel === "Country"
                                ? "No chain needed"
                                : "Not configured"}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              {role.approvalChain.slice(0, 4).map((step, i) => (
                                <React.Fragment key={step.uid}>
                                  <span className="text-[11px] font-medium text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                    {step.roleName}
                                  </span>
                                  {i < Math.min(role.approvalChain.length - 1, 3) && (
                                    <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  )}
                                </React.Fragment>
                              ))}
                              {role.approvalChain.length > 4 && (
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-medium">
                                  +{role.approvalChain.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap flex-[0.8]">
                          <StatusPill status={role.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap flex-shrink-0 w-16">
                          <div className="flex items-center gap-1.5">
                            {/* Edit */}
                            <button
                              onClick={() => router.push(`/masters/roles/${role.id}/edit`)}
                              className="h-7 px-2.5 text-[11px] font-medium border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>

                            {/* Toggle Status */}
                            <button
                              onClick={() => handleToggleStatus(role)}
                              className={cn(
                                "h-7 px-2 text-[11px] font-medium border rounded-md transition-colors flex items-center gap-1",
                                role.status === "active"
                                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                              )}
                              title={role.status === "active" ? "Deactivate" : "Activate"}
                            >
                              {role.status === "active"
                                ? <ToggleRight className="w-3.5 h-3.5" />
                                : <ToggleLeft className="w-3.5 h-3.5" />
                              }
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteClick(role)}
                              className="h-7 w-7 text-[11px] border border-red-200 rounded-md hover:bg-red-50 text-red-600 transition-colors flex items-center justify-center"
                              title="Delete role"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{filtered.length}</span>
              {" "}of{" "}
              <span className="font-medium text-foreground">{roles.length}</span>
              {" "}roles
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeRoles} active · {roles.length - activeRoles} inactive
            </p>
          </div>
        </div>

      </div>

      {/* Confirm dialog */}
      {confirmRole && (
        <ConfirmDialog
          open={!!confirmRole}
          onClose={() => setConfirmRole(null)}
          onConfirm={executeConfirm}
          title={cp.title}
          description={cp.description}
          confirmLabel={cp.confirmLabel}
          destructive={cp.destructive}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
