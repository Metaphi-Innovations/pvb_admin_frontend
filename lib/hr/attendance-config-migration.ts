/**
 * One-time frontend migration: legacy SF holiday/week-off seeds → canonical Settings.
 *
 * Idempotent via ds_hr_attendance_config_migration_v1.
 * Never deletes ds_hr_sf_holidays_v1 / ds_hr_sf_weekoff_v1.
 * Does not auto-map ambiguous territory rules.
 */

import {
  getCalendarsForYear,
  loadHolidayCalendars,
  nextCalendarId,
  nextHolidayRowId,
  normalizeHolidayName,
  saveHolidayCalendars,
  withCalendarNewAudit,
  withCalendarUpdateAudit,
  type HolidayCalendarRecord,
} from "@/app/(app)/hr/settings/holiday-calendar-data";
import {
  loadShifts,
  nextShiftId,
  normalizeShiftName,
  offDayConfig,
  saveShifts,
  selectedWeeksOffConfig,
  withShiftNewAudit,
  workingDayConfig,
  type ShiftRecord,
} from "@/app/(app)/hr/settings/shift-setup-data";
import { loadSfHolidays } from "@/app/(app)/hr/sales-force-attendance/sf-holiday-data";
import { loadSfWeekOffRules } from "@/app/(app)/hr/sales-force-attendance/sf-weekoff-data";
import { canonicalHasPublicHoliday } from "@/lib/hr/attendance-calendar-resolve";

export const ATTENDANCE_CONFIG_MIGRATION_KEY = "ds_hr_attendance_config_migration_v1";

export interface AttendanceConfigMigrationReport {
  ran: boolean;
  skipped: boolean;
  holidaysAdded: { date: string; name: string; target: string }[];
  calendarsCreated: string[];
  shiftsCreated: string[];
  manualRequired: string[];
  notes: string[];
}

interface MigrationState {
  version: 1;
  completedAt: string;
  report: AttendanceConfigMigrationReport;
}

function alreadyMigrated(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(ATTENDANCE_CONFIG_MIGRATION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as MigrationState;
    return parsed?.version === 1;
  } catch {
    return false;
  }
}

function mapSfHolidayScope(h: {
  applicableTo: string;
  state: string;
  holidayType: string;
}): { applicableTo: "company_wide" | "state"; state: string } | "skip" {
  // Territory / Role / Branch holidays cannot map without inventing scope — leave manual
  if (
    h.applicableTo === "Specific Territory" ||
    h.applicableTo === "Specific Role"
  ) {
    return "skip";
  }
  if (h.applicableTo === "Specific State" && h.state) {
    return { applicableTo: "state", state: h.state };
  }
  // National / Company / All Sales Force → company-wide public
  return { applicableTo: "company_wide", state: "" };
}

function ensurePublicHolidayOnCalendar(
  list: HolidayCalendarRecord[],
  year: number,
  applicableTo: "company_wide" | "state",
  state: string,
  date: string,
  name: string,
): { list: HolidayCalendarRecord[]; added: boolean; calendarCreated?: string } {
  if (canonicalHasPublicHoliday(date, name)) {
    return { list, added: false };
  }

  let cal =
    getCalendarsForYear(year, list).find(
      (c) =>
        c.status === "active" &&
        c.applicableTo === applicableTo &&
        (applicableTo === "company_wide" || c.state === state),
    ) ?? null;

  let calendarCreated: string | undefined;
  let next = [...list];

  if (!cal) {
    const created = withCalendarNewAudit({
      id: nextCalendarId(next),
      name:
        applicableTo === "company_wide"
          ? `Company Wide Holiday Calendar ${year}`
          : `${state} Holiday Calendar ${year}`,
      year,
      applicableTo,
      state: applicableTo === "state" ? state : "",
      branchId: null,
      branchName: "",
      status: "active",
      holidays: [],
    });
    next.push(created);
    cal = created;
    calendarCreated = created.name;
  }

  const hasSameDate = cal.holidays.some(
    (h) =>
      h.date.slice(0, 10) === date.slice(0, 10) &&
      normalizeHolidayName(h.name) === normalizeHolidayName(name),
  );
  if (hasSameDate) return { list: next, added: false, calendarCreated };

  const updated = withCalendarUpdateAudit({
    ...cal,
    holidays: [
      ...cal.holidays,
      {
        id: nextHolidayRowId(cal.holidays),
        name,
        date: date.slice(0, 10),
        holidayType: "public",
      },
    ],
  });
  next = next.map((c) => (c.id === updated.id ? updated : c));
  return { list: next, added: true, calendarCreated };
}

