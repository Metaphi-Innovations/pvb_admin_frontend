/**
 * Unified Admin Attendance operations — all employees (Office, Field, Intern, Contract).
 * Uses DailyAttendanceRecord + resolveOfficeDay. Does not change Settings stores.
 */

import { BRANCH_OPTIONS, CURRENT_USER } from "@/lib/hr/config";
import {
  calcWorkingMinutesFromPunches,
  getShiftWorkingWindow,
  resolveEmployeeAssignedShift,
} from "@/lib/hr/attendance-policy-enforce";
import { getActiveHrEmployees, type HrEmployee } from "../employees/employee-master-data";
import { getLeaveRequestsForEmployee } from "../requests/requests-data";
import {
  resolveEmployeeAttendancePolicyLabel,
} from "../settings/attendance-policy-data";
import {
  formatShiftScheduleSummary,
  loadShifts,
  type ShiftRecord,
} from "../settings/shift-setup-data";
import {
  formatPunchTime,
  getDayName,
  loadDailyRecords,
  saveDailyRecords,
  type AttendanceDayStatus,
  type AttendancePunch,
  type AttendanceSourceType,
  type DailyAttendanceRecord,
} from "./attendance-data";
import {
  countOfficeMonth,
  resolveOfficeDay,
  type OfficeDayResolution,
  type OfficeEffectiveStatus,
} from "./office-attendance-resolve";

export type LiveAttendanceState =
  | "in"
  | "out"
  | "no_punch"
  | "break"
  | "late"
  | "early_leaving"
  | "off"
  | "leave"
  | "holiday"
  | "week_off"
  | "shift_not_configured";

export interface AttendanceEmployeeDayRow {
  employee: HrEmployee;
  date: string;
  record?: DailyAttendanceRecord;
  resolution: OfficeDayResolution;
  shiftName: string;
  firstIn: string;
  lastOut: string;
  workingMinutes: number;
  workingHoursLabel: string;
  lateMinutes: number;
  earlyMinutes: number;
  overtimeMinutes: number;
  status: OfficeEffectiveStatus;
  statusLabel: string;
  source: AttendanceSourceType | "—";
  liveState: LiveAttendanceState;
  liveStateLabel: string;
}

export interface AttendanceDashboardRow {
  employee: HrEmployee;
  month: string;
  present: number;
  absent: number;
  halfDay: number;
  weekOff: number;
  holiday: number;
  leave: number;
  paidLeave: number;
  unpaidLeave: number;
  late: number;
  earlyGoing: number;
  overtimeDays: number;
  overtimeMinutes: number;
  shiftName: string;
}

