"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyProfileState, ProfileSectionHeader } from "./employee-form-ui";
import { formatDateDisplay } from "../employee-display";
import type { HrEmployee } from "../employee-master-data";
import { hrBtn } from "@/app/(app)/hr/settings/organization/_components";
import { HrIconActionButton } from "@/app/(app)/hr/settings/organization/_components/HrIconActionButton";
import { HrLetterViewDrawer } from "@/app/(app)/hr/hr-letters/components/HrLetterViewDrawer";
import {
  hrLetterTypeLabel,
  letterStatusLabel,
} from "@/app/(app)/hr/hr-letters/hr-letters-data";
import type { GeneratedHrDocument } from "@/app/(app)/hr/settings/hr-template-data";
import {
  FNF_STATUS_OPTIONS,
  HR_OFFBOARDING_EVENT,
  exitTypeLabel,
  getExitLetters,
  getLatestOffboardingForEmployee,
  getOffboardingForEmployee,
  shortfallDays,
  type OffboardingRecord,
} from "@/app/(app)/hr/offboarding/offboarding-data";
import { OffboardingStatusPill } from "@/app/(app)/hr/offboarding/components/OffboardingStatusPill";
import { StartOffboardingDrawer } from "@/app/(app)/hr/offboarding/components/StartOffboardingDrawer";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5 truncate">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function fnfLabel(v: OffboardingRecord["fnfStatus"]): string {
  return FNF_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function OffboardingProfileSection({ employee }: { employee: HrEmployee }) {
  const [latest, setLatest] = useState<OffboardingRecord | undefined>();
  const [history, setHistory] = useState<OffboardingRecord[]>([]);
  const [letters, setLetters] = useState<GeneratedHrDocument[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [viewLetter, setViewLetter] = useState<GeneratedHrDocument | null>(null);

  const refresh = useCallback(() => {
    const all = getOffboardingForEmployee(employee.id);
    const rec = getLatestOffboardingForEmployee(employee.id);
    setHistory(all);
    setLatest(rec);
    setLetters(rec ? getExitLetters(rec) : []);
  }, [employee.id]);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener(HR_OFFBOARDING_EVENT, onUpd);
    window.addEventListener("hr-generated-documents-updated", onUpd);
    return () => {
      window.removeEventListener(HR_OFFBOARDING_EVENT, onUpd);
      window.removeEventListener("hr-generated-documents-updated", onUpd);
    };
  }, [refresh]);

  const canStart =
    employee.status === "active" &&
    (!latest || latest.status === "cancelled" || latest.status === "rejected") &&
    !history.some((r) => r.status === "completed") &&
    !history.some((r) => r.status === "pending_review");

  const open =
    latest &&
    latest.status !== "cancelled" &&
    latest.status !== "completed" &&
    latest.status !== "rejected";
  const pendingReview = latest?.status === "pending_review";
  const shortfall = latest
    ? shortfallDays(latest.requiredNoticeDays, latest.servedNoticeDays)
    : null;

  return (
    <div>
      <ProfileSectionHeader
        title="Offboarding"
        description="Exit type, last working date, clearance status and issued letters."
        actions={
          canStart ? (
            <Button type="button" size="sm" className={hrBtn("gap-1.5 shrink-0", true)} onClick={() => setStartOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Start Offboarding
            </Button>
          ) : latest ? (
            <Button type="button" variant="outline" size="sm" className={hrBtn("shrink-0")} asChild>
              <Link href={pendingReview ? "/hr/offboarding?tab=pending" : `/hr/offboarding/${latest.id}`}>
                {pendingReview ? "Review Resignation" : open ? "Continue Process" : "View Process"}
              </Link>
            </Button>
          ) : null
        }
      />

      {!latest ? (
        <EmptyProfileState message="No offboarding process for this employee." />
      ) : (
        <div className="space-y-3">
          {pendingReview ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-800">Pending HR Review</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Employee resignation awaiting Accept / Reject in Offboarding → Pending Requests.
              </p>
            </div>
          ) : null}
          <div className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Exit summary
              </p>
              <OffboardingStatusPill status={latest.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Exit Type" value={exitTypeLabel(latest.exitType)} />
              <Field
                label="Source"
                value={latest.source === "employee" ? "Employee" : "HR"}
              />
              <Field label="Initiated Date" value={formatDateDisplay(latest.initiatedDate)} />
              {latest.submittedAt ? (
                <Field
                  label="Submitted On"
                  value={formatDateDisplay(latest.submittedAt.slice(0, 10))}
                />
              ) : null}
              {latest.acceptedAt ? (
                <Field
                  label="Accepted On"
                  value={`${formatDateDisplay(latest.acceptedAt.slice(0, 10))}${latest.acceptedBy ? ` · ${latest.acceptedBy}` : ""}`}
                />
              ) : null}
              {latest.proposedLastWorkingDate ? (
                <Field
                  label="Proposed LWD"
                  value={formatDateDisplay(latest.proposedLastWorkingDate)}
                />
              ) : null}
              <Field
                label="Final Last Working Date"
                value={
                  latest.lastWorkingDate ? formatDateDisplay(latest.lastWorkingDate) : "—"
                }
              />
              <Field
                label="Notice Period"
                value={
                  latest.requiredNoticeDays || latest.servedNoticeDays
                    ? `${latest.servedNoticeDays || "0"} / ${latest.requiredNoticeDays || "—"} days${shortfall != null && shortfall > 0 ? ` · shortfall ${shortfall}d` : ""}`
                    : "—"
                }
              />
              <Field label="Offboarding Status" value={latest.status.replace(/_/g, " ")} />
              {latest.employeeRemarks ? (
                <Field label="Employee Remarks" value={latest.employeeRemarks} />
              ) : null}
              {latest.hrRemarks ? <Field label="HR Remarks" value={latest.hrRemarks} /> : null}
              <Field
                label="Completion Date"
                value={latest.completedOn ? formatDateDisplay(latest.completedOn.slice(0, 10)) : "—"}
              />
              <Field label="Full & Final" value={fnfLabel(latest.fnfStatus)} />
              {latest.status === "cancelled" ? (
                <Field label="Cancel Reason" value={latest.cancelReason} />
              ) : null}
              {latest.status === "rejected" ? (
                <>
                  <Field label="Rejection Reason" value={latest.rejectionReason} />
                  {latest.rejectedAt ? (
                    <Field
                      label="Rejected On"
                      value={`${formatDateDisplay(latest.rejectedAt.slice(0, 10))}${latest.rejectedBy ? ` · ${latest.rejectedBy}` : ""}`}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
            {shortfall != null && shortfall > 0 ? (
              <p className="text-[11px] text-muted-foreground mt-3">
                Financial impact will be handled during Full & Final processing.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Documents</p>
            </div>
            {letters.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No exit letters generated yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-2 font-semibold">Letter Type</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Issued On</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {letters.map((d) => (
                    <tr key={d.id} className="border-b border-border/60">
                      <td className="px-3 py-2">{hrLetterTypeLabel(d.templateType)}</td>
                      <td className="px-3 py-2">{letterStatusLabel(d.status)}</td>
                      <td className="px-3 py-2">
                        {d.issuedOn ? formatDateDisplay(d.issuedOn.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">
                          <HrIconActionButton label="View" onClick={() => setViewLetter(d)}>
                            <Eye />
                          </HrIconActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <StartOffboardingDrawer
        open={startOpen}
        onOpenChange={setStartOpen}
        lockedEmployeeId={employee.id}
      />
      <HrLetterViewDrawer open={!!viewLetter} letter={viewLetter} onClose={() => setViewLetter(null)} />
    </div>
  );
}
