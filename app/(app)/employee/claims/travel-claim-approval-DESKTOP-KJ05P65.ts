/**
 * Travel claim approval operations.
 * Chains come from Travel Policy approvalChains. Entitlements stay on the claim snapshot.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { getHrEmployeeById, loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import type { ApproverRole, TravelPolicy } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import {
  approverLabel,
  getTravelPolicyById,
  loadTravelPolicies,
} from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import { BRANCH_OPTIONS } from "@/lib/hr/config";
import { getApplicableTravelPolicy } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-resolver";
import { policyToday } from "@/lib/hr/policy-common";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import type { ClaimEvaluation } from "./travel-claim-engine";
import {
  HR_TRAVEL_CLAIMS_EVENT,
  loadTravelClaims,
  newProcessingEventId,
  newTimelineId,
  saveTravelClaim,
  type ClaimApprovalStep,
  type ClaimReviewEvent,
  type EmployeeTravelClaim,
  type StoredPolicyCheck,
} from "./travel-claim-data";

export const REIMBURSEMENT_REVIEWER_KEY = "ds_hr_reimbursement_reviewer_v1";

export const REJECT_REASON_OPTIONS = [
  { id: "outside_policy", label: "Outside Policy" },
  { id: "missing_bill", label: "Missing Bill" },
  { id: "duplicate", label: "Duplicate Claim" },
  { id: "insufficient_docs", label: "Insufficient Documentation" },
  { id: "not_business", label: "Expense Not Business Related" },
  { id: "late", label: "Late Submission" },
  { id: "other", label: "Other" },
] as const;

export const RETURN_REASON_OPTIONS = [
  { id: "missing_attachment", label: "Missing Attachment" },
  { id: "incorrect_km", label: "Incorrect KM" },
  { id: "wrong_date", label: "Wrong Travel Date" },
  { id: "need_approval_doc", label: "Need Approval Document" },
  { id: "incorrect_amount", label: "Incorrect Amount" },
  { id: "other", label: "Other" },
] as const;

export interface ReviewerContext {
  role: ApproverRole;
}

export function loadReviewerContext(): ReviewerContext {
  if (typeof window === "undefined") return { role: "reporting_manager" };
  try {
    const raw = localStorage.getItem(REIMBURSEMENT_REVIEWER_KEY);
    if (!raw) return { role: "reporting_manager" };
    const parsed = JSON.parse(raw) as ReviewerContext;
    if (parsed?.role) return parsed;
  } catch {
    /* fall through */
  }
  return { role: "reporting_manager" };
}

export function setReviewerContext(role: ApproverRole): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REIMBURSEMENT_REVIEWER_KEY, JSON.stringify({ role }));
  window.dispatchEvent(new Event(HR_TRAVEL_CLAIMS_EVENT));
}

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

export function branchLabel(code: string): string {
  return BRANCH_OPTIONS.find((b) => b.value === code)?.label ?? code ?? "—";
}

export function resolveApproverForRole(
  role: ApproverRole,
  employee: HrEmployee | undefined,
): { employeeId: number | null; name: string; resolved: boolean } {
  const people = loadHrEmployees().filter((e) => e.status === "active");
  if (role === "reporting_manager") {
    if (employee?.reportingManagerId) {
      const mgr = getHrEmployeeById(employee.reportingManagerId);
      if (mgr) return { employeeId: mgr.id, name: mgr.employeeName, resolved: true };
    }
    if (employee?.reportingManagerName && employee.reportingManagerName !== "—") {
      const byName = people.find((e) => norm(e.employeeName) === norm(employee.reportingManagerName.split("(")[0] || ""));
      if (byName) return { employeeId: byName.id, name: byName.employeeName, resolved: true };
    }
    return { employeeId: null, name: "Approval Configuration Required", resolved: false };
  }
  const hit = people.find((e) => matchesRole(e, role));
  if (hit) return { employeeId: hit.id, name: hit.employeeName, resolved: true };
  return { employeeId: null, name: "Approval Configuration Required", resolved: false };
}

function matchesRole(e: HrEmployee, role: ApproverRole): boolean {
  const blob = `${e.designation} ${e.department}`.toLowerCase();
  if (role === "sales_head") return /zsm|nsm|sales head|zonal sales|national sales/.test(blob);
  if (role === "bu_head") return /bu head|business unit|nsm/.test(blob);
  if (role === "hr") return /\bhr\b|human resource/.test(blob);
  if (role === "finance") return /finance|accounts|accountant/.test(blob);
  return false;
}

