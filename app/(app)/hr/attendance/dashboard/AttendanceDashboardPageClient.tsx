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
import { LayoutDashboard, Eye } from "lucide-react";
import {
  BRANCH_OPTIONS,
  DEPARTMENT_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
} from "@/lib/hr/config";
import { cn } from "@/lib/utils";
import { currentMonthKey, monthLabel } from "../attendance-data";
import {
  buildDashboardRows,
  listAssignedShiftNames,
} from "../attendance-ops";

export default function AttendanceDashboardPageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(() => currentMonthKey());
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [shift, setShift] = useState("all");
  const [empType, setEmpType] = useState("all");
  const [empStatus, setEmpStatus] = useState("all");

  React.useEffect(() => {
    setReady(true);
  }, []);

  const rows = useMemo(() => (ready ? buildDashboardRows(month) : []), [ready, month]);
  const shifts = useMemo(() => (ready ? listAssignedShiftNames() : []), [ready]);

  const monthOptions = useMemo(() => {
    const opts = [month];
    const [y, m] = month.split("-").map(Number);
    for (let i = 1; i <= 5; i++) {
      const d = new Date(y, m - 1 - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return opts;
  }, [month]);

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
          title="Attendance Dashboard"
          description="Monthly summary for all employees — Present, Absent, Leave, Late, OT from canonical resolution."
          icon={LayoutDashboard}
          compact
        />

        <ModuleFiltersBar className="bg-white">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 w-[150px] text-xs rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 w-[150px] text-xs rounded-[10px]"
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
                    "Dept",
                    "Designation",
                    "Present",
                    "Absent",
                    "Half",
                    "WO",
                    "Holiday",
                    "Paid Leave",
                    "Unpaid Leave",
                    "Late",
                    "Early",
                    "OT",
                    "",
                  ].map((h) => (
                    <th key={h || "a"} className="px-2.5 py-2 text-left font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr
                    key={r.employee.id}
                    className={cn(
                      "border-b border-border/60 group cursor-pointer",
                      i % 2 === 1 && "bg-muted/20",
                      "hover:bg-brand-50/40",
                    )}
                    onClick={() =>
                      router.push(`/hr/attendance/${r.employee.id}?month=${month}&tab=calendar`)
                    }
                  >
                    <td className="px-2.5 py-2">
                      <p className="font-semibold">{r.employee.employeeName}</p>
                      <p className="font-mono text-[10px] text-brand-700">{r.employee.employeeCode}</p>
                    </td>
                    <td className="px-2.5 py-2 text-muted-foreground">{r.employee.department}</td>
                    <td className="px-2.5 py-2 text-muted-foreground">{r.employee.designation}</td>
                    <td className="px-2.5 py-2 text-emerald-700 font-medium">{r.present}</td>
                    <td className="px-2.5 py-2 text-red-600">{r.absent}</td>
                    <td className="px-2.5 py-2 text-amber-700">{r.halfDay}</td>
                    <td className="px-2.5 py-2">{r.weekOff}</td>
                    <td className="px-2.5 py-2 text-blue-700">{r.holiday}</td>
                    <td className="px-2.5 py-2">{r.paidLeave}</td>
                    <td className="px-2.5 py-2">{r.unpaidLeave}</td>
                    <td className="px-2.5 py-2">{r.late}</td>
                    <td className="px-2.5 py-2">{r.earlyGoing}</td>
                    <td className="px-2.5 py-2">
                      {r.overtimeMinutes > 0 ? `${Math.floor(r.overtimeMinutes / 60)}h` : "—"}
                    </td>
                    <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="p-1.5 rounded-[10px] hover:bg-muted opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          router.push(`/hr/attendance/${r.employee.id}?month=${month}`)
                        }
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground">
            {visible.length} employees · {monthLabel(month)}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
