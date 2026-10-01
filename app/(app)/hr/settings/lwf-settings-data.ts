/**
 * Labour Welfare Fund (LWF) — configurable state-wise statutory rule engine (frontend/demo).
 *
 * Ownership:
 * - Salary Component identifies Employee LWF / Employer LWF (System Calculated)
 * - LWF Settings define state rules (amounts/rates, frequency, months, eligibility)
 * - Employee State from Branch; optional Auto/Yes/No applicability
 * - Payroll will later call resolveLwfContribution with period wages
 *
 * No statutory LWF amounts/rates/months are hardcoded as legal truth.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import {
  loadPolicyList,
  savePolicyList,
  nextPolicyId,
  policyToday,
  type PolicyStatus,
} from "@/lib/hr/policy-common";
import {
  getAssignedSalaryStructure,
  getSalaryComponentById,
  loadSalaryStructures,
  type SalaryStructureRecord,
} from "./salary-structures-data";
import { loadSalaryComponents } from "./salary-components-data";
import {
  derivePtStateFromBranch,
  getProfessionalTaxStateOptions,
} from "./professional-tax-data";
import type { EmployeeSalaryResolution } from "./employee-salary-resolve";
import type { HrEmployee } from "../employees/employee-master-data";

export type { PolicyStatus };

export const EMPLOYEE_LWF_COMPONENT_NAME = "Employee LWF";
export const EMPLOYER_LWF_COMPONENT_NAME = "Employer LWF";

const CONFIGS_STORAGE_KEY = "ds_hr_lwf_configurations_v1";

export type LwfApplicability = "all";

export type LwfContributionType = "fixed" | "percentage";

export type LwfFrequency =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly"
  | "specific_months";

export type LwfSalaryBasis = "gross_earnings" | "basic" | "eligible_wages";

export type LwfEmployeeApplicability = "auto" | "yes" | "no";

export type LwfCalcStatus =
  | "calculated"
  | "not_configured"
  | "not_applicable"
  | "not_due"
  | "not_in_structure"
  | "state_missing"
  | "basis_unavailable"
  | "outside_eligibility";

export interface LwfConfiguration {
  id: number;
  state: string;
  applicability: LwfApplicability;
  employeeContributionType: LwfContributionType;
  /** Fixed ₹ amount OR percentage rate depending on type */
  employeeContributionValue: number;
  employeeCalculateOn: LwfSalaryBasis | null;
  employerContributionType: LwfContributionType;
  employerContributionValue: number;
  employerCalculateOn: LwfSalaryBasis | null;
  frequency: LwfFrequency;
  /** Calendar months 1–12; used for non-monthly frequencies / specific months */
  contributionMonths: number[];
  salaryEligibilityEnabled: boolean;
  eligibilitySalaryBasis: LwfSalaryBasis | null;
  minSalary: number | null;
  maxSalary: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LwfWageBases {
  gross_earnings: number | null;
  basic: number | null;
  eligible_wages: number | null;
}

export interface ResolveLwfContributionInput {
  state: string | null | undefined;
  employeeApplicability: LwfEmployeeApplicability;
  hasEmployeeLwfInStructure: boolean;
  hasEmployerLwfInStructure: boolean;
  wageBases: LwfWageBases;
  payrollDate?: string | null;
  configs?: LwfConfiguration[];
}

export interface LwfContributionResolution {
  status: LwfCalcStatus;
  message: string | null;
  state: string | null;
  configurationId: number | null;
  frequency: LwfFrequency | null;
  frequencyLabel: string | null;
  contributionMonths: number[];
  contributionMonthsLabel: string | null;
  isContributionMonth: boolean | null;
  employeeContributionType: LwfContributionType | null;
  employerContributionType: LwfContributionType | null;
  employeeContributionValue: number | null;
  employerContributionValue: number | null;
  employeeAmount: number | null;
  employerAmount: number | null;
  employeeDisplay: string | null;
  employerDisplay: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface EmployeeLwfDisplay {
  hasEmployeeLwfInStructure: boolean;
  hasEmployerLwfInStructure: boolean;
  structureName: string | null;
  state: string | null;
  branchLabel: string;
  employeeApplicability: LwfEmployeeApplicability;
  resolution: LwfContributionResolution;
}

export const LWF_APPLICABILITY_OPTIONS: { value: LwfApplicability; label: string }[] = [
  { value: "all", label: "All Employees" },
];

export const LWF_CONTRIBUTION_TYPE_OPTIONS: {
  value: LwfContributionType;
  label: string;
}[] = [
  { value: "fixed", label: "Fixed Amount" },
  { value: "percentage", label: "Percentage" },
];

export const LWF_FREQUENCY_OPTIONS: { value: LwfFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "specific_months", label: "Specific Month(s)" },
];

