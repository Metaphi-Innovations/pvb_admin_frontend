"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeClaimsShell } from "./EmployeeClaimsShell";
import {
  AmountStrip,
  AreaField,
  AttachmentList,
  ClaimStatusPill,
  FieldBlock,
  PolicyCheckPanel,
  PolicyGuidanceCard,
  ReimbursementStatusPill,
} from "./claim-ui";
import {
  canWithdrawClaim,
  claimTypeLabel,
  employeeReimbursementLabel,
  formatClaimDate,
  formatInr,
  getTravelClaimById,
  HR_TRAVEL_CLAIMS_EVENT,
  isClaimEditable,
  newTimelineId,
  reimbursementStatusLabel,
  saveTravelClaim,
  type EmployeeTravelClaim,
} from "./travel-claim-data";
import { getHrEmployeeById } from "@/app/(app)/hr/employees/employee-master-data";
import { evaluateClaim } from "./travel-claim-engine";
import { processingAmount } from "./travel-claim-processing";

export default function ClaimDetailClient({ claimId }: { claimId: number }) {
  const [claim, setClaim] = useState<EmployeeTravelClaim | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const sync = () => setClaim(getTravelClaimById(claimId) ?? null);
    sync();
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
    return () => window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, sync);
  }, [claimId]);

  const employee = claim ? getHrEmployeeById(claim.employeeId) : undefined;
  const live = useMemo(() => {
    if (!claim || !employee) return null;
    if (claim.policySnapshot && claim.status !== "draft" && claim.status !== "returned") return null;
    return evaluateClaim(employee, claim);
  }, [claim, employee]);

  if (!claim) {
    return (
      <EmployeeClaimsShell title="Claim" backHref="/employee/claims">
        <p className="text-sm text-muted-foreground">Claim not found.</p>
      </EmployeeClaimsShell>
    );
  }

  const snap = claim.policySnapshot;
  const guidance = snap?.guidance ?? live?.guidance ?? [];
  const claimed = snap?.claimedAmount ?? claim.claimedAmount;
  const eligible = snap?.eligibleAmount ?? claim.eligibleAmount;
  const excess = snap?.exceptionAmount ?? claim.exceptionAmount;

  const withdraw = () => {
    if (!reason.trim()) return;
    const saved = saveTravelClaim({
      ...claim,
      status: "draft",
      withdrawReason: reason.trim(),
      submittedOn: "",
      policySnapshot: null,
      timeline: [
        ...claim.timeline,
        {
          id: newTimelineId(),
          at: new Date().toISOString(),
          status: "withdrawn",
          label: "Withdrawn",
          detail: reason.trim(),
        },
      ],
    });
    setClaim(saved);
    setWithdrawOpen(false);
    setReason("");
  };

  const occurred = claim.timeline.filter((e) => e.status !== "under_review");

  return (
    <EmployeeClaimsShell
      title={claim.claimNo}
      subtitle={claimTypeLabel(claim.claimType)}
      backHref="/employee/claims"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <ClaimStatusPill status={claim.status} />
          {(claim.status === "approved" || claim.status === "partially_approved") ? (
            <ReimbursementStatusPill status={claim.reimbursementStatus} />
          ) : null}
        </div>
        <div className="flex gap-2">
          {isClaimEditable(claim.status) ? (
            <Button asChild className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-[10px]">
              <Link href={`/employee/claims/${claim.id}/edit`}>Edit</Link>
            </Button>
          ) : null}
          {canWithdrawClaim(claim) ? (
            <Button variant="outline" className="h-9 text-xs rounded-[10px]" onClick={() => setWithdrawOpen(true)}>
              Withdraw
            </Button>
          ) : null}
        </div>
      </div>

      {claim.status === "returned" ? (
        <div className="rounded-[14px] border border-orange-200 bg-orange-50 px-3.5 py-3 text-xs text-orange-900">
          <p className="font-semibold">Action Required</p>
          <p className="mt-0.5">{claim.returnedReason || "Returned for correction."}</p>
        </div>
      ) : null}

      {claim.status === "rejected" ? (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800">
          <p className="font-semibold">Rejected</p>
          <p className="mt-0.5">{claim.rejectionReason || "—"}</p>
        </div>
      ) : null}

      <div className="rounded-[14px] border border-border bg-white p-3.5 space-y-2 text-xs">
        <Row k="Claim No." v={claim.claimNo} mono />
        <Row k="Status" v={claim.status.replace(/_/g, " ")} />
        <Row k="Claim Type" v={claimTypeLabel(claim.claimType)} />
        {claim.linkedTravelRequestNo ? <Row k="Linked Travel Request" v={claim.linkedTravelRequestNo} mono /> : null}
        {claim.approvedEstimate != null ? <Row k="Approved estimate" v={formatInr(claim.approvedEstimate)} /> : null}
        <Row k="Travel Date" v={formatClaimDate(claim.expenseDate)} />
        {claim.city ? <Row k="City" v={`${claim.city}${snap?.cityClassName ? ` — ${snap.cityClassName}` : live?.cityClassName ? ` — ${live.cityClassName}` : ""}`} /> : null}
        {claim.fromLocation || claim.travelFrom ? <Row k="From" v={claim.travelFrom || claim.fromLocation} /> : null}
        {claim.destination || claim.toLocation ? <Row k="To" v={claim.destination || claim.toLocation} /> : null}
        {claim.modeOfTravel ? <Row k="Mode" v={claim.modeOfTravel} /> : null}
        {claim.hotelName ? <Row k="Hotel" v={claim.hotelName} /> : null}
        {claim.kmTravelled != null ? <Row k="KM" v={String(claim.kmTravelled)} /> : null}
        {claim.purpose ? <Row k="Purpose" v={claim.purpose} /> : null}
        {claim.exceptionReason ? <Row k="Exception" v={claim.exceptionReason} /> : null}
      </div>

      <AmountStrip claimed={formatInr(claimed)} eligible={formatInr(eligible)} excess={formatInr(excess)} />
      {claim.approvedAmount != null ? (
        <p className="text-xs font-semibold">
          Approved amount: {formatInr(claim.approvedAmount)}
          {claim.status === "partially_approved" ? " · Partially Approved" : ""}
        </p>
      ) : claim.status === "submitted" || claim.status === "under_review" ? (
        <p className="text-[11px] text-muted-foreground">Awaiting review.</p>
      ) : null}

      {(claim.status === "approved" || claim.status === "partially_approved") ? (
        <div className="rounded-[14px] border border-navy-100 bg-navy-50/50 px-3.5 py-3 space-y-1">
          <p className="text-xs font-semibold text-navy-800">
            {employeeReimbursementLabel(claim) ?? `Approved — ${reimbursementStatusLabel(claim.reimbursementStatus)}`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Processing amount: {formatInr(processingAmount(claim))}
            {claim.processedOn ? ` · Processed on ${formatClaimDate(claim.processedOn.slice(0, 10))}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">Processing status is managed by HR / Finance — you cannot edit it.</p>
        </div>
      ) : null}

      <PolicyGuidanceCard
        rows={guidance}
        groupName={snap?.groupName ?? live?.groupName}
      />
      {snap ? (
        <p className="text-[11px] text-muted-foreground">
          Policy snapshot: {snap.policyName} ({snap.policyNumber}) effective {formatClaimDate(snap.effectiveFrom)}. Later policy edits do not change this claim.
        </p>
      ) : live ? (
        <PolicyCheckPanel rows={live.checks} />
      ) : null}

      <section className="rounded-[14px] border border-border bg-white p-3.5 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Attachments</p>
        <AttachmentList items={claim.attachments} readOnly />
      </section>

      <section className="rounded-[14px] border border-border bg-white p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Timeline</p>
        {(claim.reviewHistory ?? []).length > 0 ? (
          <ol className="space-y-3 mb-3">
            {claim.reviewHistory.map((ev, i) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600 mt-1" />
                  {i < claim.reviewHistory.length - 1 || (claim.processingHistory ?? []).length > 0 || occurred.length > 0 ? (
                    <span className="w-px flex-1 bg-border mt-1" />
                  ) : null}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-semibold">{ev.stage} · {ev.action}</p>
                  <p className="text-[11px] text-muted-foreground">{ev.user}{ev.remark ? ` — ${ev.remark}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(ev.at).toLocaleString("en-IN")}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        {(claim.processingHistory ?? []).length > 0 ? (
          <ol className="space-y-3 mb-3">
            {claim.processingHistory.map((ev, i) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-navy-600 mt-1" />
                  {i < claim.processingHistory.length - 1 ? <span className="w-px flex-1 bg-border mt-1" /> : null}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-semibold">{ev.action}</p>
                  <p className="text-[11px] text-muted-foreground">{ev.user}{ev.remark ? ` — ${ev.remark}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(ev.at).toLocaleString("en-IN")}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        {occurred.length === 0 && (claim.reviewHistory ?? []).length === 0 && (claim.processingHistory ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No events yet.</p>
        ) : occurred.length > 0 && (claim.reviewHistory ?? []).length === 0 && (claim.processingHistory ?? []).length === 0 ? (
          <ol className="space-y-3">
            {occurred.map((ev, i) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600 mt-1" />
                  {i < occurred.length - 1 ? <span className="w-px flex-1 bg-border mt-1" /> : null}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-semibold">{ev.label}</p>
                  <p className="text-[11px] text-muted-foreground">{ev.detail}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(ev.at).toLocaleString("en-IN")}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Withdraw this claim?</DialogTitle>
            <DialogDescription>The claim returns to Draft so you can edit it. A reason is required.</DialogDescription>
          </DialogHeader>
          <FieldBlock label="Reason" required>
            <AreaField value={reason} onChange={(e) => setReason(e.target.value)} />
          </FieldBlock>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-9" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button className="h-9 bg-brand-600 hover:bg-brand-700 text-white" disabled={!reason.trim()} onClick={withdraw}>
              Withdraw
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </EmployeeClaimsShell>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono font-semibold text-brand-700" : "font-medium text-right"}>{v}</span>
    </div>
  );
}
