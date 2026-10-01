/**
 * Canonical attendance calendar resolvers.
 *
 * ONE configuration source:
 * - Public / optional holidays → Holiday Calendar (ds_hr_holiday_calendar_v2)
 * - Weekly offs / working days → Shift Setup (ds_hr_shift_setup_v2)
 *
 * Does not read ds_hr_sf_holidays_v1 / ds_hr_sf_weekoff_v1.
 */

import { BRANCH_OPTIONS } from "@/lib/hr/config";
import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { getActiveHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import {
  getCalendarsForYear,
  loadHolidayCalendars,
  normalizeHolidayName,
  type HolidayApplicableTo,
  type HolidayCalendarRecord,
  type HolidayRow,
  type HolidayTypeId,
} from "@/app/(app)/hr/settings/holiday-calendar-data";
import { loadBranches } from "@/app/(app)/hr/settings/organization-data";
import {
  getAssignedShiftForEmployee,
  getDefaultOperationalShift,
  isShiftWeeklyOffOnDate,
  loadShifts,
  type ShiftRecord,
} from "@/app/(app)/hr/settings/shift-setup-data";

/** Branch slug → state for holiday calendar applicability. */
export const EMPLOYEE_BRANCH_STATE_MAP: Record<string, string> = {
  "hq-pune": "Maharashtra",
  "branch-mumbai": "Maharashtra",
  "branch-nagpur": "Maharashtra",
  "warehouse-aurangabad": "Maharashtra",
  "branch-dehradun": "Uttarakhand",
};

export interface EmployeeHolidayScope {
  branchSlug: string;
  state: string;
  branchId: number | null;
}

export interface ResolvedHolidayHit {
  name: string;
  date: string;
  holidayType: HolidayTypeId;
  calendarId: number;
  calendarName: string;
  applicableTo: HolidayApplicableTo;
  /** Branch > State > Company Wide */
  precedence: number;
}

export type AttendanceCalendarKind =
  | "public_holiday"
  | "optional_holiday"
  | "weekly_off"
  | "working_day"
  | "shift_not_configured";

export interface AttendanceCalendarStatus {
  kind: AttendanceCalendarKind;
  date: string;
  /** Display label (holiday name / shift name / Working Day) */
  label: string;
  holidayType?: HolidayTypeId;
  applicableTo?: HolidayApplicableTo;
  shiftId?: number;
  shiftName?: string;
}

const SCOPE_PRECEDENCE: Record<HolidayApplicableTo, number> = {
  branch: 3,
  state: 2,
  company_wide: 1,
};

export function resolveEmployeeHolidayScope(
  branchSlug: string,
  employee?: Pick<HrEmployee, "branch"> | null,
): EmployeeHolidayScope {
  const slug = branchSlug || employee?.branch || "hq-pune";
  const state = EMPLOYEE_BRANCH_STATE_MAP[slug] ?? "";
  const label = BRANCH_OPTIONS.find((b) => b.value === slug)?.label ?? "";
  const cityPart = label.split("—")[1]?.trim().toLowerCase() ?? "";
  const orgBranch = loadBranches()
    .filter((b) => b.status === "active")
    .find(
      (b) =>
        (!state || b.state === state) &&
        (b.name.toLowerCase().includes(cityPart) ||
          label.toLowerCase().includes(b.name.toLowerCase()) ||
          (!cityPart && state && b.state === state)),
    );
  return { branchSlug: slug, state, branchId: orgBranch?.id ?? null };
}

export function calendarAppliesToScope(
  calendar: HolidayCalendarRecord,
  scope: EmployeeHolidayScope,
): boolean {
  if (calendar.status !== "active") return false;
  if (calendar.applicableTo === "company_wide") return true;
  if (calendar.applicableTo === "state" && scope.state && calendar.state === scope.state) {
    return true;
  }
  if (
    calendar.applicableTo === "branch" &&
    scope.branchId != null &&
    calendar.branchId === scope.branchId
  ) {
    return true;
  }
  return false;
}

/** Applicable calendars for year: union of branch + state + company-wide (active only). */
export function getApplicableHolidayCalendars(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch">,
  dateOrYear: string | number,
): HolidayCalendarRecord[] {
  const year =
    typeof dateOrYear === "number" ? dateOrYear : Number(String(dateOrYear).slice(0, 4));
  const scope = resolveEmployeeHolidayScope(employee.branch);
  return getCalendarsForYear(year, loadHolidayCalendars()).filter((c) =>
    calendarAppliesToScope(c, scope),
  );
}

function collectHolidayHits(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch">,
  dateIso: string,
  typeFilter?: HolidayTypeId,
): ResolvedHolidayHit[] {
  const date = dateIso.slice(0, 10);
  const calendars = getApplicableHolidayCalendars(employee, date);
  const hits: ResolvedHolidayHit[] = [];
  for (const cal of calendars) {
    for (const h of cal.holidays) {
      if (h.date.slice(0, 10) !== date) continue;
      if (typeFilter && h.holidayType !== typeFilter) continue;
      hits.push({
        name: h.name,
        date,
        holidayType: h.holidayType,
        calendarId: cal.id,
        calendarName: cal.name,
        applicableTo: cal.applicableTo,
        precedence: SCOPE_PRECEDENCE[cal.applicableTo] ?? 0,
      });
    }
  }
  return hits.sort((a, b) => b.precedence - a.precedence || a.name.localeCompare(b.name));
}

/** Highest-precedence public holiday for employee on date, if any. */
export function getApplicablePublicHoliday(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch">,
  dateIso: string,
): ResolvedHolidayHit | null {
  return collectHolidayHits(employee, dateIso, "public")[0] ?? null;
}

export function isPublicHoliday(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch">,
  dateIso: string,
): boolean {
  return !!getApplicablePublicHoliday(employee, dateIso);
}

/** Optional holiday dates only — does NOT auto-mark attendance. */
export function getApplicableOptionalHoliday(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch">,
  dateIso: string,
): ResolvedHolidayHit | null {
  return collectHolidayHits(employee, dateIso, "optional")[0] ?? null;
}

export function isOptionalHoliday(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch">,
  dateIso: string,
): boolean {
  return !!getApplicableOptionalHoliday(employee, dateIso);
}

export function getEmployeeShift(
  employee: Pick<HrEmployee, "profileSummaries"> | null | undefined,
  shifts?: ShiftRecord[],
  opts?: { fallbackDefault?: boolean },
): ShiftRecord | null {
  const att = employee?.profileSummaries?.attendance;
  const list = shifts ?? (typeof window !== "undefined" ? loadShifts() : undefined);
  const assigned = getAssignedShiftForEmployee(att, list);
  if (assigned) return assigned;
  if (opts?.fallbackDefault === false) return null;
  return getDefaultOperationalShift(list);
}

export function isEmployeeWeeklyOff(
  employee: Pick<HrEmployee, "profileSummaries"> | null | undefined,
  dateIso: string,
  shifts?: ShiftRecord[],
  opts?: { fallbackDefault?: boolean },
): boolean {
  const shift = getEmployeeShift(employee, shifts, opts);
  if (!shift) return false;
  return isShiftWeeklyOffOnDate(shift, dateIso);
}

export type ResolveCalendarOpts = {
  shifts?: ShiftRecord[];
  treatOptionalAsWorking?: boolean;
  /**
   * When false, unassigned employees do not inherit Field Force / General Shift.
   * Office Attendance should pass false (show shift_not_configured instead of false WO).
   * Default true for Field / Sales Force compatibility.
   */
  fallbackDefault?: boolean;
};

/**
 * Calendar status for a date (configuration layer only).
 * Precedence: Public Holiday → Weekly Off → Working Day.
 * Optional holidays are identified but returned as optional_holiday (not auto WO/holiday).
 */
export function resolveAttendanceCalendarStatus(
  employee: Pick<HrEmployee, "id" | "employeeCode" | "branch" | "profileSummaries">,
  dateIso: string,
  opts?: ResolveCalendarOpts,
): AttendanceCalendarStatus {
  const date = dateIso.slice(0, 10);
  const publicHit = getApplicablePublicHoliday(employee, date);
  if (publicHit) {
    return {
      kind: "public_holiday",
      date,
      label: publicHit.name,
      holidayType: "public",
      applicableTo: publicHit.applicableTo,
    };
  }

  const fallbackDefault = opts?.fallbackDefault !== false;
  const shift = getEmployeeShift(employee, opts?.shifts ?? loadShifts(), { fallbackDefault });

  if (!shift && opts?.fallbackDefault === false) {
    return {
      kind: "shift_not_configured",
      date,
      label: "Shift Not Configured",
    };
  }

  if (shift && isShiftWeeklyOffOnDate(shift, date)) {
    return {
      kind: "weekly_off",
      date,
      label: shift.name,
      shiftId: shift.id,
      shiftName: shift.name,
    };
  }

  const optionalHit = getApplicableOptionalHoliday(employee, date);
  if (optionalHit && !opts?.treatOptionalAsWorking) {
    return {
      kind: "optional_holiday",
      date,
      label: optionalHit.name,
      holidayType: "optional",
      applicableTo: optionalHit.applicableTo,
    };
  }

  return {
    kind: "working_day",
    date,
    label: "Working Day",
    shiftId: shift?.id,
    shiftName: shift?.name,
  };
}

export function getHrEmployeeById(employeeId: number): HrEmployee | undefined {
  return getActiveHrEmployees().find((e) => e.id === employeeId);
}

/** Debug / migration: whether a public holiday name+date exists in any active calendar. */
export function canonicalHasPublicHoliday(dateIso: string, name: string): boolean {
  const date = dateIso.slice(0, 10);
  const key = normalizeHolidayName(name);
  const year = Number(date.slice(0, 4));
  return getCalendarsForYear(year, loadHolidayCalendars()).some(
    (c) =>
      c.status === "active" &&
      c.holidays.some(
        (h) =>
          h.holidayType === "public" &&
          h.date.slice(0, 10) === date &&
          normalizeHolidayName(h.name) === key,
      ),
  );
}

export type { HolidayRow };
