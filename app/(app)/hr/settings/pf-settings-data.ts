/**
 * PF / EPF / EPS — configurable statutory rule engine (frontend/demo).
 *
 * Ownership:
 * - Salary Component identifies Employee PF / Employer PF (System Calculated)
 * - PF Settings define rates, ceilings, EPS/EDLI, effective dates
 * - Employee provides applicability + UAN/PF Number (Government IDs)
 * - Payroll will later call resolvePfContribution with period wages
 *
 * No statutory rates are hardcoded as legal truth.
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
import type { EmployeeSalaryResolution } from "./employee-salary-resolve";
import type { HrEmployee } from "../employees/employee-master-data";

export type { PolicyStatus };

export const EMPLOYEE_PF_COMPONENT_NAME = "Employee PF";
export const EMPLOYER_PF_COMPONENT_NAME = "Employer PF";

const CONFIGS_STORAGE_KEY = "ds_hr_pf_configurations_v1";

export type PfContributionBase = "basic" | "basic_da" | "pf_wages";

export type PfCalcStatus =
  | "calculated"
  | "not_configured"
  | "not_applicable"
  | "not_in_structure"
  | "configuration_error"
  | "basis_unavailable";

export interface PfConfiguration {
  id: number;
  ruleName: string;
  contributionBase: PfContributionBase;
  employeePfEnabled: boolean;
  employerPfEnabled: boolean;
  /** Percent, e.g. 12 */
  employeeContributionRate: number;
  employerContributionRate: number;
  applyWageCeiling: boolean;
  /** Monthly PF wage ceiling in ₹; used when applyWageCeiling */
  wageCeiling: number | null;
  epsEnabled: boolean;
  epsRate: number | null;
  epsWageCeiling: number | null;
  edliEnabled: boolean;
  edliRate: number | null;
  edliWageCeiling: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PfWageBaseAmounts {
  basic: number | null;
  da: number | null;
  /** Explicit PF wages / eligible wages component if present */
  pfWages: number | null;
}

export interface ResolvePfContributionInput {
  pfApplicable: boolean;
  hasEmployeePfInStructure: boolean;
  hasEmployerPfInStructure: boolean;
  wageBases: PfWageBaseAmounts;
  payrollDate?: string | null;
  configs?: PfConfiguration[];
}

