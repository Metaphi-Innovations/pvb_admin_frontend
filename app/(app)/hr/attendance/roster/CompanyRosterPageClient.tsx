"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import {
  BRANCH_OPTIONS,
  DEPARTMENT_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
} from "@/lib/hr/config";
import { cn } from "@/lib/utils";
import {
  branchLabel,
  buildCompanyRoster,
  listAssignedShiftNames,
} from "../attendance-ops";

function isUnassigned(value: string | null | undefined): boolean {
  return !value || value.trim() === "" || value.trim() === "—";
}

/** Compact muted warning for missing roster assignments (read-only). */
function AssignmentValue({
  value,
  configRequired,
}: {
  value: string;
  /** Stronger cue when Shift is missing — config required for attendance resolution. */
  configRequired?: boolean;
}) {
  if (isUnassigned(value)) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-[11px] font-medium",
          configRequired ? "text-amber-700" : "text-muted-foreground",
        )}
      >
        Not Assigned
      </span>
    );
  }
  return <span>{value}</span>;
}

export default function CompanyRosterPageClient() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [shift, setShift] = useState("all");
  const [empType, setEmpType] = useState("all");
  const [empStatus, setEmpStatus] = useState("all");

  const rows = useMemo(() => buildCompanyRoster(), []);
  const shifts = useMemo(() => listAssignedShiftNames(), []);

  const visible = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employee.employeeName.toLowerCase().includes(q) ||
          r.employee.employeeCode.toLowerCase().includes(q),
      );
    }
    if (branch !== "all") list = list.filter((r) => r.employee.branch === branch);
    if (dept !== "all") list = list.filter((r) => r.employee.department === dept);
    if (shift !== "all") list = list.filter((r) => r.shiftName === shift);
    if (empType !== "all") list = list.filter((r) => r.employee.employeeType === empType);
    if (empStatus !== "all")
      list = list.filter((r) => r.employee.employmentStatus === empStatus);
    return list;
  }, [rows, search, branch, dept, shift, empType, empStatus]);

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto space-y-3">
        <PageHeader
          title="Attendance Roster"
          description="View employee shift, attendance policy, working schedule and weekly-off assignments."
          icon={Users}
          compact
        />

        <ModuleFiltersBar className="bg-white">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 w-[160px] text-xs rounded-[10px]"
          />
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="h-8 w-[140px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All branches</SelectItem>
              {BRANCH_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value} className="text-xs">{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All depts</SelectItem>
              {DEPARTMENT_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
              ))}
              <SelectItem value="Sales Force" className="text-xs">Sales Force</SelectItem>
            </SelectContent>
          </Select>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="h-8 w-[140px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All shifts</SelectItem>
              {shifts.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={empType} onValueChange={setEmpType}>
            <SelectTrigger className="h-8 w-[120px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              {EMPLOYEE_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={empStatus} onValueChange={setEmpStatus}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All status</SelectItem>
              {EMPLOYMENT_STATUS_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b">
                  {[
                    "Employee",
                    "Branch",
                    "Department",
                    "Designation",
                    "Assigned Shift",
                    "Attendance Policy",
                    "Working Schedule",
                    "Weekly Off",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const shiftMissing = isUnassigned(r.shiftName);
                  return (
                    <tr
                      key={r.employee.id}
                      className={cn(
                        "border-b border-border/60",
                        i % 2 === 1 && "bg-muted/20",
                        shiftMissing && "bg-amber-50/40",
                      )}
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/hr/attendance/${r.employee.id}`}
                          className="font-semibold text-foreground hover:text-brand-700"
                        >
                          {r.employee.employeeName}
                        </Link>
                        <p className="font-mono text-[10px] text-brand-700">{r.employee.employeeCode}</p>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{branchLabel(r.employee.branch)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.employee.department}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.employee.designation}</td>
                      <td className="px-3 py-2">
                        <AssignmentValue value={r.shiftName} configRequired />
                      </td>
                      <td className="px-3 py-2">
                        <AssignmentValue value={r.policyName} />
                      </td>
                      <td
                        className="px-3 py-2 text-muted-foreground max-w-[180px] truncate"
                        title={isUnassigned(r.scheduleSummary) ? undefined : r.scheduleSummary}
                      >
                        <AssignmentValue value={r.scheduleSummary} />
                      </td>
                      <td className="px-3 py-2">
                        <AssignmentValue value={r.weeklyOffPattern} />
                      </td>
                      <td className="px-3 py-2 capitalize">{r.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground">
            {visible.length} employees · Shift and Attendance Policy assignments are managed from
            Employee Profile → Attendance.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
