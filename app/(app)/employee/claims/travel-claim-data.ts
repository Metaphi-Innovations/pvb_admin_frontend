/**
 * Employee travel / expense claims — frontend/demo persistence.
 * Entitlements come from Travel Policy (`ds_hr_travel_policies_v1`) via resolvers.
 * This store holds claims only — never a second copy of policy matrices.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { getHrEmployeeById, loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import { DEMO_EMPLOYEE_CODE } from "@/app/(app)/hr/employees/demo-employee";
import { policyToday } from "@/lib/hr/policy-common";

export const TRAVEL_CLAIMS_STORAGE_KEY = "ds_hr_travel_claims_v1";
export const TRAVEL_CLAIM_ACTOR_KEY = "ds_hr_travel_claim_actor_v1";
export const HR_TRAVEL_CLAIMS_EVENT = "hr-travel-claims-updated";

export type EmployeeClaimStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "returned";

export type EmployeeClaimType =
  | "ex_hq_travel"
  | "local_city"
  | "lodging"
  | "boarding"
  | "relatives_friends"
  | "overnight_journey"
  | "field_conveyance"
  | "personal_vehicle_km"
  | "incidental"
  | "other_travel";

export type AttachmentKind = "bill" | "ticket" | "approval" | "other";

export const CLAIM_TYPE_OPTIONS: { key: EmployeeClaimType; label: string; policyRuleHints: string[] }[] = [
  { key: "ex_hq_travel", label: "Ex-HQ Travel", policyRuleHints: ["ex-hq tour", "ex hq"] },
  { key: "local_city", label: "Local / City Travel", policyRuleHints: ["local / city travel", "local"] },
  { key: "lodging", label: "Lodging", policyRuleHints: ["lodging", "hotel"] },
  { key: "boarding", label: "Boarding", policyRuleHints: ["boarding"] },
  { key: "relatives_friends", label: "Stay with Relatives / Friends", policyRuleHints: ["relatives", "friends"] },
  { key: "overnight_journey", label: "Overnight Journey", policyRuleHints: ["overnight"] },
  { key: "field_conveyance", label: "Field Daily Conveyance", policyRuleHints: ["field", "conveyance"] },
  { key: "personal_vehicle_km", label: "Personal Vehicle / KM", policyRuleHints: ["km reimbursement", "km"] },
  { key: "incidental", label: "Incidental Allowance", policyRuleHints: ["incidental"] },
  { key: "other_travel", label: "Other Travel Expense", policyRuleHints: ["other"] },
];

export const TRAVEL_MODE_OPTIONS = [
  "Rail",
  "Air",
  "Bus",
  "Taxi",
  "Auto",
  "Own Vehicle",
  "Local Train",
  "Other",
] as const;

export const CLAIM_STATUS_LABEL: Record<EmployeeClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  partially_approved: "Partially Approved",
  rejected: "Rejected",
  returned: "Returned",
};

export interface ClaimAttachment {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  fileType: string;
  sizeLabel: string;
  dataUrl: string;
}

export interface ClaimTimelineEvent {
  id: string;
  at: string;
  status: EmployeeClaimStatus | "withdrawn";
  label: string;
  detail: string;
}

/** Frozen at submit — later policy edits must not rewrite these numbers. */
export interface PolicyEntitlementSnapshot {
  capturedAt: string;
  policyId: number;
  policyName: string;
  policyNumber: string;
  effectiveFrom: string;
  groupId: string | null;
  groupName: string | null;
  cityClassId: string | null;
  cityClassName: string | null;
  lodgingLimitPerNight: number | null;
  boardingLimitPerDay: number | null;
  relativesPerNight: number | null;
  fieldAllowanceType: string | null;
  fieldAmount: number | null;
  incidentalPerDay: number | null;
  kmRate: number | null;
  kmAmount: number | null;
  overnightFromHours: number | null;
  overnightToHours: number | null;
  overnightAmount: number | null;
  localMode: string;
  timeCategory: string | null;
  airAllowed: boolean | null;
  airMinHours: number | null;
  airTrigger: string | null;
  billRequired: boolean;
  priorApprovalRequired: boolean;
  guidance: { label: string; value: string }[];
  eligibleAmount: number;
  claimedAmount: number;
  exceptionAmount: number;
  amountLocked?: boolean;
  nights?: number;
  deadlineMessage?: string;
  deadlineKind?: "within" | "late" | "blocked" | "";
  daysAfterTravel?: number | null;
  maxClaimAgeDays?: number | null;
  monthlyKmNote?: string | null;
}

