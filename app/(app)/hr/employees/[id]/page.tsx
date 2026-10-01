"use client";

import { useParams } from "next/navigation";
import EmployeeProfileClient from "../EmployeeProfileClient";

export default function ViewEmployeePage() {
  const params = useParams();
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <p className="text-sm font-semibold">Invalid employee</p>
      </div>
    );
  }

  return <EmployeeProfileClient employeeId={id} />;
}
