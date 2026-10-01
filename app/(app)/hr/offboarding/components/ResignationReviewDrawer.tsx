"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateDisplay } from "@/app/(app)/hr/employees/employee-display";
import { EmployeeAvatar } from "@/app/(app)/hr/employees/components/EmployeeStatusChips";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { hrBtn } from "@/app/(app)/hr/settings/organization/_components";
import {
  acceptResignation,
  rejectResignation,
  type OffboardingRecord,
} from "../offboarding-data";
import { OffboardingStatusPill } from "./OffboardingStatusPill";

function Field({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <div
        className={cn(
          "mt-1.5 text-[13px] leading-snug",
          muted ? "text-muted-foreground" : "text-foreground font-medium",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ResignationReviewDrawer({
  open,
  record,
  onClose,
  onDone,
}: {
  open: boolean;
  record: OffboardingRecord | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [finalLwd, setFinalLwd] = useState("");
  const [hrRemarks, setHrRemarks] = useState("");
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!record || !open) return;
    setFinalLwd(record.proposedLastWorkingDate || record.lastWorkingDate || "");
    setHrRemarks("");
    setError("");
    setRejectReason("");
    setRejectError("");
    setRejectOpen(false);
  }, [record?.id, open]);

  if (!record) return null;

  const notice =
    record.requiredNoticeDays
      ? `${record.requiredNoticeDays} days`
      : "—";

  const handleAccept = () => {
    setBusy(true);
    const result = acceptResignation(record.id, {
      finalLastWorkingDate: finalLwd,
      hrRemarks,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone("Resignation accepted — moved to Active Offboarding.");
    onClose();
  };

  const handleReject = () => {
    setBusy(true);
    const result = rejectResignation(record.id, rejectReason);
    setBusy(false);
    if (!result.ok) {
      setRejectError(result.error);
      return;
    }
    setRejectOpen(false);
    onDone("Resignation rejected.");
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="max-w-[440px] w-full p-0 flex flex-col [&>button]:hidden">
          <SheetHeader className="px-5 pt-4 pb-3.5 border-b flex-shrink-0 space-y-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 shrink-0 rounded-[10px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <EmployeeAvatar name={record.employeeName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="text-[14px] font-semibold truncate">
                    {record.employeeName}
                  </SheetTitle>
                  <OffboardingStatusPill status={record.status} />
                </div>
                <SheetDescription className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  {record.employeeCode}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Resignation Details
              </p>
              <div className="space-y-3.5">
                <Field label="Resignation Date">
                  {record.resignationDate
                    ? formatDateDisplay(record.resignationDate)
                    : "—"}
                </Field>
                <Field label="Proposed Last Working Date">
                  {record.proposedLastWorkingDate
                    ? formatDateDisplay(record.proposedLastWorkingDate)
                    : "—"}
                </Field>
                <Field label="Notice Period">{notice}</Field>
                <Field label="Reason" muted={!record.reason}>
                  {record.reason || "—"}
                </Field>
                <Field label="Employee Remarks" muted={!record.employeeRemarks}>
                  {record.employeeRemarks || "No remarks"}
                </Field>
                <Field label="Submitted On">
                  {record.submittedAt
                    ? (() => {
                        const d = record.submittedAt.slice(0, 10);
                        const t = record.submittedAt.includes("T")
                          ? record.submittedAt.slice(11, 16)
                          : "";
                        return t
                          ? `${formatDateDisplay(d)} · ${t}`
                          : formatDateDisplay(d);
                      })()
                    : "—"}
                </Field>
              </div>
            </div>

            <div className="border-t border-border/70" />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                HR Decision
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground mb-1.5">
                    Final Last Working Date <span className="text-red-500">*</span>
                  </p>
                  <HrDateInput value={finalLwd} onChange={setFinalLwd} />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground mb-1.5">
                    HR Remarks
                  </p>
                  <textarea
                    value={hrRemarks}
                    onChange={(e) => setHrRemarks(e.target.value)}
                    rows={2}
                    placeholder="Optional remarks…"
                    className="w-full text-xs rounded-[10px] border border-border px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300/50"
                  />
                </div>
                {error ? <p className="text-xs text-red-600">{error}</p> : null}
              </div>
            </div>
          </SheetBody>

          {record.status === "pending_review" ? (
            <SheetFooter className="flex-shrink-0 px-5 py-3.5 border-t bg-background gap-3 justify-stretch">
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 text-xs font-medium rounded-[10px] text-red-600 border-red-200 hover:bg-red-50"
                disabled={busy}
                onClick={() => {
                  setRejectReason("");
                  setRejectError("");
                  setRejectOpen(true);
                }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className={cn(hrBtn("h-10 flex-1", true))}
                disabled={busy}
                onClick={handleAccept}
              >
                Accept Resignation
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={rejectOpen} onOpenChange={(o) => !o && setRejectOpen(false)}>
        <DialogContent className="max-w-sm rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-base">Reject resignation</DialogTitle>
            <DialogDescription className="text-xs">
              {record.employeeName} · {record.employeeCode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError("");
              }}
              rows={3}
              className={cn(
                "w-full text-xs rounded-[10px] border border-border px-2.5 py-2 resize-none",
                "focus:outline-none focus:ring-2 focus:ring-brand-300/50",
                rejectError && "border-red-400",
              )}
              placeholder="Enter reason for rejection…"
            />
            {rejectError ? <p className="text-xs text-red-500">{rejectError}</p> : null}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-[10px]"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs rounded-[10px] bg-red-600 hover:bg-red-700 text-white"
              disabled={busy}
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
