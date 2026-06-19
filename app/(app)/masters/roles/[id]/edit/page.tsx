"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Save, AlertCircle, Shield, Globe,
  Plus, Trash2, ChevronUp, ChevronDown as ChevronDn,
  Info, Search, Calendar, Clock, Lock,
  CheckCircle2, X, AlertTriangle, Users,
} from "lucide-react";
import {
  type Role, type GeoLevel, type ApprovalStep,
  GEO_LEVEL_LABEL,
  loadRoles, saveRoles, todayStr, makeUid,
  getValidApproverRoles, requiresApprovalChain, MOCK_USER_COUNTS,
} from "../../roles-data";

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: "success" | "error" | "warning" }
function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const bg = toast.type === "success" ? "bg-emerald-600"
    : toast.type === "warning" ? "bg-amber-500" : "bg-red-600";
  return (
    <div className={cn(
      "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium max-w-xs",
      "animate-in slide-in-from-top-2 fade-in-0 duration-300", bg,
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{toast.msg}</span>
      <button onClick={onDismiss}><X className="w-3.5 h-3.5 opacity-70 hover:opacity-100" /></button>
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
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs gap-1.5",
              destructive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white"
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

// ── Geo Level badge ───────────────────────────────────────────────────────────
const GEO_BADGE_CFG: Record<GeoLevel, { bg: string; text: string }> = {
  Country:   { bg: "bg-blue-100",   text: "text-blue-700"   },
  Zone:      { bg: "bg-indigo-100", text: "text-indigo-700" },
  State:     { bg: "bg-teal-100",   text: "text-teal-700"   },
  Region:    { bg: "bg-purple-100", text: "text-purple-700" },
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
    <span className={cn("inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>
      {level === "None" ? "Functional" : level}
    </span>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon, iconBg = "bg-brand-50 border-brand-100", iconColor = "text-brand-600",
  title, subtitle, children,
}: {
  icon: React.ElementType; iconBg?: string; iconColor?: string;
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Add Step Popover ──────────────────────────────────────────────────────────
function AddStepPopover({
  allRoles, currentGeoLevel, currentRoleId, onAdd,
}: {
  allRoles: Role[]; currentGeoLevel: GeoLevel;
  currentRoleId: number;
  onAdd: (step: Omit<ApprovalStep, "uid">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const validRoles = useMemo(
    () => getValidApproverRoles(allRoles, currentGeoLevel, currentRoleId),
    [allRoles, currentGeoLevel, currentRoleId],
  );
  const filtered = search.trim()
    ? validRoles.filter(r => r.roleName.toLowerCase().includes(search.toLowerCase()))
    : validRoles;

  const canAdd = currentGeoLevel !== "None" && currentGeoLevel !== "Country";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={!canAdd}>
          <Plus className="w-3 h-3" /> Add Approval Step
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-xs font-semibold text-foreground mb-2">Select Approver Role</p>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search roles…" value={search}
              onChange={e => setSearch(e.target.value)} className="h-8 text-xs pl-8" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Showing roles at levels higher than <strong>{currentGeoLevel}</strong>
          </p>
        </div>
        <div className="max-h-[220px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              {validRoles.length === 0
                ? "No roles exist at a higher level"
                : "No roles match your search"}
            </p>
          ) : (
            filtered.map(role => (
              <button
                key={role.id}
                onClick={() => { onAdd({ roleId: role.id, roleName: role.roleName }); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-3 h-3 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{role.roleName}</p>
                  <GeoLevelBadge level={role.geoLevel} />
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EditRoleMasterPage() {
  const router = useRouter();
  const params = useParams();
  const roleId = Number(params.id);

  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const showToast = (msg: string, type: ToastState["type"] = "success") =>
    setToast({ msg, type });

  useEffect(() => {
    const roles = loadRoles();
    setAllRoles(roles);
    const found = roles.find(r => r.id === roleId) ?? roles[0];
    setRole(found);
    setDescription(found.description);
    setApprovalChain(found.approvalChain.map(s => ({ ...s })));
    setStatus(found.status);
  }, [roleId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Editable fields
  const [description, setDescription]     = useState("");
  const [approvalChain, setApprovalChain] = useState<ApprovalStep[]>([]);
  const [status, setStatus]               = useState<"active" | "inactive">("active");
  const [errors, setErrors]               = useState<Record<string, string>>({});

  if (!role) return null;

  const userCount   = MOCK_USER_COUNTS[role.id] ?? 0;
  const showChain   = role.geoLevel !== "None";

  // Approval chain actions
  const addStep = (step: Omit<ApprovalStep, "uid">) =>
    setApprovalChain(prev => [...prev, { ...step, uid: makeUid() }]);

  const removeStep = (idx: number) => {
    if (approvalChain.length === 1 && requiresApprovalChain(role.geoLevel)) {
      showToast("At least one approver is required for this role.", "error");
      return;
    }
    setApprovalChain(prev => prev.filter((_, i) => i !== idx));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setApprovalChain(prev => {
      const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === approvalChain.length - 1) return;
    setApprovalChain(prev => {
      const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n;
    });
  };

  // Validation
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (requiresApprovalChain(role.geoLevel) && approvalChain.length === 0)
      e.approvalChain = "At least one approval step is required for this level";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    // If toggling to inactive with users, require confirmation
    if (status === "inactive" && role.status === "active" && userCount > 0) {
      setConfirmDeactivate(true);
      return;
    }
    doSave();
  };

  const doSave = () => {
    if (!validate()) {
      showToast("Please fix the errors before saving.", "error");
      return;
    }
    const updated = allRoles.map(r =>
      r.id === role.id
        ? { ...r, description, approvalChain, status, updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    );
    saveRoles(updated);
    showToast(`"${role.roleName}" updated successfully.`);
    // Navigate back after brief delay
    setTimeout(() => router.push("/masters/roles"), 1200);
  };

  return (
    <AppLayout noPadding>
      <div className="flex flex-col h-full">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => router.push("/masters/roles")}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
              <span>Masters</span><span>/</span>
              <span>Roles</span><span>/</span>
              <span className="text-foreground font-medium">Edit Role</span>
            </div>
            <h2 className="text-sm font-semibold text-foreground leading-none">
              Edit — {role.roleName}
            </h2>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={() => router.push("/masters/roles")}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Main form ── */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/10">
            <div className="space-y-6">

              {/* Section 1 — Basic Information */}
              <SectionCard
                icon={Shield}
                title="Basic Information"
                subtitle="Role name and geography level cannot be changed after creation"
              >
                <div className="space-y-4">
                  {/* Read-only notice */}
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3">
                    <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700">
                      <strong>Role name</strong> and <strong>Geography Level</strong> are locked after creation.
                      Create a new role if you need a different configuration.
                    </p>
                  </div>

                  {/* Row 1: Role Name (locked) + Geo Level (locked) */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Role Name — read-only */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        Role Name <Lock className="w-3 h-3 text-muted-foreground/50" />
                      </Label>
                      <div className="h-9 px-3 border border-border rounded-lg bg-muted/30 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{role.roleName}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Cannot be changed</p>
                    </div>

                    {/* Geo Level — read-only */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        Geography Level <Lock className="w-3 h-3 text-muted-foreground/50" />
                      </Label>
                      <div className="h-9 px-3 border border-border rounded-lg bg-muted/30 flex items-center gap-2">
                        <GeoLevelBadge level={role.geoLevel} />
                        <span className="text-xs text-muted-foreground">{GEO_LEVEL_LABEL[role.geoLevel]}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Cannot be changed</p>
                    </div>
                  </div>

                  {/* Description — editable */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Description</Label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value.slice(0, 300))}
                      placeholder="Describe the responsibilities and scope of this role…"
                      rows={3}
                      className="text-sm rounded-lg resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">Optional</p>
                      <span className="text-[10px] text-muted-foreground">{description.length}/300</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Section 2 — Approval Chain */}
              {showChain && (
                <SectionCard
                  icon={Globe}
                  iconBg="bg-blue-50 border-blue-100"
                  iconColor="text-blue-600"
                  title="Approval Chain"
                  subtitle="Add, remove or reorder approval steps"
                >
                  {/* Info note */}
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-3 mb-5">
                    <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-700">
                      Approver roles must be at a <strong>higher geography level</strong> than <strong>{role.roleName}</strong> ({role.geoLevel}).
                      Use the up/down buttons to reorder steps.
                    </p>
                  </div>

                  {/* Country-level note */}
                  {role.geoLevel === "Country" && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700">
                        This is the <strong>top-level</strong> role. No approval chain is needed.
                      </p>
                    </div>
                  )}

                  {role.geoLevel !== "Country" && (
                    <>
                      {approvalChain.length === 0 ? (
                        <div className={cn(
                          "border-2 border-dashed rounded-xl p-6 text-center mb-4",
                          errors.approvalChain ? "border-red-300 bg-red-50" : "border-border",
                        )}>
                          <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs font-medium text-muted-foreground">No approval steps configured</p>
                          {errors.approvalChain && (
                            <p className="text-xs text-red-500 mt-2 flex items-center justify-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {errors.approvalChain}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="border border-border rounded-xl overflow-hidden mb-4">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/40 border-b border-border">
                                <th className="px-4 py-2 text-left text-[11px] font-semibold text-foreground w-16">Step</th>
                                <th className="px-4 py-2 text-left text-[11px] font-semibold text-foreground">Approver Role</th>
                                <th className="px-4 py-2 text-left text-[11px] font-semibold text-foreground">Level</th>
                                <th className="px-4 py-2 text-right text-[11px] font-semibold text-foreground w-28">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {approvalChain.map((step, idx) => (
                                <tr key={step.uid} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
                                  <td className="px-4 py-2">
                                    <span className="w-6 h-6 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-3 h-3 text-brand-600" />
                                      </div>
                                      <span className="text-xs font-semibold text-foreground">{step.roleName}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    {(() => {
                                      const r = allRoles.find(x => x.id === step.roleId);
                                      return r ? <GeoLevelBadge level={r.geoLevel} /> : null;
                                    })()}
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button onClick={() => moveUp(idx)} disabled={idx === 0}
                                        className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move up">
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => moveDown(idx)} disabled={idx === approvalChain.length - 1}
                                        className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move down">
                                        <ChevronDn className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => removeStep(idx)}
                                        className="w-6 h-6 rounded-md border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-50"
                                        title="Remove">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <AddStepPopover
                        allRoles={allRoles}
                        currentGeoLevel={role.geoLevel}
                        currentRoleId={role.id}
                        onAdd={addStep}
                      />
                    </>
                  )}
                </SectionCard>
              )}

            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-64 flex-shrink-0 border-l border-border bg-white overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Save options */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Save Options
                </p>
                <div className="space-y-2">
                  <Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                    onClick={handleSave}>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs text-muted-foreground"
                    onClick={() => router.push("/masters/roles")}>
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Status (editable) */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Status
                </p>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {status === "active" ? "Active" : "Inactive"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {status === "active" ? "Visible & assignable" : "Hidden from assignment"}
                      </p>
                    </div>
                    <Switch
                      checked={status === "active"}
                      onCheckedChange={v => setStatus(v ? "active" : "inactive")}
                    />
                  </div>
                  <div className={cn(
                    "mt-2.5 flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md",
                    status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                      status === "active" ? "bg-emerald-500" : "bg-slate-400")} />
                    {status === "active" ? "Active" : "Inactive"}
                  </div>
                  {userCount > 0 && status === "inactive" && role.status === "active" && (
                    <div className="mt-2.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-2">
                      <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-px" />
                      <p className="text-[10px] text-amber-700">
                        {userCount} user{userCount > 1 ? "s" : ""} will be affected
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* User count info */}
              {userCount > 0 && (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Assigned Users
                    </p>
                    <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{userCount}</p>
                        <p className="text-[10px] text-muted-foreground">
                          user{userCount > 1 ? "s" : ""} assigned
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border" />
                </>
              )}

              {/* Approval chain summary */}
              {showChain && (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Chain Summary
                    </p>
                    {approvalChain.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">
                        {role.geoLevel === "Country" ? "Top-level — no chain needed" : "No steps configured"}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {approvalChain.map((step, i) => (
                          <div key={step.uid} className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-[11px] font-medium text-foreground">{step.roleName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border" />
                </>
              )}

              {/* Record info */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Record Info
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-3 h-3 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Created</p>
                      <p className="text-[11px] text-muted-foreground">
                        By <span className="font-medium text-foreground">{role.createdBy}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">{role.createdDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Last Updated</p>
                      <p className="text-[11px] text-muted-foreground">
                        By <span className="font-medium text-foreground">{role.updatedBy}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">{role.updatedDate}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Deactivation confirmation (with user count warning) */}
      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={doSave}
        title={`Deactivate "${role.roleName}"?`}
        description={`Warning: ${userCount} user${userCount > 1 ? "s" : ""} have this role. They will lose their role assignment. Continue?`}
        confirmLabel="Deactivate Anyway"
        destructive
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
