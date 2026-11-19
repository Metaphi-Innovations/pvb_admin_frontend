import { redirect } from "next/navigation";

/** Legacy Mobile Face → Shift Setup (modes section on Add/Edit Shift). */
export default function MobileFaceAttendanceRedirectPage() {
  redirect("/hr/settings/attendance/shift-setup");
}
