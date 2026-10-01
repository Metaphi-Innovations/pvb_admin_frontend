/**
 * Weekly Off — Attendance Settings master (localStorage).
 * Recurring weekly off patterns for employee assignment.
 */

export type WeeklyOffStatus = "active" | "inactive";

export type WeeklyOffPatternId =
  | "sunday"
  | "sat_sun"
  | "second_fourth_sat_sun"
  | "first_third_sat_sun"
  | "alternate_sat_sun"
  | "custom";

export type WeekdayOffMode = "working" | "off";
/** Saturday custom modes — working or which Saturdays are off */
export type SaturdayOffMode = "working" | "all" | "1st" | "2nd" | "3rd" | "4th" | "5th";

export interface CustomWeeklyOffConfig {
  monday: WeekdayOffMode;
  tuesday: WeekdayOffMode;
  wednesday: WeekdayOffMode;
  thursday: WeekdayOffMode;
  friday: WeekdayOffMode;
  saturday: SaturdayOffMode;
  sunday: WeekdayOffMode;
}

export interface WeeklyOffRecord {
  id: number;
  name: string;
  patternId: WeeklyOffPatternId;
  customConfig: CustomWeeklyOffConfig | null;
  status: WeeklyOffStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_hr_weekly_off_v1";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const WEEKLY_OFF_PATTERN_OPTIONS: {
  value: WeeklyOffPatternId;
  label: string;
}[] = [
  { value: "sunday", label: "Sunday" },
  { value: "sat_sun", label: "Saturday & Sunday" },
  { value: "second_fourth_sat_sun", label: "2nd & 4th Saturday + Sunday" },
  { value: "first_third_sat_sun", label: "1st & 3rd Saturday + Sunday" },
  { value: "alternate_sat_sun", label: "Alternate Saturday + Sunday" },
  { value: "custom", label: "Custom" },
];

export const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const SATURDAY_OFF_OPTIONS: { value: SaturdayOffMode; label: string }[] = [
  { value: "working", label: "Working Day" },
  { value: "all", label: "All Saturdays" },
  { value: "1st", label: "1st Saturday" },
  { value: "2nd", label: "2nd Saturday" },
  { value: "3rd", label: "3rd Saturday" },
  { value: "4th", label: "4th Saturday" },
  { value: "5th", label: "5th Saturday" },
];

export function defaultCustomConfig(): CustomWeeklyOffConfig {
  return {
    monday: "working",
    tuesday: "working",
    wednesday: "working",
    thursday: "working",
    friday: "working",
    saturday: "working",
    sunday: "off",
  };
}

export function formatWeeklyOffPatternLabel(
  record: Pick<WeeklyOffRecord, "patternId" | "customConfig">,
): string {
  if (record.patternId !== "custom") {
    return WEEKLY_OFF_PATTERN_OPTIONS.find((o) => o.value === record.patternId)?.label ?? "—";
  }
  const c = record.customConfig ?? defaultCustomConfig();
  const parts: string[] = [];
  (["monday", "tuesday", "wednesday", "thursday", "friday"] as const).forEach((d) => {
    if (c[d] === "off") parts.push(WEEKDAY_LABELS[d]);
  });
  if (c.saturday !== "working") {
    const sat = SATURDAY_OFF_OPTIONS.find((o) => o.value === c.saturday)?.label ?? "Saturday";
    parts.push(sat);
  }
  if (c.sunday === "off") parts.push("Sunday");
  return parts.length ? parts.join(", ") : "Custom (all working)";
}

function withAudit(
  row: Omit<WeeklyOffRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> &
    Partial<Pick<WeeklyOffRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">>,
): WeeklyOffRecord {
  const d = todayIso();
  return {
    ...row,
    createdBy: row.createdBy ?? "Admin",
    updatedBy: row.updatedBy ?? "Admin",
    createdAt: row.createdAt ?? d,
    updatedAt: row.updatedAt ?? d,
  };
}

const SEED: Omit<
  WeeklyOffRecord,
  "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
>[] = [
  {
    name: "Sunday Off",
    patternId: "sunday",
    customConfig: null,
    status: "active",
  },
  {
    name: "Saturday + Sunday Off",
    patternId: "sat_sun",
    customConfig: null,
    status: "active",
  },
  {
    name: "Standard Office Week Off",
    patternId: "second_fourth_sat_sun",
    customConfig: null,
    status: "active",
  },
  {
    name: "Alternate Saturday + Sunday",
    patternId: "alternate_sat_sun",
    customConfig: null,
    status: "active",
  },
];

