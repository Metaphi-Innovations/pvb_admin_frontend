"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy Office Attendance listing → unified Dashboard */
export default function AttendanceIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hr/attendance/dashboard");
  }, [router]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-xs text-muted-foreground">
      Redirecting to Attendance Dashboard…
    </div>
  );
}
