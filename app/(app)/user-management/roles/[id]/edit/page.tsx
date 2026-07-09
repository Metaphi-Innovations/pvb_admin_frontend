"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Check, ChevronsUpDown, Globe, Shield, FileText, Save } from "lucide-react";
import { GEO_LEVELS, type GeoLevel } from "../../roles-data";
import DepartmentSelect from "../../components/DepartmentSelect";
import { roleToForm, toRoleRecord, validateRoleForm } from "../../role-api-data";
import { useRole, useUpdateRole } from "@/hooks/user-management";
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
    </div>
  );
}

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = String(params?.id ?? "");
  const roleQuery = useRole(roleId);
  const updateMutation = useUpdateRole();

  const [form, setForm] = useState({
    roleName: "",
    departmentId: null as string | null,
    geoLevel: "None" as GeoLevel,
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [original, setOriginal] = useState<ReturnType<typeof toRoleRecord> | null>(null);

  useEffect(() => {
    if (roleQuery.data) {
      const record = toRoleRecord(roleQuery.data);
      setOriginal(record);
      setForm(roleToForm(record));
    }
  }, [roleQuery.data]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const fieldErrors = validateRoleForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0 || !roleId) return;

    setFormError(null);
    updateMutation.mutate(
      {
        id: roleId,
        payload: {
          role_name: form.roleName,
          department_id: form.departmentId!,
          description: form.description || null,
          geography_level: form.geoLevel,
        },
      },
      {
        onSuccess: () => router.push("/user-management/roles"),
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update role."));
        },
      },
    );
  };

  if (roleQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <p className="text-sm text-muted-foreground">Loading role…</p>
      </div>
    );
  }

  if (roleQuery.isError || !roleQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <p className="text-sm font-medium text-foreground">Role not found</p>
        <Button
          size="sm"
          variant="outline"
          className="h-8 mt-2 text-xs"
          onClick={() => router.push("/user-management/roles")}
        >
          Back to Roles
        </Button>
      </div>
    );
  }

  return (
    <FormContainer
      title={`Edit Role — ${original?.roleName ?? "Loading…"}`}
      description="User Management → Roles → Edit"
      onBack={() => router.back()}
      onCancel={() => router.back()}
      cancelLabel="Discard"
      noCard={true}
      actions={
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Save className="w-3.5 h-3.5" /> Save Changes
        </Button>
      }
    >
      <div className="px-6 py-6">
        {formError ? <p className="mb-4 text-xs text-red-600">{formError}</p> : null}
        <div className="space-y-6">
          <SectionCard icon={Shield} title="Basic Information" subtitle="Role name and department">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Role Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.roleName}
                  onChange={(e) => set("roleName", e.target.value)}
                  className={cn("h-9 text-sm rounded-lg", errors.roleName && "border-red-400")}
                />
                {errors.roleName && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.roleName}
                  </p>
                )}
              </div>
              <DepartmentSelect
                value={form.departmentId}
                onChange={(id) => set("departmentId", id)}
                error={errors.departmentId}
                required
              />
            </div>
          </SectionCard>

          <SectionCard icon={Globe} title="Geography Level" subtitle="For field force roles that map to a geographic hierarchy" optional>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GeoLevelDropdown value={form.geoLevel} onChange={(v) => set("geoLevel", v)} />
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
                    <p className="mt-0.5 font-medium text-foreground">{val}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </FormContainer>
  );
}
