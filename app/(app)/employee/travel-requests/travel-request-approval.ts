/**
 * Pre-Travel request approval operations.
 * Chain comes from Travel Policy Ex-HQ approvers + matching exception rules.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { getHrEmployeeById } from "@/app/(app)/hr/employees/employee-master-data";
import type { ApproverRole } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import { approverLabel } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import { CURRENT_USER } from "@/lib/hr/config";
import { resolveApproverForRole, type ReviewerContext } from "@/app/(app)/employee/claims/travel-claim-approval";
import {
  HR_TRAVEL_REQUESTS_EVENT,
  loadTravelRequests,
  newTimelineId,
  saveTravelRequest,
  type EmployeeTravelRequest,
  type TravelRequestApprovalStep,
  type TravelRequestStatus,
} from "./travel-request-data";
import type { TravelRequestEvaluation } from "./travel-request-engine";
import { buildRequestSnapshot } from "./travel-request-engine";

export { type ReviewerContext };

function actorName(employee?: HrEmployee | null): string {
  return employee?.employeeName || CURRENT_USER;
}

function notify(
  eventType:
    | "travel_request_submitted"
    | "travel_request_returned"
    | "travel_request_approved"
    | "travel_request_rejected"
    | "travel_request_pending_approval",
  req: EmployeeTravelRequest,
) {
  createHrNotification({
    eventType,
    employeeId: req.employeeId,
    sourceModule: "reimbursements",
    sourceId: String(req.id),
    context: {
      employee_name: req.employeeName,
      request_no: req.requestNo,
      destination: req.destination,
    },
  });
}

function uniqueRoles(roles: ApproverRole[]): ApproverRole[] {
  const out: ApproverRole[] = [];
  for (const r of roles) {
    if (r && !out.includes(r)) out.push(r);
  }
  return out;
}

export function buildTravelRequestChain(
  evaln: TravelRequestEvaluation,
  employee: HrEmployee,
): { name: string; roles: ApproverRole[] } {
  const policy = evaln.policy;
  const roles: ApproverRole[] = [];
  if (policy && (evaln.priorApprovalRequired || evaln.context === "ex_hq" || evaln.context === "overnight_journey")) {
    if (policy.exHq.priorApprovalRequired || evaln.priorApprovalRequired) {
      roles.push(policy.exHq.approver1);
      if (policy.exHq.approver2) roles.push(policy.exHq.approver2);
    }
  }
  if (policy) {
    for (const ex of evaln.exceptions) {
      const rule =
        policy.exceptions.find((r) => /class/i.test(r.name) && /class/i.test(ex.label)) ??
        policy.exceptions.find((r) => /air|mode/i.test(r.name) && /air|mode|taxi|vehicle/i.test(ex.label)) ??
        policy.exceptions.find((r) => r.allowed && r.requiresPriorApproval);
      if (rule?.requiresPriorApproval) {
        for (const a of rule.approvers) roles.push(a);
      }
    }
  }
  const unique = uniqueRoles(roles);
  if (!unique.length && evaln.chainRolesNeeded && policy?.exHq.approver1) {
    unique.push(policy.exHq.approver1);
    if (policy.exHq.approver2) unique.push(policy.exHq.approver2);
  }
  const name = unique.map(approverLabel).join(" → ") || "None";
  return { name, roles: unique };
}

function buildSteps(roles: ApproverRole[], employee: HrEmployee): TravelRequestApprovalStep[] {
  return roles.map((role, i) => {
    const resolved = resolveApproverForRole(role, employee);
    return {
      id: `tr_step_${i}_${role}`,
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
    };
  });
}

export function currentRequestStep(req: EmployeeTravelRequest): TravelRequestApprovalStep | null {
  return (req.approvalSteps ?? []).find((s) => s.status === "pending") ?? null;
}

export function currentRequestApproverLabel(req: EmployeeTravelRequest): string {
  if (req.status === "approved" || req.status === "rejected" || req.status === "cancelled" || req.status === "draft") {
    return "—";
  }
  const step = currentRequestStep(req);
  if (!step) return "—";
  return step.resolved ? `${step.roleLabel} · ${step.assigneeName}` : `${step.roleLabel} · Configuration required`;
}

export function reviewerCanActOnRequest(req: EmployeeTravelRequest, ctx: ReviewerContext): boolean {
  if (req.status !== "submitted" && req.status !== "under_review") return false;
  const step = currentRequestStep(req);
  if (!step) return false;
  return step.role === ctx.role;
}

export function countPendingTravelRequestApprovals(): number {
  return loadTravelRequests().filter((r) => r.status === "submitted" || r.status === "under_review").length;
}

export function submitTravelRequest(
  req: EmployeeTravelRequest,
  employee: HrEmployee,
  evaln: TravelRequestEvaluation,
): { ok: true; request: EmployeeTravelRequest } | { ok: false; error: string } {
  if (!evaln.canSubmit) {
    return { ok: false, error: evaln.blockReasons[0] || "Request cannot be submitted." };
  }
  const chain = buildTravelRequestChain(evaln, employee);
  const steps = buildSteps(chain.roles, employee);
  if (evaln.chainRolesNeeded && steps.length === 0) {
    return { ok: false, error: "Approval chain is not configured on the Travel Policy." };
  }
  if (evaln.chainRolesNeeded && steps.some((s) => s.role === "reporting_manager" && !s.resolved)) {
    return { ok: false, error: "Approval Configuration Required — reporting manager is not mapped." };
  }

  const snap = buildRequestSnapshot(employee, req, evaln);
  const now = new Date().toISOString();
  const isResubmit = req.status === "returned";
  const timeline = [
    ...req.timeline,
    {
      id: newTimelineId(),
      at: now,
      action: isResubmit ? "Resubmitted" : "Submitted",
      user: employee.employeeName,
      remark: isResubmit ? "Resubmitted after correction." : "Submitted for prior approval.",
      status: (steps.length ? "submitted" : "approved") as TravelRequestStatus,
    },
  ];

  if (!steps.length) {
    const saved = saveTravelRequest({
      ...req,
      status: "approved",
      snapshot: snap,
      approvalChainName: "Not required",
      approvalSteps: [],
      currentStepIndex: 0,
      submittedOn: now.slice(0, 10),
      approvedOn: now.slice(0, 10),
      finalApproverName: "Policy — prior approval not required",
      returnReason: "",
      timeline: [
        ...timeline,
        {
          id: newTimelineId(),
          at: now,
          action: "Approved",
          user: "System",
          remark: "Prior approval not required for this travel context.",
          status: "approved",
        },
      ],
    });
    notify("travel_request_approved", saved);
    return { ok: true, request: saved };
  }

  const saved = saveTravelRequest({
    ...req,
    status: "submitted",
    snapshot: snap,
    approvalChainName: chain.name,
    approvalSteps: steps,
    currentStepIndex: 0,
    submittedOn: now.slice(0, 10),
    returnReason: "",
    rejectionReason: "",
    timeline,
  });
  notify("travel_request_submitted", saved);
  notify("travel_request_pending_approval", saved);
  return { ok: true, request: saved };
}

export function approveTravelRequestStep(
  req: EmployeeTravelRequest,
  ctx: ReviewerContext,
  remark: string,
  actor?: HrEmployee | null,
): { ok: true; request: EmployeeTravelRequest } | { ok: false; error: string } {
  if (!reviewerCanActOnRequest(req, ctx)) return { ok: false, error: "You are not the current approver." };
  const hasException = (req.snapshot?.exceptions.length ?? 0) > 0;
  if (hasException && !remark.trim()) {
    return { ok: false, error: "Remark is required for exception approval." };
  }
  const steps = req.approvalSteps.map((s) => ({ ...s }));
  const idx = steps.findIndex((s) => s.status === "pending");
  if (idx < 0) return { ok: false, error: "No pending approval step." };
  const now = new Date().toISOString();
  steps[idx] = {
    ...steps[idx]!,
    status: "approved",
    actedAt: now,
    actedBy: actorName(actor),
    remark: remark.trim(),
  };
  const remaining = steps.some((s) => s.status === "pending");
  const nextStatus: TravelRequestStatus = remaining ? "under_review" : "approved";
  const saved = saveTravelRequest({
    ...req,
    status: nextStatus,
    approvalSteps: steps,
    currentStepIndex: remaining ? idx + 1 : idx,
    approvedOn: remaining ? req.approvedOn : now.slice(0, 10),
    finalApproverName: remaining ? req.finalApproverName : actorName(actor),
    timeline: [
      ...req.timeline,
      {
        id: newTimelineId(),
        at: now,
        action: remaining ? `${steps[idx]!.roleLabel} approved` : "Approved",
        user: actorName(actor),
        remark: remark.trim(),
        status: nextStatus,
      },
    ],
  });
  if (remaining) notify("travel_request_pending_approval", saved);
  else notify("travel_request_approved", saved);
  return { ok: true, request: saved };
}

export function returnTravelRequest(
  req: EmployeeTravelRequest,
  ctx: ReviewerContext,
  reason: string,
  actor?: HrEmployee | null,
): { ok: true; request: EmployeeTravelRequest } | { ok: false; error: string } {
  if (!reviewerCanActOnRequest(req, ctx)) return { ok: false, error: "You are not the current approver." };
  if (!reason.trim()) return { ok: false, error: "Return reason is required." };
  const now = new Date().toISOString();
  const steps = req.approvalSteps.map((s) =>
    s.status === "pending" ? { ...s, status: "returned" as const, actedAt: now, actedBy: actorName(actor), remark: reason.trim() } : s,
  );
  const saved = saveTravelRequest({
    ...req,
    status: "returned",
    approvalSteps: steps,
    returnReason: reason.trim(),
    timeline: [
      ...req.timeline,
      {
        id: newTimelineId(),
        at: now,
        action: "Returned for correction",
        user: actorName(actor),
        remark: reason.trim(),
        status: "returned",
      },
    ],
  });
  notify("travel_request_returned", saved);
  return { ok: true, request: saved };
}

export function rejectTravelRequest(
  req: EmployeeTravelRequest,
  ctx: ReviewerContext,
  reason: string,
  actor?: HrEmployee | null,
): { ok: true; request: EmployeeTravelRequest } | { ok: false; error: string } {
  if (!reviewerCanActOnRequest(req, ctx)) return { ok: false, error: "You are not the current approver." };
  if (!reason.trim()) return { ok: false, error: "Reject reason is required." };
  const now = new Date().toISOString();
  const steps = req.approvalSteps.map((s) =>
    s.status === "pending" ? { ...s, status: "rejected" as const, actedAt: now, actedBy: actorName(actor), remark: reason.trim() } : s,
  );
  const saved = saveTravelRequest({
    ...req,
    status: "rejected",
    approvalSteps: steps,
    rejectionReason: reason.trim(),
    timeline: [
      ...req.timeline,
      {
        id: newTimelineId(),
        at: now,
        action: "Rejected",
        user: actorName(actor),
        remark: reason.trim(),
        status: "rejected",
      },
    ],
  });
  notify("travel_request_rejected", saved);
  return { ok: true, request: saved };
}

export function cancelTravelRequest(
  req: EmployeeTravelRequest,
  reason: string,
  employee: HrEmployee,
): { ok: true; request: EmployeeTravelRequest } | { ok: false; error: string } {
  if (!reason.trim()) return { ok: false, error: "Cancellation reason is required." };
  const today = new Date().toISOString().slice(0, 10);
  const cancellable =
    req.status === "draft" ||
    req.status === "submitted" ||
    req.status === "under_review" ||
    (req.status === "approved" && req.departureDate > today);
  if (!cancellable) {
    return { ok: false, error: "This request cannot be cancelled." };
  }
  const now = new Date().toISOString();
  const saved = saveTravelRequest({
    ...req,
    status: "cancelled",
    cancelReason: reason.trim(),
    timeline: [
      ...req.timeline,
      {
        id: newTimelineId(),
        at: now,
        action: "Cancelled",
        user: employee.employeeName,
        remark: reason.trim(),
        status: "cancelled",
      },
    ],
  });
  return { ok: true, request: saved };
}

export function emitTravelRequestsEvent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HR_TRAVEL_REQUESTS_EVENT));
}
