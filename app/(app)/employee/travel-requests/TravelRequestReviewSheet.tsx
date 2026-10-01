"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AreaField } from "@/app/(app)/employee/claims/claim-ui";
import { getHrEmployeeById } from "@/app/(app)/hr/employees/employee-master-data";
import type { ReviewerContext } from "@/app/(app)/employee/claims/travel-claim-approval";
import {
  approveTravelRequestStep,
  rejectTravelRequest,
  returnTravelRequest,
  reviewerCanActOnRequest,
} from "./travel-request-approval";
import { evaluateTravelRequest } from "./travel-request-engine";
import type { EmployeeTravelRequest } from "./travel-request-data";
import { TravelRequestViewBody } from "./TravelRequestViewBody";

export function TravelRequestReviewSheet({
  req,
  reviewer,
  onClose,
}: {
  req: EmployeeTravelRequest | null;
  reviewer: ReviewerContext;
  onClose: () => void;
}) {
  const [remark, setRemark] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState("");

  const employee = req ? getHrEmployeeById(req.employeeId) : null;
  const evaln = useMemo(() => {
    if (!req || !employee) return null;
    return evaluateTravelRequest(employee, req);
  }, [req, employee]);

  const canAct = req ? reviewerCanActOnRequest(req, reviewer) : false;
  const exception = (req?.snapshot?.exceptions.length ?? 0) > 0;

  return (
    <>
      <Sheet open={!!req} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col">
          <SheetHeader>
            <SheetTitle>Travel request</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-3">
            {req ? <TravelRequestViewBody req={req} evaln={evaln} employee={employee} /> : null}
            {canAct ? (
              <AreaField
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={exception ? "Remark required for exception" : "Optional remark"}
              />
            ) : null}
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </SheetBody>
          {canAct && req ? (
            <SheetFooter className="gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setReturnOpen(true)}>
                Return
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-red-600"
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => {
                  const result = approveTravelRequestStep(req, reviewer, remark);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  onClose();
                }}
              >
                Approve
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Return for correction</DialogTitle>
            <DialogDescription>Reason is mandatory. Employee can edit and resubmit.</DialogDescription>
          </DialogHeader>
          <AreaField value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Reason" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => {
                if (!req) return;
                const result = returnTravelRequest(req, reviewer, remark);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setReturnOpen(false);
                onClose();
              }}
            >
              Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject travel request</DialogTitle>
            <DialogDescription>Reason is mandatory. Request becomes read-only.</DialogDescription>
          </DialogHeader>
          <AreaField value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Reason" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!req) return;
                const result = rejectTravelRequest(req, reviewer, remark);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setRejectOpen(false);
                onClose();
              }}
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
