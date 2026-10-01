/**
 * Office Attendance — merge punch/attendance records with canonical calendar settings
 * and Attendance Policy enforcement.
 * Does NOT mutate or delete stored DailyAttendanceRecord rows.
 *
 * Calendar source: Holiday Calendar + Shift Setup via attendance-calendar-resolve.
 *
 * Precedence (operational):
 * 1. Public Holiday → Holiday (punch present/wfh still wins as worked)
 * 2. Weekly Off → Week Off (punch present/wfh still wins as worked)
 * 3. Approved Leave → Leave (unless punch present/wfh)
 * 4. Shift Not Configured
 * 5. Punch evaluation via Shift + Attendance Policy → present / half_day / absent
 * 6. Working day with no punches → Absent
 */

import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { getHrEmployeeById as getMasterEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import {
  resolveAttendanceCalendarStatus,
  type AttendanceCalendarStatus,
} from "@/lib/hr/attendance-calendar-resolve";
import {
  countPriorLateDaysInMonth,
  evaluatePunchesAgainstPolicy,
  getApprovedLeaveQuantityForEmployeeOnDate,
  isApprovedLeaveOnDate,
  resolveEmployeeAssignedShift,
  resolveEmployeePolicy,
  type PunchPolicyEvaluation,
} from "@/lib/hr/attendance-policy-enforce";
import type { AttendanceDayStatus, DailyAttendanceRecord } from "./attendance-data";

/** Matches calendar tile statuses used by Office Attendance UI. */
export type OfficeCalendarTileStatus = "present" | "absent" | "holiday" | "week_off" | "empty";

export type OfficeEffectiveStatus =
  | AttendanceDayStatus
  | "shift_not_configured"
  | "hr_review"
  | "empty";

const OFFICE_CAL_OPTS = { fallbackDefault: false as const };

export interface OfficeDayResolution {
  date: string;
  /** Calendar tile status (4-status calendar) */
  tile: OfficeCalendarTileStatus;
  /** Canonical schedule layer */
  calendar: AttendanceCalendarStatus;
  /** Effective operational status (may include half_day / leave / OT flags via evaluation) */
  effectiveStatus: OfficeEffectiveStatus;
  /** True when schedule is public holiday (even if employee worked) */
  scheduledPublicHoliday: boolean;
  /** True when schedule is weekly off (even if employee worked) */
  scheduledWeeklyOff: boolean;
  shiftConfigured: boolean;
  holidayName?: string;
  weekOffLabel?: string;
  /** Punch/attendance record preserved as-is */
  record?: DailyAttendanceRecord;
  /** Policy evaluation when punches were assessed */
  evaluation?: PunchPolicyEvaluation | null;
  lateMinutes: number;
  earlyMinutes: number;
  overtimeMinutes: number;
  hrReviewRequired: boolean;
  approvedLeave: boolean;
  /**
   * Approved leave portion for this date (0–1).
   * Calendar UI may still render full "leave" when > 0; consumers needing half-day
   * distinction should read this field.
   */
  approvedLeaveQuantity: number;
}

function tileFromEffective(status: OfficeEffectiveStatus): OfficeCalendarTileStatus {
  if (status === "present" || status === "wfh" || status === "hr_review") return "present";
  if (status === "absent") return "absent";
  if (status === "holiday") return "holiday";
  if (status === "week_off") return "week_off";
  // half_day / leave / shift_not_configured → empty on 4-status calendar
  return "empty";
}

/**
 * Resolve one office day for calendar / KPI / profile.
 * Ignores stored seed holiday|week_off as source-of-truth; uses Settings instead.
 * Recomputes late / early / half-day / absent / OT from Shift + Policy when punches exist.
 */
export function resolveOfficeDay(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch" | "profileSummaries">,
  dateIso: string,
  record?: DailyAttendanceRecord,
  monthRecordsForLate?: DailyAttendanceRecord[],
): OfficeDayResolution {
  const date = dateIso.slice(0, 10);
  const calendar = resolveAttendanceCalendarStatus(employee, date, OFFICE_CAL_OPTS);
  const scheduledPublicHoliday = calendar.kind === "public_holiday";
  const scheduledWeeklyOff = calendar.kind === "weekly_off";
  const shiftConfigured = calendar.kind !== "shift_not_configured";
  const approvedLeave = isApprovedLeaveOnDate(employee, date);
  const approvedLeaveQuantity = approvedLeave
    ? getApprovedLeaveQuantityForEmployeeOnDate(employee, date)
    : 0;

  const base: OfficeDayResolution = {
    date,
    tile: "empty",
    calendar,
    effectiveStatus: "absent",
    scheduledPublicHoliday,
    scheduledWeeklyOff,
    shiftConfigured,
    holidayName: scheduledPublicHoliday ? calendar.label : undefined,
    weekOffLabel: scheduledWeeklyOff ? calendar.shiftName ?? calendar.label : undefined,
    record,
    evaluation: null,
    lateMinutes: 0,
    earlyMinutes: 0,
    overtimeMinutes: 0,
    hrReviewRequired: false,
    approvedLeave,
    approvedLeaveQuantity,
  };

  const hasPunches = !!(record?.punches && record.punches.length > 0);
  const storedMark = record?.attendanceStatus;
  const explicitWfh = storedMark === "wfh";
  const explicitLeaveOnRecord = storedMark === "leave";

  // Worked on holiday / weekly off — punch present or WFH wins
  if (hasPunches || explicitWfh) {
    if (explicitWfh && !hasPunches) {
      return {
        ...base,
        tile: "present",
        effectiveStatus: "wfh",
        lateMinutes: record?.lateMinutes ?? 0,
        earlyMinutes: record?.earlyMinutes ?? 0,
      };
    }
  }

  // ── Calendar layers (when no work punch overrides) ──
  if (!hasPunches && !explicitWfh) {
    if (scheduledPublicHoliday) {
      return { ...base, tile: "holiday", effectiveStatus: "holiday" };
    }
    if (scheduledWeeklyOff) {
      return { ...base, tile: "week_off", effectiveStatus: "week_off" };
    }
    if (approvedLeave || explicitLeaveOnRecord) {
      return { ...base, tile: "empty", effectiveStatus: "leave" };
    }
    if (!shiftConfigured) {
      return {
        ...base,
        tile: "empty",
        effectiveStatus: "shift_not_configured",
      };
    }
    // Manual / Field mark without punches (admin correction or SF mark synced into store)
    if (storedMark === "present" || storedMark === "absent" || storedMark === "half_day") {
      return {
        ...base,
        tile: tileFromEffective(storedMark),
        effectiveStatus: storedMark,
        lateMinutes: record?.lateMinutes ?? 0,
        earlyMinutes: record?.earlyMinutes ?? 0,
      };
    }
    // Working day, no punches → Absent only for today/past (future not counted)
    const today = new Date().toISOString().slice(0, 10);
    if (date <= today) {
      return { ...base, tile: "absent", effectiveStatus: "absent" };
    }
    return { ...base, tile: "empty", effectiveStatus: "empty" as OfficeEffectiveStatus };
  }

  // No assigned shift → never invent a default Office shift (even if punches exist)
  if (!shiftConfigured) {
    return {
      ...base,
      tile: "empty",
      effectiveStatus: "shift_not_configured",
    };
  }

  // Approved leave without punches is handled above. When punches exist on a leave day,
  // policy evaluation still runs (rare admin/exception path).

  const shift = resolveEmployeeAssignedShift(employee);
  const policy = resolveEmployeePolicy(employee);
  const monthKey = date.slice(0, 7);
  const monthRecs =
    monthRecordsForLate ??
    (record ? [record] : []);
  const priorLate = countPriorLateDaysInMonth(
    employee,
    monthKey,
    date,
    monthRecs,
    shift,
    policy,
  );

  const evaluation =
    hasPunches && shift
      ? evaluatePunchesAgainstPolicy({
          employee,
          dateIso: date,
          punches: record!.punches,
          priorLateCountInMonth: priorLate,
          shift,
          policy,
        })
      : null;

  if (evaluation) {
    let effective: OfficeEffectiveStatus = evaluation.status;
    if (explicitWfh && evaluation.status === "present") effective = "wfh";

    // Worked on holiday/WO still shows Present tile
    if (scheduledPublicHoliday || scheduledWeeklyOff) {
      if (evaluation.status !== "absent") {
        return {
          ...base,
          tile: "present",
          effectiveStatus: explicitWfh ? "wfh" : "present",
          evaluation,
          lateMinutes: evaluation.lateMinutes,
          earlyMinutes: evaluation.earlyMinutes,
          overtimeMinutes: evaluation.overtimeMinutes,
          hrReviewRequired: evaluation.hrReviewRequired,
        };
      }
    }

    return {
      ...base,
      tile: tileFromEffective(effective),
      effectiveStatus: evaluation.hrReviewRequired ? "hr_review" : effective,
      evaluation,
      lateMinutes: evaluation.lateMinutes,
      earlyMinutes: evaluation.earlyMinutes,
      overtimeMinutes: evaluation.overtimeMinutes,
      hrReviewRequired: evaluation.hrReviewRequired,
    };
  }

  // Fallback: trust stored mark when no shift/policy evaluation possible
  if (storedMark === "present" || storedMark === "wfh") {
    return {
      ...base,
      tile: "present",
      effectiveStatus: storedMark,
      lateMinutes: record?.lateMinutes ?? 0,
      earlyMinutes: record?.earlyMinutes ?? 0,
    };
  }
  if (storedMark === "absent") {
    return {
      ...base,
      tile: "absent",
      effectiveStatus: "absent",
      lateMinutes: record?.lateMinutes ?? 0,
      earlyMinutes: record?.earlyMinutes ?? 0,
    };
  }
  if (storedMark === "half_day") {
    return {
      ...base,
      tile: "empty",
      effectiveStatus: "half_day",
      lateMinutes: record?.lateMinutes ?? 0,
      earlyMinutes: record?.earlyMinutes ?? 0,
    };
  }
  if (storedMark === "leave" || approvedLeave) {
    return { ...base, tile: "empty", effectiveStatus: "leave" };
  }

  if (scheduledPublicHoliday) {
    return { ...base, tile: "holiday", effectiveStatus: "holiday" };
  }
  if (scheduledWeeklyOff) {
    return { ...base, tile: "week_off", effectiveStatus: "week_off" };
  }
  if (!shiftConfigured) {
    return { ...base, tile: "empty", effectiveStatus: "shift_not_configured" };
  }

  return { ...base, tile: "absent", effectiveStatus: "absent" };
}

export function resolveOfficeDayByEmployeeId(
  employeeId: number,
  dateIso: string,
  record?: DailyAttendanceRecord,
): OfficeDayResolution | null {
  const emp = getMasterEmployee(employeeId);
  if (!emp) return null;
  return resolveOfficeDay(emp, dateIso, record);
}

export interface OfficeMonthCounts {
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  holiday: number;
  weekOff: number;
  lateComing: number;
  earlyLeaving: number;
  overtimeDays: number;
  hrReviewDays: number;
  shiftNotConfiguredDays: number;
}

/** Count a full calendar month using canonical holiday/WO + policy-evaluated punches. */
export function countOfficeMonth(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch" | "profileSummaries">,
  monthKey: string,
  monthRecords: DailyAttendanceRecord[],
): OfficeMonthCounts {
  const byDate = new Map(monthRecords.map((r) => [r.date, r]));
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const counts: OfficeMonthCounts = {
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    holiday: 0,
    weekOff: 0,
    lateComing: 0,
    earlyLeaving: 0,
    overtimeDays: 0,
    hrReviewDays: 0,
    shiftNotConfiguredDays: 0,
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthKey}-${String(d).padStart(2, "0")}`;
    const record = byDate.get(date);
    const day = resolveOfficeDay(employee, date, record, monthRecords);

    if (day.lateMinutes > 0) counts.lateComing++;
    if (day.earlyMinutes > 0) counts.earlyLeaving++;
    if (day.overtimeMinutes > 0) counts.overtimeDays++;
    if (day.hrReviewRequired || day.effectiveStatus === "hr_review") counts.hrReviewDays++;

    switch (day.effectiveStatus) {
      case "present":
      case "wfh":
      case "hr_review":
        counts.present++;
        break;
      case "absent":
        counts.absent++;
        break;
      case "half_day":
        counts.halfDay++;
        break;
      case "leave":
        counts.leave++;
        break;
      case "holiday":
        counts.holiday++;
        break;
      case "week_off":
        counts.weekOff++;
        break;
      case "shift_not_configured":
        counts.shiftNotConfiguredDays++;
        break;
      case "empty":
      default:
        break;
    }
  }

  return counts;
}
