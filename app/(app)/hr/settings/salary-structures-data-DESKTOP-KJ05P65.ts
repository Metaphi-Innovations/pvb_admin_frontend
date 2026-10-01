/**
 * HR Payroll Settings — Salary Structures master (frontend/demo).
 * Reusable salary composition templates — not employee-specific salary records.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { loadHrEmployees, type HrEmployee } from "../employees/employee-master-data";
import {
  loadPolicyList,
  savePolicyList,
  nextPolicyId,
  policyToday,
  type PolicyStatus,
} from "@/lib/hr/policy-common";
import {
  calculationTypeUsesDefaultRate,
  calculationTypeUsesDefaultValue,
  loadSalaryComponents,
  type SalaryCalculationType,
  type SalaryComponentRecord,
  type SalaryComponentType,
} from "./salary-components-data";

export type { PolicyStatus };

export type StructureLineCalcMode = "fixed" | "percent" | "system";

export type StructureCalculateOnBase = "ctc" | "gross" | "component";

export interface SalaryStructureLine {
  id: number;
  componentId: number;
  /** Structure-level formula mode — independent of employee CTC / attendance. */
  calcMode: StructureLineCalcMode;
  /** Monthly structure amount when calcMode === fixed */
  structureAmount: number | null;
  /** Percentage when calcMode === percent */
  structureRate: number | null;
  /** Base for percentage: CTC, Gross, or another earning component */
  calculateOnBase: StructureCalculateOnBase | null;
  /** When calculateOnBase === component */
  calculateOnComponentId: number | null;
}

export interface SalaryStructureRecord {
  id: number;
  name: string;
  isDefault: boolean;
  status: PolicyStatus;
  lines: SalaryStructureLine[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StructureLinePreview {
  lineId: number;
  componentId: number;
  componentName: string;
  componentType: SalaryComponentType;
  calcMode: StructureLineCalcMode;
  displayCalculation: string;
  displayAmount: string;
  displayCalculateOn: string;
  resolvedAmount: number | null;
}

export interface StructurePreview {
  earnings: StructureLinePreview[];
  deductions: StructureLinePreview[];
  employerContributions: StructureLinePreview[];
  grossEarnings: number | null;
  totalEmployerContribution: number | null;
  estimatedCtc: number | null;
  netPayDisplay: string;
}

const STORAGE_KEY = "ds_hr_salary_structures_v1";
const EMPLOYEE_MAP_KEY = "ds_hr_employee_salary_structure_v1";

function line(
  id: number,
  componentId: number,
  calcMode: StructureLineCalcMode,
  structureAmount: number | null,
  structureRate: number | null,
  calculateOnBase: StructureCalculateOnBase | null,
  calculateOnComponentId: number | null,
): SalaryStructureLine {
  return {
    id,
    componentId,
    calcMode,
    structureAmount,
    structureRate,
    calculateOnBase,
    calculateOnComponentId,
  };
}

function structure(
  id: number,
  name: string,
  isDefault: boolean,
  lines: SalaryStructureLine[],
): SalaryStructureRecord {
  const d = "2026-01-01";
  return {
    id,
    name,
    isDefault,
    status: "active",
    lines,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: d,
    updatedAt: d,
  };
}

const SEED: SalaryStructureRecord[] = [
  structure(1, "Standard Staff Structure", true, [
    line(1, 1, "percent", null, 40, "ctc", null),
    line(2, 2, "percent", null, 50, "component", 1),
    line(3, 3, "fixed", 10000, null, null, null),
    line(4, 6, "system", null, null, null, null),
    line(5, 9, "system", null, null, null, null),
    line(6, 10, "system", null, null, null, null),
    line(7, 7, "system", null, null, null, null),
    line(8, 8, "system", null, null, null, null),
    line(9, 11, "system", null, null, null, null),
    line(10, 13, "system", null, null, null, null),
    line(11, 14, "system", null, null, null, null),
  ]),
  structure(2, "Sales Structure", false, [
    line(1, 1, "percent", null, 40, "ctc", null),
    line(2, 2, "percent", null, 40, "component", 1),
    line(3, 5, "fixed", 5000, null, null, null),
    line(4, 6, "system", null, null, null, null),
    line(5, 9, "system", null, null, null, null),
    line(6, 10, "system", null, null, null, null),
    line(7, 7, "system", null, null, null, null),
    line(8, 8, "system", null, null, null, null),
    line(9, 11, "system", null, null, null, null),
    line(10, 13, "system", null, null, null, null),
    line(11, 14, "system", null, null, null, null),
  ]),
  structure(3, "Management Structure", false, [
    line(1, 1, "percent", null, 40, "ctc", null),
    line(2, 2, "percent", null, 50, "component", 1),
    line(3, 3, "fixed", 25000, null, null, null),
    line(4, 5, "fixed", 10000, null, null, null),
    line(5, 6, "system", null, null, null, null),
    line(6, 9, "system", null, null, null, null),
    line(7, 10, "system", null, null, null, null),
    line(8, 7, "system", null, null, null, null),
    line(9, 8, "system", null, null, null, null),
    line(10, 11, "system", null, null, null, null),
    line(11, 13, "system", null, null, null, null),
    line(12, 14, "system", null, null, null, null),
  ]),
  structure(4, "Intern Structure", false, [
    line(1, 1, "fixed", 12000, null, null, null),
    line(2, 4, "fixed", 1600, null, null, null),
  ]),
];

/** Demo assignment counts — not all codes exist as live employee rows */
const EMPLOYEE_STRUCTURE_SEED: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 1; i <= 24; i++) {
    map[`EMP-STD-${String(i).padStart(4, "0")}`] = 1;
  }
  map["EMP-0002"] = 2;
  map["EMP-0004"] = 2;
  map["EMP-DEMO-001"] = 1;
  map["EMP-0005"] = 4;
  return map;
})();

