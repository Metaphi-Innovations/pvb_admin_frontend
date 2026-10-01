"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { UserRound } from "lucide-react";
import { BRANCH_OPTIONS, DEPARTMENT_OPTIONS } from "@/lib/hr/config";
import { cn } from "@/lib/utils";
import {
  branchLabel,
  buildCompanyRoster,
  listAssignedShiftNames,
} from "../attendance-ops";

/** Employee Attendance index — pick an employee to open history/calendar. */
export default function EmployeeAttendanceIndexClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [shift, setShift] = useState("all");

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
    return list;
  }, [rows, search, branch, dept, shift]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-3">
        <PageHeader
          title="Employee Attendance"
          description="Open any employee’s attendance calendar and monthly history."
          icon={UserRound}
          compact
        />
        <ModuleFiltersBar className="bg-white">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="h-8 w-[180px] text-xs rounded-[10px]"
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
        </ModuleFiltersBar>

        <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="px-3 py-2 text-left font-semibold">Employee</th>
                <th className="px-3 py-2 text-left font-semibold">Department</th>
                <th className="px-3 py-2 text-left font-semibold">Branch</th>
                <th className="px-3 py-2 text-left font-semibold">Shift</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr
                  key={r.employee.id}
                  className={cn(
                    "border-b border-border/60 cursor-pointer hover:bg-brand-50/40",
                    i % 2 === 1 && "bg-muted/20",
                  )}
                  onClick={() => router.push(`/hr/attendance/${r.employee.id}`)}
                >
                  <td className="px-3 py-2">
                    <p className="font-semibold">{r.employee.employeeName}</p>
                    <p className="font-mono text-[10px] text-brand-700">{r.employee.employeeCode}</p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.employee.department}</td>
                  <td className="px-3 py-2 text-muted-foreground">{branchLabel(r.employee.branch)}</td>
                  <td className="px-3 py-2">{r.shiftName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