export interface CompanyRosterRow {
  employee: HrEmployee;
  shiftName: string;
  policyName: string;
  scheduleSummary: string;
  weeklyOffPattern: string;
  status: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function branchLabel(slug: string): string {
  return BRANCH_OPTIONS.find((b) => b.value === slug)?.label ?? slug;
}

export function statusDisplayLabel(status: OfficeEffectiveStatus): string {
  switch (status) {
    case "present":
      return "Present";
    case "wfh":
      return "WFH";
    case "absent":
      return "Absent";
    case "half_day":
      return "Half Day";
    case "leave":
      return "Leave";
    case "holiday":
      return "Holiday";
    case "week_off":
      return "Week Off";
    case "shift_not_configured":
      return "Shift Not Configured";
    case "hr_review":
      return "HR Review";
    case "empty":
      return "—";
    default:
      return String(status);
  }
}

function formatDuration(mins: number): string {
  if (mins <= 0) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatOffset(mins: number): string {
  if (mins <= 0) return "—";
  return `${mins}m`;
}

function lastPunchType(punches: AttendancePunch[]): "in" | "out" | null {
  if (!punches.length) return null;
  return punches[punches.length - 1]?.type ?? null;
}

function deriveLiveState(row: {
  resolution: OfficeDayResolution;
  punches: AttendancePunch[];
  firstIn: string;
  lastOut: string;
}): LiveAttendanceState {
  const st = row.resolution.effectiveStatus;
  if (st === "holiday") return "holiday";
  if (st === "week_off") return "week_off";
  if (st === "leave") return "leave";
  if (st === "shift_not_configured") return "shift_not_configured";
  if (st === "empty") return "off";

  const last = lastPunchType(row.punches);
  if (!row.firstIn && !last) return "no_punch";

  if (row.resolution.lateMinutes > 0 && last === "in") return "late";
  if (row.resolution.earlyMinutes > 0 && last === "out") return "early_leaving";

  if (last === "in") return "in";
  if (last === "out") {
    // Mid-day out before scheduled end → Break; otherwise Out
    const end = row.resolution.evaluation?.shiftEnd;
    if (end && row.lastOut && row.lastOut < end) {
      const [eh, em] = end.split(":").map(Number);
      const [lh, lm] = row.lastOut.split(":").map(Number);
      if (eh * 60 + em - (lh * 60 + lm) >= 60) return "break";
    }
    return "out";
  }
  return "no_punch";
}

function liveStateLabel(s: LiveAttendanceState): string {
  const map: Record<LiveAttendanceState, string> = {
    in: "In",
    out: "Out",
    no_punch: "No Punch In",
    break: "Break",
    late: "Late",
    early_leaving: "Early Leaving",
    off: "—",
    leave: "Leave",
    holiday: "Holiday",
    week_off: "Week Off",
    shift_not_configured: "Shift N/C",
  };
  return map[s];
}

export function getRecordsByEmployeeDate(
  records?: DailyAttendanceRecord[],
): Map<string, DailyAttendanceRecord> {
  const list = records ?? loadDailyRecords();
  const map = new Map<string, DailyAttendanceRecord>();
  for (const r of list) {
    map.set(`${r.employeeId}|${r.date}`, r);
  }
  return map;
}

export function buildEmployeeDayRow(
  employee: HrEmployee,
  dateIso: string,
  record: DailyAttendanceRecord | undefined,
  monthRecords: DailyAttendanceRecord[],
): AttendanceEmployeeDayRow {
  const date = dateIso.slice(0, 10);
  const resolution = resolveOfficeDay(employee, date, record, monthRecords);
  const shift = resolveEmployeeAssignedShift(employee);
  const punches = record?.punches ?? [];
  const firstIn =
    record?.firstIn ||
    punches.find((p) => p.type === "in")?.time ||
    "";
  const lastOut =
    record?.lastOut ||
    [...punches].reverse().find((p) => p.type === "out")?.time ||
    "";
  const workingMinutes =
    resolution.evaluation?.workingMinutes ??
    record?.workingMinutes ??
    (punches.length ? calcWorkingMinutesFromPunches(punches) : 0);

  const liveState = deriveLiveState({
    resolution,
    punches,
    firstIn,
    lastOut,
  });

  return {
    employee,
    date,
    record,
    resolution,
    shiftName:
      resolution.evaluation?.shiftName ??
      shift?.name ??
      record?.shift ??
      "—",
    firstIn,
    lastOut,
    workingMinutes,
    workingHoursLabel: formatDuration(workingMinutes),
    lateMinutes: resolution.lateMinutes,
    earlyMinutes: resolution.earlyMinutes,
    overtimeMinutes: resolution.overtimeMinutes,
    status: resolution.effectiveStatus,
    statusLabel: statusDisplayLabel(resolution.effectiveStatus),
    source: record?.source ?? "—",
    liveState,
    liveStateLabel: liveStateLabel(liveState),
  };
}

/** All active employees for a single date (Live / Daily). */
export function buildAttendanceForDate(dateIso: string): AttendanceEmployeeDayRow[] {
  const date = dateIso.slice(0, 10);
  const monthKey = date.slice(0, 7);
  const all = loadDailyRecords();
  const monthRecordsByEmp = new Map<number, DailyAttendanceRecord[]>();
  for (const r of all) {
    if (!r.date.startsWith(monthKey)) continue;
    const arr = monthRecordsByEmp.get(r.employeeId) ?? [];
    arr.push(r);
    monthRecordsByEmp.set(r.employeeId, arr);
  }
  const byKey = getRecordsByEmployeeDate(all);

  return getActiveHrEmployees()
    .map((emp) =>
      buildEmployeeDayRow(
        emp,
        date,
        byKey.get(`${emp.id}|${date}`),
        monthRecordsByEmp.get(emp.id) ?? [],
      ),
    )
    .sort((a, b) => a.employee.employeeName.localeCompare(b.employee.employeeName));
}

export function countDailyStatuses(rows: AttendanceEmployeeDayRow[]) {
  return {
    present: rows.filter((r) => r.status === "present" || r.status === "wfh" || r.status === "hr_review")
      .length,
    absent: rows.filter((r) => r.status === "absent").length,
    halfDay: rows.filter((r) => r.status === "half_day").length,
    leave: rows.filter((r) => r.status === "leave").length,
    weekOff: rows.filter((r) => r.status === "week_off").length,
    holiday: rows.filter((r) => r.status === "holiday").length,
  };
}

export function countLiveStates(rows: AttendanceEmployeeDayRow[]) {
  const working = rows.filter(
    (r) =>
      r.status !== "holiday" &&
      r.status !== "week_off" &&
      r.status !== "leave" &&
      r.status !== "shift_not_configured" &&
      r.status !== "empty",
  );
  return {
    in: working.filter((r) => r.liveState === "in" || r.liveState === "late").length,
    out: working.filter((r) => r.liveState === "out" || r.liveState === "early_leaving").length,
    noPunch: working.filter((r) => r.liveState === "no_punch").length,
    break: working.filter((r) => r.liveState === "break").length,
    late: working.filter((r) => r.lateMinutes > 0).length,
    earlyLeaving: working.filter((r) => r.earlyMinutes > 0).length,
  };
}

function countPaidUnpaidLeaveInMonth(employee: HrEmployee, monthKey: string) {
  let paid = 0;
  let unpaid = 0;
  try {
    const leaves = getLeaveRequestsForEmployee(employee.id, employee.employeeCode).filter(
      (l) => l.status === "approved",
    );
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${monthKey}-${String(d).padStart(2, "0")}`;
      const hit = leaves.find((l) => date >= l.fromDate.slice(0, 10) && date <= l.toDate.slice(0, 10));
      if (!hit) continue;
      if (String(hit.adjustedAgainst).toLowerCase() === "unpaid") unpaid++;
      else paid++;
    }
  } catch {
    /* ignore */
  }
  return { paid, unpaid };
}

export function buildDashboardRows(monthKey: string): AttendanceDashboardRow[] {
  const all = loadDailyRecords().filter((r) => r.date.startsWith(monthKey));
  const byEmp = new Map<number, DailyAttendanceRecord[]>();
  for (const r of all) {
    const arr = byEmp.get(r.employeeId) ?? [];
    arr.push(r);
    byEmp.set(r.employeeId, arr);
  }

  return getActiveHrEmployees()
    .map((emp) => {
      const monthRecords = byEmp.get(emp.id) ?? [];
      const c = countOfficeMonth(emp, monthKey, monthRecords);
      const leaveSplit = countPaidUnpaidLeaveInMonth(emp, monthKey);
      const shift = resolveEmployeeAssignedShift(emp);
      let overtimeMinutes = 0;
      for (const r of monthRecords) {
        const day = resolveOfficeDay(emp, r.date, r, monthRecords);
        overtimeMinutes += day.overtimeMinutes;
      }
      return {
        employee: emp,
        month: monthKey,
        present: c.present,
        absent: c.absent,
        halfDay: c.halfDay,
        weekOff: c.weekOff,
        holiday: c.holiday,
        leave: c.leave,
        paidLeave: leaveSplit.paid,
        unpaidLeave: leaveSplit.unpaid,
        late: c.lateComing,
        earlyGoing: c.earlyLeaving,
        overtimeDays: c.overtimeDays,
        overtimeMinutes,
        shiftName: shift?.name ?? emp.profileSummaries?.attendance?.shift ?? "—",
      };
    })
    .sort((a, b) => a.employee.employeeName.localeCompare(b.employee.employeeName));
}

function weeklyOffPattern(shift: ShiftRecord | null): string {
  if (!shift?.weeklySchedule) return "—";
  const parts: string[] = [];
  const labels: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };
  for (const [key, label] of Object.entries(labels)) {
    const day = shift.weeklySchedule[key as keyof typeof shift.weeklySchedule];
    if (!day) continue;
    if (day.dayType === "off") parts.push(label);
    else if (day.dayType === "selected_weeks_off" && day.offWeeks?.length) {
      parts.push(`${label} (${day.offWeeks.join(",")})`);
    }
  }
  return parts.length ? parts.join(", ") : "—";
}

export function buildCompanyRoster(): CompanyRosterRow[] {
  const shifts = loadShifts();
  return getActiveHrEmployees()
    .map((emp) => {
      const shift = resolveEmployeeAssignedShift(emp, shifts);
      return {
        employee: emp,
        shiftName: shift?.name ?? "—",
        policyName: resolveEmployeeAttendancePolicyLabel(emp),
        scheduleSummary: shift ? formatShiftScheduleSummary(shift) : "—",
        weeklyOffPattern: weeklyOffPattern(shift),
        status: emp.employmentStatus || emp.status || "—",
      };
    })
    .sort((a, b) => a.employee.employeeName.localeCompare(b.employee.employeeName));
}

export function listAssignedShiftNames(): string[] {
  const names = new Set<string>();
  for (const emp of getActiveHrEmployees()) {
    const s = resolveEmployeeAssignedShift(emp);
    if (s?.name) names.add(s.name);
  }
  return Array.from(names).sort();
}

export type ManualCorrectionInput = {
  employeeId: number;
  date: string;
  mode: "present" | "absent" | "half_day" | "punches";
  firstIn?: string;
  lastOut?: string;
  note?: string;
};

/**
 * Admin manual correction — updates DailyAttendanceRecord with lightweight audit.
 * Does not override Holiday/WO calendar configuration.
 */
export function applyManualAttendanceCorrection(
  input: ManualCorrectionInput,
): { ok: true; record: DailyAttendanceRecord } | { ok: false; error: string } {
  const emp = getActiveHrEmployees().find((e) => e.id === input.employeeId);
  if (!emp) return { ok: false, error: "Employee not found." };

  const date = input.date.slice(0, 10);
  const list = loadDailyRecords();
  const idx = list.findIndex((r) => r.employeeId === input.employeeId && r.date === date);
  const existing = idx >= 0 ? list[idx] : undefined;

  const cal = resolveOfficeDay(emp, date, existing);
  if (
    (cal.effectiveStatus === "holiday" || cal.effectiveStatus === "week_off") &&
    input.mode !== "present" &&
    input.mode !== "punches"
  ) {
    // Allow marking present/punches on holiday/WO (worked); block other overrides
  }
  if (
    (cal.scheduledPublicHoliday || cal.scheduledWeeklyOff) &&
    (input.mode === "absent" || input.mode === "half_day") &&
    !existing?.punches?.length
  ) {
    return {
      ok: false,
      error: cal.scheduledPublicHoliday
        ? "Date is a Public Holiday from Settings — cannot mark Absent here."
        : "Date is a Weekly Off from Shift Setup — cannot mark Absent here.",
    };
  }

  const shift = resolveEmployeeAssignedShift(emp);
  const window = shift ? getShiftWorkingWindow(shift, date) : null;

  let punches: AttendancePunch[] = existing?.punches ? [...existing.punches] : [];
  let status: AttendanceDayStatus = existing?.attendanceStatus ?? "absent";

  if (input.mode === "present" || input.mode === "absent" || input.mode === "half_day") {
    status = input.mode;
    if (input.mode === "present" && !punches.length && input.firstIn) {
      punches = [
        {
          id: `manual-in-${Date.now()}`,
          time: input.firstIn,
          type: "in",
          source: "manual",
          sourceDetail: "Admin correction",
        },
      ];
      if (input.lastOut) {
        punches.push({
          id: `manual-out-${Date.now()}`,
          time: input.lastOut,
          type: "out",
          source: "manual",
          sourceDetail: "Admin correction",
        });
      }
    }
  }

  if (input.mode === "punches") {
    const inTime = (input.firstIn ?? "").trim();
    const outTime = (input.lastOut ?? "").trim();
    if (!inTime && !outTime) {
      return { ok: false, error: "Enter Punch In and/or Punch Out." };
    }
    punches = [];
    if (inTime) {
      punches.push({
        id: `manual-in-${Date.now()}`,
        time: inTime,
        type: "in",
        source: "manual",
        sourceDetail: "Admin correction",
      });
    }
    if (outTime) {
      punches.push({
        id: `manual-out-${Date.now()}`,
        time: outTime,
        type: "out",
        source: "manual",
        sourceDetail: "Admin correction",
      });
    }
    status = "present";
  }

  const workMins = calcWorkingMinutesFromPunches(punches);
  const firstIn = punches.find((p) => p.type === "in")?.time ?? input.firstIn ?? "";
  const lastOut =
    [...punches].reverse().find((p) => p.type === "out")?.time ?? input.lastOut ?? "";

  const noteParts = [
    existing?.note,
    input.note?.trim(),
    existing
      ? `Corrected from ${existing.attendanceStatus} by ${CURRENT_USER}`
      : `Created by ${CURRENT_USER}`,
  ].filter(Boolean);

  const record: DailyAttendanceRecord = {
    id: existing?.id ?? (list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1),
    employeeId: emp.id,
    employeeName: emp.employeeName,
    employeeCode: emp.employeeCode,
    department: emp.department,
    date,
    dayName: getDayName(date),
    shift: shift?.name ?? existing?.shift ?? "—",
    firstIn,
    lastOut,
    workingHours: formatDuration(workMins),
    workingMinutes: workMins,
    lateBy: existing?.lateBy ?? "—",
    lateMinutes: existing?.lateMinutes ?? 0,
    earlyExit: existing?.earlyExit ?? "—",
    earlyMinutes: existing?.earlyMinutes ?? 0,
    attendanceStatus: status,
    punches,
    source: "manual",
    createdBy: existing?.createdBy ?? CURRENT_USER,
    updatedBy: CURRENT_USER,
    note: noteParts.join(" · "),
    correctionApprovedBy: CURRENT_USER,
  };

  // Recompute late/early/OT display fields via resolver
  const monthRecs = list.filter(
    (r) => r.employeeId === emp.id && r.date.startsWith(date.slice(0, 7)) && r.date !== date,
  );
  const resolved = resolveOfficeDay(emp, date, record, [...monthRecs, record]);
  record.lateMinutes = resolved.lateMinutes;
  record.earlyMinutes = resolved.earlyMinutes;
  record.lateBy = formatOffset(resolved.lateMinutes);
  record.earlyExit = formatOffset(resolved.earlyMinutes);
  if (resolved.evaluation && input.mode === "punches") {
    record.attendanceStatus = resolved.evaluation.status;
    record.workingMinutes = resolved.evaluation.workingMinutes;
    record.workingHours = formatDuration(resolved.evaluation.workingMinutes);
  }
  if (window && !record.shift) {
    record.shift = shift?.name ?? record.shift;
  }

  if (idx >= 0) list[idx] = record;
  else list.push(record);
  saveDailyRecords(list);

  return { ok: true, record };
}

export { formatPunchTime, formatDuration, formatOffset, todayIso };