export const LWF_SALARY_BASIS_OPTIONS: {
  value: LwfSalaryBasis;
  label: string;
  helper: string;
}[] = [
  {
    value: "gross_earnings",
    label: "Gross Earnings",
    helper: "Sum of configured earning components",
  },
  { value: "basic", label: "Basic", helper: "Resolved Basic component amount" },
  {
    value: "eligible_wages",
    label: "Eligible Wages",
    helper: "Uses Eligible Wages / LWF Eligible Wages component when present",
  },
];

export const LWF_MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const LWF_EMPLOYEE_APPLICABILITY_OPTIONS: {
  value: LwfEmployeeApplicability;
  label: string;
}[] = [
  { value: "auto", label: "Auto" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const EMPTY_SEED: LwfConfiguration[] = [];

function normalizeContributionType(raw: unknown): LwfContributionType {
  const s = String(raw ?? "").toLowerCase();
  return s === "percentage" || s === "percent" ? "percentage" : "fixed";
}

function normalizeFrequency(raw: unknown): LwfFrequency {
  const s = String(raw ?? "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
  if (s === "quarterly") return "quarterly";
  if (s === "half_yearly" || s === "halfyearly") return "half_yearly";
  if (s === "yearly" || s === "annual") return "yearly";
  if (s === "specific_months" || s === "specific_month") return "specific_months";
  return "monthly";
}

function normalizeSalaryBasis(raw: unknown): LwfSalaryBasis | null {
  if (raw == null || raw === "") return null;
  const s = String(raw)
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "basic") return "basic";
  if (s === "eligible_wages" || s === "lwf_eligible_wages") return "eligible_wages";
  return "gross_earnings";
}

function normalizeMonths(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const months = raw
    .map((m) => Number(m))
    .filter((m) => Number.isFinite(m) && m >= 1 && m <= 12)
    .map((m) => Math.round(m));
  return Array.from(new Set(months)).sort((a, b) => a - b);
}

function normalizeConfiguration(
  raw: Record<string, unknown>,
  index: number,
): LwfConfiguration {
  const empType = normalizeContributionType(raw.employeeContributionType);
  const erType = normalizeContributionType(raw.employerContributionType);
  return {
    id: Number(raw.id) || index + 1,
    state: String(raw.state ?? "").trim(),
    applicability: "all",
    employeeContributionType: empType,
    employeeContributionValue: Math.max(0, Number(raw.employeeContributionValue) || 0),
    employeeCalculateOn:
      empType === "percentage"
        ? normalizeSalaryBasis(raw.employeeCalculateOn) ?? "gross_earnings"
        : null,
    employerContributionType: erType,
    employerContributionValue: Math.max(0, Number(raw.employerContributionValue) || 0),
    employerCalculateOn:
      erType === "percentage"
        ? normalizeSalaryBasis(raw.employerCalculateOn) ?? "gross_earnings"
        : null,
    frequency: normalizeFrequency(raw.frequency),
    contributionMonths: normalizeMonths(raw.contributionMonths),
    salaryEligibilityEnabled: raw.salaryEligibilityEnabled === true,
    eligibilitySalaryBasis: raw.salaryEligibilityEnabled
      ? normalizeSalaryBasis(raw.eligibilitySalaryBasis) ?? "gross_earnings"
      : null,
    minSalary:
      raw.minSalary != null && raw.minSalary !== ""
        ? Math.max(0, Number(raw.minSalary))
        : null,
    maxSalary:
      raw.maxSalary != null && raw.maxSalary !== ""
        ? Math.max(0, Number(raw.maxSalary))
        : null,
    effectiveFrom: String(raw.effectiveFrom ?? "").slice(0, 10),
    effectiveTo:
      raw.effectiveTo != null && String(raw.effectiveTo).trim()
        ? String(raw.effectiveTo).slice(0, 10)
        : null,
    status: raw.status === "inactive" ? "inactive" : "active",
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : policyToday(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : policyToday(),
  };
}

export function loadLwfConfigurations(): LwfConfiguration[] {
  const raw = loadPolicyList(CONFIGS_STORAGE_KEY, structuredClone(EMPTY_SEED));
  return raw.map((r, i) => normalizeConfiguration(r as unknown as Record<string, unknown>, i));
}

export function saveLwfConfigurations(list: LwfConfiguration[]): void {
  savePolicyList(CONFIGS_STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-lwf-configurations-updated"));
  }
}

export function nextLwfConfigurationId(list: LwfConfiguration[]): number {
  return nextPolicyId(list);
}

export function withLwfConfigNewAudit(
  partial: Omit<LwfConfiguration, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
): LwfConfiguration {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withLwfConfigUpdateAudit(record: LwfConfiguration): LwfConfiguration {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function getLwfStateOptions(): string[] {
  return getProfessionalTaxStateOptions();
}

export function frequencyLabel(f: LwfFrequency): string {
  return LWF_FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

export function salaryBasisLabel(b: LwfSalaryBasis): string {
  return LWF_SALARY_BASIS_OPTIONS.find((o) => o.value === b)?.label ?? b;
}

export function formatLwfMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatLwfContributionSummary(
  type: LwfContributionType,
  value: number,
  calculateOn: LwfSalaryBasis | null,
): string {
  if (type === "fixed") return formatLwfMoney(value);
  const base = calculateOn ? salaryBasisLabel(calculateOn) : "—";
  return `${value}% of ${base}`;
}

export function formatLwfMonths(months: number[]): string {
  if (months.length === 0) return "—";
  return months
    .map(
      (m) =>
        LWF_MONTH_OPTIONS.find((o) => o.value === m)?.label.slice(0, 3) ?? String(m),
    )
    .join(", ");
}

export function formatLwfEffectivePeriod(cfg: LwfConfiguration): string {
  const from = cfg.effectiveFrom || "—";
  if (!cfg.effectiveTo) return `${from} – Current`;
  return `${from} – ${cfg.effectiveTo}`;
}

export function frequencyRequiresMonths(frequency: LwfFrequency): boolean {
  return frequency !== "monthly";
}

export function findEffectivePeriodConflicts(
  configs: LwfConfiguration[],
  candidate: Pick<
    LwfConfiguration,
    "id" | "state" | "effectiveFrom" | "effectiveTo" | "status"
  >,
): LwfConfiguration[] {
  if (candidate.status !== "active") return [];
  const state = candidate.state.trim().toLowerCase();
  const from = candidate.effectiveFrom;
  const to = candidate.effectiveTo ?? "9999-12-31";
  return configs.filter((c) => {
    if (c.id === candidate.id) return false;
    if (c.status !== "active") return false;
    if (c.state.trim().toLowerCase() !== state) return false;
    const cFrom = c.effectiveFrom;
    const cTo = c.effectiveTo ?? "9999-12-31";
    return from <= cTo && cFrom <= to;
  });
}

function isConfigEffectiveOn(cfg: LwfConfiguration, date: string): boolean {
  if (cfg.status !== "active") return false;
  if (cfg.effectiveFrom && cfg.effectiveFrom > date) return false;
  if (cfg.effectiveTo && cfg.effectiveTo < date) return false;
  return true;
}

export function findEffectiveLwfConfiguration(
  state: string | null | undefined,
  payrollDate?: string | null,
  configs?: LwfConfiguration[],
): LwfConfiguration | null {
  const s = (state || "").trim().toLowerCase();
  if (!s) return null;
  const date = (payrollDate || policyToday()).slice(0, 10);
  const list = configs ?? loadLwfConfigurations();
  const matches = list
    .filter((c) => c.state.trim().toLowerCase() === s && isConfigEffectiveOn(c, date))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matches[0] ?? null;
}

export function isContributionMonthDue(
  cfg: LwfConfiguration,
  payrollDate: string,
): boolean {
  if (cfg.frequency === "monthly") return true;
  const month = Number(payrollDate.slice(5, 7));
  if (!Number.isFinite(month) || month < 1 || month > 12) return false;
  if (cfg.contributionMonths.length === 0) return false;
  return cfg.contributionMonths.includes(month);
}

export function isEmployeeLwfComponentName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === EMPLOYEE_LWF_COMPONENT_NAME.toLowerCase() || n === "lwf";
}

export function isEmployerLwfComponentName(name: string): boolean {
  return name.trim().toLowerCase() === EMPLOYER_LWF_COMPONENT_NAME.toLowerCase();
}

export function isLwfComponentName(name: string): boolean {
  return isEmployeeLwfComponentName(name) || isEmployerLwfComponentName(name);
}

export function structureIncludesEmployeeLwf(
  structure: SalaryStructureRecord | null,
): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isEmployeeLwfComponentName(c.name);
  });
}

export function structureIncludesEmployerLwf(
  structure: SalaryStructureRecord | null,
): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isEmployerLwfComponentName(c.name);
  });
}