export type ApprovalStepStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "skipped"
  | "not_required";

export type ExceptionApprovalStatus = "none" | "required" | "pending" | "approved";

/**
 * Post-approval settlement lifecycle — separate from claim.status (approval outcome).
 * Legacy "" is normalized on load for approved / partially_approved claims.
 */
export type ReimbursementProcessStatus =
  | ""
  | "not_ready"
  | "awaiting_processing"
  | "queued_for_payroll"
  | "ready_for_accounts"
  | "sent_to_accounts"
  | "processed"
  | "paid"
  | "on_hold";

export type ReimbursementProcessingMethod = "" | "payroll" | "accounts" | "cash" | "other";

export const REIMBURSEMENT_STATUS_LABEL: Record<Exclude<ReimbursementProcessStatus, "">, string> = {
  not_ready: "Not Ready",
  awaiting_processing: "Awaiting Processing",
  queued_for_payroll: "Queued for Payroll",
  ready_for_accounts: "Ready for Accounts",
  sent_to_accounts: "Sent to Accounts",
  processed: "Processing Completed",
  paid: "Paid",
  on_hold: "On Hold",
};

export const PROCESSING_METHOD_LABEL: Record<Exclude<ReimbursementProcessingMethod, "">, string> = {
  payroll: "Payroll",
  accounts: "Accounts / Direct Payment",
  cash: "Cash / Petty Cash",
  other: "Other",
};

export interface ClaimProcessingEvent {
  id: string;
  at: string;
  action: string;
  user: string;
  remark: string;
  fromStatus: ReimbursementProcessStatus;
  toStatus: ReimbursementProcessStatus;
}

export interface StoredPolicyCheck {
  id: string;
  level: "ok" | "warn" | "exception" | "block";
  label: string;
  detail?: string;
}

export interface ClaimApprovalStep {
  id: string;
  order: number;
  role: string;
  roleLabel: string;
  status: ApprovalStepStatus;
  assigneeEmployeeId: number | null;
  assigneeName: string;
  resolved: boolean;
  actedAt: string;
  actedBy: string;
  remark: string;
  approvedAmount: number | null;
}

export interface ClaimReviewEvent {
  id: string;
  at: string;
  stage: string;
  user: string;
  action: string;
  remark: string;
  revision: number;
}

export interface ClaimRevisionSnapshot {
  revision: number;
  submittedOn: string;
  claimedAmount: number;
  eligibleAmount: number;
  exceptionAmount: number;
  policySnapshot: PolicyEntitlementSnapshot | null;
}

export interface EmployeeTravelClaim {
  id: number;
  claimNo: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  status: EmployeeClaimStatus;
  claimType: EmployeeClaimType | "";
  purpose: string;
  remarks: string;
  expenseDate: string;
  periodFrom: string;
  periodTo: string;
  fromLocation: string;
  toLocation: string;
  city: string;
  travelFrom: string;
  destination: string;
  departureAt: string;
  returnAt: string;
  modeOfTravel: string;
  ticketAmount: number | null;
  /** Manual one-way distance from HQ — GPS is not calculated. */
  distanceKm: number | null;
  overnight: boolean;
  checkInDate: string;
  checkOutDate: string;
  hotelName: string;
  billAmount: number | null;
  gstAmount: number | null;
  hotelGstin: string;
  billInCompanyName: boolean | null;
  eligibleDays: number | null;
  stayFrom: string;
  stayTo: string;
  journeyStart: string;
  journeyEnd: string;
  startTime: string;
  endTime: string;
  travelAmount: number | null;
  locationMarket: string;
  vehicleType: string;
  startPoint: string;
  destinationPoint: string;
  kmTravelled: number | null;
  startOdometer: string;
  endOdometer: string;
  claimedAmount: number;
  eligibleAmount: number;
  exceptionAmount: number;
  approvedAmount: number | null;
  exceptionReason: string;
  priorApprovalRef: string;
  priorApprovedBy: string;
  priorApprovalDate: string;
  attachments: ClaimAttachment[];
  policySnapshot: PolicyEntitlementSnapshot | null;
  submittedOn: string;
  createdAt: string;
  updatedAt: string;
  withdrawReason: string;
  timeline: ClaimTimelineEvent[];
  revision: number;
  approvalChainName: string;
  approvalSteps: ClaimApprovalStep[];
  currentStepIndex: number;
  reviewHistory: ClaimReviewEvent[];
  policyCheckSnapshot: StoredPolicyCheck[];
  returnedReason: string;
  rejectionReason: string;
  rejectionCode: string;
  exceptionApprovalStatus: ExceptionApprovalStatus;
  reimbursementStatus: ReimbursementProcessStatus;
  processingMethod: ReimbursementProcessingMethod;
  processingMethodOther: string;
  processingDate: string;
  processingReference: string;
  processingRemark: string;
  payrollPeriodId: string;
  payrollPeriodLabel: string;
  payrollCycleName: string;
  accountsReadyAt: string;
  accountsSentAt: string;
  accountsSentBy: string;
  accountsSyncReference: string;
  processedOn: string;
  processedBy: string;
  paidOn: string;
  paymentReference: string;
  holdReason: string;
  heldOn: string;
  heldBy: string;
  /** Status restored when releasing On Hold (operational hold, not rejection). */
  holdResumeStatus: ReimbursementProcessStatus;
  processingHistory: ClaimProcessingEvent[];
  finalApprovedAt: string;
  finalApproverName: string;
  revisionHistory: ClaimRevisionSnapshot[];
  linkedTravelRequestId: number | null;
  linkedTravelRequestNo: string;
  approvedEstimate: number | null;
}

