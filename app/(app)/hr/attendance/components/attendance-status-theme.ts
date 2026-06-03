import type { AttendanceDayStatus } from "../attendance-data";

export const STATUS_THEME: Record<
  AttendanceDayStatus,
  { label: string; cell: string; dot: string; ring: string; pill: string }
> = {
  present: {
    label: "Present",
    cell: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    dot: "bg-emerald-500",
    ring: "ring-emerald-600 ring-2",
    pill: "bg-emerald-600 text-white border-emerald-600",
  },
  absent: {
    label: "Absent",
    cell: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    dot: "bg-red-500",
    ring: "ring-red-600 ring-2",
    pill: "bg-red-50 text-red-700 border-red-300",
  },
  half_day: {
    label: "Half Day",
    cell: "bg-amber-400 text-amber-950 hover:bg-amber-500 shadow-sm",
    dot: "bg-amber-400",
    ring: "ring-amber-500 ring-2",
    pill: "bg-amber-50 text-amber-800 border-amber-300",
  },
  leave: {
    label: "Leave",
    cell: "bg-violet-500 text-white hover:bg-violet-600 shadow-sm",
    dot: "bg-violet-500",
    ring: "ring-violet-600 ring-2",
    pill: "bg-violet-50 text-violet-700 border-violet-300",
  },
  holiday: {
    label: "Holiday",
    cell: "bg-sky-500 text-white hover:bg-sky-600 shadow-sm",
    dot: "bg-sky-500",
    ring: "ring-sky-600 ring-2",
    pill: "bg-sky-50 text-sky-700 border-sky-300",
  },
  week_off: {
    label: "Week Off",
    cell: "bg-stone-400 text-white hover:bg-stone-500 shadow-sm",
    dot: "bg-stone-400",
    ring: "ring-stone-500 ring-2",
    pill: "bg-stone-100 text-stone-700 border-stone-300",
  },
  wfh: {
    label: "WFH",
    cell: "bg-teal-500 text-white hover:bg-teal-600 shadow-sm",
    dot: "bg-teal-500",
    ring: "ring-teal-600 ring-2",
    pill: "bg-teal-50 text-teal-700 border-teal-300",
  },
};

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
