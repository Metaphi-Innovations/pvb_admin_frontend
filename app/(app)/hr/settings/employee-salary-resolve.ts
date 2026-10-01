/**
 * Employee monthly salary resolution — CTC + Salary Structure formulas.
 * Does NOT calculate statutory components (PF/ESI/PT/TDS) or attendance proration.
 */

import {
  calcModeLabel,
  formatCalculateOnBase,
  getAssignedSalaryStructure,
  getDefaultSalaryStructure,
  getSalaryComponentById,
  groupStructureLines,
  loadSalaryStructures,
  systemCalculatedStructureLabels,
  type SalaryStructureLine,
  type SalaryStructureRecord,
} from "./salary-structures-data";
import { loadSalaryComponents, type SalaryComponentRecord } from "./salary-components-data";
import type { EmployeeProfileSummaries } from "../employees/demo-employee";
import type { HrEmployee } from "../employees/employee-master-data";

export type ResolvedLineStatus =
  | "resolved"
  | "system"
  | "unable"
  | "self_reference"
  | "circular";

export interface ResolvedSalaryLine {
  lineId: number;
  componentId: number;
  componentName: string;
  componentType: SalaryComponentRecord["componentType"];
  calcMode: SalaryStructureLine["calcMode"];
  /** Human formula e.g. "40% of CTC" */
  displayCalculation: string;
  /** ₹ amount or placeholder text */
  displayAmount: string;
  amount: number | null;
  status: ResolvedLineStatus;
}

export interface EmployeeSalaryResolution {
  monthlyCtc: number | null;
  annualCtc: number | null;
  structure: SalaryStructureRecord | null;
  earnings: ResolvedSalaryLine[];
  deductions: ResolvedSalaryLine[];
  employerContributions: ResolvedSalaryLine[];
  configuredEarningsTotal: number | null;
  unallocatedCtc: number | null;
  hasCircularDependency: boolean;
  errorMessage: string | null;
}

/** Parse legacy CTC display strings into monthly amount. */
export function parseMonthlyCtcValue(
  payroll: EmployeeProfileSummaries["payroll"] | undefined | null,
): number | null {
  if (!payroll) return null;
  if (typeof payroll.monthlyCtc === "number" && Number.isFinite(payroll.monthlyCtc)) {
    return payroll.monthlyCtc > 0 ? Math.round(payroll.monthlyCtc) : null;
  }
  const raw = String(payroll.ctc ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("annual") || lower.includes("year") || lower.includes("/yr")) {
    return Math.round(n / 12);
  }
  return Math.round(n);
}

