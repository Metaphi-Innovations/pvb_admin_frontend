/**
 * Canonical reimbursement processing lifecycle (post-approval).
 * HR-side only — does not create Accounts payables or payroll salary lines.
 */

import { createHrNotification } from "@/lib/hr/hr-notifications";
import { CURRENT_USER } from "@/lib/hr/config";
import { policyToday } from "@/lib/hr/policy-common";
import {
  formatInr,
  newProcessingEventId,
  newTimelineId,
  reimbursementStatusLabel,
  saveTravelClaim,
  type ClaimAttachment,
  type ClaimProcessingEvent,
  type ClaimReviewEvent,
  type EmployeeTravelClaim,
  type ReimbursementProcessStatus,
  type ReimbursementProcessingMethod,
} from "./travel-claim-data";

export type ProcessingActionResult = { ok: boolean; error?: string; claim?: EmployeeTravelClaim };

const LOCKED_STATUSES: ReimbursementProcessStatus[] = [
  "ready_for_accounts",
  "sent_to_accounts",
  "processed",
  "paid",
];

export function isFinalApprovedClaim(claim: EmployeeTravelClaim): boolean {
  return claim.status === "approved" || claim.status === "partially_approved";
}

export function processingAmount(claim: EmployeeTravelClaim): number {
  if (claim.approvedAmount != null && Number.isFinite(claim.approvedAmount)) {
    return claim.approvedAmount;
  }
  return 0;
}

export function isProcessingEligible(claim: EmployeeTravelClaim): boolean {
  return isFinalApprovedClaim(claim);
}

export function isClaimAmountLocked(claim: EmployeeTravelClaim): boolean {
  if (!isFinalApprovedClaim(claim)) return false;
  const rs = claim.reimbursementStatus;
  return LOCKED_STATUSES.includes(rs) || rs === "queued_for_payroll" || rs === "on_hold";
}

export function canStartProcessing(claim: EmployeeTravelClaim): boolean {
  return (
    isProcessingEligible(claim) &&
    (claim.reimbursementStatus === "awaiting_processing" ||
      (claim.reimbursementStatus === "on_hold" && claim.holdResumeStatus === "awaiting_processing"))
  );
}

export function canChangeProcessingMethod(claim: EmployeeTravelClaim): boolean {
  if (!isProcessingEligible(claim)) return false;
  const rs = claim.reimbursementStatus;
  return rs === "awaiting_processing" || (rs === "on_hold" && claim.holdResumeStatus === "awaiting_processing");
}

export function canMarkSentToAccounts(claim: EmployeeTravelClaim): boolean {
  return isProcessingEligible(claim) && claim.reimbursementStatus === "ready_for_accounts";
}

export function canMarkProcessed(claim: EmployeeTravelClaim): boolean {
  if (!isProcessingEligible(claim)) return false;
  const rs = claim.reimbursementStatus;
  return rs === "queued_for_payroll" || rs === "sent_to_accounts";
}

export function canPutOnHold(claim: EmployeeTravelClaim): boolean {
  if (!isProcessingEligible(claim)) return false;
  const rs = claim.reimbursementStatus;
  return (
    rs === "awaiting_processing" ||
    rs === "queued_for_payroll" ||
    rs === "ready_for_accounts"
  );
}

export function canResumeFromHold(claim: EmployeeTravelClaim): boolean {
  return isProcessingEligible(claim) && claim.reimbursementStatus === "on_hold";
}

/** Manual Paid marking is model-ready but disabled until Accounts adapter exists. */
export function canMarkPaid(_claim: EmployeeTravelClaim): boolean {
  return false;
}

export function isInProcessingQueue(claim: EmployeeTravelClaim): boolean {
  if (!isProcessingEligible(claim)) return false;
  const rs = claim.reimbursementStatus;
  return (
    rs === "awaiting_processing" ||
    rs === "queued_for_payroll" ||
    rs === "ready_for_accounts" ||
    rs === "sent_to_accounts" ||
    rs === "on_hold"
  );
}

export function isProcessedTabClaim(claim: EmployeeTravelClaim): boolean {
  if (!isProcessingEligible(claim)) return false;
  return claim.reimbursementStatus === "processed" || claim.reimbursementStatus === "paid";
}

function actor(): string {
  return CURRENT_USER || "HR Finance";
}

function stamp(): string {
  return new Date().toISOString();
}

