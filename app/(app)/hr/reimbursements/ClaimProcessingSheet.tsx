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
import { policyToday } from "@/lib/hr/policy-common";
import {
  listFinalizedPayrollRuns,
  listOpenPayrollRuns,
} from "@/app/(app)/hr/payroll/payroll-run-data";
import {
  AttachmentList,
  ClaimStatusPill,
  FieldBlock,
  SearchSelect,
  TextField,
  AreaField,
} from "@/app/(app)/employee/claims/claim-ui";
import {
  PROCESSING_METHOD_LABEL,
  claimTypeLabel,
  formatClaimDate,
  formatInr,
  reimbursementStatusLabel,
  type EmployeeTravelClaim,
  type ReimbursementProcessingMethod,
} from "@/app/(app)/employee/claims/travel-claim-data";
import {
  canMarkProcessed,
  canMarkSentToAccounts,
  canPutOnHold,
  canResumeFromHold,
  canStartProcessing,
  markProcessingCompleted,
  markSentToAccounts,
  processingAmount,
  putReimbursementOnHold,
  resumeReimbursementProcessing,
  startReimbursementProcessing,
} from "@/app/(app)/employee/claims/travel-claim-processing";

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

function ReimbStatusPill({ status }: { status: EmployeeTravelClaim["reimbursementStatus"] }) {
  const tone =
    status === "paid" || status === "processed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "on_hold"
        ? "bg-amber-50 text-amber-700"
        : status === "sent_to_accounts" || status === "ready_for_accounts"
          ? "bg-navy-50 text-navy-700"
          : status === "queued_for_payroll"
            ? "bg-purple-50 text-purple-700"
            : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-semibold", tone)}>
      {reimbursementStatusLabel(status)}
    </span>
  );
}

