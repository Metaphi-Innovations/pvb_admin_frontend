/**
 * Holiday Calendar — Attendance Settings master (localStorage v2).
 *
 * Structure: Year → Holiday Calendar (scope) → Holiday rows
 *
 * Holiday Type on each row:
 * - public   → Public Holiday (auto non-working; no employee application)
 * - optional → Optional Holiday (employee may apply; entitlement via Leave Policy)
 *
 * Employee resolution intent (future — not implemented here):
 * 1. Resolve employee → Branch → State
 * 2. Match Branch calendar, then State calendar, plus Company Wide calendars for that year
 * 3. Company-wide public holidays always apply alongside state/branch calendars
 * 4. Optional holidays = eligible dates only; entitlement count lives in Leave Policy
 *
 * Does NOT implement leave deduction / approval workflow or calendar merge engine.
 */

import { loadBranches } from "./organization-data";

export type HolidayCalendarStatus = "active" | "inactive";

/** Only these two types — no National/Regional/Festival/Company/Other. */
export type HolidayTypeId = "public" | "optional";

export type HolidayApplicableTo = "company_wide" | "state" | "branch";

export interface HolidayRow {
  id: number;
  name: string;
  /** ISO yyyy-mm-dd — year should match parent calendar year */
  date: string;
  holidayType: HolidayTypeId;
}

