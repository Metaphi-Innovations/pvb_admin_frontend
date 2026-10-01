import { CURRENT_USER } from "@/lib/hr/config";
import {
  getApplicablePublicHoliday,
  getHrEmployeeById,
  isEmployeeWeeklyOff,
  isPublicHoliday,
  resolveAttendanceCalendarStatus,
} from "@/lib/hr/attendance-calendar-resolve";
import { ensureAttendanceConfigMigration } from "@/lib/hr/attendance-config-migration";
import { getActiveHrEmployees, type HrEmployee } from "../employees/employee-master-data";
import {
  getRoleDisplayName,
  isTadaApplicableForRole,
  resolveRoleIdFromDesignation,
} from "../sales-force-policy/tada-policy-data";
import type { SfEmployeeContext } from "./sf-holiday-data";

export type SfAttendanceStatus = "present" | "absent" | "holiday" | "week_off";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BRANCH_MAP: Record<string, { territory: string; state: string }> = {
  "hq-pune": { territory: "Pune HQ", state: "Maharashtra" },
  "branch-mumbai": { territory: "Mumbai", state: "Maharashtra" },
  "branch-nagpur": { territory: "Nagpur", state: "Maharashtra" },
  "warehouse-aurangabad": { territory: "Aurangabad", state: "Maharashtra" },
  "branch-dehradun": { territory: "Dehradun", state: "Uttarakhand" },
};

export interface SfEmployee extends SfEmployeeContext {
  employeeCode: string;
  employeeName: string;
  designation: string;
  reportingManager: string;
}

export interface SfDailyAttendance {
  id: string;
  employeeId: number;
  date: string;
  status: SfAttendanceStatus;
  markedBy: string;
  markedOn: string;
  remarks: string;
  isHolidayOverride?: boolean;
  isWeekOffOverride?: boolean;
}

export interface ResolvedAttendanceDay {
  date: string;
  dayOfMonth: number;
  dayName: string;
  status: SfAttendanceStatus | null;
  eventName?: string;
  holidayType?: string;
  applicableTo?: string;
  ruleName?: string;
  remarks?: string;
  markedBy?: string;
  markedOn?: string;
}

export interface SfMonthlySummary {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  role: string;
  reportingManager: string;
  territory: string;
  month: string;
  presentDays: number;
  absentDays: number;
  holidayDays: number;
  weekOffDays: number;
  status: "complete" | "pending";
}

const STORAGE_KEY = "ds_hr_sf_attendance_v2";

function datesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function hrEmployeeForSf(emp: SfEmployee): HrEmployee | undefined {
  return getHrEmployeeById(emp.employeeId) ?? getActiveHrEmployees().find((e) => e.id === emp.employeeId);
}

export function getSfEmployees(): SfEmployee[] {
  return getActiveHrEmployees()
    .filter((e) => {
      const rid = resolveRoleIdFromDesignation(e.designation);
      return rid && isTadaApplicableForRole(rid);
    })
    .map(enrichSfEmployee);
}

export function enrichSfEmployee(e: HrEmployee): SfEmployee {
  const roleId = resolveRoleIdFromDesignation(e.designation);
  const map = BRANCH_MAP[e.branch] ?? { territory: e.branch, state: "Maharashtra" };
  return {
    employeeId: e.id,
    employeeCode: e.employeeCode,
    employeeName: e.employeeName,
    designation: e.designation,
    reportingManager: e.reportingManagerName,
    roleId,
    roleName: roleId ? getRoleDisplayName(roleId) : e.designation,
    territory: map.territory,
    state: map.state,
  };
}

