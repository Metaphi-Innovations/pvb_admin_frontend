"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  CheckCircle2, XCircle, X, User,
} from "lucide-react";
import {
  type Employee,
  loadEmployees, saveEmployees, todayStr,
} from "../employee-data";

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
  const { Input } = require("@/components/ui/input");

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
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">New Password *</label>
            <Input
              type="password"
              value={state.newPassword}
              onChange={(e: any) => onChange("newPassword", e.target.value)}
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
              onChange={(e: any) => onChange("confirmPassword", e.target.value)}
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
              onChange={(e: any) => onChange("sendEmail", e.target.checked)}
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

// ── Info Row Component ────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string | JSX.Element }) {
  return (
    <div className="flex items-start justify-between py-2.5 px-3 border-b border-border/60 last:border-b-0">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <span className="text-xs text-foreground font-medium text-right">{value}</span>
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

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleStatusToggle = () => {
    if (!employee) return;
    const newStatus = employee.status === "active" ? "inactive" : "active";
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
    setToast({ msg: `Employee ${newStatus === "active" ? "activated" : "deactivated"}`, type: "success" });
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
      msg: `Password reset successfully. Temp password: ${passwordReset.newPassword}`,
      type: "success",
    });
    setPasswordReset({ open: false, newPassword: "", confirmPassword: "", sendEmail: false, errors: {} });
  };

  if (!employee) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading employee...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 w-full">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 -ml-2"
            onClick={() => router.push("/user-management/employee")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{employee.fullName}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{employee.employeeId} • {employee.email}</p>
              </div>
              <StatusPill status={employee.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => router.push(`/user-management/employee/${employee.id}/edit`)}>
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <button
                  onClick={handleStatusToggle}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                  {employee.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={handlePasswordReset}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                  <Key className="w-3.5 h-3.5" /> Reset Password
                </button>
                <DropdownMenuSeparator />
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-sm transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Personal Details */}
          <div className="border border-border rounded-xl bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Personal Details</p>
            <div className="space-y-0">
              <InfoRow label="Full Name" value={employee.fullName} />
              <InfoRow label="Email" value={employee.email} />
              <InfoRow label="Mobile" value={employee.mobile} />
              {employee.alternativeMobile && <InfoRow label="Alt Mobile" value={employee.alternativeMobile} />}
              <InfoRow label="Blood Group" value={employee.bloodGroup} />
            </div>
          </div>

          {/* Work Details */}
          <div className="border border-border rounded-xl bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Work Details</p>
            <div className="space-y-0">
              <InfoRow label="User ID" value={<span className="font-mono text-brand-700">{employee.employeeId}</span>} />
              <InfoRow label="Department" value={employee.department} />
              <InfoRow label="Role Type" value={employee.roleType || "—"} />
              <InfoRow label="Role" value={employee.role} />
              <InfoRow label="Joining Date" value={employee.joiningDate} />
              <InfoRow label="Status" value={<StatusPill status={employee.status} />} />
            </div>
          </div>

          {/* Reporting & Geography */}
          <div className="border border-border rounded-xl bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Reporting & Geography</p>
            <div className="space-y-0">
              <InfoRow label="Reporting Manager" value={employee.reportingManager || "None"} />
              {employee.geoState && <InfoRow label="State" value={employee.geoState} />}
              {employee.geoRegion && <InfoRow label="Region" value={employee.geoRegion} />}
              {employee.geoArea && <InfoRow label="Area" value={employee.geoArea} />}
              {employee.territory && <InfoRow label="Territory" value={employee.territory} />}
              {employee.geoLocality && <InfoRow label="Locality" value={employee.geoLocality} />}
              {!employee.geoState && !employee.territory && (
                <p className="text-xs text-muted-foreground italic py-1">No geography mapping</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="border border-border rounded-xl bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Address</p>
            <div className="space-y-0">
              {employee.permanentAddress && <InfoRow label="Permanent" value={employee.permanentAddress} />}
              {employee.correspondenceAddress && <InfoRow label="Correspondence" value={employee.correspondenceAddress} />}
              {employee.relativeName && <InfoRow label="Relative" value={employee.relativeName} />}
              {!employee.permanentAddress && !employee.correspondenceAddress && (
                <p className="text-xs text-muted-foreground italic py-1">No address on record</p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border border-border rounded-xl bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Emergency Contact</p>
            <div className="space-y-0">
              <InfoRow label="Name" value={employee.emergencyContactName} />
              <InfoRow label="Mobile" value={employee.emergencyContactMobile} />
              <InfoRow label="Relation" value={employee.emergencyContactRelation} />
            </div>
          </div>

          {/* Record Info */}
          <div className="border border-border rounded-xl bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Record Info</p>
            <div className="space-y-0">
              <InfoRow label="Created By" value={employee.createdBy} />
              <InfoRow label="Created Date" value={employee.createdDate} />
              <InfoRow label="Updated By" value={employee.updatedBy} />
              <InfoRow label="Updated Date" value={employee.updatedDate} />
              {employee.remarks && <InfoRow label="Remarks" value={employee.remarks} />}
            </div>
          </div>
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
        description={`Are you sure you want to archive ${employee?.fullName}? This action can be undone.`}
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
