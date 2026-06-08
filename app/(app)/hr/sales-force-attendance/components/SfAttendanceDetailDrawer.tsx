"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SfAttendanceCalendar } from "./SfAttendanceCalendar";
import {
  resolveEmployeeMonthDays,
  getSfEmployees,
  monthLabel,
  type ResolvedAttendanceDay,
  type SfMonthlySummary,
} from "../sf-attendance-data";
import { SfAttendanceDatePanel } from "./SfAttendanceDatePanel";
import {
  BADGE_STYLE,
  STATUS_LABEL,
  SUMMARY_CARD,
} from "../sf-attendance-status-theme";
import type { SfAttendanceStatus } from "../sf-attendance-data";

const SUMMARY_STATUSES: SfAttendanceStatus[] = ["present", "absent", "holiday", "week_off"];

export function SfAttendanceDetailDrawer({
  open,
  summary,
  onClose,
}: {
  open: boolean;
  summary: SfMonthlySummary | null;
  onClose: () => void;
}) {
  const [monthKey, setMonthKey] = useState(summary?.month ?? "");
  const [selectedDay, setSelectedDay] = useState<ResolvedAttendanceDay | null>(null);
  const emp = summary ? getSfEmployees().find((e) => e.employeeId === summary.employeeId) : undefined;

  useEffect(() => {
    if (summary) {
      setMonthKey(summary.month);
      setSelectedDay(null);
    }
  }, [summary]);

  const resolvedDays = useMemo(() => {
    if (!summary) return [];
    return resolveEmployeeMonthDays(summary.employeeId, monthKey || summary.month);
  }, [summary, monthKey]);

  const daysByDate = useMemo(
    () => new Map(resolvedDays.map((d) => [d.date, d])),
    [resolvedDays],
  );

  if (!summary || !emp) return null;

  const mk = monthKey || summary.month;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-5xl w-full flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-sm font-semibold">{summary.employeeName} — Attendance Detail</SheetTitle>
          <p className="text-xs text-muted-foreground">{monthLabel(mk)}</p>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
          <div className="rounded-lg border bg-muted/10 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><p className="text-[10px] text-muted-foreground">Employee Code</p><p className="font-mono font-medium">{summary.employeeCode}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Role</p><p>{summary.role}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Reporting Manager</p><p>{summary.reportingManager}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Territory</p><p>{summary.territory}</p></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUMMARY_STATUSES.map((status) => {
              const card = SUMMARY_CARD[status];
              const count =
                status === "present" ? summary.presentDays
                  : status === "absent" ? summary.absentDays
                    : status === "holiday" ? summary.holidayDays
                      : summary.weekOffDays;
              return (
                <div key={status} className={cn("rounded-lg border p-3 text-center", card.bg, card.border)}>
                  <p className={cn("text-[10px] font-medium", card.text)}>{STATUS_LABEL[status]}</p>
                  <p className={cn("text-2xl font-bold mt-1", card.text)}>{count}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <SfAttendanceCalendar
              monthKey={mk}
              monthTitle={monthLabel(mk)}
              daysByDate={daysByDate}
              selectedDate={selectedDay?.date}
              onMonthChange={(next) => { setMonthKey(next); setSelectedDay(null); }}
              onDateSelect={setSelectedDay}
            />
            <SfAttendanceDatePanel day={selectedDay} />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Daily Attendance</p>
            <div className="page-shell overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="border-b bg-muted/20">
                  <tr>
                    {["Date", "Day", "Status", "Holiday / Week Off Name", "Remarks"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resolvedDays.filter((d) => d.status).length === 0 ? (
                    <tr><td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">No records for this month.</td></tr>
                  ) : (
                    resolvedDays
                      .filter((d) => d.status)
                      .map((d) => <DailyRow key={d.date} day={d} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function DailyRow({ day }: { day: ResolvedAttendanceDay }) {
  if (!day.status) return null;
  const badge = BADGE_STYLE[day.status];
  const eventName =
    day.status === "holiday" || day.status === "week_off"
      ? day.eventName ?? "—"
      : "—";

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="px-2 py-1.5">{day.date}</td>
      <td className="px-2 py-1.5">{day.dayName}</td>
      <td className="px-2 py-1.5">
        <span className={cn("inline-flex px-2 py-0.5 rounded-full border text-[10px] font-medium", badge)}>
          {STATUS_LABEL[day.status]}
        </span>
      </td>
      <td className="px-2 py-1.5">{eventName}</td>
      <td className="px-2 py-1.5 text-muted-foreground">{day.remarks || "—"}</td>
    </tr>
  );
}
