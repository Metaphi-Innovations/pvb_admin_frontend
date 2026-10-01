/**
 * LOP Rules — single company configuration + deduction resolver (frontend/demo).
 *
 * Defines how unpaid absence reduces payable earnings.
 * Does NOT define attendance policy, leave entitlement, salary structure,
 * statutory engines, or payroll cycle dates.
 *
 * Persistence: localStorage `ds_hr_lop_settings_v1`
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { policyToday } from "@/lib/hr/policy-common";
import type { AttendanceDayStatus } from "../attendance/attendance-data";
import type { PayrollCycleRecord } from "./payroll-cycle-data";
import {
  getDefaultPayrollCycle,
  loadPayrollCycles,
} from "./payroll-cycle-data";
import {
  loadSalaryComponents,
  type SalaryComponentRecord,
  type SalaryCalculationType,
} from "./salary-components-data";

function isStatutoryCalculationType(type: SalaryCalculationType): boolean {
  return type === "statutory";
}

const STORAGE_KEY = "ds_hr_lop_settings_v1";

export type LopPerDayBasis =
  | "calendar_days"
  | "fixed_30"
  | "working_days"
  | "payroll_period_days";

export type LopRoundOffRule = "none" | "nearest" | "down" | "up";

export type LopResolveStatus =
  | "ok"
  | "disabled"
  | "configuration_required"
  | "zero_lop";

export interface LopSettings {
  lopEnabled: boolean;
  perDayBasis: LopPerDayBasis;
  prorateEarnings: boolean;
  prorateEmployerContributions: boolean;
  halfDayLopEnabled: boolean;
  /** Fixed concept when half-day LOP is on — always 0.5 day */
  halfDayFraction: 0.5;
  roundOffRule: LopRoundOffRule;
  updatedBy: string;
  updatedAt: string;
}

export const LOP_PER_DAY_BASIS_OPTIONS: {
  value: LopPerDayBasis;
  label: string;
  helper: string;
}[] = [
  {
    value: "calendar_days",
    label: "Calendar Days",
    helper: "Monthly eligible ÷ actual days in the calendar month.",
  },
  {
    value: "fixed_30",
    label: "Fixed 30 Days",
    helper: "Monthly eligible ÷ 30.",
  },
  {
    value: "working_days",
    label: "Working Days",
    helper:
      "Monthly eligible ÷ scheduled working days in the period (shift + holidays).",
  },
  {
    value: "payroll_period_days",
    label: "Payroll Period Days",
    helper: "Monthly eligible ÷ total days in the resolved payroll cycle period.",
  },
];

export const LOP_ROUND_OFF_OPTIONS: {
  value: LopRoundOffRule;
  label: string;
}[] = [
  { value: "none", label: "No Round-off" },
  { value: "nearest", label: "Nearest Rupee" },
  { value: "down", label: "Round Down" },
  { value: "up", label: "Round Up" },
];

export const DEFAULT_LOP_SETTINGS: LopSettings = {
  lopEnabled: true,
  perDayBasis: "fixed_30",
  prorateEarnings: true,
  prorateEmployerContributions: false,
  halfDayLopEnabled: true,
  halfDayFraction: 0.5,
  roundOffRule: "nearest",
  updatedBy: CURRENT_USER,
  updatedAt: "2026-01-01",
};

function normalizeBasis(raw: unknown): LopPerDayBasis {
  const s = String(raw ?? "").toLowerCase();
  if (s === "calendar_days" || s === "calendar") return "calendar_days";
  if (s === "working_days" || s === "working") return "working_days";
  if (s === "payroll_period_days" || s === "payroll_period" || s === "period") {
    return "payroll_period_days";
  }
  return "fixed_30";
}

function normalizeRound(raw: unknown): LopRoundOffRule {
  const s = String(raw ?? "").toLowerCase();
  if (s === "none" || s === "no" || s === "no_round") return "none";
  if (s === "down" || s === "floor") return "down";
  if (s === "up" || s === "ceil") return "up";
  return "nearest";
}

