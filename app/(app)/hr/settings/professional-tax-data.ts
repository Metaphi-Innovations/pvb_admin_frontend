/**
 * Professional Tax — configurable, data-driven statutory rule engine (frontend/demo).
 *
 * Source of truth: Professional Tax Configurations (State + Salary Basis + effective dates)
 * with nested salary slabs. No statutory slab amounts are hardcoded in application logic.
 *
 * Salary Structure only marks PT as System Calculated / State-based.
 * Employee Salary resolves an estimated monthly PT from configured rules + current salary basis.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { BRANCH_OPTIONS } from "@/lib/hr/config";
import {
  loadPolicyList,
  savePolicyList,
  nextPolicyId,
  policyToday,
  type PolicyStatus,
} from "@/lib/hr/policy-common";
import { loadBranches, type BranchRecord } from "./organization-data";
import { getHolidayStateOptions } from "./holiday-calendar-data";
import {
  getAssignedSalaryStructure,
  getSalaryComponentById,
  loadSalaryStructures,
  type SalaryStructureRecord,
} from "./salary-structures-data";
import { loadSalaryComponents } from "./salary-components-data";
import type { EmployeeSalaryResolution } from "./employee-salary-resolve";
import type { HrEmployee } from "../employees/employee-master-data";
// note: type-only imports above — avoid runtime cycle with employee-salary-resolve

export type { PolicyStatus };

export const PROFESSIONAL_TAX_COMPONENT_NAME = "Professional Tax";

/** Legacy flat-rule storage (migrated once into configs). */
const LEGACY_RULES_STORAGE_KEY = "ds_hr_professional_tax_rules_v1";
const CONFIGS_STORAGE_KEY = "ds_hr_professional_tax_configs_v1";

export const PT_SETTINGS_STATUS = "available" as const;

export type PtApplicability = "male" | "female" | "all";

export type PtSalaryBasis = "monthly_gross" | "monthly_ctc" | "basic";

export type PtStateSource = "branch" | "state_missing";

export type PtCalcStatus =
  | "calculated"
  | "not_configured"
  | "no_matching_slab"
  | "state_missing"
  | "not_in_structure"
  | "basis_unavailable";

export interface ProfessionalTaxSlab {
  id: number;
  applicability: PtApplicability;
  /** Inclusive lower bound */
  salaryFrom: number;
  /** Inclusive upper bound; null = and above */
  salaryTo: number | null;
  /** Normal monthly PT; 0 = Nil (distinct from missing rule) */
  amount: number;
  /** Calendar month 1–12, or null */
  specialMonth: number | null;
  specialMonthAmount: number | null;
}

