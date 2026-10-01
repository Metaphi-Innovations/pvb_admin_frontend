"use client";

/**
 * Employee Profile → Salary / Payroll
 * Resolves Monthly CTC + Salary Structure formulas into monthly eligible breakup.
 * Statutory amounts and attendance proration are out of scope.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hrBtn } from "@/app/(app)/hr/settings/organization/_components";
import {
  assignEmployeeSalaryStructure,
  getAssignedSalaryStructure,
  getSalaryStructureById,
} from "@/app/(app)/hr/settings/salary-structures-data";
import {
  formatAnnualCtcDisplay,
  formatInrAmount,
  formatMonthlyCtcDisplay,
  getStructureSelectOptions,
  monthlyCtcToLegacyDisplay,
  parseMonthlyCtcValue,
  resolveEmployeeMonthlySalary,
  resolveStructureIdForSelect,
  type ResolvedSalaryLine,
} from "@/app/(app)/hr/settings/employee-salary-resolve";
import {
  formatPtAmount,
  ptBreakupAmountLabel,
  ptBreakupCalculationLabel,
  ptStatusLabel,
  resolveEmployeeProfessionalTax,
  applicabilityLabel,
} from "@/app/(app)/hr/settings/professional-tax-data";
import {
  formatPfMoney,
  formatPfRate,
  getEmployeePfApplicable,
  pfBreakupCalculationLabel,
  pfEmployeeBreakupAmountLabel,
  pfEmployerBreakupAmountLabel,
  pfRuleStatusLabel,
  pfStatusLabel,
  resolveEmployeePf,
} from "@/app/(app)/hr/settings/pf-settings-data";
import {
  formatEsiMoney,
  formatEsiRate,
  getEmployeeEsiApplicable,
  esiBreakupCalculationLabel,
  esiEmployeeBreakupAmountLabel,
  esiEmployerBreakupAmountLabel,
  esiRuleStatusLabel,
  esiStatusLabel,
  resolveEmployeeEsi,
} from "@/app/(app)/hr/settings/esi-settings-data";
import {
  formatLwfMoney,
  getEmployeeLwfApplicability,
  lwfBreakupCalculationLabel,
  lwfEmployeeBreakupAmountLabel,
  lwfEmployerBreakupAmountLabel,
  lwfRuleStatusLabel,
  lwfStatusLabel,
  LWF_EMPLOYEE_APPLICABILITY_OPTIONS,
  resolveEmployeeLwf,
  type LwfEmployeeApplicability,
} from "@/app/(app)/hr/settings/lwf-settings-data";
import {
  EMPLOYEE_TAX_REGIME_OPTIONS,
  formatTaxMoney,
  getEmployeeTaxRegimeChoice,
  regimeTypeLabel,
  resolveEmployeeTax,
  tdsBreakupAmountLabel,
  tdsBreakupCalculationLabel,
  tdsStatusLabel,
  type EmployeeTaxRegimeChoice,
} from "@/app/(app)/hr/settings/tax-settings-data";
import Link from "next/link";
import { formatDateDisplay, getBranchDisplayLabel } from "../employee-display";
import { updateHrEmployee, type HrEmployee } from "../employee-master-data";
import { EmptyProfileState, ProfileSectionHeader } from "./employee-form-ui";
import { Switch } from "@/components/ui/switch";
import {
  formatPayrollMoney,
  listEmployeePayrollHistory,
} from "@/app/(app)/hr/payroll/payroll-run-data";

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden mb-3 last:mb-0">
      <div className="px-3 py-2.5 border-b border-border bg-muted/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        {description ? (
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3">{children}</div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium leading-4 text-muted-foreground">{label}</p>
      <p className="text-[12px] font-normal leading-4 text-foreground mt-0.5 truncate">{display}</p>
    </div>
  );
}

function BreakupTable({ rows }: { rows: ResolvedSalaryLine[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No components in this section.</p>;
  }
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-xs min-w-[420px]">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold">Component</th>
            <th className="px-3 py-2 text-left font-semibold">Calculation</th>
            <th className="px-3 py-2 text-left font-semibold">Monthly Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.lineId} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium text-foreground">{row.componentName}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.displayCalculation}</td>
              <td
                className={cn(
                  "px-3 py-2 tabular-nums",
                  row.status === "resolved"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground italic",
                )}
              >
                {row.displayAmount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalaryPayrollProfileSection({
  employee,
  onEmployeeUpdated,
}: {
  employee: HrEmployee;
  onEmployeeUpdated?: () => void;
}) {
  const pay = employee.profileSummaries?.payroll;
  const savedMonthlyCtc = parseMonthlyCtcValue(pay);
  const savedStructureId = resolveStructureIdForSelect(employee);

  const [editing, setEditing] = useState(false);
  const [draftCtc, setDraftCtc] = useState(
    savedMonthlyCtc != null ? String(savedMonthlyCtc) : "",
  );
  const [draftStructureId, setDraftStructureId] = useState<number | null>(savedStructureId);
  const [ctcError, setCtcError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPfApplicable, setSavingPfApplicable] = useState(false);
  const [savingEsiApplicable, setSavingEsiApplicable] = useState(false);
  const [savingLwfApplicable, setSavingLwfApplicable] = useState(false);
  const [savingTaxRegime, setSavingTaxRegime] = useState(false);

  useEffect(() => {
    if (editing) return;
    setDraftCtc(savedMonthlyCtc != null ? String(savedMonthlyCtc) : "");
    setDraftStructureId(savedStructureId);
    setCtcError(null);
  }, [employee.id, savedMonthlyCtc, savedStructureId, editing]);

  const previewMonthlyCtc = useMemo(() => {
    if (!editing) return savedMonthlyCtc;
    const n = Number(String(draftCtc).replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n);
  }, [editing, draftCtc, savedMonthlyCtc]);

  const previewStructure = useMemo(() => {
    const id = editing ? draftStructureId : savedStructureId;
    if (id == null) return getAssignedSalaryStructure(employee.employeeCode);
    return getSalaryStructureById(id) ?? getAssignedSalaryStructure(employee.employeeCode);
  }, [editing, draftStructureId, savedStructureId, employee.employeeCode]);

  const resolution = useMemo(
    () =>
      resolveEmployeeMonthlySalary({
        monthlyCtc: previewMonthlyCtc,
        structure: previewStructure,
      }),
    [previewMonthlyCtc, previewStructure],
  );

  const payrollHistory = useMemo(
    () => listEmployeePayrollHistory(employee.employeeCode),
    [employee.employeeCode, employee.id],
  );

  const ptDisplay = useMemo(
    () =>
      resolveEmployeeProfessionalTax(employee, {
        structure: previewStructure,
        salaryResolution: resolution,
      }),
    [employee, previewStructure, resolution],
  );

  const pfDisplay = useMemo(
    () =>
      resolveEmployeePf(employee, {
        structure: previewStructure,
        salaryResolution: resolution,
      }),
    [employee, previewStructure, resolution],
  );

  const esiDisplay = useMemo(
    () =>
      resolveEmployeeEsi(employee, {
        structure: previewStructure,
        salaryResolution: resolution,
      }),
    [employee, previewStructure, resolution],
  );

  const lwfDisplay = useMemo(
    () =>
      resolveEmployeeLwf(employee, {
        structure: previewStructure,
        salaryResolution: resolution,
      }),
    [employee, previewStructure, resolution],
  );

  const taxDisplay = useMemo(
    () =>
      resolveEmployeeTax(employee, {
        structure: previewStructure,
        salaryResolution: resolution,
      }),
    [employee, previewStructure, resolution],
  );

  const structureOptions = useMemo(() => getStructureSelectOptions(employee), [employee]);

  const deductionRows = useMemo(() => {
    return resolution.deductions.map((row) => {
      const name = row.componentName.trim().toLowerCase();
      if (name === "professional tax") {
        const calculated = ptDisplay.resolution.status === "calculated";
        return {
          ...row,
          displayCalculation: ptBreakupCalculationLabel(ptDisplay),
          displayAmount: ptBreakupAmountLabel(ptDisplay),
          amount: calculated ? ptDisplay.resolution.appliedAmount : null,
          status: calculated ? ("resolved" as const) : ("unable" as const),
        };
      }
      if (name === "employee pf") {
        const calculated =
          pfDisplay.resolution.status === "calculated" &&
          pfDisplay.resolution.employeePfAmount != null;
        return {
          ...row,
          displayCalculation: pfBreakupCalculationLabel(pfDisplay),
          displayAmount: pfEmployeeBreakupAmountLabel(pfDisplay),
          amount: calculated ? pfDisplay.resolution.employeePfAmount : null,
          status: calculated ? ("resolved" as const) : ("unable" as const),
        };
      }
      if (name === "esi" || name === "employee esi") {
        const calculated =
          esiDisplay.resolution.status === "calculated" &&
          esiDisplay.resolution.employeeEsiAmount != null;
        return {
          ...row,
          displayCalculation: esiBreakupCalculationLabel(esiDisplay),
          displayAmount: esiEmployeeBreakupAmountLabel(esiDisplay),
          amount: calculated ? esiDisplay.resolution.employeeEsiAmount : null,
          status: calculated ? ("resolved" as const) : ("unable" as const),
        };
      }
      if (name === "employee lwf" || name === "lwf") {
        const calculated =
          lwfDisplay.resolution.status === "calculated" &&
          lwfDisplay.resolution.employeeAmount != null;
        const notDue = lwfDisplay.resolution.status === "not_due";
        return {
          ...row,
          displayCalculation: lwfBreakupCalculationLabel(lwfDisplay),
          displayAmount: lwfEmployeeBreakupAmountLabel(lwfDisplay),
          amount: calculated || notDue ? lwfDisplay.resolution.employeeAmount : null,
          status: calculated || notDue ? ("resolved" as const) : ("unable" as const),
        };
      }
      if (name === "tds") {
        const calculated =
          taxDisplay.resolution.status === "calculated" &&
          taxDisplay.resolution.monthlyTdsEstimate != null;
        return {
          ...row,
          displayCalculation: tdsBreakupCalculationLabel(taxDisplay),
          displayAmount: tdsBreakupAmountLabel(taxDisplay),
          amount: calculated ? taxDisplay.resolution.monthlyTdsEstimate : null,
          status: calculated ? ("resolved" as const) : ("unable" as const),
        };
      }
      return row;
    });
  }, [resolution.deductions, ptDisplay, pfDisplay, esiDisplay, lwfDisplay, taxDisplay]);

  const employerRows = useMemo(() => {
    return resolution.employerContributions.map((row) => {
      const name = row.componentName.trim().toLowerCase();
      if (name === "employer pf") {
        const calculated =
          pfDisplay.resolution.status === "calculated" &&
          pfDisplay.resolution.employerPfTotal != null;
        return {
          ...row,
          displayCalculation: pfBreakupCalculationLabel(pfDisplay),
          displayAmount: pfEmployerBreakupAmountLabel(pfDisplay),
          amount: calculated ? pfDisplay.resolution.employerPfTotal : null,
          status: calculated ? ("resolved" as const) : ("unable" as const),
        };
      }
      if (name === "employer esi") {
        const calculated =
          esiDisplay.resolution.status === "calculated" &&
          esiDisplay.resolution.employerEsiAmount != null;
        return {
          ...row,
          displayCalculation: esiBreakupCalculationLabel(esiDisplay),
          displayAmount: esiEmployerBreakupAmountLabel(esiDisplay),
          amount: calculated ? esiDisplay.resolution.employerEsiAmount : null,
          status: calculated ? ("resolved" as const) : ("unable" as const),
        };
      }
      if (name === "employer lwf") {
        const calculated =
          lwfDisplay.resolution.status === "calculated" &&
          lwfDisplay.resolution.employerAmount != null;
        const notDue = lwfDisplay.resolution.status === "not_due";
        return {
          ...row,
          displayCalculation: lwfBreakupCalculationLabel(lwfDisplay),
          displayAmount: lwfEmployerBreakupAmountLabel(lwfDisplay),
          amount: calculated || notDue ? lwfDisplay.resolution.employerAmount : null,
          status: calculated || notDue ? ("resolved" as const) : ("unable" as const),
        };
      }
      return row;
    });
  }, [resolution.employerContributions, pfDisplay, esiDisplay, lwfDisplay]);

  const beginEdit = () => {
    setDraftCtc(savedMonthlyCtc != null ? String(savedMonthlyCtc) : "");
    setDraftStructureId(savedStructureId);
    setCtcError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftCtc(savedMonthlyCtc != null ? String(savedMonthlyCtc) : "");
    setDraftStructureId(savedStructureId);
    setCtcError(null);
    setEditing(false);
  };

  const persistPayroll = (
    patch: Partial<NonNullable<typeof pay>>,
  ) => {
    const monthly = parseMonthlyCtcValue({ ...pay, ...patch } as typeof pay);
    updateHrEmployee(employee.id, {
      profileSummaries: {
        ...employee.profileSummaries,
        payroll: {
          structure: patch.structure ?? previewStructure?.name ?? pay?.structure ?? "",
          structureId:
            patch.structureId !== undefined
              ? patch.structureId
              : (previewStructure?.id ?? pay?.structureId ?? null),
          effectiveFrom: patch.effectiveFrom ?? pay?.effectiveFrom ?? "",
          ctc:
            patch.ctc ??
            pay?.ctc ??
            (monthly != null ? monthlyCtcToLegacyDisplay(monthly) : ""),
          monthlyCtc: patch.monthlyCtc !== undefined ? patch.monthlyCtc : monthly,
          status: patch.status ?? pay?.status ?? "Active",
          pfApplicable:
            patch.pfApplicable !== undefined
              ? patch.pfApplicable
              : getEmployeePfApplicable(employee),
          esiApplicable:
            patch.esiApplicable !== undefined
              ? patch.esiApplicable
              : getEmployeeEsiApplicable(employee),
          lwfApplicable:
            patch.lwfApplicable !== undefined
              ? patch.lwfApplicable
              : getEmployeeLwfApplicability(employee),
          taxRegime:
            patch.taxRegime !== undefined
              ? patch.taxRegime
              : getEmployeeTaxRegimeChoice(employee),
        },
      },
    });
  };

  const handleUpdate = () => {
    const n = Number(String(draftCtc).replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n <= 0) {
      setCtcError("Monthly CTC must be greater than 0");
      return;
    }
    if (draftStructureId == null) {
      setCtcError("Select a salary structure");
      return;
    }
    const structure = getSalaryStructureById(draftStructureId);
    if (!structure) {
      setCtcError("Selected salary structure was not found");
      return;
    }
    if (structure.status !== "active" && structure.id !== savedStructureId) {
      setCtcError("Select an active salary structure");
      return;
    }

    setSaving(true);
    const monthly = Math.round(n);
    assignEmployeeSalaryStructure(employee.employeeCode, structure.id);
    persistPayroll({
      structure: structure.name,
      structureId: structure.id,
      effectiveFrom: pay?.effectiveFrom || new Date().toISOString().slice(0, 10),
      ctc: monthlyCtcToLegacyDisplay(monthly),
      monthlyCtc: monthly,
      status: pay?.status || "Active",
    });
    setSaving(false);
    setEditing(false);
    setCtcError(null);
    onEmployeeUpdated?.();
  };

  const savePfApplicable = (next: boolean) => {
    setSavingPfApplicable(true);
    persistPayroll({ pfApplicable: next });
    setSavingPfApplicable(false);
    onEmployeeUpdated?.();
  };

  const saveEsiApplicable = (next: boolean) => {
    setSavingEsiApplicable(true);
    persistPayroll({ esiApplicable: next });
    setSavingEsiApplicable(false);
    onEmployeeUpdated?.();
  };

  const saveLwfApplicable = (next: LwfEmployeeApplicability) => {
    setSavingLwfApplicable(true);
    persistPayroll({ lwfApplicable: next });
    setSavingLwfApplicable(false);
    onEmployeeUpdated?.();
  };

  const saveTaxRegime = (next: EmployeeTaxRegimeChoice) => {
    setSavingTaxRegime(true);
    persistPayroll({ taxRegime: next });
    setSavingTaxRegime(false);
    onEmployeeUpdated?.();
  };

  return (
    <div>
      <ProfileSectionHeader
        title="Salary / Payroll"
        description="Monthly eligible salary from CTC and structure formulas. Payable amounts are calculated during payroll."
        actions={
          !editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(hrBtn("h-8 text-xs gap-1.5"), "px-2.5")}
              onClick={beginEdit}
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          ) : null
        }
      />

      <SectionBlock title="Salary Assignment">
        {!editing ? (
          <FieldGrid>
            <Field
              label="Monthly CTC"
              value={savedMonthlyCtc != null ? formatMonthlyCtcDisplay(savedMonthlyCtc) : ""}
            />
            <Field
              label="Annual CTC"
              value={savedMonthlyCtc != null ? formatAnnualCtcDisplay(savedMonthlyCtc) : ""}
            />
            <Field
              label="Salary Structure"
              value={previewStructure?.name ?? pay?.structure ?? ""}
            />
            <Field
              label="Effective From"
              value={pay?.effectiveFrom ? formatDateDisplay(pay.effectiveFrom) : ""}
            />
            <Field label="Payroll Status" value={pay?.status ?? ""} />
            <Field label="Assigned Branch" value={getBranchDisplayLabel(employee.branch)} />
          </FieldGrid>
        ) : (
          <div className="space-y-3 max-w-[640px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">
                  Monthly CTC <span className="text-red-500">*</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <Input
                    inputMode="numeric"
                    value={draftCtc}
                    onChange={(e) => {
                      setDraftCtc(e.target.value.replace(/[^\d]/g, ""));
                      setCtcError(null);
                    }}
                    className="h-9 text-xs"
                    placeholder="100000"
                  />
                </div>
                {previewMonthlyCtc != null ? (
                  <p className="text-[11px] text-muted-foreground">
                    Annual CTC: {formatAnnualCtcDisplay(previewMonthlyCtc)}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Annual CTC = Monthly × 12</p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">
                  Salary Structure <span className="text-red-500">*</span>
                </p>
                <Select
                  value={draftStructureId != null ? String(draftStructureId) : undefined}
                  onValueChange={(v) => setDraftStructureId(Number(v))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select structure…" />
                  </SelectTrigger>
                  <SelectContent>
                    {structureOptions.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={String(o.value)}
                        className="text-xs"
                        disabled={o.disabled}
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Active structures only. Inactive assignment stays visible if already set.
                </p>
              </div>
            </div>
            {ctcError ? <p className="text-xs text-red-500">{ctcError}</p> : null}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={hrBtn("h-8 text-xs")}
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn(hrBtn("h-8 text-xs", true))}
                onClick={handleUpdate}
                disabled={saving}
              >
                Update
              </Button>
            </div>
          </div>
        )}
      </SectionBlock>

      {resolution.errorMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
          <p className="text-xs font-medium text-amber-800">{resolution.errorMessage}</p>
        </div>
      ) : null}

      <SectionBlock title="Monthly Salary Breakup — Earnings">
        {!previewStructure ? (
          <EmptyProfileState message="Assign a salary structure to resolve earnings." />
        ) : (
          <BreakupTable rows={resolution.earnings} />
        )}
      </SectionBlock>

      <SectionBlock title="Monthly Salary Breakup — Employee Deductions">
        {!previewStructure ? (
          <p className="text-xs text-muted-foreground">No structure assigned.</p>
        ) : deductionRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No employee deductions in this structure.</p>
        ) : (
          <BreakupTable rows={deductionRows} />
        )}
      </SectionBlock>

      <SectionBlock title="Monthly Salary Breakup — Employer Contributions">
        {!previewStructure ? (
          <p className="text-xs text-muted-foreground">No structure assigned.</p>
        ) : employerRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No employer contributions in this structure.
          </p>
        ) : (
          <BreakupTable rows={employerRows} />
        )}
      </SectionBlock>

      <SectionBlock title="Salary Summary">
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Configured Earnings</span>
            <span className="font-semibold tabular-nums">
              {resolution.configuredEarningsTotal != null
                ? formatInrAmount(resolution.configuredEarningsTotal)
                : "—"}
            </span>
          </div>
          {resolution.unallocatedCtc != null && resolution.unallocatedCtc > 0 ? (
            <>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Unallocated CTC</span>
                <span className="tabular-nums text-amber-700">
                  {formatInrAmount(resolution.unallocatedCtc)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                Configured components do not currently account for the full CTC.
              </p>
            </>
          ) : null}
          <div className="flex justify-between gap-3 pt-1 border-t border-border/60">
            <span className="text-muted-foreground">Employee PF</span>
            <span
              className={cn(
                "tabular-nums",
                pfDisplay.resolution.status === "calculated" &&
                  pfDisplay.resolution.employeePfAmount != null
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {pfDisplay.hasEmployeePfInStructure
                ? pfEmployeeBreakupAmountLabel(pfDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Employer PF</span>
            <span
              className={cn(
                "tabular-nums",
                pfDisplay.resolution.status === "calculated" &&
                  pfDisplay.resolution.employerPfTotal != null
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {pfDisplay.hasEmployerPfInStructure
                ? pfEmployerBreakupAmountLabel(pfDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Employee ESI</span>
            <span
              className={cn(
                "tabular-nums",
                esiDisplay.resolution.status === "calculated" &&
                  esiDisplay.resolution.employeeEsiAmount != null
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {esiDisplay.hasEmployeeEsiInStructure
                ? esiEmployeeBreakupAmountLabel(esiDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Employer ESI</span>
            <span
              className={cn(
                "tabular-nums",
                esiDisplay.resolution.status === "calculated" &&
                  esiDisplay.resolution.employerEsiAmount != null
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {esiDisplay.hasEmployerEsiInStructure
                ? esiEmployerBreakupAmountLabel(esiDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Employee LWF</span>
            <span
              className={cn(
                "tabular-nums",
                lwfDisplay.resolution.status === "calculated" ||
                  lwfDisplay.resolution.status === "not_due"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {lwfDisplay.hasEmployeeLwfInStructure
                ? lwfEmployeeBreakupAmountLabel(lwfDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Employer LWF</span>
            <span
              className={cn(
                "tabular-nums",
                lwfDisplay.resolution.status === "calculated" ||
                  lwfDisplay.resolution.status === "not_due"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {lwfDisplay.hasEmployerLwfInStructure
                ? lwfEmployerBreakupAmountLabel(lwfDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Professional Tax</span>
            <span
              className={cn(
                "tabular-nums",
                ptDisplay.resolution.status === "calculated"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {ptDisplay.hasProfessionalTaxInStructure
                ? ptBreakupAmountLabel(ptDisplay) === "—"
                  ? ptStatusLabel(ptDisplay.resolution.status)
                  : ptBreakupAmountLabel(ptDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">TDS</span>
            <span
              className={cn(
                "tabular-nums",
                taxDisplay.resolution.status === "calculated"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic",
              )}
            >
              {taxDisplay.hasTdsInStructure
                ? tdsBreakupAmountLabel(taxDisplay) === "—"
                  ? tdsStatusLabel(taxDisplay.resolution.status)
                  : tdsBreakupAmountLabel(taxDisplay)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Other System Deductions</span>
            <span className="text-muted-foreground italic">Calculated during payroll</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Other Employer Contributions</span>
            <span className="text-muted-foreground italic">Calculated during payroll</span>
          </div>
        </div>
      </SectionBlock>

      {pfDisplay.hasEmployeePfInStructure || pfDisplay.hasEmployerPfInStructure ? (
        <SectionBlock
          title="Provident Fund"
          description="Current statutory calculation from configured PF rules. Final payroll may re-evaluate using period wages."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-foreground">PF Applicable</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When off, Employee and Employer PF are not calculated.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    pfDisplay.pfApplicable ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {pfDisplay.pfApplicable ? "Yes" : "No"}
                </span>
                <Switch
                  checked={pfDisplay.pfApplicable}
                  disabled={savingPfApplicable || editing}
                  onCheckedChange={(v) => savePfApplicable(v)}
                />
              </div>
            </div>

            <FieldGrid>
              <Field
                label="PF Applicability"
                value={pfDisplay.pfApplicable ? "Applicable" : "Not Applicable"}
              />
              <Field label="PF Rule Status" value={pfRuleStatusLabel(pfDisplay)} />
              <Field label="UAN" value={pfDisplay.uan || "—"} />
              <Field label="PF Number" value={pfDisplay.pfNumber || "—"} />
            </FieldGrid>
            <p className="text-[11px] text-muted-foreground -mt-1">
              UAN and PF Number are stored under Government IDs (not duplicated here).
            </p>

            {pfDisplay.resolution.status === "not_configured" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {pfDisplay.resolution.message ??
                    "Configure PF rules in Statutory Compliance → PF."}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  <Link
                    href="/hr/settings/statutory/pf"
                    className="underline font-medium text-amber-900 hover:text-amber-950"
                  >
                    Configure PF
                  </Link>
                </p>
              </div>
            ) : null}

            {pfDisplay.resolution.status === "basis_unavailable" ||
            pfDisplay.resolution.status === "configuration_error" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {pfDisplay.resolution.message}
                </p>
              </div>
            ) : null}

            {pfDisplay.pfApplicable && pfDisplay.resolution.status === "calculated" ? (
              <>
                <div className="pb-2 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Employee PF
                  </p>
                </div>
                <FieldGrid>
                  <Field label="Rule" value={pfDisplay.resolution.ruleName} />
                  <Field
                    label="Contribution Base"
                    value={pfDisplay.resolution.contributionBaseLabel}
                  />
                  <Field
                    label="Eligible PF Wages"
                    value={formatPfMoney(pfDisplay.resolution.eligiblePfWages)}
                  />
                  <Field
                    label="Wage Ceiling Applied"
                    value={
                      pfDisplay.resolution.wageCeilingApplied
                        ? formatPfMoney(pfDisplay.resolution.appliedPfWage)
                        : "No"
                    }
                  />
                  <Field
                    label="Contribution Rate"
                    value={formatPfRate(pfDisplay.resolution.employeeRate)}
                  />
                  <Field
                    label="Employee PF"
                    value={formatPfMoney(pfDisplay.resolution.employeePfAmount)}
                  />
                  <Field label="Status" value={pfStatusLabel(pfDisplay.resolution.status)} />
                </FieldGrid>

                <div className="pb-2 border-b border-border pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Employer PF
                  </p>
                </div>
                <FieldGrid>
                  <Field
                    label="Employer Rate"
                    value={formatPfRate(pfDisplay.resolution.employerRate)}
                  />
                  <Field
                    label="Applied Wage"
                    value={formatPfMoney(pfDisplay.resolution.appliedPfWage)}
                  />
                  <Field
                    label="Total Employer PF"
                    value={formatPfMoney(pfDisplay.resolution.employerPfTotal)}
                  />
                  {pfDisplay.resolution.epsEnabled ? (
                    <>
                      <Field
                        label="EPS Portion"
                        value={formatPfMoney(pfDisplay.resolution.epsPortion)}
                      />
                      <Field
                        label="Employer EPF Portion"
                        value={formatPfMoney(pfDisplay.resolution.employerEpfPortion)}
                      />
                    </>
                  ) : null}
                  {pfDisplay.resolution.edliEnabled ? (
                    <Field
                      label="EDLI"
                      value={`Configured · ${formatPfRate(pfDisplay.resolution.edliRate)} (payroll deferred)`}
                    />
                  ) : null}
                </FieldGrid>

                <p className="text-[11px] text-muted-foreground leading-snug border-t border-border/60 pt-2">
                  Current statutory calculation from PF Settings. Amounts are not manually
                  editable.
                </p>
              </>
            ) : null}

            {pfDisplay.pfApplicable === false ? (
              <p className="text-xs text-muted-foreground">
                Employee PF and Employer PF are Not Applicable for this employee.
              </p>
            ) : null}
          </div>
        </SectionBlock>
      ) : null}

      {esiDisplay.hasEmployeeEsiInStructure || esiDisplay.hasEmployerEsiInStructure ? (
        <SectionBlock
          title="ESI"
          description="Current statutory calculation from configured ESI rules. Final payroll may re-evaluate using period wages."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-foreground">ESI Applicable</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When off, Employee and Employer ESI are not calculated.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    esiDisplay.esiApplicable ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {esiDisplay.esiApplicable ? "Yes" : "No"}
                </span>
                <Switch
                  checked={esiDisplay.esiApplicable}
                  disabled={savingEsiApplicable || editing}
                  onCheckedChange={(v) => saveEsiApplicable(v)}
                />
              </div>
            </div>

            <FieldGrid>
              <Field
                label="ESI Applicability"
                value={esiDisplay.esiApplicable ? "Applicable" : "Not Applicable"}
              />
              <Field label="ESI Rule Status" value={esiRuleStatusLabel(esiDisplay)} />
              <Field label="ESIC Number" value={esiDisplay.esicNumber || "—"} />
            </FieldGrid>
            <p className="text-[11px] text-muted-foreground -mt-1">
              ESIC Number is stored under Government IDs (not duplicated here).
            </p>

            {esiDisplay.resolution.status === "not_configured" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {esiDisplay.resolution.message ??
                    "Configure ESI rules in Statutory Compliance → ESI."}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  <Link
                    href="/hr/settings/statutory/esi"
                    className="underline font-medium text-amber-900 hover:text-amber-950"
                  >
                    Configure ESI
                  </Link>
                </p>
              </div>
            ) : null}

            {esiDisplay.resolution.status === "above_wage_limit" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {esiDisplay.resolution.message}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Employee and Employer ESI are Not Eligible under this rule.
                </p>
              </div>
            ) : null}

            {esiDisplay.resolution.status === "basis_unavailable" ||
            esiDisplay.resolution.status === "configuration_error" ||
            esiDisplay.resolution.status === "disabled" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {esiDisplay.resolution.message}
                </p>
              </div>
            ) : null}

            {esiDisplay.esiApplicable && esiDisplay.resolution.status === "calculated" ? (
              <>
                <FieldGrid>
                  <Field label="Rule" value={esiDisplay.resolution.ruleName} />
                  <Field
                    label="Contribution Base"
                    value={esiDisplay.resolution.contributionBaseLabel}
                  />
                  <Field
                    label="Eligible Wage"
                    value={formatEsiMoney(esiDisplay.resolution.eligibleWage)}
                  />
                  <Field
                    label="Wage Eligibility Limit"
                    value={formatEsiMoney(esiDisplay.resolution.wageEligibilityLimit)}
                  />
                  <Field
                    label="Employee Rate"
                    value={formatEsiRate(esiDisplay.resolution.employeeRate)}
                  />
                  <Field
                    label="Employee ESI"
                    value={formatEsiMoney(esiDisplay.resolution.employeeEsiAmount)}
                  />
                  <Field
                    label="Employer Rate"
                    value={formatEsiRate(esiDisplay.resolution.employerRate)}
                  />
                  <Field
                    label="Employer ESI"
                    value={formatEsiMoney(esiDisplay.resolution.employerEsiAmount)}
                  />
                  <Field label="Status" value={esiStatusLabel(esiDisplay.resolution.status)} />
                </FieldGrid>
                <p className="text-[11px] text-muted-foreground leading-snug border-t border-border/60 pt-2">
                  Current statutory calculation from ESI Settings. Amounts are not manually
                  editable.
                </p>
              </>
            ) : null}

            {esiDisplay.esiApplicable === false ? (
              <p className="text-xs text-muted-foreground">
                Employee ESI and Employer ESI are Not Applicable for this employee.
              </p>
            ) : null}
          </div>
        </SectionBlock>
      ) : null}

      {lwfDisplay.hasEmployeeLwfInStructure || lwfDisplay.hasEmployerLwfInStructure ? (
        <SectionBlock
          title="Labour Welfare Fund"
          description="Current statutory calculation from configured LWF rules. Final payroll may re-evaluate for the period."
        >
          <div className="space-y-3">
            <div className="space-y-1.5 max-w-sm">
              <p className="text-xs font-medium text-foreground">LWF Applicability</p>
              <Select
                value={lwfDisplay.employeeApplicability}
                onValueChange={(v) => saveLwfApplicable(v as LwfEmployeeApplicability)}
                disabled={savingLwfApplicable || editing}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LWF_EMPLOYEE_APPLICABILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Auto uses Branch State + rule eligibility. Yes forces inclusion when a rule
                exists. No excludes the employee.
              </p>
            </div>

            <FieldGrid>
              <Field label="Applicable State" value={lwfDisplay.state ?? "Not available"} />
              <Field label="Source" value="Assigned Branch" />
              <Field label="LWF Rule Status" value={lwfRuleStatusLabel(lwfDisplay)} />
            </FieldGrid>

            {lwfDisplay.resolution.status === "not_configured" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {lwfDisplay.resolution.message ??
                    "Configure LWF rules in Statutory Compliance → LWF."}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  <Link
                    href="/hr/settings/statutory/lwf"
                    className="underline font-medium text-amber-900 hover:text-amber-950"
                  >
                    Configure LWF
                  </Link>
                </p>
              </div>
            ) : null}

            {lwfDisplay.resolution.status === "state_missing" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {lwfDisplay.resolution.message}
                </p>
              </div>
            ) : null}

            {lwfDisplay.resolution.status === "not_due" ? (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium text-foreground">Not Due This Month</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Rule is configured; current month is outside contribution months (
                  {lwfDisplay.resolution.contributionMonthsLabel ?? "—"}).
                </p>
              </div>
            ) : null}

            {lwfDisplay.resolution.status === "not_applicable" ||
            lwfDisplay.resolution.status === "outside_eligibility" ? (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium text-foreground">Not Applicable</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {lwfDisplay.resolution.message}
                </p>
              </div>
            ) : null}

            {lwfDisplay.resolution.status === "basis_unavailable" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {lwfDisplay.resolution.message}
                </p>
              </div>
            ) : null}

            {lwfDisplay.resolution.status === "calculated" ||
            lwfDisplay.resolution.status === "not_due" ? (
              <>
                <FieldGrid>
                  <Field
                    label="Frequency"
                    value={lwfDisplay.resolution.frequencyLabel ?? ""}
                  />
                  <Field
                    label="Contribution Month(s)"
                    value={lwfDisplay.resolution.contributionMonthsLabel ?? ""}
                  />
                  <Field
                    label="Employee Contribution"
                    value={
                      lwfDisplay.resolution.employeeDisplay ??
                      formatLwfMoney(lwfDisplay.resolution.employeeAmount)
                    }
                  />
                  <Field
                    label="Employer Contribution"
                    value={
                      lwfDisplay.resolution.employerDisplay ??
                      formatLwfMoney(lwfDisplay.resolution.employerAmount)
                    }
                  />
                  <Field
                    label="Rule Effective From"
                    value={
                      lwfDisplay.resolution.effectiveFrom
                        ? lwfDisplay.resolution.effectiveTo
                          ? `${lwfDisplay.resolution.effectiveFrom} – ${lwfDisplay.resolution.effectiveTo}`
                          : `${lwfDisplay.resolution.effectiveFrom} onwards`
                        : ""
                    }
                  />
                  <Field
                    label="Status"
                    value={lwfStatusLabel(lwfDisplay.resolution.status)}
                  />
                </FieldGrid>
                <p className="text-[11px] text-muted-foreground leading-snug border-t border-border/60 pt-2">
                  Current statutory calculation from LWF Settings. Amounts are not manually
                  editable.
                </p>
              </>
            ) : null}
          </div>
        </SectionBlock>
      ) : null}

      {ptDisplay.hasProfessionalTaxInStructure ? (
        <SectionBlock
          title="Professional Tax"
          description="Current statutory calculation from configured PT rules. Final payroll may re-evaluate using the period salary basis."
        >
          <div className="space-y-3">
            {ptDisplay.resolution.status === "state_missing" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  Professional Tax state is not available.
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Assign a Branch with a State on the employee record. PT State is derived from
                  Branch and is not editable here.
                </p>
              </div>
            ) : null}

            {ptDisplay.resolution.status === "not_configured" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {ptDisplay.resolution.message ??
                    `No Professional Tax rule is configured for ${ptDisplay.state}.`}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  <Link
                    href="/hr/settings/statutory/professional-tax"
                    className="underline font-medium text-amber-900 hover:text-amber-950"
                  >
                    Configure Professional Tax
                  </Link>
                </p>
              </div>
            ) : null}

            {ptDisplay.resolution.status === "no_matching_slab" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {ptDisplay.resolution.message ?? "No matching Professional Tax slab."}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  This is a configuration gap — amount is not assumed as ₹0.
                </p>
              </div>
            ) : null}

            {ptDisplay.resolution.status === "basis_unavailable" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">
                  {ptDisplay.resolution.message}
                </p>
              </div>
            ) : null}

            <FieldGrid>
              <Field label="Applicable State" value={ptDisplay.state ?? "Not available"} />
              <Field
                label="Source"
                value={
                  ptDisplay.stateSource === "branch" ? "Assigned Branch" : "Branch state missing"
                }
              />
              <Field
                label="Salary Basis"
                value={ptDisplay.resolution.salaryBasisLabel ?? ""}
              />
              <Field
                label="Salary Considered"
                value={
                  ptDisplay.resolution.salaryBasisAmount != null
                    ? formatInrAmount(ptDisplay.resolution.salaryBasisAmount)
                    : ""
                }
              />
              <Field
                label="Applicable Slab"
                value={ptDisplay.resolution.salaryRangeLabel ?? ""}
              />
              <Field
                label="Applicability"
                value={
                  ptDisplay.resolution.applicability
                    ? applicabilityLabel(ptDisplay.resolution.applicability)
                    : ""
                }
              />
              <Field
                label="PT Amount"
                value={
                  ptDisplay.resolution.status === "calculated" &&
                  ptDisplay.resolution.appliedAmount != null
                    ? formatPtAmount(ptDisplay.resolution.appliedAmount)
                    : ""
                }
              />
              <Field
                label="Effective Rule"
                value={
                  ptDisplay.resolution.effectiveFrom
                    ? ptDisplay.resolution.effectiveTo
                      ? `${ptDisplay.resolution.effectiveFrom} – ${ptDisplay.resolution.effectiveTo}`
                      : `${ptDisplay.resolution.effectiveFrom} onwards`
                    : ""
                }
              />
              <Field label="Status" value={ptStatusLabel(ptDisplay.resolution.status)} />
            </FieldGrid>

            {ptDisplay.resolution.status === "calculated" &&
            ptDisplay.resolution.specialMonthApplied ? (
              <p className="text-[11px] text-muted-foreground leading-snug border-t border-border/60 pt-2">
                Special month amount applied from configuration (normal{" "}
                {ptDisplay.resolution.normalAmount != null
                  ? formatPtAmount(ptDisplay.resolution.normalAmount)
                  : "—"}
                ).
              </p>
            ) : null}

            {ptDisplay.resolution.status === "calculated" ? (
              <p className="text-[11px] text-muted-foreground leading-snug border-t border-border/60 pt-2">
                Current statutory calculation from Professional Tax Settings. Not manually
                editable. Correct Branch or PT configuration if this is wrong.
              </p>
            ) : null}
          </div>
        </SectionBlock>
      ) : null}

      {taxDisplay.hasTdsInStructure ? (
        <SectionBlock
          title="Tax / TDS"
          description="Projected monthly TDS from Tax Regime and TDS Settings. Investment declarations and Form 16 are not applied in this foundation."
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Tax Regime</p>
              <Select
                value={taxDisplay.employeeChoice}
                disabled={savingTaxRegime || editing}
                onValueChange={(v) => saveTaxRegime(v as EmployeeTaxRegimeChoice)}
              >
                <SelectTrigger className="h-9 text-xs max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_TAX_REGIME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Company Default uses the active default under Tax Settings → Tax Regime.
              </p>
            </div>

            {taxDisplay.resolution.status === "regime_missing" ||
            taxDisplay.resolution.status === "slabs_missing" ||
            taxDisplay.resolution.status === "not_configured" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-2">
                <p className="text-xs text-amber-800">
                  {taxDisplay.resolution.message ??
                    "Tax / TDS is not fully configured."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/hr/settings/tax/tax-regime"
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    Configure Tax Regime
                  </Link>
                  <span className="text-xs text-muted-foreground">·</span>
                  <Link
                    href="/hr/settings/tax/tds"
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    Configure TDS Settings
                  </Link>
                </div>
              </div>
            ) : null}

            {taxDisplay.resolution.status === "ctc_missing" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs text-amber-800">
                  {taxDisplay.resolution.message ?? "Monthly CTC is required for TDS projection."}
                </p>
              </div>
            ) : null}

            <FieldGrid>
              <Field
                label="Resolved Regime"
                value={
                  taxDisplay.resolution.regimeType
                    ? regimeTypeLabel(taxDisplay.resolution.regimeType)
                    : ""
                }
              />
              <Field
                label="Regime Source"
                value={
                  taxDisplay.resolution.regimeSource === "company_default"
                    ? "Company Default"
                    : taxDisplay.resolution.regimeSource === "employee"
                      ? "Employee Selection"
                      : ""
                }
              />
              <Field
                label="Regime Rule"
                value={taxDisplay.resolution.regimeRuleName ?? ""}
              />
              <Field
                label="Standard Deduction"
                value={
                  taxDisplay.resolution.standardDeduction != null
                    ? formatTaxMoney(taxDisplay.resolution.standardDeduction)
                    : ""
                }
              />
              <Field
                label="Projected Annual Income"
                value={
                  taxDisplay.resolution.projectedAnnualIncome != null
                    ? formatTaxMoney(taxDisplay.resolution.projectedAnnualIncome)
                    : ""
                }
              />
              <Field
                label="Taxable Income (est.)"
                value={
                  taxDisplay.resolution.taxableIncomeEstimate != null
                    ? formatTaxMoney(taxDisplay.resolution.taxableIncomeEstimate)
                    : ""
                }
              />
              <Field
                label="Annual Tax (est.)"
                value={
                  taxDisplay.resolution.annualTaxEstimate != null
                    ? formatTaxMoney(taxDisplay.resolution.annualTaxEstimate)
                    : ""
                }
              />
              <Field
                label="Monthly TDS (est.)"
                value={
                  taxDisplay.resolution.status === "calculated" &&
                  taxDisplay.resolution.monthlyTdsEstimate != null
                    ? formatTaxMoney(taxDisplay.resolution.monthlyTdsEstimate)
                    : ""
                }
              />
              <Field
                label="TDS Slabs Rule"
                value={taxDisplay.resolution.slabRuleName ?? ""}
              />
              <Field label="Status" value={tdsStatusLabel(taxDisplay.resolution.status)} />
            </FieldGrid>

            {taxDisplay.resolution.status === "calculated" ? (
              <p className="text-[11px] text-muted-foreground leading-snug border-t border-border/60 pt-2">
                Estimate = annual tax from configured slabs ÷ 12, using Monthly CTC × 12 minus
                standard deduction. Not editable as a salary amount. Declarations / Form 16 will
                refine this later.
              </p>
            ) : null}
          </div>
        </SectionBlock>
      ) : null}

      <SectionBlock title="Payroll History" description="Finalized payroll snapshots for this employee.">
        {payrollHistory.length === 0 ? (
          <EmptyProfileState message="No payroll has been processed for this employee." />
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-1.5 pr-2 font-medium">Period</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Gross</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Deductions</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Net Pay</th>
                  <th className="py-1.5 font-medium">Finalized</th>
                </tr>
              </thead>
              <tbody>
                {payrollHistory.map(({ run, row }) => (
                  <tr key={run.id} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-foreground">
                      <Link
                        href="/hr/payroll/history"
                        className="text-brand-700 hover:underline"
                      >
                        {run.periodLabel}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formatPayrollMoney(row.grossEarnings)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formatPayrollMoney(row.employeeDeductionsTotal)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">
                      {formatPayrollMoney(row.netPay)}
                    </td>
                    <td className="py-1.5 text-muted-foreground whitespace-nowrap">
                      {run.finalizedAt
                        ? formatDateDisplay(run.finalizedAt.slice(0, 10))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
    </div>
  );
}