export function normalizeLopSettings(raw: unknown): LopSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    lopEnabled: r.lopEnabled !== false,
    perDayBasis: normalizeBasis(r.perDayBasis),
    prorateEarnings: r.prorateEarnings !== false,
    prorateEmployerContributions: r.prorateEmployerContributions === true,
    halfDayLopEnabled: r.halfDayLopEnabled !== false,
    halfDayFraction: 0.5,
    roundOffRule: normalizeRound(r.roundOffRule),
    updatedBy: typeof r.updatedBy === "string" ? r.updatedBy : CURRENT_USER,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : policyToday(),
  };
}

export function loadLopSettings(): LopSettings {
  if (typeof window === "undefined") return { ...DEFAULT_LOP_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LOP_SETTINGS));
      return { ...DEFAULT_LOP_SETTINGS };
    }
    return normalizeLopSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LOP_SETTINGS };
  }
}

export function saveLopSettings(settings: LopSettings): void {
  if (typeof window === "undefined") return;
  const next: LopSettings = {
    ...normalizeLopSettings(settings),
    halfDayFraction: 0.5,
    updatedBy: CURRENT_USER,
    updatedAt: policyToday(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("hr-lop-settings-updated"));
}

export function perDayBasisLabel(v: LopPerDayBasis): string {
  return LOP_PER_DAY_BASIS_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function roundOffRuleLabel(v: LopRoundOffRule): string {
  return LOP_ROUND_OFF_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function applyLopRoundOff(amount: number, rule: LopRoundOffRule): number {
  if (!Number.isFinite(amount)) return 0;
  switch (rule) {
    case "nearest":
      return Math.round(amount);
    case "down":
      return Math.floor(amount);
    case "up":
      return Math.ceil(amount);
    case "none":
    default:
      return Math.round(amount * 100) / 100;
  }
}

/* ─── Component LOP applicability helpers ───────────────────── */

export function defaultLopApplicableForComponent(
  component: Pick<SalaryComponentRecord, "name" | "componentType" | "calculationType">,
): boolean {
  if (component.componentType !== "earning") return false;
  if (isStatutoryCalculationType(component.calculationType)) return false;
  const n = component.name.trim().toLowerCase();
  if (n === "bonus" || n.includes("reimbursement") || n.includes("arrear")) {
    return false;
  }
  return true;
}

export function isComponentLopApplicable(
  component: SalaryComponentRecord | null | undefined,
): boolean {
  if (!component) return false;
  if (component.componentType !== "earning") return false;
  if (isStatutoryCalculationType(component.calculationType)) return false;
  if (typeof component.lopApplicable === "boolean") return component.lopApplicable;
  return defaultLopApplicableForComponent(component);
}

/* ─── Period helpers ────────────────────────────────────────── */

export function calendarDaysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function enumerateDatesInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from.slice(0, 10)}T00:00:00`);
  const end = new Date(`${to.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return out;
  }
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

/**
 * Resolve attendance window for a payroll month using Payroll Cycle settings.
 * Does not ask for dates inside LOP Rules — used by the resolver only.
 */
export function resolveAttendancePeriodForMonth(
  year: number,
  monthIndex0: number,
  cycle?: PayrollCycleRecord | null,
): { startDate: string; endDate: string; periodDays: number } | null {
  const c = cycle ?? getDefaultPayrollCycle(loadPayrollCycles());
  if (!c) return null;

  const y = year;
  const m = monthIndex0; // 0-based
  const pad = (n: number) => String(n).padStart(2, "0");

  if (c.attendancePeriod === "calendar_month") {
    const last = calendarDaysInMonth(y, m);
    const startDate = `${y}-${pad(m + 1)}-01`;
    const endDate = `${y}-${pad(m + 1)}-${pad(last)}`;
    return { startDate, endDate, periodDays: last };
  }

  const cut = c.cutoffDay ?? 25;
  const prev = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
  const startDay = Math.min(cut + 1, calendarDaysInMonth(prev.y, prev.m));
  // Custom: day after cut-off previous month → cut-off current month
  const startDate =
    cut >= 28
      ? `${y}-${pad(m + 1)}-01`
      : `${prev.y}-${pad(prev.m + 1)}-${pad(startDay)}`;
  const endDay = Math.min(cut, calendarDaysInMonth(y, m));
  const endDate = `${y}-${pad(m + 1)}-${pad(endDay)}`;
  const dates = enumerateDatesInclusive(startDate, endDate);
  return { startDate, endDate, periodDays: dates.length };
}

/* ─── Resolver types ────────────────────────────────────────── */

export interface LopAttendanceDayInput {
  date: string;
  status: AttendanceDayStatus | string;
}

export interface LopLeaveDayInput {
  date: string;
  leaveType: string;
  /** When "Unpaid", counts toward LOP. Paid leave type name → no LOP. */
  adjustedAgainst: string;
  status: string;
  /** 1 = full day, 0.5 = half day leave */
  dayFraction?: number;
}

export interface LopSalaryLineInput {
  componentId: number;
  componentName: string;
  componentType: "earning" | "deduction" | "employer_contribution" | string;
  monthlyEligible: number;
  /** Override; else resolved from salary component master */
  lopApplicable?: boolean;
}

export interface LopDaysBreakdown {
  absentDays: number;
  unpaidLeaveDays: number;
  halfDayLopDays: number;
  totalLopDays: number;
}

export interface LopComponentResult {
  componentId: number;
  componentName: string;
  componentType: string;
  lopApplicable: boolean;
  monthlyEligible: number;
  perDayAmount: number | null;
  lopDays: number;
  lopDeduction: number;
  payableAmount: number;
  skippedReason: string | null;
}

export interface LopDeductionResult {
  status: LopResolveStatus;
  message: string | null;
  settings: LopSettings;
  divisorDays: number | null;
  daysBreakdown: LopDaysBreakdown;
  components: LopComponentResult[];
  totalLopDeduction: number;
  totalPayableEarnings: number;
  integrationGaps: string[];
}

export interface ResolveLopDeductionInput {
  /** Reference month for calendar / period resolution (Date or YYYY-MM) */
  payrollPeriod: {
    year: number;
    /** 1–12 */
    month: number;
    startDate?: string;
    endDate?: string;
    /** Override divisor for working_days / payroll_period_days */
    workingDays?: number | null;
    periodDays?: number | null;
    calendarDays?: number | null;
  };
  employee?: { employeeCode?: string; id?: number } | null;
  salaryBreakup: LopSalaryLineInput[];
  attendance?: LopAttendanceDayInput[] | null;
  leave?: LopLeaveDayInput[] | null;
  /** Explicit LOP days override (tests / payroll precompute) */
  lopDaysOverride?: number | null;
  lopSettings?: LopSettings | null;
  payrollCycle?: PayrollCycleRecord | null;
  componentsCatalog?: SalaryComponentRecord[] | null;
}

function isPaidLeaveAdjustment(adjustedAgainst: string): boolean {
  const a = adjustedAgainst.trim().toLowerCase();
  if (!a) return false;
  return a !== "unpaid";
}

function isApprovedLeave(status: string): boolean {
  return String(status).toLowerCase() === "approved";
}

/**
 * Derive LOP day fractions from attendance + leave for dates in [start, end].
 */
export function deriveLopDaysFromAttendanceAndLeave(input: {
  startDate: string;
  endDate: string;
  attendance?: LopAttendanceDayInput[] | null;
  leave?: LopLeaveDayInput[] | null;
  halfDayLopEnabled: boolean;
  halfDayFraction: number;
}): LopDaysBreakdown & { perDate: Record<string, number> } {
  const dates = enumerateDatesInclusive(input.startDate, input.endDate);
  const attMap = new Map(
    (input.attendance ?? []).map((a) => [a.date.slice(0, 10), a.status]),
  );
  const leaveByDate = new Map<string, LopLeaveDayInput[]>();
  for (const l of input.leave ?? []) {
    const key = l.date.slice(0, 10);
    const list = leaveByDate.get(key) ?? [];
    list.push(l);
    leaveByDate.set(key, list);
  }

  let absentDays = 0;
  let unpaidLeaveDays = 0;
  let halfDayLopDays = 0;
  const perDate: Record<string, number> = {};

  for (const date of dates) {
    const status = String(attMap.get(date) ?? "").toLowerCase();
    const leaves = (leaveByDate.get(date) ?? []).filter((l) =>
      isApprovedLeave(l.status),
    );

    // Weekly off / public holiday — never LOP
    if (status === "week_off" || status === "holiday") {
      perDate[date] = 0;
      continue;
    }

    const unpaidLeaves = leaves.filter((l) => !isPaidLeaveAdjustment(l.adjustedAgainst));
    const paidLeaves = leaves.filter((l) => isPaidLeaveAdjustment(l.adjustedAgainst));

    // Paid leave covering the day → no LOP
    if (paidLeaves.length > 0 && unpaidLeaves.length === 0) {
      perDate[date] = 0;
      continue;
    }

    if (unpaidLeaves.length > 0) {
      let frac = 0;
      for (const l of unpaidLeaves) {
        frac += l.dayFraction != null && l.dayFraction > 0 ? l.dayFraction : 1;
      }
      frac = Math.min(1, frac);
      unpaidLeaveDays += frac;
      perDate[date] = frac;
      continue;
    }

    if (status === "absent") {
      absentDays += 1;
      perDate[date] = 1;
      continue;
    }

    if (status === "half_day" && input.halfDayLopEnabled) {
      const frac = input.halfDayFraction;
      halfDayLopDays += frac;
      perDate[date] = frac;
      continue;
    }

    perDate[date] = 0;
  }

  const totalLopDays = absentDays + unpaidLeaveDays + halfDayLopDays;
  return { absentDays, unpaidLeaveDays, halfDayLopDays, totalLopDays, perDate };
}

function resolveDivisorDays(
  settings: LopSettings,
  period: ResolveLopDeductionInput["payrollPeriod"],
  cycle: PayrollCycleRecord | null,
  gaps: string[],
): number | null {
  const year = period.year;
  const monthIndex0 = period.month - 1;

  switch (settings.perDayBasis) {
    case "fixed_30":
      return 30;
    case "calendar_days":
      return (
        period.calendarDays ??
        calendarDaysInMonth(year, monthIndex0)
      );
    case "working_days": {
      if (period.workingDays != null && period.workingDays > 0) {
        return period.workingDays;
      }
      gaps.push(
        "Working Days basis needs scheduled working days for the payroll period (shift weekly schedule + public holidays). Not auto-counted yet.",
      );
      return null;
    }
    case "payroll_period_days": {
      if (period.periodDays != null && period.periodDays > 0) {
        return period.periodDays;
      }
      const resolved = resolveAttendancePeriodForMonth(year, monthIndex0, cycle);
      if (resolved) return resolved.periodDays;
      gaps.push(
        "Payroll Period Days basis needs an active Payroll Cycle to resolve the attendance window.",
      );
      return null;
    }
    default:
      return null;
  }
}

function emptyBreakdown(): LopDaysBreakdown {
  return {
    absentDays: 0,
    unpaidLeaveDays: 0,
    halfDayLopDays: 0,
    totalLopDays: 0,
  };
}

/**
 * Reusable LOP deduction resolver for future Payroll Run / tests.
 * Does not mutate employee salary master or run payroll.
 */
export function resolveLopDeduction(
  input: ResolveLopDeductionInput,
): LopDeductionResult {
  const settings = normalizeLopSettings(input.lopSettings ?? loadLopSettings());
  const catalog = input.componentsCatalog ?? loadSalaryComponents();
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const cycle =
    input.payrollCycle !== undefined
      ? input.payrollCycle
      : getDefaultPayrollCycle(loadPayrollCycles());
  const integrationGaps: string[] = [];

  const baseEmpty = (status: LopResolveStatus, message: string | null): LopDeductionResult => ({
    status,
    message,
    settings,
    divisorDays: null,
    daysBreakdown: emptyBreakdown(),
    components: input.salaryBreakup.map((line) => {
      const comp = catalogById.get(line.componentId);
      const lopApplicable =
        line.lopApplicable ??
        (comp ? isComponentLopApplicable(comp) : line.componentType === "earning");
      return {
        componentId: line.componentId,
        componentName: line.componentName,
        componentType: line.componentType,
        lopApplicable,
        monthlyEligible: line.monthlyEligible,
        perDayAmount: null,
        lopDays: 0,
        lopDeduction: 0,
        payableAmount: line.monthlyEligible,
        skippedReason:
          status === "disabled"
            ? "LOP disabled"
            : !lopApplicable
              ? "LOP not applicable"
              : message,
      };
    }),
    totalLopDeduction: 0,
    totalPayableEarnings: input.salaryBreakup
      .filter((l) => l.componentType === "earning")
      .reduce((s, l) => s + (Number(l.monthlyEligible) || 0), 0),
    integrationGaps,
  });

  if (!settings.lopEnabled) {
    return baseEmpty("disabled", "LOP is disabled. No salary deduction applied.");
  }

  const year = input.payrollPeriod.year;
  const monthIndex0 = input.payrollPeriod.month - 1;
  let startDate = input.payrollPeriod.startDate;
  let endDate = input.payrollPeriod.endDate;
  if (!startDate || !endDate) {
    const resolved = resolveAttendancePeriodForMonth(year, monthIndex0, cycle);
    if (resolved) {
      startDate = startDate ?? resolved.startDate;
      endDate = endDate ?? resolved.endDate;
    } else {
      const last = calendarDaysInMonth(year, monthIndex0);
      const pad = (n: number) => String(n).padStart(2, "0");
      startDate = startDate ?? `${year}-${pad(monthIndex0 + 1)}-01`;
      endDate = endDate ?? `${year}-${pad(monthIndex0 + 1)}-${pad(last)}`;
      if (!cycle) {
        integrationGaps.push(
          "No Payroll Cycle configured; using calendar month for attendance window.",
        );
      }
    }
  }

  let daysBreakdown = emptyBreakdown();
  let totalLopDays = 0;

  if (input.lopDaysOverride != null && Number.isFinite(input.lopDaysOverride)) {
    totalLopDays = Math.max(0, Number(input.lopDaysOverride));
    daysBreakdown = {
      ...emptyBreakdown(),
      totalLopDays,
      absentDays: totalLopDays,
    };
  } else if (input.attendance != null || input.leave != null) {
    const derived = deriveLopDaysFromAttendanceAndLeave({
      startDate: startDate!,
      endDate: endDate!,
      attendance: input.attendance,
      leave: input.leave,
      halfDayLopEnabled: settings.halfDayLopEnabled,
      halfDayFraction: settings.halfDayFraction,
    });
    daysBreakdown = {
      absentDays: derived.absentDays,
      unpaidLeaveDays: derived.unpaidLeaveDays,
      halfDayLopDays: derived.halfDayLopDays,
      totalLopDays: derived.totalLopDays,
    };
    totalLopDays = derived.totalLopDays;
  } else {
    return {
      ...baseEmpty(
        "configuration_required",
        "Attendance and leave records (or an explicit LOP days value) are required to resolve LOP.",
      ),
      integrationGaps: [
        ...integrationGaps,
        "Pass attendance/leave for the payroll period, or lopDaysOverride for testing.",
      ],
    };
  }

  const divisorDays = resolveDivisorDays(
    settings,
    input.payrollPeriod,
    cycle,
    integrationGaps,
  );

  if (divisorDays == null || divisorDays <= 0) {
    return {
      ...baseEmpty(
        "configuration_required",
        `Cannot resolve per-day divisor for basis “${perDayBasisLabel(settings.perDayBasis)}”.`,
      ),
      daysBreakdown,
      integrationGaps,
    };
  }

  if (totalLopDays <= 0) {
    return {
      ...baseEmpty("zero_lop", "No LOP days in this period."),
      divisorDays,
      daysBreakdown,
      integrationGaps,
    };
  }

  if (!settings.prorateEarnings) {
    return {
      ...baseEmpty(
        "ok",
        "LOP days calculated; earnings proration is OFF — payable earnings unchanged.",
      ),
      divisorDays,
      daysBreakdown,
      integrationGaps,
    };
  }

  const components: LopComponentResult[] = [];
  let totalLopDeduction = 0;
  let totalPayableEarnings = 0;

  for (const line of input.salaryBreakup) {
    const eligible = Number(line.monthlyEligible) || 0;
    const comp = catalogById.get(line.componentId);
    const isEarning = line.componentType === "earning";
    const isEmployer = line.componentType === "employer_contribution";
    const statutory =
      comp != null
        ? isStatutoryCalculationType(comp.calculationType)
        : /pf|esi|pt|professional tax|lwf|tds/i.test(line.componentName);

    let lopApplicable =
      line.lopApplicable ??
      (comp ? isComponentLopApplicable(comp) : isEarning && !statutory);

    // Never apply LOP deduction directly to statutory / tax components
    if (statutory || !isEarning) {
      lopApplicable = false;
    }

    // Employer contributions: flag only — engines recalculate later
    if (isEmployer) {
      components.push({
        componentId: line.componentId,
        componentName: line.componentName,
        componentType: line.componentType,
        lopApplicable: false,
        monthlyEligible: eligible,
        perDayAmount: null,
        lopDays: 0,
        lopDeduction: 0,
        payableAmount: eligible,
        skippedReason: settings.prorateEmployerContributions
          ? "Employer contribution — recalculate via statutory engine using prorated bases"
          : "Employer contribution — not prorated by LOP Rules",
      });
      continue;
    }

    if (!isEarning || !lopApplicable) {
      components.push({
        componentId: line.componentId,
        componentName: line.componentName,
        componentType: line.componentType,
        lopApplicable: false,
        monthlyEligible: eligible,
        perDayAmount: null,
        lopDays: 0,
        lopDeduction: 0,
        payableAmount: eligible,
        skippedReason: !isEarning
          ? "Not an earning component"
          : statutory
            ? "Statutory — recalculate after payable earnings"
            : "LOP Applicable = No",
      });
      if (isEarning) totalPayableEarnings += eligible;
      continue;
    }

    const perDay = eligible / divisorDays;
    const rawDeduction = perDay * totalLopDays;
    const lopDeduction = applyLopRoundOff(rawDeduction, settings.roundOffRule);
    const payable = Math.max(0, applyLopRoundOff(eligible - lopDeduction, settings.roundOffRule));

    totalLopDeduction += lopDeduction;
    totalPayableEarnings += payable;

    components.push({
      componentId: line.componentId,
      componentName: line.componentName,
      componentType: line.componentType,
      lopApplicable: true,
      monthlyEligible: eligible,
      perDayAmount: applyLopRoundOff(perDay, "none"),
      lopDays: totalLopDays,
      lopDeduction,
      payableAmount: payable,
      skippedReason: null,
    });
  }

  return {
    status: "ok",
    message: null,
    settings,
    divisorDays,
    daysBreakdown,
    components,
    totalLopDeduction: applyLopRoundOff(totalLopDeduction, settings.roundOffRule),
    totalPayableEarnings: applyLopRoundOff(totalPayableEarnings, settings.roundOffRule),
    integrationGaps,
  };
}