export function buildLwfWageBases(
  salaryResolution: EmployeeSalaryResolution | null | undefined,
): LwfWageBases {
  if (!salaryResolution) {
    return { gross_earnings: null, basic: null, eligible_wages: null };
  }
  const findAmount = (...names: string[]) => {
    const set = new Set(names.map((n) => n.toLowerCase()));
    const line = salaryResolution.earnings.find((e) =>
      set.has(e.componentName.trim().toLowerCase()),
    );
    return line?.amount ?? null;
  };
  return {
    gross_earnings: salaryResolution.configuredEarningsTotal,
    basic: findAmount("basic"),
    eligible_wages: findAmount(
      "eligible wages",
      "lwf eligible wages",
      "lwf wages",
    ),
  };
}

function resolveWageAmount(
  basis: LwfSalaryBasis,
  wages: LwfWageBases,
): { amount: number | null; error: string | null } {
  const amount = wages[basis];
  if (amount == null) {
    return {
      amount: null,
      error: `${salaryBasisLabel(basis)} is not available for LWF calculation.`,
    };
  }
  return { amount, error: null };
}

function computeContribution(
  type: LwfContributionType,
  value: number,
  calculateOn: LwfSalaryBasis | null,
  wages: LwfWageBases,
): { amount: number | null; error: string | null } {
  if (type === "fixed") {
    return { amount: Math.round(value), error: null };
  }
  const basis = calculateOn ?? "gross_earnings";
  const wage = resolveWageAmount(basis, wages);
  if (wage.error || wage.amount == null) return { amount: null, error: wage.error };
  return { amount: Math.round((wage.amount * value) / 100), error: null };
}

