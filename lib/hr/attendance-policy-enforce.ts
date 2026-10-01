/**
 * Operational Attendance Policy enforcement (frontend).
 * Consumes frozen Shift Setup + Attendance Policy — does not change Settings stores.
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import type {
  AttendancePunch,
  DailyAttendanceRecord,
} from "@/app/(app)/hr/attendance/attendance-data";
import {
  durationToMinutes,
  getAttendancePolicyById,
  loadAttendancePolicies,
  resolveEmployeeAttendancePolicyId,
  type AfterAllowedLimit,
  type AttendancePolicyRecord,
} from "@/app/(app)/hr/settings/attendance-policy-data";
import {
  getAssignedShiftForEmployee,
  type ShiftDayKey,
  type ShiftRecord,
} from "@/app/(app)/hr/settings/shift-setup-data";
import {
  getApprovedLeaveQuantityOnDate,
  getLeaveRequestsForEmployee,
  isLeaveRequestApprovedOnDate,
} from "@/app/(app)/hr/requests/requests-data";
import { normalizeLeaveDays } from "@/lib/hr/leave-day-precision";

const JS_DAY_TO_SHIFT_KEY: ShiftDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export type PolicyDayStatus = "present" | "absent" | "half_day";

export interface PunchPolicyEvaluation {
  workingMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  overtimeMinutes: number;
  /** Duration-based status before late-limit action */
  durationStatus: PolicyDayStatus;
  /** Final status after late-limit action (if any) */
  status: PolicyDayStatus;
  isLate: boolean;
  isEarlyGoing: boolean;
  lateOccurrenceInMonth: number;
  lateLimitExceeded: boolean;
  afterLimitAction: AfterAllowedLimit | null;
  hrReviewRequired: boolean;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  policyId: number | null;
  policyName: string | null;
}

export function timeToMinutes(hhmm: string): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm.trim())) return null;
  const [h, m] = hhmm.trim().split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function calcWorkingMinutesFromPunches(punches: AttendancePunch[]): number {
  let total = 0;
  let lastIn: number | null = null;
  for (const p of punches) {
    const mins = timeToMinutes(p.time);
    if (mins == null) continue;
    if (p.type === "in") lastIn = mins;
    else if (p.type === "out" && lastIn !== null) {
      total += Math.max(0, mins - lastIn);
      lastIn = null;
    }
  }
  return total;
}

export function getShiftWorkingWindow(
  shift: ShiftRecord,
  dateIso: string,
): { start: string; end: string } | null {
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dayKey = JS_DAY_TO_SHIFT_KEY[d.getDay()];
  const cfg = shift.weeklySchedule[dayKey];
  if (!cfg || cfg.dayType === "off") return null;
  if (!cfg.startTime || !cfg.endTime) return null;
  return { start: cfg.startTime, end: cfg.endTime };
}

export function resolveEmployeePolicy(
  employee: Pick<HrEmployee, "profileSummaries">,
): AttendancePolicyRecord | null {
  const list = loadAttendancePolicies();
  const id = resolveEmployeeAttendancePolicyId(employee, list);
  if (id == null) return null;
  return getAttendancePolicyById(id, list) ?? null;
}

export function resolveEmployeeAssignedShift(
  employee: Pick<HrEmployee, "profileSummaries">,
  shifts?: ShiftRecord[],
): ShiftRecord | null {
  return getAssignedShiftForEmployee(employee.profileSummaries?.attendance, shifts);
}

/** Approved leave covering date (pending/rejected ignored). Respects partial approvedPortions. */
export function isApprovedLeaveOnDate(
  employee: Pick<HrEmployee, "id" | "employeeCode">,
  dateIso: string,
): boolean {
  const date = dateIso.slice(0, 10);
  if (typeof window === "undefined") return false;
  try {
    return getLeaveRequestsForEmployee(employee.id, employee.employeeCode).some((r) =>
      isLeaveRequestApprovedOnDate(r, date),
    );
  } catch {
    return false;
  }
}

/**
 * Max approved leave quantity on a date across requests (0–1 per request date; summed if multiple).
 * Pending / rejected do not contribute. Caps at 1 for Attendance day semantics.
 */
export function getApprovedLeaveQuantityForEmployeeOnDate(
  employee: Pick<HrEmployee, "id" | "employeeCode">,
  dateIso: string,
): number {
  const date = dateIso.slice(0, 10);
  if (typeof window === "undefined") return 0;
  try {
    let total = 0;
    for (const r of getLeaveRequestsForEmployee(employee.id, employee.employeeCode)) {
      total += getApprovedLeaveQuantityOnDate(r, date);
    }
    return Math.min(1, normalizeLeaveDays(total));
  } catch {
    return 0;
  }
}

function firstInLastOut(punches: AttendancePunch[]): { firstIn: string; lastOut: string } {
  const ins = punches.filter((p) => p.type === "in").map((p) => p.time);
  const outs = punches.filter((p) => p.type === "out").map((p) => p.time);
  return {
    firstIn: ins[0] ?? "",
    lastOut: outs.length ? outs[outs.length - 1] : "",
  };
}

/**
 * Evaluate punches against assigned Shift + Attendance Policy.
 * Does not apply calendar holiday/WO/leave — caller handles precedence.
 */