export interface ProfessionalTaxConfiguration {
  id: number;
  state: string;
  salaryBasis: PtSalaryBasis;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PolicyStatus;
  slabs: ProfessionalTaxSlab[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Flat rule shape — used only for localStorage migration. */
export interface ProfessionalTaxRule {
  id: number;
  state: string;
  applicability: PtApplicability;
  salaryFrom: number | null;
  salaryTo: number | null;
  amount: number;
  specialMonth: number | null;
  specialMonthAmount: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PtSalaryBasisAmounts {
  monthly_gross: number | null;
  monthly_ctc: number | null;
  basic: number | null;
}

export interface ResolveProfessionalTaxInput {
  state: string | null | undefined;
  gender: string | null | undefined;
  salaryBasisAmounts: PtSalaryBasisAmounts;
  /** YYYY-MM-DD — selects effective configuration version */
  payrollDate?: string | null;
  configs?: ProfessionalTaxConfiguration[];
}

export interface ProfessionalTaxResolution {
  status: PtCalcStatus;
  state: string | null;
  salaryBasis: PtSalaryBasis | null;
  salaryBasisLabel: string | null;
  salaryBasisAmount: number | null;
  applicability: PtApplicability | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  salaryRangeLabel: string | null;
  normalAmount: number | null;
  appliedAmount: number | null;
  specialMonthApplied: boolean;
  specialMonth: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  configurationId: number | null;
  slabId: number | null;
  message: string | null;
}

export interface EmployeePtDisplay {
  hasProfessionalTaxInStructure: boolean;
  structureName: string | null;
  state: string | null;
  stateSource: PtStateSource;
  branchLabel: string;
  gender: string | null;
  resolution: ProfessionalTaxResolution;
}

export const PT_APPLICABILITY_OPTIONS: { value: PtApplicability; label: string }[] = [
  { value: "all", label: "All Employees" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const PT_SALARY_BASIS_OPTIONS: {
  value: PtSalaryBasis;
  label: string;
  helper: string;
}[] = [
  {
    value: "monthly_gross",
    label: "Monthly Gross Earnings",
    helper: "Sum of configured earning components for the month",
  },
  {
    value: "monthly_ctc",
    label: "Monthly CTC",
    helper: "Employee monthly CTC assignment",
  },
  {
    value: "basic",
    label: "Basic",
    helper: "Resolved Basic component amount",
  },
];

export const PT_MONTH_OPTIONS: { value: number; label: string }[] = [
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

const BRANCH_SLUG_STATE: Record<string, string> = {
  "hq-pune": "Maharashtra",
  "branch-mumbai": "Maharashtra",
  "branch-nagpur": "Maharashtra",
  "warehouse-aurangabad": "Maharashtra",
  "branch-ahmedabad": "Gujarat",
  "branch-bangalore": "Karnataka",
};

const EMPTY_SEED: ProfessionalTaxConfiguration[] = [];

function normalizeApplicability(raw: unknown): PtApplicability {
  const s = String(raw ?? "").toLowerCase();
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  return "all";
}

function normalizeSalaryBasis(raw: unknown): PtSalaryBasis {
  const s = String(raw ?? "").toLowerCase().replace(/\s+/g, "_");
  if (s === "monthly_ctc" || s === "ctc") return "monthly_ctc";
  if (s === "basic") return "basic";
  return "monthly_gross";
}

function normalizeSlab(raw: Record<string, unknown>, index: number): ProfessionalTaxSlab {
  const specialMonthRaw = raw.specialMonth;
  let specialMonth: number | null = null;
  if (specialMonthRaw != null && specialMonthRaw !== "") {
    const m = Number(specialMonthRaw);
    if (Number.isFinite(m) && m >= 1 && m <= 12) specialMonth = m;
  }
  const fromRaw =
    raw.salaryFrom != null && raw.salaryFrom !== ""
      ? Math.max(0, Number(raw.salaryFrom))
      : 0;
  return {
    id: Number(raw.id) || index + 1,
    applicability: normalizeApplicability(raw.applicability),
    salaryFrom: Number.isFinite(fromRaw) ? fromRaw : 0,
    salaryTo:
      raw.salaryTo != null && raw.salaryTo !== ""
        ? Math.max(0, Number(raw.salaryTo))
        : null,
    amount: Math.max(0, Number(raw.amount) || 0),
    specialMonth,
    specialMonthAmount:
      raw.specialMonthAmount != null && raw.specialMonthAmount !== ""
        ? Math.max(0, Number(raw.specialMonthAmount))
        : null,
  };
}

function normalizeConfiguration(
  raw: Record<string, unknown>,
  index: number,
): ProfessionalTaxConfiguration {
  const slabsRaw = Array.isArray(raw.slabs) ? raw.slabs : [];
  return {
    id: Number(raw.id) || index + 1,
    state: String(raw.state ?? "").trim(),
    salaryBasis: normalizeSalaryBasis(raw.salaryBasis),
    effectiveFrom: String(raw.effectiveFrom ?? "").slice(0, 10),
    effectiveTo:
      raw.effectiveTo != null && String(raw.effectiveTo).trim()
        ? String(raw.effectiveTo).slice(0, 10)
        : null,
    status: raw.status === "inactive" ? "inactive" : "active",
    slabs: slabsRaw.map((s, i) =>
      normalizeSlab((s ?? {}) as Record<string, unknown>, i),
    ),
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : policyToday(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : policyToday(),
  };
}

function normalizeLegacyRule(
  raw: Record<string, unknown>,
  index: number,
): ProfessionalTaxRule {
  const specialMonthRaw = raw.specialMonth;
  let specialMonth: number | null = null;
  if (specialMonthRaw != null && specialMonthRaw !== "") {
    const m = Number(specialMonthRaw);
    if (Number.isFinite(m) && m >= 1 && m <= 12) specialMonth = m;
  }
  return {
    id: Number(raw.id) || index + 1,
    state: String(raw.state ?? "").trim(),
    applicability: normalizeApplicability(raw.applicability),
    salaryFrom:
      raw.salaryFrom != null && raw.salaryFrom !== ""
        ? Math.max(0, Number(raw.salaryFrom))
        : null,
    salaryTo:
      raw.salaryTo != null && raw.salaryTo !== ""
        ? Math.max(0, Number(raw.salaryTo))
        : null,
    amount: Math.max(0, Number(raw.amount) || 0),
    specialMonth,
    specialMonthAmount:
      raw.specialMonthAmount != null && raw.specialMonthAmount !== ""
        ? Math.max(0, Number(raw.specialMonthAmount))
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

function migrateLegacyFlatRulesToConfigs(): ProfessionalTaxConfiguration[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_RULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const rules = parsed.map((r, i) =>
      normalizeLegacyRule((r ?? {}) as Record<string, unknown>, i),
    );

    type GroupKey = string;
    const groups = new Map<GroupKey, ProfessionalTaxRule[]>();
    for (const rule of rules) {
      const key = [
        rule.state.trim().toLowerCase(),
        rule.effectiveFrom,
        rule.effectiveTo ?? "",
        rule.status,
      ].join("|");
      const list = groups.get(key) ?? [];
      list.push(rule);
      groups.set(key, list);
    }

    let nextId = 1;
    const configs: ProfessionalTaxConfiguration[] = [];
    for (const group of groups.values()) {
      const head = group[0]!;
      let slabId = 1;
      configs.push({
        id: nextId++,
        state: head.state,
        salaryBasis: "monthly_gross",
        effectiveFrom: head.effectiveFrom,
        effectiveTo: head.effectiveTo,
        status: head.status,
        slabs: group.map((r) => ({
          id: slabId++,
          applicability: r.applicability,
          salaryFrom: r.salaryFrom ?? 0,
          salaryTo: r.salaryTo,
          amount: r.amount,
          specialMonth: r.specialMonth,
          specialMonthAmount: r.specialMonthAmount,
        })),
        createdBy: head.createdBy,
        updatedBy: head.updatedBy,
        createdAt: head.createdAt,
        updatedAt: head.updatedAt,
      });
    }
    return configs;
  } catch {
    return [];
  }
}

function readConfigsFromStorage(): ProfessionalTaxConfiguration[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONFIGS_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r, i) =>
      normalizeConfiguration((r ?? {}) as Record<string, unknown>, i),
    );
  } catch {
    return [];
  }
}

export function loadProfessionalTaxConfigurations(): ProfessionalTaxConfiguration[] {
  const existing = readConfigsFromStorage();
  if (existing != null) return existing;

  const migrated = migrateLegacyFlatRulesToConfigs();
  if (migrated.length > 0) {
    savePolicyList(CONFIGS_STORAGE_KEY, migrated);
    return migrated;
  }

  const seed = structuredClone(EMPTY_SEED);
  savePolicyList(CONFIGS_STORAGE_KEY, seed);
  return seed;
}

export function saveProfessionalTaxConfigurations(
  list: ProfessionalTaxConfiguration[],
): void {
  savePolicyList(CONFIGS_STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-professional-tax-configs-updated"));
    // Keep legacy listeners working during transition
    window.dispatchEvent(new CustomEvent("hr-professional-tax-rules-updated"));
  }
}

export function nextProfessionalTaxConfigurationId(
  list: ProfessionalTaxConfiguration[],
): number {
  return nextPolicyId(list);
}

export function nextSlabId(slabs: ProfessionalTaxSlab[]): number {
  return slabs.reduce((m, s) => Math.max(m, s.id), 0) + 1;
}

export function withPtConfigNewAudit(
  partial: Omit<
    ProfessionalTaxConfiguration,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): ProfessionalTaxConfiguration {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withPtConfigUpdateAudit(
  record: ProfessionalTaxConfiguration,
): ProfessionalTaxConfiguration {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

/** @deprecated Use loadProfessionalTaxConfigurations */
export function loadProfessionalTaxRules(): ProfessionalTaxRule[] {
  return loadProfessionalTaxConfigurations().flatMap((cfg) =>
    cfg.slabs.map((slab, i) => ({
      id: cfg.id * 1000 + (slab.id || i + 1),
      state: cfg.state,
      applicability: slab.applicability,
      salaryFrom: slab.salaryFrom,
      salaryTo: slab.salaryTo,
      amount: slab.amount,
      specialMonth: slab.specialMonth,
      specialMonthAmount: slab.specialMonthAmount,
      effectiveFrom: cfg.effectiveFrom,
      effectiveTo: cfg.effectiveTo,
      status: cfg.status,
      createdBy: cfg.createdBy,
      updatedBy: cfg.updatedBy,
      createdAt: cfg.createdAt,
      updatedAt: cfg.updatedAt,
    })),
  );
}

/** @deprecated Use saveProfessionalTaxConfigurations */
export function saveProfessionalTaxRules(list: ProfessionalTaxRule[]): void {
  // Best-effort: regroup into configs (for any leftover callers)
  type GroupKey = string;
  const groups = new Map<GroupKey, ProfessionalTaxRule[]>();
  for (const rule of list) {
    const key = [
      rule.state.trim().toLowerCase(),
      rule.effectiveFrom,
      rule.effectiveTo ?? "",
      rule.status,
    ].join("|");
    const g = groups.get(key) ?? [];
    g.push(rule);
    groups.set(key, g);
  }
  let id = 1;
  const configs: ProfessionalTaxConfiguration[] = [];
  for (const group of groups.values()) {
    const head = group[0]!;
    let slabId = 1;
    configs.push(
      withPtConfigNewAudit({
        id: id++,
        state: head.state,
        salaryBasis: "monthly_gross",
        effectiveFrom: head.effectiveFrom,
        effectiveTo: head.effectiveTo,
        status: head.status,
        slabs: group.map((r) => ({
          id: slabId++,
          applicability: r.applicability,
          salaryFrom: r.salaryFrom ?? 0,
          salaryTo: r.salaryTo,
          amount: r.amount,
          specialMonth: r.specialMonth,
          specialMonthAmount: r.specialMonthAmount,
        })),
      }),
    );
  }
  saveProfessionalTaxConfigurations(configs);
}

export function isProfessionalTaxComponentName(name: string): boolean {
  return name.trim().toLowerCase() === PROFESSIONAL_TAX_COMPONENT_NAME.toLowerCase();
}

export function getProfessionalTaxStateOptions(): string[] {
  return getHolidayStateOptions();
}

export function applicabilityLabel(a: PtApplicability): string {
  return PT_APPLICABILITY_OPTIONS.find((o) => o.value === a)?.label ?? a;
}

export function salaryBasisLabel(b: PtSalaryBasis): string {
  return PT_SALARY_BASIS_OPTIONS.find((o) => o.value === b)?.label ?? b;
}

export function formatPtSalaryRange(slab: {
  salaryFrom: number;
  salaryTo: number | null;
}): string {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (slab.salaryTo == null) {
    return `${fmt(slab.salaryFrom)} and above`;
  }
  return `${fmt(slab.salaryFrom)} – ${fmt(slab.salaryTo)}`;
}

export function formatPtSpecialMonth(slab: {
  specialMonth: number | null;
  specialMonthAmount: number | null;
}): string {
  if (slab.specialMonth == null || slab.specialMonthAmount == null) return "—";
  const month =
    PT_MONTH_OPTIONS.find((m) => m.value === slab.specialMonth)?.label.slice(0, 3) ??
    String(slab.specialMonth);
  return `${month} ₹${slab.specialMonthAmount.toLocaleString("en-IN")}`;
}

export function formatPtAmount(amount: number): string {
  if (amount === 0) return "₹0 / Nil";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatPtEffectivePeriod(cfg: ProfessionalTaxConfiguration): string {
  const from = cfg.effectiveFrom || "—";
  if (!cfg.effectiveTo) return `${from} – Current`;
  return `${from} – ${cfg.effectiveTo}`;
}

function rangesOverlap(
  aFrom: number,
  aTo: number | null,
  bFrom: number,
  bTo: number | null,
): boolean {
  const aHi = aTo == null ? Number.POSITIVE_INFINITY : aTo;
  const bHi = bTo == null ? Number.POSITIVE_INFINITY : bTo;
  return aFrom <= bHi && bFrom <= aHi;
}

/** Same applicability overlapping salary bands within one configuration. */
export function findSlabSalaryOverlaps(
  slabs: ProfessionalTaxSlab[],
): { aIndex: number; bIndex: number; applicability: PtApplicability }[] {
  const conflicts: { aIndex: number; bIndex: number; applicability: PtApplicability }[] =
    [];
  for (let i = 0; i < slabs.length; i++) {
    for (let j = i + 1; j < slabs.length; j++) {
      const a = slabs[i]!;
      const b = slabs[j]!;
      if (a.applicability !== b.applicability) continue;
      if (rangesOverlap(a.salaryFrom, a.salaryTo, b.salaryFrom, b.salaryTo)) {
        conflicts.push({ aIndex: i, bIndex: j, applicability: a.applicability });
      }
    }
  }
  return conflicts;
}

/** All-employees slab overlapping a gendered slab — warning (specific still wins). */
export function findApplicabilityAmbiguities(
  slabs: ProfessionalTaxSlab[],
): { allIndex: number; specificIndex: number }[] {
  const warnings: { allIndex: number; specificIndex: number }[] = [];
  for (let i = 0; i < slabs.length; i++) {
    for (let j = 0; j < slabs.length; j++) {
      if (i === j) continue;
      const a = slabs[i]!;
      const b = slabs[j]!;
      if (a.applicability !== "all") continue;
      if (b.applicability === "all") continue;
      if (rangesOverlap(a.salaryFrom, a.salaryTo, b.salaryFrom, b.salaryTo)) {
        warnings.push({ allIndex: i, specificIndex: j });
      }
    }
  }
  return warnings;
}

export function findEffectivePeriodConflicts(
  configs: ProfessionalTaxConfiguration[],
  candidate: Pick<
    ProfessionalTaxConfiguration,
    "id" | "state" | "effectiveFrom" | "effectiveTo" | "status"
  >,
): ProfessionalTaxConfiguration[] {
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

function isConfigEffectiveOn(
  cfg: ProfessionalTaxConfiguration,
  date: string,
): boolean {
  if (cfg.status !== "active") return false;
  if (cfg.effectiveFrom && cfg.effectiveFrom > date) return false;
  if (cfg.effectiveTo && cfg.effectiveTo < date) return false;
  return true;
}

export function findEffectivePtConfiguration(
  state: string | null | undefined,
  payrollDate?: string | null,
  configs?: ProfessionalTaxConfiguration[],
): ProfessionalTaxConfiguration | null {
  const s = (state || "").trim().toLowerCase();
  if (!s) return null;
  const date = (payrollDate || policyToday()).slice(0, 10);
  const list = configs ?? loadProfessionalTaxConfigurations();
  const matches = list
    .filter((c) => c.state.trim().toLowerCase() === s && isConfigEffectiveOn(c, date))
    .sort((a, b) => {
      // Prefer latest effectiveFrom when multiple (should be rare after validation)
      return b.effectiveFrom.localeCompare(a.effectiveFrom);
    });
  return matches[0] ?? null;
}

export function normalizeEmployeeGender(
  gender: string | null | undefined,
): PtApplicability | null {
  const s = String(gender ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  return null;
}

function slabMatchesSalary(slab: ProfessionalTaxSlab, amount: number): boolean {
  if (amount < slab.salaryFrom) return false;
  if (slab.salaryTo != null && amount > slab.salaryTo) return false;
  return true;
}

function pickSlabForGender(
  slabs: ProfessionalTaxSlab[],
  gender: PtApplicability | null,
  amount: number,
): ProfessionalTaxSlab | null {
  const matching = slabs.filter((s) => slabMatchesSalary(s, amount));
  if (matching.length === 0) return null;

  if (gender === "male" || gender === "female") {
    const specific = matching.find((s) => s.applicability === gender);
    if (specific) return specific;
  }
  const all = matching.find((s) => s.applicability === "all");
  if (all) return all;
  // No All / specific match — do not guess another gender's slab
  return null;
}

function emptyResolution(
  partial: Partial<ProfessionalTaxResolution> & { status: PtCalcStatus },
): ProfessionalTaxResolution {
  return {
    status: partial.status,
    state: partial.state ?? null,
    salaryBasis: partial.salaryBasis ?? null,
    salaryBasisLabel: partial.salaryBasisLabel ?? null,
    salaryBasisAmount: partial.salaryBasisAmount ?? null,
    applicability: partial.applicability ?? null,
    salaryFrom: partial.salaryFrom ?? null,
    salaryTo: partial.salaryTo ?? null,
    salaryRangeLabel: partial.salaryRangeLabel ?? null,
    normalAmount: partial.normalAmount ?? null,
    appliedAmount: partial.appliedAmount ?? null,
    specialMonthApplied: partial.specialMonthApplied ?? false,
    specialMonth: partial.specialMonth ?? null,
    effectiveFrom: partial.effectiveFrom ?? null,
    effectiveTo: partial.effectiveTo ?? null,
    configurationId: partial.configurationId ?? null,
    slabId: partial.slabId ?? null,
    message: partial.message ?? null,
  };
}

/**
 * Core PT resolver — data-driven; safe to reuse from Payroll later with period basis.
 */
export function resolveProfessionalTax(
  input: ResolveProfessionalTaxInput,
): ProfessionalTaxResolution {
  const state = (input.state || "").trim() || null;
  if (!state) {
    return emptyResolution({
      status: "state_missing",
      message: "Professional Tax state is not available from the assigned Branch.",
    });
  }

  const cfg = findEffectivePtConfiguration(state, input.payrollDate, input.configs);
  if (!cfg) {
    return emptyResolution({
      status: "not_configured",
      state,
      message: `No Professional Tax rule is configured for ${state}.`,
    });
  }

  const basis = cfg.salaryBasis;
  const basisAmount = input.salaryBasisAmounts[basis];
  const basisLbl = salaryBasisLabel(basis);

  if (basisAmount == null || !Number.isFinite(basisAmount)) {
    return emptyResolution({
      status: "basis_unavailable",
      state,
      salaryBasis: basis,
      salaryBasisLabel: basisLbl,
      configurationId: cfg.id,
      effectiveFrom: cfg.effectiveFrom,
      effectiveTo: cfg.effectiveTo,
      message: `${basisLbl} is not available yet for this employee.`,
    });
  }

  const gender = normalizeEmployeeGender(input.gender);
  const slab = pickSlabForGender(cfg.slabs, gender, basisAmount);
  if (!slab) {
    return emptyResolution({
      status: "no_matching_slab",
      state,
      salaryBasis: basis,
      salaryBasisLabel: basisLbl,
      salaryBasisAmount: basisAmount,
      configurationId: cfg.id,
      effectiveFrom: cfg.effectiveFrom,
      effectiveTo: cfg.effectiveTo,
      message: "No matching Professional Tax slab for this salary / applicability.",
    });
  }

  const payrollDate = (input.payrollDate || policyToday()).slice(0, 10);
  const month = Number(payrollDate.slice(5, 7));
  const specialApplied =
    slab.specialMonth != null &&
    slab.specialMonthAmount != null &&
    slab.specialMonth === month;
  const applied = specialApplied ? slab.specialMonthAmount! : slab.amount;

  return emptyResolution({
    status: "calculated",
    state,
    salaryBasis: basis,
    salaryBasisLabel: basisLbl,
    salaryBasisAmount: basisAmount,
    applicability: slab.applicability,
    salaryFrom: slab.salaryFrom,
    salaryTo: slab.salaryTo,
    salaryRangeLabel: formatPtSalaryRange(slab),
    normalAmount: slab.amount,
    appliedAmount: applied,
    specialMonthApplied: specialApplied,
    specialMonth: slab.specialMonth,
    effectiveFrom: cfg.effectiveFrom,
    effectiveTo: cfg.effectiveTo,
    configurationId: cfg.id,
    slabId: slab.id,
    message: null,
  });
}

export function buildPtSalaryBasisAmounts(
  salaryResolution: EmployeeSalaryResolution | null | undefined,
): PtSalaryBasisAmounts {
  if (!salaryResolution) {
    return { monthly_gross: null, monthly_ctc: null, basic: null };
  }
  const basicLine = salaryResolution.earnings.find(
    (e) => e.componentName.trim().toLowerCase() === "basic",
  );
  return {
    monthly_gross: salaryResolution.configuredEarningsTotal,
    monthly_ctc: salaryResolution.monthlyCtc,
    basic: basicLine?.amount ?? null,
  };
}

export function findOrgBranchForEmployeeBranch(branchSlug: string): BranchRecord | null {
  const slug = (branchSlug || "").trim();
  if (!slug) return null;

  const branches = loadBranches().filter((b) => b.status === "active");
  const opt = BRANCH_OPTIONS.find((b) => b.value === slug);
  const label = (opt?.label ?? slug).toLowerCase();
  const cityPart = opt?.label.split("—")[1]?.trim().toLowerCase() ?? "";

  const byCode = branches.find(
    (b) =>
      b.code.toLowerCase() === slug.toLowerCase() ||
      slug.toLowerCase().includes(b.code.toLowerCase().replace(/-/g, "")),
  );
  if (byCode) return byCode;

  const byName = branches.find((b) => {
    const name = b.name.toLowerCase();
    if (cityPart && (name.includes(cityPart) || b.city.toLowerCase().includes(cityPart))) {
      return true;
    }
    return label.includes(name) || name.includes(label.replace(/\s+/g, " "));
  });
  if (byName) return byName;

  return null;
}

export function derivePtStateFromBranch(branchSlug: string): {
  state: string | null;
  branch: BranchRecord | null;
  branchLabel: string;
} {
  const slug = (branchSlug || "").trim();
  const branchLabel =
    BRANCH_OPTIONS.find((b) => b.value === slug)?.label ?? (slug || "—");
  if (!slug) {
    return { state: null, branch: null, branchLabel: "—" };
  }

  const orgBranch = findOrgBranchForEmployeeBranch(slug);
  if (orgBranch?.state?.trim()) {
    return {
      state: orgBranch.state.trim(),
      branch: orgBranch,
      branchLabel: orgBranch.name || branchLabel,
    };
  }

  const fallback = BRANCH_SLUG_STATE[slug]?.trim() || null;
  return { state: fallback, branch: orgBranch, branchLabel };
}

export function structureIncludesProfessionalTax(
  structure: SalaryStructureRecord | null,
): boolean {
  if (!structure) return false;
  const comps = loadSalaryComponents();
  return structure.lines.some((ln) => {
    const c = getSalaryComponentById(ln.componentId, comps);
    return c != null && isProfessionalTaxComponentName(c.name);
  });
}

/**
 * Employee Salary / Payroll PT panel — state from Branch only (no amount override).
 */
export function resolveEmployeeProfessionalTax(
  employee: HrEmployee,
  options?: {
    structure?: SalaryStructureRecord | null;
    salaryResolution?: EmployeeSalaryResolution | null;
    payrollDate?: string | null;
  },
): EmployeePtDisplay {
  const structure =
    options?.structure !== undefined
      ? options.structure
      : getAssignedSalaryStructure(employee.employeeCode) ??
        (employee.profileSummaries?.payroll?.structure
          ? loadSalaryStructures().find(
              (s) => s.name === employee.profileSummaries?.payroll?.structure,
            ) ?? null
          : null);

  const hasPt = structureIncludesProfessionalTax(structure);
  const derived = derivePtStateFromBranch(employee.branch);
  const gender = employee.personal?.gender?.trim() || null;

  const base = {
    hasProfessionalTaxInStructure: hasPt,
    structureName: structure?.name ?? employee.profileSummaries?.payroll?.structure ?? null,
    state: derived.state,
    stateSource: (derived.state ? "branch" : "state_missing") as PtStateSource,
    branchLabel: derived.branchLabel,
    gender,
  };

  if (!hasPt) {
    return {
      ...base,
      resolution: emptyResolution({
        status: "not_in_structure",
        state: derived.state,
        message: "Professional Tax is not included in the assigned salary structure.",
      }),
    };
  }

  const resolution = resolveProfessionalTax({
    state: derived.state,
    gender,
    salaryBasisAmounts: buildPtSalaryBasisAmounts(options?.salaryResolution),
    payrollDate: options?.payrollDate,
  });

  return { ...base, resolution };
}

/** Labels for salary breakup deduction row */
export function ptBreakupCalculationLabel(display: EmployeePtDisplay): string {
  if (!display.hasProfessionalTaxInStructure) return "—";
  const s = display.resolution.status;
  if (s === "state_missing") return "State Required";
  if (s === "not_configured") return "Not Configured";
  if (s === "no_matching_slab") return "No Matching Rule";
  if (s === "basis_unavailable") return "Basis Unavailable";
  if (s === "calculated") return "System Calculated";
  return "—";
}

export function ptBreakupAmountLabel(display: EmployeePtDisplay): string {
  if (!display.hasProfessionalTaxInStructure) return "—";
  const r = display.resolution;
  if (r.status === "calculated" && r.appliedAmount != null) {
    return formatPtAmount(r.appliedAmount);
  }
  if (r.status === "not_configured") return "—";
  if (r.status === "no_matching_slab") return "—";
  if (r.status === "state_missing") return "—";
  if (r.status === "basis_unavailable") return "—";
  return "—";
}

export function ptStatusLabel(status: PtCalcStatus): string {
  switch (status) {
    case "calculated":
      return "Calculated";
    case "not_configured":
      return "Not Configured";
    case "no_matching_slab":
      return "No Matching Rule";
    case "state_missing":
      return "State Required";
    case "not_in_structure":
      return "Not in Structure";
    case "basis_unavailable":
      return "Basis Unavailable";
    default:
      return status;
  }
}

/** Empty slab row helper for Settings UI */
export function createEmptyPtSlab(id: number): ProfessionalTaxSlab {
  return {
    id,
    applicability: "all",
    salaryFrom: 0,
    salaryTo: null,
    amount: 0,
    specialMonth: null,
    specialMonthAmount: null,
  };
}
