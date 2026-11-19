import { redirect } from "next/navigation";

/** Compatibility: Attendance Policy is configured inside Shift Setup. */
export default function AttendancePolicyRedirectPage() {
  redirect("/hr/settings/attendance/shift-setup");
}
