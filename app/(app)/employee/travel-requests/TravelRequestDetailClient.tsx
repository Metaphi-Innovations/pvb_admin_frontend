"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeClaimsShell } from "@/app/(app)/employee/claims/EmployeeClaimsShell";
import { AreaField } from "@/app/(app)/employee/claims/claim-ui";
import { getHrEmployeeById } from "@/app/(app)/hr/employees/employee-master-data";
import { loadClaimActor } from "@/app/(app)/employee/claims/travel-claim-data";
import { HR_TRAVEL_REQUESTS_EVENT, getTravelRequestById, type EmployeeTravelRequest } from "./travel-request-data";
import { evaluateTravelRequest } from "./travel-request-engine";
import { cancelTravelRequest } from "./travel-request-approval";
import { TravelRequestViewBody } from "./TravelRequestViewBody";

export default function TravelRequestDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [req, setReq] = useState<EmployeeTravelRequest | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setReq(getTravelRequestById(id) ?? null);
    sync();
    window.addEventListener(HR_TRAVEL_REQUESTS_EVENT, sync);
    return () => window.removeEventListener(HR_TRAVEL_REQUESTS_EVENT, sync);
  }, [id]);

  const employee = req ? getHrEmployeeById(req.employeeId) ?? loadClaimActor() : null;
  const evaln = useMemo(() => {
    if (!req || !employee) return null;
    return evaluateTravelRequest(employee, req, {
      frozenPolicy: req.snapshot?.policyId ? undefined : undefined,
    });
  }, [req, employee]);

  if (!req) {
    return (
      <EmployeeClaimsShell title="Travel Request" backHref="/employee/travel-requests">
        <p className="text-sm text-muted-foreground">Request not found.</p>
      </EmployeeClaimsShell>
    );
  }

  const actor = loadClaimActor();
  const canEdit = req.status === "draft" || req.status === "returned";
  const today = new Date().toISOString().slice(0, 10);
  const canCancel =
    req.status === "draft" ||
    req.status === "submitted" ||
    req.status === "under_review" ||
    (req.status === "approved" && req.departureDate > today);

  return (
    <EmployeeClaimsShell
      title={req.requestNo}
      subtitle="Travel request"
      backHref="/employee/travel-requests"
      footer={
        canEdit || canCancel ? (
          <div className="flex gap-2">
            {canCancel ? (
              <Button variant="outline" className="flex-1 h-11 rounded-[10px]" onClick={() => setCancelOpen(true)}>
                Cancel request
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                className="flex-1 h-11 rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => router.push(`/employee/travel-requests/${req.id}/edit`)}
              >
                {req.status === "returned" ? "Edit & resubmit" : "Edit draft"}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <TravelRequestViewBody req={req} evaln={evaln} employee={employee} />
      {req.returnReason ? (
        <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-[10px] p-3">Returned: {req.returnReason}</p>
      ) : null}
      {req.rejectionReason ? (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-[10px] p-3">Rejected: {req.rejectionReason}</p>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel travel request</DialogTitle>
            <DialogDescription>The record is kept. Cancellation reason is required.</DialogDescription>
          </DialogHeader>
          <AreaField value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason" />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setCancelOpen(false)}>
              Keep
            </Button>
            <Button
              className="flex-1 h-9 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!actor) return;
                const result = cancelTravelRequest(req, cancelReason, actor);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setCancelOpen(false);
                setReq(result.request);
              }}
            >
              Cancel request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </EmployeeClaimsShell>
  );
}
