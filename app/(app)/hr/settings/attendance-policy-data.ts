/**
 * Attendance Policy — reusable master (localStorage).
 *
 * Shift Setup = when the employee should work.
 * Attendance Policy = how attendance is interpreted.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { policyToday } from "@/lib/hr/policy-common";
import { loadHrEmployees, type HrEmployee } from "../employees/employee-master-data";

const STORAGE_KEY = "ds_hr_attendance_policies_v3";
const SINGLETON_KEY = "ds_hr_attendance_policy_settings_v2";
const LEGACY_LIST_KEY = "ds_hr_attendance_policies_v1";

export type AttendancePolicyStatus = "active" | "inactive";
export type AfterAllowedLimit = "half_day" | "absent" | "hr_review";

export interface AttendancePolicyRecord {
  id: number;
  name: string;
  trackLateComing: boolean;
  allowedLateEntriesPerMonth: number;
  afterAllowedLimit: AfterAllowedLimit;
  trackEarlyGoing: boolean;
  halfDayHours: number;
  halfDayMinutes: number;
  absentHours: number;
  absentMinutes: number;
  overtimeEnabled: boolean;
  overtimeAfterMinutes: number;
  isDefault: boolean;
  status: AttendancePolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const AFTER_ALLOWED_LIMIT_OPTIONS: {
  value: AfterAllowedLimit;
  label: string;
}[] = [
  { value: "half_day", label: "Mark Half Day" },
  { value: "absent", label: "Mark Absent" },
  { value: "hr_review", label: "Flag for HR Review" },
];

function todayIso(): string {
  return policyToday();
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function normalizeAfterAllowedLimit(raw: unknown): AfterAllowedLimit {
  if (raw === "absent") return "absent";
  if (raw === "hr_review") return "hr_review";
  return "half_day";
}

function readAllowedLateEntries(raw: Record<string, unknown>): number {
  const v = raw.allowedLateEntriesPerMonth ?? raw.allowedLateDaysPerMonth ?? 2;
  return Math.max(0, Number(v) || 0);
}

function normalizeRuleFields(raw: Record<string, unknown>) {
  return {
    trackLateComing:
      raw.trackLateComing !== undefined
        ? raw.trackLateComing !== false
        : raw.lateComingEnabled !== false,
    allowedLateEntriesPerMonth: readAllowedLateEntries(raw),
    afterAllowedLimit: normalizeAfterAllowedLimit(
      raw.afterAllowedLimit ?? raw.repeatLateConsequence,
    ),
    trackEarlyGoing:
      raw.trackEarlyGoing !== undefined
        ? raw.trackEarlyGoing !== false
        : raw.earlyGoingEnabled !== false,
    halfDayHours: Math.max(0, Number(raw.halfDayHours) || 0),
    halfDayMinutes: Math.min(59, Math.max(0, Number(raw.halfDayMinutes) || 0)),
    absentHours: Math.max(0, Number(raw.absentHours) || 0),
    absentMinutes: Math.min(59, Math.max(0, Number(raw.absentMinutes) || 0)),
    overtimeEnabled: raw.overtimeEnabled !== false,
    overtimeAfterMinutes: Math.max(0, Number(raw.overtimeAfterMinutes) || 0),
  };
}

function normalizeRecord(raw: Record<string, unknown>, index: number): AttendancePolicyRecord {
  const rules = normalizeRuleFields(raw);
  const status: AttendancePolicyStatus = raw.status === "inactive" ? "inactive" : "active";
  return {
    id: typeof raw.id === "number" ? raw.id : index + 1,
    name: typeof raw.name === "string" ? raw.name.trim() : `Attendance Policy ${index + 1}`,
    ...rules,
    isDefault: raw.isDefault === true || raw.isDefault === "true",
    status,
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : todayIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : todayIso(),
  };
}

function seedPolicies(): AttendancePolicyRecord[] {
  const base = todayIso();
  return [
    {
      id: 1,
      name: "Standard Attendance Policy",
      trackLateComing: true,
      allowedLateEntriesPerMonth: 2,
      afterAllowedLimit: "half_day",
      trackEarlyGoing: true,
      halfDayHours: 4,
      halfDayMinutes: 30,
      absentHours: 2,
      absentMinutes: 0,
      overtimeEnabled: true,
      overtimeAfterMinutes: 30,
      isDefault: true,
      status: "active",
      createdBy: CURRENT_USER,
      updatedBy: CURRENT_USER,
      createdAt: base,
      updatedAt: base,
    },
    {
      id: 2,
      name: "Field Staff Attendance Policy",
      trackLateComing: true,
      allowedLateEntriesPerMonth: 4,
      afterAllowedLimit: "hr_review",
      trackEarlyGoing: true,
      halfDayHours: 4,
      halfDayMinutes: 0,
      absentHours: 1,
      absentMinutes: 30,
      overtimeEnabled: false,
      overtimeAfterMinutes: 30,
      isDefault: false,
      status: "active",
      createdBy: CURRENT_USER,
      updatedBy: CURRENT_USER,
      createdAt: base,
      updatedAt: base,
    },
  ];
}

function migrateSingleton(): AttendancePolicyRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SINGLETON_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rules = normalizeRuleFields(parsed);
    const base = todayIso();
    return [
      {
        id: 1,
        name: "Standard Attendance Policy",
        ...rules,
        isDefault: true,
        status: "active",
        createdBy: typeof parsed.updatedBy === "string" ? parsed.updatedBy : CURRENT_USER,
        updatedBy: typeof parsed.updatedBy === "string" ? parsed.updatedBy : CURRENT_USER,
        createdAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : base,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : base,
      },
    ];
  } catch {
    return null;
  }
}

function migrateLegacyList(): AttendancePolicyRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY_LIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((p, i) => normalizeRecord(p, i));
  } catch {
    return null;
  }
}

function ensureDefaultPolicy(list: AttendancePolicyRecord[]): AttendancePolicyRecord[] {
  if (list.length === 0) return list;
  const active = list.filter((p) => p.status === "active");
  if (active.length === 0) return list;
  const defaults = active.filter((p) => p.isDefault);
  if (defaults.length === 1) return list;
  if (defaults.length === 0) {
    const firstActive = active[0]!;
    return list.map((p) => ({ ...p, isDefault: p.id === firstActive.id }));
  }
  const keep = defaults[0]!.id;
  return list.map((p) => ({ ...p, isDefault: p.id === keep }));
}

export function loadAttendancePolicies(): AttendancePolicyRecord[] {
  if (typeof window === "undefined") return seedPolicies();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated =
        migrateSingleton() ?? migrateLegacyList() ?? seedPolicies();
      const normalized = ensureDefaultPolicy(migrated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const migrated =
        migrateSingleton() ?? migrateLegacyList() ?? seedPolicies();
      const normalized = ensureDefaultPolicy(migrated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
    return ensureDefaultPolicy(parsed.map((p, i) => normalizeRecord(p, i)));
  } catch {
    return seedPolicies();
  }
}

export function saveAttendancePolicies(list: AttendancePolicyRecord[]): void {
  if (typeof window === "undefined") return;
  const normalized = ensureDefaultPolicy(list);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("hr-attendance-policy-updated"));
}

export function nextAttendancePolicyId(list: AttendancePolicyRecord[]): number {
  return list.reduce((m, p) => Math.max(m, p.id), 0) + 1;
}

export function getActiveAttendancePolicies(
  list?: AttendancePolicyRecord[],
): AttendancePolicyRecord[] {
  return (list ?? loadAttendancePolicies()).filter((p) => p.status === "active");
}

export function getDefaultAttendancePolicy(
  list?: AttendancePolicyRecord[],
): AttendancePolicyRecord | undefined {
  const policies = list ?? loadAttendancePolicies();
  return (
    policies.find((p) => p.isDefault && p.status === "active") ??
    policies.find((p) => p.status === "active")
  );
}

export function getAttendancePolicyById(
  id: number,
  list?: AttendancePolicyRecord[],
): AttendancePolicyRecord | undefined {
  return (list ?? loadAttendancePolicies()).find((p) => p.id === id);
}

export function resolveEmployeeAttendancePolicyId(
  employee: Pick<HrEmployee, "profileSummaries">,
  list?: AttendancePolicyRecord[],
): number | undefined {
  const explicit = employee.profileSummaries?.attendance?.attendancePolicyId;
  if (typeof explicit === "number") {
    const found = getAttendancePolicyById(explicit, list);
    if (found) return found.id;
  }
  return getDefaultAttendancePolicy(list)?.id;
}

export function resolveEmployeeAttendancePolicyLabel(
  employee: Pick<HrEmployee, "profileSummaries">,
  list?: AttendancePolicyRecord[],
): string {
  const id = resolveEmployeeAttendancePolicyId(employee, list);
  if (!id) return "—";
  const policy = getAttendancePolicyById(id, list);
  if (!policy) return "—";
  if (policy.isDefault && !employee.profileSummaries?.attendance?.attendancePolicyId) {
    return `${policy.name} (Default)`;
  }
  return policy.name;
}

export function countEmployeesOnPolicy(
  policy: AttendancePolicyRecord,
  employees?: HrEmployee[],
): number {
  const list = employees ?? loadHrEmployees();
  return list.filter((e) => resolveEmployeeAttendancePolicyId(e) === policy.id).length;
}

export function isPolicyNameUnique(
  name: string,
  excludeId?: number,
  list?: AttendancePolicyRecord[],
): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  return !(list ?? loadAttendancePolicies()).some(
    (p) => p.id !== excludeId && p.name.trim().toLowerCase() === normalized,
  );
}

export function afterAllowedLimitLabel(v: AfterAllowedLimit): string {
  return AFTER_ALLOWED_LIMIT_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function buildLateComingSummary(allowed: number, _limit: AfterAllowedLimit): string {
  if (allowed <= 0) {
    return "Every late entry in a month is tracked as Late. From the 1st occurrence onward, the selected action applies.";
  }
  const next = allowed + 1;
  const entryWord = allowed === 1 ? "entry" : "entries";
  return `First ${allowed} late ${entryWord} in a month are tracked as Late. From the ${ordinal(next)} occurrence onward, the selected action applies.`;
}

export function durationToMinutes(hours: number, minutes: number): number {
  return Math.max(0, hours) * 60 + Math.max(0, minutes);
}

export function formatDurationCompact(hours: number, minutes: number): string {
  const h = Math.max(0, hours);
  const m = Math.max(0, minutes);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDurationList(hours: number, minutes: number): string {
  return `< ${formatDurationCompact(hours, minutes)}`;
}

export function formatLateAllowanceList(policy: AttendancePolicyRecord): string {
  if (!policy.trackLateComing) return "Off";
  return `${policy.allowedLateEntriesPerMonth}/month`;
}

export function formatOvertimeList(policy: AttendancePolicyRecord): string {
  if (!policy.overtimeEnabled) return "Disabled";
  return `After +${policy.overtimeAfterMinutes}m`;
}

export function withPolicyNewAudit(
  record: Omit<
    AttendancePolicyRecord,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): AttendancePolicyRecord {
  const t = todayIso();
  return {
    ...record,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: t,
    updatedAt: t,
  };
}

export function withPolicyUpdateAudit(record: AttendancePolicyRecord): AttendancePolicyRecord {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: todayIso() };
}

export interface AttendancePolicyValidation {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateAttendancePolicyRecord(input: {
  name: string;
  excludeId?: number;
  trackLateComing: boolean;
  allowedLateEntriesPerMonth: number;
  halfDayHours: number;
  halfDayMinutes: number;
  absentHours: number;
  absentMinutes: number;
  overtimeEnabled: boolean;
  overtimeAfterMinutes: number;
}): AttendancePolicyValidation {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) errors.name = "Policy name is required";
  else if (!isPolicyNameUnique(input.name, input.excludeId)) {
    errors.name = "Policy name already exists";
  }

  const halfDayM = durationToMinutes(input.halfDayHours, input.halfDayMinutes);
  const absentM = durationToMinutes(input.absentHours, input.absentMinutes);

  if (input.halfDayHours < 0 || input.halfDayMinutes < 0 || input.halfDayMinutes > 59) {
    errors.halfDay = "Enter valid hours and minutes";
  }
  if (input.absentHours < 0 || input.absentMinutes < 0 || input.absentMinutes > 59) {
    errors.absent = "Enter valid hours and minutes";
  }

  if (absentM >= halfDayM) {
    errors.absent = "Absent working hours must be less than Half Day working hours.";
  }

  if (input.overtimeEnabled && input.overtimeAfterMinutes < 0) {
    errors.overtimeAfterMinutes = "Must be 0 or greater";
  }

  if (input.trackLateComing) {
    if (
      input.allowedLateEntriesPerMonth < 0 ||
      !Number.isInteger(input.allowedLateEntriesPerMonth)
    ) {
      errors.allowedLateEntriesPerMonth = "Must be a whole number 0 or greater";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** @deprecated Use loadAttendancePolicies — kept for any stale imports */
export function loadAttendancePolicySettings(): AttendancePolicyRecord {
  return getDefaultAttendancePolicy() ?? seedPolicies()[0]!;
}

/** @deprecated Use saveAttendancePolicies */
export function saveAttendancePolicySettings(record: AttendancePolicyRecord): void {
  const list = loadAttendancePolicies();
  const idx = list.findIndex((p) => p.id === record.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = withPolicyUpdateAudit(record);
    saveAttendancePolicies(next);
  } else {
    saveAttendancePolicies([...list, withPolicyUpdateAudit(record)]);
  }
}

export type AttendancePolicySettings = AttendancePolicyRecord;
