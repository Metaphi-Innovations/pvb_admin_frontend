"use client";

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
import { Eye, Pencil, Radio } from "lucide-react";
import { BRANCH_OPTIONS, DEPARTMENT_OPTIONS, EMPLOYEE_TYPE_OPTIONS } from "@/lib/hr/config";
import { cn } from "@/lib/utils";
import { AttendanceCorrectionDrawer } from "../components/AttendanceCorrectionDrawer";
import {
  branchLabel,
  buildAttendanceForDate,
  countLiveStates,
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
        "rounded-[12px] border px-3 py-2 text-left min-w-[88px] transition-colors",
        active ? "border-brand-400 bg-brand-50" : "border-border bg-white hover:bg-muted/30",
      )}
    >
      <p className="text-lg font-bold leading-none text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </button>
  );
}

export default function LiveAttendancePageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [shift, setShift] = useState("all");
  const [empType, setEmpType] = useState("all");
  const [liveFilter, setLiveFilter] = useState<string>("all");
  const [editRow, setEditRow] = useState<AttendanceEmployeeDayRow | null>(null);

  const date = todayIso();
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, refresh]);

  const rows = useMemo(() => {
    if (!ready) return [];
    void tick;
    return buildAttendanceForDate(date);
  }, [ready, date, tick]);

  const shifts = useMemo(() => (ready ? listAssignedShiftNames() : []), [ready, tick]);
  const counts = useMemo(() => countLiveStates(rows), [rows]);

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
    if (liveFilter === "in") list = list.filter((r) => r.liveState === "in" || r.liveState === "late");
    if (liveFilter === "out")
      list = list.filter((r) => r.liveState === "out" || r.liveState === "early_leaving");
    if (liveFilter === "no_punch") list = list.filter((r) => r.liveState === "no_punch");
    if (liveFilter === "break") list = list.filter((r) => r.liveState === "break");
    if (liveFilter === "late") list = list.filter((r) => r.lateMinutes > 0);
    if (liveFilter === "early") list = list.filter((r) => r.earlyMinutes > 0);
    return list;
  }, [rows, search, branch, dept, shift, empType, liveFilter]);

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto space-y-3">
        <PageHeader
          title="Live Attendance"
          description={`Today’s snapshot (${date}) from attendance records — not live GPS or device streaming.`}
          icon={Radio}
          compact
        />

        <div className="flex flex-wrap gap-2">
          <StatChip label="In" value={counts.in} active={liveFilter === "in"} onClick={() => setLiveFilter(liveFilter === "in" ? "all" : "in")} />
          <StatChip label="Out" value={counts.out} active={liveFilter === "out"} onClick={() => setLiveFilter(liveFilter === "out" ? "all" : "out")} />
          <StatChip label="No Punch In" value={counts.noPunch} active={liveFilter === "no_punch"} onClick={() => setLiveFilter(liveFilter === "no_punch" ? "all" : "no_punch")} />
          <StatChip label="Break" value={counts.break} active={liveFilter === "break"} onClick={() => setLiveFilter(liveFilter === "break" ? "all" : "break")} />
          <StatChip label="Late" value={counts.late} active={liveFilter === "late"} onClick={() => setLiveFilter(liveFilter === "late" ? "all" : "late")} />
          <StatChip label="Early Leaving" value={counts.earlyLeaving} active={liveFilter === "early"} onClick={() => setLiveFilter(liveFilter === "early" ? "all" : "early")} />
        </div>

        <ModuleFiltersBar className="bg-white">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="h-8 w-[180px] text-xs rounded-[10px]"
          />
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="h-8 w-[140px] text-xs rounded-[10px]"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All branches</SelectItem>
              {BRANCH_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value} className="text-xs">{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-[10px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All depts</SelectItem>
              {DEPARTMENT_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
              ))}
              <SelectItem value="Sales Force" className="text-xs">Sales Force</SelectItem>
            </SelectContent>
          </Select>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="h-8 w-[140px] text-xs rounded-[10px]"><SelectValue placeholder="Shift" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All shifts</SelectItem>
              {shifts.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={empType} onValueChange={setEmpType}>
            <SelectTrigger className="h-8 w-[120px] text-xs rounded-[10px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              {EMPLOYEE_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">Employee</th>
                  <th className="px-3 py-2 text-left font-semibold">Branch / Dept</th>
                  <th className="px-3 py-2 text-left font-semibold">Shift</th>
                  <th className="px-3 py-2 text-left font-semibold">First In</th>
                  <th className="px-3 py-2 text-left font-semibold">Latest</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Late</th>
                  <th className="px-3 py-2 text-left font-semibold">Early</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                      No employees match filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((r, i) => (
                    <tr
                      key={r.employee.id}
                      className={cn(
                        "border-b border-border/60 group",
                        i % 2 === 1 && "bg-muted/20",
                        "hover:bg-muted/30",
                      )}
                    >
                      <td className="px-3 py-2">
                        <p className="font-semibold text-foreground">{r.employee.employeeName}</p>
                        <p className="font-mono text-[10px] text-brand-700">{r.employee.employeeCode}</p>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {branchLabel(r.employee.branch)}
                        <br />
                        {r.employee.department}
                      </td>
                      <td className="px-3 py-2">{r.shiftName}</td>
                      <td className="px-3 py-2">{r.firstIn ? formatPunchTime(r.firstIn) : "—"}</td>
                      <td className="px-3 py-2">
                        {r.lastOut
                          ? formatPunchTime(r.lastOut)
                          : r.firstIn
                            ? formatPunchTime(r.firstIn)
                            : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted">
                          {r.liveStateLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">{r.lateMinutes > 0 ? `${r.lateMinutes}m` : "—"}</td>
                      <td className="px-3 py-2">{r.earlyMinutes > 0 ? `${r.earlyMinutes}m` : "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            className="p-1.5 rounded-[10px] hover:bg-muted"
                            title="View"
                            onClick={() => router.push(`/hr/attendance/${r.employee.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-[10px] hover:bg-muted"
                            title="Edit"
                            onClick={() => setEditRow(r)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground flex justify-between">
            <span>
              Showing <span className="font-medium text-foreground">{visible.length}</span> of{" "}
              <span className="font-medium text-foreground">{rows.length}</span>
            </span>
            <Link href="/hr/attendance/daily" className="text-brand-600 hover:underline">
              Open Daily Attendance
            </Link>
          </div>
        </div>
      </div>

      <AttendanceCorrectionDrawer
        open={!!editRow}
        row={editRow}
        onClose={() => setEditRow(null)}
        onSaved={refresh}
      />
    </AppLayout>
  );
}
