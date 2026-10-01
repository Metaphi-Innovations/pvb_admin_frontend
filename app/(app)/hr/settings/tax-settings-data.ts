/**
 * Tax / TDS foundation — configurable regimes + income-tax slabs (frontend/demo).
 *
 * Ownership:
 * - Salary Component identifies TDS (System Calculated)
 * - Tax Regime Settings define Old/New regime defaults (standard deduction, etc.)
 * - TDS Settings define effective-dated slabs per regime
 * - Employee selects/has tax regime
 * - Payroll will later refine monthly TDS with declarations / Form 16
 *
 * No Income Tax Act rates are hardcoded as legal truth.
 * Declaration Categories / Form 16 generation are out of scope for this foundation.
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

export const TDS_COMPONENT_NAME = "TDS";

const REGIME_STORAGE_KEY = "ds_hr_tax_regime_configurations_v1";
const SLAB_STORAGE_KEY = "ds_hr_tds_slab_configurations_v1";

export type TaxRegimeType = "old" | "new";

export type EmployeeTaxRegimeChoice = TaxRegimeType | "company_default";

export type TdsCalcStatus =
  | "calculated"
  | "not_configured"
  | "regime_missing"
  | "slabs_missing"
  | "ctc_missing"
  | "not_in_structure";

export interface TaxRegimeConfiguration {
  id: number;
  ruleName: string;
  regimeType: TaxRegimeType;
  /** When active, used as company default for new employees / company_default choice */
  isCompanyDefault: boolean;
  /** Annual standard deduction ₹ — configurable, not hardcoded law */
  standardDeduction: number | null;
  notes: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TdsIncomeSlab {
  id: number;
  /** Inclusive lower bound of annual taxable income */
  incomeFrom: number;
  /** Inclusive upper bound; null = and above */
  incomeTo: number | null;
  /** Tax rate % for this band (progressive) */
  ratePercent: number;
  /** Optional cess % on tax of this band */
  cessPercent: number;
}

