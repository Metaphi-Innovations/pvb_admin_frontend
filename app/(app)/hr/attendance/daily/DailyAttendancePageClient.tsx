"use client";

import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { CalendarDays, Eye, Pencil } from "lucide-react";
import { BRANCH_OPTIONS, DEPARTMENT_OPTIONS } from "@/lib/hr/config";
import { cn } from "@/lib/utils";
import { AttendanceCorrectionDrawer } from "../components/AttendanceCorrectionDrawer";
import {
  branchLabel,
  buildAttendanceForDate,
  countDailyStatuses,
  formatPunchTime,
  listAssignedShiftNames,
  todayIso,
  type AttendanceEmployeeDayRow,
} from "../attendance-ops";

function StatChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[12px] border px-3 py-2 text-left min-w-[80px]",
        active ? "border-brand-400 bg-brand-50" : "border-border bg-white hover:bg-muted/30",
      )}
    >
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </button>
  );
}

export default function DailyAttendancePageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(() => todayIso());
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [shift, setShift] = useState("all");
  const [status, setStatus] = useState("all");
  const [editRow, setEditRow] = useState<AttendanceEmployeeDayRow | null>(null);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, refresh, date]);

  const rows = useMemo(() => {
    if (!ready) return [];
    void tick;
    return buildAttendanceForDate(date);
  }, [ready, date, tick]);

  const counts = useMemo(() => countDailyStatuses(rows), [rows]);
  const shifts = useMemo(() => (ready ? listAssignedShiftNames() : []), [ready, tick]);

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
    if (status !== "all") {
      list = list.filter((r) => {
        if (status === "present") return r.status === "present" || r.status === "wfh" || r.status === "hr_review";
        if (status === "week_off") return r.status === "week_off";
        return r.status === status;
      });
    }
    return list;
  }, [rows, search, branch, dept, shift, status]);

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto space-y-3">
        <PageHeader
          title="Daily Attendance"
          description="All employees — status from canonical Shift, Holiday, Leave, and Attendance Policy resolution."
          icon={CalendarDays}
          compact
        />

        <div className="flex flex-wrap gap-2">
          <StatChip label="Present" value={counts.present} active={status === "present"} onClick={() => setStatus(status === "present" ? "all" : "present")} />
          <StatChip label="Absent" value={counts.absent} active={status === "absent"} onClick={() => setStatus(status === "absent" ? "all" : "absent")} />
          <StatChip label="Half Day" value={counts.halfDay} active={status === "half_day"} onClick={() => setStatus(status === "half_day" ? "all" : "half_day")} />
          <StatChip label="Leave" value={counts.leave} active={status === "leave"} onClick={() => setStatus(status === "leave" ? "all" : "leave")} />
          <StatChip label="Week Off" value={counts.weekOff} active={status === "week_off"} onClick={() => setStatus(status === "week_off" ? "all" : "week_off")} />
          <StatChip label="Holiday" value={counts.holiday} active={status === "holiday"} onClick={() => setStatus(status === "holiday" ? "all" : "holiday")} />
        </div>

        <ModuleFiltersBar className="bg-white">
          <HrDateInput className="h-8 w-[140px] text-xs rounded-[10px] bg-white" value={date} onChange={setDate} aria-label="Date" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="h-8 w-[160px] text-xs rounded-[10px]" />
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[120px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All status</SelectItem>
              <SelectItem value="present" className="text-xs">Present</SelectItem>
              <SelectItem value="absent" className="text-xs">Absent</SelectItem>
              <SelectItem value="half_day" className="text-xs">Half Day</SelectItem>
              <SelectItem value="leave" className="text-xs">Leave</SelectItem>
              <SelectItem value="week_off" className="text-xs">Week Off</SelectItem>
              <SelectItem value="holiday" className="text-xs">Holiday</SelectItem>
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b">
                  {["Employee", "Dept", "Branch", "Shift", "In", "Out", "Hours", "Late", "Early", "OT", "Status", ""].map(
                    (h) => (
                      <th key={h || "a"} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.employee.id} className={cn("border-b border-border/60 group", i % 2 === 1 && "bg-muted/20")}>
                    <td className="px-3 py-2">
                      <p className="font-semibold">{r.employee.employeeName}</p>
                      <p className="font-mono text-[10px] text-brand-700">{r.employee.employeeCode}</p>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.employee.department}</td>
                    <td className="px-3 py-2 text-muted-foreground">{branchLabel(r.employee.branch)}</td>
                    <td className="px-3 py-2">{r.shiftName}</td>
                    <td className="px-3 py-2">{r.firstIn ? formatPunchTime(r.firstIn) : "—"}</td>
                    <td className="px-3 py-2">{r.lastOut ? formatPunchTime(r.lastOut) : "—"}</td>
                    <td className="px-3 py-2">{r.workingHoursLabel}</td>
                    <td className="px-3 py-2">{r.lateMinutes > 0 ? `${r.lateMinutes}m` : "—"}</td>
                    <td className="px-3 py-2">{r.earlyMinutes > 0 ? `${r.earlyMinutes}m` : "—"}</td>
                    <td className="px-3 py-2">{r.overtimeMinutes > 0 ? `${r.overtimeMinutes}m` : "—"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-muted font-medium text-[11px]">
                        {r.statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                        <button type="button" className="p-1.5 rounded-[10px] hover:bg-muted" onClick={() => router.push(`/hr/attendance/${r.employee.id}`)}>
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button type="button" className="p-1.5 rounded-[10px] hover:bg-muted" onClick={() => setEditRow(r)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground flex justify-between">
            <span>
              Showing <span className="font-medium text-foreground">{visible.length}</span> employees
            </span>
            <Link href="/hr/attendance/dashboard" className="text-brand-600 hover:underline">
              Monthly Dashboard
            </Link>
          </div>
        </div>
      </div>
      <AttendanceCorrectionDrawer open={!!editRow} row={editRow} onClose={() => setEditRow(null)} onSaved={refresh} />
    </AppLayout>
  );
}