function emptyResolution(
  partial: Partial<LwfContributionResolution> & { status: LwfCalcStatus },
): LwfContributionResolution {
  return {
    status: partial.status,
    message: partial.message ?? null,
    state: partial.state ?? null,
    configurationId: partial.configurationId ?? null,
    frequency: partial.frequency ?? null,
    frequencyLabel: partial.frequencyLabel ?? null,
    contributionMonths: partial.contributionMonths ?? [],
    contributionMonthsLabel: partial.contributionMonthsLabel ?? null,
    isContributionMonth: partial.isContributionMonth ?? null,
    employeeContributionType: partial.employeeContributionType ?? null,
    employerContributionType: partial.employerContributionType ?? null,
    employeeContributionValue: partial.employeeContributionValue ?? null,
    employerContributionValue: partial.employerContributionValue ?? null,
    employeeAmount: partial.employeeAmount ?? null,
    employerAmount: partial.employerAmount ?? null,
    employeeDisplay: partial.employeeDisplay ?? null,
    employerDisplay: partial.employerDisplay ?? null,
    effectiveFrom: partial.effectiveFrom ?? null,
    effectiveTo: partial.effectiveTo ?? null,
  };
}

/**
 * Core LWF resolver — data-driven; reusable by Payroll with period wages later.
 */
