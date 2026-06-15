"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle, ArrowLeft, Edit2, Key, Trash2, MoreVertical,
  CheckCircle2, XCircle, X, User, Info, Building2, ShieldAlert,
  MapPin, UserCheck, Check, HelpCircle, Monitor, Smartphone, ChevronDown
} from "lucide-react";
import {
  type Employee,
  loadEmployees, saveEmployees, todayStr,
  PERMISSION_REGISTRY, MOBILE_PERMISSION_REGISTRY,
  migratePermissions,
  type UserPermissions, type WebAction, type MobileAction,
  type SubmodulePermission, type MobileFeaturePermission
} from "../employee-data";

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active:   { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100 border-slate-200",  text: "text-slate-600",   dot: "bg-slate-400",   label: "Inactive" },
  draft:    { bg: "bg-blue-50 border-blue-200",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Draft" },
  archived: { bg: "bg-red-50 border-red-200",     text: "text-red-700",     dot: "bg-red-400",     label: "Archived" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
      cfg.bg, cfg.text
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ── Detail Field Row ─────────────────────────────────────────────────────────
function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  const displayVal =
    value !== undefined && value !== null && value !== "" ? value : "—";
  return (
    <div className='py-2 space-y-1 border-b border-border/50 last:border-0'>
      <span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
        {label}
      </span>
      <div
        className={cn(
          "text-xs font-semibold text-foreground break-all",
          mono && "font-mono"
        )}
      >
        {displayVal}
      </div>
    </div>
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
  open, onClose, onConfirm, title, description, confirmLabel = "Confirm", destructive,
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
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs font-semibold gap-1.5 text-white",
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700")}
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
  const [showPwd, setShowPwd] = useState(false);
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
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
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Key className="w-4 h-4 text-brand-600" />
            Reset Password
          </DialogTitle>
        </DialogHeader>
        <div className="pt-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">New Password *</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={state.newPassword}
                onChange={(e) => onChange("newPassword", e.target.value)}
                placeholder="Enter new password (min 8 chars)"
                className="w-full px-3 text-sm font-semibold border rounded-lg h-9 border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
              />
            </div>
            {state.errors.newPassword && (
              <p className="text-[10px] text-red-500 font-semibold">{state.errors.newPassword}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password *</label>
            <input
              type={showPwd ? "text" : "password"}
              value={state.confirmPassword}
              onChange={(e) => onChange("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 text-sm font-semibold border rounded-lg h-9 border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            />
            {state.errors.confirmPassword && (
              <p className="text-[10px] text-red-500 font-semibold">{state.errors.confirmPassword}</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={handleGeneratePassword}>
              Generate Password
            </Button>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPwd}
                onChange={(e) => setShowPwd(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Show</span>
            </label>
          </div>
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={state.sendEmail}
              onChange={(e) => onChange("sendEmail", e.target.checked)}
              className="w-4 h-4 border-gray-300 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-semibold text-foreground">Send password to employee email</span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="h-8 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700"
            onClick={onReset}>
            Reset Password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Read-only Permissions Breakdown Component ─────────────────────────────────
function ReadOnlyPermissionsView({ permissions }: { permissions?: UserPermissions }) {
  const [section, setSection] = useState<"web" | "mobile">("web");
  const perms = migratePermissions(permissions);

  const getSub = (modId: string, subId: string): SubmodulePermission =>
    perms.web?.[modId]?.[subId] || { view: false, create: false, edit: false, delete: false, approve: false, export: false, import: false };
  const getMob = (grpId: string, featId: string): MobileFeaturePermission =>
    perms.mobile?.[grpId]?.[featId] || { view: false, create: false, edit: false, delete: false, approve: false };

  const ALL_WEB_ACTIONS: WebAction[] = ["view", "create", "edit", "delete", "approve", "export", "import"];
  const ALL_MOBILE_ACTIONS: MobileAction[] = ["view", "create", "edit", "delete", "approve"];
  const WEB_ACTION_LABELS: Record<WebAction, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete", approve: "Approve", export: "Export", import: "Import" };
  const MOBILE_ACTION_LABELS: Record<MobileAction, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete", approve: "Approve" };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 pb-3 border-b border-border">
        {([ ["web", "Web Portal"], ["mobile", "Mobile App"] ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSection(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-colors border",
              section === key ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted/40",
            )}>
            {key === "web" ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {section === "web" && (
        <div className="space-y-3">
          {PERMISSION_REGISTRY.map((mod) => {
            const hasAny = mod.submodules.some((sub) => {
              const sp = getSub(mod.id, sub.id);
              return ALL_WEB_ACTIONS.some((act) => sub.actions.includes(act) && (sp as any)[act]);
            });

            if (!hasAny) return null;

            return (
              <div key={mod.id} className="p-4 overflow-hidden bg-white border shadow-sm border-border rounded-xl">
                <h4 className="flex items-center gap-2 mb-3 text-xs font-bold text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  {mod.label}
                </h4>
                <div className="space-y-2">
                  {mod.submodules.map((sub) => {
                    const sp = getSub(mod.id, sub.id);
                    const activeActions = ALL_WEB_ACTIONS.filter((act) => sub.actions.includes(act) && (sp as any)[act]);
                    if (activeActions.length === 0) return null;

                    return (
                      <div key={sub.id} className="flex flex-col gap-1.5 py-2 border-b border-border/50 last:border-0 sm:flex-row sm:items-center justify-between">
                        <span className="text-xs font-semibold text-foreground min-w-[150px]">{sub.label}</span>
                        <div className="flex flex-wrap gap-1">
                          {activeActions.map((act) => (
                            <span key={act} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-100">
                              {WEB_ACTION_LABELS[act]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!PERMISSION_REGISTRY.some((mod) => mod.submodules.some((sub) => ALL_WEB_ACTIONS.some((act) => sub.actions.includes(act) && (getSub(mod.id, sub.id) as any)[act]))) && (
            <div className="p-8 text-xs font-medium text-center bg-white border text-muted-foreground rounded-xl">
              No Web Portal permissions granted.
            </div>
          )}
        </div>
      )}

      {section === "mobile" && (
        <div className="space-y-3">
          {MOBILE_PERMISSION_REGISTRY.map((grp) => {
            const hasAny = grp.features.some((feat) => {
              const fp = getMob(grp.id, feat.id);
              return ALL_MOBILE_ACTIONS.some((act) => feat.actions.includes(act) && (fp as any)[act]);
            });

            if (!hasAny) return null;

            return (
              <div key={grp.id} className="p-4 overflow-hidden bg-white border shadow-sm border-border rounded-xl">
                <h4 className="flex items-center gap-2 mb-3 text-xs font-bold text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  {grp.label}
                </h4>
                <div className="space-y-2">
                  {grp.features.map((feat) => {
                    const fp = getMob(grp.id, feat.id);
                    const activeActions = ALL_MOBILE_ACTIONS.filter((act) => feat.actions.includes(act) && (fp as any)[act]);
                    if (activeActions.length === 0) return null;

                    return (
                      <div key={feat.id} className="flex flex-col gap-1.5 py-2 border-b border-border/50 last:border-0 sm:flex-row sm:items-center justify-between">
                        <span className="text-xs font-semibold text-foreground min-w-[150px]">{feat.label}</span>
                        <div className="flex flex-wrap gap-1">
                          {activeActions.map((act) => (
                            <span key={act} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-100">
                              {MOBILE_ACTION_LABELS[act]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!MOBILE_PERMISSION_REGISTRY.some((grp) => grp.features.some((feat) => ALL_MOBILE_ACTIONS.some((act) => feat.actions.includes(act) && (getMob(grp.id, feat.id) as any)[act]))) && (
            <div className="p-8 text-xs font-medium text-center bg-white border text-muted-foreground rounded-xl">
              No Mobile App permissions granted.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = parseInt(params.id as string, 10);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [confirmTarget, setConfirmTarget] = useState<{ type: string; employee: Employee } | null>(null);
  const [passwordReset, setPasswordReset] = useState<PasswordResetState>({
    open: false,
    newPassword: "",
    confirmPassword: "",
    sendEmail: false,
    errors: {},
  });

  useEffect(() => {
    const employees = loadEmployees();
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      setEmployee(emp);
    } else {
      setToast({ msg: "User not found", type: "error" });
      setTimeout(() => router.push("/user-management/employee"), 1500);
    }
  }, [employeeId, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleStatusToggle = () => {
    if (!employee) return;
    setConfirmTarget({ type: "status", employee });
  };

  const confirmStatusChange = () => {
    if (!employee || !confirmTarget) return;
    const newStatus = employee.status === "active" ? "inactive" : "active";
    const employees = loadEmployees();
    const updated = employees.map(e =>
      e.id === employee.id
        ? { ...e, status: newStatus as any, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() }
        : e
    );
    saveEmployees(updated);
    setEmployee(updated.find(e => e.id === employee.id) || null);
    setToast({ msg: `User ${newStatus === "active" ? "activated" : "deactivated"}`, type: "success" });
    setConfirmTarget(null);
  };

  const handleDelete = () => {
    if (!employee) return;
    setConfirmTarget({ type: "delete", employee });
  };

  const confirmDelete = () => {
    if (!employee || !confirmTarget) return;
    const employees = loadEmployees();
    const updated = employees.map(e =>
      e.id === employee.id
        ? { ...e, status: "archived" as const, updatedBy: "Admin", updatedDate: todayStr() }
        : e
    );
    saveEmployees(updated);
    setToast({ msg: "User archived", type: "success" });
    setTimeout(() => router.push("/user-management/employee"), 1500);
    setConfirmTarget(null);
  };

  const handlePasswordReset = () => {
    setPasswordReset({
      open: true,
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
    if (!employee) return;
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
      msg: `Password reset successfully.`,
      type: "success",
    });
    setPasswordReset({ open: false, newPassword: "", confirmPassword: "", sendEmail: false, errors: {} });
  };

  if (!employee) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-sm font-semibold text-muted-foreground">Loading user...</p>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "role_dept", label: "Role & Department", icon: Building2 },
    { id: "permissions", label: "Permissions & Access", icon: UserCheck },
  ];

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* ── HEADER SECTION ── */}
        <div className="flex flex-col gap-4 pb-5 border-b sm:flex-row sm:items-center sm:justify-between border-border/80">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-lg hover:bg-muted border-border"
              onClick={() => router.push("/user-management/employee")}>
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Button>
            <h1 className="text-base font-bold text-foreground">User Details</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
              onClick={handleStatusToggle}>
              {employee.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-2.5">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <button
                  onClick={handlePasswordReset}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors text-left font-medium">
                  <Key className="w-3.5 h-3.5 text-muted-foreground" /> Reset Password
                </button>
                <DropdownMenuSeparator />
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-650 hover:bg-red-50 rounded-sm transition-colors text-left font-semibold">
                  <Trash2 className="w-3.5 h-3.5" /> Delete User
                </button>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href={`/user-management/employee/${employee.id}/edit`}>
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg shadow-sm">
                <Edit2 className="w-3.5 h-3.5" /> Edit User
              </Button>
            </Link>
          </div>
        </div>

        {/* ── TOP SUMMARY CARD & KPI BLOCKS ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Profile Summary Card */}
          <div className="flex flex-col justify-between p-5 bg-white border shadow-sm lg:col-span-2 rounded-xl border-border">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 text-lg font-bold border rounded-full bg-brand-50 border-brand-100 text-brand-600">
                {employee.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    {employee.fullName}
                  </h2>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                    {employee.employeeId}
                  </span>
                  <StatusBadge status={employee.status} />
                </div>
                <div className="flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Role:</span>
                    {employee.role || "—"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Email:</span>
                    {employee.email || "—"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Mobile:</span>
                    {employee.mobile ? `${employee.countryCode || "+91"} ${employee.mobile}` : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Department:</span>
                    {employee.department || "—"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Type:</span>
                    {employee.employeeType || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Compact KPI blocks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Role Type
              </p>
              <p className="mt-1 text-xs font-bold truncate text-foreground">
                {employee.roleType || "—"}
              </p>
            </div>

            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Department
              </p>
              <p className="mt-1 text-xs font-bold truncate text-foreground">
                {employee.department || "—"}
              </p>
            </div>

            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Joined Date
              </p>
              <p className="mt-1 text-xs font-bold truncate text-foreground">
                {employee.joiningDate || "—"}
              </p>
            </div>

            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Manager
              </p>
              <p className="mt-1 text-xs font-bold truncate text-foreground">
                {employee.reportingManager || "None"}
              </p>
            </div>
          </div>
        </div>

        {/* ── UNDERLINE TAB NAVIGATION ── */}
        <div className="border-b border-border">
          <div className="flex gap-6">
            {tabs.map((t) => {
              const active = activeSubTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={cn(
                    "pb-3 text-xs font-semibold border-b-2 transition-colors focus:outline-none flex items-center gap-1.5",
                    active
                      ? "border-brand-600 text-brand-600 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setActiveSubTab(t.id)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="w-full">
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === "overview" && (
            <div className="space-y-5">
              <div className="p-6 space-y-6 bg-white border shadow-sm rounded-xl border-border">
                {/* Section 1: Personal Information */}
                <div className="space-y-3">
                  <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    <DetailField label="First Name" value={employee.firstName} />
                    <DetailField label="Last Name" value={employee.lastName} />
                    <DetailField label="Full Name" value={employee.fullName} />
                    <DetailField label="Gender" value={employee.gender} />
                    <DetailField label="DOB" value={employee.dob} />
                    <DetailField label="Blood Group" value={employee.bloodGroup} />
                  </div>
                </div>

                {/* Section 2: Contact Details */}
                <div className="pt-2 space-y-3">
                  <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                    Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    <DetailField label="Mobile Number" value={employee.mobile ? `${employee.countryCode || "+91"} ${employee.mobile}` : "—"} mono />
                    {/* <DetailField label="Alternative Mobile" value={employee.alternativeMobile} mono /> */}
                    <DetailField label="Email Address" value={employee.email} />
                    <DetailField label="Current Address" value={employee.currentAddress || employee.address} />
                    <DetailField label="Permanent Address" value={employee.permanentAddress} />
                  </div>
                </div>

                {/* Section 3: Account Details */}
                <div className="pt-2 space-y-3">
                  <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    <DetailField label="Username / Login ID" value={employee.employeeId} mono />
                    <DetailField label="Status" value={<StatusBadge status={employee.status} />} />
                    <DetailField label="Created Date" value={employee.createdDate} />
                    <DetailField label="Created By" value={employee.createdBy} />
                    <DetailField label="Updated Date" value={employee.updatedDate} />
                    <DetailField label="Updated By" value={employee.updatedBy} />
                    <DetailField label="Last Status Change" value={employee.lastStatusChange} />
                    {employee.remarks && <DetailField label="Remarks" value={employee.remarks} />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROLE & DEPARTMENT */}
          {activeSubTab === "role_dept" && (
            <div className="space-y-5">
              <div className="p-6 space-y-6 bg-white border shadow-sm rounded-xl border-border">
                {/* Section 1: Role & Department Details */}
                <div className="space-y-3">
                  <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                    Role & Department Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    <DetailField label="Role Type" value={employee.roleType} />
                    <DetailField label="Role" value={employee.role} />
                    <DetailField label="Department" value={employee.department} />
                    <DetailField label="Designation" value={employee.designation || employee.role} />
                    <DetailField label="Employee Type" value={employee.employeeType} />
                    {employee.salesType && <DetailField label="Sales Type" value={employee.salesType} />}
                    <DetailField label="Joining Date" value={employee.joiningDate} />
                    <DetailField label="Reporting Manager" value={employee.reportingManager || "None"} />
                  </div>
                </div>

                {/* Section 2: Geography Mappings */}
                <div className="pt-2 space-y-3">
                  <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                    Geography Mappings
                  </h3>
                  {employee.geoZone || employee.geoRegion || employee.geoArea || employee.territory || employee.geoLocality || (employee.geoMappings && employee.geoMappings.length > 0) ? (
                    <div className="overflow-x-auto bg-white border rounded-lg border-border">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="font-semibold border-b border-border bg-slate-50 text-muted-foreground">
                            <th className="px-4 py-2">Zone</th>
                            <th className="px-4 py-2">Region</th>
                            <th className="px-4 py-2">Area</th>
                            <th className="px-4 py-2">Territory</th>
                            <th className="px-4 py-2">Locality</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employee.geoMappings && employee.geoMappings.length > 0 ? (
                            employee.geoMappings.map((geo, idx) => (
                              <tr key={idx} className="font-medium border-b border-border/60 last:border-0 hover:bg-slate-50/50">
                                <td className="px-4 py-2">{geo.geoZone || "—"}</td>
                                <td className="px-4 py-2">{geo.geoRegion || "—"}</td>
                                <td className="px-4 py-2">{geo.geoArea || "—"}</td>
                                <td className="px-4 py-2">{geo.territory || "—"}</td>
                                <td className="px-4 py-2">{geo.geoLocality || "—"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr className="font-medium border-b border-border/60 last:border-0">
                              <td className="px-4 py-2">{employee.geoZone || "—"}</td>
                              <td className="px-4 py-2">{employee.geoRegion || "—"}</td>
                              <td className="px-4 py-2">{employee.geoArea || "—"}</td>
                              <td className="px-4 py-2">{employee.territory || "—"}</td>
                              <td className="px-4 py-2">{employee.geoLocality || "—"}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="pl-1 text-xs italic text-muted-foreground">No geography mapping assigned to this user.</p>
                  )}
                </div>

                {/* Section 3: Emergency Contact Details */}
                <div className="pt-2 space-y-3">
                  <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                    Emergency Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    <DetailField label="Contact Name" value={employee.emergencyContactName} />
                    <DetailField label="Mobile Number" value={employee.emergencyContactMobile} mono />
                    <DetailField label="Relation" value={employee.emergencyContactRelation} />
                    {employee.emergencyContactAddress && <DetailField label="Address" value={employee.emergencyContactAddress} />}
                  </div>
                </div>

                {/* Section 4: Approval Chain Details */}
                {(employee.approvalLevel1Id || employee.approvalLevel2Id || employee.approvalLevel3Id) && (
                  <div className="pt-2 space-y-3">
                    <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                      Approval Chain Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {employee.approvalLevel1Id && (
                        <div className="p-3.5 border border-border rounded-xl bg-slate-50/50 space-y-1">
                          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Level 1 Approver</span>
                          <p className="text-xs font-bold text-foreground">{employee.approvalLevel1Name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{employee.approvalLevel1Role}</p>
                        </div>
                      )}
                      {employee.approvalLevel2Id && (
                        <div className="p-3.5 border border-border rounded-xl bg-slate-50/50 space-y-1">
                          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Level 2 Approver</span>
                          <p className="text-xs font-bold text-foreground">{employee.approvalLevel2Name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{employee.approvalLevel2Role}</p>
                        </div>
                      )}
                      {employee.approvalLevel3Id && (
                        <div className="p-3.5 border border-border rounded-xl bg-slate-50/50 space-y-1">
                          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Level 3 Approver</span>
                          <p className="text-xs font-bold text-foreground">{employee.approvalLevel3Name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{employee.approvalLevel3Role}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PERMISSIONS & ACCESS */}
          {activeSubTab === "permissions" && (
            <div className="p-6 bg-white border shadow-sm rounded-xl border-border">
              <ReadOnlyPermissionsView permissions={employee.permissions} />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmTarget?.type === "status"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmStatusChange}
        title={employee?.status === "active" ? "Deactivate User" : "Activate User"}
        description={`Are you sure you want to ${employee?.status === "active" ? "deactivate" : "activate"} ${employee?.fullName}?`}
        confirmLabel={employee?.status === "active" ? "Deactivate" : "Activate"}
      />

      <ConfirmDialog
        open={confirmTarget?.type === "delete"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
        title="Archive User"
        description={`Are you sure you want to archive ${employee?.fullName}? This action will change their status to Archived.`}
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
