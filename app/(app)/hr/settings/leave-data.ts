/**
 * HR Leave Settings — Leave Types + Leave Policies (frontend/demo).
 * Single source of truth for leave type names used by Policy, Balance, and Requests.
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

export type LeaveCycle = "monthly" | "yearly";

export const LEAVE_CYCLE_OPTIONS: { value: LeaveCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export interface LeaveAudit {
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveTypeRecord extends LeaveAudit {
  id: number;
  name: string;
  description: string;
  /** Paid leave deducts entitlement; unpaid does not use balance buckets. */
  isPaid: boolean;
  status: PolicyStatus;
}

export interface LeavePolicyLine {
  leaveTypeId: number;
  leaveTypeName: string;
  /** Per leave type — monthly or yearly credit frequency */
  cycle: LeaveCycle;
  allowedLeaves: number;
  carryForward: number;
}

export interface LeavePolicyRecord extends LeaveAudit {
  id: number;
  name: string;
  description: string;
  /** @deprecated Legacy policy-level cycle — kept for compatibility; use line.cycle */
  cycle: LeaveCycle;
  lines: LeavePolicyLine[];
  status: PolicyStatus;
  isDefault: boolean;
}

const KEYS = {
  leaveTypes: "ds_hr_leave_types_v1",
  leavePolicies: "ds_hr_leave_policies_v1",
  /** employeeCode → leavePolicyId */
  employeePolicy: "ds_hr_employee_leave_policy_v1",
} as const;