function pushProcessing(
  claim: EmployeeTravelClaim,
  toStatus: ReimbursementProcessStatus,
  action: string,
  remark: string,
): { processingHistory: ClaimProcessingEvent[]; timeline: EmployeeTravelClaim["timeline"] } {
  const fromStatus = claim.reimbursementStatus;
  const at = stamp();
  const ev: ClaimProcessingEvent = {
    id: newProcessingEventId(),
    at,
    action,
    user: actor(),
    remark,
    fromStatus,
    toStatus,
  };
  // Timeline mirrors processing for employee visibility; keep claim.status values only
  // (reimbursementStatus lives on processingHistory / claim.reimbursementStatus).
  const claimTimelineStatus: EmployeeTravelClaim["timeline"][number]["status"] =
    claim.status === "partially_approved" ? "partially_approved" : "approved";
  return {
    processingHistory: [...(claim.processingHistory ?? []), ev],
    timeline: [
      ...claim.timeline,
      {
        id: newTimelineId(),
        at,
        status: claimTimelineStatus,
        label: action,
        detail: remark || reimbursementStatusLabel(toStatus),
      },
    ],
  };
}

function notifyProcessing(
  eventType:
    | "claim_awaiting_finance_processing"
    | "claim_queued_for_payroll"
    | "claim_ready_for_accounts"
    | "claim_sent_to_accounts"
    | "reimbursement_processed",
  claim: EmployeeTravelClaim,
): void {
  createHrNotification({
    eventType,
    employeeId: claim.employeeId,
    sourceModule: "reimbursements",
    sourceId: String(claim.id),
    context: {
      employee_name: claim.employeeName,
      claim_no: claim.claimNo,
      claim_amount: formatInr(claim.claimedAmount),
      approved_amount: formatInr(processingAmount(claim)),
    },
  });
}

export interface StartProcessingInput {
  method: Exclude<ReimbursementProcessingMethod, "">;
  processingDate: string;
  reference: string;
  remark: string;
  methodOther?: string;
  payrollPeriodId?: string;
  payrollPeriodLabel?: string;
  payrollCycleName?: string;
}

export function startReimbursementProcessing(
  claim: EmployeeTravelClaim,
  input: StartProcessingInput,
): ProcessingActionResult {
  if (!isProcessingEligible(claim)) {
    return { ok: false, error: "Only approved or partially approved claims can be processed." };
  }
  if (
    claim.reimbursementStatus === "sent_to_accounts" ||
    claim.reimbursementStatus === "paid" ||
    claim.reimbursementStatus === "processed" ||
    claim.reimbursementStatus === "queued_for_payroll" ||
    claim.reimbursementStatus === "ready_for_accounts"
  ) {
    return { ok: false, error: "This claim already has a processing destination. Duplicate processing is blocked." };
  }
  if (claim.reimbursementStatus !== "awaiting_processing") {
    return { ok: false, error: "Claim must be awaiting processing. Resume from hold first if needed." };
  }

  if (!input.method) return { ok: false, error: "Select a processing method." };
  if (!input.processingDate) return { ok: false, error: "Processing date is required." };

  if (input.method === "payroll") {
    if (!input.payrollPeriodId && !input.payrollPeriodLabel) {
      return { ok: false, error: "Select a payroll period / cycle." };
    }
  }
  if (input.method === "other" && !input.methodOther?.trim()) {
    return { ok: false, error: "Describe the other processing method." };
  }

  let toStatus: ReimbursementProcessStatus;
  let action: string;
  if (input.method === "payroll") {
    toStatus = "queued_for_payroll";
    action = "Queued for Payroll";
  } else if (input.method === "accounts") {
    toStatus = "ready_for_accounts";
    action = "Marked Ready for Accounts";
  } else if (input.method === "cash") {
    toStatus = "processed";
    action = "Processing Completed (Cash / Petty Cash)";
  } else {
    toStatus = "processed";
    action = "Processing Completed (Other)";
  }

  const remarkParts = [
    input.reference.trim() ? `Ref: ${input.reference.trim()}` : "",
    input.remark.trim(),
    input.method === "payroll" && input.payrollPeriodLabel
      ? `Period: ${input.payrollPeriodLabel}${input.payrollCycleName ? ` · ${input.payrollCycleName}` : ""}`
      : "",
    input.method === "other" && input.methodOther?.trim() ? `Method: ${input.methodOther.trim()}` : "",
  ].filter(Boolean);

  const hist = pushProcessing(claim, toStatus, action, remarkParts.join(" · "));
  const now = stamp();
  const next: EmployeeTravelClaim = {
    ...claim,
    reimbursementStatus: toStatus,
    processingMethod: input.method,
    processingMethodOther: input.method === "other" ? (input.methodOther ?? "").trim() : "",
    processingDate: input.processingDate,
    processingReference: input.reference.trim(),
    processingRemark: input.remark.trim(),
    payrollPeriodId: input.method === "payroll" ? (input.payrollPeriodId ?? "") : "",
    payrollPeriodLabel: input.method === "payroll" ? (input.payrollPeriodLabel ?? "") : "",
    payrollCycleName: input.method === "payroll" ? (input.payrollCycleName ?? "") : "",
    accountsReadyAt: input.method === "accounts" ? now : claim.accountsReadyAt,
    accountsSentAt: claim.accountsSentAt,
    accountsSentBy: claim.accountsSentBy,
    processedOn: toStatus === "processed" ? now : claim.processedOn,
    processedBy: toStatus === "processed" ? actor() : claim.processedBy,
    holdReason: "",
    heldOn: "",
    heldBy: "",
    holdResumeStatus: "",
    processingHistory: hist.processingHistory,
    timeline: hist.timeline,
  };

  const saved = saveTravelClaim(next);
  if (toStatus === "queued_for_payroll") notifyProcessing("claim_queued_for_payroll", saved);
  if (toStatus === "ready_for_accounts") notifyProcessing("claim_ready_for_accounts", saved);
  if (toStatus === "processed") notifyProcessing("reimbursement_processed", saved);
  return { ok: true, claim: saved };
}