function normalizeCalcMode(raw: unknown): StructureLineCalcMode | null {
  const s = String(raw ?? "").toLowerCase();
  if (s === "fixed" || s === "percent" || s === "system") return s;
  return null;
}

function normalizeCalculateOnBase(raw: unknown): StructureCalculateOnBase | null {
  const s = String(raw ?? "").toLowerCase();
  if (s === "ctc" || s === "gross" || s === "component") return s;
  return null;
}

function inferCalcModeFromLegacy(
  raw: Record<string, unknown>,
  component: SalaryComponentRecord | null,
): StructureLineCalcMode {
  if (component && isProtectedStatutoryStructureComponent(component)) return "system";
  const explicit = normalizeCalcMode(raw.calcMode);
  if (explicit) return explicit;
  if (component && isStatutoryCalculationType(component.calculationType)) return "system";
  if (raw.structureRate != null && raw.structureRate !== "") return "percent";
  if (
    component &&
    component.componentType !== "earning" &&
    isPercentCalculationType(component.calculationType)
  ) {
    return "system";
  }
  if (component && isPercentCalculationType(component.calculationType)) return "percent";
  return "fixed";
}

function inferCalculateOnBaseFromLegacy(
  raw: Record<string, unknown>,
  component: SalaryComponentRecord | null,
): StructureCalculateOnBase | null {
  const explicit = normalizeCalculateOnBase(raw.calculateOnBase);
  if (explicit) return explicit;
  if (component?.calculationType === "percent_ctc") return "ctc";
  if (component?.calculationType === "percent_gross") return "gross";
  if (raw.calculateOnComponentId != null && raw.calculateOnComponentId !== "") {
    return "component";
  }
  return null;
}

