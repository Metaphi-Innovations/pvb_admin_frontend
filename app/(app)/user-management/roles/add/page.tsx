"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Check, ChevronsUpDown, Globe, Search, Shield } from "lucide-react";
import {
  type Role,
  type GeoLevel,
  DEPARTMENTS,
  GEO_LEVELS,
  loadRoles,
  saveRoles,
  nextRoleId,
  todayStr,
} from "../roles-data";

function SectionCard({ icon: Icon, title, subtitle, children, optional }: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-border">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 border rounded-lg bg-brand-50 border-brand-100">
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

function SearchableDropdown<T extends { id: number; name?: string; roleName?: string }>({
  label,
  placeholder,
  items,
  selectedId,
  onChange,
  error,
  required,
  getLabel,
}: {
  label: string;
  placeholder: string;
  items: T[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  error?: string;
  required?: boolean;
  getLabel?: (item: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const labelFn = getLabel ?? ((item: T) => item.name ?? item.roleName ?? "");
  const selected = items.find((i) => i.id === selectedId);
  const filtered = items.filter((i) => labelFn(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full h-9 px-3 text-sm text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
              error ? "border-red-400" : "border-border",
            )}
          >
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected ? labelFn(selected) : placeholder}
            </span>
            <ChevronsUpDown className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center text-muted-foreground">No options found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-muted/60",
                    selectedId === item.id && "bg-brand-50",
                  )}
                >
                  <span className="flex-1 truncate">{labelFn(item)}</span>
                  {selectedId === item.id && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function GeoLevelDropdown({ value, onChange }: { value: GeoLevel; onChange: (v: GeoLevel) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Geography Level</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center justify-between w-full px-3 text-sm text-left transition-colors border rounded-lg h-9 border-border bg-background hover:bg-muted/30">
            <span className={value === "None" ? "text-muted-foreground" : "text-foreground"}>
              {value === "None" ? "None (non-field role)" : value}
            </span>
            <ChevronsUpDown className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="py-1 max-h-[240px] overflow-y-auto">
            {GEO_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  onChange(lvl);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors",
                  value === lvl && "bg-brand-50",
                )}
              >
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

export default function AddRolePage() {
  const router = useRouter();
  const [allRoles, setAllRoles] = useState<Role[]>([]);

  useEffect(() => {
    setAllRoles(loadRoles());
  }, []);

  const [form, setForm] = useState({
    roleName: "",
    departmentId: null as number | null,
    description: "",
    geoLevel: "None" as GeoLevel,
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.roleName.trim()) e.roleName = "Role name is required";
    if (!form.departmentId) e.departmentId = "Department is required";
    const dup = allRoles.find(
      (r) =>
        r.status !== "archived" &&
        r.roleName.toLowerCase() === form.roleName.toLowerCase() &&
        r.departmentId === form.departmentId,
    );
    if (dup) e.roleName = "A role with this name already exists in the selected department";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const dept = DEPARTMENTS.find((d) => d.id === form.departmentId);
    const newRole: Role = {
      id: nextRoleId(),
      roleName: form.roleName.trim(),
      departmentId: form.departmentId,
      department: dept?.name ?? "",
      description: form.description.trim(),
      geoLevel: form.geoLevel,
      approvalChain: [],
      status: form.status,
      createdBy: "Admin",
      createdDate: todayStr(),
      updatedBy: "Admin",
      updatedDate: todayStr(),
    } as Role;
    const updated = [...allRoles, newRole];
    saveRoles(updated);
    router.push("/user-management/roles");
  };

  const selectedDept = DEPARTMENTS.find((d) => d.id === form.departmentId);

  const filled = [
    form.roleName.trim() !== "",
    form.departmentId !== null,
    form.description.trim() !== "",
    form.geoLevel !== "None",
  ];
  const progress = Math.round((filled.filter(Boolean).length / filled.length) * 100);

  return (
    <FormContainer
      title="Add Role"
      description="User Management → Roles → New Role"
      onBack={() => router.back()}
      onCancel={() => router.back()}
      cancelLabel="Discard"
      noCard={true}
      actions={
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
          <Check className="w-3.5 h-3.5" /> Save Role
        </Button>
      }
    >
      <div className="px-6 py-6">
        <div className="space-y-6">
          <SectionCard icon={Shield} title="Basic Information" subtitle="Role name, department, and description">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Role Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.roleName}
                    onChange={(e) => set("roleName", e.target.value)}
                    placeholder="e.g., Sales Executive"
                    className={cn("h-9 text-sm rounded-lg", errors.roleName && "border-red-400")}
                  />
                  {errors.roleName ? (
                    <p className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {errors.roleName}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Unique within department</p>
                  )}
                </div>

                <SearchableDropdown
                  label="Department"
                  placeholder="Select department…"
                  required
                  items={DEPARTMENTS}
                  selectedId={form.departmentId}
                  onChange={(id) => set("departmentId", id)}
                  error={errors.departmentId}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the responsibilities and scope of this role…"
                  rows={3}
                  className="text-sm rounded-lg resize-none"
                />
                <p className="text-[11px] text-muted-foreground">Optional</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Globe} title="Geography Level" subtitle="For field force roles that map to a geographic hierarchy" optional>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GeoLevelDropdown value={form.geoLevel} onChange={(v) => set("geoLevel", v)} />
              <div className="bg-muted/30 rounded-lg border border-border p-3 text-[11px] text-muted-foreground space-y-1">
                <p className="text-xs font-semibold text-foreground">Level hierarchy (highest → lowest)</p>
                {["Country", "Zone", "Region", "State", "Area", "Territory", "District", "City", "Town"].map((l) => (
                  <p key={l} className={cn("transition-colors", form.geoLevel === l ? "text-brand-700 font-semibold" : "")}>
                    {l}
                  </p>
                ))}
                <p className={form.geoLevel === "None" ? "text-muted-foreground font-semibold" : ""}>None</p>
              </div>
            </div>
          </SectionCard>

        </div>
      </div>
    </FormContainer>
  );
}