export function markSentToAccounts(claim: EmployeeTravelClaim): ProcessingActionResult {
  if (!canMarkSentToAccounts(claim)) {
    return { ok: false, error: "Only claims in Ready for Accounts can be marked sent." };
  }
  const now = stamp();
  const hist = pushProcessing(
    claim,
    "sent_to_accounts",
    "Sent to Accounts",
    "Frontend lifecycle only — no Accounts payable created.",
  );
  const saved = saveTravelClaim({
    ...claim,
    reimbursementStatus: "sent_to_accounts",
    accountsSentAt: now,
    accountsSentBy: actor(),
    accountsSyncReference: claim.accountsSyncReference || `HR-SEND-${claim.claimNo}`,
    processingHistory: hist.processingHistory,
    timeline: hist.timeline,
  });
  notifyProcessing("claim_sent_to_accounts", saved);
  return { ok: true, claim: saved };
}

export function markProcessingCompleted(
  claim: EmployeeTravelClaim,
  input?: { reference?: string; remark?: string },
): ProcessingActionResult {
  if (!canMarkProcessed(claim)) {
    return { ok: false, error: "Claim cannot be marked processed from its current state." };
  }
  if (claim.reimbursementStatus === "ready_for_accounts") {
    return {
      ok: false,
      error: "Use Mark Sent to Accounts first, or keep as Ready for Accounts until the adapter consumes it.",
    };
  }
  const now = stamp();
  const remark = [input?.reference?.trim(), input?.remark?.trim()].filter(Boolean).join(" · ");
  const hist = pushProcessing(claim, "processed", "Processing Completed", remark || "Operational processing completed.");
  const saved = saveTravelClaim({
    ...claim,
    reimbursementStatus: "processed",
    processedOn: now,
    processedBy: actor(),
    processingReference: input?.reference?.trim() || claim.processingReference,
    processingRemark: input?.remark?.trim() || claim.processingRemark,
    processingHistory: hist.processingHistory,
    timeline: hist.timeline,
  });
  notifyProcessing("reimbursement_processed", saved);
  return { ok: true, claim: saved };
}

export function putReimbursementOnHold(
  claim: EmployeeTravelClaim,
  input: { reason: string },
): ProcessingActionResult {
  if (!canPutOnHold(claim)) {
    return { ok: false, error: "Claim cannot be put on hold from its current state." };
  }
  if (!input.reason.trim()) return { ok: false, error: "Hold reason is required." };
  const resume = claim.reimbursementStatus;
  const now = stamp();
  const hist = pushProcessing(claim, "on_hold", "Put On Hold", input.reason.trim());
  const saved = saveTravelClaim({
    ...claim,
    holdResumeStatus: resume,
    reimbursementStatus: "on_hold",
    holdReason: input.reason.trim(),
    heldOn: now,
    heldBy: actor(),
    processingHistory: hist.processingHistory,
    timeline: hist.timeline,
  });
  return { ok: true, claim: saved };
}

export function resumeReimbursementProcessing(claim: EmployeeTravelClaim): ProcessingActionResult {
  if (!canResumeFromHold(claim)) {
    return { ok: false, error: "Claim is not on hold." };
  }
  const restore = (claim.holdResumeStatus || "awaiting_processing") as ReimbursementProcessStatus;
  const safeRestore: ReimbursementProcessStatus =
    restore === "on_hold" || restore === "paid" || restore === "sent_to_accounts" || restore === "processed"
      ? "awaiting_processing"
      : restore || "awaiting_processing";
  const hist = pushProcessing(
    claim,
    safeRestore,
    "Resumed",
    `Restored to ${reimbursementStatusLabel(safeRestore)}`,
  );
  const saved = saveTravelClaim({
    ...claim,
    reimbursementStatus: safeRestore,
    holdReason: "",
    heldOn: "",
    heldBy: "",
    holdResumeStatus: "",
    processingHistory: hist.processingHistory,
    timeline: hist.timeline,
  });
  return { ok: true, claim: saved };
}

