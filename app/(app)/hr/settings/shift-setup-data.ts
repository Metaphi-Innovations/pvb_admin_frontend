/**
 * Shift Setup — complete employee work schedule master (localStorage).
 * Combines timings + weekly offs in one Shift. Weekly Off is not a separate UI master.
 */

export type ShiftStatus = "active" | "inactive";

export type ShiftDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Weekdays / all days — flexible week-occurrence offs (no hardcoded 2nd&4th presets) */
export type ShiftDayType = "working" | "off" | "selected_weeks_off";

/** Calendar week occurrence within a month (1st–5th) */
export type ShiftWeekOccurrence = 1 | 2 | 3 | 4 | 5;

export interface ShiftDayConfig {
  dayType: ShiftDayType;
  /** 24h HH:mm — used for Working Day and Selected Weeks Off (working occurrences) */
  startTime: string;
  endTime: string;
  /** Weeks that are OFF when dayType is selected_weeks_off */
  offWeeks?: ShiftWeekOccurrence[];
}

export type ShiftWeeklySchedule = Record<ShiftDayKey, ShiftDayConfig>;

export interface ShiftRecord {
  id: number;
  name: string;
  graceInMinutes: number;
  graceOutMinutes: number;
  breakDurationMinutes: number;
  weeklySchedule: ShiftWeeklySchedule;
  status: ShiftStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_hr_shift_setup_v2";
/** Legacy flat-timing store — read-only fallback if v2 empty; never deleted. */
const LEGACY_STORAGE_KEY = "ds_hr_shift_setup_v1";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const SHIFT_DAY_KEYS: ShiftDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const SHIFT_DAY_LABELS: Record<ShiftDayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const SHIFT_DAY_TYPE_OPTIONS: { value: ShiftDayType; label: string }[] = [
  { value: "working", label: "Working Day" },
  { value: "off", label: "Weekly Off" },
  { value: "selected_weeks_off", label: "Selected Weeks Off" },
];

export const SHIFT_WEEK_OPTIONS: { value: ShiftWeekOccurrence; label: string }[] = [
  { value: 1, label: "1st Week" },
  { value: 2, label: "2nd Week" },
  { value: 3, label: "3rd Week" },
  { value: 4, label: "4th Week" },
  { value: 5, label: "5th Week" },
];

const WEEK_ORDINAL: Record<ShiftWeekOccurrence, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

/** @deprecated Use SHIFT_DAY_TYPE_OPTIONS — kept for older imports */
export const WEEKDAY_DAY_TYPE_OPTIONS = SHIFT_DAY_TYPE_OPTIONS;
/** @deprecated Use SHIFT_DAY_TYPE_OPTIONS */
export const SATURDAY_DAY_TYPE_OPTIONS = SHIFT_DAY_TYPE_OPTIONS;

export function dayTypeNeedsTiming(dayType: ShiftDayType): boolean {
  return dayType === "working" || dayType === "selected_weeks_off";
}

export function normalizeOffWeeks(weeks?: number[] | null): ShiftWeekOccurrence[] {
  if (!weeks?.length) return [];
  const set = new Set<ShiftWeekOccurrence>();
  for (const w of weeks) {
    if (w === 1 || w === 2 || w === 3 || w === 4 || w === 5) set.add(w);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Compact: "2nd & 4th" or "1st, 3rd & 5th" */
export function formatOffWeeksCompact(weeks?: ShiftWeekOccurrence[] | null): string {
  const w = normalizeOffWeeks(weeks);
  if (w.length === 0) return "—";
  if (w.length === 5) return "All weeks";
  const labels = w.map((n) => WEEK_ORDINAL[n]);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

/** Human: "2nd & 4th Saturdays Off" */
export function formatOffWeeksSummary(
  day: ShiftDayKey,
  weeks?: ShiftWeekOccurrence[] | null,
): string {
  const w = normalizeOffWeeks(weeks);
  const dayWord = SHIFT_DAY_LABELS[day];
  if (w.length === 0) return "Select week offs";
  if (w.length === 5) return `All ${dayWord}s Off`;
  return `${formatOffWeeksCompact(w)} ${dayWord}s Off`;
}

export function dayTypeLabel(day: ShiftDayKey, cfg: ShiftDayConfig | ShiftDayType): string {
  const dayType = typeof cfg === "string" ? cfg : cfg.dayType;
  if (dayType === "selected_weeks_off") {
    const weeks = typeof cfg === "string" ? [] : cfg.offWeeks;
    return formatOffWeeksSummary(day, weeks);
  }
  return SHIFT_DAY_TYPE_OPTIONS.find((o) => o.value === dayType)?.label ?? dayType;
}

/** Migrate legacy hardcoded Saturday presets → selected_weeks_off */
export function migrateLegacyDayType(
  dayType: string,
  offWeeks?: number[],
): { dayType: ShiftDayType; offWeeks: ShiftWeekOccurrence[] } {
  if (dayType === "selected_weeks_off") {
    return { dayType: "selected_weeks_off", offWeeks: normalizeOffWeeks(offWeeks) };
  }
  if (dayType === "first_third_off") {
    return { dayType: "selected_weeks_off", offWeeks: [1, 3] };
  }
  if (dayType === "second_fourth_off") {
    return { dayType: "selected_weeks_off", offWeeks: [2, 4] };
  }
  if (dayType === "alternate_off") {
    return { dayType: "selected_weeks_off", offWeeks: [2, 4] };
  }
  if (dayType === "working" || dayType === "off") {
    return { dayType, offWeeks: [] };
  }
  return { dayType: "working", offWeeks: [] };
}

/** Pad / normalize to HH:mm */
export function normalizeTime24(value: string): string {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "09:30" → "09:30 AM" */
export function formatTime12(time24: string): string {
  const t = normalizeTime24(time24);
  if (!t) return "";
  const [hs, ms] = t.split(":").map(Number);
  const period = hs >= 12 ? "PM" : "AM";
  const h12 = hs % 12 === 0 ? 12 : hs % 12;
  return `${String(h12).padStart(2, "0")}:${String(ms).padStart(2, "0")} ${period}`;
}

export function parseTimeTo24(input: string): string {
  const s = input.trim();
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = Number(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (min < 0 || min > 59 || h < 1 || h > 12) return "";
    if (period === "AM") {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  return normalizeTime24(s);
}

export function formatDayTiming(day: ShiftDayConfig): string {
  if (!dayTypeNeedsTiming(day.dayType)) return "—";
  const a = formatTime12(day.startTime);
  const b = formatTime12(day.endTime);
  if (!a || !b) return "—";
  return `${a} – ${b}`;
}

export function formatMinutesLabel(mins: number): string {
  if (!Number.isFinite(mins) || mins < 0) return "—";
  return `${mins} min`;
}

export function formatGraceSummary(shift: Pick<ShiftRecord, "graceInMinutes" | "graceOutMinutes">): string {
  return `${shift.graceInMinutes}/${shift.graceOutMinutes} min`;
}

export function workingDayConfig(start: string, end: string): ShiftDayConfig {
  return { dayType: "working", startTime: start, endTime: end, offWeeks: [] };
}

export function offDayConfig(): ShiftDayConfig {
  return { dayType: "off", startTime: "", endTime: "", offWeeks: [] };
}

export function selectedWeeksOffConfig(
  start: string,
  end: string,
  offWeeks: ShiftWeekOccurrence[],
): ShiftDayConfig {
  return {
    dayType: "selected_weeks_off",
    startTime: start,
    endTime: end,
    offWeeks: normalizeOffWeeks(offWeeks),
  };
}

export function buildWeeklySchedule(partial: Partial<ShiftWeeklySchedule>): ShiftWeeklySchedule {
  const base = defaultWeeklySchedule("09:30", "18:30");
  return { ...base, ...partial };
}

export function defaultWeeklySchedule(start = "09:30", end = "18:30"): ShiftWeeklySchedule {
  return {
    monday: workingDayConfig(start, end),
    tuesday: workingDayConfig(start, end),
    wednesday: workingDayConfig(start, end),
    thursday: workingDayConfig(start, end),
    friday: workingDayConfig(start, end),
    saturday: workingDayConfig(start, end),
    sunday: offDayConfig(),
  };
}

/** Compact list summary for Schedule column */
export function formatShiftScheduleSummary(shift: Pick<ShiftRecord, "weeklySchedule">): string {
  const s = shift.weeklySchedule;
  if (!s) return "—";

  const parts: string[] = [];
  const weekdayKeys: ShiftDayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const short: Record<ShiftDayKey, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  const sameSchedule = (a: ShiftDayConfig, b: ShiftDayConfig) =>
    a.dayType === b.dayType &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    formatOffWeeksCompact(a.offWeeks) === formatOffWeeksCompact(b.offWeeks);

  let i = 0;
  while (i < weekdayKeys.length) {
    const key = weekdayKeys[i];
    const day = s[key];
    let j = i + 1;
    while (j < weekdayKeys.length && sameSchedule(day, s[weekdayKeys[j]])) j += 1;
    const range =
      j === i + 1 ? short[key] : `${short[key]}–${short[weekdayKeys[j - 1]]}`;
    if (day.dayType === "off") {
      parts.push(`${range} Off`);
    } else if (day.dayType === "selected_weeks_off") {
      parts.push(
        `${range} ${formatDayTiming(day).replace(" – ", "–")} · ${formatOffWeeksCompact(day.offWeeks)} Off`,
      );
    } else {
      parts.push(`${range} ${formatDayTiming(day).replace(" – ", "–")}`);
    }
    i = j;
  }

  const sat = s.saturday;
  if (sat.dayType === "off") {
    parts.push("Sat Off");
  } else if (sat.dayType === "working") {
    parts.push(`Sat ${formatDayTiming(sat).replace(" – ", "–")}`);
  } else if (sat.dayType === "selected_weeks_off") {
    const weeks = normalizeOffWeeks(sat.offWeeks);
    if (weeks.length === 5) {
      parts.push("Sat Off");
    } else {
      parts.push(
        `Sat ${formatDayTiming(sat).replace(" – ", "–")} · ${formatOffWeeksCompact(weeks)} Off`,
      );
    }
  }

  const sun = s.sunday;
  if (sun.dayType === "off") parts.push("Sun Off");
  else if (sun.dayType === "selected_weeks_off") {
    parts.push(
      `Sun ${formatDayTiming(sun).replace(" – ", "–")} · ${formatOffWeeksCompact(sun.offWeeks)} Off`,
    );
  } else {
    parts.push(`Sun ${formatDayTiming(sun).replace(" – ", "–")}`);
  }

  return parts.join(" · ");
}

/** @deprecated Prefer formatShiftScheduleSummary — kept for legacy timing display */
export function formatShiftTiming(shift: {
  startTime?: string;
  endTime?: string;
  weeklySchedule?: ShiftWeeklySchedule;
}): string {
  if (shift.weeklySchedule) return formatShiftScheduleSummary({ weeklySchedule: shift.weeklySchedule });
  const a = formatTime12(shift.startTime ?? "");
  const b = formatTime12(shift.endTime ?? "");
  if (!a || !b) return "—";
  return `${a} – ${b}`;
}

function withAudit(
  row: Omit<ShiftRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> &
    Partial<Pick<ShiftRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">>,
): ShiftRecord {
  const d = todayIso();
  return {
    ...row,
    createdBy: row.createdBy ?? "Admin",
    updatedBy: row.updatedBy ?? "Admin",
    createdAt: row.createdAt ?? d,
    updatedAt: row.updatedAt ?? d,
  };
}

const SEED: Omit<ShiftRecord, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt">[] = [
  {
    name: "General Shift",
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
      saturday: selectedWeeksOffConfig("09:30", "18:30", [2, 4]),
      sunday: offDayConfig(),
    },
  },
  {
    name: "Night Shift",
    graceInMinutes: 15,
    graceOutMinutes: 10,
    breakDurationMinutes: 60,
    status: "active",
    weeklySchedule: {
      monday: workingDayConfig("21:00", "06:00"),
      tuesday: workingDayConfig("21:00", "06:00"),
      wednesday: workingDayConfig("21:00", "06:00"),
      thursday: workingDayConfig("21:00", "06:00"),
      friday: workingDayConfig("21:00", "06:00"),
      saturday: workingDayConfig("21:00", "06:00"),
      sunday: offDayConfig(),
    },
  },
  {
    name: "Special Shift",
    graceInMinutes: 10,
    graceOutMinutes: 10,
    breakDurationMinutes: 45,
    status: "active",
    weeklySchedule: {
      monday: workingDayConfig("10:00", "19:00"),
      tuesday: workingDayConfig("10:00", "19:00"),
      wednesday: workingDayConfig("10:00", "19:00"),
      thursday: workingDayConfig("10:00", "19:00"),
      friday: workingDayConfig("10:00", "19:00"),
      saturday: workingDayConfig("10:00", "14:00"),
      sunday: offDayConfig(),
    },
  },
];

function seedShifts(): ShiftRecord[] {
  return SEED.map((s, i) => withAudit({ id: i + 1, ...s }));
}

/** Normalize legacy flat start/end into weekly schedule without wiping store. */
function normalizeShiftRecord(raw: Record<string, unknown>): ShiftRecord {
  const legacyStart = typeof raw.startTime === "string" ? normalizeTime24(raw.startTime) : "";
  const legacyEnd = typeof raw.endTime === "string" ? normalizeTime24(raw.endTime) : "";
  let weeklySchedule = raw.weeklySchedule as ShiftWeeklySchedule | undefined;
  if (!weeklySchedule || typeof weeklySchedule !== "object") {
    const start = legacyStart || "09:30";
    const end = legacyEnd || "18:30";
    weeklySchedule = defaultWeeklySchedule(start, end);
  } else {
    weeklySchedule = buildWeeklySchedule(
      Object.fromEntries(
        SHIFT_DAY_KEYS.map((k) => {
          const d = (weeklySchedule as ShiftWeeklySchedule)[k] as ShiftDayConfig & {
            dayType: string;
          };
          if (!d) return [k, offDayConfig()];
          const migrated = migrateLegacyDayType(String(d.dayType), d.offWeeks);
          if (migrated.dayType === "off") {
            return [k, offDayConfig()];
          }
          if (migrated.dayType === "selected_weeks_off") {
            return [
              k,
              selectedWeeksOffConfig(
                normalizeTime24(d.startTime || "") || d.startTime || "09:30",
                normalizeTime24(d.endTime || "") || d.endTime || "18:30",
                migrated.offWeeks,
              ),
            ];
          }
          return [
            k,
            workingDayConfig(
              normalizeTime24(d.startTime || "") || d.startTime || "09:30",
              normalizeTime24(d.endTime || "") || d.endTime || "18:30",
            ),
          ];
        }),
      ) as Partial<ShiftWeeklySchedule>,
    );
  }

  return withAudit({
    id: Number(raw.id) || 0,
    name: String(raw.name ?? ""),
    graceInMinutes: Number(raw.graceInMinutes) || 0,
    graceOutMinutes: Number(raw.graceOutMinutes) || 0,
    breakDurationMinutes: Number(raw.breakDurationMinutes) || 0,
    weeklySchedule,
    status: raw.status === "inactive" ? "inactive" : "active",
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : undefined,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  });
}

export function loadShifts(): ShiftRecord[] {
  if (typeof window === "undefined") return seedShifts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Prefer fresh consolidated seed. Do not wipe legacy v1 or weekly-off stores.
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw) as Record<string, unknown>[];
          if (Array.isArray(legacy) && legacy.length > 0) {
            const normalized = legacy.map((r) => normalizeShiftRecord(r));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            return normalized;
          }
        } catch {
          /* fall through to seed */
        }
      }
      const seed = seedShifts();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = seedShifts();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed.map((r) => normalizeShiftRecord(r));
  } catch {
    return seedShifts();
  }
}

export function saveShifts(list: ShiftRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextShiftId(list: ShiftRecord[]): number {
  return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
}

export function withShiftNewAudit(
  row: Omit<ShiftRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
): ShiftRecord {
  return withAudit(row);
}

export function withShiftUpdateAudit(row: ShiftRecord): ShiftRecord {
  return {
    ...row,
    updatedBy: "Admin",
    updatedAt: todayIso(),
  };
}

export function getActiveShifts(list?: ShiftRecord[]): ShiftRecord[] {
  return (list ?? loadShifts()).filter((s) => s.status === "active");
}

export function normalizeShiftName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function applyTimingToWorkingDays(
  schedule: ShiftWeeklySchedule,
  startTime: string,
  endTime: string,
): ShiftWeeklySchedule {
  const next = { ...schedule };
  for (const key of SHIFT_DAY_KEYS) {
    // Working Day + Selected Weeks Off (still have working occurrences)
    if (dayTypeNeedsTiming(next[key].dayType)) {
      next[key] = { ...next[key], startTime, endTime };
    }
  }
  return next;
}

/**
 * Count employees assigned to a shift.
 * Source: profileSummaries.attendance.shift / shiftId (demo/local) — not a live API.
 */
export function countEmployeesOnShift(
  shift: Pick<ShiftRecord, "id" | "name">,
  employees: { profileSummaries?: { attendance?: { shift?: string; shiftId?: number } } }[],
): number {
  const nameKey = normalizeShiftName(shift.name);
  return employees.filter((e) => {
    const att = e.profileSummaries?.attendance;
    if (!att) return false;
    if (typeof att.shiftId === "number" && att.shiftId === shift.id) return true;
    const raw = (att.shift ?? "").trim();
    if (!raw) return false;
    return normalizeShiftName(raw) === nameKey;
  }).length;
}

/** Resolve Assigned Shift label (includes compact schedule). */
export function resolveEmployeeShiftLabel(
  attendance?: { shift?: string; shiftId?: number } | null,
  shifts?: ShiftRecord[],
): string {
  if (!attendance) return "—";
  const list = shifts ?? (typeof window !== "undefined" ? loadShifts() : []);
  const hit =
    (typeof attendance.shiftId === "number"
      ? list.find((s) => s.id === attendance.shiftId)
      : undefined) ??
    list.find(
      (s) =>
        normalizeShiftName(s.name) === normalizeShiftName((attendance.shift ?? "").trim()),
    );
  if (hit) return `${hit.name}`;
  return (attendance.shift ?? "").trim() || "—";
}

/** Derive weekly-off summary from assigned shift (replaces separate Weekly Off master). */
export function resolveEmployeeScheduleFromShift(
  attendance?: { shift?: string; shiftId?: number } | null,
  shifts?: ShiftRecord[],
): string {
  if (!attendance) return "—";
  const list = shifts ?? (typeof window !== "undefined" ? loadShifts() : []);
  const hit =
    (typeof attendance.shiftId === "number"
      ? list.find((s) => s.id === attendance.shiftId)
      : undefined) ??
    list.find(
      (s) =>
        normalizeShiftName(s.name) === normalizeShiftName((attendance.shift ?? "").trim()),
    );
  if (!hit) return "—";
  return formatShiftScheduleSummary(hit);
}

const JS_DAY_TO_SHIFT_KEY: ShiftDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** 1st–5th occurrence of this weekday within the calendar month (1-based). */
export function weekOccurrenceInMonth(dateIso: string): ShiftWeekOccurrence {
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  const n = Math.ceil(d.getDate() / 7) as ShiftWeekOccurrence;
  return n >= 1 && n <= 5 ? n : 5;
}

/** Whether the shift treats this calendar date as a weekly off. */
export function isShiftWeeklyOffOnDate(shift: ShiftRecord, dateIso: string): boolean {
  const date = dateIso.slice(0, 10);
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const dayKey = JS_DAY_TO_SHIFT_KEY[d.getDay()];
  const cfg = shift.weeklySchedule[dayKey];
  if (!cfg) return false;
  if (cfg.dayType === "off") return true;
  if (cfg.dayType === "selected_weeks_off") {
    const weeks = normalizeOffWeeks(cfg.offWeeks);
    return weeks.includes(weekOccurrenceInMonth(date));
  }
  return false;
}

/** Resolve assigned Shift record from profile attendance summary. */
export function getAssignedShiftForEmployee(
  attendance?: { shift?: string; shiftId?: number } | null,
  shifts?: ShiftRecord[],
): ShiftRecord | null {
  if (!attendance) return null;
  const list = shifts ?? (typeof window !== "undefined" ? loadShifts() : getActiveShifts());
  if (typeof attendance.shiftId === "number") {
    const byId = list.find((s) => s.id === attendance.shiftId);
    if (byId) return byId;
  }
  const name = (attendance.shift ?? "").trim();
  if (!name) return null;
  return (
    list.find((s) => normalizeShiftName(s.name) === normalizeShiftName(name)) ?? null
  );
}

/**
 * Prefer active "Field Force" / "Sales Force" shifts for unassigned field staff,
 * else General Shift, else first active shift.
 */
export function getDefaultOperationalShift(shifts?: ShiftRecord[]): ShiftRecord | null {
  const list = getActiveShifts(shifts ?? (typeof window !== "undefined" ? loadShifts() : undefined));
  if (!list.length) return null;
  const preferred = list.find((s) => {
    const n = normalizeShiftName(s.name);
    return n.includes("field force") || n.includes("sales force");
  });
  if (preferred) return preferred;
  return list.find((s) => normalizeShiftName(s.name) === "general shift") ?? list[0];
}
