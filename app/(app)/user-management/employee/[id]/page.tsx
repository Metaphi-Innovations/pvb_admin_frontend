"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  RecordDetailPage,
  RecordMiniTable,
  StatusBadge,
} from "@/components/record-detail";
import { EmployeeListingStatusCell } from "../components/EmployeeListingStatusCell";
import { AuditUserRow } from "@/components/listing/ListingUserCell";
import {
  CompactField,
  CompactInfoCard,
  ProfileCardGrid,
  formatProfileDate,
} from "../components/EmployeeViewSections";
import { EmployeeDocumentsSection } from "../components/EmployeeDocumentsSection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Key,
  CheckCircle2,
  XCircle,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  FileText,
  Clock,
  Building2,
  Monitor,
  Smartphone,
  Heart,
} from "lucide-react";
import { loadGeoNodes } from "@/app/(app)/masters/geography/geo-data";
import {
  type StructuredAddress,
  formatStructuredAddress,
  structuredAddressFromLegacyIds,
  structuredAddressFromLegacyLocality,
} from "@/lib/address";
import {
  type Employee,
  todayStr,
  applyEmployeeStatusChange,
  PERMISSION_REGISTRY,
  MOBILE_PERMISSION_REGISTRY,
  migratePermissions,
  type UserPermissions,
  type WebAction,
  type MobileAction,
  type SubmodulePermission,
  type MobileFeaturePermission,
} from "../employee-data";
import { detailToEmployee } from "../user-api-data";
import { useUser, useToggleUserStatus } from "@/hooks/user-management";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayAddress(
  structured: StructuredAddress,
  legacy?: string,
): string {
  const formatted = formatStructuredAddress(structured);
  if (formatted.trim()) return formatted;
  return legacy?.trim() || "—";
}

function empCurrentAddr(emp: Employee): StructuredAddress {
  if (emp.currentPincode || emp.currentState || emp.currentCity || emp.currentTown || emp.currentCityTownLocality) {
    return structuredAddressFromLegacyLocality({
      line1: emp.currentAddressLine1 || "",
      line2: emp.currentAddressLine2 || "",
      pincode: emp.currentPincode || "",
      city: emp.currentCity,
      town: emp.currentTown,
      cityTownLocality: emp.currentCityTownLocality,
      district: emp.currentDistrict || "",
      state: emp.currentState || "",
    });
  }
  const nodes = typeof window !== "undefined" ? loadGeoNodes() : [];
  return structuredAddressFromLegacyIds(
    emp.currentAddressLine1 || "",
    emp.currentAddressLine2 || "",
    emp.currentStateId,
    emp.currentCityId,
    emp.currentPincodeId,
    nodes,
  );
}

function empPermanentAddr(emp: Employee): StructuredAddress {
  if (emp.permanentPincode || emp.permanentState || emp.permanentCity || emp.permanentTown || emp.permanentCityTownLocality) {
    return structuredAddressFromLegacyLocality({
      line1: emp.permanentAddressLine1 || "",
      line2: emp.permanentAddressLine2 || "",
      pincode: emp.permanentPincode || "",
      city: emp.permanentCity,
      town: emp.permanentTown,
      cityTownLocality: emp.permanentCityTownLocality,
      district: emp.permanentDistrict || "",
      state: emp.permanentState || "",
    });
  }
  const nodes = typeof window !== "undefined" ? loadGeoNodes() : [];
  return structuredAddressFromLegacyIds(
    emp.permanentAddressLine1 || "",
    emp.permanentAddressLine2 || "",
    emp.permanentStateId,
    emp.permanentCityId,
    emp.permanentPincodeId,
    nodes,
  );
}