export function ClaimProcessingSheet({
  claim,
  onClose,
  onChanged,
}: {
  claim: EmployeeTravelClaim | null;
  onClose: () => void;
  onChanged: (next: EmployeeTravelClaim) => void;
}) {
  const [processOpen, setProcessOpen] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [error, setError] = useState("");

  const [method, setMethod] = useState<Exclude<ReimbursementProcessingMethod, ""> | "">("");
  const [processingDate, setProcessingDate] = useState(policyToday());
  const [reference, setReference] = useState("");
  const [remark, setRemark] = useState("");
  const [methodOther, setMethodOther] = useState("");
  const [payrollKey, setPayrollKey] = useState("");
  const [holdReason, setHoldReason] = useState("");

  const employee = claim ? getHrEmployeeById(claim.employeeId) : undefined;

  const payrollOptions = useMemo(() => {
    const open = listOpenPayrollRuns();
    const finalized = listFinalizedPayrollRuns().slice(0, 12);
    const map = new Map<string, { id: string; label: string; cycleName: string }>();
    for (const r of [...open, ...finalized]) {
      map.set(r.id, {
        id: r.id,
        label: r.periodLabel,
        cycleName: r.cycleName,
      });
    }
    return Array.from(map.values());
  }, [claim?.id, processOpen]);

  useEffect(() => {
    if (!claim) return;
    setError("");
    setMethod("");
    setProcessingDate(policyToday());
    setReference("");
    setRemark("");
    setMethodOther("");
    setPayrollKey("");
    setHoldReason("");
  }, [claim?.id]);

  if (!claim) return null;

  const claimed = claim.claimedAmount;
  const approved = processingAmount(claim);
  const diff = Math.max(0, claimed - approved);
  const bank = employee?.bank;

  const doStart = () => {
    if (!method) {
      setError("Select a processing method.");
      return;
    }
    const period = payrollOptions.find((p) => p.id === payrollKey);
    const res = startReimbursementProcessing(claim, {
      method,
      processingDate,
      reference,
      remark,
      methodOther,
      payrollPeriodId: period?.id,
      payrollPeriodLabel: period?.label,
      payrollCycleName: period?.cycleName,
    });
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not start processing.");
      return;
    }
    setProcessOpen(false);
    onChanged(res.claim);
  };

  const doSent = () => {
    const res = markSentToAccounts(claim);
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not mark sent.");
      return;
    }
    setSentOpen(false);
    onChanged(res.claim);
  };

  const doHold = () => {
    const res = putReimbursementOnHold(claim, { reason: holdReason });
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not put on hold.");
      return;
    }
    setHoldOpen(false);
    onChanged(res.claim);
  };

  const doResume = () => {
    const res = resumeReimbursementProcessing(claim);
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not resume.");
      return;
    }
    onChanged(res.claim);
  };

  const doProcessed = () => {
    const res = markProcessingCompleted(claim);
    if (!res.ok || !res.claim) {
      setError(res.error || "Could not mark processed.");
      return;
    }
    onChanged(res.claim);
  };

  return (
    <>
      <Sheet open={!!claim} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="max-w-[760px] sm:max-w-[760px]">
          <SheetHeader>
            <SheetTitle className="pr-8 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-brand-700">{claim.claimNo}</span>
              <ClaimStatusPill status={claim.status} />
              <ReimbStatusPill status={claim.reimbursementStatus} />
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{claimTypeLabel(claim.claimType)} · Reimbursement Processing</p>
          </SheetHeader>
          <SheetBody className="space-y-3 bg-muted/20">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            ) : null}

            <Section title="Claim">
              <Row k="Claim No." v={<span className="font-mono text-brand-700">{claim.claimNo}</span>} />
              <Row k="Employee" v={`${claim.employeeName} (${claim.employeeCode})`} />
              <Row k="Claim Type" v={claimTypeLabel(claim.claimType)} />
              <Row k="Claimed Amount" v={<span className="tabular-nums">{formatInr(claimed)}</span>} />
              <Row k="Eligible Amount" v={<span className="tabular-nums">{formatInr(claim.eligibleAmount)}</span>} />
              <Row k="Approved Amount" v={<span className="tabular-nums font-semibold text-emerald-700">{formatInr(approved)}</span>} />
              {claim.status === "partially_approved" ? (
                <Row k="Difference" v={<span className="tabular-nums text-amber-700">{formatInr(diff)}</span>} />
              ) : null}
              <Row k="Final Approval Date" v={claim.finalApprovedAt ? new Date(claim.finalApprovedAt).toLocaleString("en-IN") : "—"} />
              <p className="text-[11px] text-muted-foreground pt-1">
                Processing amount is always the approved amount. Approved amount cannot be changed here.
              </p>
            </Section>

            <Section title="Processing">
              <Row k="Method" v={claim.processingMethod ? PROCESSING_METHOD_LABEL[claim.processingMethod] : "—"} />
              {claim.processingMethodOther ? <Row k="Method Description" v={claim.processingMethodOther} /> : null}
              <Row k="Reimbursement Status" v={<ReimbStatusPill status={claim.reimbursementStatus} />} />
              <Row k="Processing Date" v={formatClaimDate(claim.processingDate)} />
              <Row k="Reference" v={claim.processingReference || "—"} />
              <Row k="Internal Remark" v={claim.processingRemark || "—"} />
              {claim.payrollPeriodLabel ? (
                <Row
                  k="Payroll Period"
                  v={`${claim.payrollPeriodLabel}${claim.payrollCycleName ? ` · ${claim.payrollCycleName}` : ""}`}
                />
              ) : null}
              {claim.accountsReadyAt ? (
                <Row k="Accounts Ready At" v={new Date(claim.accountsReadyAt).toLocaleString("en-IN")} />
              ) : null}
              {claim.accountsSentAt ? (
                <Row k="Sent to Accounts" v={`${new Date(claim.accountsSentAt).toLocaleString("en-IN")} · ${claim.accountsSentBy || "—"}`} />
              ) : null}
              {claim.processedOn ? (
                <Row k="Processed On" v={`${formatClaimDate(claim.processedOn.slice(0, 10))} · ${claim.processedBy || "—"}`} />
              ) : null}
              {claim.reimbursementStatus === "on_hold" ? (
                <>
                  <Row k="Hold Reason" v={claim.holdReason || "—"} />
                  <Row k="Held On" v={claim.heldOn ? new Date(claim.heldOn).toLocaleString("en-IN") : "—"} />
                  <Row k="Held By" v={claim.heldBy || "—"} />
                </>
              ) : null}
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 mt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Paid</p>
                <p className="text-[11px] text-muted-foreground">
                  Paid is supported on the claim model for future Accounts reconciliation. Manual Paid transition is disabled until the Accounts adapter / payment workflow exists.
                </p>
              </div>
            </Section>

            {claim.processingMethod === "accounts" || canStartProcessing(claim) ? (
              <Section title="Employee Bank (read-only)">
                <Row k="Bank" v={bank?.bankName || "—"} />
                <Row k="Account" v={bank?.accountNumber ? `••••${bank.accountNumber.slice(-4)}` : "—"} />
                <Row k="IFSC" v={bank?.ifscCode || "—"} />
              </Section>
            ) : null}

            <Section title="Approval History">
              {(claim.reviewHistory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No approval events.</p>
              ) : (
                <ol className="space-y-2">
                  {claim.reviewHistory.map((ev) => (
                    <li key={ev.id} className="text-xs border-b border-border/50 pb-2 last:border-0">
                      <p className="font-semibold">{ev.stage} · {ev.action}</p>
                      <p className="text-[11px] text-muted-foreground">{ev.user}{ev.remark ? ` — ${ev.remark}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(ev.at).toLocaleString("en-IN")}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            <Section title="Processing History">
              {(claim.processingHistory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No processing events yet.</p>
              ) : (
                <ol className="space-y-2">
                  {claim.processingHistory.map((ev) => (
                    <li key={ev.id} className="text-xs border-b border-border/50 pb-2 last:border-0">
                      <p className="font-semibold">{ev.action}</p>
                      <p className="text-[11px] text-muted-foreground">{ev.user}{ev.remark ? ` — ${ev.remark}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(ev.at).toLocaleString("en-IN")}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            <Section title="Documents">
              <AttachmentList items={claim.attachments} readOnly />
            </Section>
          </SheetBody>
          <SheetFooter className="flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Close
            </Button>
            {canResumeFromHold(claim) ? (
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={doResume}>
                Resume Processing
              </Button>
            ) : null}
            {canPutOnHold(claim) ? (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setHoldOpen(true)}>
                Put On Hold
              </Button>
            ) : null}
            {canStartProcessing(claim) ? (
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => setProcessOpen(true)}>
                Process Reimbursement
              </Button>
            ) : null}
            {canMarkSentToAccounts(claim) ? (
              <Button size="sm" className="h-8 text-xs bg-navy-700 hover:bg-navy-800 text-white" onClick={() => setSentOpen(true)}>
                Mark Sent to Accounts
              </Button>
            ) : null}
            {canMarkProcessed(claim) && claim.reimbursementStatus !== "ready_for_accounts" ? (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={doProcessed}>
                Mark Processing Completed
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={processOpen} onOpenChange={setProcessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Process Reimbursement</DialogTitle>
            <DialogDescription>
              {claim.claimNo} · Processing amount {formatInr(approved)}
              {claim.status === "partially_approved" ? ` (claimed ${formatInr(claimed)})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FieldBlock label="Processing Method" required>
              <SearchSelect
                value={method}
                placeholder="Select method…"
                options={[
                  { value: "payroll", label: PROCESSING_METHOD_LABEL.payroll },
                  { value: "accounts", label: PROCESSING_METHOD_LABEL.accounts },
                  { value: "cash", label: PROCESSING_METHOD_LABEL.cash },
                  { value: "other", label: PROCESSING_METHOD_LABEL.other },
                ]}
                onChange={(v) => setMethod(v as Exclude<ReimbursementProcessingMethod, "">)}
              />
            </FieldBlock>
            <FieldBlock label="Processing Date" required>
              <TextField type="date" value={processingDate} onChange={(e) => setProcessingDate(e.target.value)} />
            </FieldBlock>
            {method === "payroll" ? (
              <FieldBlock label="Payroll Period / Cycle" required>
                <SearchSelect
                  value={payrollKey}
                  placeholder="Select payroll run…"
                  options={
                    payrollOptions.length
                      ? payrollOptions.map((p) => ({
                          value: p.id,
                          label: `${p.label} · ${p.cycleName}`,
                        }))
                      : [{ value: "", label: "No payroll runs — create one under Payroll first" }]
                  }
                  onChange={setPayrollKey}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Queues the claim for payroll period only. Does not add amount to salary calculation.
                </p>
              </FieldBlock>
            ) : null}
            {method === "accounts" ? (
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-[11px] space-y-1">
                <p className="font-semibold text-foreground">Employee bank (read-only)</p>
                <p>{bank?.bankName || "—"} · {bank?.accountNumber ? `••••${bank.accountNumber.slice(-4)}` : "—"} · {bank?.ifscCode || "—"}</p>
                <p className="text-muted-foreground">Sets Ready for Accounts. Does not create an Accounts payable.</p>
              </div>
            ) : null}
            {method === "other" ? (
              <FieldBlock label="Method Description" required>
                <TextField value={methodOther} onChange={(e) => setMethodOther(e.target.value)} placeholder="Describe method…" />
              </FieldBlock>
            ) : null}
            <FieldBlock label="Reference / Internal Note">
              <TextField value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional reference" />
            </FieldBlock>
            <FieldBlock label="Remark">
              <AreaField value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
            </FieldBlock>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setProcessOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={doStart}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sentOpen} onOpenChange={setSentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Mark Sent to Accounts?</DialogTitle>
            <DialogDescription>
              Mark claim {claim.claimNo} as sent to Accounts? This is a frontend lifecycle flag only — no Accounts record will be created.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSentOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-navy-700 hover:bg-navy-800 text-white" onClick={doSent}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Put On Hold</DialogTitle>
            <DialogDescription>Operational hold after approval — not a claim rejection.</DialogDescription>
          </DialogHeader>
          <FieldBlock label="Hold Reason" required>
            <AreaField value={holdReason} onChange={(e) => setHoldReason(e.target.value)} rows={3} />
          </FieldBlock>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setHoldOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white" disabled={!holdReason.trim()} onClick={doHold}>
              Put On Hold
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
