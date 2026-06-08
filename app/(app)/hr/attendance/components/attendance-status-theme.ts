import type { DailyAttendanceRecord } from "../attendance-data";

/** Only these 4 statuses appear on the attendance calendar. */
export type CalendarTileStatus = "present" | "absent" | "holiday" | "week_off" | "empty";

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
 * Priority: Holiday → Week Off → Present → Absent → Empty
 * (legacy half_day / leave / wfh are excluded from the calendar)
 */
export function getAttendanceStatusForDate(
  _date: string,
  record: DailyAttendanceRecord | undefined,
): CalendarTileStatus {
  if (!record) return "empty";
  const s = record.attendanceStatus;
  if (s === "holiday") return "holiday";
  if (s === "week_off") return "week_off";
  if (s === "present") return "present";
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
