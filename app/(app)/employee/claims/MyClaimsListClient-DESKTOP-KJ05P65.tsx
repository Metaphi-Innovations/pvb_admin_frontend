"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeClaimsShell } from "./EmployeeClaimsShell";
import { ClaimStatusPill, ReimbursementStatusPill } from "./claim-ui";
import {
  HR_TRAVEL_CLAIMS_EVENT,
  claimTypeLabel,
  employeeReimbursementLabel,
  formatClaimDate,
  formatInr,
  loadClaimActor,
  loadClaimsForEmployee,
  type EmployeeTravelClaim,
} from "./travel-claim-data";

export default function MyClaimsListClient() {
  const [rows, setRows] = useState<EmployeeTravelClaim[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const actor = loadClaimActor();
      setRows(actor ? loadClaimsForEmployee(actor.id) : []);
      setReady(true);
    };
    sync();
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
    return () => window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
  }, []);

  const sorted = useMemo(() => rows, [rows]);

  return (
    <EmployeeClaimsShell title="My Claims" subtitle="Expenses / Claims">
      <Link href="/employee/claims/new" className="block">
        <Button className="w-full h-11 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-[10px] gap-2">
          <Plus className="w-4 h-4" /> New Claim
        </Button>
      </Link>

      {!ready ? (
        <div className="rounded-[14px] border border-border bg-white p-6 animate-pulse h-24" />
      ) : sorted.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white py-12 px-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
            <Receipt className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No claims yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a travel or expense claim to get started.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((c) => {
            const period =
              c.periodFrom && c.periodTo && c.periodFrom !== c.periodTo
                ? `${formatClaimDate(c.periodFrom)} – ${formatClaimDate(c.periodTo)}`
                : formatClaimDate(c.expenseDate);
            return (
              <li key={c.id}>
                <Link
                  href={`/employee/claims/${c.id}`}
                  className="block rounded-[14px] border border-border bg-white p-3.5 shadow-sm active:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-brand-700">{c.claimNo}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{claimTypeLabel(c.claimType)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ClaimStatusPill status={c.status} />
                      {(c.status === "approved" || c.status === "partially_approved") ? (
                        <ReimbursementStatusPill status={c.reimbursementStatus} />
                      ) : null}
                    </div>
                  </div>
                  {c.status === "returned" ? (
                    <p className="text-[11px] font-semibold text-orange-700 mt-1">Action Required</p>
                  ) : null}
                  {(c.status === "approved" || c.status === "partially_approved") && employeeReimbursementLabel(c) ? (
                    <p className="text-[11px] font-medium text-navy-700 mt-1">{employeeReimbursementLabel(c)}</p>
                  ) : null}
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div>
                      <dt className="text-muted-foreground">Travel / Period</dt>
                      <dd className="font-medium">{period}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Claim Amount</dt>
                      <dd className="font-medium">{formatInr(c.claimedAmount)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Approved</dt>
                      <dd className="font-medium">
                        {c.approvedAmount == null ? "—" : formatInr(c.approvedAmount)}
                        {c.status === "partially_approved" ? " · Partial" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Submitted On</dt>
                      <dd className="font-medium">{c.submittedOn ? formatClaimDate(c.submittedOn) : "—"}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </EmployeeClaimsShell>
  );
}