function stampNow(): string {
  return new Date().toISOString();
}

export function claimTypeLabel(key: EmployeeClaimType | ""): string {
  if (!key) return "—";
  return CLAIM_TYPE_OPTIONS.find((t) => t.key === key)?.label ?? key;
}

export function emptyClaim(employee: HrEmployee, claimType: EmployeeClaimType | "" = ""): EmployeeTravelClaim {
  const today = policyToday();
  return {
    id: 0,
    claimNo: "",
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    designation: employee.designation,
    status: "draft",
    claimType,
    purpose: "",
    remarks: "",
    expenseDate: today,
    periodFrom: today,
    periodTo: today,
    fromLocation: "",
    toLocation: "",
    city: "",
    travelFrom: "",
    destination: "",
    departureAt: "",
    returnAt: "",
    modeOfTravel: "",
    ticketAmount: null,
    distanceKm: null,
    overnight: false,
    checkInDate: today,
    checkOutDate: today,
    hotelName: "",
    billAmount: null,
    gstAmount: null,
    hotelGstin: "",
    billInCompanyName: null,
    eligibleDays: 1,
    stayFrom: today,
    stayTo: today,
    journeyStart: "",
    journeyEnd: "",
    startTime: "",
    endTime: "",
    travelAmount: null,
    locationMarket: "",
    vehicleType: "",
    startPoint: "",
    destinationPoint: "",
    kmTravelled: null,
    startOdometer: "",
    endOdometer: "",
    claimedAmount: 0,
    eligibleAmount: 0,
    exceptionAmount: 0,
    approvedAmount: null,
    exceptionReason: "",
    priorApprovalRef: "",
    priorApprovedBy: "",
    priorApprovalDate: "",
    attachments: [],
    policySnapshot: null,
    submittedOn: "",
    createdAt: stampNow(),
    updatedAt: stampNow(),
    withdrawReason: "",
    timeline: [],
    revision: 0,
    approvalChainName: "",
    approvalSteps: [],
    currentStepIndex: 0,
    reviewHistory: [],
    policyCheckSnapshot: [],
    returnedReason: "",
    rejectionReason: "",
    rejectionCode: "",
    exceptionApprovalStatus: "none",
    reimbursementStatus: "",
    processingMethod: "",
    processingMethodOther: "",
    processingDate: "",
    processingReference: "",
    processingRemark: "",
    payrollPeriodId: "",
    payrollPeriodLabel: "",
    payrollCycleName: "",
    accountsReadyAt: "",
    accountsSentAt: "",
    accountsSentBy: "",
    accountsSyncReference: "",
    processedOn: "",
    processedBy: "",
    paidOn: "",
    paymentReference: "",
    holdReason: "",
    heldOn: "",
    heldBy: "",
    holdResumeStatus: "",
    processingHistory: [],
    finalApprovedAt: "",
    finalApproverName: "",
    revisionHistory: [],
    linkedTravelRequestId: null,
    linkedTravelRequestNo: "",
    approvedEstimate: null,
  };
}