export interface HolidayCalendarRecord {
  id: number;
  name: string;
  year: number;
  applicableTo: HolidayApplicableTo;
  /** Set when applicableTo === "state" */
  state: string;
  /** Set when applicableTo === "branch" */
  branchId: number | null;
  /** Denormalized branch label for listing/export */
  branchName: string;
  status: HolidayCalendarStatus;
  holidays: HolidayRow[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_hr_holiday_calendar_v2";
const LEGACY_STORAGE_KEY = "ds_hr_holiday_calendar_v1";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentCalendarYear(): number {
  return new Date().getFullYear();
}

export const HOLIDAY_TYPE_OPTIONS: {
  value: HolidayTypeId;
  label: string;
  helper: string;
}[] = [
  {
    value: "public",
    label: "Public Holiday",
    helper:
      "Observed closed for covered employees. Applied automatically — no leave request required.",
  },
  {
    value: "optional",
    label: "Optional Holiday",
    helper:
      "Employee may choose to avail via leave/request flow. Entitlement limit is set in Leave Settings.",
  },
];

export const APPLICABLE_TO_OPTIONS: {
  value: HolidayApplicableTo;
  label: string;
}[] = [
  { value: "company_wide", label: "Company Wide" },
  { value: "state", label: "State" },
  { value: "branch", label: "Branch" },
];

export function holidayTypeLabel(type: HolidayTypeId): string {
  return HOLIDAY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function holidayTypeHelper(type: HolidayTypeId): string {
  return HOLIDAY_TYPE_OPTIONS.find((o) => o.value === type)?.helper ?? "";
}

export function applicableToLabel(scope: HolidayApplicableTo): string {
  return APPLICABLE_TO_OPTIONS.find((o) => o.value === scope)?.label ?? scope;
}

function withAudit(
  row: Omit<HolidayCalendarRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> &
    Partial<Pick<HolidayCalendarRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">>,
): HolidayCalendarRecord {
  const d = todayIso();
  return {
    ...row,
    createdBy: row.createdBy ?? "Admin",
    updatedBy: row.updatedBy ?? "Admin",
    createdAt: row.createdAt ?? d,
    updatedAt: row.updatedAt ?? d,
  };
}

function normalizeHolidayType(raw: unknown): HolidayTypeId {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "optional" || s === "optional holiday") return "optional";
  return "public";
}

function normalizeHolidayRow(raw: Record<string, unknown>, index: number): HolidayRow {
  return {
    id: Number(raw.id) || index + 1,
    name: String(raw.name ?? ""),
    date: String(raw.date ?? "").slice(0, 10),
    holidayType: normalizeHolidayType(raw.holidayType),
  };
}

function normalizeCalendar(raw: Record<string, unknown>, index: number): HolidayCalendarRecord {
  const applicableRaw = String(raw.applicableTo ?? "company_wide").toLowerCase();
  let applicableTo: HolidayApplicableTo = "company_wide";
  if (applicableRaw === "state") applicableTo = "state";
  else if (applicableRaw === "branch") applicableTo = "branch";

  const holidaysRaw = Array.isArray(raw.holidays) ? raw.holidays : [];
  const holidays = holidaysRaw.map((h, i) =>
    normalizeHolidayRow(h as Record<string, unknown>, i),
  );

  return withAudit({
    id: Number(raw.id) || index + 1,
    name: String(raw.name ?? ""),
    year: Number(raw.year) || currentCalendarYear(),
    applicableTo,
    state: applicableTo === "state" ? String(raw.state ?? "") : "",
    branchId:
      applicableTo === "branch" && raw.branchId != null ? Number(raw.branchId) : null,
    branchName: applicableTo === "branch" ? String(raw.branchName ?? "") : "",
    status: raw.status === "inactive" ? "inactive" : "active",
    holidays,
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : undefined,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  });
}

function holidayRows(
  rows: Omit<HolidayRow, "id">[],
  startId = 1,
): HolidayRow[] {
  return rows.map((r, i) => ({ id: startId + i, ...r }));
}

function seedCalendars(): HolidayCalendarRecord[] {
  return [
    withAudit({
      id: 1,
      name: "Company Wide Holiday Calendar 2025",
      year: 2025,
      applicableTo: "company_wide",
      state: "",
      branchId: null,
      branchName: "",
      status: "active",
      holidays: holidayRows([
        { name: "Republic Day", date: "2025-01-26", holidayType: "public" },
        { name: "Independence Day", date: "2025-08-15", holidayType: "public" },
        { name: "Diwali", date: "2025-10-20", holidayType: "public" },
      ]),
    }),
    withAudit({
      id: 2,
      name: "Maharashtra Holiday Calendar 2025",
      year: 2025,
      applicableTo: "state",
      state: "Maharashtra",
      branchId: null,
      branchName: "",
      status: "active",
      holidays: holidayRows([
        { name: "Gudi Padwa", date: "2025-03-30", holidayType: "optional" },
      ]),
    }),
    withAudit({
      id: 3,
      name: "Company Wide Holiday Calendar 2026",
      year: 2026,
      applicableTo: "company_wide",
      state: "",
      branchId: null,
      branchName: "",
      status: "active",
      holidays: holidayRows([
        { name: "Republic Day", date: "2026-01-26", holidayType: "public" },
        { name: "Independence Day", date: "2026-08-15", holidayType: "public" },
        { name: "Diwali", date: "2026-11-08", holidayType: "public" },
      ]),
    }),
    withAudit({
      id: 4,
      name: "Maharashtra Holiday Calendar 2026",
      year: 2026,
      applicableTo: "state",
      state: "Maharashtra",
      branchId: null,
      branchName: "",
      status: "active",
      holidays: holidayRows([
        { name: "Gudi Padwa", date: "2026-03-19", holidayType: "optional" },
        { name: "Raksha Bandhan", date: "2026-08-28", holidayType: "optional" },
        { name: "Ganesh Chaturthi", date: "2026-09-14", holidayType: "public" },
      ]),
    }),
    withAudit({
      id: 5,
      name: "Gujarat Holiday Calendar 2026",
      year: 2026,
      applicableTo: "state",
      state: "Gujarat",
      branchId: null,
      branchName: "",
      status: "active",
      holidays: holidayRows([
        { name: "Uttarayan", date: "2026-01-14", holidayType: "public" },
        { name: "Navratri", date: "2026-10-19", holidayType: "optional" },
      ]),
    }),
    withAudit({
      id: 6,
      name: "Delhi Holiday Calendar 2026",
      year: 2026,
      applicableTo: "state",
      state: "Delhi",
      branchId: null,
      branchName: "",
      status: "active",
      holidays: holidayRows([
        { name: "Delhi Day", date: "2026-12-25", holidayType: "optional" },
      ]),
    }),
  ];
}

function migrateFromLegacyV1(): HolidayCalendarRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const year = currentCalendarYear();
    const holidays = parsed.map((r, i) =>
      normalizeHolidayRow(r, i),
    );

    return [
      withAudit({
        id: 1,
        name: `Company Wide Holiday Calendar ${year}`,
        year,
        applicableTo: "company_wide",
        state: "",
        branchId: null,
        branchName: "",
        status: "active",
        holidays,
      }),
    ];
  } catch {
    return null;
  }
}

export function loadHolidayCalendars(): HolidayCalendarRecord[] {
  if (typeof window === "undefined") return seedCalendars();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateFromLegacyV1();
      const seed = migrated ?? seedCalendars();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = seedCalendars();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed.map((r, i) => normalizeCalendar(r, i));
  } catch {
    return seedCalendars();
  }
}

