"use client";

import React, { useMemo } from "react";
import { Camera, Upload } from "lucide-react";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EMPLOYMENT_STATUS_OPTIONS } from "@/lib/hr/config";
import {
  getActiveHrEmployees,
  type HrEmployee,
  type HrEmployeeFormErrors,
  type HrEmployeeFormValues,
} from "../employee-master-data";
import {
  getBranchSelectOptions,
  getDepartmentSelectOptions,
  getDesignationSelectOptions,
  getEmployeeTypeSelectOptions,
  getEmploymentStatusSelectOptions,
} from "@/app/(app)/hr/settings/organization-data";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import {
  EmpField,
  EmpInput,
  EMP_HELPER,
  EMP_LABEL,
  EMP_SELECT_CONTENT,
  EMP_SELECT_ITEM,
  EMP_SELECT_TRIGGER,
  EMP_SUBHEAD,
} from "./employee-form-ui";

/**
 * Essential Add Employee fields — used by EmployeeCreateDialog only.
 * Branch / Department / Designation / Status / Type come from HR Organization masters.
 */
export function EmployeeCreateForm({
  form,
  onChange,
  errors,
}: {
  form: HrEmployeeFormValues;
  onChange: (f: HrEmployeeFormValues) => void;
  errors: HrEmployeeFormErrors;
}) {
  const managers = getActiveHrEmployees();
  const employeeTypeOptions = useMemo(() => getEmployeeTypeSelectOptions(), []);
  const branchOptions = useMemo(
    () => getBranchSelectOptions({ includeCurrent: form.branch }),
    [form.branch],
  );
  const departmentOptions = useMemo(
    () => getDepartmentSelectOptions({ includeCurrent: form.department }),
    [form.department],
  );
  const designationOptions = useMemo(
    () => getDesignationSelectOptions({ includeCurrent: form.designation }),
    [form.designation],
  );
  const employmentStatusOptions = useMemo(() => {
    try {
      const fromMaster = getEmploymentStatusSelectOptions({
        includeInactiveValue: form.employmentStatus,
      });
      if (fromMaster.length > 0) return fromMaster;
    } catch {
      /* fall through */
    }
    return EMPLOYMENT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  }, [form.employmentStatus]);
  const set = <K extends keyof HrEmployeeFormValues>(k: K, v: HrEmployeeFormValues[K]) =>
    onChange({ ...form, [k]: v });

  const onPhoto = (file: File | null) => {
    if (!file) {
      set("photoDataUrl", "");
      return;
    }
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      onChange({ ...form, photoDataUrl: result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      {/* Photo */}
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer group">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
          />
          <span
            className={cn(
              "w-14 h-14 rounded-full border border-dashed border-border bg-muted/30",
              "flex items-center justify-center overflow-hidden",
              "group-hover:border-brand-400 group-hover:bg-brand-50/40 transition-colors",
            )}
          >
            {form.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photoDataUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-muted-foreground" />
            )}
          </span>
        </label>
        <div>
          <p className={EMP_LABEL}>Employee Photo</p>
          <label className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline cursor-pointer mt-0.5">
            <Upload className="w-3 h-3" />
            Upload Photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className={cn(EMP_HELPER, "text-muted-foreground mt-0.5")}>Optional</p>
        </div>
        {form.photoDataUrl && (
          <button
            type="button"
            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => set("photoDataUrl", "")}
          >
            Remove
          </button>
        )}
      </div>

      <p className={cn(EMP_SUBHEAD, "pb-2 border-b border-border")}>
        Basic Information
      </p>

      <EmpField label="Employee Name" required error={errors.employeeName}>
        <EmpInput
          value={form.employeeName}
          onChange={(e) => set("employeeName", e.target.value)}
          placeholder="Full name"
          aria-invalid={!!errors.employeeName}
        />
      </EmpField>

      <EmpField label="Mobile Number" required error={errors.mobileNumber}>
        <PhoneInput
          countryCode={form.mobileCountryCode || "+91"}
          onCountryCodeChange={(v) => set("mobileCountryCode", v)}
          value={form.mobileNumber}
          onChange={(v) => set("mobileNumber", v)}
          placeholder="Mobile number"
          inputClassName={cn(errors.mobileNumber && "border-red-400")}
        />
      </EmpField>

      <EmpField label="Company Email" required error={errors.emailId}>
        <EmpInput
          type="email"
          value={form.emailId}
          onChange={(e) => set("emailId", e.target.value)}
          placeholder="name@company.com"
          aria-invalid={!!errors.emailId}
        />
      </EmpField>

      <EmpField label="Personal Email" error={errors.personalEmail}>
        <EmpInput
          type="email"
          value={form.personalEmail}
          onChange={(e) => set("personalEmail", e.target.value)}
          placeholder="personal@email.com"
          aria-invalid={!!errors.personalEmail}
        />
      </EmpField>

      <EmpField
        label="Employee Code"
        required
        helper="Auto-generated — you may change this code"
        error={errors.employeeCode}
      >
        <EmpInput
          value={form.employeeCode}
          onChange={(e) => set("employeeCode", e.target.value)}
          className="font-mono"
          placeholder="EMP-0001"
          aria-invalid={!!errors.employeeCode}
        />
      </EmpField>

      <p className={cn(EMP_SUBHEAD, "pb-2 border-b border-border pt-1")}>
        Employment Information
      </p>
      <p className={cn(EMP_HELPER, "text-muted-foreground -mt-2")}>
        Optional at create — you can complete these later on the Employee Profile.
      </p>

      <EmpField label="Branch" error={errors.branch}>
        <Select value={form.branch || undefined} onValueChange={(v) => set("branch", v)}>
          <SelectTrigger className={EMP_SELECT_TRIGGER} aria-invalid={!!errors.branch}>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent className={EMP_SELECT_CONTENT} position="popper">
            {branchOptions.map((b) => (
              <SelectItem key={b.value} value={b.value} className={EMP_SELECT_ITEM}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </EmpField>

      <EmpField label="Department" error={errors.department}>
        <Select
          value={form.department || undefined}
          onValueChange={(v) => set("department", v)}
        >
          <SelectTrigger className={EMP_SELECT_TRIGGER} aria-invalid={!!errors.department}>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent className={EMP_SELECT_CONTENT} position="popper">
            {departmentOptions.map((d) => (
              <SelectItem key={d.value} value={d.value} className={EMP_SELECT_ITEM}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </EmpField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <EmpField label="Designation" error={errors.designation}>
          <Select
            value={form.designation || undefined}
            onValueChange={(v) => set("designation", v)}
          >
            <SelectTrigger className={EMP_SELECT_TRIGGER} aria-invalid={!!errors.designation}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className={EMP_SELECT_CONTENT} position="popper">
              {designationOptions.map((d) => (
                <SelectItem key={d.value} value={d.value} className={EMP_SELECT_ITEM}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EmpField>

        <EmpField label="Reporting Manager">
          <Select
            value={form.reportingManagerId ? String(form.reportingManagerId) : "none"}
            onValueChange={(v) => set("reportingManagerId", v === "none" ? null : Number(v))}
          >
            <SelectTrigger className={EMP_SELECT_TRIGGER}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className={EMP_SELECT_CONTENT} position="popper">
              <SelectItem value="none" className={EMP_SELECT_ITEM}>
                None
              </SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={String(m.id)} className={EMP_SELECT_ITEM}>
                  {m.employeeName} ({m.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EmpField>

        <EmpField label="Employee Type" error={errors.employeeType}>
          <Select
            value={form.employeeType}
            onValueChange={(v) => set("employeeType", v as HrEmployee["employeeType"])}
          >
            <SelectTrigger className={EMP_SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={EMP_SELECT_CONTENT} position="popper">
              {employeeTypeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className={EMP_SELECT_ITEM}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EmpField>

        <EmpField label="Employment Status" error={errors.employmentStatus}>
          <Select
            value={form.employmentStatus}
            onValueChange={(v) => set("employmentStatus", v as HrEmployee["employmentStatus"])}
          >
            <SelectTrigger className={EMP_SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={EMP_SELECT_CONTENT} position="popper">
              {employmentStatusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className={EMP_SELECT_ITEM}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EmpField>

        <EmpField label="Date of Joining" error={errors.dateOfJoining}>
          <HrDateInput
            value={form.dateOfJoining}
            onChange={(v) => set("dateOfJoining", v)}
            aria-label="Date of Joining"
            aria-invalid={!!errors.dateOfJoining}
          />
        </EmpField>
      </div>
    </div>
  );
}
