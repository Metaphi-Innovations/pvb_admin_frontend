"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BRANCH_OPTIONS,
  DEPARTMENT_OPTIONS,
  DESIGNATION_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
} from "@/lib/hr/config";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { HrEmployee, HrEmployeeFormValues } from "../employee-master-data";
import { getActiveHrEmployees } from "../employee-master-data";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function EmployeeMasterForm({
  form,
  onChange,
  employeeCode,
  readOnly,
  excludeId,
}: {
  form: HrEmployeeFormValues;
  onChange: (f: HrEmployeeFormValues) => void;
  employeeCode: string;
  readOnly?: boolean;
  excludeId?: number;
}) {
  const managers = getActiveHrEmployees().filter((e) => e.id !== excludeId);

  const set = <K extends keyof HrEmployeeFormValues>(k: K, v: HrEmployeeFormValues[K]) =>
    onChange({ ...form, [k]: v });

  return (
    <div className="page-shell p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Employee Code">
          <Input value={employeeCode} disabled className="h-8 text-xs font-mono bg-muted/30" />
        </Field>
        <Field label="Employee Name" required>
          <Input
            value={form.employeeName}
            disabled={readOnly}
            onChange={(e) => set("employeeName", e.target.value)}
            className="h-8 text-xs"
            placeholder="Full name"
          />
        </Field>
        <Field label="Mobile Number" required>
          <PhoneInput
            countryCode={form.mobileCountryCode || "+91"}
            onCountryCodeChange={(v) => set("mobileCountryCode", v)}
            value={form.mobileNumber}
            onChange={(v) => set("mobileNumber", v)}
            disabled={readOnly}
            placeholder="Mobile number"
          />
        </Field>
        <Field label="Email ID" required>
          <Input
            type="email"
            value={form.emailId}
            disabled={readOnly}
            onChange={(e) => set("emailId", e.target.value)}
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Department" required>
          <Select value={form.department} disabled={readOnly} onValueChange={(v) => set("department", v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-xs">
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Designation" required>
          <Select value={form.designation} disabled={readOnly} onValueChange={(v) => set("designation", v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {DESIGNATION_OPTIONS.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Reporting Manager">
          <Select
            value={form.reportingManagerId ? String(form.reportingManagerId) : "none"}
            disabled={readOnly}
            onValueChange={(v) =>
              set("reportingManagerId", v === "none" ? null : Number(v))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                None
              </SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                  {m.employeeName} ({m.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Branch" required>
          <Select value={form.branch} disabled={readOnly} onValueChange={(v) => set("branch", v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCH_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value} className="text-xs">
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Employee Type" required>
          <Select
            value={form.employeeType}
            disabled={readOnly}
            onValueChange={(v) => set("employeeType", v as HrEmployee["employeeType"])}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Employment Status" required>
          <Select
            value={form.employmentStatus}
            disabled={readOnly}
            onValueChange={(v) => set("employmentStatus", v as HrEmployee["employmentStatus"])}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date of Joining" required>
          <Input
            type="date"
            value={form.dateOfJoining}
            disabled={readOnly}
            onChange={(e) => set("dateOfJoining", e.target.value)}
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Status" required>
          <Select
            value={form.status}
            disabled={readOnly}
            onValueChange={(v) => set("status", v as HrEmployee["status"])}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active" className="text-xs">
                Active
              </SelectItem>
              <SelectItem value="inactive" className="text-xs">
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}
