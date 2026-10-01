"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TravelRequestFormClient from "../../TravelRequestFormClient";
import { getTravelRequestById, type EmployeeTravelRequest } from "../../travel-request-data";
import { EmployeeClaimsShell } from "@/app/(app)/employee/claims/EmployeeClaimsShell";

export default function EditTravelRequestPage() {
  const params = useParams();
  const id = Number(params.id);
  const [req, setReq] = useState<EmployeeTravelRequest | null>(null);

  useEffect(() => {
    setReq(getTravelRequestById(id) ?? null);
  }, [id]);

  if (!req) {
    return (
      <EmployeeClaimsShell title="Edit Travel Request" backHref="/employee/travel-requests">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </EmployeeClaimsShell>
    );
  }

  if (req.status !== "draft" && req.status !== "returned") {
    return (
      <EmployeeClaimsShell title={req.requestNo} backHref={`/employee/travel-requests/${req.id}`}>
        <p className="text-sm text-muted-foreground">This request cannot be edited.</p>
      </EmployeeClaimsShell>
    );
  }

  return <TravelRequestFormClient mode="edit" initial={req} />;
}
