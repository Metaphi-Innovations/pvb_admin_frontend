"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Users, CheckCircle2, XCircle, X, AlertTriangle,
  SlidersHorizontal, ChevronDown, ChevronsUpDown, Key,
} from "lucide-react";
import {
  type Employee,
  loadEmployees, saveEmployees, todayStr,
  downloadEmployeeCSV, validateCircularReporting,
  EMPLOYEE_TYPES,
} from "./employee-data";

// ── Import Department and Role masters ────────────────────────────────────────
// TODO: Load these from actual masters when available
const DEPARTMENTS = [
  { id: 1, name: "Sales" },
  { id: 2, name: "HR" },
  { id: 3, name: "Accounts" },
  { id: 4, name: "Procurement" },
  { id: 5, name: "Field Force" },
  { id: 6, name: "Operations" },
];

const ROLES = [
  { id: 1, name: "Sales Manager" },
  { id: 2, name: "Sales Executive" },
  { id: 3, name: "KAM" },
  { id: 5, name: "HR Admin" },
  { id: 6, name: "Accountant" },
  { id: 7, name: "Procurement Lead" },
  { id: 8, name: "Field Agent" },
  { id: 9, name: "TM" },
];

const TERRITORIES = [
  "Mumbai Region", "Dadar-Parel Territory", "Matunga Territory",
  "Borivali-Kandivali Territory", "Bangalore Region", "Indiranagar Territory",
  "Whitefield Territory", "Chennai Region", "T. Nagar Territory",
];

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  draft:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
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
        : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
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
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs gap-1.5",
              destructive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white")}
            onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Password Reset Modal ──────────────────────────────────────────────────────
interface PasswordResetState {
  open: boolean;
  employee: Employee | null;
  newPassword: string;
  confirmPassword: string;
  sendEmail: boolean;
  errors: { newPassword?: string; confirmPassword?: string };
}

