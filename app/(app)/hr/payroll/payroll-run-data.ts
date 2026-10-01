/**
 * Payroll Run foundation — frontend/demo persistence + calculation orchestration.
 *
 * Reuses Salary Structure, LOP, PF, ESI, PT, LWF, TDS resolvers.
 * Does NOT generate payslips, post accounting, or run DB migrations.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import { policyToday } from "@/lib/hr/policy-common";
import { getRecordsForEmployee } from "../attendance/attendance-data";
import { loadHrEmployees, type HrEmployee } from "../employees/employee-master-data";
import {
  getLeaveRequestsForEmployee,
  type LeaveRequestRecord,
} from "../requests/requests-data";
import {
  formatInrAmount,
  parseMonthlyCtcValue,
  resolveEmployeeMonthlySalary,
  resolveStructureForEmployee,
  type EmployeeSalaryResolution,
  type ResolvedSalaryLine,
} from "../settings/employee-salary-resolve";
import {
  enumerateDatesInclusive,
  loadLopSettings,
  resolveAttendancePeriodForMonth,
  resolveLopDeduction,
  type LopAttendanceDayInput,
  type LopDeductionResult,
  type LopLeaveDayInput,
} from "../settings/lop-settings-data";
import {
  findPayrollCycleById,
  formatSalaryPaymentSummary,
  getDefaultPayrollCycle,
  loadPayrollCycles,
  type PayrollCycleRecord,
  type CycleDayOfMonth,
} from "../settings/payroll-cycle-data";
import {
  resolveEmployeePf,
  type EmployeePfDisplay,
} from "../settings/pf-settings-data";
import {
  resolveEmployeeEsi,
  type EmployeeEsiDisplay,
} from "../settings/esi-settings-data";
import {
  resolveEmployeeProfessionalTax,
  type EmployeePtDisplay,
} from "../settings/professional-tax-data";
import {
  resolveEmployeeLwf,
  type EmployeeLwfDisplay,
} from "../settings/lwf-settings-data";
import {
  resolveEmployeeTax,
  type EmployeeTaxDisplay,
} from "../settings/tax-settings-data";
import { loadSalaryComponents } from "../settings/salary-components-data";

const STORAGE_KEY = "ds_hr_payroll_runs_v1";

export type PayrollRunStatus = "draft" | "calculated" | "finalized";
export type PayrollEmployeeStatus =
  | "ready"
  | "calculated"
  | "configuration_required"
  | "error";

export type PayrollIssueSeverity = "blocking" | "warning";

export interface PayrollIssue {
  code: string;
  severity: PayrollIssueSeverity;
  message: string;
  href?: string;
}

export interface PayrollAttendanceSummary {
  attendanceFrom: string;
  attendanceTo: string;
  periodDays: number;
  workingDays: number | null;
  present: number;
  paidLeave: number;
  unpaidLeave: number;
  absent: number;
  halfDay: number;
  weekOff: number;
  holiday: number;
  lopDays: number;
  payableDaysNote: string;
}

export interface PayrollComponentResult {
  componentId: number;
  componentName: string;
  componentType: "earning" | "deduction" | "employer_contribution";
  monthlyEligible: number | null;
  lopDeduction: number | null;
  payableAmount: number | null;
  calculationSource: string;
  amount: number;
  statusLabel: string;
}

export interface PayrollEmployeeResult {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  branch: string;
  designation: string;
  structureId: number | null;
  structureName: string | null;
  monthlyCtc: number | null;
  payrollCycleId: number;
  payrollCycleName: string;
  status: PayrollEmployeeStatus;
  issues: PayrollIssue[];
  attendance: PayrollAttendanceSummary;
  lopDays: number;
  lopDeduction: number;
  earnings: PayrollComponentResult[];
  deductions: PayrollComponentResult[];
  employerContributions: PayrollComponentResult[];
  grossEarnings: number;
  employeeDeductionsTotal: number;
  employerContributionsTotal: number;
  netPay: number;
  employerCost: number;
  snapshot: {
    calculatedAt: string;
    payrollDate: string;
    lopBasis: string;
    pfStatus: string;
    esiStatus: string;
    ptStatus: string;
    lwfStatus: string;
    tdsStatus: string;
    joiningDate: string;
    exitDateGap: boolean;
  };
}

export interface PayrollRunTotals {
  employeeCount: number;
  calculatedCount: number;
  configIssueCount: number;
  grossEarnings: number;
  deductions: number;
  netPay: number;
  employerContributions: number;
}

export interface PayrollRun {
  id: string;
  cycleId: number;
  cycleName: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  attendanceFrom: string;
  attendanceTo: string;
  processingDate: string;
  paymentDate: string;
  paymentSummary: string;
  scope: "all" | "selected";
  selectedEmployeeIds: number[];
  status: PayrollRunStatus;
  employees: PayrollEmployeeResult[];
  totals: PayrollRunTotals;
  createdAt: string;
  updatedAt: string;
  processedOn: string | null;
  finalizedAt: string | null;
  createdBy: string;
  updatedBy: string;
}

export interface CreatePayrollRunInput {
  cycleId: number;
  periodYear: number;
  periodMonth: number;
  scope: "all" | "selected";
  selectedEmployeeIds?: number[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatPayrollPeriodLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function clampDayInMonth(year: number, month: number, day: CycleDayOfMonth): string {
  const last = new Date(year, month, 0).getDate();
  const n = day === "last_day" ? last : Math.min(Math.max(1, day), last);
  return `${year}-${pad2(month)}-${pad2(n)}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function resolvePayrollScheduleDates(
  cycle: PayrollCycleRecord,
  year: number,
  month: number,
): { processingDate: string; paymentDate: string; paymentSummary: string } {
  const processingDate = clampDayInMonth(year, month, cycle.processingDay);
  let paymentDate = processingDate;
  switch (cycle.salaryPaymentRule) {
    case "same_as_processing":
      paymentDate = processingDate;
      break;
    case "last_day":
      paymentDate = clampDayInMonth(year, month, "last_day");
      break;
    case "fixed_day":
      paymentDate = clampDayInMonth(year, month, cycle.salaryPaymentDay ?? 1);
      break;
    case "next_month_fixed_day": {
      const next = addMonths(year, month, 1);
      paymentDate = clampDayInMonth(next.year, next.month, cycle.salaryPaymentDay ?? 1);
      break;
    }
  }
  return {
    processingDate,
    paymentDate,
    paymentSummary: formatSalaryPaymentSummary(cycle),
  };
}

export function resolvePayrollPeriodWindow(
  cycle: PayrollCycleRecord,
  year: number,
  month: number,
): { attendanceFrom: string; attendanceTo: string; periodDays: number } {
  const resolved = resolveAttendancePeriodForMonth(year, month - 1, cycle);
  if (resolved) {
    return {
      attendanceFrom: resolved.startDate,
      attendanceTo: resolved.endDate,
      periodDays: resolved.periodDays,
    };
  }
  const last = new Date(year, month, 0).getDate();
  return {
    attendanceFrom: `${year}-${pad2(month)}-01`,
    attendanceTo: `${year}-${pad2(month)}-${pad2(last)}`,
    periodDays: last,
  };
}

function money(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return 0;
  return Math.round(n);
}

function expandLeaveToDailyInputs(
  leaves: LeaveRequestRecord[],
  from: string,
  to: string,
): LopLeaveDayInput[] {
  const periodDates = new Set(enumerateDatesInclusive(from, to));
  const out: LopLeaveDayInput[] = [];
  for (const l of leaves) {
    if (String(l.status).toLowerCase() !== "approved") continue;
    const days = enumerateDatesInclusive(l.fromDate.slice(0, 10), l.toDate.slice(0, 10));
    const dayType = String(l.dayType ?? "").toLowerCase();
    const frac = dayType.includes("half") || Number(l.days) === 0.5 ? 0.5 : 1;
    for (const date of days) {
      if (!periodDates.has(date)) continue;
      out.push({
        date,
        leaveType: l.leaveType,
        adjustedAgainst: l.adjustedAgainst || "Unpaid",
        status: "approved",
        dayFraction: frac,
      });
    }
  }
  return out;
}

function summarizeAttendance(
  attendance: LopAttendanceDayInput[],
  leaveDaily: LopLeaveDayInput[],
  from: string,
  to: string,
  lopDays: number,
): PayrollAttendanceSummary {
  const periodDays = enumerateDatesInclusive(from, to).length;
  let present = 0;
  let absent = 0;
  let halfDay = 0;
  let weekOff = 0;
  let holiday = 0;
  let leaveMarked = 0;
  for (const a of attendance) {
    const s = String(a.status).toLowerCase();
    if (s === "present" || s === "wfh") present += 1;
    else if (s === "absent") absent += 1;
    else if (s === "half_day") halfDay += 1;
    else if (s === "week_off") weekOff += 1;
    else if (s === "holiday") holiday += 1;
    else if (s === "leave") leaveMarked += 1;
  }
  let paidLeave = 0;
  let unpaidLeave = 0;
  for (const l of leaveDaily) {
    const against = l.adjustedAgainst.trim().toLowerCase();
    const frac = l.dayFraction ?? 1;
    if (against === "unpaid") unpaidLeave += frac;
    else paidLeave += frac;
  }
  if (paidLeave === 0 && leaveMarked > 0) paidLeave = leaveMarked;

  return {
    attendanceFrom: from,
    attendanceTo: to,
    periodDays,
    workingDays: Math.max(0, periodDays - weekOff - holiday),
    present,
    paidLeave,
    unpaidLeave,
    absent,
    halfDay,
    weekOff,
    holiday,
    lopDays,
    payableDaysNote:
      "Payable / LOP days follow LOP Rules and attendance/leave for this period.",
  };
}

function patchSalaryResolutionWithPayable(
  base: EmployeeSalaryResolution,
  lop: LopDeductionResult,
): EmployeeSalaryResolution {
  const payableById = new Map(
    lop.components.map((c) => [c.componentId, c.payableAmount]),
  );
  const patchLines = (lines: ResolvedSalaryLine[]): ResolvedSalaryLine[] =>
    lines.map((line) => {
      if (line.componentType !== "earning") return line;
      const payable = payableById.get(line.componentId);
      if (payable == null) return line;
      return {
        ...line,
        amount: payable,
        displayAmount: formatInrAmount(payable),
        status: "resolved" as const,
      };
    });
  const earnings = patchLines(base.earnings);
  const configuredEarningsTotal = earnings.reduce(
    (s, e) => s + (e.amount != null && Number.isFinite(e.amount) ? e.amount : 0),
    0,
  );
  return { ...base, earnings, configuredEarningsTotal };
}

function lineHasStatutoryName(name: string, needles: string[]): boolean {
  const n = name.trim().toLowerCase();
  return needles.some((x) => n === x || n.includes(x));
}

function collectStatutoryIssues(
  issues: PayrollIssue[],
  ctx: {
    structureDeductions: ResolvedSalaryLine[];
    structureEmployer: ResolvedSalaryLine[];
    pf: EmployeePfDisplay;
    esi: EmployeeEsiDisplay;
    pt: EmployeePtDisplay;
    lwf: EmployeeLwfDisplay;
    tax: EmployeeTaxDisplay;
  },
): void {
  const names = [...ctx.structureDeductions, ...ctx.structureEmployer].map((l) =>
    l.componentName.toLowerCase(),
  );
  const has = (needles: string[]) =>
    names.some((n) => needles.some((x) => n === x || n.includes(x)));

  if (has(["employee pf", "employer pf"]) && ctx.pf.resolution.status === "not_configured") {
    issues.push({
      code: "pf_missing",
      severity: "blocking",
      message: "PF rule not configured.",
      href: "/hr/settings/statutory/pf",
    });
  }
  if (
    has(["employee esi", "employer esi", "esi"]) &&
    ctx.esi.resolution.status === "not_configured"
  ) {
    issues.push({
      code: "esi_missing",
      severity: "blocking",
      message: "ESI rule not configured.",
      href: "/hr/settings/statutory/esi",
    });
  }
  if (has(["professional tax"])) {
    if (ctx.pt.resolution.status === "not_configured") {
      issues.push({
        code: "pt_missing",
        severity: "blocking",
        message: ctx.pt.state
          ? `Professional Tax rule not configured for ${ctx.pt.state}.`
          : "Professional Tax rule not configured.",
        href: "/hr/settings/statutory/professional-tax",
      });
    }
    if (ctx.pt.resolution.status === "state_missing") {
      issues.push({
        code: "pt_state",
        severity: "blocking",
        message: "Professional Tax state is not available (check Branch).",
        href: "/hr/settings/statutory/professional-tax",
      });
    }
  }
  if (
    has(["employee lwf", "employer lwf", "lwf"]) &&
    ctx.lwf.resolution.status === "not_configured"
  ) {
    issues.push({
      code: "lwf_missing",
      severity: "blocking",
      message: "LWF rule not configured for employee state.",
      href: "/hr/settings/statutory/lwf",
    });
  }
  if (has(["tds"])) {
    const s = ctx.tax.resolution.status;
    if (s === "regime_missing" || s === "slabs_missing" || s === "not_configured") {
      issues.push({
        code: "tds_missing",
        severity: "blocking",
        message: ctx.tax.resolution.message || "Tax / TDS settings incomplete.",
        href: "/hr/settings/tax/tax-regime",
      });
    }
  }
  if (ctx.pf.pfApplicable && !ctx.pf.uan && ctx.pf.resolution.status === "calculated") {
    issues.push({
      code: "missing_uan",
      severity: "warning",
      message: "UAN missing — PF amount calculated from rules.",
    });
  }
}

export function calculateEmployeePayroll(input: {
  employee: HrEmployee;
  cycle: PayrollCycleRecord;
  periodYear: number;
  periodMonth: number;
  attendanceFrom: string;
  attendanceTo: string;
  payrollDate: string;
}): PayrollEmployeeResult {
  const { employee, cycle, periodYear, periodMonth, attendanceFrom, attendanceTo, payrollDate } =
    input;
  const issues: PayrollIssue[] = [];
  const componentsCatalog = loadSalaryComponents();
  const joiningDate = (employee.dateOfJoining || "").slice(0, 10);
  const exitDateGap = true;

  let effectiveFrom = attendanceFrom;
  let effectiveTo = attendanceTo;
  if (joiningDate && joiningDate > attendanceTo) {
    issues.push({
      code: "not_joined",
      severity: "blocking",
      message: `Employee joins on ${joiningDate} — after this payroll period.`,
    });
  } else if (joiningDate && joiningDate > attendanceFrom) {
    effectiveFrom = joiningDate;
  }

  const structure = resolveStructureForEmployee(employee);
  const monthlyCtc = parseMonthlyCtcValue(employee.profileSummaries?.payroll);

  if (!structure) {
    issues.push({
      code: "missing_structure",
      severity: "blocking",
      message: "Missing Salary Structure.",
      href: `/hr/employees/${employee.id}`,
    });
  }
  if (monthlyCtc == null) {
    issues.push({
      code: "missing_ctc",
      severity: "blocking",
      message: "Missing Monthly CTC.",
      href: `/hr/employees/${employee.id}`,
    });
  }

  const eligible = resolveEmployeeMonthlySalary({
    monthlyCtc,
    structure,
    components: componentsCatalog,
  });

  if (eligible.hasCircularDependency || eligible.errorMessage) {
    issues.push({
      code: "structure_error",
      severity: "blocking",
      message: eligible.errorMessage || "Salary structure has a circular dependency.",
    });
  }

  const attRecords = getRecordsForEmployee(employee.id, {
    dateFrom: effectiveFrom,
    dateTo: effectiveTo,
  });
  const attendanceInputs: LopAttendanceDayInput[] = attRecords.map((r) => ({
    date: r.date.slice(0, 10),
    status: r.attendanceStatus,
  }));
  const leaveReqs = getLeaveRequestsForEmployee(employee.id, employee.employeeCode);
  const leaveDaily = expandLeaveToDailyInputs(leaveReqs, effectiveFrom, effectiveTo);

  const salaryBreakup = eligible.earnings
    .filter((e) => e.amount != null)
    .map((e) => ({
      componentId: e.componentId,
      componentName: e.componentName,
      componentType: "earning" as const,
      monthlyEligible: e.amount!,
    }));

  const lop = resolveLopDeduction({
    payrollPeriod: {
      year: periodYear,
      month: periodMonth,
      startDate: effectiveFrom,
      endDate: effectiveTo,
      periodDays: enumerateDatesInclusive(effectiveFrom, effectiveTo).length,
      calendarDays: new Date(periodYear, periodMonth, 0).getDate(),
    },
    employee: { id: employee.id, employeeCode: employee.employeeCode },
    salaryBreakup,
    attendance: attendanceInputs,
    leave: leaveDaily,
    lopSettings: loadLopSettings(),
    payrollCycle: cycle,
    componentsCatalog,
  });

  if (lop.status === "configuration_required") {
    issues.push({
      code: "lop_config",
      severity: "blocking",
      message: lop.message || "LOP could not be resolved — configuration required.",
      href: "/hr/settings/payroll/lop-rules",
    });
  }

  const payableResolution = patchSalaryResolutionWithPayable(eligible, lop);
  const attendance = summarizeAttendance(
    attendanceInputs,
    leaveDaily,
    effectiveFrom,
    effectiveTo,
    lop.daysBreakdown.totalLopDays,
  );

  const earnings: PayrollComponentResult[] = eligible.earnings.map((line) => {
    const lopLine = lop.components.find((c) => c.componentId === line.componentId);
    const monthlyEligible = line.amount;
    const lopDeduction = lopLine?.lopApplicable ? lopLine.lopDeduction : 0;
    const payable =
      lopLine?.lopApplicable && lop.status === "ok"
        ? lopLine.payableAmount
        : monthlyEligible ?? 0;
    return {
      componentId: line.componentId,
      componentName: line.componentName,
      componentType: "earning",
      monthlyEligible,
      lopDeduction: lopLine?.lopApplicable ? lopDeduction : null,
      payableAmount: payable,
      calculationSource: line.displayCalculation,
      amount: money(payable),
      statusLabel: line.status === "resolved" ? "Calculated" : line.status,
    };
  });

  const grossEarnings = earnings.reduce((s, e) => s + e.amount, 0);

  const pf = resolveEmployeePf(employee, {
    structure,
    salaryResolution: payableResolution,
    payrollDate,
  });
  const esi = resolveEmployeeEsi(employee, {
    structure,
    salaryResolution: payableResolution,
    payrollDate,
  });
  const pt = resolveEmployeeProfessionalTax(employee, {
    structure,
    salaryResolution: payableResolution,
    payrollDate,
  });
  const lwf = resolveEmployeeLwf(employee, {
    structure,
    salaryResolution: payableResolution,
    payrollDate,
  });
  const tax = resolveEmployeeTax(employee, {
    structure,
    salaryResolution: payableResolution,
    payrollDate,
  });

  collectStatutoryIssues(issues, {
    structureDeductions: eligible.deductions,
    structureEmployer: eligible.employerContributions,
    pf,
    esi,
    pt,
    lwf,
    tax,
  });

  const deductions: PayrollComponentResult[] = [];
  for (const line of eligible.deductions) {
    const name = line.componentName.trim().toLowerCase();
    let amount = 0;
    let source = line.displayCalculation;
    let statusLabel = "Calculated";

    if (lineHasStatutoryName(name, ["employee pf"])) {
      amount = money(pf.resolution.employeePfAmount);
      source = `PF Rules · ${pf.resolution.status}`;
      statusLabel = pf.resolution.status;
      if (pf.resolution.status === "not_applicable") amount = 0;
      if (pf.resolution.status === "not_configured") {
        amount = 0;
        statusLabel = "Configuration Required";
      }
    } else if (
      lineHasStatutoryName(name, ["employee esi", "esi"]) &&
      !name.includes("employer")
    ) {
      amount = money(esi.resolution.employeeEsiAmount);
      source = `ESI Rules · ${esi.resolution.status}`;
      statusLabel = esi.resolution.status;
      if (
        esi.resolution.status === "not_applicable" ||
        esi.resolution.status === "above_wage_limit" ||
        esi.resolution.status === "disabled"
      ) {
        amount = 0;
      }
      if (esi.resolution.status === "not_configured") {
        amount = 0;
        statusLabel = "Configuration Required";
      }
    } else if (lineHasStatutoryName(name, ["professional tax"])) {
      amount = money(pt.resolution.appliedAmount);
      source = pt.state
        ? `PT · ${pt.state} · ${pt.resolution.status}`
        : `PT · ${pt.resolution.status}`;
      statusLabel = pt.resolution.status;
      if (
        pt.resolution.status === "not_configured" ||
        pt.resolution.status === "state_missing"
      ) {
        amount = 0;
        statusLabel = "Configuration Required";
      }
    } else if (
      lineHasStatutoryName(name, ["employee lwf", "lwf"]) &&
      !name.includes("employer")
    ) {
      amount = money(lwf.resolution.employeeAmount);
      source = `LWF · ${lwf.resolution.status}`;
      statusLabel = lwf.resolution.status;
      if (lwf.resolution.status === "not_due" || lwf.resolution.status === "not_applicable") {
        amount = 0;
      }
      if (lwf.resolution.status === "not_configured") {
        amount = 0;
        statusLabel = "Configuration Required";
      }
    } else if (lineHasStatutoryName(name, ["tds"])) {
      amount = money(tax.resolution.monthlyTdsEstimate);
      source = `Tax Rules · ${tax.resolution.status}`;
      statusLabel = tax.resolution.status;
      if (
        tax.resolution.status === "regime_missing" ||
        tax.resolution.status === "slabs_missing" ||
        tax.resolution.status === "not_configured"
      ) {
        amount = 0;
        statusLabel = "Configuration Required";
      }
    } else if (line.calcMode === "fixed" && line.amount != null) {
      amount = money(line.amount);
      source = line.displayCalculation;
    } else if (line.calcMode === "system") {
      source = "System Calculated";
      statusLabel = "Deferred";
      amount = 0;
    }

    deductions.push({
      componentId: line.componentId,
      componentName: line.componentName,
      componentType: "deduction",
      monthlyEligible: null,
      lopDeduction: null,
      payableAmount: amount,
      calculationSource: source,
      amount,
      statusLabel,
    });
  }

  const employerContributions: PayrollComponentResult[] = [];
  for (const line of eligible.employerContributions) {
    const name = line.componentName.trim().toLowerCase();
    let amount = 0;
    let source = line.displayCalculation;
    let statusLabel = "Calculated";

    if (lineHasStatutoryName(name, ["employer pf"])) {
      amount = money(pf.resolution.employerPfTotal);
      source = `PF Rules · ${pf.resolution.status}`;
      statusLabel = pf.resolution.status;
    } else if (lineHasStatutoryName(name, ["employer esi"])) {
      amount = money(esi.resolution.employerEsiAmount);
      source = `ESI Rules · ${esi.resolution.status}`;
      statusLabel = esi.resolution.status;
      if (
        esi.resolution.status === "not_applicable" ||
        esi.resolution.status === "above_wage_limit"
      ) {
        amount = 0;
      }
    } else if (lineHasStatutoryName(name, ["employer lwf"])) {
      amount = money(lwf.resolution.employerAmount);
      source = `LWF · ${lwf.resolution.status}`;
      statusLabel = lwf.resolution.status;
      if (lwf.resolution.status === "not_due") amount = 0;
    }

    employerContributions.push({
      componentId: line.componentId,
      componentName: line.componentName,
      componentType: "employer_contribution",
      monthlyEligible: null,
      lopDeduction: null,
      payableAmount: amount,
      calculationSource: source,
      amount,
      statusLabel,
    });
  }

  const employeeDeductionsTotal = deductions.reduce((s, d) => s + d.amount, 0);
  const employerContributionsTotal = employerContributions.reduce((s, d) => s + d.amount, 0);
  const netPay = Math.max(0, grossEarnings - employeeDeductionsTotal);
  const blocking = issues.some((i) => i.severity === "blocking");

  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    branch: employee.branch || "—",
    designation: employee.designation || "—",
    structureId: structure?.id ?? null,
    structureName: structure?.name ?? null,
    monthlyCtc,
    payrollCycleId: cycle.id,
    payrollCycleName: cycle.cycleName,
    status: blocking ? "configuration_required" : "calculated",
    issues,
    attendance,
    lopDays: lop.daysBreakdown.totalLopDays,
    lopDeduction: money(lop.totalLopDeduction),
    earnings,
    deductions,
    employerContributions,
    grossEarnings,
    employeeDeductionsTotal,
    employerContributionsTotal,
    netPay,
    employerCost: grossEarnings + employerContributionsTotal,
    snapshot: {
      calculatedAt: new Date().toISOString(),
      payrollDate,
      lopBasis: lop.settings.perDayBasis,
      pfStatus: pf.resolution.status,
      esiStatus: esi.resolution.status,
      ptStatus: pt.resolution.status,
      lwfStatus: lwf.resolution.status,
      tdsStatus: tax.resolution.status,
      joiningDate,
      exitDateGap,
    },
  };
}

function computeTotals(employees: PayrollEmployeeResult[]): PayrollRunTotals {
  return {
    employeeCount: employees.length,
    calculatedCount: employees.filter((e) => e.status === "calculated").length,
    configIssueCount: employees.filter((e) => e.status === "configuration_required").length,
    grossEarnings: employees.reduce((s, e) => s + e.grossEarnings, 0),
    deductions: employees.reduce((s, e) => s + e.employeeDeductionsTotal, 0),
    netPay: employees.reduce((s, e) => s + e.netPay, 0),
    employerContributions: employees.reduce((s, e) => s + e.employerContributionsTotal, 0),
  };
}

function eligibleEmployees(scope: "all" | "selected", selectedIds: number[]): HrEmployee[] {
  const all = loadHrEmployees().filter(
    (e) =>
      e.status === "active" &&
      (e.employmentStatus === "active" ||
        e.employmentStatus === "probation" ||
        e.employmentStatus === "notice"),
  );
  if (scope === "selected") {
    const set = new Set(selectedIds);
    return all.filter((e) => set.has(e.id));
  }
  return all;
}

export function loadPayrollRuns(): PayrollRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as PayrollRun[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function savePayrollRuns(list: PayrollRun[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("hr-payroll-runs-updated"));
}

export function getPayrollRunById(id: string): PayrollRun | undefined {
  return loadPayrollRuns().find((r) => r.id === id);
}

export function findOpenPayrollRun(
  cycleId: number,
  year: number,
  month: number,
): PayrollRun | undefined {
  return loadPayrollRuns().find(
    (r) =>
      r.cycleId === cycleId &&
      r.periodYear === year &&
      r.periodMonth === month &&
      (r.status === "draft" || r.status === "calculated"),
  );
}

export function findFinalizedPayrollRun(
  cycleId: number,
  year: number,
  month: number,
): PayrollRun | undefined {
  return loadPayrollRuns().find(
    (r) =>
      r.cycleId === cycleId &&
      r.periodYear === year &&
      r.periodMonth === month &&
      r.status === "finalized",
  );
}

function nextRunId(): string {
  return `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createOrReusePayrollRun(input: CreatePayrollRunInput): {
  run: PayrollRun | null;
  error?: string;
} {
  const cycles = loadPayrollCycles();
  const cycle = findPayrollCycleById(input.cycleId, cycles);
  if (!cycle || cycle.status !== "active") {
    return { run: null, error: "Select an active Payroll Cycle." };
  }

  const finalized = findFinalizedPayrollRun(
    input.cycleId,
    input.periodYear,
    input.periodMonth,
  );
  if (finalized) {
    return {
      run: finalized,
      error: `A finalized payroll already exists for ${formatPayrollPeriodLabel(input.periodYear, input.periodMonth)} (${cycle.cycleName}).`,
    };
  }

  const existing = findOpenPayrollRun(input.cycleId, input.periodYear, input.periodMonth);
  const window = resolvePayrollPeriodWindow(cycle, input.periodYear, input.periodMonth);
  const schedule = resolvePayrollScheduleDates(cycle, input.periodYear, input.periodMonth);
  const today = policyToday();
  const selectedIds = input.selectedEmployeeIds ?? [];

  if (existing) {
    const updated: PayrollRun = {
      ...existing,
      scope: input.scope,
      selectedEmployeeIds: selectedIds,
      attendanceFrom: window.attendanceFrom,
      attendanceTo: window.attendanceTo,
      processingDate: schedule.processingDate,
      paymentDate: schedule.paymentDate,
      paymentSummary: schedule.paymentSummary,
      updatedAt: today,
      updatedBy: CURRENT_USER,
    };
    savePayrollRuns(loadPayrollRuns().map((r) => (r.id === existing.id ? updated : r)));
    return { run: updated };
  }

  const run: PayrollRun = {
    id: nextRunId(),
    cycleId: cycle.id,
    cycleName: cycle.cycleName,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    periodLabel: formatPayrollPeriodLabel(input.periodYear, input.periodMonth),
    attendanceFrom: window.attendanceFrom,
    attendanceTo: window.attendanceTo,
    processingDate: schedule.processingDate,
    paymentDate: schedule.paymentDate,
    paymentSummary: schedule.paymentSummary,
    scope: input.scope,
    selectedEmployeeIds: selectedIds,
    status: "draft",
    employees: [],
    totals: {
      employeeCount: 0,
      calculatedCount: 0,
      configIssueCount: 0,
      grossEarnings: 0,
      deductions: 0,
      netPay: 0,
      employerContributions: 0,
    },
    createdAt: today,
    updatedAt: today,
    processedOn: null,
    finalizedAt: null,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
  };
  savePayrollRuns([run, ...loadPayrollRuns()]);
  return { run };
}

export function calculatePayrollRun(runId: string): PayrollRun | null {
  const list = loadPayrollRuns();
  const run = list.find((r) => r.id === runId);
  if (!run || run.status === "finalized") return null;

  const cycle = findPayrollCycleById(run.cycleId) ?? getDefaultPayrollCycle();
  if (!cycle) return null;

  const employees = eligibleEmployees(run.scope, run.selectedEmployeeIds);
  const results = employees.map((employee) =>
    calculateEmployeePayroll({
      employee,
      cycle,
      periodYear: run.periodYear,
      periodMonth: run.periodMonth,
      attendanceFrom: run.attendanceFrom,
      attendanceTo: run.attendanceTo,
      payrollDate: run.processingDate || run.attendanceTo,
    }),
  );

  const today = policyToday();
  const updated: PayrollRun = {
    ...run,
    employees: results,
    totals: computeTotals(results),
    status: "calculated",
    processedOn: today,
    updatedAt: today,
    updatedBy: CURRENT_USER,
  };
  savePayrollRuns(list.map((r) => (r.id === runId ? updated : r)));
  createHrNotification({
    eventType: "payroll_ready_for_review",
    sourceModule: "payroll",
    sourceId: updated.id,
    context: { payroll_month: updated.periodLabel },
  });
  return updated;
}

export function finalizePayrollRun(runId: string): { run: PayrollRun | null; error?: string } {
  const list = loadPayrollRuns();
  const run = list.find((r) => r.id === runId);
  if (!run) return { run: null, error: "Payroll run not found." };
  if (run.status === "finalized") return { run, error: "Already finalized." };
  if (run.status !== "calculated") {
    return { run, error: "Calculate payroll before finalizing." };
  }
  if (run.totals.configIssueCount > 0) {
    return {
      run,
      error: `${run.totals.configIssueCount} employee(s) have configuration issues. Resolve before finalize.`,
    };
  }
  if (run.employees.length === 0) {
    return { run, error: "No employees in this payroll run." };
  }

  const today = policyToday();
  const updated: PayrollRun = {
    ...run,
    status: "finalized",
    finalizedAt: today,
    updatedAt: today,
    updatedBy: CURRENT_USER,
  };
  savePayrollRuns(list.map((r) => (r.id === runId ? updated : r)));
  createHrNotification({
    eventType: "payroll_finalized",
    sourceModule: "payroll",
    sourceId: updated.id,
    context: { payroll_month: updated.periodLabel },
  });
  return { run: updated };
}

export function deleteDraftPayrollRun(runId: string): boolean {
  const list = loadPayrollRuns();
  const run = list.find((r) => r.id === runId);
  if (!run || run.status === "finalized") return false;
  savePayrollRuns(list.filter((r) => r.id !== runId));
  return true;
}

export function formatPayrollMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function payrollRunStatusLabel(s: PayrollRunStatus): string {
  if (s === "draft") return "Draft";
  if (s === "calculated") return "Calculated";
  return "Finalized";
}

export function payrollEmployeeStatusLabel(s: PayrollEmployeeStatus): string {
  if (s === "ready") return "Ready";
  if (s === "calculated") return "Calculated";
  if (s === "configuration_required") return "Configuration Required";
  return "Error";
}

export function listOpenPayrollRuns(): PayrollRun[] {
  return loadPayrollRuns()
    .filter((r) => r.status === "draft" || r.status === "calculated")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listFinalizedPayrollRuns(): PayrollRun[] {
  return loadPayrollRuns()
    .filter((r) => r.status === "finalized")
    .sort((a, b) => (b.finalizedAt ?? "").localeCompare(a.finalizedAt ?? ""));
}

/** Prefer finalized run for period; else latest open (calculated/draft). */
export function findPayrollRunForPeriod(
  year: number,
  month: number,
): PayrollRun | null {
  const runs = loadPayrollRuns().filter(
    (r) => r.periodYear === year && r.periodMonth === month,
  );
  if (!runs.length) return null;
  const finalized = runs
    .filter((r) => r.status === "finalized")
    .sort((a, b) => (b.finalizedAt ?? "").localeCompare(a.finalizedAt ?? ""))[0];
  if (finalized) return finalized;
  return runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export interface PayrollComponentAggregate {
  name: string;
  amount: number;
  type: "earning" | "deduction" | "employer_contribution";
}

/** Aggregate component lines across calculated employees in a run. */
export function aggregatePayrollComponentTotals(
  run: PayrollRun,
): PayrollComponentAggregate[] {
  const map = new Map<string, PayrollComponentAggregate>();
  const add = (line: PayrollComponentResult) => {
    const key = `${line.componentType}::${line.componentName}`;
    const prev = map.get(key);
    if (prev) prev.amount += line.amount;
    else {
      map.set(key, {
        name: line.componentName,
        amount: line.amount,
        type: line.componentType,
      });
    }
  };
  for (const emp of run.employees) {
    if (emp.status !== "calculated") continue;
    emp.earnings.forEach(add);
    emp.deductions.forEach(add);
    emp.employerContributions.forEach(add);
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

/** Unique blocking/warning issues from employees (for Pending Actions). */
export function collectPayrollPendingActions(run: PayrollRun | null): PayrollIssue[] {
  if (!run) return [];
  const seen = new Set<string>();
  const out: PayrollIssue[] = [];
  for (const emp of run.employees) {
    for (const issue of emp.issues) {
      const key = `${issue.code}::${issue.message}::${issue.href ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(issue);
    }
  }
  return out.sort((a, b) => {
    if (a.severity === b.severity) return a.message.localeCompare(b.message);
    return a.severity === "blocking" ? -1 : 1;
  });
}
