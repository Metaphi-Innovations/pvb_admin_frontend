import { CURRENT_USER } from "@/lib/hr/config";
import { loadHrEmployees } from "../../employees/employee-master-data";
import {
  getRolePolicyMapping,
  getRoleDisplayName,
  loadApprovalRules,
  resolveApprovalRoute,
} from "../../sales-force-policy/tada-policy-data";

export const DEFAULT_LEVEL_CODES = ["RM", "HSR", "HR", "ACC"] as const;
export type HierarchyLevelCode = (typeof DEFAULT_LEVEL_CODES)[number] | string;

export interface ApprovalHierarchyLevel {
  id: number;
  code: HierarchyLevelCode;
  label: string;
  sortOrder: number;
  approverDesignations: string[];
  approverEmployeeIds: number[];
  active: boolean;
}

export interface AmountApprovalRule {
  id: number;
  minAmount: number;
  maxAmount: number | null;
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

const LEVEL_MAP: Record<string, string> = {
  "Reporting Manager": "RM",
  "Higher Sales Role": "HSR",
  HR: "HR",
  Accounts: "ACC",
};

const DEFAULT_CONFIG: ClaimApprovalHierarchyConfig = {
  useReportingManagerFirst: true,
  allowPartialApproval: true,
  updatedBy: CURRENT_USER,
  updatedAt: new Date().toISOString(),
  levels: [
    { id: 1, code: "RM", label: "Reporting Manager", sortOrder: 1, approverDesignations: ["Area Sales Manager", "Territory Manager"], approverEmployeeIds: [], active: true },
    { id: 2, code: "HSR", label: "Higher Sales Role", sortOrder: 2, approverDesignations: ["Regional Sales Manager", "Zonal Sales Manager"], approverEmployeeIds: [], active: true },
    { id: 3, code: "HR", label: "HR", sortOrder: 3, approverDesignations: ["HR"], approverEmployeeIds: [], active: true },
    { id: 4, code: "ACC", label: "Accounts", sortOrder: 4, approverDesignations: ["Accounts"], approverEmployeeIds: [], active: true },
  ],
  amountRules: [
    { id: 1, minAmount: 0, maxAmount: 5000, requiredLevelCodes: ["RM"], active: true },
    { id: 2, minAmount: 5001, maxAmount: 20000, requiredLevelCodes: ["RM", "HSR"], active: true },
    { id: 3, minAmount: 20001, maxAmount: null, requiredLevelCodes: ["RM", "HSR", "HR", "ACC"], active: true },
  ],
};

export function loadApprovalHierarchy(): ClaimApprovalHierarchyConfig {
  const rules = loadApprovalRules().filter((r) => r.status === "active");
  if (!rules.length) return DEFAULT_CONFIG;
  const rule = rules[0];
  const levels: ApprovalHierarchyLevel[] = [rule.approvalLevel1, rule.approvalLevel2, rule.approvalLevel3, rule.approvalLevel4]
    .filter(Boolean)
    .map((label, i) => ({
      id: i + 1,
      code: LEVEL_MAP[label] ?? label.slice(0, 3).toUpperCase(),
      label,
      sortOrder: i + 1,
      approverDesignations: [label],
      approverEmployeeIds: [],
      active: true,
    }));
  return { ...DEFAULT_CONFIG, levels: levels.length ? levels : DEFAULT_CONFIG.levels };
}

export function saveApprovalHierarchy(_config: ClaimApprovalHierarchyConfig): void {}

export function getActiveLevels(config = loadApprovalHierarchy()): ApprovalHierarchyLevel[] {
  return [...config.levels].filter((l) => l.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveRequiredLevels(claimAmount: number, config = loadApprovalHierarchy()): ApprovalHierarchyLevel[] {
  const rule = config.amountRules.find(
    (r) => r.active && claimAmount >= r.minAmount && (r.maxAmount == null || claimAmount <= r.maxAmount),
  );
  const codes = new Set(rule?.requiredLevelCodes ?? config.amountRules[0]?.requiredLevelCodes);
  return getActiveLevels(config).filter((l) => codes.has(l.code));
}

export function getLevelByCode(code: string, config = loadApprovalHierarchy()): ApprovalHierarchyLevel | undefined {
  return config.levels.find((l) => l.code === code);
}

export function canUserApproveLevel(level: ApprovalHierarchyLevel, actorDesignation = CURRENT_USER): boolean {
  const des = actorDesignation.toLowerCase();
  return level.approverDesignations.some((d) => des.includes(d.toLowerCase()));
}

export function resolveApproverForLevel(level: ApprovalHierarchyLevel): { name: string; role: string } {
  return { name: CURRENT_USER, role: level.label };
}

export function nextPolicyId<T extends { id: number }>(rows: T[]): number {
  return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
}

export function resolveClaimApprovalRoute(roleId: number, amount: number): string[] {
  return resolveApprovalRoute(roleId, amount);
}

export function getReportingManagerLabel(roleId: number): string {
  const m = getRolePolicyMapping(roleId);
  return m?.reportingRoleId ? getRoleDisplayName(m.reportingRoleId) : "Reporting Manager";
}