function seedWeeklyOffs(): WeeklyOffRecord[] {
  return SEED.map((s, i) => withAudit({ id: i + 1, ...s }));
}

export function loadWeeklyOffs(): WeeklyOffRecord[] {
  if (typeof window === "undefined") return seedWeeklyOffs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedWeeklyOffs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as WeeklyOffRecord[];
    if (!Array.isArray(parsed)) return seedWeeklyOffs();
    return parsed.map((r) => ({
      ...r,
      patternId: (WEEKLY_OFF_PATTERN_OPTIONS.some((o) => o.value === r.patternId)
        ? r.patternId
        : "sunday") as WeeklyOffPatternId,
      customConfig:
        r.patternId === "custom"
          ? { ...defaultCustomConfig(), ...(r.customConfig ?? {}) }
          : null,
      status: r.status === "inactive" ? "inactive" : "active",
    }));
  } catch {
    return seedWeeklyOffs();
  }
}

export function saveWeeklyOffs(list: WeeklyOffRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function nextWeeklyOffId(list: WeeklyOffRecord[]): number {
  return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
}

export function withWeeklyOffNewAudit(
  row: Omit<WeeklyOffRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
): WeeklyOffRecord {
  return withAudit(row);
}

export function withWeeklyOffUpdateAudit(row: WeeklyOffRecord): WeeklyOffRecord {
  return { ...row, updatedBy: "Admin", updatedAt: todayIso() };
}

export function getActiveWeeklyOffs(list?: WeeklyOffRecord[]): WeeklyOffRecord[] {
  return (list ?? loadWeeklyOffs()).filter((r) => r.status === "active");
}

export function normalizeWeeklyOffName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Count employees assigned to a weekly off pattern.
 * Source: `HrEmployee.profileSummaries.attendance.weeklyOff` (demo/profile summary)
 * matched by name or pattern label — not a live assignment API.
 */
export function countEmployeesOnWeeklyOff(
  record: Pick<WeeklyOffRecord, "id" | "name" | "patternId" | "customConfig">,
  employees: {
    profileSummaries?: { attendance?: { weeklyOff?: string; weeklyOffId?: number } };
  }[],
): number {
  const nameKey = normalizeWeeklyOffName(record.name);
  const patternLabel = formatWeeklyOffPatternLabel(record);
  return employees.filter((e) => {
    const att = e.profileSummaries?.attendance;
    if (!att) return false;
    if (typeof att.weeklyOffId === "number" && att.weeklyOffId === record.id) return true;
    const raw = (att.weeklyOff ?? "").trim();
    if (!raw) return false;
    if (normalizeWeeklyOffName(raw) === nameKey) return true;
    if (normalizeWeeklyOffName(raw) === normalizeWeeklyOffName(patternLabel)) return true;
    // Legacy demo: "Sunday" → Sunday Off
    if (record.patternId === "sunday" && normalizeWeeklyOffName(raw) === "sunday") return true;
    return false;
  }).length;
}

export function resolveEmployeeWeeklyOffLabel(
  attendance?: { weeklyOff?: string; weeklyOffId?: number } | null,
  list?: WeeklyOffRecord[],
): string {
  if (!attendance) return "—";
  const records = list ?? (typeof window !== "undefined" ? loadWeeklyOffs() : []);
  if (typeof attendance.weeklyOffId === "number") {
    const hit = records.find((r) => r.id === attendance.weeklyOffId);
    if (hit) return `${hit.name} (${formatWeeklyOffPatternLabel(hit)})`;
  }
  const raw = (attendance.weeklyOff ?? "").trim();
  if (!raw) return "—";
  const byName = records.find(
    (r) => normalizeWeeklyOffName(r.name) === normalizeWeeklyOffName(raw),
  );
  if (byName) return `${byName.name} (${formatWeeklyOffPatternLabel(byName)})`;
  const byPattern = records.find(
    (r) =>
      normalizeWeeklyOffName(formatWeeklyOffPatternLabel(r)) === normalizeWeeklyOffName(raw),
  );
  if (byPattern) return `${byPattern.name} (${formatWeeklyOffPatternLabel(byPattern)})`;
  if (normalizeWeeklyOffName(raw) === "sunday") {
    const sun = records.find((r) => r.patternId === "sunday");
    if (sun) return `${sun.name} (${formatWeeklyOffPatternLabel(sun)})`;
  }
  return raw;
}
