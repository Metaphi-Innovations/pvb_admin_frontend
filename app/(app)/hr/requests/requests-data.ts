/**
 * HR Requests — frontend/demo store for Leave & Reimbursement approval queues.
 * Leave approvals sync with shared leave-balance-data (frontend only).
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import {
  enumerateLeaveDates,
  isValidLeaveDayQuantity,
  normalizeLeaveDays,
  sumLeavePortions,
} from "@/lib/hr/leave-day-precision";
import { isLeaveTypePaid, getAvailableLeaveTypes } from "@/app/(app)/hr/settings/leave-data";
import {
  adjustAgainstOptionsForLeaveType,
  applyLeaveApprovalToBalance,
  checkLeaveApproval,
  findOptionalHolidayByKey,
  getAvailableOptionalHolidaysForEmployee,
  getLeaveBalanceContext,
  getRuntimeLeaveTypeNames,
  isEligibleOptionalHolidayDate,
  markOptionalHolidayAvailed,
  markOptionalHolidayAvailedByLegacyId,
  notifyLeaveRequestStatusChanged,
  OPTIONAL_LEAVE_TYPE_NAME,
  optionalHolidayKey,
  registerLeavePendingResolver,
  type LeaveAdjustAgainst,
  type LeaveApproveCheck,
} from "@/app/(app)/hr/leave/leave-balance-data";

export type { LeaveAdjustAgainst };
export { adjustAgainstOptionsForLeaveType };

export type RequestListMode = "pending" | "history";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ReimbursementRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

/** Fallback labels — prefer getLeaveTypeFilterOptions() for live Settings types */
export const LEAVE_TYPE_OPTIONS = ["Casual Leave", "Sick Leave", "Optional Leave"] as const;

export function getLeaveTypeFilterOptions(): string[] {
  return getRuntimeLeaveTypeNames();
}

export const REIMBURSEMENT_CATEGORY_OPTIONS = [
  "Travel",
  "Local Conveyance",
  "Hotel",
  "Food",
  "Mobile / Internet",
  "Other",
] as const;

export const REQUEST_BRANCH_OPTIONS = [
  { value: "hq-pune", label: "HQ — Pune" },
  { value: "branch-mumbai", label: "Branch — Mumbai" },
  { value: "branch-nagpur", label: "Branch — Nagpur" },
  { value: "warehouse-aurangabad", label: "Warehouse — Aurangabad" },
] as const;

export const REQUEST_DEPARTMENT_OPTIONS = [
  "Sales Force",
  "Accounts",
  "HR",
  "Procurement",
  "Warehouse",
  "Admin",
] as const;

export interface LeaveRequestRecord {
  id: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  branch: string;
  branchLabel: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  dayType: string;
  reason: string;
  appliedOn: string;
  approverName: string;
  status: LeaveRequestStatus;
  /** Final adjustment target after approval; empty for pending/rejected/cancelled */
  adjustedAgainst: string;
  /** Optional holiday key when leaveType is Optional Leave */
  optionalHolidayKey: string;
  /** Denormalized optional holiday label for history display */
  optionalHolidayName: string;
  /** @deprecated Legacy id — migrated to optionalHolidayKey */
  optionalHolidayId: string;
  /** @deprecated Prefer live balance context */
  availableBalance: number;
  actionedOn: string;
  actionedBy: string;
  rejectionReason: string;
  /**
   * Optional approved quantity (partial approval). Used by Attendance date checks.
   * Full Leave approval UI lands in a later Leave closure task.
   */
  approvedDays?: number;
  /**
   * Optional date-level approved portions for Attendance.
   * When present, Attendance uses these dates only; otherwise full from–to range.
   */
  approvedPortions?: LeaveApprovedPortion[];
  approvalRemark?: string;
}

/** Date-level approved leave quantity for Attendance (and future Leave approval). */
export interface LeaveApprovedPortion {
  date: string;
  /** Quantity on that date: 0.25 | 0.5 | 0.75 | 1 */
  quantity: number;
}

