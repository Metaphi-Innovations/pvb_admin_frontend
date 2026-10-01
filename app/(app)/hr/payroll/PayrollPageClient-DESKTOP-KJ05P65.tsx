"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Eye, Plus, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { HrSuccessToast } from "@/app/(app)/hr/components/HrSuccessToast";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import {
  HrConfirmDialog,
  HrFormDrawer,
  HrOrgField,
  hrBtn,
  hrInput,
} from "@/app/(app)/hr/settings/organization/_components";
import {
  getDefaultPayrollCycle,
  loadPayrollCycles,
} from "@/app/(app)/hr/settings/payroll-cycle-data";
import { loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import {
  calculatePayrollRun,
  createOrReusePayrollRun,
  deleteDraftPayrollRun,
  finalizePayrollRun,
  employeePayableDays,
  employeeStatutoryDeductionsTotal,
  employeeTdsAmount,
  formatPayrollMoney,
  formatPayrollPeriodLabel,
  getPayrollRunById,
  listFinalizedPayrollRuns,
  listOpenPayrollRuns,
  payrollEmployeeStatusLabel,
  payrollRunStatusLabel,
  resolvePayrollPeriodWindow,
  resolvePayrollScheduleDates,
  type PayrollEmployeeResult,
  type PayrollEmployeeStatus,
  type PayrollRun,
  type PayrollRunStatus,
} from "./payroll-run-data";
import {
  buildPayrollResultTemplateContext,
  buildPayrollBlockRenderData,
  createGeneratedHrDocument,
  getActiveTemplatesByType,
  getDefaultTemplateByType,
  renderHrTemplate,
  type HrTemplateRecord,
  type RenderedTemplateDocument,
} from "@/app/(app)/hr/settings/hr-template-data";

type TabId = "runs" | "process" | "history";

export type PayrollOpsView = "run" | "history";

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "brand" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "brand"
        ? "bg-brand-50 text-brand-700"
        : tone === "warn"
          ? "bg-amber-50 text-amber-700"
          : tone === "danger"
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold", cls)}>
      {label}
    </span>
  );
}

function runTone(s: PayrollRunStatus): "neutral" | "brand" | "success" {
  if (s === "finalized") return "success";
  if (s === "calculated") return "brand";
  return "neutral";
}

function empTone(s: PayrollEmployeeStatus): "success" | "warn" | "danger" | "neutral" {
  if (s === "calculated") return "success";
  if (s === "configuration_required") return "warn";
  if (s === "error") return "danger";
  return "neutral";
}

function MoneyCell({ value }: { value: number }) {
  return <span className="tabular-nums text-right block">{formatPayrollMoney(value)}</span>;
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-sm min-w-0">
      <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums mt-0.5 leading-none",
          accent ? "text-brand-700" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border mb-3">
      {children}
    </p>
  );
}

