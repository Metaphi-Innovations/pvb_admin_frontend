"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Download, MoreVertical, Eye, Edit2, Trash2,
  Users, CheckCircle2, XCircle, X, AlertTriangle, Key,
  Calendar, Clock, MoreHorizontal, ChevronDown, FileText,
} from "lucide-react";
import {
  type Employee,
  loadEmployees, saveEmployees, todayStr,
  downloadEmployeeCSV, validateCircularReporting,
  EMPLOYEE_TYPES,
} from "./employee-data";

// Listing Container and Master Listing Imports
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";

// ── Seed / Temp Master Data ──────────────────────────────────────────────────
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

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-slate-200 bg-slate-100 text-slate-700",
    draft: "border-blue-200 bg-blue-50 text-blue-700",
    archived: "border-red-200 bg-red-50 text-red-700",
  }[status] ?? "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center justify-center whitespace-nowrap", cfg)}>
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
              className="h-9 text-sm w-full border border-input rounded-md px-3"
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
              className="h-9 text-sm w-full border border-input rounded-md px-3"
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeListingPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Listing State
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "employeeId", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ type: string; employee: Employee; nextStatus?: "active" | "inactive" | "draft" } | null>(null);
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
      const searchVal = filters.search as string;
      if (searchVal) {
        const q = searchVal.toLowerCase();
        const matchSearch = [
          e.employeeId,
          e.fullName,
          e.email,
          e.mobile,
        ].some(f => f.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      // Department filter
      const deptIds = (filters.departmentId as string[])?.map(Number) || [];
      if (deptIds.length > 0 && !deptIds.includes(e.departmentId || 0)) return false;

      // Role filter
      const roleIds = (filters.roleId as string[])?.map(Number) || [];
      if (roleIds.length > 0 && !roleIds.includes(e.roleId || 0)) return false;

      // Status filter
      const statusList = filters.status as string[];
      if (statusList && statusList.length > 0 && !statusList.includes(e.status)) return false;

      // Territory filter
      const territoryList = filters.territory as string[];
      if (territoryList && territoryList.length > 0 && !territoryList.includes(e.territory || "")) return false;

      // Employee Type filter
      const typeList = filters.employeeType as string[];
      if (typeList && typeList.length > 0 && !typeList.includes(e.employeeType || "")) return false;

      return true;
    });

    // Sort
    if (sort.key && sort.direction !== "none") {
      result = [...result].sort((a, b) => {
        let aVal: any = a[sort.key as keyof Employee];
        let bVal: any = b[sort.key as keyof Employee];
        if (aVal === undefined) aVal = "";
        if (bVal === undefined) bVal = "";

        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [employees, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // KPI cards stats
  const stats = useMemo(() => {
    const all = employees.filter(e => e.status !== "archived");
    return {
      total: all.length,
      active: all.filter(e => e.status === "active").length,
      inactive: all.filter(e => e.status === "inactive").length,
      draft: all.filter(e => e.status === "draft").length,
    };
  }, [employees]);

  const handleStatusAction = (emp: Employee, nextStatus: "active" | "inactive" | "draft") => {
    setConfirmTarget({ type: "status", employee: emp, nextStatus });
  };

  const confirmStatusChange = () => {
    if (!confirmTarget || confirmTarget.type !== "status" || !confirmTarget.nextStatus) return;
    const emp = confirmTarget.employee;
    const nextStatus = confirmTarget.nextStatus;
    const updated = employees.map(e =>
      e.id === emp.id
        ? { ...e, status: nextStatus as any, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() }
        : e
    );
    setEmployees(updated);
    saveEmployees(updated);
    setToast({ msg: `Employee status updated to ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)} successfully`, type: "success" });
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

  const columns: ColumnConfig<Employee>[] = [
    {
      key: "employeeId",
      header: "User ID",
      sortable: true,
      render: (val, row) => (
        <span className="font-mono font-semibold text-brand-700">{row.employeeId}</span>
      ),
    },
    {
      key: "fullName",
      header: "Name",
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-semibold truncate text-foreground">{row.fullName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{row.email}</p>
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.mobile}</span>
      ),
    },
    {
      key: "departmentId",
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
      key: "roleId",
      header: "Role",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: ROLES.map(r => ({ label: r.name, value: String(r.id) })),
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.role}</span>
      ),
    },
    {
      key: "territory",
      header: "Territory",
      filterable: true,
      filterType: "dropdown",
      filterOptions: TERRITORIES.map(t => ({ label: t, value: t })),
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.territory}</span>
      ),
    },
    {
      key: "employeeType",
      header: "Employee Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: EMPLOYEE_TYPES.map(t => ({ label: t, value: t })),
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.employeeType || "—"}</span>
      ),
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
        { label: "Draft", value: "draft" },
      ],
      render: (val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex items-center gap-1.5 focus:outline-none pt-0.5">
              <StatusBadge status={row.status} />
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-white border shadow-lg border-border z-[200]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Status Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {row.status !== "active" && (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                onClick={() => handleStatusAction(row, "active")}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Activate
              </DropdownMenuItem>
            )}
            {row.status !== "inactive" && (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer text-slate-700 hover:text-slate-900"
                onClick={() => handleStatusAction(row, "inactive")}
              >
                <XCircle className="w-3.5 h-3.5" /> Deactivate
              </DropdownMenuItem>
            )}
            {row.status !== "draft" && (
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer text-blue-700 hover:text-blue-900"
                onClick={() => handleStatusAction(row, "draft")}
              >
                <FileText className="w-3.5 h-3.5" /> Mark Draft
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
            <DropdownMenuItem onClick={() => router.push(`/user-management/employee/${row.id}`)} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/user-management/employee/${row.id}/edit`)} className="cursor-pointer">
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusAction(row, row.status === "active" ? "inactive" : "active")} className="cursor-pointer">
              {row.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePasswordReset(row)} className="cursor-pointer">
              <Key className="w-3.5 h-3.5 mr-2" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(row)} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <ListingContainer
      title="User"
      titleIcon={Users}
      metrics={
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
      }
    >
      <div>
        <MasterListing<Employee>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          emptyMessage="users"
          searchPlaceholder="Search by User ID, Name, Mobile, or Email…"
          onAdd={() => router.push("/user-management/employee/add")}
          addLabel="Add User"
          onExport={handleExport}
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {/* ── Dialogs ── */}
      <ConfirmDialog
        open={confirmTarget?.type === "status"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmStatusChange}
        title={
          confirmTarget?.nextStatus === "active"
            ? "Activate Employee"
            : confirmTarget?.nextStatus === "inactive"
            ? "Deactivate Employee"
            : "Mark as Draft"
        }
        description={`Are you sure you want to ${
          confirmTarget?.nextStatus === "active"
            ? "activate"
            : confirmTarget?.nextStatus === "inactive"
            ? "deactivate"
            : "mark as draft"
        } ${confirmTarget?.employee?.fullName}?`}
        confirmLabel={
          confirmTarget?.nextStatus === "active"
            ? "Activate"
            : confirmTarget?.nextStatus === "inactive"
            ? "Deactivate"
            : "Mark Draft"
        }
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

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