function ensureFieldForceShifts(shifts: ShiftRecord[]): {
  list: ShiftRecord[];
  created: string[];
} {
  const created: string[] = [];
  let list = [...shifts];

  const hasSundayOnly = list.some((s) => {
    const n = normalizeShiftName(s.name);
    return n.includes("field force") && !n.includes("2nd");
  });

  if (!hasSundayOnly) {
    const fieldForce = withShiftNewAudit({
      id: nextShiftId(list),
      name: "Field Force Shift",
      graceInMinutes: 15,
      graceOutMinutes: 10,
      breakDurationMinutes: 60,
      status: "active",
      weeklySchedule: {
        monday: workingDayConfig("09:30", "18:30"),
        tuesday: workingDayConfig("09:30", "18:30"),
        wednesday: workingDayConfig("09:30", "18:30"),
        thursday: workingDayConfig("09:30", "18:30"),
        friday: workingDayConfig("09:30", "18:30"),
        saturday: workingDayConfig("09:30", "18:30"),
        sunday: offDayConfig(),
      },
    });
    list.push(fieldForce);
    created.push(fieldForce.name);
  }

  const hasSecondSat = list.some((s) =>
    normalizeShiftName(s.name).includes("sunday + 2nd saturday"),
  );
  if (!hasSecondSat) {
    const gujaratStyle = withShiftNewAudit({
      id: nextShiftId(list),
      name: "Field Force — Sunday + 2nd Saturday",
      graceInMinutes: 15,
      graceOutMinutes: 10,
      breakDurationMinutes: 60,
      status: "active",
      weeklySchedule: {
        monday: workingDayConfig("09:30", "18:30"),
        tuesday: workingDayConfig("09:30", "18:30"),
        wednesday: workingDayConfig("09:30", "18:30"),
        thursday: workingDayConfig("09:30", "18:30"),
        friday: workingDayConfig("09:30", "18:30"),
        saturday: selectedWeeksOffConfig("09:30", "18:30", [2]),
        sunday: offDayConfig(),
      },
    });
    list.push(gujaratStyle);
    created.push(gujaratStyle.name);
  }

  return { list, created };
}

/**
 * Run once per browser. Safe to call from attendance loaders.
 */
export function ensureAttendanceConfigMigration(): AttendanceConfigMigrationReport {
  const empty: AttendanceConfigMigrationReport = {
    ran: false,
    skipped: true,
    holidaysAdded: [],
    calendarsCreated: [],
    shiftsCreated: [],
    manualRequired: [],
    notes: [],
  };

  if (typeof window === "undefined") return empty;
  if (alreadyMigrated()) {
    return { ...empty, notes: ["Migration already completed (ds_hr_attendance_config_migration_v1)."] };
  }

  const report: AttendanceConfigMigrationReport = {
    ran: true,
    skipped: false,
    holidaysAdded: [],
    calendarsCreated: [],
    shiftsCreated: [],
    manualRequired: [],
    notes: [],
  };

  // --- Holidays ---
  let calendars = loadHolidayCalendars();
  const sfHolidays = loadSfHolidays().filter((h) => h.status === "active");

  for (const h of sfHolidays) {
    const mapped = mapSfHolidayScope(h);
    if (mapped === "skip") {
      report.manualRequired.push(
        `Holiday "${h.holidayName}" (${h.holidayDate}) — ${h.applicableTo}${h.territory ? ` / ${h.territory}` : ""}${h.role ? ` / ${h.role}` : ""} cannot map to company/state/branch. Configure manually in Holiday Calendar if still needed.`,
      );
      continue;
    }

    if (canonicalHasPublicHoliday(h.holidayDate, h.holidayName)) {
      report.notes.push(`Already represented: ${h.holidayName} @ ${h.holidayDate}`);
      continue;
    }

    const year = Number(h.holidayDate.slice(0, 4));
    const result = ensurePublicHolidayOnCalendar(
      calendars,
      year,
      mapped.applicableTo,
      mapped.state,
      h.holidayDate,
      h.holidayName,
    );
    calendars = result.list;
    if (result.calendarCreated) report.calendarsCreated.push(result.calendarCreated);
    if (result.added) {
      report.holidaysAdded.push({
        date: h.holidayDate,
        name: h.holidayName,
        target:
          mapped.applicableTo === "company_wide"
            ? `Company Wide ${year}`
            : `${mapped.state} ${year}`,
      });
    }
  }

  saveHolidayCalendars(calendars);

  // --- Week offs / shifts ---
  const sfRules = loadSfWeekOffRules().filter((r) => r.status === "active");
  for (const rule of sfRules) {
    if (rule.applicableTo === "All Sales Force" && rule.weekOffDays.length === 1 && rule.weekOffDays[0] === "Sunday") {
      report.notes.push(
        `Week-off "${rule.ruleName}" maps to Shift "Field Force Shift" (Sunday off). Assign or rely on default operational shift.`,
      );
      continue;
    }
    if (
      rule.applicableTo === "Specific Territory" &&
      rule.territory === "Gujarat West" &&
      rule.weekOffDays.includes("Sunday") &&
      rule.weekOffDays.includes("Second Saturday")
    ) {
      report.manualRequired.push(
        `Week-off "${rule.ruleName}" — Shift Setup can represent Sunday + 2nd Saturday via shift "Field Force — Sunday + 2nd Saturday", but territory-based auto-assignment is not supported. Assign that shift to covered employees manually.`,
      );
      continue;
    }
    report.manualRequired.push(
      `Week-off "${rule.ruleName}" (${rule.applicableTo}) — Manual Configuration Required in Shift Setup.`,
    );
  }

  const shiftResult = ensureFieldForceShifts(loadShifts());
  if (shiftResult.created.length) {
    saveShifts(shiftResult.list);
    report.shiftsCreated.push(...shiftResult.created);
  }

  report.notes.push(
    "Legacy stores ds_hr_sf_holidays_v1 and ds_hr_sf_weekoff_v1 were not deleted.",
  );

  const state: MigrationState = {
    version: 1,
    completedAt: new Date().toISOString(),
    report,
  };
  localStorage.setItem(ATTENDANCE_CONFIG_MIGRATION_KEY, JSON.stringify(state));

  return report;
}

/** Read last migration report without re-running. */
export function getAttendanceConfigMigrationReport(): AttendanceConfigMigrationReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ATTENDANCE_CONFIG_MIGRATION_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as MigrationState).report ?? null;
  } catch {
    return null;
  }
}
