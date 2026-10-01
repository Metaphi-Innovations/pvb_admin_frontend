import { redirect } from "next/navigation";

/**
 * Legacy Weekly Off master — removed from Settings navigation.
 * Weekly offs live inside Attendance Settings → Shift Setup.
 * Route kept as redirect for old bookmarks; weekly-off-data.ts retained (not runtime for attendance).
 */
export default function WeeklyOffRedirectPage() {
  redirect("/hr/settings/attendance/shift-setup");
}
