"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const EmployeeAttendancePage = createLazyClientPage(
  () => import("../EmployeeAttendancePageClient"),
);

function EmployeeAttendanceRoute() {
  const params = useParams();
  const employeeId = Number(params.employeeId);
  if (!employeeId || Number.isNaN(employeeId)) {
    return <p className="text-sm p-6">Invalid employee.</p>;
  }
  return <EmployeeAttendancePage employeeId={employeeId} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm p-6">Loading attendance…</p>}>
      <EmployeeAttendanceRoute />
    </Suspense>
  );
}
