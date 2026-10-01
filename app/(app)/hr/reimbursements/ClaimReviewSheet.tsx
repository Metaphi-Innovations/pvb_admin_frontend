"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import { getHrEmployeeById } from "@/app/(app)/hr/employees/employee-master-data";
import { PolicyCheckPanel } from "@/app/(app)/employee/claims/claim-ui";
import { AreaField, FieldBlock, SearchSelect, TextField } from "@/app/(app)/employee/claims/claim-ui";
import {
  approveCurrentStep,
  branchLabel,
  currentApprovalStep,
  defaultApprovedAmount,
  findPossibleDuplicates,
  recommendedPayable,
  rejectClaim,
  REJECT_REASON_OPTIONS,
  returnClaim,
  RETURN_REASON_OPTIONS,
  reviewerBanner,
  reviewerCanAct,
  stepStatusLabel,
  type ReviewerContext,
} from "@/app/(app)/employee/claims/travel-claim-approval";
import { nightsBetween } from "@/app/(app)/employee/claims/travel-claim-engine";
import {
  claimTypeLabel,
  formatClaimDate,
  formatInr,
  CLAIM_STATUS_LABEL,
  type EmployeeTravelClaim,
} from "@/app/(app)/employee/claims/travel-claim-data";
import { ClaimStatusPill } from "@/app/(app)/employee/claims/claim-ui";

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="font-medium text-right text-foreground min-w-0">{v ?? "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function TravelDetails({ claim }: { claim: EmployeeTravelClaim }) {
  const t = claim.claimType;
  const snap = claim.policySnapshot;
  const nights = snap?.nights ?? nightsBetween(claim.checkInDate, claim.checkOutDate);
  if (t === "lodging") {
    return (
      <>
        <Row k="City" v={claim.city || "—"} />
        <Row k="City Classification" v={snap?.cityClassName || "—"} />
        <Row k="Check-in" v={formatClaimDate(claim.checkInDate)} />
        <Row k="Check-out" v={formatClaimDate(claim.checkOutDate)} />
        <Row k="Nights" v={String(nights)} />
        <Row k="Hotel" v={claim.hotelName || "—"} />
        <Row k="Per night limit" v={formatInr(snap?.lodgingLimitPerNight ?? null)} />
        <Row k="Total entitlement" v={formatInr(snap?.eligibleAmount ?? claim.eligibleAmount)} />
        <Row k="Claimed" v={formatInr(snap?.claimedAmount ?? claim.claimedAmount)} />
        <Row k="Excess" v={formatInr(snap?.exceptionAmount ?? claim.exceptionAmount)} />
        {claim.hotelGstin ? <Row k="GSTIN" v={claim.hotelGstin} /> : null}
        {claim.billInCompanyName != null ? <Row k="Bill in company name" v={claim.billInCompanyName ? "Yes" : "No"} /> : null}
      </>
    );
  }
  if (t === "personal_vehicle_km") {
    return (
      <>
        <Row k="Vehicle Type" v={claim.vehicleType || "—"} />
        <Row k="Start Point" v={claim.startPoint || claim.fromLocation || "—"} />
        <Row k="Destination" v={claim.destinationPoint || claim.toLocation || "—"} />
        <Row k="Purpose" v={claim.purpose || "—"} />
        <Row k="KM Travelled" v={claim.kmTravelled != null ? String(claim.kmTravelled) : "—"} />
        <Row k="Configured Rate" v={snap?.kmRate != null ? `${formatInr(snap.kmRate)}/km` : "—"} />
        <Row k="Calculated eligible" v={formatInr(snap?.eligibleAmount ?? claim.eligibleAmount)} />
        <Row k="Monthly KM Approval" v={snap?.monthlyKmNote || "Not recorded on this claim"} />
        {claim.startOdometer ? <Row k="Start odometer" v={claim.startOdometer} /> : null}
        {claim.endOdometer ? <Row k="End odometer" v={claim.endOdometer} /> : null}
      </>
    );
  }
  if (t === "ex_hq_travel") {
    return (
      <>
        <Row k="From" v={claim.travelFrom || claim.fromLocation || "—"} />
        <Row k="Destination" v={claim.destination || claim.city || "—"} />
        <Row k="Departure" v={claim.departureAt || "—"} />
        <Row k="Return" v={claim.returnAt || "—"} />
        <Row k="Mode" v={claim.modeOfTravel || "—"} />
        <Row k="Ticket amount" v={formatInr(claim.ticketAmount)} />
        <Row k="Distance from HQ" v={claim.distanceKm != null ? `${claim.distanceKm} KM` : "Not supplied"} />
        <Row k="Prior approval ref" v={claim.priorApprovalRef || "—"} />
        <Row k="Prior approved by" v={claim.priorApprovedBy || "—"} />
      </>
    );
  }
  if (t === "relatives_friends" || t === "field_conveyance" || t === "incidental") {
    return (
      <>
        {claim.city ? <Row k="City" v={`${claim.city}${snap?.cityClassName ? ` — ${snap.cityClassName}` : ""}`} /> : null}
        {t === "field_conveyance" ? <Row k="Location / Market" v={claim.locationMarket || "—"} /> : null}
        {t === "relatives_friends" ? (
          <>
            <Row k="Stay from" v={formatClaimDate(claim.stayFrom)} />
            <Row k="Stay to" v={formatClaimDate(claim.stayTo)} />
            <Row k="Nights" v={String(snap?.nights ?? nightsBetween(claim.stayFrom, claim.stayTo))} />
            <Row k="Per night" v={formatInr(snap?.relativesPerNight ?? null)} />
          </>
        ) : null}
        {t === "incidental" ? <Row k="Per day" v={formatInr(snap?.incidentalPerDay ?? null)} /> : null}
        {t === "field_conveyance" ? (
          <Row k="Allowance type" v={snap?.fieldAllowanceType === "fixed" ? "Fixed" : snap?.fieldAllowanceType === "actual" ? "Actual" : "—"} />
        ) : null}
        <Row k="Claim amount" v={formatInr(snap?.claimedAmount ?? claim.claimedAmount)} />
        {snap?.amountLocked || t === "relatives_friends" || t === "incidental" || snap?.fieldAllowanceType === "fixed" ? (
          <p className="text-[11px] text-navy-700 font-medium pt-1">Calculated by Policy — employee did not set an arbitrary rate.</p>
        ) : null}
        <Row k="Purpose" v={claim.purpose || "—"} />
      </>
    );
  }
  if (t === "overnight_journey") {
    return (
      <>
        <Row k="Journey start" v={claim.journeyStart || "—"} />
        <Row k="Journey end" v={claim.journeyEnd || "—"} />
        <Row k="Slab" v={snap?.overnightFromHours != null ? `${snap.overnightFromHours}–${snap.overnightToHours}h` : "—"} />
        <Row k="Allowance" v={formatInr(snap?.overnightAmount ?? claim.claimedAmount)} />
        <p className="text-[11px] text-navy-700 font-medium">Calculated by Policy</p>
      </>
    );
  }
  if (t === "local_city") {
    return (
      <>
        <Row k="Date" v={formatClaimDate(claim.expenseDate)} />
        <Row k="Start" v={claim.startTime || "—"} />
        <Row k="End" v={claim.endTime || "—"} />
        <Row k="From" v={claim.fromLocation || "—"} />
        <Row k="To" v={claim.toLocation || "—"} />
        <Row k="Mode" v={claim.modeOfTravel || "—"} />
        <Row k="Time band" v={snap?.timeCategory || "—"} />
        <Row k="Entitled mode" v={snap?.localMode || "—"} />
        <Row k="Amount" v={formatInr(claim.travelAmount ?? claim.claimedAmount)} />
        <Row k="Purpose" v={claim.purpose || "—"} />
      </>
    );
  }
  if (t === "boarding") {
    return (
      <>
        <Row k="Period" v={`${formatClaimDate(claim.periodFrom)} – ${formatClaimDate(claim.periodTo)}`} />
        <Row k="Eligible days" v={claim.eligibleDays != null ? String(claim.eligibleDays) : "—"} />
        <Row k="Per day limit" v={formatInr(snap?.boardingLimitPerDay ?? null)} />
        <Row k="Claimed" v={formatInr(claim.travelAmount ?? claim.claimedAmount)} />
      </>
    );
  }
  return (
    <>
      <Row k="Date" v={formatClaimDate(claim.expenseDate)} />
      <Row k="From" v={claim.fromLocation || "—"} />
      <Row k="To" v={claim.toLocation || "—"} />
      <Row k="Amount" v={formatInr(claim.claimedAmount)} />
      <Row k="Purpose" v={claim.purpose || "—"} />
    </>
  );
}