function PasswordResetModal({
  state, onChange, onReset, onClose,
}: {
  state: PasswordResetState;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onChange("newPassword", password);
    onChange("confirmPassword", password);
  };

  return (
    <Dialog open={state.open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4 text-blue-600" />
            Reset Password
          </DialogTitle>
          <DialogDescription className="pt-1">
            Reset password for <span className="font-semibold">{state.employee?.fullName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">New Password *</label>
            <Input
              type="password"
              value={state.newPassword}
              onChange={e => onChange("newPassword", e.target.value)}
              placeholder="Enter new password (min 8 chars)"
              className="h-9 text-sm"
            />
            {state.errors.newPassword && (
              <p className="text-xs text-red-500">{state.errors.newPassword}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Confirm Password *</label>
            <Input
              type="password"
              value={state.confirmPassword}
              onChange={e => onChange("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              className="h-9 text-sm"
            />
            {state.errors.confirmPassword && (
              <p className="text-xs text-red-500">{state.errors.confirmPassword}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleGeneratePassword}>
            Generate Random Password
          </Button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.sendEmail}
              onChange={e => onChange("sendEmail", e.target.checked)}
              className="w-4 h-4 rounded accent-brand-600"
            />
            <span className="text-xs text-foreground">Send password to employee email</span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onReset}>
            Reset Password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sortable Table Header ─────────────────────────────────────────────────────
type SortKey = "employeeId" | "fullName" | "mobile" | "department" | "role" | "status";

function SortTh({
  label, col, sortKey, sortDir, onSort, className,
}: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (col: SortKey) => void; className?: string;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
      )}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active
          ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />}
      </div>
    </th>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeListingPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<number[]>([]);
  const [filterRole, setFilterRole] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterTerritory, setFilterTerritory] = useState<string[]>([]);
  const [filterEmployeeType, setFilterEmployeeType] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("employeeId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ type: string; employee: Employee } | null>(null);
  const [passwordReset, setPasswordReset] = useState<PasswordResetState>({
    open: false,
    employee: null,
    newPassword: "",
    confirmPassword: "",
    sendEmail: false,
    errors: {},
  });

  // Load employees on mount
  useEffect(() => {
    const loaded = loadEmployees();
    setEmployees(loaded);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Filter & search logic
  const filtered = useMemo(() => {
    let result = employees.filter(e => {
      // Exclude archived employees from listing
      if (e.status === "archived") return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchSearch = [
          e.employeeId,
          e.fullName,
          e.email,
          e.mobile,
        ].some(f => f.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      // Filters
      if (filterDepartment.length > 0 && !filterDepartment.includes(e.departmentId || 0)) return false;
      if (filterRole.length > 0 && !filterRole.includes(e.roleId || 0)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(e.status)) return false;
      if (filterTerritory.length > 0 && !filterTerritory.includes(e.territory || "")) return false;
      if (filterEmployeeType.length > 0 && !filterEmployeeType.includes(e.employeeType || "")) return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];
      if (aVal === undefined) aVal = "";
      if (bVal === undefined) bVal = "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [employees, search, filterDepartment, filterRole, filterStatus, filterTerritory, filterEmployeeType, sortKey, sortDir]);

  // Pagination
  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const visibleEmployees = filtered.slice(start, start + perPage);

  // KPI cards
  const stats = useMemo(() => {
    const all = employees.filter(e => e.status !== "archived");
    return {
      total: all.length,
      active: all.filter(e => e.status === "active").length,
      inactive: all.filter(e => e.status === "inactive").length,
      draft: all.filter(e => e.status === "draft").length,
    };
  }, [employees]);

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  const toggleFilter = (value: any, setter: (v: any[]) => void, current: any[]) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const clearAllFilters = () => {
    setFilterDepartment([]);
    setFilterRole([]);
    setFilterStatus([]);
    setFilterTerritory([]);
    setFilterEmployeeType([]);
    setSearch("");
    setPage(1);
  };

  const handleStatusToggle = (emp: Employee) => {
    const newStatus = emp.status === "active" ? "inactive" : "active";
    setConfirmTarget({ type: "status", employee: emp });
  };

  const confirmStatusChange = () => {
    if (!confirmTarget || confirmTarget.type !== "status") return;
    const emp = confirmTarget.employee;
    const newStatus = emp.status === "active" ? "inactive" : "active";
    const updated = employees.map(e =>
      e.id === emp.id
        ? { ...e, status: newStatus as any, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() }
        : e
    );
    setEmployees(updated);
    saveEmployees(updated);
    setToast({ msg: `Employee ${newStatus === "active" ? "activated" : "deactivated"}`, type: "success" });
    setConfirmTarget(null);
  };

  const handleDelete = (emp: Employee) => {
    setConfirmTarget({ type: "delete", employee: emp });
  };

  const confirmDelete = () => {
    if (!confirmTarget || confirmTarget.type !== "delete") return;
    const emp = confirmTarget.employee;
    const updated = employees.map(e =>
      e.id === emp.id
        ? { ...e, status: "archived" as const, updatedBy: "Admin", updatedDate: todayStr() }
        : e
    );
    setEmployees(updated);
    saveEmployees(updated);
    setToast({ msg: "User archived", type: "success" });
    setConfirmTarget(null);
  };

  const handlePasswordReset = (emp: Employee) => {
    setPasswordReset({
      open: true,
      employee: emp,
      newPassword: "",
      confirmPassword: "",
      sendEmail: false,
      errors: {},
    });
  };

  const handlePasswordResetChange = (key: string, value: any) => {
    setPasswordReset(prev => ({ ...prev, [key]: value }));
  };

  const confirmPasswordReset = () => {
    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (!passwordReset.newPassword.trim()) {
      errors.newPassword = "Password is required";
    } else if (passwordReset.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }

    if (!passwordReset.confirmPassword) {
      errors.confirmPassword = "Please confirm password";
    } else if (passwordReset.newPassword !== passwordReset.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordReset(prev => ({ ...prev, errors }));
      return;
    }

    setToast({
      msg: `Password reset successfully. Temp password: ${passwordReset.newPassword}`,
      type: "success",
    });
    setPasswordReset({ open: false, employee: null, newPassword: "", confirmPassword: "", sendEmail: false, errors: {} });
  };

  const handleExport = () => {
    downloadEmployeeCSV(filtered);
    setToast({ msg: `Exported ${filtered.length} employees`, type: "success" });
  };

  const hasActiveFilters = filterDepartment.length > 0 || filterRole.length > 0 || filterStatus.length > 0
    || filterTerritory.length > 0 || filterEmployeeType.length > 0 || search;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* ── Header ──────────────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">User</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage organizational users</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleExport}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => router.push("/user-management/employee/add")}>
              <Plus className="w-3.5 h-3.5" /> Add User
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Users</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.active}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Active</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-400 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.inactive + stats.draft}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Inactive / Draft</p>
            </div>
          </div>
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-white">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by User ID, Name, Mobile, or Email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 border-0 h-8 text-sm bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground"
            />

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  hasActiveFilters
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filter
                  {hasActiveFilters && (
                    <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                      {(filterDepartment.length || 0) + (filterRole.length || 0) + (filterStatus.length || 0) + (filterTerritory.length || 0) + (filterEmployeeType.length || 0)}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-0">
                <div className="space-y-3 p-3">
                  {/* Department filter */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Department</p>
                    <div className="space-y-1.5">
                      {DEPARTMENTS.map(d => (
                        <label key={d.id} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterDepartment.includes(d.id)}
                            onChange={() => toggleFilter(d.id, setFilterDepartment, filterDepartment)}
                          />
                          <span className="text-xs text-foreground">{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Role filter */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Role</p>
                    <div className="space-y-1.5">
                      {ROLES.map(r => (
                        <label key={r.id} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterRole.includes(r.id)}
                            onChange={() => toggleFilter(r.id, setFilterRole, filterRole)}
                          />
                          <span className="text-xs text-foreground">{r.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status filter */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Status</p>
                    <div className="space-y-1.5">
                      {["active", "inactive", "draft"].map(s => (
                        <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterStatus.includes(s)}
                            onChange={() => toggleFilter(s, setFilterStatus, filterStatus)}
                          />
                          <span className="text-xs text-foreground capitalize">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Territory filter */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Territory</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {TERRITORIES.map(t => (
                        <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterTerritory.includes(t)}
                            onChange={() => toggleFilter(t, setFilterTerritory, filterTerritory)}
                          />
                          <span className="text-xs text-foreground">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* User Type filter */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">User Type</p>
                    <div className="space-y-1.5">
                      {EMPLOYEE_TYPES.map(et => (
                        <label key={et} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterEmployeeType.includes(et)}
                            onChange={() => toggleFilter(et, setFilterEmployeeType, filterEmployeeType)}
                          />
                          <span className="text-xs text-foreground">{et}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="border-t border-border pt-2">
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-brand-600 hover:underline font-medium">
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-2">
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  📝 {search}
                  <button onClick={() => { setSearch(""); setPage(1); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterDepartment.map(deptId => {
                const dept = DEPARTMENTS.find(d => d.id === deptId);
                return (
                  <span key={`dept-${deptId}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                    {dept?.name}
                    <button onClick={() => setFilterDepartment(filterDepartment.filter(d => d !== deptId))}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              {filterRole.map(roleId => {
                const role = ROLES.find(r => r.id === roleId);
                return (
                  <span key={`role-${roleId}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                    {role?.name}
                    <button onClick={() => setFilterRole(filterRole.filter(r => r !== roleId))}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              {filterStatus.map(s => (
                <span key={`status-${s}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  <button onClick={() => setFilterStatus(filterStatus.filter(st => st !== s))}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {filterTerritory.map(t => (
                <span key={`territory-${t}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {t}
                  <button onClick={() => setFilterTerritory(filterTerritory.filter(ter => ter !== t))}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {filterEmployeeType.map(et => (
                <span key={`type-${et}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {et}
                  <button onClick={() => setFilterEmployeeType(filterEmployeeType.filter(e => e !== et))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────────────────────── */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="User ID" col="employeeId" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[1.2]" />
                  <SortTh label="Name" col="fullName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[1.4]" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-1">Mobile</th>
                  <SortTh label="Department" col="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-1" />
                  <SortTh label="Role" col="role" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-[1.2]" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-1">Territory</th>
                  <SortTh label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-1" />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap flex-0.8">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {filtered.length === 0 && search || hasActiveFilters ? "No employees match your filters" : "No employees yet"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {filtered.length === 0 && search || hasActiveFilters ? "Try adjusting your search or filters" : "Start by adding your first employee"}
                        </p>
                        {(filtered.length === 0 && !search && !hasActiveFilters) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs mt-2"
                            onClick={() => router.push("/user-management/employee/add")}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add User
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleEmployees.map(emp => (
                    <tr key={emp.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-2 text-xs font-mono font-semibold text-brand-700 whitespace-nowrap flex-[1.2]">{emp.employeeId}</td>
                      <td className="px-4 py-2 text-xs text-foreground flex-[1.4] min-w-0">
                        <div>
                          <p className="font-semibold truncate">{emp.fullName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{emp.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap flex-1">{emp.mobile}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap flex-1">{emp.department}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap flex-[1.2]">{emp.role}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap flex-1">{emp.territory}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap flex-1"><StatusPill status={emp.status} /></td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap flex-0.8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <button
                              onClick={() => router.push(`/user-management/employee/${emp.id}`)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={() => router.push(`/user-management/employee/${emp.id}/edit`)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <DropdownMenuSeparator />
                            <button
                              onClick={() => handleStatusToggle(emp)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              {emp.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => handlePasswordReset(emp)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <Key className="w-3.5 h-3.5" /> Reset Password
                            </button>
                            <DropdownMenuSeparator />
                            <button
                              onClick={() => handleDelete(emp)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-sm transition-colors">
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

          {/* Table Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{Math.min(start + perPage, filtered.length)}</span> of{" "}
              <span className="font-medium text-foreground">{filtered.length}</span> records
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                ← Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmTarget?.type === "status"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmStatusChange}
        title={confirmTarget?.employee?.status === "active" ? "Deactivate Employee" : "Activate Employee"}
        description={`Are you sure you want to ${confirmTarget?.employee?.status === "active" ? "deactivate" : "activate"} ${confirmTarget?.employee?.fullName}?`}
        confirmLabel={confirmTarget?.employee?.status === "active" ? "Deactivate" : "Activate"}
      />

      <ConfirmDialog
        open={confirmTarget?.type === "delete"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
        title="Archive Employee"
        description={`Are you sure you want to archive ${confirmTarget?.employee?.fullName}? This action can be undone.`}
        confirmLabel="Archive"
        destructive
      />

      <PasswordResetModal
        state={passwordReset}
        onChange={handlePasswordResetChange}
        onReset={confirmPasswordReset}
        onClose={() => setPasswordReset({ ...passwordReset, open: false })}
      />

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
