"use client";

import { useMemo } from "react";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { EMPLOYMENT_STATUS_OPTIONS } from "@/lib/hr/config";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import {
  getBranchSelectOptions,
  getDepartmentSelectOptions,
  getDesignationSelectOptions,
  getEmployeeTypeSelectOptions,
  getEmploymentStatusSelectOptions,
} from "@/app/(app)/hr/settings/organization-data";
import type { HrEmployee, HrEmployeeFormValues } from "../employee-master-data";
import { getActiveHrEmployees } from "../employee-master-data";
import { EmpField, EmpInput, EmpSection, EMP_SELECT_CONTENT, EMP_SELECT_ITEM, EMP_SELECT_TRIGGER } from "./employee-form-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Essential create/edit employee form — Basic + Employment.
 * Extended profile fields belong on the Employee Profile workspace.
 */
export function EmployeeMasterForm({
  form,
  onChange,
  readOnly,
  excludeId,
}: {
  form: HrEmployeeFormValues;
  onChange: (f: HrEmployeeFormValues) => void;
  readOnly?: boolean;
  excludeId?: number;
}) {
  const managers = getActiveHrEmployees().filter((e) => e.id !== excludeId);
  const employeeTypeOptions = useMemo(
    () => getEmployeeTypeSelectOptions({ includeInactiveValue: form.employeeType }),
    [form.employeeType],
  );
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

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm p-4 sm:p-5 space-y-5">
      <EmpSection title="Basic Information">
        <EmpField label="Employee Name" required>
          <EmpInput
            value={form.employeeName}
            disabled={readOnly}
            onChange={(e) => set("employeeName", e.target.value)}
            placeholder="Full name"
          />
        </EmpField>
        <EmpField label="Company Email" required>
          <EmpInput
            type="email"
            value={form.emailId}
            disabled={readOnly}
            onChange={(e) => set("emailId", e.target.value)}
            placeholder="name@company.com"
          />
        </EmpField>
        <EmpField label="Mobile Number" required>
          <PhoneInput
            countryCode={form.mobileCountryCode || "+91"}
            onCountryCodeChange={(v) => set("mobileCountryCode", v)}
            value={form.mobileNumber}
            onChange={(v) => set("mobileNumber", v)}
            disabled={readOnly}
            placeholder="Mobile number"
          />
        </EmpField>
        <EmpField label="Employee Code" required helper="Auto-generated — you may change this code">
          <EmpInput
            value={form.employeeCode}
            disabled={readOnly}
            onChange={(e) => set("employeeCode", e.target.value)}
            className="font-mono"
          />
        </EmpField>
      </EmpSection>

      <EmpSection title="Employment Information">
        <EmpField label="Branch" required>
          <Select value={form.branch} disabled={readOnly} onValueChange={(v) => set("branch", v)}>
            <SelectTrigger className={cn(EMP_SELECT_TRIGGER)}>
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
        <EmpField label="Department" required>
          <Select
            value={form.department || undefined}
            disabled={readOnly}
            onValueChange={(v) => set("department", v)}
          >
            <SelectTrigger className={cn(EMP_SELECT_TRIGGER)}>
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
        <EmpField label="Designation" required>
          <Select
            value={form.designation || undefined}
            disabled={readOnly}
            onValueChange={(v) => set("designation", v)}
          >
            <SelectTrigger className={cn(EMP_SELECT_TRIGGER)}>
              <SelectValue placeholder="Select designation" />
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
            disabled={readOnly}
            onValueChange={(v) => set("reportingManagerId", v === "none" ? null : Number(v))}
          >
            <SelectTrigger className={cn(EMP_SELECT_TRIGGER)}>
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
        <EmpField label="Employee Type" required>
          <Select
            value={form.employeeType}
            disabled={readOnly}
            onValueChange={(v) => set("employeeType", v as HrEmployee["employeeType"])}
          >
            <SelectTrigger className={cn(EMP_SELECT_TRIGGER)}>
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
        <EmpField label="Employment Status" required>
          <Select
            value={form.employmentStatus}
            disabled={readOnly}
            onValueChange={(v) => set("employmentStatus", v as HrEmployee["employmentStatus"])}
          >
            <SelectTrigger className={cn(EMP_SELECT_TRIGGER)}>
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
        <EmpField label="Date of Joining" required>
          <HrDateInput
            value={form.dateOfJoining}
            disabled={readOnly}
            onChange={(v) => set("dateOfJoining", v)}
            aria-label="Date of Joining"
          />
        </EmpField>
      </EmpSection>
    </div>
  );
}
