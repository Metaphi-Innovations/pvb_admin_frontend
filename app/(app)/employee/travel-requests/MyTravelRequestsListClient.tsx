"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeClaimsShell } from "@/app/(app)/employee/claims/EmployeeClaimsShell";
import { HR_TRAVEL_CLAIMS_EVENT, loadClaimActor } from "@/app/(app)/employee/claims/travel-claim-data";
import {
  HR_TRAVEL_REQUESTS_EVENT,
  formatInr,
  formatRequestDate,
  loadTravelRequestsForEmployee,
  travelPeriodLabel,
  type EmployeeTravelRequest,
} from "./travel-request-data";
import { TravelRequestStatusPill } from "./travel-request-ui";

export default function MyTravelRequestsListClient() {
  const [rows, setRows] = useState<EmployeeTravelRequest[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const actor = loadClaimActor();
      setRows(actor ? loadTravelRequestsForEmployee(actor.id) : []);
      setReady(true);
    };
    sync();
    window.addEventListener(HR_TRAVEL_REQUESTS_EVENT, sync);
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
    return () => {
      window.removeEventListener(HR_TRAVEL_REQUESTS_EVENT, sync);
      window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
    };
  }, []);

  return (
    <EmployeeClaimsShell title="My Travel Requests" subtitle="Pre-travel / Ex-HQ approval">
      <Link href="/employee/travel-requests/new" className="block">
        <Button className="w-full h-11 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-[10px] gap-2">
          <Plus className="w-4 h-4" /> New Travel Request
        </Button>
      </Link>

      {!ready ? (
        <div className="rounded-[14px] border border-border bg-white p-6 animate-pulse h-24" />
      ) : rows.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white py-12 px-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
            <Plane className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No travel requests yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a request before Ex-HQ travel when prior approval is required.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/employee/travel-requests/${r.id}`}
                className="block rounded-[14px] border border-border bg-white p-3.5 shadow-sm active:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-brand-700">{r.requestNo}</p>
                    <p className="text-sm font-semibold mt-0.5">{r.destination || "—"}</p>
                  </div>
                  <TravelRequestStatusPill status={r.status} />
                </div>
                {r.status === "returned" ? (
                  <p className="text-[11px] font-semibold text-orange-700 mt-1">Action required — returned</p>
                ) : null}
                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div>
                    <dt className="text-muted-foreground">Travel period</dt>
                    <dd className="font-medium">{travelPeriodLabel(r)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium">
                      {r.snapshot?.travelContext === "ex_hq" || r.snapshot?.travelContext === "overnight_journey"
                        ? "Ex-HQ"
                        : r.snapshot?.travelContext === "hq_local"
                          ? "Local / HQ"
                          : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mode</dt>
                    <dd className="font-medium">{r.travelMode || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Estimated cost</dt>
                    <dd className="font-medium">{formatInr(r.snapshot?.estimatedTotal ?? r.estimatedTravelCost)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Submitted on</dt>
                    <dd className="font-medium">{r.submittedOn ? formatRequestDate(r.submittedOn) : "—"}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </EmployeeClaimsShell>
  );
}