export function bulkQueueForPayroll(
  claims: EmployeeTravelClaim[],
  period: { id: string; label: string; cycleName: string },
  processingDate?: string,
): { ok: boolean; error?: string; updated: EmployeeTravelClaim[]; skipped: number } {
  if (!period.id && !period.label) {
    return { ok: false, error: "Select a payroll period.", updated: [], skipped: 0 };
  }
  const date = processingDate || policyToday();
  const updated: EmployeeTravelClaim[] = [];
  let skipped = 0;
  for (const c of claims) {
    if (c.reimbursementStatus !== "awaiting_processing" || !isProcessingEligible(c)) {
      skipped += 1;
      continue;
    }
    const res = startReimbursementProcessing(c, {
      method: "payroll",
      processingDate: date,
      reference: "",
      remark: "Bulk queue for payroll",
      payrollPeriodId: period.id,
      payrollPeriodLabel: period.label,
      payrollCycleName: period.cycleName,
    });
    if (res.ok && res.claim) updated.push(res.claim);
    else skipped += 1;
  }
  return { ok: true, updated, skipped };
}

/** Stable HR-side shape for a future Accounts adapter. Do not import into Accounts yet. */
export interface CanonicalReimbursementPayableCandidate {
  id: number;
  claimNumber: string;
  employeeName: string;
  employeeId: number;
  employeeCode: string;
  claimAmount: number;
  approvedAmount: number;
  claimDate: string;
  finalApprovedAt: string;
  reimbursementStatus: ReimbursementProcessStatus;
  processingMethod: ReimbursementProcessingMethod;
  processingDate: string;
  accountsReadyAt: string;
  accountsSentAt: string;
  accountsSentBy: string;
  accountsSyncReference: string;
  processedOn: string;
  processedBy: string;
  paidOn: string;
  paymentReference: string;
  approvalHistory: ClaimReviewEvent[];
  attachments: ClaimAttachment[];
  /** Adapter should treat ready_for_accounts / sent_to_accounts / paid as ingestible. */
  adapterReady: boolean;
}

export function getCanonicalReimbursementPayableCandidate(
  claim: EmployeeTravelClaim,
): CanonicalReimbursementPayableCandidate | null {
  if (!isFinalApprovedClaim(claim)) return null;
  const approved = processingAmount(claim);
  if (!(approved > 0)) return null;
  const rs = claim.reimbursementStatus;
  const adapterReady =
    rs === "ready_for_accounts" || rs === "sent_to_accounts" || rs === "paid" || rs === "processed";
  return {
    id: claim.id,
    claimNumber: claim.claimNo,
    employeeName: claim.employeeName,
    employeeId: claim.employeeId,
    employeeCode: claim.employeeCode,
    claimAmount: claim.claimedAmount,
    approvedAmount: approved,
    claimDate: claim.expenseDate || claim.submittedOn.slice(0, 10),
    finalApprovedAt: claim.finalApprovedAt,
    reimbursementStatus: rs,
    processingMethod: claim.processingMethod,
    processingDate: claim.processingDate,
    accountsReadyAt: claim.accountsReadyAt,
    accountsSentAt: claim.accountsSentAt,
    accountsSentBy: claim.accountsSentBy,
    accountsSyncReference: claim.accountsSyncReference,
    processedOn: claim.processedOn,
    processedBy: claim.processedBy,
    paidOn: claim.paidOn,
    paymentReference: claim.paymentReference,
    approvalHistory: claim.reviewHistory ?? [],
    attachments: claim.attachments ?? [],
    adapterReady,
  };
}

export function countProcessingSummary(claims: EmployeeTravelClaim[]): {
  awaiting: number;
  queuedPayroll: number;
  readyAccounts: number;
  processed: number;
  onHold: number;
} {
  const eligible = claims.filter(isProcessingEligible);
  return {
    awaiting: eligible.filter((c) => c.reimbursementStatus === "awaiting_processing").length,
    queuedPayroll: eligible.filter((c) => c.reimbursementStatus === "queued_for_payroll").length,
    readyAccounts: eligible.filter((c) => c.reimbursementStatus === "ready_for_accounts").length,
    processed: eligible.filter((c) => c.reimbursementStatus === "processed" || c.reimbursementStatus === "paid").length,
    onHold: eligible.filter((c) => c.reimbursementStatus === "on_hold").length,
  };
}
