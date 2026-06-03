"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarCheck, CalendarDays, List } from "lucide-react";
import { HrStatusBadge } from "../components/HrStatusBadge";
import { ATTENDANCE_STATUS_OPTIONS } from "@/lib/hr/config";
import { getHrEmployeeById } from "../employees/employee-master-data";
import { AttendanceRecordDrawer } from "./components/AttendanceRecordDrawer";
import { AttendanceMonthCalendar } from "./components/AttendanceMonthCalendar";
import { AttendanceDayPanel } from "./components/AttendanceDayPanel";
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

function monthDateRange(monthKey: string): { from: string; to: string } {
  const [y, mo] = monthKey.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(last).padStart(2, "0")}`,
  };
}

function employeeInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function VibrantStatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "emerald" | "red" | "sky";
}) {
  const styles = {
    emerald: {
      border: "border-t-emerald-500",
      bg: "from-emerald-50/90 via-white to-white",
      text: "text-emerald-700",
      glow: "shadow-emerald-100",
    },
    red: {
      border: "border-t-red-500",
      bg: "from-red-50/90 via-white to-white",
      text: "text-red-600",
      glow: "shadow-red-100",
    },
    sky: {
      border: "border-t-sky-500",
      bg: "from-sky-50/90 via-white to-white",
      text: "text-sky-700",
      glow: "shadow-sky-100",
    },
  }[accent];

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 border-t-4 bg-gradient-to-b shadow-sm px-4 py-3 min-h-[72px] flex flex-col justify-center",
        styles.border,
        styles.bg,
        styles.glow,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-extrabold leading-none mt-1", styles.text)}>{value}</p>
    </div>
  );
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
  const [drawerRecord, setDrawerRecord] = useState<DailyAttendanceRecord | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");

  const employee = getHrEmployeeById(employeeId);
  const allRecords = loadDailyRecords();
  const initials = employee ? employeeInitials(employee.employeeName) : "—";

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
    const list = getRecordsForEmployee(employeeId, {
      dateFrom: range.from,
      dateTo: range.to,
    });
    if (!list.length) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate((prev) => {
      if (prev && list.some((r) => r.date === prev)) return prev;
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0]?.date ?? null;
    });
  }, [employeeId, viewMonth]);

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

  const shiftOptions = useMemo(
    () => getShiftOptions(allRecords.filter((r) => r.employeeId === employeeId)),
    [allRecords, employeeId],
  );

  const handleMonthChange = (mk: string) => {
    setViewMonth(mk);
    router.replace(`/hr/attendance/${employeeId}?month=${mk}&tab=calendar`);
  };

  if (!employee) {
    return (
      <AppLayout>
        <p className="text-sm p-6">Employee not found.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1280px] mx-auto space-y-4">
        <div className="rounded-xl border border-brand-200/60 bg-gradient-to-r from-brand-50/80 via-white to-orange-50/40 px-4 py-3 shadow-sm">
          <PageHeader
            title={employee.employeeName}
            description={`${employee.employeeCode} · ${employee.department} · ${employee.designation}`}
            icon={CalendarCheck}
            breadcrumbs={[
              { label: "HR", href: "/hr/attendance" },
              { label: "Attendance", href: "/hr/attendance" },
              { label: employee.employeeName },
            ]}
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 bg-white"
                onClick={() => router.push("/hr/attendance")}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            }
          />
        </div>

        {monthSummary && (
          <div className="grid grid-cols-3 gap-3">
            <VibrantStatCard label="Present" value={monthSummary.present} accent="emerald" />
            <VibrantStatCard label="Absent" value={monthSummary.absent} accent="red" />
            <VibrantStatCard label="Holiday" value={monthSummary.holiday} accent="sky" />
          </div>
        )}

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
                <span className="opacity-80 ml-1">
                  · P {m.present} / A {m.absent}
                </span>
              </button>
            ))}
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => {
            const t = v as "calendar" | "records";
            setTab(t);
            router.replace(`/hr/attendance/${employeeId}?month=${viewMonth}&tab=${t}`);
          }}
          className="space-y-3"
        >
          <TabsList className="h-9 bg-white border border-border/60 p-1 shadow-sm w-fit">
            <TabsTrigger
              value="calendar"
              className="h-7 px-4 text-xs gap-1.5 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar View
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="h-7 px-4 text-xs gap-1.5 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md"
            >
              <List className="w-3.5 h-3.5" /> List View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              <AttendanceMonthCalendar
                monthKey={viewMonth}
                monthTitle={monthLabel(viewMonth)}
                recordsByDate={recordsByDate}
                selectedDate={selectedDate}
                onSelectDate={(date, record) => setSelectedDate(date)}
                onMonthChange={handleMonthChange}
              />
              <AttendanceDayPanel
                record={selectedRecord}
                employeeInitials={initials}
                onOpenFullDetail={() => selectedRecord && setDrawerRecord(selectedRecord)}
                onRefresh={refreshMonth}
              />
            </div>
          </TabsContent>

          <TabsContent value="records" className="mt-0 space-y-2">
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
                  {ATTENDANCE_STATUS_OPTIONS.map((s) => (
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
          </TabsContent>
        </Tabs>
      </div>

      <AttendanceRecordDrawer
        record={drawerRecord}
        open={!!drawerRecord}
        onClose={() => setDrawerRecord(null)}
      />
    </AppLayout>
  );
}
