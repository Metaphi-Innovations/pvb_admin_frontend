"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecordDetailPage, type RecordDetailTab } from "@/components/record-detail";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Palmtree,
  UserCheck,
  UserX,
} from "lucide-react";
import { HrStatusBadge } from "../components/HrStatusBadge";
import { ATTENDANCE_STATUS_OPTIONS } from "@/lib/hr/config";
import { getHrEmployeeById } from "../employees/employee-master-data";
import { AttendanceRecordDrawer } from "./components/AttendanceRecordDrawer";
import { AttendanceMonthCalendar } from "./components/AttendanceMonthCalendar";
import { AttendanceDayPanel } from "./components/AttendanceDayPanel";
import { SfAttendanceCalendar } from "../sales-force-attendance/components/SfAttendanceCalendar";
import { SfAttendanceDatePanel } from "../sales-force-attendance/components/SfAttendanceDatePanel";
import {
  getSfEmployees,
  resolveEmployeeMonthDays,
  type ResolvedAttendanceDay,
} from "../sales-force-attendance/sf-attendance-data";
import {
  getAttendanceStatusForDate,
  type CalendarTileStatus,
} from "./components/attendance-status-theme";
import {
  buildMonthlySummaries,
  currentMonthKey,
  formatPunchTime,
  getRecordsForEmployee,
  getShiftOptions,
  loadDailyRecords,
  monthLabel,
  type DailyAttendanceRecord,
} from "./attendance-data";

const ATTENDANCE_TABS: RecordDetailTab[] = [
  { value: "calendar", label: "Calendar View" },
  { value: "records", label: "List View" },
];

