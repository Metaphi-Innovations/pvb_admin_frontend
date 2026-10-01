import type { DailyAttendanceRecord } from "../attendance-data";
import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { resolveOfficeDay, type OfficeCalendarTileStatus } from "../office-attendance-resolve";

/** Only these 4 statuses appear on the attendance calendar. */
export type CalendarTileStatus = OfficeCalendarTileStatus;
export const CALENDAR_LEGEND_STATUSES = [
  "present",
  "absent",
  "holiday",
  "week_off",
] as const satisfies readonly Exclude<CalendarTileStatus, "empty">[];

export const STATUS_LABELS: Record<Exclude<CalendarTileStatus, "empty">, string> = {
  present: "Present",
  absent: "Absent",
  holiday: "Holiday",
  week_off: "Week Off",
};

export const LEGEND_DOT: Record<Exclude<CalendarTileStatus, "empty">, string> = {
  present: "bg-emerald-600",
  absent: "bg-red-600",
  holiday: "bg-blue-600",
  week_off: "bg-stone-500",
};

/**
 * Resolve display status for a calendar date.
 * Prefer canonical Holiday Calendar + Shift Setup when employee is provided.
 * Pass monthRecords when available so late-limit / policy evaluation is consistent.
 */
export function getAttendanceStatusForDate(
  date: string,
  record: DailyAttendanceRecord | undefined,
  employee?: Pick<HrEmployee, "id" | "employeeCode" | "branch" | "profileSummaries"> | null,
  monthRecords?: DailyAttendanceRecord[],
): CalendarTileStatus {
  if (employee) {
    return resolveOfficeDay(employee, date, record, monthRecords).tile;
  }
  // Legacy fallback — record-only (should not be used for office UI after consolidation)
  if (!record) return "empty";
  const s = record.attendanceStatus;
  if (s === "present" || s === "wfh") return "present";
  if (s === "absent") return "absent";
  return "empty";
}

export function getStatusTileClass(status: CalendarTileStatus): string {
  switch (status) {
    case "present":
      return "bg-emerald-600 text-white border-emerald-700";
    case "absent":
      return "bg-red-600 text-white border-red-700";
    case "holiday":
      return "bg-blue-600 text-white border-blue-700";
    case "week_off":
      return "bg-stone-500 text-white border-stone-600";
    default:
      return "bg-white text-slate-600 border-slate-200";
  }
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function buildCalendarCells(monthKey: string): Array<{ date: string | null; day: number | null }> {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const pad = first.getDay();
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < pad; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${monthKey}-${String(d).padStart(2, "0")}`,
      day: d,
    });
  }
  return cells;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