export function selectApprovalChain(
  policy: TravelPolicy | null,
  isException: boolean,
): { id: string; name: string; steps: ApproverRole[] } | null {
  if (!policy?.approvalChains?.length) return null;
  const chains = policy.approvalChains;
  if (isException) {
    const ex = chains.find((c) => /exception/i.test(c.name));
    if (ex) return ex;
  } else {
    const normal = chains.find((c) => /normal/i.test(c.name));
    if (normal) return normal;
  }
  return chains[0] ?? null;
}

function buildSteps(
  chain: { name: string; steps: ApproverRole[] },
  employee: HrEmployee | undefined,
): ClaimApprovalStep[] {
  return chain.steps.map((role, i) => {
    const resolved = resolveApproverForRole(role, employee);
    return {
      id: `step_${i}_${role}`,
      order: i,
      role,
      roleLabel: approverLabel(role),
      status: "pending",
      assigneeEmployeeId: resolved.employeeId,
      assigneeName: resolved.resolved ? resolved.name : "Approval Configuration Required",
      resolved: resolved.resolved,
      actedAt: "",
      actedBy: "",
      remark: "",
      approvedAmount: null,
    };
  });
}

export function currentApprovalStep(claim: EmployeeTravelClaim): ClaimApprovalStep | null {
  const steps = claim.approvalSteps ?? [];
  return steps.find((s) => s.status === "pending") ?? null;
}

export function currentApproverLabel(claim: EmployeeTravelClaim): string {
  if (claim.status === "approved" || claim.status === "partially_approved") return "—";
  if (claim.status === "rejected" || claim.status === "returned" || claim.status === "draft") return "—";
  const step = currentApprovalStep(claim);
  if (!step) return "—";
  return step.resolved ? `${step.roleLabel} · ${step.assigneeName}` : `${step.roleLabel} · Configuration required`;
}

export function reviewerCanAct(claim: EmployeeTravelClaim, ctx: ReviewerContext): boolean {
  if (claim.status !== "submitted" && claim.status !== "under_review") return false;
  const step = currentApprovalStep(claim);
  if (!step) return false;
  return step.role === ctx.role;
}

export function reviewerBanner(claim: EmployeeTravelClaim, ctx: ReviewerContext): string | null {
  const step = currentApprovalStep(claim);
  if (!step || step.role !== ctx.role) return null;
  if (!step.resolved) {
    return `No ${step.roleLabel} is mapped on the employee master. You are acting in the prototype ${step.roleLabel} role.`;
  }
  return null;
}

function policyForSubmit(employee: HrEmployee, claim: EmployeeTravelClaim): TravelPolicy | null {
  if (claim.policySnapshot?.policyId) {
    return getTravelPolicyById(claim.policySnapshot.policyId) ?? null;
  }
  return getApplicableTravelPolicy(employee, claim.expenseDate || policyToday(), loadTravelPolicies());
}

export function attachApprovalOnSubmit(
  claim: EmployeeTravelClaim,
  employee: HrEmployee,
  evaln: ClaimEvaluation,
): EmployeeTravelClaim {
  const isException = (evaln.exceptionAmount > 0.009 || evaln.exceptionRequired) && evaln.exceptionAmount >= 0;
  const policy = evaln.policy ?? policyForSubmit(employee, claim);
  const chain = selectApprovalChain(policy, isException || evaln.exceptionRequired);
  const wasReturned = claim.status === "returned";
  const revision = (claim.revision ?? 0) + 1;
  const prevHistory = claim.reviewHistory ?? [];
  const prevRevisions = claim.revisionHistory ?? [];
  const checks: StoredPolicyCheck[] = evaln.checks.map((c) => ({
    id: c.id,
    level: c.level,
    label: c.label,
    detail: c.detail,
  }));

  const revisionEntry = claim.policySnapshot
    ? [
        ...prevRevisions,
        {
          revision: claim.revision || 1,
          submittedOn: claim.submittedOn,
          claimedAmount: claim.claimedAmount,
          eligibleAmount: claim.eligibleAmount,
          exceptionAmount: claim.exceptionAmount,
          policySnapshot: claim.policySnapshot,
        },
      ]
    : prevRevisions;

  const now = new Date().toISOString();
  const history: ClaimReviewEvent[] = [
    ...prevHistory,
    {
      id: newTimelineId(),
      at: now,
      stage: "Employee",
      user: employee.employeeName,
      action: wasReturned ? "Resubmitted" : "Submitted",
      remark: wasReturned ? `Revision ${revision}` : "",
      revision,
    },
  ];

  return {
    ...claim,
    revision,
    approvalChainName: chain?.name ?? "",
    approvalSteps: chain ? buildSteps(chain, employee) : [],
    currentStepIndex: 0,
    reviewHistory: history,
    policyCheckSnapshot: checks,
    returnedReason: "",
    rejectionReason: "",
    rejectionCode: "",
    exceptionApprovalStatus: evaln.exceptionRequired || evaln.exceptionAmount > 0.009 ? "required" : "none",
    reimbursementStatus: "",
    finalApprovedAt: "",
    finalApproverName: "",
    revisionHistory: wasReturned ? revisionEntry : claim.revisionHistory ?? [],
    approvedAmount: null,
  };
}