export interface TdsSlabConfiguration {
  id: number;
  ruleName: string;
  regimeType: TaxRegimeType;
  slabs: TdsIncomeSlab[];
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TdsResolution {
  status: TdsCalcStatus;
  message: string | null;
  regimeType: TaxRegimeType | null;
  regimeSource: "employee" | "company_default" | null;
  regimeRuleName: string | null;
  standardDeduction: number | null;
  projectedAnnualIncome: number | null;
  taxableIncomeEstimate: number | null;
  annualTaxEstimate: number | null;
  monthlyTdsEstimate: number | null;
  slabConfigurationId: number | null;
  slabRuleName: string | null;
  effectiveFrom: string | null;
}

export interface EmployeeTaxDisplay {
  hasTdsInStructure: boolean;
  structureName: string | null;
  employeeChoice: EmployeeTaxRegimeChoice;
  resolution: TdsResolution;
}

export const TAX_REGIME_TYPE_OPTIONS: { value: TaxRegimeType; label: string }[] = [
  { value: "old", label: "Old Regime" },
  { value: "new", label: "New Regime" },
];

export const EMPLOYEE_TAX_REGIME_OPTIONS: {
  value: EmployeeTaxRegimeChoice;
  label: string;
}[] = [
  { value: "company_default", label: "Company Default" },
  { value: "old", label: "Old Regime" },
  { value: "new", label: "New Regime" },
];

const EMPTY_REGIME_SEED: TaxRegimeConfiguration[] = [];
const EMPTY_SLAB_SEED: TdsSlabConfiguration[] = [];

function normalizeRegimeType(raw: unknown): TaxRegimeType {
  const s = String(raw ?? "").toLowerCase();
  return s === "old" ? "old" : "new";
}

function normalizeRegime(
  raw: Record<string, unknown>,
  index: number,
): TaxRegimeConfiguration {
  return {
    id: Number(raw.id) || index + 1,
    ruleName: String(raw.ruleName ?? "").trim() || `Tax Regime ${index + 1}`,
    regimeType: normalizeRegimeType(raw.regimeType),
    isCompanyDefault: raw.isCompanyDefault === true,
    standardDeduction:
      raw.standardDeduction != null && raw.standardDeduction !== ""
        ? Math.max(0, Number(raw.standardDeduction))
        : null,
    notes: typeof raw.notes === "string" ? raw.notes : "",
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

function normalizeSlabRow(raw: Record<string, unknown>, index: number): TdsIncomeSlab {
  return {
    id: Number(raw.id) || index + 1,
    incomeFrom: Math.max(0, Number(raw.incomeFrom) || 0),
    incomeTo:
      raw.incomeTo != null && raw.incomeTo !== ""
        ? Math.max(0, Number(raw.incomeTo))
        : null,
    ratePercent: Math.max(0, Number(raw.ratePercent) || 0),
    cessPercent: Math.max(0, Number(raw.cessPercent) || 0),
  };
}

function normalizeSlabConfig(
  raw: Record<string, unknown>,
  index: number,
): TdsSlabConfiguration {
  const slabsRaw = Array.isArray(raw.slabs) ? raw.slabs : [];
  return {
    id: Number(raw.id) || index + 1,
    ruleName: String(raw.ruleName ?? "").trim() || `TDS Slabs ${index + 1}`,
    regimeType: normalizeRegimeType(raw.regimeType),
    slabs: slabsRaw.map((s, i) =>
      normalizeSlabRow((s ?? {}) as Record<string, unknown>, i),
    ),
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

function isEffectiveOn(
  from: string,
  to: string | null,
  status: PolicyStatus,
  date: string,
): boolean {
  if (status !== "active") return false;
  if (from && from > date) return false;
  if (to && to < date) return false;
  return true;
}

/* ─── Tax Regime CRUD ───────────────────────────────────────── */

export function loadTaxRegimeConfigurations(): TaxRegimeConfiguration[] {
  const raw = loadPolicyList(REGIME_STORAGE_KEY, structuredClone(EMPTY_REGIME_SEED));
  return raw.map((r, i) => normalizeRegime(r as unknown as Record<string, unknown>, i));
}

export function saveTaxRegimeConfigurations(list: TaxRegimeConfiguration[]): void {
  savePolicyList(REGIME_STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-tax-regime-configurations-updated"));
  }
}

export function nextTaxRegimeConfigurationId(list: TaxRegimeConfiguration[]): number {
  return nextPolicyId(list);
}

export function withTaxRegimeNewAudit(
  partial: Omit<
    TaxRegimeConfiguration,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): TaxRegimeConfiguration {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withTaxRegimeUpdateAudit(
  record: TaxRegimeConfiguration,
): TaxRegimeConfiguration {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function findEffectiveTaxRegime(
  regimeType: TaxRegimeType,
  payrollDate?: string | null,
  configs?: TaxRegimeConfiguration[],
): TaxRegimeConfiguration | null {
  const date = (payrollDate || policyToday()).slice(0, 10);
  const list = configs ?? loadTaxRegimeConfigurations();
  const matches = list
    .filter(
      (c) =>
        c.regimeType === regimeType &&
        isEffectiveOn(c.effectiveFrom, c.effectiveTo, c.status, date),
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matches[0] ?? null;
}

export function findCompanyDefaultTaxRegime(
  payrollDate?: string | null,
  configs?: TaxRegimeConfiguration[],
): TaxRegimeConfiguration | null {
  const date = (payrollDate || policyToday()).slice(0, 10);
  const list = configs ?? loadTaxRegimeConfigurations();
  const matches = list
    .filter(
      (c) =>
        c.isCompanyDefault &&
        isEffectiveOn(c.effectiveFrom, c.effectiveTo, c.status, date),
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matches[0] ?? null;
}

export function findRegimePeriodConflicts(
  configs: TaxRegimeConfiguration[],
  candidate: Pick<
    TaxRegimeConfiguration,
    "id" | "regimeType" | "effectiveFrom" | "effectiveTo" | "status"
  >,
): TaxRegimeConfiguration[] {
  if (candidate.status !== "active") return [];
  const from = candidate.effectiveFrom;
  const to = candidate.effectiveTo ?? "9999-12-31";
  return configs.filter((c) => {
    if (c.id === candidate.id) return false;
    if (c.status !== "active") return false;
    if (c.regimeType !== candidate.regimeType) return false;
    const cFrom = c.effectiveFrom;
    const cTo = c.effectiveTo ?? "9999-12-31";
    return from <= cTo && cFrom <= to;
  });
}

/* ─── TDS Slab CRUD ─────────────────────────────────────────── */

export function loadTdsSlabConfigurations(): TdsSlabConfiguration[] {
  const raw = loadPolicyList(SLAB_STORAGE_KEY, structuredClone(EMPTY_SLAB_SEED));
  return raw.map((r, i) => normalizeSlabConfig(r as unknown as Record<string, unknown>, i));
}

export function saveTdsSlabConfigurations(list: TdsSlabConfiguration[]): void {
  savePolicyList(SLAB_STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-tds-slab-configurations-updated"));
  }
}

export function nextTdsSlabConfigurationId(list: TdsSlabConfiguration[]): number {
  return nextPolicyId(list);
}

export function withTdsSlabNewAudit(
  partial: Omit<
    TdsSlabConfiguration,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): TdsSlabConfiguration {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withTdsSlabUpdateAudit(record: TdsSlabConfiguration): TdsSlabConfiguration {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function findEffectiveTdsSlabs(
  regimeType: TaxRegimeType,
  payrollDate?: string | null,
  configs?: TdsSlabConfiguration[],
): TdsSlabConfiguration | null {
  const date = (payrollDate || policyToday()).slice(0, 10);
  const list = configs ?? loadTdsSlabConfigurations();
  const matches = list
    .filter(
      (c) =>
        c.regimeType === regimeType &&
        c.slabs.length > 0 &&
        isEffectiveOn(c.effectiveFrom, c.effectiveTo, c.status, date),
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matches[0] ?? null;
}

export function findSlabPeriodConflicts(
  configs: TdsSlabConfiguration[],
  candidate: Pick<
    TdsSlabConfiguration,
    "id" | "regimeType" | "effectiveFrom" | "effectiveTo" | "status"
  >,
): TdsSlabConfiguration[] {
  if (candidate.status !== "active") return [];
  const from = candidate.effectiveFrom;
  const to = candidate.effectiveTo ?? "9999-12-31";
  return configs.filter((c) => {
    if (c.id === candidate.id) return false;
    if (c.status !== "active") return false;
    if (c.regimeType !== candidate.regimeType) return false;
    const cFrom = c.effectiveFrom;
    const cTo = c.effectiveTo ?? "9999-12-31";
    return from <= cTo && cFrom <= to;
  });
}

export function findSlabIncomeOverlaps(
  slabs: TdsIncomeSlab[],
): { aIndex: number; bIndex: number }[] {
  const conflicts: { aIndex: number; bIndex: number }[] = [];
  for (let i = 0; i < slabs.length; i++) {
    for (let j = i + 1; j < slabs.length; j++) {
      const a = slabs[i]!;
      const b = slabs[j]!;
      const aHi = a.incomeTo == null ? Number.POSITIVE_INFINITY : a.incomeTo;
      const bHi = b.incomeTo == null ? Number.POSITIVE_INFINITY : b.incomeTo;
      if (a.incomeFrom <= bHi && b.incomeFrom <= aHi) {
        conflicts.push({ aIndex: i, bIndex: j });
      }
    }
  }
  return conflicts;
}

/* ─── Labels / formatters ───────────────────────────────────── */

export function regimeTypeLabel(t: TaxRegimeType): string {
  return TAX_REGIME_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function formatTaxMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatTaxRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${rate}%`;
}

export function formatIncomeRange(slab: TdsIncomeSlab): string {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (slab.incomeTo == null) return `${fmt(slab.incomeFrom)} and above`;
  return `${fmt(slab.incomeFrom)} – ${fmt(slab.incomeTo)}`;
}

export function formatTaxEffectivePeriod(from: string, to: string | null): string {
  if (!to) return `${from || "—"} – Current`;
  return `${from || "—"} – ${to}`;
}

export function isTdsComponentName(name: string): boolean {
  return name.trim().toLowerCase() === TDS_COMPONENT_NAME.toLowerCase();
}

export function structureIncludesTds(structure: SalaryStructureRecord | null): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isTdsComponentName(c.name);
  });
}

/**
 * Progressive annual tax from configured slabs.
 * Taxable income is allocated across bands in ascending incomeFrom order.
 */
export function computeProgressiveAnnualTax(
  taxableIncome: number,
  slabs: TdsIncomeSlab[],
): number {
  if (!Number.isFinite(taxableIncome) || taxableIncome <= 0 || slabs.length === 0) {
    return 0;
  }
  const ordered = [...slabs].sort((a, b) => a.incomeFrom - b.incomeFrom);
  let tax = 0;
  for (const slab of ordered) {
    const bandStart = slab.incomeFrom;
    const bandEnd = slab.incomeTo == null ? Number.POSITIVE_INFINITY : slab.incomeTo;
    if (taxableIncome <= bandStart) continue;
    const taxableInBand = Math.min(taxableIncome, bandEnd) - bandStart;
    if (taxableInBand <= 0) continue;
    const bandTax = (taxableInBand * slab.ratePercent) / 100;
    const cess = (bandTax * (slab.cessPercent || 0)) / 100;
    tax += bandTax + cess;
  }
  return Math.round(tax);
}

function emptyTdsResolution(
  partial: Partial<TdsResolution> & { status: TdsCalcStatus },
): TdsResolution {
  return {
    status: partial.status,
    message: partial.message ?? null,
    regimeType: partial.regimeType ?? null,
    regimeSource: partial.regimeSource ?? null,
    regimeRuleName: partial.regimeRuleName ?? null,
    standardDeduction: partial.standardDeduction ?? null,
    projectedAnnualIncome: partial.projectedAnnualIncome ?? null,
    taxableIncomeEstimate: partial.taxableIncomeEstimate ?? null,
    annualTaxEstimate: partial.annualTaxEstimate ?? null,
    monthlyTdsEstimate: partial.monthlyTdsEstimate ?? null,
    slabConfigurationId: partial.slabConfigurationId ?? null,
    slabRuleName: partial.slabRuleName ?? null,
    effectiveFrom: partial.effectiveFrom ?? null,
  };
}

export function getEmployeeTaxRegimeChoice(
  employee: HrEmployee,
): EmployeeTaxRegimeChoice {
  const v = employee.profileSummaries?.payroll?.taxRegime;
  if (v === "old" || v === "new" || v === "company_default") return v;
  return "company_default";
}

/**
 * Foundation TDS resolver — projected from Monthly CTC.
 * Does NOT apply investment declarations or Form 16 (out of scope).
 */
export function resolveTdsEstimate(input: {
  hasTdsInStructure: boolean;
  employeeChoice: EmployeeTaxRegimeChoice;
  monthlyCtc: number | null;
  payrollDate?: string | null;
}): TdsResolution {
  if (!input.hasTdsInStructure) {
    return emptyTdsResolution({
      status: "not_in_structure",
      message: "TDS is not included in the assigned salary structure.",
    });
  }

  const regimes = loadTaxRegimeConfigurations();
  let regimeType: TaxRegimeType | null = null;
  let regimeSource: TdsResolution["regimeSource"] = null;
  let regimeCfg: TaxRegimeConfiguration | null = null;

  if (input.employeeChoice === "company_default") {
    regimeCfg = findCompanyDefaultTaxRegime(input.payrollDate, regimes);
    if (!regimeCfg) {
      return emptyTdsResolution({
        status: "regime_missing",
        message:
          "No company default Tax Regime is configured. Set one under Tax Settings → Tax Regime.",
      });
    }
    regimeType = regimeCfg.regimeType;
    regimeSource = "company_default";
  } else {
    regimeType = input.employeeChoice;
    regimeSource = "employee";
    regimeCfg = findEffectiveTaxRegime(regimeType, input.payrollDate, regimes);
    if (!regimeCfg) {
      return emptyTdsResolution({
        status: "regime_missing",
        regimeType,
        regimeSource,
        message: `No active ${regimeTypeLabel(regimeType)} configuration for the current period.`,
      });
    }
  }

  if (input.monthlyCtc == null || input.monthlyCtc <= 0) {
    return emptyTdsResolution({
      status: "ctc_missing",
      regimeType,
      regimeSource,
      regimeRuleName: regimeCfg.ruleName,
      standardDeduction: regimeCfg.standardDeduction,
      message: "Monthly CTC is required to project taxable income for TDS.",
      effectiveFrom: regimeCfg.effectiveFrom,
    });
  }

  const slabsCfg = findEffectiveTdsSlabs(regimeType, input.payrollDate);
  if (!slabsCfg) {
    return emptyTdsResolution({
      status: "slabs_missing",
      regimeType,
      regimeSource,
      regimeRuleName: regimeCfg.ruleName,
      standardDeduction: regimeCfg.standardDeduction,
      projectedAnnualIncome: Math.round(input.monthlyCtc * 12),
      message: "Configure TDS income slabs in Tax Settings → TDS Settings.",
      effectiveFrom: regimeCfg.effectiveFrom,
    });
  }

  const projectedAnnual = Math.round(input.monthlyCtc * 12);
  const stdDed = regimeCfg.standardDeduction ?? 0;
  const taxable = Math.max(0, projectedAnnual - stdDed);
  const annualTax = computeProgressiveAnnualTax(taxable, slabsCfg.slabs);
  const monthly = Math.round(annualTax / 12);

  return emptyTdsResolution({
    status: "calculated",
    message: null,
    regimeType,
    regimeSource,
    regimeRuleName: regimeCfg.ruleName,
    standardDeduction: regimeCfg.standardDeduction,
    projectedAnnualIncome: projectedAnnual,
    taxableIncomeEstimate: taxable,
    annualTaxEstimate: annualTax,
    monthlyTdsEstimate: monthly,
    slabConfigurationId: slabsCfg.id,
    slabRuleName: slabsCfg.ruleName,
    effectiveFrom: slabsCfg.effectiveFrom,
  });
}

export function resolveEmployeeTax(
  employee: HrEmployee,
  options?: {
    structure?: SalaryStructureRecord | null;
    salaryResolution?: EmployeeSalaryResolution | null;
    payrollDate?: string | null;
  },
): EmployeeTaxDisplay {
  const structure =
    options?.structure !== undefined
      ? options.structure
      : getAssignedSalaryStructure(employee.employeeCode) ??
        (employee.profileSummaries?.payroll?.structure
          ? loadSalaryStructures().find(
              (s) => s.name === employee.profileSummaries?.payroll?.structure,
            ) ?? null
          : null);

  const hasTds = structureIncludesTds(structure);
  const choice = getEmployeeTaxRegimeChoice(employee);
  const monthlyCtc =
    options?.salaryResolution?.monthlyCtc ??
    (typeof employee.profileSummaries?.payroll?.monthlyCtc === "number"
      ? employee.profileSummaries.payroll.monthlyCtc
      : null);

  return {
    hasTdsInStructure: hasTds,
    structureName: structure?.name ?? employee.profileSummaries?.payroll?.structure ?? null,
    employeeChoice: choice,
    resolution: resolveTdsEstimate({
      hasTdsInStructure: hasTds,
      employeeChoice: choice,
      monthlyCtc,
      payrollDate: options?.payrollDate,
    }),
  };
}

export function tdsStatusLabel(status: TdsCalcStatus): string {
  switch (status) {
    case "calculated":
      return "Estimated";
    case "not_configured":
    case "slabs_missing":
    case "regime_missing":
      return "Not Configured";
    case "ctc_missing":
      return "CTC Required";
    case "not_in_structure":
      return "Not in Structure";
    default:
      return status;
  }
}

export function tdsBreakupAmountLabel(display: EmployeeTaxDisplay): string {
  if (!display.hasTdsInStructure) return "—";
  const r = display.resolution;
  if (r.status === "calculated" && r.monthlyTdsEstimate != null) {
    return formatTaxMoney(r.monthlyTdsEstimate);
  }
  return "—";
}

export function tdsBreakupCalculationLabel(display: EmployeeTaxDisplay): string {
  const s = display.resolution.status;
  if (s === "calculated") return "System Calculated";
  if (s === "slabs_missing" || s === "regime_missing" || s === "not_configured") {
    return "Not Configured";
  }
  if (s === "ctc_missing") return "CTC Required";
  return tdsStatusLabel(s);
}

export function createEmptyTdsSlab(id: number): TdsIncomeSlab {
  return {
    id,
    incomeFrom: 0,
    incomeTo: null,
    ratePercent: 0,
    cessPercent: 0,
  };
}