function normalizeLine(
  raw: Record<string, unknown>,
  index: number,
  components: SalaryComponentRecord[],
): SalaryStructureLine {
  const componentId = Number(raw.componentId) || 0;
  const component = components.find((c) => c.id === componentId) ?? null;
  const calcMode = inferCalcModeFromLegacy(raw, component);
  const calculateOnBase = inferCalculateOnBaseFromLegacy(raw, component);
  return {
    id: Number(raw.id) || index + 1,
    componentId,
    calcMode,
    structureAmount:
      raw.structureAmount != null && raw.structureAmount !== ""
        ? Math.max(0, Number(raw.structureAmount))
        : null,
    structureRate:
      raw.structureRate != null && raw.structureRate !== ""
        ? Math.max(0, Number(raw.structureRate))
        : null,
    calculateOnBase: calcMode === "percent" ? calculateOnBase : null,
    calculateOnComponentId:
      calcMode === "percent" &&
      calculateOnBase === "component" &&
      raw.calculateOnComponentId != null &&
      raw.calculateOnComponentId !== ""
        ? Number(raw.calculateOnComponentId)
        : null,
  };
}

function normalizeRecord(raw: Record<string, unknown>, index: number): SalaryStructureRecord {
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    id: Number(raw.id) || index + 1,
    name: String(raw.name ?? ""),
    isDefault: raw.isDefault === true,
    status: raw.status === "inactive" ? "inactive" : "active",
    lines: linesRaw.map((l, i) =>
      normalizeLine(l as Record<string, unknown>, i, loadSalaryComponents()),
    ),
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : policyToday(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : policyToday(),
  };
}

export function loadSalaryStructures(): SalaryStructureRecord[] {
  const comps = loadSalaryComponents();
  const componentIds = new Set(comps.map((c) => c.id));
  const employeeEsi = comps.find((c) => c.name.trim().toLowerCase() === "employee esi");
  const employerEsi = comps.find((c) => c.name.trim().toLowerCase() === "employer esi");
  const employeePf = comps.find((c) => c.name.trim().toLowerCase() === "employee pf");
  const employeeLwf = comps.find((c) => c.name.trim().toLowerCase() === "employee lwf");
  const employerLwf = comps.find((c) => c.name.trim().toLowerCase() === "employer lwf");

  const raw = loadPolicyList(STORAGE_KEY, structuredClone(SEED));
  const list = raw.map((r, i) => normalizeRecord(r as unknown as Record<string, unknown>, i));
  let cleaned = list.map((record) => ({
    ...record,
    lines: record.lines.filter((l) => componentIds.has(l.componentId)),
  }));

  let mutated = cleaned.some((s, i) => s.lines.length !== list[i]!.lines.length);

  const ensureSystemLines = (
    record: SalaryStructureRecord,
    ids: { id: number }[],
  ): SalaryStructureRecord => {
    let nextId = record.lines.reduce((m, l) => Math.max(m, l.id), 0) + 1;
    const lines = [...record.lines];
    let changed = false;
    for (const comp of ids) {
      if (lines.some((l) => l.componentId === comp.id)) continue;
      changed = true;
      lines.push({
        id: nextId++,
        componentId: comp.id,
        calcMode: "system",
        structureAmount: null,
        structureRate: null,
        calculateOnBase: null,
        calculateOnComponentId: null,
      });
    }
    return changed ? { ...record, lines } : record;
  };

  // Structures that already include Employee PF should also expose ESI / LWF lines for preview
  if (employeePf) {
    cleaned = cleaned.map((record) => {
      const hasPf = record.lines.some((l) => l.componentId === employeePf.id);
      if (!hasPf) return record;
      const before = record.lines.length;
      let next = record;
      if (employeeEsi && employerEsi) {
        next = ensureSystemLines(next, [employeeEsi, employerEsi]);
      }
      if (employeeLwf && employerLwf) {
        next = ensureSystemLines(next, [employeeLwf, employerLwf]);
      }
      if (next.lines.length !== before) mutated = true;
      return next;
    });
  }

  if (mutated && typeof window !== "undefined") {
    savePolicyList(STORAGE_KEY, cleaned);
  }
  return cleaned;
}

export function saveSalaryStructures(list: SalaryStructureRecord[]): void {
  savePolicyList(STORAGE_KEY, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-salary-structures-updated"));
  }
}