function seedRecords(): SfDailyAttendance[] {
  ensureAttendanceConfigMigration();
  const emps = getSfEmployees();
  const records: SfDailyAttendance[] = [];
  const month = currentMonthKey();
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const seedThrough = Math.min(daysInMonth, Math.max(10, new Date().getDate()));
  for (let d = 1; d <= seedThrough; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    emps.forEach((emp, idx) => {
      const hr = hrEmployeeForSf(emp);
      if (hr && isPublicHoliday(hr, date)) {
        const hit = getApplicablePublicHoliday(hr, date);
        records.push({
          id: `${emp.employeeId}-${date}`,
          employeeId: emp.employeeId,
          date,
          status: "holiday",
          markedBy: "System",
          markedOn: `${date}T00:00:00.000Z`,
          remarks: hit?.name ?? "Configured holiday",
        });
        return;
      }
      const status: SfAttendanceStatus = idx % 7 === 0 ? "absent" : "present";
      records.push({
        id: `${emp.employeeId}-${date}`,
        employeeId: emp.employeeId,
        date,
        status,
        markedBy: status === "present" ? "System Sync" : CURRENT_USER,
        markedOn: `${date}T09:00:00.000Z`,
        remarks: "",
      });
    });
  }
  return records;
}

function persistSeededAttendance(): SfDailyAttendance[] {
  const seeded = syncAllAttendanceRules(seedRecords());
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  }
  return seeded;
}

export function loadSfDailyAttendance(): SfDailyAttendance[] {
  ensureAttendanceConfigMigration();
  if (typeof window === "undefined") return syncAllAttendanceRules(seedRecords());
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return persistSeededAttendance();
    }
    const parsed = JSON.parse(raw) as SfDailyAttendance[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return persistSeededAttendance();
    }
    const month = currentMonthKey();
    const emps = getSfEmployees();
    if (
      emps.length > 0 &&
      !parsed.some((r) => r.date.startsWith(month) && emps.some((e) => e.employeeId === r.employeeId))
    ) {
      return persistSeededAttendance();
    }
    return parsed;
  } catch {
    return persistSeededAttendance();
  }
}