export interface ReimbursementRequestRecord {
  id: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  branch: string;
  branchLabel: string;
  department: string;
  claimCategory: string;
  claimDate: string;
  claimedAmount: number;
  approvedAmount: number | null;
  purpose: string;
  appliedOn: string;
  status: ReimbursementRequestStatus;
  actionedOn: string;
  actionedBy: string;
  approvalComment: string;
  rejectionReason: string;
  receiptFileName: string;
}

const STORAGE_KEY = "ds_hr_requests_v3";

interface RequestsStore {
  leave: LeaveRequestRecord[];
  reimbursement: ReimbursementRequestRecord[];
}

const SEED: RequestsStore = {
  leave: [
    {
      id: "lr-demo-1",
      employeeId: 6,
      employeeName: "Aarav Deshmukh",
      employeeCode: "EMP-DEMO-001",
      branch: "hq-pune",
      branchLabel: "HQ — Pune",
      department: "Sales Force",
      leaveType: "Casual Leave",
      fromDate: "2026-08-28",
      toDate: "2026-08-29",
      days: 2,
      dayType: "Full Day",
      reason: "Personal work",
      appliedOn: "2026-08-26",
      approverName: "Vikram Mehta",
      status: "pending",
      adjustedAgainst: "",
      optionalHolidayKey: "",
      optionalHolidayName: "",
      optionalHolidayId: "",
      availableBalance: 6,
      actionedOn: "",
      actionedBy: "",
      rejectionReason: "",
    },
    {
      id: "lr-demo-2",
      employeeId: 6,
      employeeName: "Aarav Deshmukh",
      employeeCode: "EMP-DEMO-001",
      branch: "hq-pune",
      branchLabel: "HQ — Pune",
      department: "Sales Force",
      leaveType: "Sick Leave",
      fromDate: "2026-08-10",
      toDate: "2026-08-10",
      days: 1,
      dayType: "Full Day",
      reason: "Medical rest",
      appliedOn: "2026-08-09",
      approverName: "Vikram Mehta",
      status: "approved",
      adjustedAgainst: "Sick Leave",
      optionalHolidayKey: "",
      optionalHolidayName: "",
      optionalHolidayId: "",
      availableBalance: 4,
      actionedOn: "2026-08-09",
      actionedBy: "Vikram Mehta",
      rejectionReason: "",
    },
    {
      id: "lr-demo-3",
      employeeId: 6,
      employeeName: "Aarav Deshmukh",
      employeeCode: "EMP-DEMO-001",
      branch: "hq-pune",
      branchLabel: "HQ — Pune",
      department: "Sales Force",
      leaveType: "Optional Leave",
      fromDate: "2026-08-28",
      toDate: "2026-08-28",
      days: 1,
      dayType: "Full Day",
      reason: "Raksha Bandhan",
      appliedOn: "2026-08-20",
      approverName: "Vikram Mehta",
      status: "approved",
      adjustedAgainst: "Optional Leave",
      optionalHolidayKey: "2026:2026-08-28:raksha bandhan",
      optionalHolidayName: "Raksha Bandhan",
      optionalHolidayId: "opt-raksha",
      availableBalance: 1,
      actionedOn: "2026-08-21",
      actionedBy: "Vikram Mehta",
      rejectionReason: "",
    },
    {
      id: "lr-demo-4",
      employeeId: 6,
      employeeName: "Aarav Deshmukh",
      employeeCode: "EMP-DEMO-001",
      branch: "hq-pune",
      branchLabel: "HQ — Pune",
      department: "Sales Force",
      leaveType: "Casual Leave",
      fromDate: "2026-07-18",
      toDate: "2026-07-18",
      days: 1,
      dayType: "Full Day",
      reason: "Personal errand — approved unpaid",
      appliedOn: "2026-07-16",
      approverName: "Vikram Mehta",
      status: "approved",
      adjustedAgainst: "Unpaid",
      optionalHolidayKey: "",
      optionalHolidayName: "",
      optionalHolidayId: "",
      availableBalance: 0,
      actionedOn: "2026-07-17",
      actionedBy: "Vikram Mehta",
      rejectionReason: "",
    },
  ],
  reimbursement: [
    {
      id: "rr-demo-1",
      employeeId: 6,
      employeeName: "Aarav Deshmukh",
      employeeCode: "EMP-DEMO-001",
      branch: "hq-pune",
      branchLabel: "HQ — Pune",
      department: "Sales Force",
      claimCategory: "Travel",
      claimDate: "2026-08-24",
      claimedAmount: 2850,
      approvedAmount: null,
      purpose: "Client visit travel expense",
      appliedOn: "2026-08-25",
      status: "pending",
      actionedOn: "",
      actionedBy: "",
      approvalComment: "",
      rejectionReason: "",
      receiptFileName: "travel-receipt-aug24.pdf",
    },
    {
      id: "rr-demo-2",
      employeeId: 6,
      employeeName: "Aarav Deshmukh",
      employeeCode: "EMP-DEMO-001",
      branch: "hq-pune",
      branchLabel: "HQ — Pune",
      department: "Sales Force",
      claimCategory: "Food",
      claimDate: "2026-08-18",
      claimedAmount: 750,
      approvedAmount: 650,
      purpose: "Client lunch",
      appliedOn: "2026-08-19",
      status: "approved",
      actionedOn: "2026-08-20",
      actionedBy: CURRENT_USER,
      approvalComment: "Approved with meal cap adjustment",
      rejectionReason: "",
      receiptFileName: "food-receipt-aug18.jpg",
    },
  ],
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeLeave(raw: Partial<LeaveRequestRecord>): LeaveRequestRecord {
  const portions = Array.isArray(raw.approvedPortions)
    ? raw.approvedPortions
        .filter((p) => p && typeof p.date === "string")
        .map((p) => ({
          date: String(p.date).slice(0, 10),
          quantity: Number(p.quantity) || 0,
        }))
        .filter((p) => p.quantity > 0)
    : undefined;

  return {
    id: raw.id ?? `lr-${Date.now()}`,
    employeeId: raw.employeeId ?? 0,
    employeeName: raw.employeeName ?? "",
    employeeCode: raw.employeeCode ?? "",
    branch: raw.branch ?? "",
    branchLabel: raw.branchLabel ?? "",
    department: raw.department ?? "",
    leaveType: raw.leaveType ?? "Casual Leave",
    fromDate: raw.fromDate ?? "",
    toDate: raw.toDate ?? "",
    days: raw.days ?? 0,
    dayType: raw.dayType ?? "Full Day",
    reason: raw.reason ?? "",
    appliedOn: raw.appliedOn ?? "",
    approverName: raw.approverName ?? "",
    status: raw.status ?? "pending",
    adjustedAgainst: raw.adjustedAgainst ?? "",
    optionalHolidayKey: raw.optionalHolidayKey ?? "",
    optionalHolidayName: raw.optionalHolidayName ?? "",
    optionalHolidayId: raw.optionalHolidayId ?? "",
    availableBalance: raw.availableBalance ?? 0,
    actionedOn: raw.actionedOn ?? "",
    actionedBy: raw.actionedBy ?? "",
    rejectionReason: raw.rejectionReason ?? "",
    approvedDays: typeof raw.approvedDays === "number" ? raw.approvedDays : undefined,
    approvedPortions: portions && portions.length ? portions : undefined,
    approvalRemark: typeof raw.approvalRemark === "string" ? raw.approvalRemark : undefined,
  };
}

/**
 * Whether an approved leave request covers a calendar date for Attendance.
 * Uses approvedPortions when present; otherwise full from–to range (legacy full approval).
 */
export function isLeaveRequestApprovedOnDate(
  rec: LeaveRequestRecord,
  dateIso: string,
): boolean {
  if (rec.status !== "approved") return false;
  const date = dateIso.slice(0, 10);
  if (rec.approvedPortions && rec.approvedPortions.length > 0) {
    return rec.approvedPortions.some(
      (p) => p.date.slice(0, 10) === date && p.quantity > 0,
    );
  }
  const from = rec.fromDate.slice(0, 10);
  const to = rec.toDate.slice(0, 10);
  return date >= from && date <= to;
}

/** Approved quantity on a specific date (0 if not approved / not covering date). */
export function getApprovedLeaveQuantityOnDate(
  rec: LeaveRequestRecord,
  dateIso: string,
): number {
  if (rec.status !== "approved") return 0;
  const date = dateIso.slice(0, 10);
  if (rec.approvedPortions && rec.approvedPortions.length > 0) {
    const hit = rec.approvedPortions.find((p) => p.date.slice(0, 10) === date);
    return hit && hit.quantity > 0 ? hit.quantity : 0;
  }
  const from = rec.fromDate.slice(0, 10);
  const to = rec.toDate.slice(0, 10);
  if (date >= from && date <= to) return 1;
  return 0;
}

/** Effective approved quantity — legacy approved rows without approvedDays = full request. */
export function getEffectiveApprovedDays(rec: LeaveRequestRecord): number {
  if (rec.status !== "approved") return 0;
  if (typeof rec.approvedDays === "number" && Number.isFinite(rec.approvedDays)) {
    return rec.approvedDays;
  }
  return rec.days;
}

export function isPartialLeaveApproval(rec: LeaveRequestRecord): boolean {
  if (rec.status !== "approved") return false;
  const approved = getEffectiveApprovedDays(rec);
  return approved < rec.days - 1e-9;
}

function ensureSeedShape(raw: unknown): RequestsStore {
  if (!raw || typeof raw !== "object") return structuredClone(SEED);
  const obj = raw as Partial<RequestsStore>;
  const leave = Array.isArray(obj.leave) ? obj.leave.map((r) => normalizeLeave(r)) : [];
  const reimbursement = Array.isArray(obj.reimbursement) ? obj.reimbursement : [];
  if (leave.length === 0 && reimbursement.length === 0) return structuredClone(SEED);
  return { leave, reimbursement };
}

export function loadHrRequests(): RequestsStore {
  if (typeof window === "undefined") return structuredClone(SEED);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = structuredClone(SEED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return ensureSeedShape(JSON.parse(raw));
  } catch {
    return structuredClone(SEED);
  }
}

export function saveHrRequests(store: RequestsStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function sumPendingLeaveDays(
  employeeId: number,
  employeeCode: string,
  leaveType: string,
  store?: RequestsStore,
): number {
  const s = store ?? loadHrRequests();
  return s.leave
    .filter(
      (r) =>
        r.status === "pending" &&
        r.leaveType === leaveType &&
        (r.employeeCode === employeeCode || r.employeeId === employeeId),
    )
    .reduce((sum, r) => sum + r.days, 0);
}

registerLeavePendingResolver(sumPendingLeaveDays);

export function getLeaveRequestsForEmployee(
  employeeId: number,
  employeeCode: string,
): LeaveRequestRecord[] {
  const store = loadHrRequests();
  return store.leave
    .filter((r) => r.employeeCode === employeeCode || r.employeeId === employeeId)
    .sort((a, b) => (a.appliedOn < b.appliedOn ? 1 : a.appliedOn > b.appliedOn ? -1 : 0));
}

export function countPendingRequests(store?: RequestsStore): number {
  const s = store ?? loadHrRequests();
  return (
    s.leave.filter((r) => r.status === "pending").length +
    s.reimbursement.filter((r) => r.status === "pending").length
  );
}

export type LeaveSubmitInput = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  branch: string;
  branchLabel: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  optionalHolidayKey?: string;
};

export type LeaveSubmitResult =
  | { ok: true; record: LeaveRequestRecord }
  | { ok: false; error: string };

export const OPTIONAL_HOLIDAY_INVALID_DATE_MSG =
  "Selected date is not available as an Optional Holiday for your applicable Holiday Calendar.";

/**
 * Validate a leave application without creating a request.
 * Shared by Employee Profile and future mobile Leave.
 */
export function validateLeaveApplication(
  input: LeaveSubmitInput,
): { ok: true } | { ok: false; error: string } {
  const from = input.fromDate.slice(0, 10);
  const to = input.toDate.slice(0, 10);
  if (!input.leaveType?.trim()) {
    return { ok: false, error: "Select a leave type." };
  }
  const availableNames = getAvailableLeaveTypes(input.employeeCode).map((t) => t.name);
  if (!availableNames.includes(input.leaveType)) {
    return { ok: false, error: "Leave type is inactive or not available for this employee." };
  }
  if (input.days <= 0) {
    return { ok: false, error: "Number of days must be greater than zero." };
  }
  if (input.leaveType === OPTIONAL_LEAVE_TYPE_NAME) {
    if (!input.optionalHolidayKey) {
      return { ok: false, error: "Select an Optional Holiday from the eligible list." };
    }
    const holiday = findOptionalHolidayByKey(
      input.employeeId,
      input.employeeCode,
      input.optionalHolidayKey,
      input.branch,
    );
    if (!holiday) {
      return { ok: false, error: OPTIONAL_HOLIDAY_INVALID_DATE_MSG };
    }
    if (holiday.status === "availed") {
      return { ok: false, error: "This Optional Holiday has already been availed." };
    }
    if (from !== holiday.date || to !== holiday.date) {
      return { ok: false, error: OPTIONAL_HOLIDAY_INVALID_DATE_MSG };
    }
  } else {
    if (!from || !to) {
      return { ok: false, error: "From and To dates are required." };
    }
    if (to < from) {
      return { ok: false, error: "To date cannot be before From date." };
    }
  }

  // Overlap: block against same employee's Pending or Approved ranges (fractional-aware for approvedPortions)
  const store = loadHrRequests();
  const requestDates = enumerateLeaveDates(from, to);
  const overlap = store.leave.find((r) => {
    if (r.employeeId !== input.employeeId && r.employeeCode !== input.employeeCode) return false;
    if (r.status !== "pending" && r.status !== "approved") return false;
    const rf = r.fromDate.slice(0, 10);
    const rt = r.toDate.slice(0, 10);
    if (!(from <= rt && to >= rf)) return false;
    if (r.status === "approved" && r.approvedPortions && r.approvedPortions.length > 0) {
      return requestDates.some((d) =>
        r.approvedPortions!.some((p) => p.date.slice(0, 10) === d && p.quantity > 0),
      );
    }
    return true;
  });
  if (overlap) {
    return {
      ok: false,
      error: `Overlaps existing ${overlap.status} leave (${overlap.fromDate} – ${overlap.toDate}).`,
    };
  }

  return { ok: true };
}

export function submitLeaveRequest(input: LeaveSubmitInput): LeaveSubmitResult {
  const pre = validateLeaveApplication(input);
  if (!pre.ok) return pre;

  const from = input.fromDate.slice(0, 10);
  const to = input.toDate.slice(0, 10);
  const store = loadHrRequests();

  const balance = getLeaveBalanceContext(input.employeeId, input.employeeCode, input.leaveType);
  const rec = normalizeLeave({
    id: `lr-${Date.now()}`,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeCode: input.employeeCode,
    branch: input.branch,
    branchLabel: input.branchLabel,
    department: input.department,
    leaveType: input.leaveType,
    fromDate: from,
    toDate: to,
    days: input.days,
    dayType: "Full Day",
    reason: input.reason.trim(),
    appliedOn: todayStr(),
    approverName: "HR",
    status: "pending",
    adjustedAgainst: "",
    optionalHolidayKey: input.optionalHolidayKey ?? "",
    optionalHolidayName:
      input.leaveType === OPTIONAL_LEAVE_TYPE_NAME && input.optionalHolidayKey
        ? findOptionalHolidayByKey(
            input.employeeId,
            input.employeeCode,
            input.optionalHolidayKey,
            input.branch,
          )?.name ?? ""
        : "",
    optionalHolidayId: "",
    availableBalance: balance?.remaining ?? 0,
  });

  store.leave.unshift(rec);
  saveHrRequests(store);
  notifyLeaveRequestStatusChanged();
  createHrNotification({
    eventType: "leave_applied",
    employeeId: rec.employeeId,
    sourceModule: "leave",
    sourceId: rec.id,
    context: {
      employee_name: rec.employeeName,
      leave_type: rec.leaveType,
      leave_from: rec.fromDate,
      leave_to: rec.toDate,
    },
  });
  return { ok: true, record: rec };
}

export type LeaveApproveResult =
  | { ok: true; record: LeaveRequestRecord }
  | { ok: false; error: string; check: LeaveApproveCheck };

export type LeaveApproveInput = {
  /** Approved date portions within the requested range */
  portions: LeaveApprovedPortion[];
  /** Required when sum(portions) < requested days */
  remark?: string;
};

/**
 * Approve a pending leave request against its original Leave Type.
 * Deducts balance by approved quantity only (not full requested days when partial).
 * Does not allow HR to reclassify to another leave type / unpaid fallback.
 */
export function approveLeaveRequest(
  id: string,
  input: LeaveApproveInput,
): LeaveApproveResult {
  const store = loadHrRequests();
  const idx = store.leave.findIndex((r) => r.id === id);
  if (idx < 0) {
    return {
      ok: false,
      error: "Leave request not found.",
      check: {
        ok: false,
        error: "Leave request not found.",
        available: 0,
        requested: 0,
        balance: null,
      },
    };
  }

  const rec = store.leave[idx];
  if (rec.status !== "pending") {
    return {
      ok: false,
      error: "Only pending leave requests can be approved.",
      check: {
        ok: false,
        error: "Only pending leave requests can be approved.",
        available: 0,
        requested: rec.days,
        balance: null,
      },
    };
  }

  const rangeDates = new Set(enumerateLeaveDates(rec.fromDate, rec.toDate));
  const cleanPortions: LeaveApprovedPortion[] = [];
  for (const p of input.portions ?? []) {
    const date = String(p.date ?? "").slice(0, 10);
    const qty = normalizeLeaveDays(Number(p.quantity) || 0);
    if (!date || !rangeDates.has(date)) continue;
    if (qty <= 0) continue;
    if (!isValidLeaveDayQuantity(qty) || qty > 1) {
      return {
        ok: false,
        error: "Each approved date must be 0.25, 0.5, 0.75, or 1 day.",
        check: {
          ok: false,
          error: "Invalid day portion.",
          available: 0,
          requested: rec.days,
          balance: null,
        },
      };
    }
    const existing = cleanPortions.find((x) => x.date === date);
    if (existing) existing.quantity = qty;
    else cleanPortions.push({ date, quantity: qty });
  }

  const approvedDays = sumLeavePortions(cleanPortions);
  if (approvedDays <= 0) {
    return {
      ok: false,
      error: "Select at least one date to approve.",
      check: {
        ok: false,
        error: "Select at least one date to approve.",
        available: 0,
        requested: rec.days,
        balance: null,
      },
    };
  }
  if (approvedDays > normalizeLeaveDays(rec.days) + 1e-9) {
    return {
      ok: false,
      error: "Approved days cannot exceed requested days.",
      check: {
        ok: false,
        error: "Approved days cannot exceed requested days.",
        available: 0,
        requested: rec.days,
        balance: null,
      },
    };
  }

  const isPartial = approvedDays < normalizeLeaveDays(rec.days) - 1e-9;
  const remark = (input.remark ?? "").trim();
  if (isPartial && !remark) {
    return {
      ok: false,
      error: "Partial approval reason is required.",
      check: {
        ok: false,
        error: "Partial approval reason is required.",
        available: 0,
        requested: rec.days,
        balance: null,
      },
    };
  }

  const unpaidType = !isLeaveTypePaid(rec.leaveType) || rec.leaveType === "Unpaid";
  const ledgerTarget: LeaveAdjustAgainst = unpaidType
    ? "Unpaid"
    : (rec.leaveType as LeaveAdjustAgainst);

  const check = checkLeaveApproval(
    rec.employeeId,
    rec.employeeCode,
    rec.leaveType,
    approvedDays,
    ledgerTarget,
  );
  if (!check.ok) {
    return { ok: false, error: check.error, check };
  }

  store.leave[idx] = {
    ...rec,
    status: "approved",
    adjustedAgainst: ledgerTarget,
    approvedDays,
    approvedPortions: cleanPortions,
    approvalRemark: isPartial ? remark : "",
    actionedOn: todayStr(),
    actionedBy: CURRENT_USER,
    rejectionReason: "",
  };
  saveHrRequests(store);

  if (ledgerTarget !== "Unpaid") {
    applyLeaveApprovalToBalance(rec.employeeId, rec.employeeCode, ledgerTarget, approvedDays);
    if (rec.leaveType === OPTIONAL_LEAVE_TYPE_NAME) {
      const key = rec.optionalHolidayKey || rec.optionalHolidayId;
      if (key) {
        if (rec.optionalHolidayKey) {
          markOptionalHolidayAvailed(rec.employeeId, rec.employeeCode, rec.optionalHolidayKey);
        } else {
          markOptionalHolidayAvailedByLegacyId(rec.employeeId, rec.employeeCode, rec.optionalHolidayId);
        }
      }
    }
  }

  notifyLeaveRequestStatusChanged();
  createHrNotification({
    eventType: "leave_approved",
    employeeId: rec.employeeId,
    sourceModule: "leave",
    sourceId: rec.id,
    context: {
      employee_name: rec.employeeName,
      leave_type: rec.leaveType,
      leave_from: rec.fromDate,
      leave_to: rec.toDate,
    },
  });
  return { ok: true, record: store.leave[idx] };
}

export function rejectLeaveRequest(id: string, reason: string): LeaveRequestRecord | undefined {
  const store = loadHrRequests();
  const idx = store.leave.findIndex((r) => r.id === id);
  if (idx < 0) return undefined;
  if (store.leave[idx].status !== "pending") return undefined;
  if (!reason.trim()) return undefined;
  store.leave[idx] = {
    ...store.leave[idx],
    status: "rejected",
    adjustedAgainst: "",
    actionedOn: todayStr(),
    actionedBy: CURRENT_USER,
    rejectionReason: reason.trim(),
  };
  saveHrRequests(store);
  notifyLeaveRequestStatusChanged();
  const rejected = store.leave[idx];
  createHrNotification({
    eventType: "leave_rejected",
    employeeId: rejected.employeeId,
    sourceModule: "leave",
    sourceId: rejected.id,
    context: {
      employee_name: rejected.employeeName,
      leave_type: rejected.leaveType,
      leave_from: rejected.fromDate,
      leave_to: rejected.toDate,
    },
  });
  return rejected;
}

/** Pending leave count only (Reimbursements have their own module). */
export function countPendingLeaveRequests(store?: RequestsStore): number {
  const s = store ?? loadHrRequests();
  return s.leave.filter((r) => r.status === "pending").length;
}

export function approveReimbursementRequest(
  id: string,
  approvedAmount: number,
  comment: string,
): ReimbursementRequestRecord | undefined {
  const store = loadHrRequests();
  const idx = store.reimbursement.findIndex((r) => r.id === id);
  if (idx < 0) return undefined;
  store.reimbursement[idx] = {
    ...store.reimbursement[idx],
    status: "approved",
    approvedAmount,
    approvalComment: comment.trim(),
    actionedOn: todayStr(),
    actionedBy: CURRENT_USER,
    rejectionReason: "",
  };
  saveHrRequests(store);
  return store.reimbursement[idx];
}

export function rejectReimbursementRequest(
  id: string,
  reason: string,
): ReimbursementRequestRecord | undefined {
  const store = loadHrRequests();
  const idx = store.reimbursement.findIndex((r) => r.id === id);
  if (idx < 0) return undefined;
  store.reimbursement[idx] = {
    ...store.reimbursement[idx],
    status: "rejected",
    actionedOn: todayStr(),
    actionedBy: CURRENT_USER,
    rejectionReason: reason.trim(),
    approvedAmount: null,
  };
  saveHrRequests(store);
  return store.reimbursement[idx];
}

export function formatInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function branchLabel(value: string): string {
  return REQUEST_BRANCH_OPTIONS.find((b) => b.value === value)?.label ?? value;
}