export function formatInrAmount(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatAnnualCtcDisplay(monthlyCtc: number): string {
  return formatInrAmount(monthlyCtc * 12);
}

export function formatMonthlyCtcDisplay(monthlyCtc: number): string {
  return formatInrAmount(monthlyCtc);
}

/** Sync legacy `ctc` string from monthly CTC for older readers. */
export function monthlyCtcToLegacyDisplay(monthlyCtc: number): string {
  return `${formatAnnualCtcDisplay(monthlyCtc)} annually`;
}

function lineFormulaLabel(
  ln: SalaryStructureLine,
  comp: SalaryComponentRecord,
  components: SalaryComponentRecord[],
): string {
  if (ln.calcMode === "system") {
    return calcModeLabel("system");
  }
  if (ln.calcMode === "fixed") {
    return ln.structureAmount != null
      ? `Fixed · ${formatInrAmount(ln.structureAmount)}`
      : "Fixed Amount";
  }
  if (ln.calcMode === "percent") {
    const rate = ln.structureRate;
    const base = formatCalculateOnBase(ln, components);
    if (rate != null && base !== "—") return `${rate}% of ${base}`;
    if (rate != null) return `${rate}%`;
    return "Percentage";
  }
  return calcModeLabel(ln.calcMode);
}

function detectCircularAmongEarnings(
  earningLines: SalaryStructureLine[],
): { circular: boolean; selfRefIds: Set<number> } {
  const selfRefIds = new Set<number>();
  const edges = new Map<number, number[]>();

  for (const ln of earningLines) {
    if (ln.calcMode !== "percent" || ln.calculateOnBase !== "component") continue;
    const baseId = ln.calculateOnComponentId;
    if (baseId == null) continue;
    if (baseId === ln.componentId) {
      selfRefIds.add(ln.componentId);
      continue;
    }
    const list = edges.get(ln.componentId) ?? [];
    list.push(baseId);
    edges.set(ln.componentId, list);
  }

  const visiting = new Set<number>();
  const visited = new Set<number>();
  let circular = false;

  function dfs(node: number): void {
    if (circular) return;
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      circular = true;
      return;
    }
    visiting.add(node);
    for (const next of edges.get(node) ?? []) {
      dfs(next);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const id of edges.keys()) {
    dfs(id);
    if (circular) break;
  }

  return { circular, selfRefIds };
}

function resolveEarningAmountsWithCtc(
  earningLines: SalaryStructureLine[],
  monthlyCtc: number,
  selfRefIds: Set<number>,
): Map<number, number | null> {
  const resolved = new Map<number, number | null>();
  const maxPasses = earningLines.length + 4;

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const ln of earningLines) {
      if (resolved.has(ln.componentId) && resolved.get(ln.componentId) != null) continue;

      if (ln.calcMode === "system") {
        resolved.set(ln.componentId, null);
        continue;
      }

      if (selfRefIds.has(ln.componentId)) {
        resolved.set(ln.componentId, null);
        continue;
      }

      if (ln.calcMode === "fixed") {
        if (ln.structureAmount != null) {
          resolved.set(ln.componentId, Math.round(ln.structureAmount));
          changed = true;
        } else {
          resolved.set(ln.componentId, null);
        }
        continue;
      }

      if (ln.calcMode === "percent") {
        const rate = ln.structureRate;
        if (rate == null) {
          resolved.set(ln.componentId, null);
          continue;
        }
        if (ln.calculateOnBase === "ctc") {
          resolved.set(ln.componentId, Math.round((monthlyCtc * rate) / 100));
          changed = true;
          continue;
        }
        if (ln.calculateOnBase === "gross") {
          // Gross depends on full earnings — not safely resolvable as a base here.
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
          continue;
        }
        resolved.set(ln.componentId, null);
      }
    }
    if (!changed) break;
  }

  for (const ln of earningLines) {
    if (!resolved.has(ln.componentId)) resolved.set(ln.componentId, null);
  }
  return resolved;
}

function buildResolvedLine(
  ln: SalaryStructureLine,
  comp: SalaryComponentRecord,
  components: SalaryComponentRecord[],
  amountMap: Map<number, number | null>,
  opts: {
    circular: boolean;
    selfRefIds: Set<number>;
    hasCtc: boolean;
  },
): ResolvedSalaryLine {
  const displayCalculation = lineFormulaLabel(ln, comp, components);

  if (ln.calcMode === "system") {
    const sys = systemCalculatedStructureLabels(comp);
    return {
      lineId: ln.id,
      componentId: comp.id,
      componentName: comp.name,
      componentType: comp.componentType,
      calcMode: "system",
      displayCalculation:
        sys.valueRate === "State Based"
          ? "System Calculated · State Based"
          : "System Calculated",
      displayAmount: "Calculated during payroll",
      amount: null,
      status: "system",
    };
  }

  if (opts.selfRefIds.has(ln.componentId)) {
    return {
      lineId: ln.id,
      componentId: comp.id,
      componentName: comp.name,
      componentType: comp.componentType,
      calcMode: ln.calcMode,
      displayCalculation,
      displayAmount: "Unable to Calculate",
      amount: null,
      status: "self_reference",
    };
  }

  if (opts.circular && ln.calcMode === "percent" && ln.calculateOnBase === "component") {
    return {
      lineId: ln.id,
      componentId: comp.id,
      componentName: comp.name,
      componentType: comp.componentType,
      calcMode: ln.calcMode,
      displayCalculation,
      displayAmount: "Unable to Calculate",
      amount: null,
      status: "circular",
    };
  }

  if (ln.calcMode === "percent" && ln.calculateOnBase === "ctc" && !opts.hasCtc) {
    return {
      lineId: ln.id,
      componentId: comp.id,
      componentName: comp.name,
      componentType: comp.componentType,
      calcMode: ln.calcMode,
      displayCalculation,
      displayAmount: "Configuration Required",
      amount: null,
      status: "unable",
    };
  }

  const amount = amountMap.get(ln.componentId) ?? null;
  if (amount != null) {
    return {
      lineId: ln.id,
      componentId: comp.id,
      componentName: comp.name,
      componentType: comp.componentType,
      calcMode: ln.calcMode,
      displayCalculation,
      displayAmount: formatInrAmount(amount),
      amount,
      status: "resolved",
    };
  }

  return {
    lineId: ln.id,
    componentId: comp.id,
    componentName: comp.name,
    componentType: comp.componentType,
    calcMode: ln.calcMode,
    displayCalculation,
    displayAmount: "Unable to Calculate",
    amount: null,
    status: "unable",
  };
}

