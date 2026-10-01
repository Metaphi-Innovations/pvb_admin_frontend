"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy Sales Force Attendance workspace → canonical Attendance Dashboard.
 * SF stores/UI files remain on disk (LEGACY RETAINED) for later cleanup.
 */
export default function SalesForceAttendanceRedirect() {
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
