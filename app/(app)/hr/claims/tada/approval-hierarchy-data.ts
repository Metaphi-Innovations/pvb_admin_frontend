import { CURRENT_USER } from "@/lib/hr/config";
import { loadHrEmployees } from "../../employees/employee-master-data";

/** Configurable sales / field hierarchy codes */
export const DEFAULT_LEVEL_CODES = ["TM", "ASM", "RSM", "KAM", "ZSM", "SPM", "NSM"] as const;

export type HierarchyLevelCode = (typeof DEFAULT_LEVEL_CODES)[number] | string;

export interface ApprovalHierarchyLevel {
  id: number;
  code: HierarchyLevelCode;
  label: string;
  sortOrder: number;
  /** Designations that can act as approver at this level */
  approverDesignations: string[];
  /** Optional explicit employee IDs as approvers */
  approverEmployeeIds: number[];
  active: boolean;
}

export interface AmountApprovalRule {
  id: number;
  minAmount: number;
  maxAmount: number | null;
  /** Level codes required in order (subset of full hierarchy) */
  requiredLevelCodes: HierarchyLevelCode[];
  active: boolean;
}

export interface ClaimApprovalHierarchyConfig {
  levels: ApprovalHierarchyLevel[];
  amountRules: AmountApprovalRule[];
  useReportingManagerFirst: boolean;
  allowPartialApproval: boolean;
  updatedBy: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_hr_tada_approval_hierarchy_v1";

const DEFAULT_CONFIG: ClaimApprovalHierarchyConfig = {
  useReportingManagerFirst: true,
  allowPartialApproval: true,
  updatedBy: CURRENT_USER,
  updatedAt: new Date().toISOString(),
  levels: [
    { id: 1, code: "TM", label: "Territory Manager", sortOrder: 1, approverDesignations: ["Territory Manager", "Territory Manager (TM)"], approverEmployeeIds: [], active: true },
    { id: 2, code: "ASM", label: "Area Sales Manager", sortOrder: 2, approverDesignations: ["Area Sales Manager", "Area Sales Manager (ASM)"], approverEmployeeIds: [], active: true },
    { id: 3, code: "RSM", label: "Regional Sales Manager", sortOrder: 3, approverDesignations: ["Regional Sales Manager", "Regional Sales Manager / State Head", "RSM"], approverEmployeeIds: [], active: true },
    { id: 4, code: "KAM", label: "Key Account Manager", sortOrder: 4, approverDesignations: ["Key Account Manager", "KAM"], approverEmployeeIds: [], active: true },
    { id: 5, code: "ZSM", label: "Zonal Sales Manager", sortOrder: 5, approverDesignations: ["Zonal Sales Manager", "ZSM"], approverEmployeeIds: [], active: true },
    { id: 6, code: "SPM", label: "State Product Manager", sortOrder: 6, approverDesignations: ["State Product Manager", "SPM"], approverEmployeeIds: [], active: true },
    { id: 7, code: "NSM", label: "National Sales Manager", sortOrder: 7, approverDesignations: ["National Sales Manager", "NSM"], approverEmployeeIds: [], active: true },
  ],
  amountRules: [
    { id: 1, minAmount: 0, maxAmount: 5000, requiredLevelCodes: ["TM", "ASM"], active: true },
    { id: 2, minAmount: 5001, maxAmount: 25000, requiredLevelCodes: ["TM", "ASM", "RSM"], active: true },
    { id: 3, minAmount: 25001, maxAmount: null, requiredLevelCodes: ["TM", "ASM", "RSM", "NSM"], active: true },
  ],
};

export function loadApprovalHierarchy(): ClaimApprovalHierarchyConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    return JSON.parse(raw) as ClaimApprovalHierarchyConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveApprovalHierarchy(config: ClaimApprovalHierarchyConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...config, updatedBy: CURRENT_USER, updatedAt: new Date().toISOString() }),
  );
}

export function getActiveLevels(config = loadApprovalHierarchy()): ApprovalHierarchyLevel[] {
  return [...config.levels].filter((l) => l.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Resolve required approval chain for a claim amount */
export function resolveRequiredLevels(
  claimAmount: number,
  config = loadApprovalHierarchy(),
): ApprovalHierarchyLevel[] {
  const active = getActiveLevels(config);
  const rule =
    config.amountRules
      .filter((r) => r.active)
      .find(
        (r) =>
          claimAmount >= r.minAmount &&
          (r.maxAmount == null || claimAmount <= r.maxAmount),
      ) ?? config.amountRules.find((r) => r.active);

  if (!rule?.requiredLevelCodes?.length) return active;

  const codeSet = new Set(rule.requiredLevelCodes);
  return active.filter((l) => codeSet.has(l.code));
}

export function getLevelByCode(
  code: string,
  config = loadApprovalHierarchy(),
): ApprovalHierarchyLevel | undefined {
  return config.levels.find((l) => l.code === code);
}

export function canUserApproveLevel(
  level: ApprovalHierarchyLevel,
  actorDesignation = CURRENT_USER,
  actorEmployeeId?: number,
): boolean {
  if (actorEmployeeId && level.approverEmployeeIds.includes(actorEmployeeId)) return true;
  const des = actorDesignation.toLowerCase();
  return level.approverDesignations.some((d) => des.includes(d.toLowerCase()) || d.toLowerCase().includes(des));
}

/** Web admin can approve any level in demo; mobile would pass actual user */
export function resolveApproverForLevel(level: ApprovalHierarchyLevel): {
  name: string;
  role: string;
} {
  if (level.approverEmployeeIds.length) {
    const emp = loadHrEmployees().find((e) => level.approverEmployeeIds.includes(e.id));
    if (emp) return { name: emp.employeeName, role: level.label };
  }
  return { name: CURRENT_USER, role: level.label };
}

export function nextPolicyId<T extends { id: number }>(rows: T[]): number {
  return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
}
