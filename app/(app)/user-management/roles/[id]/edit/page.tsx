"use client";

import React, { useState, useEffect } from "react";
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
  ArrowLeft, Save, Check, ChevronsUpDown, AlertCircle,
  Shield, Globe, CheckSquare, Plus, Trash2, ArrowUp, ArrowDown,
  Info, Search, FileText,
} from "lucide-react";
import {
  type Role, type GeoLevel, type ApprovalStep,
  DEPARTMENTS, GEO_LEVELS, GEO_LEVEL_ORDER,
  loadRoles, saveRoles, todayStr,
  getValidApproverRoles,
} from "../../roles-data";

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, subtitle, children, optional }: {
  icon: React.ElementType; title: string; subtitle?: string;
  children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
        <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {optional && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">Optional</span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ── SearchableDropdown ────────────────────────────────────────────────────────
function SearchableDropdown<T extends { id: number; name?: string; roleName?: string }>({
  label, placeholder, items, selectedId, onChange, error, required, getLabel, clearable,
}: {
  label: string; placeholder: string; items: T[]; selectedId: number | null;
  onChange: (id: number | null) => void; error?: string; required?: boolean;
  getLabel?: (item: T) => string; clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const labelFn = getLabel ?? ((item: T) => item.name ?? item.roleName ?? "");
  const selected = items.find(i => i.id === selectedId);
  const filtered = items.filter(i => labelFn(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn(
            "w-full h-9 px-3 text-sm text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
            error ? "border-red-400" : "border-border",
          )}>
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected ? labelFn(selected) : placeholder}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
              <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs pl-8" />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {clearable && selectedId !== null && (
              <button onClick={() => { onChange(null); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 rounded-lg transition-colors italic">
                — None
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">No options found</p>
            ) : (
              filtered.map(item => (
                <button key={item.id} onClick={() => { onChange(item.id); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-muted/60",
                    selectedId === item.id && "bg-brand-50",
                  )}>
                  <span className="flex-1 truncate">{labelFn(item)}</span>
                  {selectedId === item.id && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}</p>}
    </div>
  );
}

// ── GeoLevel Dropdown ─────────────────────────────────────────────────────────
function GeoLevelDropdown({ value, onChange }: { value: GeoLevel; onChange: (v: GeoLevel) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Geography Level</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors">
            <span className={value === "None" ? "text-muted-foreground" : "text-foreground"}>
              {value === "None" ? "None (non-field role)" : value}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="py-1 max-h-[240px] overflow-y-auto">
            {GEO_LEVELS.map(lvl => (
              <button key={lvl} onClick={() => { onChange(lvl); setOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors",
                  value === lvl && "bg-brand-50",
                )}>
                <span className={value === lvl ? "text-brand-700 font-medium" : ""}>
                  {lvl === "None" ? "None — non-field role" : lvl}
                </span>
                {value === lvl && <Check className="w-3.5 h-3.5 text-brand-600" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-[11px] text-muted-foreground">
        Used for field hierarchy mapping. Leave as "None" for office roles.
      </p>
    </div>
  );
}

// ── Approval Step Row ─────────────────────────────────────────────────────────
function ApprovalStepRow({
  step, index, total, allRoles, onRemove, onMoveUp, onMoveDown,
}: {
  step: ApprovalStep; index: number; total: number; allRoles: Role[];
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const role = allRoles.find(r => r.id === step.roleId);
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20 group">
      <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{step.roleName}</p>
        {role && role.geoLevel !== "None" && (
          <p className="text-[10px] text-muted-foreground">{role.geoLevel} level</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
        <button onClick={onMoveUp} disabled={index === 0}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
          <ArrowUp className="w-3 h-3 text-muted-foreground" />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
          <ArrowDown className="w-3 h-3 text-muted-foreground" />
        </button>
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 transition-colors">
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
      </div>
    </div>
  );
}

// ── Add Step Popover ──────────────────────────────────────────────────────────
function AddStepPopover({
  allRoles, geoLevel, existingStepIds, onAdd,
}: {
  allRoles: Role[]; geoLevel: GeoLevel; existingStepIds: number[];
  onAdd: (role: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const candidates = allRoles.filter(r =>
    r.status === "active" &&
    !existingStepIds.includes(r.id) &&
    (geoLevel === "None"
      ? true
      : GEO_LEVEL_ORDER[r.geoLevel] > GEO_LEVEL_ORDER[geoLevel]),
  ).filter(r =>
    r.roleName.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 px-3 text-xs border border-dashed border-border rounded-lg inline-flex items-center gap-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-brand-400 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Approver
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-xs font-semibold text-foreground mb-2">Select Approver Role</p>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
            <Input placeholder="Search roles…" value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs pl-8" />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto py-1">
          {candidates.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No more roles available</p>
          ) : (
            candidates.map(r => (
              <button key={r.id} onClick={() => { onAdd(r); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{r.roleName}</p>
                  <p className="text-[10px] text-muted-foreground">{r.department} · {r.geoLevel}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = Number(params?.id);

  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [original, setOriginal] = useState<Role | null>(null);
  const [notFound, setNotFound]  = useState(false);

  const [form, setForm] = useState({
    roleName:     "",
    departmentId: null as number | null,
    description:  "",
    geoLevel:     "None" as GeoLevel,
    status:       "active" as "active" | "inactive",
  });
  const [approvalChain, setApprovalChain] = useState<ApprovalStep[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const roles = loadRoles();
    setAllRoles(roles);
    const found = roles.find(r => r.id === roleId);
    if (!found || found.status === "archived") {
      setNotFound(true);
      return;
    }
    setOriginal(found);
    setForm({
      roleName:     found.roleName,
      departmentId: found.departmentId,
      description:  found.description,
      geoLevel:     found.geoLevel,
      status:       found.status === "inactive" ? "inactive" : "active",
    });
    setApprovalChain(found.approvalChain ?? []);
  }, [roleId]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.roleName.trim()) e.roleName = "Role name is required";
    if (!form.departmentId)    e.departmentId = "Department is required";
    const dup = allRoles.find(r =>
      r.id !== roleId &&
      r.status !== "archived" &&
      r.roleName.toLowerCase() === form.roleName.toLowerCase() &&
      r.departmentId === form.departmentId,
    );
    if (dup) e.roleName = "A role with this name already exists in the selected department";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !original) return;
    const dept = DEPARTMENTS.find(d => d.id === form.departmentId);
    const updated = allRoles.map(r =>
      r.id === roleId ? {
        ...r,
        roleName:     form.roleName.trim(),
        departmentId: form.departmentId,
        department:   dept?.name ?? r.department,
        description:  form.description.trim(),
        geoLevel:     form.geoLevel,
        approvalChain,
        status:       form.status,
        updatedBy:    "Admin",
        updatedDate:  todayStr(),
      } : r,
    ) as Role[];
    saveRoles(updated);
    router.push("/user-management/roles");
  };

  // Approval chain helpers
  const addStep = (role: Role) => {
    setApprovalChain(prev => [
      ...prev,
      { uid: `step-${Date.now()}-${role.id}`, roleId: role.id, roleName: role.roleName },
    ]);
  };
  const removeStep = (uid: string) => setApprovalChain(prev => prev.filter(s => s.uid !== uid));
  const moveStep = (index: number, dir: -1 | 1) => {
    setApprovalChain(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const selectedDept = DEPARTMENTS.find(d => d.id === form.departmentId);

  if (notFound) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm font-medium text-foreground">Role not found</p>
          <p className="text-xs text-muted-foreground">The role may have been archived or doesn't exist.</p>
          <Button size="sm" variant="outline" className="h-8 text-xs mt-2" onClick={() => router.push("/user-management/roles")}>
            Back to Roles
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout noPadding>
      <div className="flex flex-col" style={{ height: "calc(100vh - 104px)" }}>

        {/* ── Sticky header ── */}
        <div className="flex-shrink-0 bg-white border-b border-border px-5 py-3 flex items-center gap-3 z-10">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Edit Role — {original?.roleName ?? "Loading…"}
            </h2>
            <p className="text-[11px] text-muted-foreground">User Management → Roles → Edit</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.back()}>
            Discard
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Main form ── */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/10">
            <div className="space-y-6">

              {/* Section 1 — Basic Information */}
              <SectionCard icon={Shield} title="Basic Information" subtitle="Role name, department, and description">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    {/* Role Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Role Name <span className="text-red-500">*</span>
                      </Label>
                      <Input value={form.roleName} onChange={e => set("roleName", e.target.value)}
                        placeholder="e.g., Sales Executive"
                        className={cn("h-9 text-sm rounded-lg", errors.roleName && "border-red-400")} />
                      {errors.roleName
                        ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.roleName}</p>
                        : <p className="text-[11px] text-muted-foreground">Unique within department</p>
                      }
                    </div>

                    {/* Department */}
                    <SearchableDropdown
                      label="Department" placeholder="Select department…" required
                      items={DEPARTMENTS} selectedId={form.departmentId}
                      onChange={id => set("departmentId", id)}
                      error={errors.departmentId}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 max-w-2xl">
                    <Label className="text-xs font-medium">Description</Label>
                    <Textarea value={form.description} onChange={e => set("description", e.target.value)}
                      placeholder="Describe the responsibilities and scope of this role…"
                      rows={3} className="text-sm rounded-lg resize-none" />
                    <p className="text-[11px] text-muted-foreground">Optional</p>
                  </div>
                </div>
              </SectionCard>

              {/* Section 2 — Geography Level */}
              <SectionCard icon={Globe} title="Geography Level" subtitle="For field force roles that map to a geographic hierarchy" optional>
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  <GeoLevelDropdown value={form.geoLevel} onChange={v => set("geoLevel", v)} />
                  <div className="bg-muted/30 rounded-lg border border-border p-3 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground text-xs">Level hierarchy (highest → lowest)</p>
                    {["Country", "Zone", "State", "Region", "Area", "Territory", "Locality"].map(l => (
                      <p key={l} className={cn("transition-colors", form.geoLevel === l ? "text-brand-700 font-semibold" : "")}>
                        {l}
                      </p>
                    ))}
                    <p className={form.geoLevel === "None" ? "text-muted-foreground font-semibold" : ""}>None</p>
                  </div>
                </div>
              </SectionCard>

              {/* Section 3 — Approval Chain */}
              <SectionCard icon={CheckSquare} title="Approval Chain" subtitle="Define who approves for this role — skip if no approval is required" optional>
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 bg-muted/30 border border-border rounded-lg px-3.5 py-3 max-w-2xl">
                    <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">
                      Approval is <strong>not mandatory</strong>. You can configure this at any time.
                      Leave empty if no approval workflow is needed.
                    </p>
                  </div>

                  {approvalChain.length > 0 && (
                    <div className="space-y-2 max-w-md">
                      {approvalChain.map((step, i) => (
                        <ApprovalStepRow
                          key={step.uid} step={step} index={i} total={approvalChain.length}
                          allRoles={allRoles}
                          onRemove={() => removeStep(step.uid)}
                          onMoveUp={() => moveStep(i, -1)}
                          onMoveDown={() => moveStep(i, 1)}
                        />
                      ))}
                    </div>
                  )}

                  <AddStepPopover
                    allRoles={allRoles}
                    geoLevel={form.geoLevel}
                    existingStepIds={approvalChain.map(s => s.roleId)}
                    onAdd={addStep}
                  />

                  {approvalChain.length > 0 && (
                    <button onClick={() => setApprovalChain([])}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors">
                      Clear all steps
                    </button>
                  )}
                </div>
              </SectionCard>

              {/* Audit info */}
              {original && (
                <SectionCard icon={FileText} title="Record Info" subtitle="Read-only audit trail">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[11px] max-w-md">
                    {[
                      ["Created By", original.createdBy],
                      ["Created Date", original.createdDate],
                      ["Updated By", original.updatedBy],
                      ["Updated Date", original.updatedDate],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className="text-muted-foreground">{label}</p>
                        <p className="font-medium text-foreground mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="w-64 flex-shrink-0 border-l border-border bg-white flex flex-col overflow-y-auto">
            {/* Status */}
            <div className="p-5 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Status</p>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div>
                  <p className="text-xs font-medium">{form.status === "active" ? "Active" : "Inactive"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {form.status === "active" ? "Available to assign" : "Hidden from users"}
                  </p>
                </div>
                <Switch checked={form.status === "active"} onCheckedChange={v => set("status", v ? "active" : "inactive")} />
              </div>
            </div>

            {/* Summary preview */}
            <div className="p-5 border-b border-border space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Values</p>
              <div className="space-y-2 text-[11px]">
                {[
                  ["Name", form.roleName.trim() || "—"],
                  ["Dept", selectedDept?.name ?? "—"],
                  ["Geo", form.geoLevel === "None" ? "None" : form.geoLevel],
                  ["Approval", approvalChain.length === 0 ? "Not set" : `${approvalChain.length} step${approvalChain.length > 1 ? "s" : ""}`],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-muted-foreground w-16 flex-shrink-0">{label}</span>
                    <span className="font-medium text-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="p-5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</p>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start gap-2"
                onClick={() => router.push("/user-management/roles")}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to List
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