export function defaultApprovedAmount(claim: EmployeeTravelClaim): number {
  if (claim.approvedAmount != null && Number.isFinite(claim.approvedAmount)) {
    return claim.approvedAmount;
  }
  const eligible = claim.policySnapshot?.eligibleAmount ?? claim.eligibleAmount;
  const claimed = claim.policySnapshot?.claimedAmount ?? claim.claimedAmount;
  if ((claim.exceptionAmount ?? 0) > 0.009 || (claim.policySnapshot?.exceptionAmount ?? 0) > 0.009) {
    return eligible;
  }
  return claimed;
}

export function recommendedPayable(claim: EmployeeTravelClaim): number {
  return claim.policySnapshot?.eligibleAmount ?? claim.eligibleAmount;
}

function actorName(ctx: ReviewerContext, claim: EmployeeTravelClaim): string {
  const step = currentApprovalStep(claim);
  if (step?.resolved && step.assigneeName) return step.assigneeName;
  return approverLabel(ctx.role);
}

function finalizeClaim(claim: EmployeeTravelClaim, approvedAmount: number, ctx: ReviewerContext): EmployeeTravelClaim {
  const claimed = claim.policySnapshot?.claimedAmount ?? claim.claimedAmount;
  const partial = approvedAmount + 0.009 < claimed && approvedAmount > 0;
  const now = new Date().toISOString();
  return {
    ...claim,
    status: partial ? "partially_approved" : "approved",
    approvedAmount,
    finalApprovedAt: now,
    finalApproverName: actorName(ctx, claim),
    reimbursementStatus: "awaiting_processing",
    exceptionApprovalStatus:
      claim.exceptionApprovalStatus === "required" || claim.exceptionApprovalStatus === "pending"
        ? "approved"
        : claim.exceptionApprovalStatus,
    processingHistory: [
      ...(claim.processingHistory ?? []),
      {
        id: newProcessingEventId(),
        at: now,
        action: "Entered Processing",
        user: actorName(ctx, claim),
        remark: `Approved amount ${formatAmt(approvedAmount)} — awaiting processing`,
        fromStatus: claim.reimbursementStatus || "",
        toStatus: "awaiting_processing",
      },
    ],
    timeline: [
      ...claim.timeline,
      {
        id: newTimelineId(),
        at: now,
        status: partial ? "partially_approved" : "approved",
        label: partial ? "Partially Approved" : "Approved",
        detail: `Final approved amount ${formatAmt(approvedAmount)}`,
      },
      {
        id: newTimelineId(),
        at: now,
        status: "awaiting_processing",
        label: "Awaiting Processing",
        detail: "Claim entered reimbursement processing queue",
      },
    ],
  };
}

function formatAmt(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function notifyClaim(
  eventType:
    | "claim_submitted"
    | "claim_returned"
    | "claim_approved"
    | "claim_partially_approved"
    | "claim_rejected"
    | "exception_approval_required"
    | "claim_awaiting_finance_processing",
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
      claim_amount: formatAmt(claim.claimedAmount),
      approved_amount:
        claim.approvedAmount != null && Number.isFinite(claim.approvedAmount)
          ? formatAmt(claim.approvedAmount)
          : "",
    },
  });
}

