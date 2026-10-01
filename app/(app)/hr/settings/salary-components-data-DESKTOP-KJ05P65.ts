/**
 * HR Payroll Settings — Salary Components master (frontend/demo).
 * Defines reusable earning, deduction, and employer contribution heads.
 * Employee-specific amounts belong in Salary Structure / Employee Salary (future).
 */

import { CURRENT_USER } from "@/lib/hr/config";
import {
  loadPolicyList,
  savePolicyList,
  nextPolicyId,
  policyToday,
  type PolicyStatus,
} from "@/lib/hr/policy-common";

export type { PolicyStatus };

export type SalaryComponentType = "earning" | "deduction" | "employer_contribution";

export type SalaryCalculationType =
  | "fixed"
  | "percent_basic"
  | "percent_gross"
  | "percent_ctc"
  | "manual"
  | "statutory";

export interface SalaryComponentRecord {
  id: number;
  name: string;
  componentType: SalaryComponentType;
  calculationType: SalaryCalculationType;
  /** Fixed amount when calculationType === fixed */
  defaultValue: number | null;
  /** Percentage when calculationType is percent_* */
  defaultRate: number | null;
  /**
   * When true, LOP proration may reduce this earning.
   * Only meaningful for non-statutory earnings. Default true for normal earnings.
   */
  lopApplicable?: boolean;
  status: PolicyStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_hr_salary_components_v1";

export const COMPONENT_TYPE_OPTIONS: {
  value: SalaryComponentType;
  label: string;
}[] = [
  { value: "earning", label: "Earning" },
  { value: "deduction", label: "Deduction" },
  { value: "employer_contribution", label: "Employer Contribution" },
];

export const CALCULATION_TYPE_OPTIONS: {
  value: SalaryCalculationType;
  label: string;
  helper: string;
}[] = [
  { value: "fixed", label: "Fixed Amount", helper: "Default monthly amount for structure templates" },
  {
    value: "percent_basic",
    label: "% of Basic",
    helper: "Default percentage of Basic salary",
  },
  {
    value: "percent_gross",
    label: "% of Gross",
    helper: "Default percentage of Gross salary",
  },
  { value: "percent_ctc", label: "% of CTC", helper: "Default percentage of CTC" },
  {
    value: "manual",
    label: "Manual / Structure",
    helper: "Amount defined per salary structure or employee",
  },
  {
    value: "statutory",
    label: "Statutory Rule",
    helper:
      "System calculated from statutory settings (e.g. Professional Tax). No default amount or rate on the component.",
  },
];

/** Display-only rule source for statutory components — not a stored amount. */
export function statutoryRuleSourceLabel(componentName: string): string | null {
  const n = componentName.trim().toLowerCase();
  if (n === "professional tax") return "Professional Tax";
  if (n === "employee pf" || n === "employer pf") return "PF";
  if (n === "esi" || n === "employee esi" || n === "employer esi") return "ESI";
  if (n === "lwf" || n === "employee lwf" || n === "employer lwf") return "LWF";
  if (n === "tds") return "TDS";
  return null;
}

const SEED: SalaryComponentRecord[] = [
  comp(1, "Basic", "earning", "percent_ctc", null, 40),
  comp(2, "HRA", "earning", "percent_basic", null, 40),
  comp(3, "Special Allowance", "earning", "manual", null, null),
  comp(4, "Conveyance Allowance", "earning", "fixed", 1600, null),
  comp(5, "Bonus", "earning", "manual", null, null),
  comp(6, "Employee PF", "deduction", "statutory", null, null),
  comp(7, "Employer PF", "employer_contribution", "statutory", null, null),
  comp(8, "Employee ESI", "deduction", "statutory", null, null),
  comp(9, "Professional Tax", "deduction", "statutory", null, null),
  comp(10, "TDS", "deduction", "statutory", null, null),
  comp(11, "Employer ESI", "employer_contribution", "statutory", null, null),
  comp(12, "Other Deduction", "deduction", "fixed", null, null),
  comp(13, "Employee LWF", "deduction", "statutory", null, null),
  comp(14, "Employer LWF", "employer_contribution", "statutory", null, null),
];

function comp(
  id: number,
  name: string,
  componentType: SalaryComponentType,
  calculationType: SalaryCalculationType,
  defaultValue: number | null,
  defaultRate: number | null,
): SalaryComponentRecord {
  const d = "2026-01-01";
  const lopApplicable =
    componentType === "earning" &&
    calculationType !== "statutory" &&
    !(
      name.trim().toLowerCase() === "bonus" ||
      name.toLowerCase().includes("reimbursement")
    );
  return {
    id,
    name,
    componentType,
    calculationType,
    defaultValue,
    defaultRate,
    lopApplicable,
    status: "active",
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: d,
    updatedAt: d,
  };
}

function normalizeComponentType(raw: unknown): SalaryComponentType {
  const s = String(raw ?? "").toLowerCase();
  if (s === "deduction") return "deduction";
  if (s === "employer_contribution" || s === "contribution" || s === "employer contribution") {
    return "employer_contribution";
  }
  return "earning";
}

function normalizeCalculationType(raw: unknown): SalaryCalculationType {
  const s = String(raw ?? "").toLowerCase();
  if (s === "percent_basic" || s === "percentage of basic" || s === "basic") return "percent_basic";
  if (s === "percent_gross" || s === "percentage of gross" || s === "gross") return "percent_gross";
  if (s === "percent_ctc" || s === "percentage of ctc" || s === "ctc") return "percent_ctc";
  if (s === "manual" || s === "structure") return "manual";
  if (s === "statutory") return "statutory";
  return "fixed";
}

function normalizeRecord(raw: Record<string, unknown>, index: number): SalaryComponentRecord {
  let calculationType = normalizeCalculationType(raw.calculationType);
  let name = String(raw.name ?? "");
  const nameLower = name.trim().toLowerCase();
  // Legacy "ESI" → Employee ESI
  if (nameLower === "esi") name = "Employee ESI";
  const nameNorm = name.trim().toLowerCase();
  const isPfComponent = nameNorm === "employee pf" || nameNorm === "employer pf";
  const isEsiComponent =
    nameNorm === "employee esi" || nameNorm === "employer esi" || nameNorm === "esi";
  const isLwfComponent =
    nameNorm === "employee lwf" || nameNorm === "employer lwf" || nameNorm === "lwf";
  const isTdsComponent = nameNorm === "tds";
  // PF/ESI/LWF/TDS rates live in statutory/tax settings — component master is System Calculated only.
  if (isPfComponent || isEsiComponent || isLwfComponent || isTdsComponent) {
    calculationType = "statutory";
  }
  const clearAmount =
    isPfComponent || isEsiComponent || isLwfComponent || isTdsComponent;
  const componentType = normalizeComponentType(raw.componentType);
  let lopApplicable: boolean | undefined;
  if (componentType === "earning" && calculationType !== "statutory") {
    if (typeof raw.lopApplicable === "boolean") {
      lopApplicable = raw.lopApplicable;
    } else {
      const n = name.trim().toLowerCase();
      lopApplicable = !(
        n === "bonus" ||
        n.includes("reimbursement") ||
        n.includes("arrear")
      );
    }
  } else {
    lopApplicable = false;
  }
  return {
    id: Number(raw.id) || index + 1,
    name,
    componentType,
    calculationType,
    defaultValue:
      !clearAmount &&
      raw.defaultValue != null &&
      raw.defaultValue !== ""
        ? Math.max(0, Number(raw.defaultValue))
        : null,
    defaultRate:
      !clearAmount &&
      raw.defaultRate != null &&
      raw.defaultRate !== ""
        ? Math.max(0, Number(raw.defaultRate))
        : null,
    lopApplicable,
    status: raw.status === "inactive" ? "inactive" : "active",
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : policyToday(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : policyToday(),
  };
}

export function calculationTypeUsesDefaultValue(type: SalaryCalculationType): boolean {
  return type === "fixed";
}

export function calculationTypeUsesDefaultRate(type: SalaryCalculationType): boolean {
  return type === "percent_basic" || type === "percent_gross" || type === "percent_ctc";
}

export function calculationTypeHasDefaultField(type: SalaryCalculationType): boolean {
  return calculationTypeUsesDefaultValue(type) || calculationTypeUsesDefaultRate(type);
}

export function componentTypeLabel(type: SalaryComponentType): string {
  return COMPONENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function calculationTypeLabel(type: SalaryCalculationType): string {
  return CALCULATION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function formatDefaultDisplay(record: SalaryComponentRecord): string {
  if (record.calculationType === "statutory") return "System Calculated";
  if (calculationTypeUsesDefaultValue(record.calculationType)) {
    return record.defaultValue != null ? `₹${record.defaultValue.toLocaleString("en-IN")}` : "—";
  }
  if (calculationTypeUsesDefaultRate(record.calculationType)) {
    if (record.defaultRate == null) return "—";
    const base =
      record.calculationType === "percent_basic"
        ? "Basic"
        : record.calculationType === "percent_gross"
          ? "Gross"
          : "CTC";
    return `${record.defaultRate}% of ${base}`;
  }
  if (record.calculationType === "manual") return "Per structure / employee";
  return "—";
}

/** Prototype seed record only — do not treat edited or user-created records as disposable. */
export function isPrototypeLoanRecovery(record: SalaryComponentRecord): boolean {
  return (
    record.id === 11 &&
    record.name === "Loan Recovery" &&
    record.componentType === "deduction" &&
    record.calculationType === "manual" &&
    record.defaultValue == null &&
    record.defaultRate == null &&
    record.createdAt === "2026-01-01" &&
    record.updatedAt === "2026-01-01"
  );
}

export function loadSalaryComponents(): SalaryComponentRecord[] {
  const raw = loadPolicyList(STORAGE_KEY, structuredClone(SEED));
  let list = raw
    .map((r, i) => normalizeRecord(r as unknown as Record<string, unknown>, i))
    .filter((r) => !isPrototypeLoanRecovery(r));

  let mutated = list.length !== raw.length;

  // Ensure Employer ESI exists (missing from earlier seeds)
  if (!list.some((c) => c.name.trim().toLowerCase() === "employer esi")) {
    list = [
      ...list,
      comp(
        nextPolicyId(list),
        "Employer ESI",
        "employer_contribution",
        "statutory",
        null,
        null,
      ),
    ];
    mutated = true;
  }

  // Ensure Employee LWF / Employer LWF exist
  if (!list.some((c) => c.name.trim().toLowerCase() === "employee lwf")) {
    list = [
      ...list,
      comp(nextPolicyId(list), "Employee LWF", "deduction", "statutory", null, null),
    ];
    mutated = true;
  }
  if (!list.some((c) => c.name.trim().toLowerCase() === "employer lwf")) {
    list = [
      ...list,
      comp(
        nextPolicyId(list),
        "Employer LWF",
        "employer_contribution",
        "statutory",
        null,
        null,
      ),
    ];
    mutated = true;
  }

  // Persist Employee ESI rename from legacy "ESI"
  if (raw.some((r) => String((r as { name?: string }).name ?? "").trim().toLowerCase() === "esi")) {
    mutated = true;
  }

  if (mutated && typeof window !== "undefined") {
    savePolicyList(STORAGE_KEY, list);
  }
  return list;
}

export function saveSalaryComponents(list: SalaryComponentRecord[]): void {
  savePolicyList(STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-salary-components-updated"));
  }
}

export function getActiveSalaryComponents(): SalaryComponentRecord[] {
  return loadSalaryComponents().filter((c) => c.status === "active");
}

export function nextSalaryComponentId(list: SalaryComponentRecord[]): number {
  return nextPolicyId(list);
}

export function withSalaryComponentNewAudit(
  partial: Omit<
    SalaryComponentRecord,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): SalaryComponentRecord {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withSalaryComponentUpdateAudit(
  record: SalaryComponentRecord,
): SalaryComponentRecord {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}