export function resolveEmployeeMonthlySalary(input: {
  monthlyCtc: number | null;
  structure: SalaryStructureRecord | null;
  components?: SalaryComponentRecord[];
}): EmployeeSalaryResolution {
  const comps = input.components ?? loadSalaryComponents();
  const structure = input.structure;
  const monthlyCtc =
    input.monthlyCtc != null && input.monthlyCtc > 0 ? Math.round(input.monthlyCtc) : null;

  if (!structure) {
    return {
      monthlyCtc,
      annualCtc: monthlyCtc != null ? monthlyCtc * 12 : null,
      structure: null,
      earnings: [],
      deductions: [],
      employerContributions: [],
      configuredEarningsTotal: null,
      unallocatedCtc: null,
      hasCircularDependency: false,
      errorMessage: null,
    };
  }

  const grouped = groupStructureLines(structure, comps);
  const { circular, selfRefIds } = detectCircularAmongEarnings(grouped.earnings);
  const amountMap =
    monthlyCtc != null
      ? resolveEarningAmountsWithCtc(grouped.earnings, monthlyCtc, selfRefIds)
      : new Map<number, number | null>();

  // Without CTC, still resolve fixed amounts
  if (monthlyCtc == null) {
    for (const ln of grouped.earnings) {
      if (ln.calcMode === "fixed" && ln.structureAmount != null) {
        amountMap.set(ln.componentId, Math.round(ln.structureAmount));
      }
    }
  }

  const mapLines = (lines: SalaryStructureLine[]) =>
    lines
      .map((ln) => {
        const comp = getSalaryComponentById(ln.componentId, comps);
        if (!comp) return null;
        return buildResolvedLine(ln, comp, comps, amountMap, {
          circular,
          selfRefIds,
          hasCtc: monthlyCtc != null,
        });
      })
      .filter(Boolean) as ResolvedSalaryLine[];

  const earnings = mapLines(grouped.earnings);
  const deductions = mapLines(grouped.deductions);
  const employerContributions = mapLines(grouped.employerContributions);

  const resolvedEarnAmounts = earnings
    .filter((e) => e.status === "resolved" && e.amount != null)
    .map((e) => e.amount as number);
  const configuredEarningsTotal =
    resolvedEarnAmounts.length > 0
      ? resolvedEarnAmounts.reduce((a, b) => a + b, 0)
      : null;

  let unallocatedCtc: number | null = null;
  if (monthlyCtc != null && configuredEarningsTotal != null) {
    const gap = monthlyCtc - configuredEarningsTotal;
    if (gap > 0) unallocatedCtc = gap;
  }

  return {
    monthlyCtc,
    annualCtc: monthlyCtc != null ? monthlyCtc * 12 : null,
    structure,
    earnings,
    deductions,
    employerContributions,
    configuredEarningsTotal,
    unallocatedCtc,
    hasCircularDependency: circular,
    errorMessage: circular
      ? "Salary structure contains a circular calculation dependency."
      : selfRefIds.size > 0
        ? "Salary structure contains a self-referencing calculation."
        : null,
  };
}

export function resolveStructureForEmployee(employee: HrEmployee): SalaryStructureRecord | null {
  return getAssignedSalaryStructure(employee.employeeCode);
}

export function getStructureSelectOptions(employee: HrEmployee): {
  value: number;
  label: string;
  disabled?: boolean;
}[] {
  const all = loadSalaryStructures();
  const assigned = getAssignedSalaryStructure(employee.employeeCode);
  const options: { value: number; label: string; disabled?: boolean }[] = [];

  for (const s of all.filter((x) => x.status === "active")) {
    options.push({
      value: s.id,
      label: s.isDefault ? `${s.name} (Default)` : s.name,
    });
  }

  if (assigned && assigned.status === "inactive") {
    options.unshift({
      value: assigned.id,
      label: `${assigned.name} (Inactive)`,
      disabled: false, // keep visible; UI blocks picking other inactive
    });
  }

  return options;
}

export function resolveStructureIdForSelect(employee: HrEmployee): number | null {
  const assigned = getAssignedSalaryStructure(employee.employeeCode);
  if (assigned) return assigned.id;
  return getDefaultSalaryStructure()?.id ?? null;
}