const LEAVE_TYPE_SEED: LeaveTypeRecord[] = [
  {
    id: 1,
    name: "Casual Leave",
    description: "General short-term personal leave",
    isPaid: true,
    status: "active",
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 2,
    name: "Sick Leave",
    description: "Leave for illness / medical reasons",
    isPaid: true,
    status: "active",
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 3,
    name: "Optional Leave",
    description: "How many Optional Holiday dates an employee may avail (dates come from Holiday Calendar)",
    isPaid: true,
    status: "active",
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 4,
    name: "Loss of Pay",
    description: "Unpaid leave — no entitlement balance deduction",
    isPaid: false,
    status: "active",
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const LEAVE_POLICY_SEED: LeavePolicyRecord[] = [
  {
    id: 1,
    name: "Standard Leave Policy",
    description: "Default PVB leave entitlement for full-time staff",
    cycle: "yearly",
    lines: [
      {
        leaveTypeId: 1,
        leaveTypeName: "Casual Leave",
        cycle: "monthly",
        allowedLeaves: 1,
        carryForward: 0,
      },
      {
        leaveTypeId: 2,
        leaveTypeName: "Sick Leave",
        cycle: "monthly",
        allowedLeaves: 1,
        carryForward: 0,
      },
      {
        leaveTypeId: 3,
        leaveTypeName: "Optional Leave",
        cycle: "yearly",
        allowedLeaves: 2,
        carryForward: 0,
      },
    ],
    status: "active",
    isDefault: true,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

/** Demo: Aarav Deshmukh → Standard Leave Policy */
const EMPLOYEE_POLICY_SEED: Record<string, number> = {
  "EMP-DEMO-001": 1,
};

function normalizeCycle(raw: unknown, fallback: LeaveCycle = "yearly"): LeaveCycle {
  return raw === "monthly" ? "monthly" : fallback === "monthly" ? "monthly" : "yearly";
}

function normalizeLeavePolicyLine(
  raw: Record<string, unknown>,
  policyCycle: LeaveCycle,
): LeavePolicyLine {
  return {
    leaveTypeId: Number(raw.leaveTypeId) || 0,
    leaveTypeName: String(raw.leaveTypeName ?? ""),
    cycle: normalizeCycle(raw.cycle, policyCycle),
    allowedLeaves: Math.max(0, Number(raw.allowedLeaves) || 0),
    carryForward: Math.max(0, Number(raw.carryForward) || 0),
  };
}

function normalizeLeavePolicy(raw: Record<string, unknown>, index: number): LeavePolicyRecord {
  const legacyCycle = normalizeCycle(raw.cycle);
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  const lines = linesRaw.map((l) =>
    normalizeLeavePolicyLine(l as Record<string, unknown>, legacyCycle),
  );
  const primaryCycle = lines[0]?.cycle ?? legacyCycle;
  return {
    id: Number(raw.id) || index + 1,
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    cycle: primaryCycle,
    lines,
    status: raw.status === "inactive" ? "inactive" : "active",
    isDefault: raw.isDefault === true,
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "2026-01-01",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "2026-01-01",
  };
}

function ensureDefaultLeavePolicy(list: LeavePolicyRecord[]): LeavePolicyRecord[] {
  if (list.length === 0) return list;
  const active = list.filter((p) => p.status === "active");
  if (active.length === 0) return list;
  const defaults = active.filter((p) => p.isDefault);
  if (defaults.length === 1) return list;
  if (defaults.length === 0) {
    const firstActive = active[0]!;
    return list.map((p) => ({ ...p, isDefault: p.id === firstActive.id }));
  }
  const keep = defaults[0]!.id;
  return list.map((p) => ({ ...p, isDefault: p.id === keep }));
}

function stampNewAudit(): LeaveAudit {
  const today = policyToday();
  return {
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: today,
    updatedAt: today,
  };
}

export function withLeaveUpdateAudit<T extends LeaveAudit>(record: T): T {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

export function withLeaveNewAudit<T extends LeaveAudit>(
  partial: Omit<T, keyof LeaveAudit> & Partial<LeaveAudit>,
): T {
  return { ...partial, ...stampNewAudit() } as T;
}

export function nextLeaveId(list: { id: number }[]): number {
  return nextPolicyId(list);
}

export function loadLeaveTypes(): LeaveTypeRecord[] {
  const raw = loadPolicyList(KEYS.leaveTypes, structuredClone(LEAVE_TYPE_SEED));
  let normalized = raw.map((t) => normalizeLeaveType(t as unknown as Record<string, unknown>));
  // Migrate missing isPaid + ensure newer seed types (e.g. Loss of Pay) without wiping customs
  let changed = raw.some((t) => (t as { isPaid?: unknown }).isPaid === undefined);
  for (const seed of LEAVE_TYPE_SEED) {
    if (!normalized.some((t) => t.name.trim().toLowerCase() === seed.name.toLowerCase())) {
      normalized = [...normalized, { ...seed, id: nextLeaveId(normalized) }];
      changed = true;
    }
  }
  if (typeof window !== "undefined" && changed) {
    savePolicyList(KEYS.leaveTypes, normalized);
  }
  return normalized;
}

function normalizeLeaveType(raw: Record<string, unknown>): LeaveTypeRecord {
  return {
    id: Number(raw.id) || 0,
    name: String(raw.name ?? "").trim(),
    description: String(raw.description ?? ""),
    isPaid: raw.isPaid !== false && raw.isPaid !== "false",
    status: raw.status === "inactive" ? "inactive" : "active",
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "2026-01-01",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "2026-01-01",
  };
}

export function saveLeaveTypes(list: LeaveTypeRecord[]): void {
  savePolicyList(KEYS.leaveTypes, list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-leave-types-updated"));
  }
}

export function getActiveLeaveTypes(): LeaveTypeRecord[] {
  return loadLeaveTypes().filter((t) => t.status === "active");
}

export function getActiveLeaveTypeNames(): string[] {
  return getActiveLeaveTypes().map((t) => t.name);
}

export function getLeaveTypeById(id: number): LeaveTypeRecord | undefined {
  return loadLeaveTypes().find((t) => t.id === id);
}

export function getLeaveTypeByName(name: string): LeaveTypeRecord | undefined {
  return loadLeaveTypes().find((t) => t.name === name);
}

export function loadLeavePolicies(): LeavePolicyRecord[] {
  const raw = loadPolicyList(KEYS.leavePolicies, structuredClone(LEAVE_POLICY_SEED));
  return ensureDefaultLeavePolicy(
    raw.map((p, i) => normalizeLeavePolicy(p as unknown as Record<string, unknown>, i)),
  );
}

export function saveLeavePolicies(list: LeavePolicyRecord[]): void {
  const normalized = ensureDefaultLeavePolicy(
    list.map((p) => ({
      ...p,
      cycle: p.lines[0]?.cycle ?? p.cycle,
    })),
  );
  savePolicyList(KEYS.leavePolicies, normalized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hr-leave-policies-updated"));
  }
}

export function getLeavePolicyById(id: number): LeavePolicyRecord | undefined {
  return loadLeavePolicies().find((p) => p.id === id);
}

export function getActiveLeavePolicies(list?: LeavePolicyRecord[]): LeavePolicyRecord[] {
  return (list ?? loadLeavePolicies()).filter((p) => p.status === "active");
}

export function getDefaultLeavePolicy(list?: LeavePolicyRecord[]): LeavePolicyRecord | undefined {
  const policies = list ?? loadLeavePolicies();
  return (
    policies.find((p) => p.isDefault && p.status === "active") ??
    policies.find((p) => p.status === "active")
  );
}

export function applyLeavePolicyDefault(
  list: LeavePolicyRecord[],
  defaultId: number,
): LeavePolicyRecord[] {
  return list.map((p) => ({ ...p, isDefault: p.id === defaultId }));
}

export function getLeavePolicySelectOptions(opts?: {
  includePolicyId?: number | null;
}): { value: number; label: string }[] {
  const all = loadLeavePolicies();
  const active = getActiveLeavePolicies(all);
  const includeId = opts?.includePolicyId;
  const inactiveIncluded =
    includeId != null ? all.find((p) => p.id === includeId && p.status !== "active") : undefined;

  const options = active.map((p) => ({
    value: p.id,
    label: p.isDefault ? `${p.name} (Default)` : p.name,
  }));

  if (inactiveIncluded && !options.some((o) => o.value === inactiveIncluded.id)) {
    options.unshift({
      value: inactiveIncluded.id,
      label: `${inactiveIncluded.name} (Inactive)`,
    });
  }

  return options;
}

export function loadEmployeeLeavePolicyMap(): Record<string, number> {
  if (typeof window === "undefined") return { ...EMPLOYEE_POLICY_SEED };
  try {
    const raw = localStorage.getItem(KEYS.employeePolicy);
    if (!raw) {
      localStorage.setItem(KEYS.employeePolicy, JSON.stringify(EMPLOYEE_POLICY_SEED));
      return { ...EMPLOYEE_POLICY_SEED };
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed["EMP-DEMO-001"]) {
      parsed["EMP-DEMO-001"] = EMPLOYEE_POLICY_SEED["EMP-DEMO-001"];
      localStorage.setItem(KEYS.employeePolicy, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return { ...EMPLOYEE_POLICY_SEED };
  }
}

export function saveEmployeeLeavePolicyMap(map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.employeePolicy, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("hr-employee-leave-policy-updated"));
}

export function getEmployeeLeavePolicyId(employeeCode: string): number | null {
  const map = loadEmployeeLeavePolicyMap();
  return map[employeeCode] ?? null;
}

export function setEmployeeLeavePolicy(employeeCode: string, policyId: number): void {
  const map = loadEmployeeLeavePolicyMap();
  map[employeeCode] = policyId;
  saveEmployeeLeavePolicyMap(map);
}

export function countLeavePoliciesUsingLeaveType(leaveTypeId: number): number {
  return loadLeavePolicies().filter((p) =>
    p.lines.some((l) => l.leaveTypeId === leaveTypeId),
  ).length;
}

export function countEmployeesOnLeavePolicy(policyId: number): number {
  const map = loadEmployeeLeavePolicyMap();
  return Object.values(map).filter((id) => id === policyId).length;
}

export function getAssignedLeavePolicy(employeeCode: string): LeavePolicyRecord | null {
  const explicitId = getEmployeeLeavePolicyId(employeeCode);
  if (explicitId != null) {
    const policy = getLeavePolicyById(explicitId);
    if (policy) return policy;
  }
  return getDefaultLeavePolicy() ?? null;
}

export function resolveEmployeeLeavePolicyId(employeeCode: string): number | null {
  return getAssignedLeavePolicy(employeeCode)?.id ?? null;
}

/** Alias for shared / future mobile consumers — same as getAssignedLeavePolicy. */
export function getEmployeeLeavePolicy(employeeCode: string): LeavePolicyRecord | null {
  return getAssignedLeavePolicy(employeeCode);
}

/**
 * Active leave types available to an employee from their assigned Leave Policy.
 * Optional Leave remains a leave type; optional holiday dates come from Holiday Calendar.
 */
export function getAvailableLeaveTypes(employeeCode: string): LeaveTypeRecord[] {
  const policy = getAssignedLeavePolicy(employeeCode);
  const active = getActiveLeaveTypes();
  if (!policy) return active;
  const ids = new Set(policy.lines.map((l) => l.leaveTypeId));
  const fromPolicy = active.filter((t) => ids.has(t.id));
  return fromPolicy.length > 0 ? fromPolicy : active;
}

export function isLeaveTypePaid(nameOrId: string | number): boolean {
  if (typeof nameOrId === "number") {
    return getLeaveTypeById(nameOrId)?.isPaid !== false;
  }
  return getLeaveTypeByName(nameOrId)?.isPaid !== false;
}

/**
 * Active leave types available for policy configuration.
 * Syncs names from Leave Type master for existing line ids.
 */
export function buildPolicyFormLines(
  existing: LeavePolicyLine[],
  activeTypes: LeaveTypeRecord[],
  legacyPolicyCycle: LeaveCycle = "yearly",
): LeavePolicyLine[] {
  const byId = new Map(existing.map((l) => [l.leaveTypeId, l]));
  return activeTypes.map((t) => {
    const prev = byId.get(t.id);
    return {
      leaveTypeId: t.id,
      leaveTypeName: t.name,
      cycle: prev?.cycle ?? legacyPolicyCycle,
      allowedLeaves: prev?.allowedLeaves ?? 0,
      carryForward: prev?.carryForward ?? 0,
    };
  });
}

/** Keep inactive historical lines when saving, merge with active form lines. */
export function mergePolicyLinesOnSave(
  previous: LeavePolicyLine[],
  formLines: LeavePolicyLine[],
): LeavePolicyLine[] {
  const allTypes = loadLeaveTypes();
  const formIds = new Set(formLines.map((l) => l.leaveTypeId));
  const preserved = previous.filter((l) => {
    if (formIds.has(l.leaveTypeId)) return false;
    const t = allTypes.find((x) => x.id === l.leaveTypeId);
    return !t || t.status !== "active";
  });
  return [...formLines, ...preserved];
}

export function cycleHelperLabels(cycle: LeaveCycle): {
  allowed: string;
  carryForward: string;
} {
  if (cycle === "monthly") {
    return {
      allowed: "leaves per month",
      carryForward: "carried to next month",
    };
  }
  return {
    allowed: "leaves per year",
    carryForward: "carried to next year",
  };
}
