"use client";

import { useParams } from "next/navigation";
import EmployeeProfileClient from "../../EmployeeProfileClient";

/**
 * Edit Employee — full 360° profile Edit Mode (not the simplified create form).
 * Reuses EmployeeProfileClient so Personal / Employment / Bank / Gov IDs /
 * Education / Experience share one canonical editor with the profile workspace.
 */
export default function EditEmployeePage() {
  const params = useParams();
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <p className="text-sm font-semibold">Invalid employee</p>
      </div>
    );
  }

  return <EmployeeProfileClient employeeId={id} initialEditMode />;
}