export function resolveLwfContribution(
  input: ResolveLwfContributionInput,
): LwfContributionResolution {
  if (!input.hasEmployeeLwfInStructure && !input.hasEmployerLwfInStructure) {
    return emptyResolution({
      status: "not_in_structure",
      message: "LWF components are not included in the assigned salary structure.",
    });
  }

  if (input.employeeApplicability === "no") {
    return emptyResolution({
      status: "not_applicable",
      state: (input.state || "").trim() || null,
      message: "LWF is marked Not Applicable for this employee.",
    });
  }

  const state = (input.state || "").trim() || null;
  if (!state) {
    return emptyResolution({
      status: "state_missing",
      message: "LWF state is not available from the assigned Branch.",
    });
  }

  const cfg = findEffectiveLwfConfiguration(state, input.payrollDate, input.configs);
  if (!cfg) {
    return emptyResolution({
      status: "not_configured",
      state,
      message: "Configure LWF rules in Statutory Compliance → LWF.",
    });
  }

  const payrollDate = (input.payrollDate || policyToday()).slice(0, 10);
  const due = isContributionMonthDue(cfg, payrollDate);
  const monthsLabel =
    cfg.frequency === "monthly"
      ? "Every month"
      : formatLwfMonths(cfg.contributionMonths);

  const baseMeta = {
    state,
    configurationId: cfg.id,
    frequency: cfg.frequency,
    frequencyLabel: frequencyLabel(cfg.frequency),
    contributionMonths: cfg.contributionMonths,
    contributionMonthsLabel: monthsLabel,
    isContributionMonth: due,
    employeeContributionType: cfg.employeeContributionType,
    employerContributionType: cfg.employerContributionType,
    employeeContributionValue: cfg.employeeContributionValue,
    employerContributionValue: cfg.employerContributionValue,
    effectiveFrom: cfg.effectiveFrom,
    effectiveTo: cfg.effectiveTo,
  };

  if (!due) {
    return emptyResolution({
      ...baseMeta,
      status: "not_due",
      message: "LWF is not due in the current contribution period.",
      employeeAmount: 0,
      employerAmount: 0,
      employeeDisplay: "₹0 / Not Due",
      employerDisplay: "₹0 / Not Due",
    });
  }

  // Optional salary eligibility
  if (cfg.salaryEligibilityEnabled && cfg.eligibilitySalaryBasis) {
    const elig = resolveWageAmount(cfg.eligibilitySalaryBasis, input.wageBases);
    if (elig.error || elig.amount == null) {
      return emptyResolution({
        ...baseMeta,
        status: "basis_unavailable",
        message: elig.error ?? "Salary eligibility basis is not available.",
      });
    }
    if (cfg.minSalary != null && elig.amount < cfg.minSalary) {
      return emptyResolution({
        ...baseMeta,
        status: "outside_eligibility",
        message: `Eligible wage below configured minimum ${formatLwfMoney(cfg.minSalary)}.`,
      });
    }
    if (cfg.maxSalary != null && elig.amount > cfg.maxSalary) {
      return emptyResolution({
        ...baseMeta,
        status: "outside_eligibility",
        message: `Eligible wage above configured maximum ${formatLwfMoney(cfg.maxSalary)}.`,
      });
    }
  }

  // Force Yes still requires a valid rule (already have) and eligibility — calculate
  // Auto follows same eligibility path

  let employeeAmount: number | null = null;
  let employerAmount: number | null = null;

  if (input.hasEmployeeLwfInStructure) {
    const emp = computeContribution(
      cfg.employeeContributionType,
      cfg.employeeContributionValue,
      cfg.employeeCalculateOn,
      input.wageBases,
    );
    if (emp.error) {
      return emptyResolution({
        ...baseMeta,
        status: "basis_unavailable",
        message: emp.error,
      });
    }
    employeeAmount = emp.amount;
  }

  if (input.hasEmployerLwfInStructure) {
    const er = computeContribution(
      cfg.employerContributionType,
      cfg.employerContributionValue,
      cfg.employerCalculateOn,
      input.wageBases,
    );
    if (er.error) {
      return emptyResolution({
        ...baseMeta,
        status: "basis_unavailable",
        message: er.error,
      });
    }
    employerAmount = er.amount;
  }

  return emptyResolution({
    ...baseMeta,
    status: "calculated",
    message: null,
    employeeAmount,
    employerAmount,
    employeeDisplay:
      employeeAmount != null ? formatLwfMoney(employeeAmount) : null,
    employerDisplay:
      employerAmount != null ? formatLwfMoney(employerAmount) : null,
  });
}

