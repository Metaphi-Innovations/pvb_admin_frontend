/**
 * Payroll Cycle master — frontend/demo persistence.
 *
 * Defines how often payroll runs, which attendance window applies,
 * when payroll is processed, and when salary is paid.
 *
 * Does NOT define salary components, statutory rules, LOP, or attendance classification.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import {
  loadPolicyList,
  savePolicyList,
  nextPolicyId,
  policyToday,
  type PolicyStatus,
} from "@/lib/hr/policy-common";

export type { PolicyStatus };

const STORAGE_KEY = "ds_hr_payroll_cycles_v1";

export type PayrollFrequency = "monthly";

export type AttendancePeriodType = "calendar_month" | "custom_cutoff";

/** Day-of-month 1–28, or last calendar day of the month. */
export type CycleDayOfMonth = number | "last_day";

export type SalaryPaymentRule =
  | "same_as_processing"
  | "fixed_day"
  | "last_day"
  | "next_month_fixed_day";

export interface PayrollCycleRecord {
  id: number;
  cycleName: string;
  frequency: PayrollFrequency;
  attendancePeriod: AttendancePeriodType;
  /**
   * When attendancePeriod = custom_cutoff:
   * period ends on this day of the payroll month;
   * starts the day after the same cut-off in the previous month.
   */
  cutoffDay: number | null;
  processingDay: CycleDayOfMonth;
  salaryPaymentRule: SalaryPaymentRule;
  /** Required when salaryPaymentRule is fixed_day or next_month_fixed_day */
  salaryPaymentDay: number | null;
  isDefault: boolean;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const PAYROLL_FREQUENCY_OPTIONS: {
  value: PayrollFrequency;
  label: string;
}[] = [{ value: "monthly", label: "Monthly" }];

export const ATTENDANCE_PERIOD_OPTIONS: {
  value: AttendancePeriodType;
  label: string;
  helper: string;
}[] = [
  {
    value: "calendar_month",
    label: "Calendar Month",
    helper: "1st day through last day of the calendar month.",
  },
  {
    value: "custom_cutoff",
    label: "Custom Cut-off",
    helper:
      "Attendance from the day after the cut-off in the previous month through the cut-off day of the current month.",
  },
];

export const SALARY_PAYMENT_RULE_OPTIONS: {
  value: SalaryPaymentRule;
  label: string;
  helper: string;
}[] = [
  {
    value: "same_as_processing",
    label: "Same as Processing Day",
    helper: "Salary is paid on the payroll processing day.",
  },
  {
    value: "fixed_day",
    label: "Fixed Day of Month",
    helper: "Salary is paid on a fixed day in the same payroll month.",
  },
  {
    value: "last_day",
    label: "Last Day of Month",
    helper: "Salary is paid on the last calendar day of the payroll month.",
  },
  {
    value: "next_month_fixed_day",
    label: "Fixed Day of Next Month",
    helper: "Salary is paid on a fixed day in the following month.",
  },
];

/** Selectable days for cut-off / fixed payment (1–28 avoids short-month edge cases). */
export const CYCLE_DAY_OPTIONS: number[] = Array.from({ length: 28 }, (_, i) => i + 1);

export const PROCESSING_DAY_OPTIONS: { value: string; label: string }[] = [
  ...CYCLE_DAY_OPTIONS.map((d) => ({ value: String(d), label: ordinalDay(d) })),
  { value: "last_day", label: "Last day of month" },
];

function ordinalDay(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function formatCycleDay(day: CycleDayOfMonth | null | undefined): string {
  if (day == null) return "—";
  if (day === "last_day") return "Last day of month";
  return ordinalDay(day);
}

export function frequencyLabel(f: PayrollFrequency): string {
  return PAYROLL_FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

export function attendancePeriodLabel(t: AttendancePeriodType): string {
  return ATTENDANCE_PERIOD_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function salaryPaymentRuleLabel(r: SalaryPaymentRule): string {
  return SALARY_PAYMENT_RULE_OPTIONS.find((o) => o.value === r)?.label ?? r;
}

export function formatAttendancePeriodSummary(record: PayrollCycleRecord): string {
  if (record.attendancePeriod === "calendar_month") {
    return "1st – Last day of month";
  }
  const cut = record.cutoffDay;
  if (cut == null || cut < 1) return "Custom cut-off (not set)";
  const start = cut >= 28 ? 1 : cut + 1;
  return `${ordinalDay(start)} prev – ${ordinalDay(cut)} current`;
}

export function formatSalaryPaymentSummary(record: PayrollCycleRecord): string {
  switch (record.salaryPaymentRule) {
    case "same_as_processing":
      return `Same as processing (${formatCycleDay(record.processingDay)})`;
    case "last_day":
      return "Last day of month";
    case "fixed_day":
      return record.salaryPaymentDay != null
        ? `${ordinalDay(record.salaryPaymentDay)} of month`
        : "Fixed day (not set)";
    case "next_month_fixed_day":
      return record.salaryPaymentDay != null
        ? `${ordinalDay(record.salaryPaymentDay)} of next month`
        : "Next month day (not set)";
    default:
      return "—";
  }
}

function normalizeFrequency(raw: unknown): PayrollFrequency {
  const s = String(raw ?? "").toLowerCase();
  // Preserve unknown future values safely by falling back to monthly for UI scope
  if (s === "weekly" || s === "fortnightly" || s === "biweekly") {
    return "monthly";
  }
  return "monthly";
}

function normalizeAttendancePeriod(raw: unknown): AttendancePeriodType {
  const s = String(raw ?? "").toLowerCase();
  if (s === "custom_cutoff" || s === "custom" || s === "cut_off" || s === "cutoff") {
    return "custom_cutoff";
  }
  return "calendar_month";
}

function normalizeCycleDay(raw: unknown): CycleDayOfMonth {
  if (raw === "last_day" || raw === "last" || String(raw).toLowerCase() === "last_day") {
    return "last_day";
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 31) {
    return Math.min(28, Math.max(1, Math.round(n)));
  }
  return 25;
}

function normalizePaymentRule(raw: unknown): SalaryPaymentRule {
  const s = String(raw ?? "").toLowerCase();
  if (s === "fixed_day" || s === "fixed") return "fixed_day";
  if (s === "last_day" || s === "last") return "last_day";
  if (
    s === "next_month_fixed_day" ||
    s === "next_month" ||
    s === "next_month_fixed"
  ) {
    return "next_month_fixed_day";
  }
  return "same_as_processing";
}

function normalizeRecord(raw: Record<string, unknown>, index: number): PayrollCycleRecord {
  const attendancePeriod = normalizeAttendancePeriod(raw.attendancePeriod);
  const salaryPaymentRule = normalizePaymentRule(raw.salaryPaymentRule);
  let cutoffDay: number | null = null;
  if (attendancePeriod === "custom_cutoff") {
    const c = Number(raw.cutoffDay);
    cutoffDay =
      Number.isFinite(c) && c >= 1 && c <= 28 ? Math.round(c) : 25;
  }
  let salaryPaymentDay: number | null = null;
  if (
    salaryPaymentRule === "fixed_day" ||
    salaryPaymentRule === "next_month_fixed_day"
  ) {
    const d = Number(raw.salaryPaymentDay);
    salaryPaymentDay =
      Number.isFinite(d) && d >= 1 && d <= 28 ? Math.round(d) : 1;
  }

  return {
    id: Number(raw.id) || index + 1,
    cycleName: String(raw.cycleName ?? raw.name ?? "").trim() || `Payroll Cycle ${index + 1}`,
    frequency: normalizeFrequency(raw.frequency),
    attendancePeriod,
    cutoffDay,
    processingDay: normalizeCycleDay(raw.processingDay),
    salaryPaymentRule,
    salaryPaymentDay,
    isDefault: raw.isDefault === true,
    status: raw.status === "inactive" ? "inactive" : "active",
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : policyToday(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : policyToday(),
  };
}

const SEED: PayrollCycleRecord[] = [
  {
    id: 1,
    cycleName: "Monthly Payroll",
    frequency: "monthly",
    attendancePeriod: "calendar_month",
    cutoffDay: null,
    processingDay: 25,
    salaryPaymentRule: "last_day",
    salaryPaymentDay: null,
    isDefault: true,
    status: "active",
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

export function loadPayrollCycles(): PayrollCycleRecord[] {
  const raw = loadPolicyList(STORAGE_KEY, structuredClone(SEED));
  const list = raw.map((r, i) =>
    normalizeRecord(r as unknown as Record<string, unknown>, i),
  );
  // Ensure at most one active default
  let seenDefault = false;
  return list.map((r) => {
    if (r.isDefault && r.status === "active") {
      if (seenDefault) return { ...r, isDefault: false };
      seenDefault = true;
    }
    return r;
  });
}

export function savePayrollCycles(list: PayrollCycleRecord[]): void {
  savePolicyList(STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-payroll-cycles-updated"));
  }
}

export function nextPayrollCycleId(list: PayrollCycleRecord[]): number {
  return nextPolicyId(list);
}

export function withPayrollCycleNewAudit(
  partial: Omit<
    PayrollCycleRecord,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): PayrollCycleRecord {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withPayrollCycleUpdateAudit(
  record: PayrollCycleRecord,
): PayrollCycleRecord {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function findPayrollCycleById(
  id: number,
  list?: PayrollCycleRecord[],
): PayrollCycleRecord | undefined {
  return (list ?? loadPayrollCycles()).find((r) => r.id === id);
}

export function getDefaultPayrollCycle(
  list?: PayrollCycleRecord[],
): PayrollCycleRecord | null {
  const cycles = list ?? loadPayrollCycles();
  return (
    cycles.find((c) => c.isDefault && c.status === "active") ??
    cycles.find((c) => c.status === "active") ??
    null
  );
}

export function isPayrollCycleNameTaken(
  name: string,
  excludeId: number | null,
  list?: PayrollCycleRecord[],
): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return (list ?? loadPayrollCycles()).some(
    (c) => c.id !== excludeId && c.cycleName.trim().toLowerCase() === n,
  );
}

/**
 * Usage for delete guards. Employee/payroll assignment is not wired yet —
 * only the default flag blocks delete as "in use".
 */
export function countPayrollCycleUsage(record: PayrollCycleRecord): number {
  return record.isDefault ? 1 : 0;
}
