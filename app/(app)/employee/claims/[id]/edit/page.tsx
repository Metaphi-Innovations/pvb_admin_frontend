"use client";

import { useEffect, useState } from "react";
import ClaimFormClient from "../../ClaimFormClient";
import { EmployeeClaimsShell } from "../../EmployeeClaimsShell";
import { getTravelClaimById, isClaimEditable, type EmployeeTravelClaim } from "../../travel-claim-data";

export default function EditClaimPage({ params }: { params: { id: string } }) {
  const [claim, setClaim] = useState<EmployeeTravelClaim | null | undefined>(undefined);

  useEffect(() => {
    setClaim(getTravelClaimById(Number(params.id)) ?? null);
  }, [params.id]);

  if (claim === undefined) {
    return (
      <EmployeeClaimsShell title="Edit Claim" backHref="/employee/claims">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </EmployeeClaimsShell>
    );
  }
  if (!claim) {
    return (
      <EmployeeClaimsShell title="Edit Claim" backHref="/employee/claims">
        <p className="text-sm text-muted-foreground">Claim not found.</p>
      </EmployeeClaimsShell>
    );
  }
  if (!isClaimEditable(claim.status)) {
    return (
      <EmployeeClaimsShell title={claim.claimNo} backHref={`/employee/claims/${claim.id}`}>
        <p className="text-sm text-muted-foreground">Submitted claims cannot be edited.</p>
      </EmployeeClaimsShell>
    );
  }
  return <ClaimFormClient mode="edit" initial={claim} />;
}