export interface PfContributionResolution {
  status: PfCalcStatus;
  message: string | null;
  configurationId: number | null;
  ruleName: string | null;
  contributionBase: PfContributionBase | null;
  contributionBaseLabel: string | null;
  eligiblePfWages: number | null;
  wageCeilingApplied: boolean;
  appliedPfWage: number | null;
  employeePfEnabled: boolean;
  employerPfEnabled: boolean;
  employeeRate: number | null;
  employerRate: number | null;
  employeePfAmount: number | null;
  employerPfTotal: number | null;
  epsEnabled: boolean;
  epsRate: number | null;
  epsWageCeiling: number | null;
  epsAppliedWage: number | null;
  epsPortion: number | null;
  employerEpfPortion: number | null;
  edliEnabled: boolean;
  edliRate: number | null;
  edliWageCeiling: number | null;
  /** EDLI amount deferred until payroll basis is finalized */
  edliAmount: number | null;
  edliStatus: "not_enabled" | "configured_deferred" | "calculated";
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface EmployeePfDisplay {
  hasEmployeePfInStructure: boolean;
  hasEmployerPfInStructure: boolean;
  structureName: string | null;
  pfApplicable: boolean;
  uan: string;
  pfNumber: string;
  resolution: PfContributionResolution;
}

export const PF_CONTRIBUTION_BASE_OPTIONS: {
  value: PfContributionBase;
  label: string;
  helper: string;
}[] = [
  {
    value: "basic",
    label: "Basic",
    helper: "Uses the resolved Basic component amount",
  },
  {
    value: "basic_da",
    label: "Basic + DA",
    helper: "Basic plus Dearness Allowance when both are resolved",
  },
  {
    value: "pf_wages",
    label: "PF Wages / Eligible Wages",
    helper: "Uses a PF Wages or Eligible Wages earning component when present",
  },
];

const EMPTY_SEED: PfConfiguration[] = [];

function normalizeContributionBase(raw: unknown): PfContributionBase {
  const s = String(raw ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "basic_da" || s === "basic+da" || s === "basic_plus_da") return "basic_da";
  if (s === "pf_wages" || s === "eligible_wages" || s === "pf_wages_eligible_wages") {
    return "pf_wages";
  }
  return "basic";
}

function normalizeConfiguration(
  raw: Record<string, unknown>,
  index: number,
): PfConfiguration {
  return {
    id: Number(raw.id) || index + 1,
    ruleName: String(raw.ruleName ?? "").trim() || `PF Rule ${index + 1}`,
    contributionBase: normalizeContributionBase(raw.contributionBase),
    employeePfEnabled: raw.employeePfEnabled !== false,
    employerPfEnabled: raw.employerPfEnabled !== false,
    employeeContributionRate: Math.max(0, Number(raw.employeeContributionRate) || 0),
    employerContributionRate: Math.max(0, Number(raw.employerContributionRate) || 0),
    applyWageCeiling: raw.applyWageCeiling === true,
    wageCeiling:
      raw.wageCeiling != null && raw.wageCeiling !== ""
        ? Math.max(0, Number(raw.wageCeiling))
        : null,
    epsEnabled: raw.epsEnabled === true,
    epsRate:
      raw.epsRate != null && raw.epsRate !== "" ? Math.max(0, Number(raw.epsRate)) : null,
    epsWageCeiling:
      raw.epsWageCeiling != null && raw.epsWageCeiling !== ""
        ? Math.max(0, Number(raw.epsWageCeiling))
        : null,
    edliEnabled: raw.edliEnabled === true,
    edliRate:
      raw.edliRate != null && raw.edliRate !== "" ? Math.max(0, Number(raw.edliRate)) : null,
    edliWageCeiling:
      raw.edliWageCeiling != null && raw.edliWageCeiling !== ""
        ? Math.max(0, Number(raw.edliWageCeiling))
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

export function loadPfConfigurations(): PfConfiguration[] {
  const raw = loadPolicyList(CONFIGS_STORAGE_KEY, structuredClone(EMPTY_SEED));
  return raw.map((r, i) => normalizeConfiguration(r as unknown as Record<string, unknown>, i));
}

export function savePfConfigurations(list: PfConfiguration[]): void {
  savePolicyList(CONFIGS_STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-pf-configurations-updated"));
  }
}

export function nextPfConfigurationId(list: PfConfiguration[]): number {
  return nextPolicyId(list);
}

export function withPfConfigNewAudit(
  partial: Omit<PfConfiguration, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
): PfConfiguration {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withPfConfigUpdateAudit(record: PfConfiguration): PfConfiguration {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function contributionBaseLabel(b: PfContributionBase): string {
  return PF_CONTRIBUTION_BASE_OPTIONS.find((o) => o.value === b)?.label ?? b;
}

export function formatPfRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${rate}%`;
}

export function formatPfMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatPfEffectivePeriod(cfg: PfConfiguration): string {
  const from = cfg.effectiveFrom || "—";
  if (!cfg.effectiveTo) return `${from} – Current`;
  return `${from} – ${cfg.effectiveTo}`;
}

export function formatPfCeilingDisplay(cfg: PfConfiguration): string {
  if (!cfg.applyWageCeiling || cfg.wageCeiling == null) return "—";
  return formatPfMoney(cfg.wageCeiling);
}

export function findEffectivePeriodConflicts(
  configs: PfConfiguration[],
  candidate: Pick<
    PfConfiguration,
    "id" | "effectiveFrom" | "effectiveTo" | "status"
  >,
): PfConfiguration[] {
  if (candidate.status !== "active") return [];
  const from = candidate.effectiveFrom;
  const to = candidate.effectiveTo ?? "9999-12-31";
  return configs.filter((c) => {
    if (c.id === candidate.id) return false;
    if (c.status !== "active") return false;
    const cFrom = c.effectiveFrom;
    const cTo = c.effectiveTo ?? "9999-12-31";
    return from <= cTo && cFrom <= to;
  });
}

function isConfigEffectiveOn(cfg: PfConfiguration, date: string): boolean {
  if (cfg.status !== "active") return false;
  if (cfg.effectiveFrom && cfg.effectiveFrom > date) return false;
  if (cfg.effectiveTo && cfg.effectiveTo < date) return false;
  return true;
}

export function findEffectivePfConfiguration(
  payrollDate?: string | null,
  configs?: PfConfiguration[],
): PfConfiguration | null {
  const date = (payrollDate || policyToday()).slice(0, 10);
  const list = configs ?? loadPfConfigurations();
  const matches = list
    .filter((c) => isConfigEffectiveOn(c, date))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matches[0] ?? null;
}

export function isEmployeePfComponentName(name: string): boolean {
  return name.trim().toLowerCase() === EMPLOYEE_PF_COMPONENT_NAME.toLowerCase();
}

export function isEmployerPfComponentName(name: string): boolean {
  return name.trim().toLowerCase() === EMPLOYER_PF_COMPONENT_NAME.toLowerCase();
}

export function isPfComponentName(name: string): boolean {
  return isEmployeePfComponentName(name) || isEmployerPfComponentName(name);
}

export function structureIncludesEmployeePf(
  structure: SalaryStructureRecord | null,
): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isEmployeePfComponentName(c.name);
  });
}

export function structureIncludesEmployerPf(
  structure: SalaryStructureRecord | null,
): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isEmployerPfComponentName(c.name);
  });
}

export function buildPfWageBaseAmounts(
  salaryResolution: EmployeeSalaryResolution | null | undefined,
): PfWageBaseAmounts {
  if (!salaryResolution) {
    return { basic: null, da: null, pfWages: null };
  }
  const findAmount = (...names: string[]) => {
    const set = new Set(names.map((n) => n.toLowerCase()));
    const line = salaryResolution.earnings.find((e) =>
      set.has(e.componentName.trim().toLowerCase()),
    );
    return line?.amount ?? null;
  };
  return {
    basic: findAmount("basic"),
    da: findAmount("da", "dearness allowance", "d.a."),
    pfWages: findAmount("pf wages", "eligible wages", "pf eligible wages"),
  };
}

function resolveEligibleWage(
  base: PfContributionBase,
  wages: PfWageBaseAmounts,
): { amount: number | null; error: string | null } {
  if (base === "basic") {
    if (wages.basic == null) {
      return { amount: null, error: "Basic amount is not available for PF contribution base." };
    }
    return { amount: wages.basic, error: null };
  }
  if (base === "basic_da") {
    if (wages.basic == null) {
      return { amount: null, error: "Basic amount is not available for Basic + DA base." };
    }
    if (wages.da == null) {
      return {
        amount: null,
        error:
          "DA is not available on this employee salary. Configure DA earnings or use Basic base.",
      };
    }
    return { amount: wages.basic + wages.da, error: null };
  }
  // pf_wages
  if (wages.pfWages != null) return { amount: wages.pfWages, error: null };
  if (wages.basic != null) {
    // Fallback only when explicit PF wages component missing — still report as config gap
    return {
      amount: null,
      error:
        "PF Wages / Eligible Wages component is not resolved. Add it to the structure or change contribution base.",
    };
  }
  return {
    amount: null,
    error: "PF Wages / Eligible Wages are not available for this employee.",
  };
}

function emptyResolution(
  partial: Partial<PfContributionResolution> & { status: PfCalcStatus },
): PfContributionResolution {
  return {
    status: partial.status,
    message: partial.message ?? null,
    configurationId: partial.configurationId ?? null,
    ruleName: partial.ruleName ?? null,
    contributionBase: partial.contributionBase ?? null,
    contributionBaseLabel: partial.contributionBaseLabel ?? null,
    eligiblePfWages: partial.eligiblePfWages ?? null,
    wageCeilingApplied: partial.wageCeilingApplied ?? false,
    appliedPfWage: partial.appliedPfWage ?? null,
    employeePfEnabled: partial.employeePfEnabled ?? false,
    employerPfEnabled: partial.employerPfEnabled ?? false,
    employeeRate: partial.employeeRate ?? null,
    employerRate: partial.employerRate ?? null,
    employeePfAmount: partial.employeePfAmount ?? null,
    employerPfTotal: partial.employerPfTotal ?? null,
    epsEnabled: partial.epsEnabled ?? false,
    epsRate: partial.epsRate ?? null,
    epsWageCeiling: partial.epsWageCeiling ?? null,
    epsAppliedWage: partial.epsAppliedWage ?? null,
    epsPortion: partial.epsPortion ?? null,
    employerEpfPortion: partial.employerEpfPortion ?? null,
    edliEnabled: partial.edliEnabled ?? false,
    edliRate: partial.edliRate ?? null,
    edliWageCeiling: partial.edliWageCeiling ?? null,
    edliAmount: partial.edliAmount ?? null,
    edliStatus: partial.edliStatus ?? "not_enabled",
    effectiveFrom: partial.effectiveFrom ?? null,
    effectiveTo: partial.effectiveTo ?? null,
  };
}

/**
 * Core PF resolver — data-driven; reusable by Payroll with period wages later.
 */
export function resolvePfContribution(
  input: ResolvePfContributionInput,
): PfContributionResolution {
  if (!input.hasEmployeePfInStructure && !input.hasEmployerPfInStructure) {
    return emptyResolution({
      status: "not_in_structure",
      message: "PF components are not included in the assigned salary structure.",
    });
  }

  if (!input.pfApplicable) {
    return emptyResolution({
      status: "not_applicable",
      message: "Provident Fund is marked Not Applicable for this employee.",
    });
  }

  const cfg = findEffectivePfConfiguration(input.payrollDate, input.configs);
  if (!cfg) {
    return emptyResolution({
      status: "not_configured",
      message: "Configure PF rules in Statutory Compliance → PF.",
    });
  }

  const baseLabel = contributionBaseLabel(cfg.contributionBase);
  const eligible = resolveEligibleWage(cfg.contributionBase, input.wageBases);
  if (eligible.error || eligible.amount == null) {
    return emptyResolution({
      status: "basis_unavailable",
      message: eligible.error ?? "PF contribution base cannot be resolved.",
      configurationId: cfg.id,
      ruleName: cfg.ruleName,
      contributionBase: cfg.contributionBase,
      contributionBaseLabel: baseLabel,
      employeePfEnabled: cfg.employeePfEnabled,
      employerPfEnabled: cfg.employerPfEnabled,
      employeeRate: cfg.employeeContributionRate,
      employerRate: cfg.employerContributionRate,
      epsEnabled: cfg.epsEnabled,
      epsRate: cfg.epsRate,
      epsWageCeiling: cfg.epsWageCeiling,
      edliEnabled: cfg.edliEnabled,
      edliRate: cfg.edliRate,
      edliWageCeiling: cfg.edliWageCeiling,
      edliStatus: cfg.edliEnabled ? "configured_deferred" : "not_enabled",
      effectiveFrom: cfg.effectiveFrom,
      effectiveTo: cfg.effectiveTo,
    });
  }

  const eligibleAmount = eligible.amount;
  const ceilingOn = cfg.applyWageCeiling && cfg.wageCeiling != null;
  const appliedPfWage = ceilingOn
    ? Math.min(eligibleAmount, cfg.wageCeiling!)
    : eligibleAmount;

  let employeePfAmount: number | null = null;
  if (cfg.employeePfEnabled && input.hasEmployeePfInStructure) {
    employeePfAmount = Math.round((appliedPfWage * cfg.employeeContributionRate) / 100);
  }

  let employerPfTotal: number | null = null;
  let epsPortion: number | null = null;
  let employerEpfPortion: number | null = null;
  let epsAppliedWage: number | null = null;

  if (cfg.employerPfEnabled && input.hasEmployerPfInStructure) {
    employerPfTotal = Math.round((appliedPfWage * cfg.employerContributionRate) / 100);

    if (cfg.epsEnabled && cfg.epsRate != null) {
      epsAppliedWage = appliedPfWage;
      if (cfg.epsWageCeiling != null) {
        epsAppliedWage = Math.min(epsAppliedWage, cfg.epsWageCeiling);
      }
      epsPortion = Math.round((epsAppliedWage * cfg.epsRate) / 100);
      employerEpfPortion = Math.max(0, employerPfTotal - epsPortion);
    } else {
      employerEpfPortion = employerPfTotal;
      epsPortion = null;
    }
  }

  const edliStatus: PfContributionResolution["edliStatus"] = cfg.edliEnabled
    ? "configured_deferred"
    : "not_enabled";

  return emptyResolution({
    status: "calculated",
    message: null,
    configurationId: cfg.id,
    ruleName: cfg.ruleName,
    contributionBase: cfg.contributionBase,
    contributionBaseLabel: baseLabel,
    eligiblePfWages: eligibleAmount,
    wageCeilingApplied: ceilingOn,
    appliedPfWage,
    employeePfEnabled: cfg.employeePfEnabled,
    employerPfEnabled: cfg.employerPfEnabled,
    employeeRate: cfg.employeeContributionRate,
    employerRate: cfg.employerContributionRate,
    employeePfAmount,
    employerPfTotal,
    epsEnabled: cfg.epsEnabled,
    epsRate: cfg.epsRate,
    epsWageCeiling: cfg.epsWageCeiling,
    epsAppliedWage,
    epsPortion,
    employerEpfPortion,
    edliEnabled: cfg.edliEnabled,
    edliRate: cfg.edliRate,
    edliWageCeiling: cfg.edliWageCeiling,
    edliAmount: null,
    edliStatus,
    effectiveFrom: cfg.effectiveFrom,
    effectiveTo: cfg.effectiveTo,
  });
}

/** Employee PF Applicable — default true when unset (structure may still omit PF). */
export function getEmployeePfApplicable(employee: HrEmployee): boolean {
  const v = employee.profileSummaries?.payroll?.pfApplicable;
  if (typeof v === "boolean") return v;
  return true;
}

export function resolveEmployeePf(
  employee: HrEmployee,
  options?: {
    structure?: SalaryStructureRecord | null;
    salaryResolution?: EmployeeSalaryResolution | null;
    payrollDate?: string | null;
  },
): EmployeePfDisplay {
  const structure =
    options?.structure !== undefined
      ? options.structure
      : getAssignedSalaryStructure(employee.employeeCode) ??
        (employee.profileSummaries?.payroll?.structure
          ? loadSalaryStructures().find(
              (s) => s.name === employee.profileSummaries?.payroll?.structure,
            ) ?? null
          : null);

  const hasEmployee = structureIncludesEmployeePf(structure);
  const hasEmployer = structureIncludesEmployerPf(structure);
  const pfApplicable = getEmployeePfApplicable(employee);
  const gov = employee.governmentIds;

  const resolution = resolvePfContribution({
    pfApplicable,
    hasEmployeePfInStructure: hasEmployee,
    hasEmployerPfInStructure: hasEmployer,
    wageBases: buildPfWageBaseAmounts(options?.salaryResolution),
    payrollDate: options?.payrollDate,
  });

  return {
    hasEmployeePfInStructure: hasEmployee,
    hasEmployerPfInStructure: hasEmployer,
    structureName: structure?.name ?? employee.profileSummaries?.payroll?.structure ?? null,
    pfApplicable,
    uan: gov?.uan?.trim() || "",
    pfNumber: gov?.pfNumber?.trim() || "",
    resolution,
  };
}

export function pfStatusLabel(status: PfCalcStatus): string {
  switch (status) {
    case "calculated":
      return "Calculated";
    case "not_configured":
      return "Not Configured";
    case "not_applicable":
      return "Not Applicable";
    case "not_in_structure":
      return "Not in Structure";
    case "configuration_error":
      return "Configuration Error";
    case "basis_unavailable":
      return "Configuration Required";
    default:
      return status;
  }
}

export function pfRuleStatusLabel(display: EmployeePfDisplay): string {
  if (!display.hasEmployeePfInStructure && !display.hasEmployerPfInStructure) {
    return "Not in Structure";
  }
  if (!display.pfApplicable) return "Not Applicable";
  const s = display.resolution.status;
  if (s === "calculated") return "Configured";
  if (s === "not_configured") return "Not Configured";
  if (s === "basis_unavailable" || s === "configuration_error") {
    return "Configuration Error";
  }
  return pfStatusLabel(s);
}

export function pfEmployeeBreakupAmountLabel(display: EmployeePfDisplay): string {
  if (!display.hasEmployeePfInStructure) return "—";
  if (!display.pfApplicable) return "Not Applicable";
  const r = display.resolution;
  if (r.status === "calculated" && r.employeePfAmount != null) {
    return formatPfMoney(r.employeePfAmount);
  }
  if (r.status === "not_configured") return "—";
  if (r.status === "basis_unavailable") return "—";
  return "—";
}

export function pfEmployerBreakupAmountLabel(display: EmployeePfDisplay): string {
  if (!display.hasEmployerPfInStructure) return "—";
  if (!display.pfApplicable) return "Not Applicable";
  const r = display.resolution;
  if (r.status === "calculated" && r.employerPfTotal != null) {
    return formatPfMoney(r.employerPfTotal);
  }
  if (r.status === "not_configured") return "—";
  if (r.status === "basis_unavailable") return "—";
  return "—";
}

export function pfBreakupCalculationLabel(display: EmployeePfDisplay): string {
  if (!display.pfApplicable) return "Not Applicable";
  const s = display.resolution.status;
  if (s === "not_configured") return "Not Configured";
  if (s === "basis_unavailable") return "Configuration Required";
  if (s === "calculated") return "System Calculated";
  return pfStatusLabel(s);
}
