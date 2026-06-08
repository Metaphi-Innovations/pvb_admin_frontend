import type { ResolvedAttendanceDay } from "./sf-attendance-data";
import type { SfAttendanceStatus } from "./sf-attendance-data";

export type SfTileStatus = SfAttendanceStatus | "empty";

export const SF_ATTENDANCE_STATUSES: SfAttendanceStatus[] = [
  "present",
  "absent",
  "holiday",
  "week_off",
];

export const STATUS_LABEL: Record<SfAttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  holiday: "Holiday",
  week_off: "Week Off",
};

export const LEGEND_SWATCH: Record<SfAttendanceStatus, string> = {
  present: "bg-emerald-600",
  absent: "bg-red-600",
  holiday: "bg-blue-600",
  week_off: "bg-stone-500",
};

/** Summary card accent */
export const SUMMARY_CARD: Record<SfAttendanceStatus, { bg: string; text: string; border: string }> = {
  present: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  absent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  holiday: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  week_off: { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-300" },
};

/** List / badge styles */
export const BADGE_STYLE: Record<SfAttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  absent: "bg-red-50 text-red-700 border-red-200",
  holiday: "bg-blue-50 text-blue-700 border-blue-200",
  week_off: "bg-stone-100 text-stone-700 border-stone-300",
};

/**
 * Priority: Holiday → Week Off → Present → Absent → Empty
 * (resolved upstream in resolveEmployeeMonthDays)
 */
export function getAttendanceStatusForDate(
  _date: string,
  day: ResolvedAttendanceDay | undefined,
): SfTileStatus {
  if (!day?.status) return "empty";
  return day.status;
}

export function getStatusTileClass(status: SfTileStatus): string {
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