function EmployeeDetailDrawer({
  open,
  onClose,
  row,
  run,
}: {
  open: boolean;
  onClose: () => void;
  row: PayrollEmployeeResult | null;
  run: PayrollRun | null;
}) {
  const [payslipPreview, setPayslipPreview] = useState<RenderedTemplateDocument | null>(null);
  const [payslipTpl, setPayslipTpl] = useState<HrTemplateRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const payslipTemplates = useMemo(() => getActiveTemplatesByType("payslip"), [open]);

  if (!row) return null;

  const buildPayslipCtxAndBlocks = () => {
    if (!run) return null;
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
  };

  const openPayslipPreview = (tplId?: number) => {
    const tpl =
      (tplId != null ? payslipTemplates.find((t) => t.id === tplId) : null) ??
      getDefaultTemplateByType("payslip") ??
      payslipTemplates[0] ??
      null;
    const built = buildPayslipCtxAndBlocks();
    if (!tpl || !built) {
      setToast("No active Payslip template. Configure in Template Management.");
      return;
    }
    setPayslipTpl(tpl);
    setPayslipPreview(renderHrTemplate(tpl, built.ctx, built.blockData));
  };

  const savePayslipSnapshot = () => {
    if (!payslipTpl) return;
    const built = buildPayslipCtxAndBlocks();
    if (!built || !run) return;
    createGeneratedHrDocument({
      template: payslipTpl,
      context: built.ctx,
      blockData: built.blockData,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      sourceModule: "payroll",
      status: "generated",
      payrollRunId: run.id,
    });
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
    setToast("Payslip snapshot saved. Later template edits will not change this document.");
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[720px] flex flex-col p-0 gap-0">
        <SheetHeader>
          <SheetTitle>{row.employeeName}</SheetTitle>
          <SheetDescription>
            {row.employeeCode} · {run?.periodLabel ?? "Payroll"}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-muted-foreground flex-1 min-w-[140px]">
              Payslip layout from{" "}
              <Link
                href="/hr/settings/templates?type=payslip"
                className="font-medium text-brand-700 hover:underline"
              >
                Template Management
              </Link>
              {payslipTemplates.length > 1 ? " · select template below" : ""}
            </p>
            {payslipTemplates.length > 1 ? (
              <Select
                defaultValue={String(
                  getDefaultTemplateByType("payslip")?.id ?? payslipTemplates[0]?.id ?? "",
                )}
                onValueChange={(v) => openPayslipPreview(Number(v))}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Payslip template" />
                </SelectTrigger>
                <SelectContent>
                  {payslipTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                      {t.name}
                      {t.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={hrBtn("gap-1.5")}
              onClick={() => openPayslipPreview()}
            >
              <Eye className="w-3.5 h-3.5" /> Preview Payslip
            </Button>
          </div>

          <div>
            <SectionTitle>Employee</SectionTitle>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Branch</p>
                <p className="font-medium">{row.branch}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Designation</p>
                <p className="font-medium">{row.designation}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Salary Structure</p>
                <p className="font-medium">{row.structureName ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payroll Cycle</p>
                <p className="font-medium">{row.payrollCycleName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly CTC</p>
                <p className="font-medium tabular-nums">{formatPayrollMoney(row.monthlyCtc)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <StatusPill
                  label={payrollEmployeeStatusLabel(row.status)}
                  tone={empTone(row.status)}
                />
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Payroll Period</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Attendance</p>
                <p className="font-medium">
                  {row.attendance.attendanceFrom} – {row.attendance.attendanceTo}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Processing Date</p>
                <p className="font-medium">{run?.processingDate ?? "—"}</p>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Attendance</SectionTitle>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
              {[
                ["Period Days", row.attendance.periodDays],
                ["Working Days", row.attendance.workingDays ?? "—"],
                ["Present", row.attendance.present],
                ["Paid Leave", row.attendance.paidLeave],
                ["Unpaid Leave", row.attendance.unpaidLeave],
                ["Absent", row.attendance.absent],
                ["Half Day", row.attendance.halfDay],
                ["LOP Days", row.lopDays],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-border px-2.5 py-2">
                  <p className="text-[10px] text-muted-foreground">{k}</p>
                  <p className="font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              LOP deduction: {formatPayrollMoney(row.lopDeduction)}.{" "}
              {row.attendance.payableDaysNote}
            </p>
            {row.snapshot.exitDateGap ? (
              <p className="text-[11px] text-amber-700 mt-1">
                Exit/last working date is not on employee master — mid-month exit not auto-clipped.
              </p>
            ) : null}
          </div>

          {row.issues.length > 0 ? (
            <div>
              <SectionTitle>Issues</SectionTitle>
              <ul className="space-y-1.5">
                {row.issues.map((iss) => (
                  <li
                    key={iss.code + iss.message}
                    className={cn(
                      "text-xs rounded-lg px-2.5 py-2 border",
                      iss.severity === "blocking"
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-muted/30 border-border text-muted-foreground",
                    )}
                  >
                    {iss.message}
                    {iss.href ? (
                      <>
                        {" "}
                        <Link href={iss.href} className="text-brand-700 font-medium hover:underline">
                          Configure
                        </Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <SectionTitle>Earnings</SectionTitle>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium py-1.5">Component</th>
                  <th className="text-right font-medium py-1.5">Eligible</th>
                  <th className="text-right font-medium py-1.5">LOP</th>
                  <th className="text-right font-medium py-1.5">Payable</th>
                </tr>
              </thead>
              <tbody>
                {row.earnings.map((e) => (
                  <tr key={e.componentId} className="border-b border-border/50">
                    <td className="py-1.5">
                      <p className="font-medium">{e.componentName}</p>
                      <p className="text-[10px] text-muted-foreground">{e.calculationSource}</p>
                    </td>
                    <td className="text-right tabular-nums">
                      {formatPayrollMoney(e.monthlyEligible)}
                    </td>
                    <td className="text-right tabular-nums text-red-600">
                      {e.lopDeduction != null && e.lopDeduction > 0
                        ? `-${formatPayrollMoney(e.lopDeduction).replace("₹", "₹")}`
                        : "—"}
                    </td>
                    <td className="text-right tabular-nums font-semibold">
                      {formatPayrollMoney(e.payableAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <SectionTitle>Employee Deductions</SectionTitle>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium py-1.5">Component</th>
                  <th className="text-left font-medium py-1.5">Source</th>
                  <th className="text-right font-medium py-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {row.deductions.map((d) => (
                  <tr key={d.componentId} className="border-b border-border/50">
                    <td className="py-1.5 font-medium">{d.componentName}</td>
                    <td className="py-1.5 text-muted-foreground">{d.calculationSource}</td>
                    <td className="text-right tabular-nums">{formatPayrollMoney(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <SectionTitle>Employer Contributions</SectionTitle>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium py-1.5">Component</th>
                  <th className="text-left font-medium py-1.5">Source</th>
                  <th className="text-right font-medium py-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {row.employerContributions.map((d) => (
                  <tr key={d.componentId} className="border-b border-border/50">
                    <td className="py-1.5 font-medium">{d.componentName}</td>
                    <td className="py-1.5 text-muted-foreground">{d.calculationSource}</td>
                    <td className="text-right tabular-nums">{formatPayrollMoney(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-muted-foreground mt-2">
              Employer contributions do not reduce Net Pay.
            </p>
          </div>

          <div>
            <SectionTitle>Payroll Summary</SectionTitle>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Earnings</span>
                <span className="font-semibold tabular-nums">
                  {formatPayrollMoney(row.grossEarnings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee Deductions</span>
                <span className="tabular-nums">
                  {formatPayrollMoney(row.employeeDeductionsTotal)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="font-semibold">Net Pay</span>
                <span className="font-bold text-brand-700 tabular-nums">
                  {formatPayrollMoney(row.netPay)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Employer Contributions</span>
                <span className="tabular-nums">
                  {formatPayrollMoney(row.employerContributionsTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employer Cost</span>
                <span className="tabular-nums font-medium">
                  {formatPayrollMoney(row.employerCost)}
                </span>
              </div>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" size="sm" className={hrBtn()} onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <Sheet open={!!payslipPreview} onOpenChange={(o) => !o && setPayslipPreview(null)}>
      <SheetContent className="w-full sm:max-w-[640px] flex flex-col p-0 gap-0">
        <SheetHeader>
          <SheetTitle>Payslip Preview</SheetTitle>
          <SheetDescription>
            {payslipTpl?.name ?? "Payslip"} · {row.employeeName} · {run?.periodLabel}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {payslipPreview ? (
            <div className="mx-auto max-w-[560px] bg-white border border-border rounded-lg shadow-sm p-6 text-xs space-y-3 min-h-[60vh]">
              {payslipPreview.useCompanyLogo && payslipPreview.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={payslipPreview.logoUrl} alt="" className="h-10 object-contain" />
              ) : null}
              <p className="text-sm font-semibold text-navy-700">
                {payslipPreview.header || payslipPreview.subject}
              </p>
              {payslipPreview.unknownPlaceholders.length > 0 ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  Unknown field(s):{" "}
                  {payslipPreview.unknownPlaceholders.map((k) => `{{${k}}}`).join(", ")}
                </p>
              ) : null}
              <div dangerouslySetInnerHTML={{ __html: payslipPreview.body }} />
              <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                {payslipPreview.footer}
              </p>
            </div>
          ) : null}
        </SheetBody>
        <SheetFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={hrBtn()}
            onClick={() => setPayslipPreview(null)}
          >
            Close
          </Button>
          <Button type="button" size="sm" className={hrBtn("", true)} onClick={savePayslipSnapshot}>
            Save Snapshot
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {toast ? (
      <div className="fixed bottom-5 right-5 z-[100] bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl">
        {toast}
        <button type="button" className="ml-3 underline" onClick={() => setToast(null)}>
          Dismiss
        </button>
      </div>
    ) : null}
    </>
  );
}

export default function PayrollPageClient({
  view = "run",
}: {
  view?: PayrollOpsView;
}) {
  const [tab, setTab] = useState<TabId>(view === "history" ? "history" : "process");
  const [openRuns, setOpenRuns] = useState<PayrollRun[]>([]);
  const [history, setHistory] = useState<PayrollRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [detail, setDetail] = useState<PayrollEmployeeResult | null>(null);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PayrollEmployeeStatus>("all");
  const [busy, setBusy] = useState(false);

  const cycles = useMemo(() => loadPayrollCycles().filter((c) => c.status === "active"), []);
  const defaultCycle = useMemo(() => getDefaultPayrollCycle(cycles), [cycles]);

  const [setupCycleId, setSetupCycleId] = useState<string>("");
  const [setupYear, setSetupYear] = useState(String(new Date().getFullYear()));
  const [setupMonth, setSetupMonth] = useState(String(new Date().getMonth() + 1));
  const [setupScope, setSetupScope] = useState<"all" | "selected">("all");
  const [setupSelected, setSetupSelected] = useState<number[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  const refreshLists = useCallback(() => {
    setOpenRuns(listOpenPayrollRuns());
    setHistory(listFinalizedPayrollRuns());
    if (activeRunId) {
      setActiveRun(getPayrollRunById(activeRunId) ?? null);
    }
  }, [activeRunId]);

  useEffect(() => {
    setTab(view === "history" ? "history" : "process");
  }, [view]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    const onUpd = () => refreshLists();
    window.addEventListener("hr-payroll-runs-updated", onUpd);
    return () => window.removeEventListener("hr-payroll-runs-updated", onUpd);
  }, [refreshLists]);

  useEffect(() => {
    if (!setupCycleId && defaultCycle) setSetupCycleId(String(defaultCycle.id));
  }, [defaultCycle, setupCycleId]);

  const setupPreview = useMemo(() => {
    const cycle = cycles.find((c) => String(c.id) === setupCycleId);
    if (!cycle) return null;
    const y = Number(setupYear);
    const m = Number(setupMonth);
    if (!y || !m) return null;
    const window = resolvePayrollPeriodWindow(cycle, y, m);
    const schedule = resolvePayrollScheduleDates(cycle, y, m);
    return { window, schedule, label: formatPayrollPeriodLabel(y, m) };
  }, [cycles, setupCycleId, setupYear, setupMonth]);

  const employees = useMemo(() => loadHrEmployees().filter((e) => e.status === "active"), []);

  const filteredEmployees = useMemo(() => {
    if (!activeRun) return [];
    let list = activeRun.employees;
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    if (branchFilter !== "all") list = list.filter((e) => e.branch === branchFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeRun, search, branchFilter, statusFilter]);

  const branches = useMemo(() => {
    const set = new Set((activeRun?.employees ?? []).map((e) => e.branch).filter(Boolean));
    return Array.from(set).sort();
  }, [activeRun]);

  const openSetup = () => {
    setSetupError(null);
    setSetupScope("all");
    setSetupSelected([]);
    setSetupOpen(true);
  };

  const handleCreateRun = () => {
    setSetupError(null);
    const cycleId = Number(setupCycleId);
    const year = Number(setupYear);
    const month = Number(setupMonth);
    if (!cycleId || !year || !month) {
      setSetupError("Payroll Cycle and period are required.");
      return;
    }
    if (setupScope === "selected" && setupSelected.length === 0) {
      setSetupError("Select at least one employee.");
      return;
    }
    const { run, error } = createOrReusePayrollRun({
      cycleId,
      periodYear: year,
      periodMonth: month,
      scope: setupScope,
      selectedEmployeeIds: setupSelected,
    });
    if (error && (!run || run.status === "finalized")) {
      setSetupError(error);
      return;
    }
    if (!run) {
      setSetupError(error || "Could not create payroll run.");
      return;
    }
    setActiveRunId(run.id);
    setActiveRun(run);
    setSetupOpen(false);
    setTab("process");
    refreshLists();
    setToast(
      run.employees.length
        ? "Payroll run opened — recalculate if needed."
        : "Payroll run ready. Click Calculate Payroll.",
    );
  };

  const openProcess = (run: PayrollRun) => {
    setActiveRunId(run.id);
    setActiveRun(run);
    setTab("process");
  };

  const handleCalculate = () => {
    if (!activeRunId) return;
    setBusy(true);
    const updated = calculatePayrollRun(activeRunId);
    setBusy(false);
    if (!updated) {
      setToast("Could not calculate — run may be finalized.");
      return;
    }
    setActiveRun(updated);
    refreshLists();
    setToast(
      updated.totals.configIssueCount > 0
        ? `Calculated with ${updated.totals.configIssueCount} configuration issue(s).`
        : "Payroll calculated. Review before finalize.",
    );
  };

  const handleFinalize = () => {
    if (!activeRunId) return;
    const { run, error } = finalizePayrollRun(activeRunId);
    setFinalizeOpen(false);
    if (error) {
      setToast(error);
      return;
    }
    if (run) {
      setActiveRun(run);
      refreshLists();
      setToast("Payroll finalized.");
    }
  };

  const pageTitle = view === "history" ? "Payroll History" : "Run Payroll";
  const pageDescription =
    view === "history"
      ? "Finalized payroll periods and historical register."
      : "Calculate and finalize employee payroll for a period.";

  return (
    <HrPageShell
      title={pageTitle}
      description={pageDescription}
      icon={Wallet}
      breadcrumbs={hrBreadcrumb(
        { label: "Payroll", href: "/hr/payroll" },
        {
          label: view === "history" ? "Payroll History" : "Run Payroll",
          href: view === "history" ? "/hr/payroll/history" : "/hr/payroll/run",
        },
      )}
      maxWidthClass="max-w-[1400px]"
      actions={
        view === "run" ? (
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openSetup}>
            <Plus className="w-3.5 h-3.5" /> Process Payroll
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {view === "run" && !activeRun ? (
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {[
                      "Payroll Period",
                      "Payroll Cycle",
                      "Employees",
                      "Gross Pay",
                      "Deductions",
                      "Net Pay",
                      "Status",
                      "Processed On",
                      "",
                    ].map((h) => (
                      <th
                        key={h || "a"}
                        className={cn(
                          "px-3 py-2.5 font-semibold text-foreground whitespace-nowrap",
                          ["Gross Pay", "Deductions", "Net Pay", "Employees"].includes(h)
                            ? "text-right"
                            : "text-left",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openRuns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                        No open payroll runs. Use Process Payroll to start.
                      </td>
                    </tr>
                  ) : (
                    openRuns.map((r) => (
                      <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-3 py-2 font-semibold">{r.periodLabel}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.cycleName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.totals.employeeCount || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <MoneyCell value={r.totals.grossEarnings} />
                        </td>
                        <td className="px-3 py-2">
                          <MoneyCell value={r.totals.deductions} />
                        </td>
                        <td className="px-3 py-2">
                          <MoneyCell value={r.totals.netPay} />
                        </td>
                        <td className="px-3 py-2">
                          <StatusPill
                            label={payrollRunStatusLabel(r.status)}
                            tone={runTone(r.status)}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.processedOn ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={hrBtn("h-7 text-[11px]")}
                            onClick={() => openProcess(r)}
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeRun ? (
            <div className="space-y-3">
              {view === "history" ? (
                <button
                  type="button"
                  className="text-xs text-brand-700 hover:underline"
                  onClick={() => {
                    setActiveRun(null);
                    setActiveRunId(null);
                  }}
                >
                  ← Back to Payroll History
                </button>
              ) : null}
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {activeRun.periodLabel} · {activeRun.cycleName}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Attendance {activeRun.attendanceFrom} – {activeRun.attendanceTo} · Process{" "}
                      {activeRun.processingDate} · Pay {activeRun.paymentDate}
                    </p>
                    <div className="mt-1.5">
                      <StatusPill
                        label={payrollRunStatusLabel(activeRun.status)}
                        tone={runTone(activeRun.status)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeRun.status !== "finalized" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={hrBtn("gap-1.5")}
                          disabled={busy}
                          onClick={handleCalculate}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {activeRun.status === "calculated" ? "Recalculate" : "Calculate Payroll"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className={hrBtn("gap-1.5", true)}
                          disabled={
                            activeRun.status !== "calculated" ||
                            activeRun.totals.configIssueCount > 0 ||
                            activeRun.employees.length === 0
                          }
                          onClick={() => setFinalizeOpen(true)}
                        >
                          Finalize Payroll
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <Kpi label="Employees" value={String(activeRun.totals.employeeCount)} />
                <Kpi
                  label="Gross Earnings"
                  value={formatPayrollMoney(activeRun.totals.grossEarnings)}
                />
                <Kpi
                  label="Deductions"
                  value={formatPayrollMoney(activeRun.totals.deductions)}
                />
                <Kpi
                  label="Net Pay"
                  value={formatPayrollMoney(activeRun.totals.netPay)}
                  accent
                />
                <button
                  type="button"
                  className="text-left"
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === "configuration_required"
                        ? "all"
                        : "configuration_required",
                    )
                  }
                >
                  <Kpi
                    label="Configuration Issues"
                    value={String(activeRun.totals.configIssueCount)}
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee…"
                  className={cn(hrInput(), "h-8 w-52 text-xs")}
                />
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className={cn(hrInput(), "h-8 w-40 text-xs")}>
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Branches
                    </SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b} value={b} className="text-xs">
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                  <SelectTrigger className={cn(hrInput(), "h-8 w-48 text-xs")}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Statuses
                    </SelectItem>
                    <SelectItem value="calculated" className="text-xs">
                      Calculated
                    </SelectItem>
                    <SelectItem value="configuration_required" className="text-xs">
                      Configuration Required
                    </SelectItem>
                    <SelectItem value="error" className="text-xs">
                      Error
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        {[
                          "Employee",
                          "Payable Days",
                          "LOP Days",
                          "Gross",
                          "Deductions",
                          "Statutory",
                          "TDS",
                          "Net Pay",
                          "Status",
                          "",
                        ].map((h) => (
                          <th
                            key={h || "x"}
                            className={cn(
                              "px-3 py-2.5 font-semibold whitespace-nowrap",
                              [
                                "Payable Days",
                                "LOP Days",
                                "Gross",
                                "Deductions",
                                "Statutory",
                                "TDS",
                                "Net Pay",
                              ].includes(h)
                                ? "text-right"
                                : "text-left",
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeRun.employees.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                            Click Calculate Payroll to build employee results.
                          </td>
                        </tr>
                      ) : filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                            No employees match filters.
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((e) => (
                          <tr
                            key={e.employeeId}
                            className="border-b border-border/60 hover:bg-muted/20"
                          >
                            <td className="px-3 py-2">
                              <p className="font-semibold">{e.employeeName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {e.employeeCode} · {e.branch}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {employeePayableDays(e)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{e.lopDays}</td>
                            <td className="px-3 py-2">
                              <MoneyCell value={e.grossEarnings} />
                            </td>
                            <td className="px-3 py-2">
                              <MoneyCell value={e.employeeDeductionsTotal} />
                            </td>
                            <td className="px-3 py-2">
                              <MoneyCell value={employeeStatutoryDeductionsTotal(e)} />
                            </td>
                            <td className="px-3 py-2">
                              <MoneyCell value={employeeTdsAmount(e)} />
                            </td>
                            <td className="px-3 py-2">
                              <MoneyCell value={e.netPay} />
                            </td>
                            <td className="px-3 py-2">
                              <StatusPill
                                label={payrollEmployeeStatusLabel(e.status)}
                                tone={empTone(e.status)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                className="p-1.5 rounded-md hover:bg-muted"
                                onClick={() => setDetail(e)}
                                aria-label="View"
                              >
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {activeRun.status !== "finalized" ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={hrBtn("text-red-600")}
                    onClick={() => {
                      if (deleteDraftPayrollRun(activeRun.id)) {
                        setActiveRun(null);
                        setActiveRunId(null);
                        refreshLists();
                        setToast("Draft payroll run removed.");
                      }
                    }}
                  >
                    Discard Draft
                  </Button>
                </div>
              ) : null}
            </div>
        ) : null}

        {view === "history" && !activeRun ? (
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {[
                      "Period",
                      "Cycle",
                      "Employees",
                      "Gross",
                      "Deductions",
                      "Net Pay",
                      "Employer Contrib.",
                      "Finalized On",
                      "",
                    ].map((h) => (
                      <th
                        key={h || "h"}
                        className={cn(
                          "px-3 py-2.5 font-semibold whitespace-nowrap",
                          [
                            "Employees",
                            "Gross",
                            "Deductions",
                            "Net Pay",
                            "Employer Contrib.",
                          ].includes(h)
                            ? "text-right"
                            : "text-left",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                        No finalized payroll yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((r) => (
                      <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-3 py-2 font-semibold">{r.periodLabel}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.cycleName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.totals.employeeCount}
                        </td>
                        <td className="px-3 py-2">
                          <MoneyCell value={r.totals.grossEarnings} />
                        </td>
                        <td className="px-3 py-2">
                          <MoneyCell value={r.totals.deductions} />
                        </td>
                        <td className="px-3 py-2">
                          <MoneyCell value={r.totals.netPay} />
                        </td>
                        <td className="px-3 py-2">
                          <MoneyCell value={r.totals.employerContributions} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.finalizedAt ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={hrBtn("h-7 text-[11px]")}
                            onClick={() => openProcess(r)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <HrFormDrawer
        open={setupOpen}
        onOpenChange={(o) => !o && setSetupOpen(false)}
        title="Process Payroll"
        description="Select cycle, period, and employee scope. Attendance window comes from Payroll Cycle."
        onSave={handleCreateRun}
        saveLabel="Continue"
      >
        <div className="space-y-3.5">
          <HrOrgField label="Payroll Cycle" required size="full">
            <Select value={setupCycleId} onValueChange={setSetupCycleId}>
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    {c.cycleName}
                    {c.isDefault ? " (Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          <div className="grid grid-cols-2 gap-3">
            <HrOrgField label="Year" required size="full">
              <Input
                value={setupYear}
                onChange={(e) => setSetupYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                className={hrInput()}
              />
            </HrOrgField>
            <HrOrgField label="Month" required size="full">
              <Select value={setupMonth} onValueChange={setSetupMonth}>
                <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                      {new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
          </div>

          {setupPreview ? (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[11px] space-y-1">
              <p>
                <span className="text-muted-foreground">Period:</span>{" "}
                <span className="font-medium">{setupPreview.label}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Attendance:</span>{" "}
                <span className="font-medium">
                  {setupPreview.window.attendanceFrom} – {setupPreview.window.attendanceTo}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Processing:</span>{" "}
                <span className="font-medium">{setupPreview.schedule.processingDate}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Payment:</span>{" "}
                <span className="font-medium">{setupPreview.schedule.paymentDate}</span>
              </p>
            </div>
          ) : null}

          <HrOrgField label="Employee Scope" required size="full">
            <Select
              value={setupScope}
              onValueChange={(v) => setSetupScope(v as "all" | "selected")}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Employees
                </SelectItem>
                <SelectItem value="selected" className="text-xs">
                  Selected Employees
                </SelectItem>
              </SelectContent>
            </Select>
          </HrOrgField>

          {setupScope === "selected" ? (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {employees.map((e) => {
                const checked = setupSelected.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      className="accent-brand-600"
                      checked={checked}
                      onChange={() =>
                        setSetupSelected((prev) =>
                          checked ? prev.filter((id) => id !== e.id) : [...prev, e.id],
                        )
                      }
                    />
                    <span className="font-medium">{e.employeeName}</span>
                    <span className="text-muted-foreground">{e.employeeCode}</span>
                  </label>
                );
              })}
            </div>
          ) : null}

          {setupError ? <p className="text-xs text-red-600">{setupError}</p> : null}
        </div>
      </HrFormDrawer>

      <HrConfirmDialog
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        onConfirm={handleFinalize}
        title={`Finalize payroll for ${activeRun?.periodLabel ?? ""}?`}
        description="Finalized payroll will be treated as the approved payroll result for this period. It cannot be silently recalculated afterward."
        confirmLabel="Finalize"
      />

      <EmployeeDetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        row={detail}
        run={activeRun}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrPageShell>
  );
}