export function approveCurrentStep(
  claim: EmployeeTravelClaim,
  ctx: ReviewerContext,
  input: { amount: number; remark: string },
): { ok: boolean; error?: string; claim?: EmployeeTravelClaim } {
  if (!reviewerCanAct(claim, ctx)) {
    return { ok: false, error: "Only the current required approver can act on this claim." };
  }
  const step = currentApprovalStep(claim);
  if (!step) return { ok: false, error: "No pending approval step." };

  const eligible = claim.policySnapshot?.eligibleAmount ?? claim.eligibleAmount;
  const claimed = claim.policySnapshot?.claimedAmount ?? claim.claimedAmount;
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: "Enter a valid approved amount." };
  if (amount === 0) return { ok: false, error: "Use Reject to refuse the claim. Approved amount must be greater than zero." };

  const exceedsEligible = amount > eligible + 0.009;
  const isPartial = amount + 0.009 < claimed;
  if (isPartial && !input.remark.trim()) {
    return { ok: false, error: "Partial approval requires a remark." };
  }
  if (exceedsEligible) {
    const remaining = (claim.approvalSteps ?? []).filter(
      (s) => s.status === "pending" && s.role !== step.role,
    );
    const hasExceptionApprover = remaining.some((s) => s.role === "sales_head" || s.role === "bu_head");
    const alreadyException = claim.exceptionApprovalStatus === "required" || claim.exceptionApprovalStatus === "pending";
    if (!hasExceptionApprover && !alreadyException) {
      return {
        ok: false,
        error: "Cannot approve above policy eligibility without an exception approver in the remaining chain.",
      };
    }
    if (!input.remark.trim()) {
      return { ok: false, error: "Approving above eligibility requires an exception reason." };
    }
  }

  const now = new Date().toISOString();
  const actor = actorName(ctx, claim);
  const steps = (claim.approvalSteps ?? []).map((s) =>
    s.id === step.id
      ? {
          ...s,
          status: "approved" as const,
          actedAt: now,
          actedBy: actor,
          remark: input.remark.trim(),
          approvedAmount: amount,
        }
      : s,
  );
  const nextPending = steps.find((s) => s.status === "pending");
  const history: ClaimReviewEvent[] = [
    ...(claim.reviewHistory ?? []),
    {
      id: newTimelineId(),
      at: now,
      stage: step.roleLabel,
      user: actor,
      action: "Approved",
      remark: input.remark.trim() || `Approved ${formatAmt(amount)}`,
      revision: claim.revision,
    },
  ];

  let next: EmployeeTravelClaim = {
    ...claim,
    approvalSteps: steps,
    currentStepIndex: nextPending ? nextPending.order : steps.length,
    reviewHistory: history,
    approvedAmount: amount,
    status: "under_review",
    exceptionApprovalStatus:
      claim.exceptionApprovalStatus === "required" ? "pending" : claim.exceptionApprovalStatus,
    timeline: [
      ...claim.timeline,
      {
        id: newTimelineId(),
        at: now,
        status: "under_review",
        label: `${step.roleLabel} approved`,
        detail: input.remark.trim() || formatAmt(amount),
      },
    ],
  };

  if (!nextPending) {
    next = finalizeClaim(next, amount, ctx);
  }

  const saved = saveTravelClaim(next);
  if (!nextPending) {
    notifyClaim(saved.status === "partially_approved" ? "claim_partially_approved" : "claim_approved", saved);
    notifyClaim("claim_awaiting_finance_processing", saved);
  } else if (saved.exceptionApprovalStatus === "pending" || saved.exceptionApprovalStatus === "required") {
    notifyClaim("exception_approval_required", saved);
  }
  return { ok: true, claim: saved };
}

export function rejectClaim(
  claim: EmployeeTravelClaim,
  ctx: ReviewerContext,
  input: { code: string; reason: string },
): { ok: boolean; error?: string; claim?: EmployeeTravelClaim } {
  if (!reviewerCanAct(claim, ctx)) {
    return { ok: false, error: "Only the current required approver can act on this claim." };
  }
  if (!input.code) return { ok: false, error: "Select a rejection reason." };
  if (input.code === "other" && !input.reason.trim()) {
    return { ok: false, error: "Describe the reason when selecting Other." };
  }
  const label = REJECT_REASON_OPTIONS.find((r) => r.id === input.code)?.label ?? input.code;
  const text = input.code === "other" ? input.reason.trim() : input.reason.trim() ? `${label} — ${input.reason.trim()}` : label;
  const step = currentApprovalStep(claim);
  const now = new Date().toISOString();
  const actor = actorName(ctx, claim);
  const steps = (claim.approvalSteps ?? []).map((s) => {
    if (s.id === step?.id) {
      return { ...s, status: "rejected" as const, actedAt: now, actedBy: actor, remark: text };
    }
    if (s.status === "pending") return { ...s, status: "skipped" as const };
    return s;
  });
  const saved = saveTravelClaim({
    ...claim,
    status: "rejected",
    approvalSteps: steps,
    rejectionCode: input.code,
    rejectionReason: text,
    reimbursementStatus: "",
    reviewHistory: [
      ...(claim.reviewHistory ?? []),
      {
        id: newTimelineId(),
        at: now,
        stage: step?.roleLabel ?? "Review",
        user: actor,
        action: "Rejected",
        remark: text,
        revision: claim.revision,
      },
    ],
    timeline: [
      ...claim.timeline,
      {
        id: newTimelineId(),
        at: now,
        status: "rejected",
        label: "Rejected",
        detail: text,
      },
    ],
  });
  notifyClaim("claim_rejected", saved);
  return { ok: true, claim: saved };
}