const KNOWN_REIMBURSEMENT_STATUSES: ReimbursementProcessStatus[] = [
  "",
  "not_ready",
  "awaiting_processing",
  "queued_for_payroll",
  "ready_for_accounts",
  "sent_to_accounts",
  "processed",
  "paid",
  "on_hold",
];

function normalizeReimbursementStatus(
  claim: EmployeeTravelClaim,
  raw: string | undefined,
): ReimbursementProcessStatus {
  const status = (KNOWN_REIMBURSEMENT_STATUSES.includes(raw as ReimbursementProcessStatus)
    ? raw
    : "") as ReimbursementProcessStatus;
  const finalApproved = claim.status === "approved" || claim.status === "partially_approved";
  if (finalApproved && (!status || status === "not_ready")) {
    return "awaiting_processing";
  }
  if (!finalApproved && (status === "awaiting_processing" || status === "")) {
    return status === "awaiting_processing" ? "" : status || "";
  }
  return status || "";
}

function normalizeClaim(c: EmployeeTravelClaim): EmployeeTravelClaim {
  const base: EmployeeTravelClaim = {
    ...c,
    revision: c.revision ?? 0,
    approvalChainName: c.approvalChainName ?? "",
    approvalSteps: c.approvalSteps ?? [],
    currentStepIndex: c.currentStepIndex ?? 0,
    reviewHistory: c.reviewHistory ?? [],
    policyCheckSnapshot: c.policyCheckSnapshot ?? [],
    returnedReason: c.returnedReason ?? "",
    rejectionReason: c.rejectionReason ?? "",
    rejectionCode: c.rejectionCode ?? "",
    exceptionApprovalStatus: c.exceptionApprovalStatus ?? "none",
    reimbursementStatus: c.reimbursementStatus ?? "",
    processingMethod: c.processingMethod ?? "",
    processingMethodOther: c.processingMethodOther ?? "",
    processingDate: c.processingDate ?? "",
    processingReference: c.processingReference ?? "",
    processingRemark: c.processingRemark ?? "",
    payrollPeriodId: c.payrollPeriodId ?? "",
    payrollPeriodLabel: c.payrollPeriodLabel ?? "",
    payrollCycleName: c.payrollCycleName ?? "",
    accountsReadyAt: c.accountsReadyAt ?? "",
    accountsSentAt: c.accountsSentAt ?? "",
    accountsSentBy: c.accountsSentBy ?? "",
    accountsSyncReference: c.accountsSyncReference ?? "",
    processedOn: c.processedOn ?? "",
    processedBy: c.processedBy ?? "",
    paidOn: c.paidOn ?? "",
    paymentReference: c.paymentReference ?? "",
    holdReason: c.holdReason ?? "",
    heldOn: c.heldOn ?? "",
    heldBy: c.heldBy ?? "",
    holdResumeStatus: c.holdResumeStatus ?? "",
    processingHistory: c.processingHistory ?? [],
    finalApprovedAt: c.finalApprovedAt ?? "",
    finalApproverName: c.finalApproverName ?? "",
    revisionHistory: c.revisionHistory ?? [],
    linkedTravelRequestId: c.linkedTravelRequestId ?? null,
    linkedTravelRequestNo: c.linkedTravelRequestNo ?? "",
    approvedEstimate: c.approvedEstimate ?? null,
  };
  return {
    ...base,
    reimbursementStatus: normalizeReimbursementStatus(base, base.reimbursementStatus),
  };
}

function loadRaw(): EmployeeTravelClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRAVEL_CLAIMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmployeeTravelClaim[];
    return Array.isArray(parsed) ? parsed.map(normalizeClaim) : [];
  } catch {
    return [];
  }
}

function persist(list: EmployeeTravelClaim[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAVEL_CLAIMS_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(HR_TRAVEL_CLAIMS_EVENT));
}