export function saveSfDailyAttendance(list: SfDailyAttendance[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Sync public holidays from Holiday Calendar into attendance store.
 * Preserves present/absent marks and holiday overrides.
 */
export function syncHolidaysToAttendance(records: SfDailyAttendance[]): SfDailyAttendance[] {
  ensureAttendanceConfigMigration();
  const emps = getSfEmployees();
  const byKey = new Map(records.map((r) => [`${r.employeeId}-${r.date}`, r]));
  const year = new Date().getFullYear();
  const from = `${year - 1}-01-01`;
  const to = `${year + 1}-12-31`;
  const dates = datesInRange(from, to);

  emps.forEach((emp) => {
    const hr = hrEmployeeForSf(emp);
    if (!hr) return;
    dates.forEach((date) => {
      const hit = getApplicablePublicHoliday(hr, date);
      if (!hit) return;
      const key = `${emp.employeeId}-${date}`;
      const existing = byKey.get(key);
      if (existing?.isHolidayOverride) return;
      if (existing && (existing.status === "present" || existing.status === "absent") && !existing.isHolidayOverride) {
        return;
      }
      byKey.set(key, {
        id: key,
        employeeId: emp.employeeId,
        date,
        status: "holiday",
        markedBy: "System",
        markedOn: new Date().toISOString(),
        remarks: hit.name,
      });
    });
  });

  return Array.from(byKey.values());
}

/**
 * Sync weekly offs from assigned Shift Setup into attendance store.
 * Preserves present/absent marks and overrides; skips public holiday dates.
 */
export function syncWeekOffsToAttendance(records: SfDailyAttendance[]): SfDailyAttendance[] {
  ensureAttendanceConfigMigration();
  const emps = getSfEmployees();
  const byKey = new Map(records.map((r) => [`${r.employeeId}-${r.date}`, r]));
  const year = new Date().getFullYear();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const dates = datesInRange(from, to);

  emps.forEach((emp) => {
    const hr = hrEmployeeForSf(emp);
    if (!hr) return;
    dates.forEach((date) => {
      if (isPublicHoliday(hr, date)) return;
      if (!isEmployeeWeeklyOff(hr, date)) return;

      const key = `${emp.employeeId}-${date}`;
      const existing = byKey.get(key);
      if (existing?.isHolidayOverride || existing?.isWeekOffOverride) return;
      if (existing && (existing.status === "present" || existing.status === "absent")) return;
      if (existing?.status === "holiday") return;

      const cal = resolveAttendanceCalendarStatus(hr, date);
      byKey.set(key, {
        id: key,
        employeeId: emp.employeeId,
        date,
        status: "week_off",
        markedBy: "System",
        markedOn: new Date().toISOString(),
        remarks: cal.shiftName ?? cal.label,
      });
    });
  });

  return Array.from(byKey.values());
}

export function syncAllAttendanceRules(records: SfDailyAttendance[]): SfDailyAttendance[] {
  return syncWeekOffsToAttendance(syncHolidaysToAttendance(records));
}

export function resolveEmployeeMonthDays(employeeId: number, monthKey: string): ResolvedAttendanceDay[] {
  ensureAttendanceConfigMigration();
  const emp = getSfEmployees().find((e) => e.employeeId === employeeId);
  if (!emp) return [];
  const hr = hrEmployeeForSf(emp);
  if (!hr) return [];

  const stored = loadSfDailyAttendance().filter(
    (r) => r.employeeId === employeeId && r.date.startsWith(monthKey),
  );
  const storedMap = new Map(stored.map((r) => [r.date, r]));
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const result: ResolvedAttendanceDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthKey}-${String(d).padStart(2, "0")}`;
    const dayName = DAY_NAMES[new Date(date + "T12:00:00").getDay()];
    const storedRec = storedMap.get(date);
    const cal = resolveAttendanceCalendarStatus(hr, date);

    if (storedRec?.isHolidayOverride && (storedRec.status === "present" || storedRec.status === "absent")) {
      result.push({
        date,
        dayOfMonth: d,
        dayName,
        status: storedRec.status,
        remarks: storedRec.remarks,
        markedBy: storedRec.markedBy,
        markedOn: storedRec.markedOn,
      });
      continue;
    }

    if (cal.kind === "public_holiday") {
      result.push({
        date,
        dayOfMonth: d,
        dayName,
        status: "holiday",
        eventName: cal.label,
        holidayType: "Public Holiday",
        applicableTo: cal.applicableTo,
        remarks: storedRec?.remarks || cal.label,
        markedBy: storedRec?.markedBy ?? "System",
        markedOn: storedRec?.markedOn,
      });
      continue;
    }

    if (storedRec && (storedRec.status === "present" || storedRec.status === "absent")) {
      result.push({
        date,
        dayOfMonth: d,
        dayName,
        status: storedRec.status,
        remarks: storedRec.remarks,
        markedBy: storedRec.markedBy,
        markedOn: storedRec.markedOn,
      });
      continue;
    }

    if (cal.kind === "weekly_off") {
      result.push({
        date,
        dayOfMonth: d,
        dayName,
        status: "week_off",
        eventName: cal.shiftName ?? cal.label,
        ruleName: cal.shiftName ?? cal.label,
        remarks: storedRec?.remarks || cal.label,
        markedBy: storedRec?.markedBy ?? "System",
        markedOn: storedRec?.markedOn,
      });
      continue;
    }

    if (storedRec) {
      result.push({
        date,
        dayOfMonth: d,
        dayName,
        status: storedRec.status,
        eventName: storedRec.remarks || undefined,
        remarks: storedRec.remarks,
        markedBy: storedRec.markedBy,
        markedOn: storedRec.markedOn,
      });
      continue;
    }

    result.push({ date, dayOfMonth: d, dayName, status: null });
  }

  return result;
}

export function buildMonthlySummaries(month: string, records = loadSfDailyAttendance()): SfMonthlySummary[] {
  const emps = getSfEmployees();
  void records;

  return emps.map((emp) => {
    const days = resolveEmployeeMonthDays(emp.employeeId, month);
    const presentDays = days.filter((r) => r.status === "present").length;
    const absentDays = days.filter((r) => r.status === "absent").length;
    const holidayDays = days.filter((r) => r.status === "holiday").length;
    const weekOffDays = days.filter((r) => r.status === "week_off").length;
    const filled = days.filter((r) => r.status !== null).length;

    return {
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      role: emp.roleName,
      reportingManager: emp.reportingManager,
      territory: emp.territory,
      month,
      presentDays,
      absentDays,
      holidayDays,
      weekOffDays,
      status: filled >= days.length - 2 ? "complete" : "pending",
    };
  });
}

export function markSfAttendance(
  employeeId: number,
  date: string,
  status: "present" | "absent",
  remarks: string,
  overrideHoliday = false,
  overrideWeekOff = false,
): SfDailyAttendance[] {
  ensureAttendanceConfigMigration();
  const list = loadSfDailyAttendance();
  const emp = getSfEmployees().find((e) => e.employeeId === employeeId);
  const hr = emp ? hrEmployeeForSf(emp) : undefined;
  if (hr && isPublicHoliday(hr, date) && !overrideHoliday) {
    throw new Error("HOLIDAY_DATE");
  }
  if (hr && isEmployeeWeeklyOff(hr, date) && !overrideWeekOff && !overrideHoliday) {
    throw new Error("WEEK_OFF_DATE");
  }
  const id = `${employeeId}-${date}`;
  const ts = new Date().toISOString();
  const next: SfDailyAttendance = {
    id,
    employeeId,
    date,
    status,
    markedBy: CURRENT_USER,
    markedOn: ts,
    remarks,
    isHolidayOverride: overrideHoliday,
    isWeekOffOverride: overrideWeekOff || overrideHoliday,
  };
  const merged = [...list.filter((r) => r.id !== id), next];
  saveSfDailyAttendance(merged);
  return merged;
}

export function bulkMarkSfAttendance(opts: {
  employeeIds: number[];
  dateFrom: string;
  dateTo: string;
  status: "present" | "absent";
  remarks: string;
  overrideHoliday?: boolean;
  overrideWeekOff?: boolean;
}): SfDailyAttendance[] {
  let list = loadSfDailyAttendance();
  const start = new Date(opts.dateFrom);
  const end = new Date(opts.dateTo);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    opts.employeeIds.forEach((employeeId) => {
      try {
        list = markSfAttendance(
          employeeId,
          date,
          opts.status,
          opts.remarks,
          opts.overrideHoliday,
          opts.overrideWeekOff,
        );
      } catch {
        /* skip conflicts unless override */
      }
    });
  }
  return list;
}

export function getHolidayWarning(employeeId: number, date: string): string | null {
  const emp = getSfEmployees().find((e) => e.employeeId === employeeId);
  const hr = emp ? hrEmployeeForSf(emp) : undefined;
  if (!hr) return null;
  const hit = getApplicablePublicHoliday(hr, date);
  if (!hit) return null;
  return `This date is configured as Holiday (${hit.name}).`;
}

export function getWeekOffWarning(employeeId: number, date: string): string | null {
  const emp = getSfEmployees().find((e) => e.employeeId === employeeId);
  const hr = emp ? hrEmployeeForSf(emp) : undefined;
  if (!hr) return null;
  if (isPublicHoliday(hr, date)) return null;
  if (!isEmployeeWeeklyOff(hr, date)) return null;
  const cal = resolveAttendanceCalendarStatus(hr, date);
  return `This date is configured as Week Off (${cal.shiftName ?? cal.label}).`;
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export const SF_ATTENDANCE_AUDIT = [
  { at: "2026-06-04T10:00:00.000Z", user: "Admin", action: "Marked Present", entity: "Amit Deshmukh" },
];