export function saveHolidayCalendars(list: HolidayCalendarRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextCalendarId(list: HolidayCalendarRecord[]): number {
  return list.length ? Math.max(...list.map((c) => c.id)) + 1 : 1;
}

export function nextHolidayRowId(holidays: HolidayRow[]): number {
  return holidays.length ? Math.max(...holidays.map((h) => h.id)) + 1 : 1;
}

export function withCalendarNewAudit(
  row: Omit<HolidayCalendarRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
): HolidayCalendarRecord {
  return withAudit(row);
}

export function withCalendarUpdateAudit(row: HolidayCalendarRecord): HolidayCalendarRecord {
  return { ...row, updatedBy: "Admin", updatedAt: todayIso() };
}

export function normalizeHolidayName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCalendarsForYear(
  year: number,
  list?: HolidayCalendarRecord[],
): HolidayCalendarRecord[] {
  return (list ?? loadHolidayCalendars()).filter((c) => c.year === year);
}

export function getAvailableYears(list?: HolidayCalendarRecord[]): number[] {
  const all = list ?? loadHolidayCalendars();
  const fromData = new Set(all.map((c) => c.year));
  const current = currentCalendarYear();
  for (let y = current - 5; y <= current + 3; y += 1) fromData.add(y);
  return [...fromData].sort((a, b) => b - a);
}

export function getCalendarLocationLabel(calendar: HolidayCalendarRecord): string {
  if (calendar.applicableTo === "company_wide") return "—";
  if (calendar.applicableTo === "state") return calendar.state || "—";
  return calendar.branchName || "—";
}

export function countHolidayTypes(holidays: HolidayRow[]): {
  public: number;
  optional: number;
} {
  return {
    public: holidays.filter((h) => h.holidayType === "public").length,
    optional: holidays.filter((h) => h.holidayType === "optional").length,
  };
}

/** States for searchable selector — active branches + demo states used in examples. */
export function getHolidayStateOptions(): string[] {
  const fromBranches = loadBranches()
    .filter((b) => b.status === "active")
    .map((b) => b.state.trim())
    .filter(Boolean);
  const demo = ["Maharashtra", "Gujarat", "Delhi", "Karnataka", "Uttarakhand"];
  return [...new Set([...fromBranches, ...demo])].sort((a, b) => a.localeCompare(b));
}

export function getActiveBranchOptions(): { id: number; name: string; state: string }[] {
  return loadBranches()
    .filter((b) => b.status === "active")
    .map((b) => ({ id: b.id, name: b.name, state: b.state }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function calendarScopeKey(calendar: Pick<
  HolidayCalendarRecord,
  "year" | "applicableTo" | "state" | "branchId"
>): string {
  if (calendar.applicableTo === "company_wide") return `${calendar.year}:company_wide`;
  if (calendar.applicableTo === "state") return `${calendar.year}:state:${calendar.state.trim().toLowerCase()}`;
  return `${calendar.year}:branch:${calendar.branchId ?? 0}`;
}

export function findDuplicateCalendarScope(
  calendars: HolidayCalendarRecord[],
  candidate: Pick<HolidayCalendarRecord, "id" | "year" | "applicableTo" | "state" | "branchId">,
): HolidayCalendarRecord | undefined {
  const key = calendarScopeKey(candidate);
  return calendars.find(
    (c) => c.id !== candidate.id && calendarScopeKey(c) === key,
  );
}

/** Preserve month/day; adjust year. Handles Feb 29 → Feb 28 on non-leap years. */
export function shiftHolidayDateToYear(isoDate: string, targetYear: number): string {
  const d = isoDate.slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return `${targetYear}-01-01`;
  const month = m[2];
  const day = m[3];
  if (month === "02" && day === "29") {
    const isLeap =
      (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
    if (!isLeap) return `${targetYear}-02-28`;
  }
  return `${targetYear}-${month}-${day}`;
}

export function defaultCopiedCalendarName(
  source: HolidayCalendarRecord,
  targetYear: number,
): string {
  const base = source.name.replace(/\s+\d{4}\s*$/, "").trim();
  return `${base} ${targetYear}`;
}

/**
 * Build an editable draft calendar from a source — NOT persisted until HR saves.
 * Dates are shifted to target year (month/day preserved); status starts inactive.
 */
export function buildCopiedCalendarDraft(
  source: HolidayCalendarRecord,
  targetYear: number,
  nextId: number,
  targetName?: string,
): HolidayCalendarRecord {
  const holidays = source.holidays.map((h, i) => ({
    id: i + 1,
    name: h.name,
    date: shiftHolidayDateToYear(h.date, targetYear),
    holidayType: h.holidayType,
  }));

  return withCalendarNewAudit({
    id: nextId,
    name: (targetName ?? defaultCopiedCalendarName(source, targetYear)).trim(),
    year: targetYear,
    applicableTo: source.applicableTo,
    state: source.state,
    branchId: source.branchId,
    branchName: source.branchName,
    status: "inactive",
    holidays,
  });
}

export function isDateInCalendarYear(isoDate: string, calendarYear: number): boolean {
  return Number(isoDate.slice(0, 4)) === calendarYear;
}

/** Active public holidays across all active calendars for a year (flat — no merge engine). */
export function getActivePublicHolidaysForYear(
  year: number,
  list?: HolidayCalendarRecord[],
): HolidayRow[] {
  return getCalendarsForYear(year, list)
    .filter((c) => c.status === "active")
    .flatMap((c) => c.holidays.filter((h) => h.holidayType === "public"));
}

/** Active optional holiday dates across all active calendars for a year (flat). */
export function getActiveOptionalHolidaysForYear(
  year: number,
  list?: HolidayCalendarRecord[],
): HolidayRow[] {
  return getCalendarsForYear(year, list)
    .filter((c) => c.status === "active")
    .flatMap((c) => c.holidays.filter((h) => h.holidayType === "optional"));
}
