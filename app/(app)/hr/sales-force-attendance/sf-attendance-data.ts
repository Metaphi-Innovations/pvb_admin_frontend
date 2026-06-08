import { CURRENT_USER } from "@/lib/hr/config";
import { getActiveHrEmployees, type HrEmployee } from "../employees/employee-master-data";
import {
  getRoleDisplayName,
  isTadaApplicableForRole,
  resolveRoleIdFromDesignation,
} from "../sales-force-policy/tada-policy-data";
import {
  getHolidaysForEmployeeOnDate,
  isConfiguredHolidayDate,
  loadSfHolidays,
  type SfEmployeeContext,
} from "./sf-holiday-data";
import {
  getWeekOffRuleForEmployeeOnDate,
  loadSfWeekOffRules,
  weekOffRuleAppliesToEmployee,
  type WeekOffDayOption,
} from "./sf-weekoff-data";

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

function isSecondSaturday(date: string): boolean {
  const d = new Date(date + "T12:00:00");
  if (d.getDay() !== 6) return false;
  return d.getDate() >= 8 && d.getDate() <= 14;
}

function matchesWeekOffDay(date: string, option: WeekOffDayOption): boolean {
  if (option === "Second Saturday") return isSecondSaturday(date);
  const d = new Date(date + "T12:00:00");
  const idx = DAY_NAMES.indexOf(option as (typeof DAY_NAMES)[number]);
  return idx >= 0 && d.getDay() === idx;
}

function datesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
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
  const emps = getSfEmployees();
  const records: SfDailyAttendance[] = [];
  const month = currentMonthKey();
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const seedThrough = Math.min(daysInMonth, Math.max(10, new Date().getDate()));
  for (let d = 1; d <= seedThrough; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    emps.forEach((emp, idx) => {
      const ctx: SfEmployeeContext = emp;
      if (isConfiguredHolidayDate(date, ctx)) {
        records.push({
          id: `${emp.employeeId}-${date}`,
          employeeId: emp.employeeId,
          date,
          status: "holiday",
          markedBy: "System",
          markedOn: `${date}T00:00:00.000Z`,
          remarks: "Configured holiday",
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
    // Re-seed if stored data has no rows for any current Sales Force employee this month
    const month = currentMonthKey();
    const emps = getSfEmployees();
    if (emps.length > 0 && !parsed.some((r) => r.date.startsWith(month) && emps.some((e) => e.employeeId === r.employeeId))) {
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

export function syncHolidaysToAttendance(records: SfDailyAttendance[]): SfDailyAttendance[] {
  const emps = getSfEmployees();
  const byKey = new Map(records.map((r) => [`${r.employeeId}-${r.date}`, r]));
  const holidays = loadSfHolidays().filter((h) => h.status === "active");

  holidays.forEach((h) => {
    emps.forEach((emp) => {
      if (!isConfiguredHolidayDate(h.holidayDate, emp)) return;
      const key = `${emp.employeeId}-${h.holidayDate}`;
      const existing = byKey.get(key);
      if (existing?.isHolidayOverride) return;
      if (existing && (existing.status === "present" || existing.status === "absent") && !existing.isHolidayOverride) {
        return;
      }
      const rec: SfDailyAttendance = {
        id: key,
        employeeId: emp.employeeId,
        date: h.holidayDate,
        status: "holiday",
        markedBy: "System",
        markedOn: new Date().toISOString(),
        remarks: h.holidayName,
      };
      byKey.set(key, rec);
    });
  });

  return Array.from(byKey.values());
}

export function syncWeekOffsToAttendance(records: SfDailyAttendance[]): SfDailyAttendance[] {
  const emps = getSfEmployees();
  const byKey = new Map(records.map((r) => [`${r.employeeId}-${r.date}`, r]));
  const rules = loadSfWeekOffRules().filter((r) => r.status === "active");
  const yearEnd = `${new Date().getFullYear() + 1}-12-31`;

  rules.forEach((rule) => {
    const from = rule.effectiveFrom || "2020-01-01";
    const to = rule.effectiveTo || yearEnd;
    const dates = datesInRange(from, to);

    emps.forEach((emp) => {
      if (!weekOffRuleAppliesToEmployee(rule, emp)) return;
      dates.forEach((date) => {
        if (!rule.weekOffDays.some((day) => matchesWeekOffDay(date, day))) return;
        if (isConfiguredHolidayDate(date, emp)) return;

        const key = `${emp.employeeId}-${date}`;
        const existing = byKey.get(key);
        if (existing?.isHolidayOverride || existing?.isWeekOffOverride) return;
        if (existing && (existing.status === "present" || existing.status === "absent")) return;
        if (existing?.status === "holiday") return;

        const rec: SfDailyAttendance = {
          id: key,
          employeeId: emp.employeeId,
          date,
          status: "week_off",
          markedBy: "System",
          markedOn: new Date().toISOString(),
          remarks: rule.ruleName,
        };
        byKey.set(key, rec);
      });
    });
  });

  return Array.from(byKey.values());
}

export function syncAllAttendanceRules(records: SfDailyAttendance[]): SfDailyAttendance[] {
  return syncWeekOffsToAttendance(syncHolidaysToAttendance(records));
}

export function resolveEmployeeMonthDays(employeeId: number, monthKey: string): ResolvedAttendanceDay[] {
  const emp = getSfEmployees().find((e) => e.employeeId === employeeId);
  if (!emp) return [];

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
    const holidays = getHolidaysForEmployeeOnDate(date, emp);
    const weekOffRule = getWeekOffRuleForEmployeeOnDate(date, emp);

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

    if (holidays.length) {
      const h = holidays[0];
      result.push({
        date,
        dayOfMonth: d,
        dayName,
        status: "holiday",
        eventName: h.holidayName,
        holidayType: h.holidayType,
        applicableTo: h.applicableTo,
        remarks: h.remarks || storedRec?.remarks,
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

    if (weekOffRule) {
      result.push({
        date,
        dayOfMonth: d,
        dayName,
        status: "week_off",
        eventName: weekOffRule.ruleName,
        ruleName: weekOffRule.ruleName,
        applicableTo: weekOffRule.applicableTo,
        remarks: weekOffRule.remarks || storedRec?.remarks,
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
  const list = loadSfDailyAttendance();
  const emp = getSfEmployees().find((e) => e.employeeId === employeeId);
  if (emp && isConfiguredHolidayDate(date, emp) && !overrideHoliday) {
    throw new Error("HOLIDAY_DATE");
  }
  if (emp && getWeekOffRuleForEmployeeOnDate(date, emp) && !overrideWeekOff && !overrideHoliday) {
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
  if (!emp) return null;
  const holidays = getHolidaysForEmployeeOnDate(date, emp);
  if (!holidays.length) return null;
  return `This date is configured as Holiday (${holidays.map((h) => h.holidayName).join(", ")}).`;
}

export function getWeekOffWarning(employeeId: number, date: string): string | null {
  const emp = getSfEmployees().find((e) => e.employeeId === employeeId);
  if (!emp) return null;
  if (isConfiguredHolidayDate(date, emp)) return null;
  const rule = getWeekOffRuleForEmployeeOnDate(date, emp);
  if (!rule) return null;
  return `This date is configured as Week Off (${rule.ruleName}).`;
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
