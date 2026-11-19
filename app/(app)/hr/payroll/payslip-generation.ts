/**
 * Payslip snapshot generation from finalized payroll runs.
 * Uses Template Management payslip template + generated documents store.
 */

import { createHrNotification } from "@/lib/hr/hr-notifications";
import {
  buildPayrollBlockRenderData,
  buildPayrollResultTemplateContext,
  createGeneratedHrDocument,
  getDefaultTemplateByType,
  getActiveTemplatesByType,
  loadGeneratedHrDocuments,
  type HrTemplateRecord,
} from "@/app/(app)/hr/settings/hr-template-data";
import {
  getPayrollRunById,
  listFinalizedPayrollRuns,
  type PayrollEmployeeResult,
  type PayrollRun,
} from "./payroll-run-data";

function resolvePayslipTemplate(): HrTemplateRecord | null {
  return (
    getDefaultTemplateByType("payslip") ??
    getActiveTemplatesByType("payslip")[0] ??
    null
  );
}

export function buildPayslipPayloadForEmployee(
  run: PayrollRun,
  row: PayrollEmployeeResult,
): {
  ctx: ReturnType<typeof buildPayrollResultTemplateContext>;
  blockData: ReturnType<typeof buildPayrollBlockRenderData>;
} {
  const payableDays = Math.max(0, (row.attendance?.periodDays ?? 0) - (row.lopDays ?? 0));
  const earnings = row.earnings.map((e) => ({
    name: e.componentName,
    amount: e.amount,
    monthlyEligible: e.monthlyEligible,
    lopDeduction: e.lopDeduction,
  }));
  const deductions = row.deductions.map((e) => ({
    name: e.componentName,
    amount: e.amount,
  }));
  const employerContributions = row.employerContributions.map((e) => ({
    name: e.componentName,
    amount: e.amount,
  }));
  const ctx = buildPayrollResultTemplateContext({
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    designation: row.designation,
    branch: row.branch,
    joiningDate: row.snapshot.joiningDate,
    monthlyCtc: row.monthlyCtc,
    periodLabel: run.periodLabel,
    attendanceFrom: run.attendanceFrom,
    attendanceTo: run.attendanceTo,
    payableDays,
    lopDays: row.lopDays,
    earnings,
    deductions,
    employerContributions,
    grossEarnings: row.grossEarnings,
    employeeDeductionsTotal: row.employeeDeductionsTotal,
    employerContributionsTotal: row.employerContributionsTotal,
    netPay: row.netPay,
  });
  const blockData = buildPayrollBlockRenderData({
    employeeName: row.employeeName,
    payableDays,
    lopDays: row.lopDays,
    earnings,
    deductions,
    employerContributions,
    grossEarnings: row.grossEarnings,
    employeeDeductionsTotal: row.employeeDeductionsTotal,
    employerContributionsTotal: row.employerContributionsTotal,
    netPay: row.netPay,
    employerCost: row.employerCost,
    attendance: {
      periodDays: row.attendance.periodDays,
      workingDays: row.attendance.workingDays,
      present: row.attendance.present,
      paidLeave: row.attendance.paidLeave,
      unpaidLeave: row.attendance.unpaidLeave,
      absent: row.attendance.absent,
      halfDay: row.attendance.halfDay,
      weekOff: row.attendance.weekOff,
      holiday: row.attendance.holiday,
      lopDays: row.lopDays,
      payableDays,
    },
  });
  return { ctx, blockData };
}

function existingPayslipKey(runId: string, employeeCode: string): string {
  return `${runId}::${employeeCode.trim().toLowerCase()}`;
}

function existingPayslipKeys(): Set<string> {
  const keys = new Set<string>();
  for (const d of loadGeneratedHrDocuments()) {
    if (d.templateType !== "payslip" && d.sourceModule !== "payroll") continue;
    if (!d.payrollRunId) continue;
    keys.add(existingPayslipKey(d.payrollRunId, d.employeeCode));
  }
  return keys;
}

/**
 * Create payslip snapshots for employees in a finalized run (skips existing).
 */
export function generatePayslipsForFinalizedRun(
  runId: string,
  options?: { notify?: boolean; template?: HrTemplateRecord | null },
): { created: number; skipped: number; error?: string } {
  const run = getPayrollRunById(runId);
  if (!run) return { created: 0, skipped: 0, error: "Payroll run not found." };
  if (run.status !== "finalized") {
    return { created: 0, skipped: 0, error: "Payroll must be finalized before generating payslips." };
  }
  const tpl = options?.template ?? resolvePayslipTemplate();
  if (!tpl) {
    return {
      created: 0,
      skipped: 0,
      error: "No active Payslip template. Configure in Template Management.",
    };
  }

  const existing = existingPayslipKeys();
  let created = 0;
  let skipped = 0;
  const notify = options?.notify !== false;

  for (const row of run.employees) {
    if (row.status === "configuration_required") {
      skipped += 1;
      continue;
    }
    const key = existingPayslipKey(run.id, row.employeeCode);
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    const { ctx, blockData } = buildPayslipPayloadForEmployee(run, row);
    createGeneratedHrDocument({
      template: tpl,
      context: ctx,
      blockData,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      employeeId: row.employeeId,
      sourceModule: "payroll",
      status: "generated",
      payrollRunId: run.id,
      documentTitle: `Payslip — ${run.periodLabel} — ${row.employeeName}`,
    });
    existing.add(key);
    created += 1;
    if (notify) {
      createHrNotification({
        eventType: "payslip_generated",
        employeeId: row.employeeId,
        sourceModule: "payroll",
        sourceId: run.id,
        context: {
          employee_name: row.employeeName,
          payroll_month: run.periodLabel,
        },
      });
      createHrNotification({
        eventType: "payslip_available",
        employeeId: row.employeeId,
        sourceModule: "payroll",
        sourceId: run.id,
        context: {
          employee_name: row.employeeName,
          payroll_month: run.periodLabel,
        },
      });
    }
  }

  return { created, skipped };
}

/** Generate missing payslips across all finalized runs. */
export function generateMissingPayslipsFromFinalizedRuns(options?: {
  notify?: boolean;
}): { created: number; skipped: number; runs: number; error?: string } {
  const tpl = resolvePayslipTemplate();
  if (!tpl) {
    return {
      created: 0,
      skipped: 0,
      runs: 0,
      error: "No active Payslip template. Configure in Template Management.",
    };
  }
  const runs = listFinalizedPayrollRuns();
  let created = 0;
  let skipped = 0;
  for (const run of runs) {
    const r = generatePayslipsForFinalizedRun(run.id, {
      notify: options?.notify,
      template: tpl,
    });
    created += r.created;
    skipped += r.skipped;
  }
  return { created, skipped, runs: runs.length };
}