export function getEmployeeLwfApplicability(
  employee: HrEmployee,
): LwfEmployeeApplicability {
  const v = employee.profileSummaries?.payroll?.lwfApplicable;
  if (v === "yes" || v === "no" || v === "auto") return v;
  if (v === true) return "yes";
  if (v === false) return "no";
  return "auto";
}

export function resolveEmployeeLwf(
  employee: HrEmployee,
  options?: {
    structure?: SalaryStructureRecord | null;
    salaryResolution?: EmployeeSalaryResolution | null;
    payrollDate?: string | null;
  },
): EmployeeLwfDisplay {
  const structure =
    options?.structure !== undefined
      ? options.structure
      : getAssignedSalaryStructure(employee.employeeCode) ??
        (employee.profileSummaries?.payroll?.structure
          ? loadSalaryStructures().find(
              (s) => s.name === employee.profileSummaries?.payroll?.structure,
            ) ?? null
          : null);

  const hasEmployee = structureIncludesEmployeeLwf(structure);
  const hasEmployer = structureIncludesEmployerLwf(structure);
  const derived = derivePtStateFromBranch(employee.branch);
  const employeeApplicability = getEmployeeLwfApplicability(employee);

  const resolution = resolveLwfContribution({
    state: derived.state,
    employeeApplicability,
    hasEmployeeLwfInStructure: hasEmployee,
    hasEmployerLwfInStructure: hasEmployer,
    wageBases: buildLwfWageBases(options?.salaryResolution),
    payrollDate: options?.payrollDate,
  });

  return {
    hasEmployeeLwfInStructure: hasEmployee,
    hasEmployerLwfInStructure: hasEmployer,
    structureName: structure?.name ?? employee.profileSummaries?.payroll?.structure ?? null,
    state: derived.state,
    branchLabel: derived.branchLabel,
    employeeApplicability,
    resolution,
  };
}

export function lwfStatusLabel(status: LwfCalcStatus): string {
  switch (status) {
    case "calculated":
      return "Calculated";
    case "not_configured":
      return "Not Configured";
    case "not_applicable":
      return "Not Applicable";
    case "not_due":
      return "Not Due This Month";
    case "not_in_structure":
      return "Not in Structure";
    case "state_missing":
      return "State Required";
    case "basis_unavailable":
      return "Configuration Required";
    case "outside_eligibility":
      return "Not Applicable";
    default:
      return status;
  }
}

export function lwfRuleStatusLabel(display: EmployeeLwfDisplay): string {
  if (!display.hasEmployeeLwfInStructure && !display.hasEmployerLwfInStructure) {
    return "Not in Structure";
  }
  const s = display.resolution.status;
  if (s === "calculated") return "Configured";
  if (s === "not_due") return "Configured · Not Due";
  if (s === "outside_eligibility") return "Not Applicable";
  return lwfStatusLabel(s);
}

export function lwfEmployeeBreakupAmountLabel(display: EmployeeLwfDisplay): string {
  if (!display.hasEmployeeLwfInStructure) return "—";
  const r = display.resolution;
  if (r.status === "calculated" && r.employeeAmount != null) {
    return formatLwfMoney(r.employeeAmount);
  }
  if (r.status === "not_due") return "₹0 / Not Due";
  if (r.status === "not_applicable" || r.status === "outside_eligibility") {
    return "Not Applicable";
  }
  return "—";
}

export function lwfEmployerBreakupAmountLabel(display: EmployeeLwfDisplay): string {
  if (!display.hasEmployerLwfInStructure) return "—";
  const r = display.resolution;
  if (r.status === "calculated" && r.employerAmount != null) {
    return formatLwfMoney(r.employerAmount);
  }
  if (r.status === "not_due") return "₹0 / Not Due";
  if (r.status === "not_applicable" || r.status === "outside_eligibility") {
    return "Not Applicable";
  }
  return "—";
}

export function lwfBreakupCalculationLabel(display: EmployeeLwfDisplay): string {
  const s = display.resolution.status;
  if (s === "not_configured") return "Not Configured";
  if (s === "not_due") return "Not Due This Month";
  if (s === "not_applicable" || s === "outside_eligibility") return "Not Applicable";
  if (s === "basis_unavailable") return "Configuration Required";
  if (s === "calculated") return "System Calculated";
  return lwfStatusLabel(s);
}
