import { redirect } from "next/navigation";

export default function MobileFaceAttendanceRedirectPage() {
  redirect("/hr/settings/attendance/attendance-modes");
}