export function getSalaryStructureById(id: number): SalaryStructureRecord | null {
  return loadSalaryStructures().find((s) => s.id === id) ?? null;
}

export function getDefaultSalaryStructure(): SalaryStructureRecord | null {
  return (
    loadSalaryStructures().find((s) => s.isDefault && s.status === "active") ??
    loadSalaryStructures().find((s) => s.status === "active") ??
    null
  );
}

export function getActiveSalaryStructures(): SalaryStructureRecord[] {
  return loadSalaryStructures().filter((s) => s.status === "active");
}

export function nextSalaryStructureId(list: SalaryStructureRecord[]): number {
  return nextPolicyId(list);
}

export function nextStructureLineId(lines: SalaryStructureLine[]): number {
  return nextPolicyId(lines);
}

export function withSalaryStructureNewAudit(
  partial: Omit<
    SalaryStructureRecord,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): SalaryStructureRecord {
  const today = policyToday();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withSalaryStructureUpdateAudit(
  record: SalaryStructureRecord,
): SalaryStructureRecord {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function applySalaryStructureDefault(
  list: SalaryStructureRecord[],
  targetId: number,
): SalaryStructureRecord[] {
  return list.map((s) => ({
    ...s,
    isDefault: s.id === targetId,
    updatedBy: s.id === targetId ? CURRENT_USER : s.updatedBy,
    updatedAt: s.id === targetId ? policyToday() : s.updatedAt,
  }));
}

export function getSalaryComponentById(
  componentId: number,
  components?: SalaryComponentRecord[],
): SalaryComponentRecord | null {
  const list = components ?? loadSalaryComponents();
  return list.find((c) => c.id === componentId) ?? null;
}

export function countLinesByType(
  structure: SalaryStructureRecord,
  components?: SalaryComponentRecord[],
): { earnings: number; deductions: number; employerContributions: number } {
  const comps = components ?? loadSalaryComponents();
  let earnings = 0;
  let deductions = 0;
  let employerContributions = 0;
  for (const ln of structure.lines) {
    const comp = comps.find((c) => c.id === ln.componentId);
    if (!comp) continue;
    if (comp.componentType === "earning") earnings += 1;
    else if (comp.componentType === "deduction") deductions += 1;
    else employerContributions += 1;
  }
  return { earnings, deductions, employerContributions };
}

export function groupStructureLines(
  structure: SalaryStructureRecord,
  components?: SalaryComponentRecord[],
): {
  earnings: SalaryStructureLine[];
  deductions: SalaryStructureLine[];
  employerContributions: SalaryStructureLine[];
} {
  const comps = components ?? loadSalaryComponents();
  const earnings: SalaryStructureLine[] = [];
  const deductions: SalaryStructureLine[] = [];
  const employerContributions: SalaryStructureLine[] = [];
  for (const ln of structure.lines) {
    const comp = comps.find((c) => c.id === ln.componentId);
    if (!comp) continue;
    if (comp.componentType === "earning") earnings.push(ln);
    else if (comp.componentType === "deduction") deductions.push(ln);
    else employerContributions.push(ln);
  }
  return { earnings, deductions, employerContributions };
}

export function isPercentCalculationType(type: SalaryCalculationType): boolean {
  return calculationTypeUsesDefaultRate(type);
}

export function isStatutoryCalculationType(type: SalaryCalculationType): boolean {
  return type === "statutory";
}

export function isFixedCalculationType(type: SalaryCalculationType): boolean {
  return calculationTypeUsesDefaultValue(type);
}

export function calcModeLabel(mode: StructureLineCalcMode): string {
  switch (mode) {
    case "fixed":
      return "Fixed Amount";
    case "percent":
      return "Percentage";
    case "system":
      return "System Calculated";
  }
}

export function formatCalculateOnBase(
  line: SalaryStructureLine,
  components?: SalaryComponentRecord[],
): string {
  if (line.calcMode !== "percent") return "—";
  if (line.calculateOnBase === "ctc") return "CTC";
  if (line.calculateOnBase === "gross") return "Gross Earnings";
  if (line.calculateOnBase === "component" && line.calculateOnComponentId != null) {
    return getSalaryComponentById(line.calculateOnComponentId, components)?.name ?? "—";
  }
  return "—";
}

export function isSelfReferencingLine(line: SalaryStructureLine): boolean {
  return (
    line.calcMode === "percent" &&
    line.calculateOnBase === "component" &&
    line.calculateOnComponentId === line.componentId
  );
}

/** Statutory / protected deductions (e.g. Professional Tax) — never Fixed/Percent in structure. */
export function isProtectedStatutoryStructureComponent(
  component: SalaryComponentRecord,
): boolean {
  if (isStatutoryCalculationType(component.calculationType)) return true;
  const n = component.name.trim().toLowerCase();
  return (
    n === "professional tax" ||
    n === "tds" ||
    n === "esi" ||
    n === "employee esi" ||
    n === "employer esi" ||
    n === "employee pf" ||
    n === "employer pf" ||
    n === "lwf" ||
    n === "employee lwf" ||
    n === "employer lwf"
  );
}

export function resolveLineCalcModeFromComponent(
  component: SalaryComponentRecord,
): StructureLineCalcMode {
  if (isProtectedStatutoryStructureComponent(component)) return "system";
  if (component.componentType !== "earning" && isPercentCalculationType(component.calculationType)) {
    return "system";
  }
  if (isPercentCalculationType(component.calculationType)) return "percent";
  return "fixed";
}

export function defaultCalculateOnForComponent(
  component: SalaryComponentRecord,
  earningLines: SalaryStructureLine[],
  components: SalaryComponentRecord[],
): number | null {
  if (component.calculationType === "percent_basic") {
    const basic =
      earningLines.find((l) => {
        const c = components.find((x) => x.id === l.componentId);
        return c?.name.toLowerCase() === "basic";
      }) ??
      earningLines.find((l) => {
        const c = components.find((x) => x.id === l.componentId);
        return c && l.calcMode === "fixed";
      });
    return basic?.componentId ?? null;
  }
  return null;
}

export function defaultCalculateOnBaseForComponent(
  component: SalaryComponentRecord,
): StructureCalculateOnBase | null {
  if (component.calculationType === "percent_ctc") return "ctc";
  if (component.calculationType === "percent_gross") return "gross";
  if (component.calculationType === "percent_basic") return "component";
  return null;
}

export function buildCalculateOnSelectOptions(
  line: SalaryStructureLine,
  earningLines: SalaryStructureLine[],
  components: SalaryComponentRecord[],
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [
    { value: "ctc", label: "CTC" },
    { value: "gross", label: "Gross Earnings" },
  ];
  for (const el of earningLines) {
    if (el.componentId === line.componentId) continue;
    const comp = components.find((c) => c.id === el.componentId);
    if (!comp) continue;
    options.push({ value: `component:${el.componentId}`, label: comp.name });
  }
  return options;
}

export function buildLineFromComponent(
  component: SalaryComponentRecord,
  lineId: number,
  earningLines: SalaryStructureLine[],
  components: SalaryComponentRecord[],
): SalaryStructureLine {
  const calcMode = resolveLineCalcModeFromComponent(component);
  let structureAmount: number | null = null;
  let structureRate: number | null = null;
  let calculateOnBase: StructureCalculateOnBase | null = null;
  let calculateOnComponentId: number | null = null;

  if (calcMode === "fixed") {
    structureAmount =
      component.defaultValue ??
      (component.calculationType === "manual" ? null : 0);
  } else if (calcMode === "percent") {
    structureRate = component.defaultRate;
    calculateOnBase = defaultCalculateOnBaseForComponent(component);
    if (calculateOnBase === "component") {
      calculateOnComponentId = defaultCalculateOnForComponent(
        component,
        earningLines,
        components,
      );
    }
  }

  return {
    id: lineId,
    componentId: component.id,
    calcMode,
    structureAmount,
    structureRate,
    calculateOnBase,
    calculateOnComponentId,
  };
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function structureUsesCtcOrGrossFormula(earningLines: SalaryStructureLine[]): boolean {
  return earningLines.some(
    (ln) =>
      ln.calcMode === "percent" &&
      (ln.calculateOnBase === "ctc" || ln.calculateOnBase === "gross"),
  );
}

export function computeConfiguredFixedGross(
  structure: SalaryStructureRecord,
  components?: SalaryComponentRecord[],
): number | null {
  const grouped = groupStructureLines(structure, components);
  const fixedSum = grouped.earnings
    .filter((ln) => ln.calcMode === "fixed" && ln.structureAmount != null)
    .reduce((sum, ln) => sum + (ln.structureAmount ?? 0), 0);
  if (structureUsesCtcOrGrossFormula(grouped.earnings)) {
    return grouped.earnings.some((ln) => ln.calcMode === "fixed") ? fixedSum : null;
  }
  const resolved = resolveEarningAmounts(grouped.earnings, components ?? loadSalaryComponents());
  const parts = grouped.earnings
    .map((ln) => resolved.get(ln.componentId))
    .filter((v): v is number => v != null);
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null;
}

function resolveEarningAmounts(
  earningLines: SalaryStructureLine[],
  components: SalaryComponentRecord[],
): Map<number, number | null> {
  const resolved = new Map<number, number | null>();
  const maxPasses = 12;

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const ln of earningLines) {
      if (resolved.has(ln.componentId) && resolved.get(ln.componentId) != null) continue;

      if (ln.calcMode === "fixed") {
        if (ln.structureAmount != null) {
          resolved.set(ln.componentId, ln.structureAmount);
          changed = true;
        }
        continue;
      }

      if (ln.calcMode === "system") {
        resolved.set(ln.componentId, null);
        continue;
      }

      if (ln.calcMode === "percent") {
        const rate = ln.structureRate;
        if (rate == null) {
          resolved.set(ln.componentId, null);
          continue;
        }
        if (ln.calculateOnBase === "ctc" || ln.calculateOnBase === "gross") {
          resolved.set(ln.componentId, null);
          continue;
        }
        if (ln.calculateOnBase === "component") {
          const baseId = ln.calculateOnComponentId;
          if (!baseId || baseId === ln.componentId) {
            resolved.set(ln.componentId, null);
            continue;
          }
          const base = resolved.get(baseId);
          if (base == null) continue;
          resolved.set(ln.componentId, Math.round((base * rate) / 100));
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  for (const ln of earningLines) {
    if (!resolved.has(ln.componentId)) resolved.set(ln.componentId, null);
  }
  return resolved;
}

/** Read-only Value / Rate + Calculate On labels for system-calculated structure lines. */
export function systemCalculatedStructureLabels(component: SalaryComponentRecord): {
  valueRate: string;
  calculateOn: string;
  tooltip?: string;
} {
  const n = component.name.trim().toLowerCase();
  if (n === "professional tax") {
    return {
      valueRate: "System Calculated",
      calculateOn: "State-based PT Rules",
      tooltip:
        "Professional Tax is resolved from Statutory Compliance → Professional Tax configurations (state, salary basis, slabs). Amounts differ per employee.",
    };
  }
  if (n === "employee pf" || n === "employer pf") {
    return {
      valueRate: "System Calculated",
      calculateOn: "PF Rules",
      tooltip:
        "Provident Fund is resolved from Statutory Compliance → PF settings (rates, ceilings, EPS). Amounts differ per employee.",
    };
  }
  if (n === "esi" || n === "employee esi" || n === "employer esi") {
    return {
      valueRate: "System Calculated",
      calculateOn: "ESI Rules",
      tooltip:
        "ESI is resolved from Statutory Compliance → ESI settings (eligibility limit, rates, contribution base). Amounts differ per employee.",
    };
  }
  if (n === "lwf" || n === "employee lwf" || n === "employer lwf" || n.includes("labour welfare") || n.includes("labor welfare")) {
    return {
      valueRate: "System Calculated",
      calculateOn: "LWF Rules",
      tooltip:
        "Labour Welfare Fund is resolved from Statutory Compliance → LWF settings (state, frequency, contribution months). Amounts differ per employee.",
    };
  }
  if (n === "tds") {
    return {
      valueRate: "System Calculated",
      calculateOn: "Tax Rules",
      tooltip:
        "TDS is projected from Tax Settings → Tax Regime and TDS Settings (regime, standard deduction, income slabs). Not a manual salary amount.",
    };
  }
  return {
    valueRate: "Statutory",
    calculateOn: "Payroll",
    tooltip: "Resolved from statutory / tax configuration during payroll.",
  };
}

function buildLinePreview(
  ln: SalaryStructureLine,
  comp: SalaryComponentRecord,
  earningResolved: Map<number, number | null>,
  components: SalaryComponentRecord[],
): StructureLinePreview {
  let displayCalculation = calcModeLabel(ln.calcMode);
  let displayAmount = "—";
  let displayCalculateOn = "—";
  let resolvedAmount: number | null = null;

  if (ln.calcMode === "system") {
    const sys = systemCalculatedStructureLabels(comp);
    displayAmount = sys.valueRate;
    displayCalculateOn = sys.calculateOn;
  } else if (ln.calcMode === "fixed") {
    if (ln.structureAmount != null) {
      displayAmount = formatInr(ln.structureAmount);
      resolvedAmount = ln.structureAmount;
    }
  } else if (ln.calcMode === "percent") {
    displayCalculateOn = formatCalculateOnBase(ln, components);
    if (ln.structureRate != null) {
      displayAmount =
        displayCalculateOn !== "—"
          ? `${ln.structureRate}% of ${displayCalculateOn}`
          : `${ln.structureRate}%`;
      displayCalculation =
        displayCalculateOn !== "—"
          ? `${ln.structureRate}% of ${displayCalculateOn}`
          : `Percentage · ${ln.structureRate}%`;
      if (ln.calculateOnBase === "component" && ln.calculateOnComponentId != null) {
        const base = earningResolved.get(ln.calculateOnComponentId);
        if (base != null) {
          resolvedAmount = Math.round((base * ln.structureRate) / 100);
        }
      }
    }
  }

  return {
    lineId: ln.id,
    componentId: comp.id,
    componentName: comp.name,
    componentType: comp.componentType,
    calcMode: ln.calcMode,
    displayCalculation,
    displayAmount,
    displayCalculateOn,
    resolvedAmount,
  };
}

export function computeStructurePreview(
  structure: SalaryStructureRecord,
  components?: SalaryComponentRecord[],
): StructurePreview {
  const comps = components ?? loadSalaryComponents();
  const grouped = groupStructureLines(structure, comps);
  const earningResolved = resolveEarningAmounts(grouped.earnings, comps);

  const earnings = grouped.earnings
    .map((ln) => {
      const comp = comps.find((c) => c.id === ln.componentId);
      return comp ? buildLinePreview(ln, comp, earningResolved, comps) : null;
    })
    .filter(Boolean) as StructureLinePreview[];

  const deductions = grouped.deductions
    .map((ln) => {
      const comp = comps.find((c) => c.id === ln.componentId);
      return comp ? buildLinePreview(ln, comp, earningResolved, comps) : null;
    })
    .filter(Boolean) as StructureLinePreview[];

  const employerContributions = grouped.employerContributions
    .map((ln) => {
      const comp = comps.find((c) => c.id === ln.componentId);
      return comp ? buildLinePreview(ln, comp, earningResolved, comps) : null;
    })
    .filter(Boolean) as StructureLinePreview[];

  const grossEarnings = computeConfiguredFixedGross(structure, comps);

  const hasStatutoryEmployer = employerContributions.some((e) => e.calcMode === "system");
  const employerParts = employerContributions
    .filter((e) => e.calcMode !== "system")
    .map((e) => e.resolvedAmount)
    .filter((v): v is number => v != null);
  const totalEmployerContribution =
    employerParts.length > 0 ? employerParts.reduce((a, b) => a + b, 0) : null;

  const hasStatutoryDeduction = deductions.some((d) => d.calcMode === "system");
  const nonStatutoryDeductions = deductions.filter((d) => d.calcMode !== "system");
  const allNonStatutoryResolved =
    nonStatutoryDeductions.length === 0 ||
    nonStatutoryDeductions.every((d) => d.resolvedAmount != null);

  let netPayDisplay = "Calculated during payroll";
  if (grossEarnings != null && !hasStatutoryDeduction && allNonStatutoryResolved) {
    const dedSum = nonStatutoryDeductions.reduce((s, d) => s + (d.resolvedAmount ?? 0), 0);
    netPayDisplay = formatInr(Math.max(0, grossEarnings - dedSum));
  } else if (hasStatutoryDeduction) {
    netPayDisplay = "Calculated during payroll";
  }

  let estimatedCtc: number | null = null;
  if (grossEarnings != null && !structureUsesCtcOrGrossFormula(grouped.earnings)) {
    estimatedCtc = grossEarnings + (totalEmployerContribution ?? 0);
  }

  return {
    earnings,
    deductions,
    employerContributions,
    grossEarnings,
    totalEmployerContribution,
    estimatedCtc,
    netPayDisplay,
  };
}

export function countSalaryStructuresUsingComponent(componentId: number): number {
  return loadSalaryStructures().filter((s) =>
    s.lines.some((l) => l.componentId === componentId),
  ).length;
}

export function loadEmployeeSalaryStructureMap(): Record<string, number> {
  if (typeof window === "undefined") return { ...EMPLOYEE_STRUCTURE_SEED };
  try {
    const raw = localStorage.getItem(EMPLOYEE_MAP_KEY);
    if (!raw) {
      localStorage.setItem(EMPLOYEE_MAP_KEY, JSON.stringify(EMPLOYEE_STRUCTURE_SEED));
      return { ...EMPLOYEE_STRUCTURE_SEED };
    }
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return { ...EMPLOYEE_STRUCTURE_SEED };
  }
}

export function saveEmployeeSalaryStructureMap(map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMPLOYEE_MAP_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("hr-employee-salary-structure-updated"));
}

export function countEmployeesOnSalaryStructure(
  structure: SalaryStructureRecord,
  employees?: HrEmployee[],
): number {
  const map = loadEmployeeSalaryStructureMap();
  const fromMap = Object.values(map).filter((id) => id === structure.id).length;
  const list = employees ?? loadHrEmployees();
  const fromProfile = list.filter(
    (e) => e.profileSummaries?.payroll?.structure === structure.name,
  ).length;
  return Math.max(fromMap, fromProfile);
}

export function getAssignedSalaryStructure(employeeCode: string): SalaryStructureRecord | null {
  const map = loadEmployeeSalaryStructureMap();
  const explicitId = map[employeeCode];
  if (explicitId != null) {
    const found = getSalaryStructureById(explicitId);
    if (found) return found;
  }
  const employees = loadHrEmployees();
  const emp = employees.find((e) => e.employeeCode === employeeCode);
  const structureId = emp?.profileSummaries?.payroll?.structureId;
  if (typeof structureId === "number") {
    const byId = getSalaryStructureById(structureId);
    if (byId) return byId;
  }
  if (emp?.profileSummaries?.payroll?.structure) {
    return (
      loadSalaryStructures().find(
        (s) => s.name === emp.profileSummaries?.payroll?.structure,
      ) ?? null
    );
  }
  return getDefaultSalaryStructure();
}

export function assignEmployeeSalaryStructure(
  employeeCode: string,
  structureId: number,
): void {
  const map = loadEmployeeSalaryStructureMap();
  map[employeeCode] = structureId;
  saveEmployeeSalaryStructureMap(map);
}