function monthDateRange(monthKey: string): { from: string; to: string } {
  const [y, mo] = monthKey.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(last).padStart(2, "0")}`,
  };
}

export default function EmployeeAttendancePageClient({ employeeId }: { employeeId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month") ?? currentMonthKey();
  const tabParam = searchParams.get("tab");

  const [tab, setTab] = useState<"calendar" | "records">("calendar");
  const [viewMonth, setViewMonth] = useState(monthParam);
  const [records, setRecords] = useState<DailyAttendanceRecord[]>([]);
  const [monthRecords, setMonthRecords] = useState<DailyAttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTileStatus, setSelectedTileStatus] = useState<CalendarTileStatus>("empty");
  const [selectedSfDay, setSelectedSfDay] = useState<ResolvedAttendanceDay | null>(null);
  const [drawerRecord, setDrawerRecord] = useState<DailyAttendanceRecord | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");

  const employee = getHrEmployeeById(employeeId);
  const allRecords = loadDailyRecords();
  const isSfEmployee = getSfEmployees().some((e) => e.employeeId === employeeId);

  useEffect(() => {
    setViewMonth(monthParam);
    const range = monthDateRange(monthParam);
    setDateFrom(range.from);
    setDateTo(range.to);
    setTab(tabParam === "records" ? "records" : "calendar");
  }, [monthParam, tabParam]);

  const refreshList = useCallback(() => {
    setRecords(
      getRecordsForEmployee(employeeId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter,
        shift: shiftFilter,
      }),
    );
  }, [employeeId, dateFrom, dateTo, statusFilter, shiftFilter]);

  const refreshMonth = useCallback(() => {
    const range = monthDateRange(viewMonth);
    const list = getRecordsForEmployee(employeeId, {
      dateFrom: range.from,
      dateTo: range.to,
    });
    setMonthRecords(list);
  }, [employeeId, viewMonth]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    refreshMonth();
  }, [refreshMonth]);

  useEffect(() => {
    const range = monthDateRange(viewMonth);
    if (isSfEmployee) {
      const days = resolveEmployeeMonthDays(employeeId, viewMonth);
      const withStatus = days.filter((d) => d.status);
      if (!withStatus.length) {
        setSelectedDate(null);
        setSelectedSfDay(null);
        return;
      }
      setSelectedSfDay((prev) => {
        if (prev && withStatus.some((d) => d.date === prev.date)) return prev;
        return withStatus[withStatus.length - 1];
      });
      setSelectedDate((prev) => {
        if (prev && withStatus.some((d) => d.date === prev)) return prev;
        return withStatus[withStatus.length - 1]?.date ?? null;
      });
      return;
    }
    const list = getRecordsForEmployee(employeeId, {
      dateFrom: range.from,
      dateTo: range.to,
    });
    if (!list.length) {
      setSelectedDate(null);
      setSelectedTileStatus("empty");
      return;
    }
    setSelectedDate((prev) => {
      if (prev && list.some((r) => r.date === prev)) {
        const rec = list.find((r) => r.date === prev);
        setSelectedTileStatus(getAttendanceStatusForDate(prev, rec));
        return prev;
      }
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
      const next = sorted[0];
      if (next) setSelectedTileStatus(getAttendanceStatusForDate(next.date, next));
      return next?.date ?? null;
    });
  }, [employeeId, viewMonth, isSfEmployee]);

  const monthlyRows = useMemo(
    () => buildMonthlySummaries(employeeId, allRecords),
    [employeeId, allRecords],
  );

  const monthSummary = monthlyRows.find((m) => m.month === viewMonth) ?? monthlyRows[0];

  const recordsByDate = useMemo(() => {
    const map = new Map<string, DailyAttendanceRecord>();
    monthRecords.forEach((r) => map.set(r.date, r));
    return map;
  }, [monthRecords]);

  const selectedRecord = selectedDate ? recordsByDate.get(selectedDate) ?? null : null;

  const sfDaysByDate = useMemo(() => {
    if (!isSfEmployee) return new Map<string, ResolvedAttendanceDay>();
    return new Map(resolveEmployeeMonthDays(employeeId, viewMonth).map((d) => [d.date, d]));
  }, [isSfEmployee, employeeId, viewMonth]);

  const sfMonthCounts = useMemo(() => {
    const days = [...sfDaysByDate.values()];
    return {
      present: days.filter((d) => d.status === "present").length,
      absent: days.filter((d) => d.status === "absent").length,
      holiday: days.filter((d) => d.status === "holiday").length,
      weekOff: days.filter((d) => d.status === "week_off").length,
    };
  }, [sfDaysByDate]);

  const CALENDAR_STATUS_OPTIONS = ATTENDANCE_STATUS_OPTIONS.filter((s) =>
    ["present", "absent", "holiday", "week_off"].includes(s.value),
  );

  const shiftOptions = useMemo(
    () => getShiftOptions(allRecords.filter((r) => r.employeeId === employeeId)),
    [allRecords, employeeId],
  );

  const handleMonthChange = (mk: string) => {
    setViewMonth(mk);
    router.replace(`/hr/attendance/${employeeId}?month=${mk}&tab=calendar`);
  };

  const handleTabChange = (value: string) => {
    const t = value as "calendar" | "records";
    setTab(t);
    router.replace(`/hr/attendance/${employeeId}?month=${viewMonth}&tab=${t}`);
  };

  if (!employee) {
    return <p className="text-sm p-6">Employee not found.</p>;
  }

  const presentCount = isSfEmployee ? sfMonthCounts.present : (monthSummary?.present ?? 0);
  const absentCount = isSfEmployee ? sfMonthCounts.absent : (monthSummary?.absent ?? 0);
  const holidayCount = isSfEmployee ? sfMonthCounts.holiday : (monthSummary?.holiday ?? 0);
  const weekOffCount = isSfEmployee ? sfMonthCounts.weekOff : (monthSummary?.weekOff ?? 0);

  return (
    <>
      <RecordDetailPage
        listHref="/hr/attendance"
        listLabel="Attendance"
        recordName={employee.employeeName}
        recordCode={employee.employeeCode}
        statusLabel={employee.status === "active" ? "Active" : "Inactive"}
        statusVariant={employee.status === "active" ? "active" : "inactive"}
        metaItems={[
          { icon: Building2, label: employee.department },
          { icon: Briefcase, label: employee.designation },
        ]}
        kpis={[
          {
            icon: UserCheck,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: String(presentCount),
            label: "Present",
          },
          {
            icon: UserX,
            iconBg: "bg-red-100",
            iconColor: "text-red-700",
            value: String(absentCount),
            label: "Absent",
          },
          {
            icon: Palmtree,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-700",
            value: String(holidayCount),
            label: "Holiday",
          },
          {
            icon: CalendarDays,
            iconBg: "bg-stone-100",
            iconColor: "text-stone-700",
            value: String(weekOffCount),
            label: "Week Off",
          },
        ]}
        tabs={ATTENDANCE_TABS}
        activeTab={tab}
        onTabChange={handleTabChange}
      >
        <div className="space-y-4">
          {monthlyRows.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {monthlyRows.map((m) => (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => handleMonthChange(m.month)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                    viewMonth === m.month
                      ? "bg-brand-600 text-white border-brand-600 shadow-md"
                      : "bg-white text-muted-foreground border-border hover:border-brand-300 hover:text-brand-700",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {tab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
              {isSfEmployee ? (
                <SfAttendanceCalendar
                  monthKey={viewMonth}
                  monthTitle={monthLabel(viewMonth)}
                  daysByDate={sfDaysByDate}
                  selectedDate={selectedSfDay?.date ?? selectedDate}
                  onMonthChange={handleMonthChange}
                  onDateSelect={(day) => {
                    setSelectedSfDay(day);
                    setSelectedDate(day.date);
                  }}
                />
              ) : (
                <AttendanceMonthCalendar
                  monthKey={viewMonth}
                  monthTitle={monthLabel(viewMonth)}
                  recordsByDate={recordsByDate}
                  selectedDate={selectedDate}
                  onSelectDate={(date, record, status) => {
                    setSelectedDate(date);
                    setSelectedTileStatus(status);
                  }}
                  onMonthChange={handleMonthChange}
                />
              )}
              {isSfEmployee ? (
                <SfAttendanceDatePanel day={selectedSfDay} />
              ) : (
                <AttendanceDayPanel
                  date={selectedDate}
                  record={selectedRecord}
                  tileStatus={selectedTileStatus}
                  onOpenFullDetail={() => selectedRecord && setDrawerRecord(selectedRecord)}
                />
              )}
            </div>
          )}

          {tab === "records" && (
            <div className="space-y-2">
              <ModuleFiltersBar className="bg-white border-brand-100/80 shadow-sm">
                <Input
                  type="date"
                  className="h-8 w-[130px] text-xs bg-white"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <Input
                  type="date"
                  className="h-8 w-[130px] text-xs bg-white"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[120px] text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Status
                    </SelectItem>
                    {CALENDAR_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={shiftFilter} onValueChange={setShiftFilter}>
                  <SelectTrigger className="h-8 w-[200px] text-xs bg-white">
                    <SelectValue placeholder="Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Shifts
                    </SelectItem>
                    {shiftOptions.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ModuleFiltersBar>

              <div className="rounded-xl border border-border/80 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-340px)]">
                  <table className="w-full text-table border-collapse">
                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-brand-600 to-brand-700">
                      <tr>
                        {[
                          "Date",
                          "Day",
                          "Shift",
                          "First In",
                          "Last Out",
                          "Working Hours",
                          "Late By",
                          "Early Exit",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/95 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-3 py-12 text-center text-xs text-muted-foreground"
                          >
                            No attendance records for selected filters.
                          </td>
                        </tr>
                      ) : (
                        records.map((r, idx) => (
                          <tr
                            key={r.id}
                            className={cn(
                              "border-b border-border/40 cursor-pointer transition-colors",
                              idx % 2 === 0 ? "bg-white" : "bg-brand-50/20",
                              "hover:bg-brand-100/40",
                            )}
                            onClick={() => setDrawerRecord(r)}
                          >
                            <td className="px-3 py-2.5 text-xs font-semibold text-brand-900">
                              {r.date}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.dayName}</td>
                            <td
                              className="px-3 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate"
                              title={r.shift}
                            >
                              {r.shift}
                            </td>
                            <td className="px-3 py-2.5 text-xs tabular-nums font-medium">
                              {r.firstIn ? formatPunchTime(r.firstIn) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs tabular-nums font-medium">
                              {r.lastOut ? formatPunchTime(r.lastOut) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs font-semibold">{r.workingHours}</td>
                            <td className="px-3 py-2.5 text-xs text-amber-800">{r.lateBy}</td>
                            <td className="px-3 py-2.5 text-xs text-orange-700">{r.earlyExit}</td>
                            <td className="px-3 py-2.5">
                              <HrStatusBadge status={r.attendanceStatus} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </RecordDetailPage>

      <AttendanceRecordDrawer
        record={drawerRecord}
        open={!!drawerRecord}
        onClose={() => setDrawerRecord(null)}
      />
    </>
  );
}