export function loadTravelClaims(): EmployeeTravelClaim[] {
  return loadRaw().slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadClaimsForEmployee(employeeId: number): EmployeeTravelClaim[] {
  return loadTravelClaims().filter((c) => c.employeeId === employeeId);
}

export function getTravelClaimById(id: number): EmployeeTravelClaim | undefined {
  return loadRaw().find((c) => c.id === id);
}

export function nextClaimNumber(list?: EmployeeTravelClaim[]): string {
  const year = new Date().getFullYear();
  const prefix = `CLM-${year}-`;
  const source = list ?? loadRaw();
  let max = 0;
  for (const c of source) {
    if (!c.claimNo?.startsWith(prefix)) continue;
    const n = Number(c.claimNo.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function nextId(list: EmployeeTravelClaim[]): number {
  return list.reduce((m, c) => Math.max(m, c.id), 0) + 1;
}

export function saveTravelClaim(claim: EmployeeTravelClaim): EmployeeTravelClaim {
  const list = loadRaw();
  const now = stampNow();
  if (!claim.id) {
    const saved: EmployeeTravelClaim = {
      ...claim,
      id: nextId(list),
      claimNo: claim.claimNo || nextClaimNumber(list),
      createdAt: claim.createdAt || now,
      updatedAt: now,
    };
    list.push(saved);
    persist(list);
    return saved;
  }
  const idx = list.findIndex((c) => c.id === claim.id);
  const saved: EmployeeTravelClaim = { ...claim, updatedAt: now };
  if (idx >= 0) list[idx] = saved;
  else list.push(saved);
  persist(list);
  return saved;
}

export function isClaimEditable(status: EmployeeClaimStatus): boolean {
  return status === "draft" || status === "returned";
}

export function canWithdrawClaim(claim: { status: EmployeeClaimStatus; approvalSteps?: ClaimApprovalStep[] }): boolean {
  if (claim.status !== "submitted") return false;
  const steps = claim.approvalSteps ?? [];
  return !steps.some((s) => s.status === "approved" || s.status === "rejected" || s.status === "returned");
}

export function defaultClaimActor(): HrEmployee | null {
  const list = loadHrEmployees();
  const demo = list.find((e) => e.employeeCode === DEMO_EMPLOYEE_CODE);
  if (demo) return demo;
  const asm = list.find((e) => /asm/i.test(e.designation) && e.status === "active");
  return asm ?? list.find((e) => e.status === "active") ?? list[0] ?? null;
}

export function loadClaimActor(): HrEmployee | null {
  if (typeof window === "undefined") return defaultClaimActor();
  try {
    const raw = localStorage.getItem(TRAVEL_CLAIM_ACTOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { employeeId?: number };
      if (parsed.employeeId) {
        const found = getHrEmployeeById(parsed.employeeId);
        if (found) return found;
      }
    }
  } catch {
    /* fall through */
  }
  return defaultClaimActor();
}

export function setClaimActor(employeeId: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAVEL_CLAIM_ACTOR_KEY, JSON.stringify({ employeeId }));
  window.dispatchEvent(new Event(HR_TRAVEL_CLAIMS_EVENT));
}

export function salesForceEmployees(): HrEmployee[] {
  return loadHrEmployees().filter(
    (e) => e.status === "active" && /sales/i.test(`${e.department} ${e.designation}`),
  );
}

export function newAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newTimelineId(): string {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function newProcessingEventId(): string {
  return `pe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatClaimDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Employee-facing combined approval + reimbursement label. */
export function employeeReimbursementLabel(claim: EmployeeTravelClaim): string | null {
  if (claim.status !== "approved" && claim.status !== "partially_approved") return null;
  const prefix = claim.status === "partially_approved" ? "Partially Approved" : "Approved";
  const rs = claim.reimbursementStatus;
  if (!rs || rs === "not_ready" || rs === "awaiting_processing") {
    return `${prefix} — Awaiting Processing`;
  }
  if (rs === "queued_for_payroll") return `${prefix} — Queued for Payroll`;
  if (rs === "ready_for_accounts") return `${prefix} — Ready for Accounts`;
  if (rs === "sent_to_accounts") return `${prefix} — Sent to Accounts`;
  if (rs === "processed") return `${prefix} — Processing Completed`;
  if (rs === "paid") return "Paid";
  if (rs === "on_hold") return `${prefix} — On Hold`;
  return prefix;
}

export function reimbursementStatusLabel(status: ReimbursementProcessStatus): string {
  if (!status || status === "not_ready") return REIMBURSEMENT_STATUS_LABEL.not_ready;
  return REIMBURSEMENT_STATUS_LABEL[status] ?? status;
}