export function ClaimReviewSheet({
  claim,
  reviewer,
  onClose,
  onChanged,
}: {
  claim: EmployeeTravelClaim | null;
  reviewer: ReviewerContext;
  onClose: () => void;
  onChanged: (next: EmployeeTravelClaim) => void;
}) {
  const [amount, setAmount] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectCode, setRejectCode] = useState("");
  const [rejectText, setRejectText] = useState("");
  const [returnCode, setReturnCode] = useState("");
  const [returnText, setReturnText] = useState("");
  const [error, setError] = useState("");

  const employee = claim ? getHrEmployeeById(claim.employeeId) : undefined;
  const canAct = claim ? reviewerCanAct(claim, reviewer) : false;
  const banner = claim ? reviewerBanner(claim, reviewer) : null;
  const dupes = useMemo(() => (claim ? findPossibleDuplicates(claim) : []), [claim]);
  const step = claim ? currentApprovalStep(claim) : null;
  const snap = claim?.policySnapshot ?? null;

  const claimed = snap?.claimedAmount ?? claim?.claimedAmount ?? 0;
  const eligible = snap?.eligibleAmount ?? claim?.eligibleAmount ?? 0;
  const excess = snap?.exceptionAmount ?? claim?.exceptionAmount ?? 0;
  const recommended = claim ? recommendedPayable(claim) : 0;

  const amountNum = amount === "" ? (claim ? defaultApprovedAmount(claim) : 0) : Number(amount);

  useEffect(() => {
    if (!claim) return;
    setAmount(String(defaultApprovedAmount(claim)));
    setRemark("");
    setError("");
  }, [claim?.id]);

  if (!claim) return null;

  const stageHint =
    step?.role === "finance"
      ? "Finance: verify approved amount, bills and documentation. Do not change policy configuration."
      : step?.role === "hr"
        ? "HR: review policy compliance and documentation."
        : "Reporting Manager: validate business purpose, travel dates/routes, KM reasonableness and exception justification.";

  const doApprove = () => {
    const res = approveCurrentStep(claim, reviewer, { amount: amountNum, remark });
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not approve.");
      return;
    }
    setApproveOpen(false);
    onChanged(res.claim);
  };

  const doReject = () => {
    const res = rejectClaim(claim, reviewer, { code: rejectCode, reason: rejectText });
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not reject.");
      return;
    }
    setRejectOpen(false);
    onChanged(res.claim);
  };

  const doReturn = () => {
    const res = returnClaim(claim, reviewer, { code: returnCode, reason: returnText });
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not return.");
      return;
    }
    setReturnOpen(false);
    onChanged(res.claim);
  };

  const priorAttached = Boolean(claim.priorApprovalRef || claim.attachments.some((a) => a.kind === "approval"));
  const billAttached = claim.attachments.some((a) => a.kind === "bill" || a.kind === "ticket");

  return (
    <Sheet open={!!claim} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="max-w-[720px] sm:max-w-[720px]">
        <SheetHeader>
          <SheetTitle className="pr-8 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-brand-700">{claim.claimNo}</span>
            <ClaimStatusPill status={claim.status} />
          </SheetTitle>
          <p className="text-xs text-muted-foreground">{claimTypeLabel(claim.claimType)} · Review</p>
        </SheetHeader>
        <SheetBody className="space-y-3 bg-muted/20">
          {dupes.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <p className="font-semibold">Possible Duplicate</p>
              {dupes.map((d) => (
                <p key={d.id}>
                  {d.claimNo} — {d.reason}
                </p>
              ))}
              <p className="text-[11px] mt-1">Not auto-rejected. Reviewer decides.</p>
            </div>
          ) : null}

          {(claim.exceptionApprovalStatus === "required" || claim.exceptionApprovalStatus === "pending" || excess > 0.009) && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs text-orange-900 space-y-1">
              <p className="font-semibold">Policy Exception</p>
              <p>Lodging / entitlement: {formatInr(eligible)}</p>
              <p>Claimed: {formatInr(claimed)}</p>
              <p>Excess: {formatInr(excess)}</p>
              <p>Exception Approval: Required</p>
              {claim.exceptionReason ? <p>Reason: {claim.exceptionReason}</p> : null}
            </div>
          )}

          {banner ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{banner}</div>
          ) : null}

          {!claim.approvalSteps?.length && (claim.status === "submitted" || claim.status === "under_review") ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              Approval Configuration Required — no approval chain on the applicable travel policy.
            </div>
          ) : null}

          <Section title="1. Claim Summary">
            <Row k="Claim No." v={<span className="font-mono text-brand-700">{claim.claimNo}</span>} />
            <Row k="Employee" v={claim.employeeName} />
            <Row k="Employee Code" v={claim.employeeCode} />
            <Row k="Designation" v={claim.designation} />
            <Row k="Branch / HQ" v={branchLabel(employee?.branch || "")} />
            <Row k="Claim Type" v={claimTypeLabel(claim.claimType)} />
            <Row k="Submitted On" v={formatClaimDate(claim.submittedOn)} />
            <Row k="Current Status" v={CLAIM_STATUS_LABEL[claim.status]} />
            {claim.revision > 1 ? <Row k="Revision" v={String(claim.revision)} /> : null}
          </Section>

          <Section title="2. Travel / Expense Details">
            <TravelDetails claim={claim} />
            {claim.remarks ? <Row k="Remarks" v={claim.remarks} /> : null}
          </Section>

          <Section title="3. Policy Entitlement">
            {snap ? (
              <>
                <Row k="Applicable Policy" v={snap.policyName} />
                <Row k="Policy Version" v={`${snap.policyNumber} · from ${formatClaimDate(snap.effectiveFrom)}`} />
                <Row k="Entitlement Group" v={snap.groupName || "—"} />
                <Row k="City Classification" v={snap.cityClassName || "—"} />
                <Row k="Limit / Rate" v={snap.kmRate != null ? `${formatInr(snap.kmRate)}/km` : formatInr(eligible)} />
                <Row k="Bills Required" v={snap.billRequired ? "Yes" : "No"} />
                <Row k="Prior Approval Required" v={snap.priorApprovalRequired ? "Yes" : "No"} />
                <Row k="Submission Deadline" v={snap.deadlineMessage || "—"} />
                <p className="text-[11px] text-muted-foreground pt-1">
                  Values from the claim snapshot. Later policy edits do not change this review.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No policy snapshot on this claim.</p>
            )}
          </Section>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] text-muted-foreground">Claimed</p>
              <p className="text-sm font-bold">{formatInr(claimed)}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] text-muted-foreground">Eligible</p>
              <p className="text-sm font-bold text-leaf-700">{formatInr(eligible)}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] text-muted-foreground">Excess</p>
              <p className="text-sm font-bold text-red-700">{formatInr(excess)}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-[10px] text-brand-800">Recommended payable</p>
              <p className="text-sm font-bold text-brand-800">{formatInr(recommended)}</p>
            </div>
          </div>

          {snap?.deadlineKind && snap.deadlineKind !== "within" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">Late claim</p>
              <p>Submitted: {snap.daysAfterTravel ?? "—"} days after travel</p>
              <p>Policy maximum: {snap.maxClaimAgeDays ?? "—"} days</p>
              <p>Result: {snap.deadlineKind === "blocked" ? "Blocked / Exception" : "Late / Exception"}</p>
            </div>
          ) : null}

          <Section title="4. Bills / Attachments">
            <Row
              k="Bill requirement"
              v={
                snap?.billRequired
                  ? billAttached
                    ? "Required · Attached"
                    : "Required · Missing"
                  : "Not Required"
              }
            />
            <Row
              k="Prior Approval"
              v={
                snap?.priorApprovalRequired
                  ? priorAttached
                    ? "Required · Available"
                    : "Required · Missing"
                  : "Not required"
              }
            />
            {claim.attachments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No files.</p>
            ) : (
              <ul className="space-y-1.5 pt-1">
                {claim.attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{a.fileName}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {a.kind === "bill" ? "Hotel / expense bill" : a.kind} · {a.sizeLabel}
                      </p>
                    </div>
                    {a.dataUrl ? (
                      <a
                        href={a.dataUrl}
                        download={a.fileName}
                        className="text-xs text-brand-700 font-medium shrink-0"
                      >
                        View
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="5. Policy Validation">
            {claim.policyCheckSnapshot?.length ? (
              <PolicyCheckPanel rows={claim.policyCheckSnapshot} />
            ) : (
              <p className="text-xs text-muted-foreground">No claim-time policy check snapshot stored.</p>
            )}
          </Section>

          <Section title="6. Approval History">
            <p className="text-[11px] text-muted-foreground">
              Chain: {claim.approvalChainName || "—"}
            </p>
            <ul className="space-y-2 pt-1">
              {(claim.approvalSteps ?? []).map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold">
                      {s.roleLabel}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {s.resolved ? s.assigneeName : "Approval Configuration Required"}
                      </span>
                    </p>
                    {s.remark ? <p className="text-[11px] text-muted-foreground">{s.remark}</p> : null}
                    {s.actedAt ? <p className="text-[10px] text-muted-foreground">{new Date(s.actedAt).toLocaleString("en-IN")}</p> : null}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold shrink-0",
                      s.status === "approved" && "text-emerald-700",
                      s.status === "rejected" && "text-red-700",
                      s.status === "returned" && "text-orange-700",
                      s.status === "pending" && "text-amber-700",
                    )}
                  >
                    {stepStatusLabel(s.status)}
                  </span>
                </li>
              ))}
            </ul>
            {(claim.reviewHistory ?? []).length > 0 ? (
              <div className="pt-2 border-t border-border space-y-1.5">
                {(claim.reviewHistory ?? []).map((ev) => (
                  <p key={ev.id} className="text-[11px]">
                    <span className="font-semibold">{ev.stage}</span> · {ev.user} · {ev.action}
                    {ev.remark ? ` — ${ev.remark}` : ""}{" "}
                    <span className="text-muted-foreground">{new Date(ev.at).toLocaleString("en-IN")}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </Section>

          {claim.status === "approved" || claim.status === "partially_approved" ? (
            <Section title="Reimbursement">
              <p className="text-xs font-semibold text-navy-700">Approved — Awaiting Processing</p>
              <p className="text-[11px] text-muted-foreground">Payment is not processed in this phase.</p>
              <Row k="Final approved amount" v={formatInr(claim.approvedAmount)} />
              <Row k="Final approver" v={claim.finalApproverName || "—"} />
            </Section>
          ) : null}

          {canAct ? (
            <Section title="7. Review Decision">
              <p className="text-[11px] text-muted-foreground">{stageHint}</p>
              <FieldBlock label="Approved Amount" required hint="Cannot exceed eligibility unless an exception approver remains in the chain.">
                <TextField
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </FieldBlock>
              {claim.claimType === "personal_vehicle_km" ? (
                <p className="text-[11px] text-muted-foreground">KM rate is from the snapshot and is not editable. Adjust amount or return the claim to correct KM.</p>
              ) : null}
              <FieldBlock label="Remark">
                <AreaField value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Required for partial approval" />
              </FieldBlock>
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
            </Section>
          ) : (
            <p className="text-xs text-muted-foreground px-1">
              {claim.status === "submitted" || claim.status === "under_review"
                ? `Switch reviewer context to ${step?.roleLabel ?? "the current approver"} to act.`
                : "This claim is not awaiting a decision."}
            </p>
          )}
        </SheetBody>
        {canAct ? (
          <SheetFooter className="flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 text-xs" onClick={() => { setError(""); setReturnOpen(true); }}>
                Return for Correction
              </Button>
              <Button variant="outline" className="h-9 text-xs text-red-700 border-red-200" onClick={() => { setError(""); setRejectOpen(true); }}>
                Reject
              </Button>
            </div>
            <Button className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => { setError(""); setApproveOpen(true); }}>
              Approve
            </Button>
          </SheetFooter>
        ) : (
          <SheetFooter>
            <Button variant="outline" className="h-9 text-xs" onClick={onClose}>
              Close
            </Button>
          </SheetFooter>
        )}
      </SheetContent>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve this claim?</DialogTitle>
            <DialogDescription className="space-y-1 pt-2 text-xs">
              <span className="block">Claimed: {formatInr(claimed)}</span>
              <span className="block">Eligible: {formatInr(eligible)}</span>
              <span className="block">Approved: {formatInr(amountNum)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-9" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button className="h-9 bg-brand-600 hover:bg-brand-700 text-white" onClick={doApprove}>
              Approve Claim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject claim</DialogTitle>
            <DialogDescription>Reason is mandatory.</DialogDescription>
          </DialogHeader>
          <FieldBlock label="Reason" required>
            <SearchSelect
              value={rejectCode}
              placeholder="Select reason…"
              options={REJECT_REASON_OPTIONS.map((r) => ({ value: r.id, label: r.label }))}
              onChange={setRejectCode}
            />
          </FieldBlock>
          <FieldBlock label={rejectCode === "other" ? "Details" : "Additional note"} required={rejectCode === "other"}>
            <AreaField value={rejectText} onChange={(e) => setRejectText(e.target.value)} />
          </FieldBlock>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-9" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button className="h-9 bg-red-600 hover:bg-red-700 text-white" onClick={doReject}>
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Return for correction</DialogTitle>
            <DialogDescription>The employee can edit and resubmit. Reason is required.</DialogDescription>
          </DialogHeader>
          <FieldBlock label="Reason" required>
            <SearchSelect
              value={returnCode}
              placeholder="Select reason…"
              options={RETURN_REASON_OPTIONS.map((r) => ({ value: r.id, label: r.label }))}
              onChange={setReturnCode}
            />
          </FieldBlock>
          <FieldBlock label={returnCode === "other" ? "Details" : "Additional note"} required={returnCode === "other"}>
            <AreaField value={returnText} onChange={(e) => setReturnText(e.target.value)} />
          </FieldBlock>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-9" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button className="h-9 bg-brand-600 hover:bg-brand-700 text-white" onClick={doReturn}>
              Return Claim
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