export function returnClaim(
  claim: EmployeeTravelClaim,
  ctx: ReviewerContext,
  input: { code: string; reason: string },
): { ok: boolean; error?: string; claim?: EmployeeTravelClaim } {
  if (!reviewerCanAct(claim, ctx)) {
    return { ok: false, error: "Only the current required approver can act on this claim." };
  }
  if (!input.code) return { ok: false, error: "Select a return reason." };
  if (input.code === "other" && !input.reason.trim()) {
    return { ok: false, error: "Describe the reason when selecting Other." };
  }
  const label = RETURN_REASON_OPTIONS.find((r) => r.id === input.code)?.label ?? input.code;
  const text = input.code === "other" ? input.reason.trim() : input.reason.trim() ? `${label} — ${input.reason.trim()}` : label;
  const step = currentApprovalStep(claim);
  const now = new Date().toISOString();
  const actor = actorName(ctx, claim);
  const steps = (claim.approvalSteps ?? []).map((s) =>
    s.id === step?.id
      ? { ...s, status: "returned" as const, actedAt: now, actedBy: actor, remark: text }
      : s.status === "pending"
        ? { ...s, status: "skipped" as const }
        : s,
  );
  const saved = saveTravelClaim({
    ...claim,
    status: "returned",
    approvalSteps: steps,
    returnedReason: text,
    reimbursementStatus: "",
    reviewHistory: [
      ...(claim.reviewHistory ?? []),
      {
        id: newTimelineId(),
        at: now,
        stage: step?.roleLabel ?? "Review",
        user: actor,
        action: "Returned for correction",
        remark: text,
        revision: claim.revision,
      },
    ],
    timeline: [
      ...claim.timeline,
      {
        id: newTimelineId(),
        at: now,
        status: "returned",
        label: "Returned for correction",
        detail: text,
      },
    ],
  });
  notifyClaim("claim_returned", saved);
  return { ok: true, claim: saved };
}

export interface DuplicateHit {
  claimNo: string;
  id: number;
  reason: string;
}

export function findPossibleDuplicates(claim: EmployeeTravelClaim): DuplicateHit[] {
  const others = loadTravelClaims().filter(
    (c) => c.id !== claim.id && c.status !== "draft" && c.status !== "rejected",
  );
  const hits: DuplicateHit[] = [];
  for (const o of others) {
    const sameEmp = o.employeeId === claim.employeeId;
    const sameType = o.claimType === claim.claimType;
    const sameDate = o.expenseDate === claim.expenseDate;
    const sameAmt = Math.abs((o.claimedAmount || 0) - (claim.claimedAmount || 0)) < 0.01;
    if (sameEmp && sameType && sameDate && sameAmt) {
      hits.push({
        claimNo: o.claimNo,
        id: o.id,
        reason: "Same employee, claim type, date and amount",
      });
      continue;
    }
    const names = new Set(claim.attachments.map((a) => a.fileName.toLowerCase()).filter(Boolean));
    const shared = o.attachments.find((a) => names.has(a.fileName.toLowerCase()));
    if (sameEmp && shared) {
      hits.push({
        claimNo: o.claimNo,
        id: o.id,
        reason: `Same attachment name (${shared.fileName})`,
      });
    }
  }
  return hits;
}

export function pendingReviewClaims(): EmployeeTravelClaim[] {
  return loadTravelClaims().filter((c) => c.status === "submitted" || c.status === "under_review");
}

export function countPendingTravelClaimApprovals(): number {
  return pendingReviewClaims().length;
}

export function countExceptionPending(): number {
  return pendingReviewClaims().filter(
    (c) => c.exceptionApprovalStatus === "required" || c.exceptionApprovalStatus === "pending" || (c.exceptionAmount ?? 0) > 0.009,
  ).length;
}

export function countApprovedThisMonth(): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return loadTravelClaims().filter(
    (c) =>
      (c.status === "approved" || c.status === "partially_approved") &&
      (c.finalApprovedAt || c.updatedAt || "").startsWith(prefix),
  ).length;
}

export function stepStatusLabel(s: ClaimApprovalStep["status"]): string {
  if (s === "not_required") return "Not Required";
  if (s === "skipped") return "Skipped";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
