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
  MoreHorizontal,
} from "lucide-react";
import {
  type Employee,
  loadEmployees, saveEmployees, todayStr,
  downloadEmployeeCSV,
  applyEmployeeStatusChange,
  formatEmployeeRoleLabel,
  formatEmployeeMobile,
} from "./employee-data";
import { EmployeeListingStatusCell } from "./components/EmployeeListingStatusCell";
import { ListingUserCell } from "@/components/listing/ListingUserCell";

// Listing Container and Master Listing Imports
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";

// ── Seed / Temp Master Data ──────────────────────────────────────────────────
const DEPARTMENTS = [
  { id: 1, name: "Accounts" },
  { id: 2, name: "HR" },
  { id: 3, name: "Procurement" },
  { id: 4, name: "Warehouse" },
  { id: 5, name: "Admin" },
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

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  draft:    { bg: "bg-amber-50",    text: "text-amber-700",    dot: "bg-amber-500"    },
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
    draft: "border-amber-200 bg-amber-50 text-amber-700",
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
        ? <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
        : <XCircle className="flex-shrink-0 w-4 h-4" />}
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
            <Key className="w-4 h-4 text-brand-600" />
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
              className="w-full px-3 text-sm border rounded-md h-9 border-input"
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
              className="w-full px-3 text-sm border rounded-md h-9 border-input"
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

type StatusTab = "all" | "active" | "inactive";
const USER_TAB_KEY = "user-list-status-tab";

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(USER_TAB_KEY);
  return v === "active" || v === "inactive" ? v : "all";
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeListingPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  // Listing State
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "employeeId", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    type: string;
    employee: Employee;
    nextStatus?: "active" | "inactive";
  } | null>(null);
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
    setStatusTab(readStoredStatusTab());
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

      if (statusTab !== "all" && e.status !== statusTab) return false;

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
  }, [employees, filters, sort, statusTab]);

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
    };
  }, [employees]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(USER_TAB_KEY, next);
    setPage(1);
  };

  const handleStatusToggleRequest = (emp: Employee, nextStatus: "active" | "inactive") => {
    setConfirmTarget({ type: "status", employee: emp, nextStatus });
  };

  const handleActivateBlocked = (gaps: string[]) => {
    setToast({ msg: gaps[0] || "Complete required profile data before activation", type: "error" });
  };

  const confirmStatusChange = () => {
    if (!confirmTarget || confirmTarget.type !== "status" || !confirmTarget.nextStatus) return;
    const emp = confirmTarget.employee;
    const nextStatus = confirmTarget.nextStatus;
    const updated = employees.map((e) =>
      e.id === emp.id ? applyEmployeeStatusChange(e, nextStatus) : e,
    );
    setEmployees(updated);
    saveEmployees(updated);
    setToast({
      msg: `User ${nextStatus === "active" ? "activated" : "deactivated"} successfully`,
      type: "success",
    });
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
      header: "Employee ID",
      sortable: true,
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-brand-700">{row.employeeId}</span>
      ),
    },
    {
      key: "fullName",
      header: "Employee Name",
      sortable: true,
      render: (_val, row) => (
        <p className="text-xs font-semibold truncate text-foreground">{row.fullName}</p>
      ),
    },
    {
      key: "email",
      header: "Email ID",
      sortable: true,
      render: (_val, row) => (
        <span className="text-xs text-foreground truncate">{row.email}</span>
      ),
    },
    {
      key: "mobile",
      header: "Mobile Number",
      sortable: true,
      render: (_val, row) => (
        <span className="text-xs font-mono text-foreground">
          {formatEmployeeMobile(row.mobile, row.countryCode)}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: ROLES.map(r => ({ label: r.name, value: r.name })),
      render: (_val, row) => (
        <span className="text-xs text-foreground">{formatEmployeeRoleLabel(row)}</span>
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
      ],
      render: (_val, row) => (
        <EmployeeListingStatusCell
          status={row.status}
          employee={row}
          onToggleRequest={
            row.status === "active" || row.status === "inactive" || row.status === "draft"
              ? (next) => handleStatusToggleRequest(row, next)
              : undefined
          }
          onActivateBlocked={handleActivateBlocked}
        />
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdDate} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedDate} />
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
            <DropdownMenuItem onClick={() => handlePasswordReset(row)} className="cursor-pointer">
              <Key className="w-3.5 h-3.5 mr-2" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
      title="User"
      titleIcon={Users}
      tabs={[
        { value: "all", label: `All (${stats.total})` },
        { value: "active", label: `Active (${stats.active})` },
        { value: "inactive", label: `Inactive (${stats.inactive})` },
      ]}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
      metrics={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Users</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-600">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.active}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-slate-400">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.inactive}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Inactive</p>
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
          searchPlaceholder="Search by Employee ID, Name, Mobile, or Email…"
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
          confirmTarget?.nextStatus === "active" ? "Activate User" : "Deactivate User"
        }
        description={
          confirmTarget?.nextStatus === "active"
            ? "Are you sure you want to activate this user?"
            : "Are you sure you want to deactivate this user?"
        }
        confirmLabel={confirmTarget?.nextStatus === "active" ? "Activate" : "Deactivate"}
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
