import { redirect } from "next/navigation";

/** Compatibility: Attendance Modes are configured inside Shift Setup. */
export default function AttendanceModesRedirectPage() {
  redirect("/hr/settings/attendance/shift-setup");
}
