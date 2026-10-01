/**
 * ESI — configurable statutory rule engine (frontend/demo).
 *
 * Ownership:
 * - Salary Component identifies Employee ESI / Employer ESI (System Calculated)
 * - ESI Settings define eligibility limit, rates, contribution base, effective dates
 * - Employee provides applicability + ESIC Number (Government IDs)
 * - Payroll will later call resolveEsiContribution with period wages
 *
 * No statutory rates or wage limits are hardcoded as legal truth.
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

export const EMPLOYEE_ESI_COMPONENT_NAME = "Employee ESI";
export const EMPLOYER_ESI_COMPONENT_NAME = "Employer ESI";
/** Legacy component name still recognized as employee ESI */
export const LEGACY_ESI_COMPONENT_NAME = "ESI";

const CONFIGS_STORAGE_KEY = "ds_hr_esi_configurations_v1";

export type EsiContributionBase =
  | "gross_earnings"
  | "esi_eligible_wages"
  | "configured_earnings";

export type EsiCalcStatus =
  | "calculated"
  | "not_configured"
  | "not_applicable"
  | "above_wage_limit"
  | "not_in_structure"
  | "configuration_error"
  | "basis_unavailable"
  | "disabled";

export interface EsiConfiguration {
  id: number;
  ruleName: string;
  esiEnabled: boolean;
  contributionBase: EsiContributionBase;
  /** Monthly wage eligibility ceiling — above this, ESI not applicable by rule */
  wageEligibilityLimit: number;
  employeeContributionRate: number;
  employerContributionRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EsiWageBaseAmounts {
  grossEarnings: number | null;
  esiEligibleWages: number | null;
  configuredEarnings: number | null;
}

export interface ResolveEsiContributionInput {
  esiApplicable: boolean;
  hasEmployeeEsiInStructure: boolean;
  hasEmployerEsiInStructure: boolean;
  wageBases: EsiWageBaseAmounts;
  payrollDate?: string | null;
  configs?: EsiConfiguration[];
}

export interface EsiContributionResolution {
  status: EsiCalcStatus;
  message: string | null;
  configurationId: number | null;
  ruleName: string | null;
  contributionBase: EsiContributionBase | null;
  contributionBaseLabel: string | null;
  eligibleWage: number | null;
  wageEligibilityLimit: number | null;
  withinWageLimit: boolean | null;
  employeeRate: number | null;
  employerRate: number | null;
  employeeEsiAmount: number | null;
  employerEsiAmount: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface EmployeeEsiDisplay {
  hasEmployeeEsiInStructure: boolean;
  hasEmployerEsiInStructure: boolean;
  structureName: string | null;
  esiApplicable: boolean;
  esicNumber: string;
  resolution: EsiContributionResolution;
}

export const ESI_CONTRIBUTION_BASE_OPTIONS: {
  value: EsiContributionBase;
  label: string;
  helper: string;
}[] = [
  {
    value: "gross_earnings",
    label: "Gross Earnings",
    helper: "Sum of configured earning components for the month",
  },
  {
    value: "configured_earnings",
    label: "Configured Earning Components",
    helper: "Same as resolved configured earnings total",
  },
  {
    value: "esi_eligible_wages",
    label: "ESI Eligible Wages",
    helper: "Uses an ESI Eligible Wages earning component when present",
  },
];

const EMPTY_SEED: EsiConfiguration[] = [];

function normalizeContributionBase(raw: unknown): EsiContributionBase {
  const s = String(raw ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "esi_eligible_wages" || s === "eligible_wages") return "esi_eligible_wages";
  if (s === "configured_earnings" || s === "configured_earning_components") {
    return "configured_earnings";
  }
  return "gross_earnings";
}

function normalizeConfiguration(
  raw: Record<string, unknown>,
  index: number,
): EsiConfiguration {
  return {
    id: Number(raw.id) || index + 1,
    ruleName: String(raw.ruleName ?? "").trim() || `ESI Rule ${index + 1}`,
    esiEnabled: raw.esiEnabled !== false,
    contributionBase: normalizeContributionBase(raw.contributionBase),
    wageEligibilityLimit: Math.max(0, Number(raw.wageEligibilityLimit) || 0),
    employeeContributionRate: Math.max(0, Number(raw.employeeContributionRate) || 0),
    employerContributionRate: Math.max(0, Number(raw.employerContributionRate) || 0),
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

export function loadEsiConfigurations(): EsiConfiguration[] {
  const raw = loadPolicyList(CONFIGS_STORAGE_KEY, structuredClone(EMPTY_SEED));
  return raw.map((r, i) => normalizeConfiguration(r as unknown as Record<string, unknown>, i));
}

export function saveEsiConfigurations(list: EsiConfiguration[]): void {
  savePolicyList(CONFIGS_STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-esi-configurations-updated"));
  }
}

export function nextEsiConfigurationId(list: EsiConfiguration[]): number {
  return nextPolicyId(list);
}

export function withEsiConfigNewAudit(
  partial: Omit<EsiConfiguration, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
): EsiConfiguration {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withEsiConfigUpdateAudit(record: EsiConfiguration): EsiConfiguration {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function contributionBaseLabel(b: EsiContributionBase): string {
  return ESI_CONTRIBUTION_BASE_OPTIONS.find((o) => o.value === b)?.label ?? b;
}

export function formatEsiRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${rate}%`;
}

export function formatEsiMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatEsiEffectivePeriod(cfg: EsiConfiguration): string {
  const from = cfg.effectiveFrom || "—";
  if (!cfg.effectiveTo) return `${from} – Current`;
  return `${from} – ${cfg.effectiveTo}`;
}

export function findEffectivePeriodConflicts(
  configs: EsiConfiguration[],
  candidate: Pick<EsiConfiguration, "id" | "effectiveFrom" | "effectiveTo" | "status">,
): EsiConfiguration[] {
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

function isConfigEffectiveOn(cfg: EsiConfiguration, date: string): boolean {
  if (cfg.status !== "active") return false;
  if (cfg.effectiveFrom && cfg.effectiveFrom > date) return false;
  if (cfg.effectiveTo && cfg.effectiveTo < date) return false;
  return true;
}

export function findEffectiveEsiConfiguration(
  payrollDate?: string | null,
  configs?: EsiConfiguration[],
): EsiConfiguration | null {
  const date = (payrollDate || policyToday()).slice(0, 10);
  const list = configs ?? loadEsiConfigurations();
  const matches = list
    .filter((c) => isConfigEffectiveOn(c, date))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matches[0] ?? null;
}

export function isEmployeeEsiComponentName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === EMPLOYEE_ESI_COMPONENT_NAME.toLowerCase() ||
    n === LEGACY_ESI_COMPONENT_NAME.toLowerCase()
  );
}

export function isEmployerEsiComponentName(name: string): boolean {
  return name.trim().toLowerCase() === EMPLOYER_ESI_COMPONENT_NAME.toLowerCase();
}

export function isEsiComponentName(name: string): boolean {
  return isEmployeeEsiComponentName(name) || isEmployerEsiComponentName(name);
}

export function structureIncludesEmployeeEsi(
  structure: SalaryStructureRecord | null,
): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isEmployeeEsiComponentName(c.name);
  });
}

export function structureIncludesEmployerEsi(
  structure: SalaryStructureRecord | null,
): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isEmployerEsiComponentName(c.name);
  });
}

export function buildEsiWageBaseAmounts(
  salaryResolution: EmployeeSalaryResolution | null | undefined,
): EsiWageBaseAmounts {
  if (!salaryResolution) {
    return { grossEarnings: null, esiEligibleWages: null, configuredEarnings: null };
  }
  const findAmount = (...names: string[]) => {
    const set = new Set(names.map((n) => n.toLowerCase()));
    const line = salaryResolution.earnings.find((e) =>
      set.has(e.componentName.trim().toLowerCase()),
    );
    return line?.amount ?? null;
  };
  const configured = salaryResolution.configuredEarningsTotal;
  return {
    grossEarnings: configured,
    configuredEarnings: configured,
    esiEligibleWages: findAmount(
      "esi eligible wages",
      "esi wages",
      "eligible wages",
    ),
  };
}

function resolveEligibleWage(
  base: EsiContributionBase,
  wages: EsiWageBaseAmounts,
): { amount: number | null; error: string | null } {
  if (base === "gross_earnings") {
    if (wages.grossEarnings == null) {
      return {
        amount: null,
        error: "Gross earnings are not available for ESI contribution base.",
      };
    }
    return { amount: wages.grossEarnings, error: null };
  }
  if (base === "configured_earnings") {
    if (wages.configuredEarnings == null) {
      return {
        amount: null,
        error: "Configured earnings are not available for ESI contribution base.",
      };
    }
    return { amount: wages.configuredEarnings, error: null };
  }
  if (wages.esiEligibleWages == null) {
    return {
      amount: null,
      error:
        "ESI Eligible Wages component is not resolved. Add it to the structure or use Gross Earnings.",
    };
  }
  return { amount: wages.esiEligibleWages, error: null };
}

function emptyResolution(
  partial: Partial<EsiContributionResolution> & { status: EsiCalcStatus },
): EsiContributionResolution {
  return {
    status: partial.status,
    message: partial.message ?? null,
    configurationId: partial.configurationId ?? null,
    ruleName: partial.ruleName ?? null,
    contributionBase: partial.contributionBase ?? null,
    contributionBaseLabel: partial.contributionBaseLabel ?? null,
    eligibleWage: partial.eligibleWage ?? null,
    wageEligibilityLimit: partial.wageEligibilityLimit ?? null,
    withinWageLimit: partial.withinWageLimit ?? null,
    employeeRate: partial.employeeRate ?? null,
    employerRate: partial.employerRate ?? null,
    employeeEsiAmount: partial.employeeEsiAmount ?? null,
    employerEsiAmount: partial.employerEsiAmount ?? null,
    effectiveFrom: partial.effectiveFrom ?? null,
    effectiveTo: partial.effectiveTo ?? null,
  };
}

/**
 * Core ESI resolver — data-driven; reusable by Payroll with period wages later.
 */
export function resolveEsiContribution(
  input: ResolveEsiContributionInput,
): EsiContributionResolution {
  if (!input.hasEmployeeEsiInStructure && !input.hasEmployerEsiInStructure) {
    return emptyResolution({
      status: "not_in_structure",
      message: "ESI components are not included in the assigned salary structure.",
    });
  }

  if (!input.esiApplicable) {
    return emptyResolution({
      status: "not_applicable",
      message: "ESI is marked Not Applicable for this employee.",
    });
  }

  const cfg = findEffectiveEsiConfiguration(input.payrollDate, input.configs);
  if (!cfg) {
    return emptyResolution({
      status: "not_configured",
      message: "Configure ESI rules in Statutory Compliance → ESI.",
    });
  }

  if (!cfg.esiEnabled) {
    return emptyResolution({
      status: "disabled",
      message: `ESI rule "${cfg.ruleName}" is disabled.`,
      configurationId: cfg.id,
      ruleName: cfg.ruleName,
      contributionBase: cfg.contributionBase,
      contributionBaseLabel: contributionBaseLabel(cfg.contributionBase),
      wageEligibilityLimit: cfg.wageEligibilityLimit,
      employeeRate: cfg.employeeContributionRate,
      employerRate: cfg.employerContributionRate,
      effectiveFrom: cfg.effectiveFrom,
      effectiveTo: cfg.effectiveTo,
    });
  }

  const baseLabel = contributionBaseLabel(cfg.contributionBase);
  const eligible = resolveEligibleWage(cfg.contributionBase, input.wageBases);
  if (eligible.error || eligible.amount == null) {
    return emptyResolution({
      status: "basis_unavailable",
      message: eligible.error ?? "ESI contribution base cannot be resolved.",
      configurationId: cfg.id,
      ruleName: cfg.ruleName,
      contributionBase: cfg.contributionBase,
      contributionBaseLabel: baseLabel,
      wageEligibilityLimit: cfg.wageEligibilityLimit,
      employeeRate: cfg.employeeContributionRate,
      employerRate: cfg.employerContributionRate,
      effectiveFrom: cfg.effectiveFrom,
      effectiveTo: cfg.effectiveTo,
    });
  }

  const eligibleWage = eligible.amount;
  const withinLimit = eligibleWage <= cfg.wageEligibilityLimit;

  if (!withinLimit) {
    return emptyResolution({
      status: "above_wage_limit",
      message: `Eligible wage ${formatEsiMoney(eligibleWage)} exceeds configured wage eligibility limit ${formatEsiMoney(cfg.wageEligibilityLimit)}.`,
      configurationId: cfg.id,
      ruleName: cfg.ruleName,
      contributionBase: cfg.contributionBase,
      contributionBaseLabel: baseLabel,
      eligibleWage,
      wageEligibilityLimit: cfg.wageEligibilityLimit,
      withinWageLimit: false,
      employeeRate: cfg.employeeContributionRate,
      employerRate: cfg.employerContributionRate,
      effectiveFrom: cfg.effectiveFrom,
      effectiveTo: cfg.effectiveTo,
    });
  }

  const employeeEsiAmount = input.hasEmployeeEsiInStructure
    ? Math.round((eligibleWage * cfg.employeeContributionRate) / 100)
    : null;
  const employerEsiAmount = input.hasEmployerEsiInStructure
    ? Math.round((eligibleWage * cfg.employerContributionRate) / 100)
    : null;

  return emptyResolution({
    status: "calculated",
    message: null,
    configurationId: cfg.id,
    ruleName: cfg.ruleName,
    contributionBase: cfg.contributionBase,
    contributionBaseLabel: baseLabel,
    eligibleWage,
    wageEligibilityLimit: cfg.wageEligibilityLimit,
    withinWageLimit: true,
    employeeRate: cfg.employeeContributionRate,
    employerRate: cfg.employerContributionRate,
    employeeEsiAmount,
    employerEsiAmount,
    effectiveFrom: cfg.effectiveFrom,
    effectiveTo: cfg.effectiveTo,
  });
}

/** Employee ESI Applicable — default true when unset. */
export function getEmployeeEsiApplicable(employee: HrEmployee): boolean {
  const v = employee.profileSummaries?.payroll?.esiApplicable;
  if (typeof v === "boolean") return v;
  return true;
}

export function resolveEmployeeEsi(
  employee: HrEmployee,
  options?: {
    structure?: SalaryStructureRecord | null;
    salaryResolution?: EmployeeSalaryResolution | null;
    payrollDate?: string | null;
  },
): EmployeeEsiDisplay {
  const structure =
    options?.structure !== undefined
      ? options.structure
      : getAssignedSalaryStructure(employee.employeeCode) ??
        (employee.profileSummaries?.payroll?.structure
          ? loadSalaryStructures().find(
              (s) => s.name === employee.profileSummaries?.payroll?.structure,
            ) ?? null
          : null);

  const hasEmployee = structureIncludesEmployeeEsi(structure);
  const hasEmployer = structureIncludesEmployerEsi(structure);
  const esiApplicable = getEmployeeEsiApplicable(employee);
  const gov = employee.governmentIds;

  const resolution = resolveEsiContribution({
    esiApplicable,
    hasEmployeeEsiInStructure: hasEmployee,
    hasEmployerEsiInStructure: hasEmployer,
    wageBases: buildEsiWageBaseAmounts(options?.salaryResolution),
    payrollDate: options?.payrollDate,
  });

  return {
    hasEmployeeEsiInStructure: hasEmployee,
    hasEmployerEsiInStructure: hasEmployer,
    structureName: structure?.name ?? employee.profileSummaries?.payroll?.structure ?? null,
    esiApplicable,
    esicNumber: gov?.esicNumber?.trim() || "",
    resolution,
  };
}

export function esiStatusLabel(status: EsiCalcStatus): string {
  switch (status) {
    case "calculated":
      return "Calculated";
    case "not_configured":
      return "Not Configured";
    case "not_applicable":
      return "Not Applicable";
    case "above_wage_limit":
      return "Above Wage Limit";
    case "not_in_structure":
      return "Not in Structure";
    case "configuration_error":
      return "Configuration Error";
    case "basis_unavailable":
      return "Configuration Required";
    case "disabled":
      return "Rule Disabled";
    default:
      return status;
  }
}

export function esiRuleStatusLabel(display: EmployeeEsiDisplay): string {
  if (!display.hasEmployeeEsiInStructure && !display.hasEmployerEsiInStructure) {
    return "Not in Structure";
  }
  if (!display.esiApplicable) return "Not Applicable";
  const s = display.resolution.status;
  if (s === "calculated") return "Configured";
  if (s === "not_configured") return "Not Configured";
  if (s === "above_wage_limit") return "Above Wage Limit";
  if (s === "basis_unavailable" || s === "configuration_error") {
    return "Configuration Error";
  }
  if (s === "disabled") return "Rule Disabled";
  return esiStatusLabel(s);
}

export function esiEmployeeBreakupAmountLabel(display: EmployeeEsiDisplay): string {
  if (!display.hasEmployeeEsiInStructure) return "—";
  if (!display.esiApplicable) return "Not Applicable";
  const r = display.resolution;
  if (r.status === "calculated" && r.employeeEsiAmount != null) {
    return formatEsiMoney(r.employeeEsiAmount);
  }
  if (r.status === "above_wage_limit") return "Not Eligible";
  return "—";
}

export function esiEmployerBreakupAmountLabel(display: EmployeeEsiDisplay): string {
  if (!display.hasEmployerEsiInStructure) return "—";
  if (!display.esiApplicable) return "Not Applicable";
  const r = display.resolution;
  if (r.status === "calculated" && r.employerEsiAmount != null) {
    return formatEsiMoney(r.employerEsiAmount);
  }
  if (r.status === "above_wage_limit") return "Not Eligible";
  return "—";
}

export function esiBreakupCalculationLabel(display: EmployeeEsiDisplay): string {
  if (!display.esiApplicable) return "Not Applicable";
  const s = display.resolution.status;
  if (s === "not_configured") return "Not Configured";
  if (s === "above_wage_limit") return "Above Wage Limit";
  if (s === "basis_unavailable") return "Configuration Required";
  if (s === "calculated") return "System Calculated";
  return esiStatusLabel(s);
}