function empEmergencyAddr(emp: Employee): StructuredAddress {
  if (emp.emergencyPincode || emp.emergencyState || emp.emergencyCity || emp.emergencyTown || emp.emergencyCityTownLocality) {
    return structuredAddressFromLegacyLocality({
      line1: emp.emergencyAddressLine1 || "",
      line2: emp.emergencyAddressLine2 || "",
      pincode: emp.emergencyPincode || "",
      city: emp.emergencyCity,
      town: emp.emergencyTown,
      cityTownLocality: emp.emergencyCityTownLocality,
      district: emp.emergencyDistrict || "",
      state: emp.emergencyState || "",
    });
  }
  const nodes = typeof window !== "undefined" ? loadGeoNodes() : [];
  return structuredAddressFromLegacyIds(
    emp.emergencyAddressLine1 || "",
    emp.emergencyAddressLine2 || "",
    emp.emergencyStateId,
    emp.emergencyCityId,
    emp.emergencyPincodeId,
    nodes,
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  draft: "Draft",
  archived: "Archived",
};

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                destructive
                  ? "bg-red-50 border border-red-200"
                  : "bg-amber-50 border border-amber-200",
              )}
            >
              <AlertTriangle
                className={cn("w-4 h-4", destructive ? "text-red-500" : "text-amber-500")}
              />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs font-semibold gap-1.5 text-white",
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700",
            )}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
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
  state,
  onChange,
  onReset,
  onClose,
}: {
  state: PasswordResetState;
  onChange: (key: string, value: string | boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
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
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              New Password *
            </label>
            <input
              type="password"
              value={state.newPassword}
              onChange={(e) => onChange("newPassword", e.target.value)}
              placeholder="Enter new password (min 8 chars)"
              className="w-full px-3 text-sm font-semibold border rounded-lg h-9 border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            />
            {state.errors.newPassword && (
              <p className="text-[10px] text-red-500 font-semibold">{state.errors.newPassword}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Confirm Password *
            </label>
            <input
              type="password"
              value={state.confirmPassword}
              onChange={(e) => onChange("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 text-sm font-semibold border rounded-lg h-9 border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            />
            {state.errors.confirmPassword && (
              <p className="text-[10px] text-red-500 font-semibold">{state.errors.confirmPassword}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={handleGeneratePassword}
          >
            Generate Password
          </Button>
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
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700"
            onClick={onReset}
          >
            Reset Password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Permissions (dense, section-based) ────────────────────────────────────────

function PermissionsTabContent({ permissions }: { permissions?: UserPermissions }) {
  const [channel, setChannel] = useState<"web" | "mobile">("web");
  const perms = migratePermissions(permissions);

  const getSub = (modId: string, subId: string): SubmodulePermission =>
    perms.web?.[modId]?.[subId] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
      export: false,
      import: false,
    };
  const getMob = (grpId: string, featId: string): MobileFeaturePermission =>
    perms.mobile?.[grpId]?.[featId] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
    };

  const ALL_WEB: WebAction[] = ["view", "create", "edit", "delete", "approve", "export", "import"];
  const ALL_MOB: MobileAction[] = ["view", "create", "edit", "delete", "approve"];
  const WEB_LABELS: Record<WebAction, string> = {
    view: "View",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    approve: "Approve",
    export: "Export",
    import: "Import",
  };
  const MOB_LABELS: Record<MobileAction, string> = {
    view: "View",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    approve: "Approve",
  };

  const webHasAny = PERMISSION_REGISTRY.some((mod) =>
    mod.submodules.some((sub) =>
      ALL_WEB.some((act) => sub.actions.includes(act) && (getSub(mod.id, sub.id) as any)[act]),
    ),
  );
  const mobHasAny = MOBILE_PERMISSION_REGISTRY.some((grp) =>
    grp.features.some((feat) =>
      ALL_MOB.some((act) => feat.actions.includes(act) && (getMob(grp.id, feat.id) as any)[act]),
    ),
  );

  return (
    <div className="space-y-3">
      <ProfileCardGrid>
        <CompactInfoCard title="Access Rights" icon={Shield}>
          <div className="flex flex-wrap gap-4 py-0.5">
            <div className="flex items-center gap-2 text-[13px]">
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[#6B80A0]">Web Portal</span>
              <span
                className={cn(
                  "rounded-full px-2 py-px text-[10px] font-semibold",
                  webHasAny ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground",
                )}
              >
                {webHasAny ? "Enabled" : "No access"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[#6B80A0]">Mobile App</span>
              <span
                className={cn(
                  "rounded-full px-2 py-px text-[10px] font-semibold",
                  mobHasAny ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground",
                )}
              >
                {mobHasAny ? "Enabled" : "No access"}
              </span>
            </div>
          </div>
        </CompactInfoCard>
      </ProfileCardGrid>

      <CompactInfoCard title="Permission Matrix" icon={Shield} className="col-span-full">
        <div className="flex gap-1 pb-3 mb-1 border-b border-border/60">
          {(
            [
              ["web", "Web Portal", Monitor],
              ["mobile", "Mobile App", Smartphone],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setChannel(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-7 rounded-md text-[11px] font-semibold transition-colors border",
                channel === key
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-border text-muted-foreground hover:bg-muted/40",
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {channel === "web" && (
          <div className="divide-y divide-border/50">
            {PERMISSION_REGISTRY.map((mod) => {
              const rows = mod.submodules
                .map((sub) => {
                  const sp = getSub(mod.id, sub.id);
                  const active = ALL_WEB.filter(
                    (act) => sub.actions.includes(act) && (sp as any)[act],
                  );
                  if (active.length === 0) return null;
                  return { sub, active };
                })
                .filter(Boolean) as { sub: { id: string; label: string }; active: WebAction[] }[];

              if (rows.length === 0) return null;

              return (
                <div key={mod.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-[11px] font-bold text-foreground mb-1.5">{mod.label}</p>
                  {rows.map(({ sub, active }) => (
                    <div
                      key={sub.id}
                      className="flex flex-col gap-1 py-1.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-xs text-muted-foreground min-w-[140px]">{sub.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {active.map((act) => (
                          <span
                            key={act}
                            className="inline-flex px-1.5 py-px rounded text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-100"
                          >
                            {WEB_LABELS[act]}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {!webHasAny && (
              <p className="py-4 text-xs text-center text-muted-foreground">No web portal permissions assigned.</p>
            )}
          </div>
        )}

        {channel === "mobile" && (
          <div className="divide-y divide-border/50">
            {MOBILE_PERMISSION_REGISTRY.map((grp) => {
              const rows = grp.features
                .map((feat) => {
                  const fp = getMob(grp.id, feat.id);
                  const active = ALL_MOB.filter(
                    (act) => feat.actions.includes(act) && (fp as any)[act],
                  );
                  if (active.length === 0) return null;
                  return { feat, active };
                })
                .filter(Boolean) as { feat: { id: string; label: string }; active: MobileAction[] }[];

              if (rows.length === 0) return null;

              return (
                <div key={grp.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-[11px] font-bold text-foreground mb-1.5">{grp.label}</p>
                  {rows.map(({ feat, active }) => (
                    <div
                      key={feat.id}
                      className="flex flex-col gap-1 py-1.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-xs text-muted-foreground min-w-[140px]">{feat.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {active.map((act) => (
                          <span
                            key={act}
                            className="inline-flex px-1.5 py-px rounded text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-100"
                          >
                            {MOB_LABELS[act]}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {!mobHasAny && (
              <p className="py-4 text-xs text-center text-muted-foreground">No mobile app permissions assigned.</p>
            )}
          </div>
        )}
      </CompactInfoCard>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const userQuery = useUser(userId);
  const toggleStatusMutation = useToggleUserStatus();
  const employee = useMemo(
    () => (userQuery.data ? detailToEmployee(userQuery.data) : null),
    [userQuery.data],
  );

  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmTarget, setConfirmTarget] = useState<{
    type: string;
    employee: Employee;
    nextStatus?: "active" | "inactive";
  } | null>(null);
  const [passwordReset, setPasswordReset] = useState<PasswordResetState>({
    open: false,
    newPassword: "",
    confirmPassword: "",
    sendEmail: false,
    errors: {},
  });

  useEffect(() => {
    if (!userQuery.isError) return;
    setToast({ msg: getErrorMessage(userQuery.error, "User not found"), type: "error" });
    const timer = setTimeout(() => router.push("/user-management/employee"), 1500);
    return () => clearTimeout(timer);
  }, [userQuery.isError, userQuery.error, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const confirmStatusChange = () => {
    if (!employee || !confirmTarget || !employee.userUuid) return;
    if (!confirmTarget.nextStatus) return;
    const nextActive = confirmTarget.nextStatus === "active";

    toggleStatusMutation.mutate(
      { id: employee.userUuid, active: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: `User ${nextActive ? "activated" : "deactivated"} successfully`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update user status."),
            type: "error",
          });
        },
        onSettled: () => setConfirmTarget(null),
      },
    );
  };

  const confirmDelete = () => {
    if (!employee || !confirmTarget) return;
    setToast({ msg: "Archive is not available via API yet.", type: "error" });
    setConfirmTarget(null);
  };

  const confirmPasswordReset = () => {
    if (!employee) return;
    const errors: { newPassword?: string; confirmPassword?: string } = {};
    if (!passwordReset.newPassword.trim()) errors.newPassword = "Password is required";
    else if (passwordReset.newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters";
    if (!passwordReset.confirmPassword) errors.confirmPassword = "Please confirm password";
    else if (passwordReset.newPassword !== passwordReset.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (Object.keys(errors).length > 0) {
      setPasswordReset((prev) => ({ ...prev, errors }));
      return;
    }
    setToast({ msg: "Password reset successfully.", type: "success" });
    setPasswordReset({ open: false, newPassword: "", confirmPassword: "", sendEmail: false, errors: {} });
  };

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground text-sm">Loading user…</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <RecordDetailPage
        listHref="/user-management/employee"
        listLabel="Employees"
        recordName="Employee Details"
        statusLabel="Loading"
        statusVariant="neutral"
        tabs={[{ value: "overview", label: "Overview" }]}
        activeTab="overview"
        onTabChange={() => {}}
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Loading employee…</p>
        </div>
      </RecordDetailPage>
    );
  }

  const statusVariant =
    employee.status === "active"
      ? "active"
      : employee.status === "draft"
        ? "draft"
        : employee.status === "archived"
          ? "blocked"
          : "inactive";

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "employment", label: "Employment" },
    { value: "permissions", label: "Permissions" },
    { value: "documents", label: "Documents" },
    { value: "activity", label: "Activity Log" },
  ];

  const designation = employee.designation || employee.role;
  const currentAddress = displayAddress(empCurrentAddr(employee), employee.currentAddress || employee.address);
  const permanentAddress = displayAddress(empPermanentAddr(employee), employee.permanentAddress);
  const emergencyAddress = displayAddress(
    empEmergencyAddr(employee),
    employee.emergencyContactAddress,
  );

  const geoRows =
    employee.geoMappings && employee.geoMappings.length > 0
      ? employee.geoMappings
      : employee.geoZone || employee.geoRegion || employee.territory
        ? [
            {
              geoZone: employee.geoZone,
              geoRegion: employee.geoRegion,
              geoArea: employee.geoArea,
              territory: employee.territory,
              geoTown: employee.geoTown || employee.geoLocality,
            },
          ]
        : [];

  const auditTrail = [
    {
      id: "created",
      date: employee.createdDate,
      text: `Record created by ${employee.createdBy}`,
    },
    ...(employee.updatedDate !== employee.createdDate
      ? [{ id: "updated", date: employee.updatedDate, text: `Record updated by ${employee.updatedBy}` }]
      : []),
    ...(employee.activityLog || []).map((entry) => ({
      id: entry.id,
      date: entry.date,
      text: entry.text,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const handleStatusToggleRequest = (nextStatus: "active" | "inactive") => {
    setConfirmTarget({ type: "status", employee, nextStatus });
  };

  const handleActivateBlocked = (gaps: string[]) => {
    setToast({ msg: gaps[0] || "Complete required profile data before activation", type: "error" });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <ProfileCardGrid>
            <CompactInfoCard title="Personal Information" icon={User}>
              <CompactField label="First Name" value={employee.firstName} />
              <CompactField label="Last Name" value={employee.lastName} />
              <CompactField label="Gender" value={employee.gender} />
              <CompactField label="DOB" value={formatProfileDate(employee.dob)} mono />
              <CompactField label="Blood Group" value={employee.bloodGroup} />
            </CompactInfoCard>

            <CompactInfoCard title="Contact Information" icon={Mail}>
              <CompactField
                label="Mobile"
                value={
                  employee.mobile
                    ? `${employee.countryCode || "+91"} ${employee.mobile}`
                    : undefined
                }
                mono
              />
              <CompactField label="Alt. Mobile" value={employee.alternativeMobile} mono />
              <CompactField label="Email" value={employee.email} />
            </CompactInfoCard>

            <CompactInfoCard title="Address Information" icon={MapPin}>
              <CompactField label="Current" value={currentAddress} />
              <CompactField label="Permanent" value={permanentAddress} />
            </CompactInfoCard>

            <CompactInfoCard title="Emergency Contact" icon={Heart}>
              <CompactField label="Name" value={employee.emergencyContactName} />
              <CompactField label="Relationship" value={employee.emergencyContactRelation} />
              <CompactField label="Mobile" value={employee.emergencyContactMobile} mono />
              <CompactField label="Address" value={emergencyAddress} />
            </CompactInfoCard>
          </ProfileCardGrid>
        );

      case "employment":
        return (
          <div className="space-y-3">
            <ProfileCardGrid>
              <CompactInfoCard title="Employment Details" icon={Briefcase}>
                <CompactField label="Employee ID" value={employee.employeeId} mono />
                <CompactField label="Department" value={employee.department} />
                <CompactField label="Designation" value={designation} />
                <CompactField label="Role" value={employee.role} />
                <CompactField label="Manager" value={employee.reportingManager || "—"} />
                <CompactField label="Joining Date" value={formatProfileDate(employee.joiningDate)} mono />
                <CompactField label="Employment Type" value={employee.employeeType} />
                <CompactField label="Status" value={<StatusBadge status={employee.status} />} />
              </CompactInfoCard>

              {(employee.roleType || employee.salesType) && (
                <CompactInfoCard title="Assigned Roles" icon={Shield}>
                  <CompactField label="Role Type" value={employee.roleType} />
                  <CompactField label="System Role" value={employee.role} />
                  {employee.salesType && (
                    <CompactField label="Sales Type" value={employee.salesType} />
                  )}
                  <CompactField label="Department" value={employee.department} />
                </CompactInfoCard>
              )}
            </ProfileCardGrid>

            {geoRows.length > 0 && (
              <CompactInfoCard title="Geography & Territory" icon={MapPin}>
                <RecordMiniTable
                  columns={[
                    { key: "zone", header: "Zone", render: (r) => r.geoZone || "—" },
                    { key: "region", header: "Region", render: (r) => r.geoRegion || "—" },
                    { key: "area", header: "Area", render: (r) => r.geoArea || "—" },
                    { key: "territory", header: "Territory", render: (r) => r.territory || "—" },
                    {
                      key: "town",
                      header: "Town",
                      render: (r) => r.geoTown || r.geoLocality || "—",
                    },
                  ]}
                  rows={geoRows}
                />
              </CompactInfoCard>
            )}

            {(employee.approvalLevel1Id || employee.approvalLevel2Id || employee.approvalLevel3Id) && (
              <ProfileCardGrid>
                {employee.approvalLevel1Id && (
                  <CompactInfoCard title="Level 1 Approver" icon={Shield}>
                    <CompactField label="Name" value={employee.approvalLevel1Name} />
                    <CompactField label="Role" value={employee.approvalLevel1Role} />
                  </CompactInfoCard>
                )}
                {employee.approvalLevel2Id && (
                  <CompactInfoCard title="Level 2 Approver" icon={Shield}>
                    <CompactField label="Name" value={employee.approvalLevel2Name} />
                    <CompactField label="Role" value={employee.approvalLevel2Role} />
                  </CompactInfoCard>
                )}
                {employee.approvalLevel3Id && (
                  <CompactInfoCard title="Level 3 Approver" icon={Shield}>
                    <CompactField label="Name" value={employee.approvalLevel3Name} />
                    <CompactField label="Role" value={employee.approvalLevel3Role} />
                  </CompactInfoCard>
                )}
              </ProfileCardGrid>
            )}
          </div>
        );

      case "permissions":
        return (
          <div className="space-y-3">
            <ProfileCardGrid>
              <CompactInfoCard title="Assigned Roles" icon={Shield}>
                <CompactField label="Role Type" value={employee.roleType} />
                <CompactField label="System Role" value={employee.role} />
                <CompactField label="Department" value={employee.department} />
              </CompactInfoCard>
            </ProfileCardGrid>
            <PermissionsTabContent permissions={employee.permissions} />
          </div>
        );

      case "documents":
        return (
          <EmployeeDocumentsSection
            readOnly
            documents={employee.documents || []}
          />
        );

      case "activity":
        return (
          <div className="space-y-3">
            <ProfileCardGrid>
              <CompactInfoCard title="Record Audit" icon={Clock}>
                <div className="space-y-2 py-0.5">
                  <AuditUserRow label="Created By" name={employee.createdBy} />
                  <CompactField label="Created Date" value={employee.createdDate} mono />
                  <AuditUserRow label="Updated By" name={employee.updatedBy} />
                  <CompactField label="Updated Date" value={employee.updatedDate} mono />
                </div>
              </CompactInfoCard>

              <CompactInfoCard title="Status History" icon={Clock}>
                <CompactField
                  label="Current Status"
                  value={<StatusBadge status={employee.status} />}
                />
                <CompactField label="Last Changed" value={employee.lastStatusChange} mono />
              </CompactInfoCard>
            </ProfileCardGrid>

            <CompactInfoCard title="Audit Trail" icon={Clock}>
              {auditTrail.length === 0 ? (
                <p className="py-2 text-[12px] text-center text-muted-foreground">
                  No audit events recorded.
                </p>
              ) : (
                auditTrail.map((entry) => (
                  <CompactField key={entry.id} label={entry.date} value={entry.text} mono />
                ))
              )}
            </CompactInfoCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <RecordDetailPage
        listHref="/user-management/employee"
        listLabel="Employees"
        recordName={employee.fullName}
        recordCode={employee.employeeId}
        headerVariant="profile"
        statusLabel={STATUS_LABEL[employee.status] ?? employee.status}
        statusVariant={statusVariant}
        metaItems={[
          { icon: Building2, label: employee.department || "—" },
          { icon: Briefcase, label: employee.role || designation },
        ]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEdit={() => router.push(`/user-management/employee/${employee.userUuid || userId}/edit`)}
        headerActions={
          employee.status === "active" || employee.status === "inactive" || employee.status === "draft" ? (
            <EmployeeListingStatusCell
              status={employee.status}
              employee={employee}
              onToggleRequest={handleStatusToggleRequest}
              onActivateBlocked={handleActivateBlocked}
            />
          ) : undefined
        }
        moreActions={[
          { label: "Reset Password", onClick: () => setPasswordReset({ open: true, newPassword: "", confirmPassword: "", sendEmail: false, errors: {} }) },
          { label: "Archive User", onClick: () => setConfirmTarget({ type: "delete", employee }), destructive: true },
        ]}
      >
        {renderTabContent()}
      </RecordDetailPage>

      <ConfirmDialog
        open={confirmTarget?.type === "status"}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmStatusChange}
        title={confirmTarget?.nextStatus === "active" ? "Activate User" : "Deactivate User"}
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
        title="Archive User"
        description={`Are you sure you want to archive ${employee.fullName}? Their status will be set to Archived.`}
        confirmLabel="Archive"
        destructive
      />

      <PasswordResetModal
        state={passwordReset}
        onChange={(key, value) => setPasswordReset((prev) => ({ ...prev, [key]: value, errors: {} }))}
        onReset={confirmPasswordReset}
        onClose={() => setPasswordReset((prev) => ({ ...prev, open: false }))}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