export function evaluatePunchesAgainstPolicy(input: {
  employee: Pick<HrEmployee, "profileSummaries">;
  dateIso: string;
  punches: AttendancePunch[];
  /** Prior late days already counted in this month (before this date) */
  priorLateCountInMonth?: number;
  shift?: ShiftRecord | null;
  policy?: AttendancePolicyRecord | null;
}): PunchPolicyEvaluation | null {
  const shift =
    input.shift !== undefined
      ? input.shift
      : resolveEmployeeAssignedShift(input.employee);
  const policy =
    input.policy !== undefined ? input.policy : resolveEmployeePolicy(input.employee);

  if (!shift) return null;

  const window = getShiftWorkingWindow(shift, input.dateIso);
  const workingMinutes = calcWorkingMinutesFromPunches(input.punches);
  const { firstIn, lastOut } = firstInLastOut(input.punches);

  const startMins = window ? timeToMinutes(window.start) : null;
  const endMins = window ? timeToMinutes(window.end) : null;
  const firstInMins = timeToMinutes(firstIn);
  const lastOutMins = timeToMinutes(lastOut);

  let lateMinutes = 0;
  let earlyMinutes = 0;
  let overtimeMinutes = 0;

  if (policy?.trackLateComing !== false && startMins != null && firstInMins != null) {
    const grace = shift.graceInMinutes ?? 0;
    lateMinutes = Math.max(0, firstInMins - (startMins + grace));
  }

  if (policy?.trackEarlyGoing !== false && endMins != null && lastOutMins != null) {
    const grace = shift.graceOutMinutes ?? 0;
    earlyMinutes = Math.max(0, endMins - grace - lastOutMins);
  }

  if (policy?.overtimeEnabled && endMins != null && lastOutMins != null) {
    const threshold = endMins + (policy.overtimeAfterMinutes ?? 0);
    overtimeMinutes = Math.max(0, lastOutMins - threshold);
  }

  const absentThreshold = policy
    ? durationToMinutes(policy.absentHours, policy.absentMinutes)
    : 0;
  const halfDayThreshold = policy
    ? durationToMinutes(policy.halfDayHours, policy.halfDayMinutes)
    : 0;

  let durationStatus: PolicyDayStatus = "present";
  if (input.punches.length === 0 || workingMinutes <= 0) {
    durationStatus = "absent";
  } else if (absentThreshold > 0 && workingMinutes < absentThreshold) {
    durationStatus = "absent";
  } else if (halfDayThreshold > 0 && workingMinutes < halfDayThreshold) {
    durationStatus = "half_day";
  } else {
    durationStatus = "present";
  }

  const isLate = lateMinutes > 0;
  const prior = input.priorLateCountInMonth ?? 0;
  const lateOccurrenceInMonth = isLate ? prior + 1 : prior;
  const allowed = policy?.allowedLateEntriesPerMonth ?? 0;
  const lateLimitExceeded = isLate && lateOccurrenceInMonth > allowed;
  const afterLimitAction = lateLimitExceeded ? (policy?.afterAllowedLimit ?? null) : null;

  let status: PolicyDayStatus = durationStatus;
  let hrReviewRequired = false;

  if (lateLimitExceeded && afterLimitAction) {
    if (afterLimitAction === "half_day") {
      // Escalate toward half_day unless already absent
      if (status === "present") status = "half_day";
    } else if (afterLimitAction === "absent") {
      status = "absent";
    } else if (afterLimitAction === "hr_review") {
      hrReviewRequired = true;
    }
  }

  return {
    workingMinutes,
    lateMinutes,
    earlyMinutes,
    overtimeMinutes,
    durationStatus,
    status,
    isLate,
    isEarlyGoing: earlyMinutes > 0,
    lateOccurrenceInMonth,
    lateLimitExceeded,
    afterLimitAction,
    hrReviewRequired,
    shiftName: shift.name,
    shiftStart: window?.start ?? null,
    shiftEnd: window?.end ?? null,
    policyId: policy?.id ?? null,
    policyName: policy?.name ?? null,
  };
}

/**
 * Count late days in month before `beforeDate` using punch+policy evaluation
 * (ignores stored lateMinutes seed when punches exist).
 */
export function countPriorLateDaysInMonth(
  employee: Pick<HrEmployee, "profileSummaries">,
  monthKey: string,
  beforeDate: string,
  monthRecords: DailyAttendanceRecord[],
  shift?: ShiftRecord | null,
  policy?: AttendancePolicyRecord | null,
): number {
  const resolvedShift =
    shift !== undefined ? shift : resolveEmployeeAssignedShift(employee);
  const resolvedPolicy = policy !== undefined ? policy : resolveEmployeePolicy(employee);
  let count = 0;
  for (const r of monthRecords) {
    if (!r.date.startsWith(monthKey)) continue;
    if (r.date >= beforeDate.slice(0, 10)) continue;
    if (!r.punches?.length) continue;
    // Skip explicit leave / wfh marks — not punch late tracking days
    if (r.attendanceStatus === "leave" || r.attendanceStatus === "wfh") continue;
    const ev = evaluatePunchesAgainstPolicy({
      employee,
      dateIso: r.date,
      punches: r.punches,
      priorLateCountInMonth: 0,
      shift: resolvedShift,
      policy: resolvedPolicy,
    });
    if (ev?.isLate) count++;
  }
  return count;
}
