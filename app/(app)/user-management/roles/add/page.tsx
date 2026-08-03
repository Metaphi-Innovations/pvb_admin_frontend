"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Check, ChevronsUpDown, Globe, Shield } from "lucide-react";
import { GEO_LEVELS, type GeoLevel } from "../roles-data";
import DepartmentSelect from "../components/DepartmentSelect";
import { DEFAULT_ROLE_FORM, validateRoleForm } from "../role-api-data";
import { useCreateRole } from "@/hooks/user-management";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  optional,
}: {
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
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                Optional
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
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
          <button
            type="button"
            className="flex items-center justify-between w-full px-3 text-sm text-left transition-colors border rounded-lg h-9 border-border bg-background hover:bg-muted/30"
          >
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
                type="button"
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
        Used for field hierarchy mapping. Leave as &quot;None&quot; for office roles.
      </p>
    </div>
  );
}

export default function AddRolePage() {
  const router = useRouter();
  const createMutation = useCreateRole();
  const [form, setForm] = useState(DEFAULT_ROLE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const fieldErrors = validateRoleForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setFormError(null);
    createMutation.mutate(
      {
        role_name: form.roleName,
        department_id: form.departmentId!,
        description: form.description || null,
        geography_level: form.geoLevel,
        approval_chain: null,
      },
      {
        onSuccess: () => router.push("/user-management/roles"),
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to create role."));
        },
      },
    );
  };

  return (
    <FormContainer
      title="Add Role"
      description="User Management → Roles → New Role"
      onBack={() => router.back()}
      onCancel={() => router.back()}
      cancelLabel="Discard"
      noCard={true}
      actions={
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleSave}
          disabled={createMutation.isPending}
        >
          <Check className="w-3.5 h-3.5" /> Save Role
        </Button>
      }
    >
      <div className="px-6 py-6">
        {formError ? <p className="mb-4 text-xs text-red-600">{formError}</p> : null}
        <div className="space-y-6">
          <SectionCard icon={Shield} title="Basic Information" subtitle="Role name and department">
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

                <DepartmentSelect
                  value={form.departmentId}
                  onChange={(id) => set("departmentId", id)}
                  error={errors.departmentId}
                  required
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Globe}
            title="Geography Level"
            subtitle="For field force roles that map to a geographic hierarchy"
            optional
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GeoLevelDropdown
                value={form.geoLevel as GeoLevel}
                onChange={(v) => set("geoLevel", v)}
              />
              <div className="bg-muted/30 rounded-lg border border-border p-3 text-[11px] text-muted-foreground space-y-1">
                <p className="text-xs font-semibold text-foreground">Level hierarchy (highest → lowest)</p>
                {["Country", "Zone", "Region", "State", "Area", "Territory", "District", "City", "Town"].map((l) => (
                  <p
                    key={l}
                    className={cn("transition-colors", form.geoLevel === l ? "text-brand-700 font-semibold" : "")}
                  >
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
