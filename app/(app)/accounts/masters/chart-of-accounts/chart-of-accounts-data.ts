import {
  COA_HIERARCHY_LEVEL_LABELS,
  COA_MAX_HIERARCHY_MESSAGE,
  COA_MAX_HIERARCHY_LEVEL,
} from "@/lib/accounts/coa-hierarchy-constants";
import {
  canUserCreateAtLevel,
  canUserDeleteGroup,
  canUserDeleteNode,
  canUserEditGroup,
  canUserEditNode,
  isStructuralNode as hierarchyIsStructural,
  ledgerHasChildLedgers,
  resolveHierarchyPath,
} from "@/lib/accounts/coa-hierarchy";
import { isMasterLinkedLedger } from "@/lib/accounts/coa-master-link";
import { isGstCoaLedger } from "@/lib/accounts/gst-coa-sync";
import { isTdsCoaLedger } from "@/lib/accounts/tds-coa-sync";
import { resolveCoaAddLedgerPolicy, isSundryDebtorsGroup } from "@/lib/accounts/coa-add-ledger-policy";
import {
  inheritedSpecializedGroupType,
  isTdsGroupContext,
} from "@/lib/accounts/coa-specialized-groups";
import { getCoaDisplayPath, getCoaTreeChildren } from "@/lib/accounts/coa-tree-children";
import { isCoaSidebarLevel3Subgroup } from "@/lib/accounts/coa-sidebar-tree";
import {
  type AccountType,
  type ChartOfAccount,
  type CoaNodeLevel,
  type ErpUsageModule,
  loadChartOfAccounts,
  saveChartOfAccounts,
} from "../../data";
import { isBundledCoaDemoLedger } from "./coa-demo-bundle";
import { SYSTEM_COA_NODES } from "../coa-seed-nodes";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { ledgerHasVoucherPostings as voucherLedgerHasPostings } from "../../vouchers/voucher-data";

export type { ChartOfAccount, AccountType, CoaNodeLevel, ErpUsageModule };
export { loadChartOfAccounts, saveChartOfAccounts };

const COA_MANUAL_LEDGER_PURGE_KEY = "ds_coa_manual_ledger_purge_v3";

/** Whether a ledger was created manually during development/testing (not ERP-synced). */
export function isManualCoaLedger(record: ChartOfAccount): boolean {
  if (record.nodeLevel !== "ledger") return false;
  if (record.isSystem) return false;
  if (isBundledCoaDemoLedger(record)) return false;
  if (record.isSystemGenerated || record.erpSourceModule) return false;
  return true;
}

/**
 * One-time cleanup: remove all manual/test ledgers and keep only the system
 * hierarchy plus ERP-managed ledgers (customer, vendor, bank, GST, TDS).
 */
export function purgeManualCoaLedgersOnce(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(COA_MANUAL_LEDGER_PURGE_KEY)) return false;

  const current = loadChartOfAccounts();
  const cleaned = current.filter((r) => !isManualCoaLedger(r));
  if (cleaned.length !== current.length) {
    saveChartOfAccounts(cleaned);
  }
  localStorage.setItem(COA_MANUAL_LEDGER_PURGE_KEY, "1");
  return cleaned.length !== current.length;
}

/** Restore COA to hard-coded system groups only (no ledgers). */
export function restoreCoaSystemHierarchyOnly(): void {
  const systemOnly = SYSTEM_COA_NODES.map((sys) => ({
    ...sys,
    status: "active" as const,
    isSystem: true,
    openingBalance: 0,
  }));
  saveChartOfAccounts(systemOnly);
}

export const PRIMARY_HEAD_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "Asset", label: "Assets" },
  { value: "Liability", label: "Liabilities" },
  { value: "Income", label: "Income" },
  { value: "Expense", label: "Expenses" },
];

export const NODE_LEVEL_LABELS: Record<CoaNodeLevel, string> = {
  primary_head: "Primary Head",
  account_group: "Standard Group",
  ledger: "Ledger",
};

export interface LedgerFormValues {
  ledgerName: string;
  alias: string;
  description: string;
  parentGroupId: number | null;
  openingBalance: string;
  balanceType: "Debit" | "Credit";
  gstApplicable: boolean;
  tdsApplicable: boolean;
  costCenterApplicable: boolean;
  bankAccountFlag: boolean;
  bankGroupFlag?: boolean;
  status: "active" | "inactive";
}

export const DEFAULT_LEDGER_FORM: LedgerFormValues = {
  ledgerName: "",
  alias: "",
  description: "",
  parentGroupId: null,
  openingBalance: "0",
  balanceType: "Debit",
  gstApplicable: false,
  tdsApplicable: false,
  costCenterApplicable: false,
  bankAccountFlag: false,
  status: "active",
};

export interface GroupFormValues {
  groupName: string;
  description: string;
  parentGroupId: number | null;
  status: "active" | "inactive";
}

export const DEFAULT_GROUP_FORM: GroupFormValues = {
  groupName: "",
  description: "",
  parentGroupId: null,
  status: "active",
};

export function accountTypeToPrimaryLabel(type: AccountType): string {
  return PRIMARY_HEAD_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function resolveParentName(
  records: ChartOfAccount[],
  parentId: number | null,
): string {
  if (!parentId) return "";
  return records.find((r) => r.id === parentId)?.accountName ?? "";
}

export function getAncestorPath(
  records: ChartOfAccount[],
  nodeId: number,
): ChartOfAccount[] {
  const byId = coaIdMap(records);
  const path: ChartOfAccount[] = [];
  const visited = new Set<number>();
  let current = byId.get(nodeId);
  while (current) {
    if (visited.has(current.id)) {
      // #region agent log
      if (typeof window !== "undefined") {
        fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "179db4" },
          body: JSON.stringify({
            sessionId: "179db4",
            runId: "tb-oom",
            hypothesisId: "H1",
            location: "chart-of-accounts-data.ts:getAncestorPath",
            message: "COA parent cycle detected",
            data: { nodeId, cycleAt: current.id, pathLength: path.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      break;
    }
    visited.add(current.id);
    path.unshift(current);
    if (path.length > COA_MAX_HIERARCHY_LEVEL + 2) break;
    current =
      current.parentAccountId != null ? byId.get(current.parentAccountId) : undefined;
  }
  return path;
}

/** 1-based hierarchy depth for a node (path length from root). */
export function getCoaHierarchyLevel(
  records: ChartOfAccount[],
  nodeId: number,
): number {
  return getAncestorPath(records, nodeId).length;
}

export function getCoaHierarchyLevelForNode(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): number {
  return getCoaHierarchyLevel(records, node.id);
}

export function getCoaHierarchyLevelLabel(level: number): string {
  return COA_HIERARCHY_LEVEL_LABELS[level] ?? `Level ${level}`;
}

/** True when the node sits at Level 5 — no further children may be created. */
export function isAtCoaMaxHierarchyLevel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return getCoaHierarchyLevelForNode(node, records) >= COA_MAX_HIERARCHY_LEVEL;
}

/** Show the max-depth notice when creation actions are blocked by hierarchy depth. */
export function showCoaMaxHierarchyMessage(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return isAtCoaMaxHierarchyLevel(node, records);
}

let coaPathMapCache: { key: string; map: Map<number, ChartOfAccount> } | null = null;

function coaIdMap(records: ChartOfAccount[]): Map<number, ChartOfAccount> {
  const key = `${records.length}:${records[0]?.id ?? 0}:${records[records.length - 1]?.id ?? 0}`;
  if (coaPathMapCache?.key === key) return coaPathMapCache.map;
  const map = new Map(records.map((r) => [r.id, r]));
  coaPathMapCache = { key, map };
  return map;
}

export function invalidateCoaPathCache(): void {
  coaPathMapCache = null;
}

export function getDirectChildren(
  records: ChartOfAccount[],
  parentId: number,
): ChartOfAccount[] {
  const order: Record<CoaNodeLevel, number> = {
    primary_head: 0,
    account_group: 1,
    ledger: 2,
  };
  return records
    .filter((r) => r.parentAccountId === parentId)
    .sort((a, b) => {
      const lo = order[a.nodeLevel] - order[b.nodeLevel];
      if (lo !== 0) return lo;
      return a.accountName.localeCompare(b.accountName);
    });
}

export function getChildGroups(records: ChartOfAccount[], nodeId: number): ChartOfAccount[] {
  return getDirectChildren(records, nodeId).filter((c) => c.nodeLevel !== "ledger");
}

export function getChildLedgers(records: ChartOfAccount[], nodeId: number): ChartOfAccount[] {
  return getDirectChildren(records, nodeId).filter((c) => c.nodeLevel === "ledger");
}

export function hasChildAccountGroups(records: ChartOfAccount[], nodeId: number): boolean {
  return records.some((r) => r.parentAccountId === nodeId && r.nodeLevel === "account_group");
}

export function hasChildLedgers(records: ChartOfAccount[], nodeId: number): boolean {
  return records.some((r) => r.parentAccountId === nodeId && r.nodeLevel === "ledger");
}

/** @deprecated Use hasChildAccountGroups */
export function hasSubGroups(records: ChartOfAccount[], nodeId: number): boolean {
  return hasChildAccountGroups(records, nodeId);
}

/** @deprecated Use hasChildAccountGroups */
export function hasChildSubGroups(records: ChartOfAccount[], nodeId: number): boolean {
  return hasChildAccountGroups(records, nodeId);
}

/** Parent groups where users may manually create ledgers from Chart of Accounts */
export const COA_MANUAL_LEDGER_PARENT_NAMES = new Set([
  "Bank Accounts",
  "Trade Receivables / Sundry Debtors",
  "Trade Payables / Sundry Creditors",
  "Sales",
  "Purchases",
  "Administrative Expenses",
  "Employee Costs",
  "Finance Costs",
  "Miscellaneous Expenses",
]);

const COA_PROTECTED_PRIMARY_HEADS = new Set([
  "Assets",
  "Liabilities",
  "Income",
  "Expenses",
]);

export function isManualLedgerCreationParent(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  const pathNames = [
    ...getAncestorPath(records, node.id).map((p) => p.accountName),
    node.accountName,
  ];
  if (pathNames.some((n) => COA_PROTECTED_PRIMARY_HEADS.has(n)) && pathNames.length <= 1) {
    return false;
  }
  return pathNames.some((n) => COA_MANUAL_LEDGER_PARENT_NAMES.has(n));
}

/** Leaf account group — no nested child groups; ledgers attach here */
export function isAccountingGroupNode(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (node.nodeLevel !== "account_group") return false;
  return !hasChildAccountGroups(records, node.id);
}

/**
 * Sub-groups (L3) may be created under Primary Head (L1) or Account Group (L2) only.
 * Deeper nesting is blocked to preserve the 5-level hierarchy.
 */
export function canAddSubGroupUnder(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (node.nodeLevel === "ledger") return false;
  if (node.nodeLevel !== "primary_head" && node.nodeLevel !== "account_group") return false;
  if (resolveCoaAddLedgerPolicy(node, records).blocked) return false;
  const level = getCoaHierarchyLevel(records, node.id);
  return level <= 2;
}

/**
 * Ledgers attach only to Level 3 subgroups (leaf groups or duties-style container parents).
 */
export function canAddLedgerUnder(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (node.nodeLevel !== "account_group") return false;
  return isCoaSidebarLevel3Subgroup(node, records);
}

export const LEDGER_UNDER_LEDGER_ERROR =
  "Sub-ledgers can only be created under a Level 4 ledger (maximum one ledger tier below).";

/** User-facing reason when a node cannot accept a new ledger child. */
export function describeInvalidLedgerParentMessage(
  parent: ChartOfAccount,
  records: ChartOfAccount[],
): string {
  if (parent.nodeLevel === "primary_head") {
    return "Ledgers cannot be created under a Primary Head (e.g. Assets). Add a Sub-Group under this head first, then create the ledger under that group.";
  }
  if (getCoaHierarchyLevel(records, parent.id) >= COA_MAX_HIERARCHY_LEVEL) {
    return COA_MAX_HIERARCHY_MESSAGE;
  }
  if (parent.nodeLevel === "account_group" && hasChildAccountGroups(records, parent.id)) {
    return "Select a leaf sub-group before adding a ledger.";
  }
  if (parent.nodeLevel === "ledger") {
    return LEDGER_UNDER_LEDGER_ERROR;
  }
  return "Ledgers must be created under a sub-group (Level 3) or grouping ledger (Level 4).";
}

export { COA_MAX_HIERARCHY_MESSAGE } from "@/lib/accounts/coa-hierarchy-constants";

export function countChildGroups(records: ChartOfAccount[], nodeId: number): number {
  return getChildGroups(records, nodeId).length;
}

export function getValidSubGroupParents(records: ChartOfAccount[]): ChartOfAccount[] {
  return records
    .filter((r) => canAddSubGroupUnder(r, records))
    .sort((a, b) => {
      const pathA = getAncestorPath(records, a.id).map((n) => n.accountCode).join("/");
      const pathB = getAncestorPath(records, b.id).map((n) => n.accountCode).join("/");
      return pathA.localeCompare(pathB);
    });
}

export function buildSubGroupParentOptions(records: ChartOfAccount[]): LedgerParentOption[] {
  return getValidSubGroupParents(records).map((node) => {
    const path = getAncestorPath(records, node.id);
    const names = path.map((n) => n.accountName);
    const codes = path.map((n) => n.accountCode);
    return {
      id: node.id,
      node,
      path,
      breadcrumb: names.join(" › "),
      searchText: [...names, ...codes].join(" ").toLowerCase(),
    };
  });
}

export function getValidLedgerParents(records: ChartOfAccount[]): ChartOfAccount[] {
  return records
    .filter((r) => canAddLedgerUnder(r, records))
    .sort((a, b) => {
      const pathA = getAncestorPath(records, a.id).map((n) => n.accountCode).join("/");
      const pathB = getAncestorPath(records, b.id).map((n) => n.accountCode).join("/");
      return pathA.localeCompare(pathB);
    });
}

export interface LedgerParentOption {
  id: number;
  node: ChartOfAccount;
  path: ChartOfAccount[];
  breadcrumb: string;
  searchText: string;
}

/** Pre-indexed valid ledger parents for fast combobox search */
export function buildLedgerParentOptions(records: ChartOfAccount[]): LedgerParentOption[] {
  return getValidLedgerParents(records).map((node) => {
    const path = getAncestorPath(records, node.id);
    const names = path.map((n) => n.accountName);
    const codes = path.map((n) => n.accountCode);
    return {
      id: node.id,
      node,
      path,
      breadcrumb: names.join(" › "),
      searchText: [...names, ...codes].join(" ").toLowerCase(),
    };
  });
}

export function searchLedgerParentOptions(
  options: LedgerParentOption[],
  query: string,
  limit = 50,
): LedgerParentOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const tokens = q.split(/\s+/).filter(Boolean);
  return options
    .filter((o) => tokens.every((t) => o.searchText.includes(t)))
    .slice(0, limit);
}

export interface LedgerParentHeadSection {
  headName: string;
  groups: Array<{
    groupName: string;
    items: LedgerParentOption[];
  }>;
}

/** Group valid ledger parents by Primary Head → Account Group for hierarchical pickers */
export function groupLedgerParentOptionsByHead(
  options: LedgerParentOption[],
): LedgerParentHeadSection[] {
  const headMap = new Map<string, Map<string, LedgerParentOption[]>>();

  for (const opt of options) {
    const head = opt.path.find((p) => p.nodeLevel === "primary_head");
    const accountGroup = opt.path.find((p) => p.nodeLevel === "account_group");
    if (!head || !accountGroup) continue;

    if (!headMap.has(head.accountName)) headMap.set(head.accountName, new Map());
    const groupMap = headMap.get(head.accountName)!;
    if (!groupMap.has(accountGroup.accountName)) {
      groupMap.set(accountGroup.accountName, []);
    }
    groupMap.get(accountGroup.accountName)!.push(opt);
  }

  return Array.from(headMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([headName, groupMap]) => ({
      headName,
      groups: Array.from(groupMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([groupName, items]) => ({
          groupName,
          items: items.sort((a, b) =>
            a.node.accountName.localeCompare(b.node.accountName),
          ),
        })),
    }));
}

export function parentGroupLabel(records: ChartOfAccount[], parentId: number): string {
  return getAncestorPath(records, parentId)
    .map((n) => n.accountName)
    .join(" › ");
}

export function generateLedgerCode(records: ChartOfAccount[]): string {
  const nums = records
    .filter((r) => r.nodeLevel === "ledger")
    .map((r) => {
      const m = r.accountCode.match(/LED-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `LED-${String(next).padStart(3, "0")}`;
}

export function generateGroupCode(records: ChartOfAccount[], parentId: number): string {
  const parent = records.find((r) => r.id === parentId);
  const prefix = parent?.accountCode?.replace(/\s+/g, "") ?? "GRP";
  const siblings = records.filter(
    (r) => r.parentAccountId === parentId && r.nodeLevel === "account_group",
  );
  const nums = siblings
    .map((r) => {
      const m = r.accountCode.match(/-UG(\d+)$/i);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}-UG${String(next).padStart(2, "0")}`;
}

/** Accounting nature inherited from the root primary head — read-only in forms */
export function resolveInheritedAccountType(
  records: ChartOfAccount[],
  parentGroupId: number | null,
): AccountType {
  if (parentGroupId == null) return "Asset";
  const { primaryHead } = resolveHierarchyPath(records, parentGroupId);
  return primaryHead?.accountType ?? records.find((r) => r.id === parentGroupId)?.accountType ?? "Asset";
}

export function groupToForm(record: ChartOfAccount): GroupFormValues {
  return {
    groupName: record.accountName,
    description: record.description ?? "",
    parentGroupId: record.parentAccountId,
    status: record.status,
  };
}

export function formToGroup(
  form: GroupFormValues,
  id: number,
  accountCode: string,
  records: ChartOfAccount[],
  existing?: ChartOfAccount,
): ChartOfAccount {
  const parent = records.find((r) => r.id === form.parentGroupId);
  const parentName = parent?.accountName ?? "";
  const accountType = resolveInheritedAccountType(records, form.parentGroupId);
  const specializedGroupType =
    existing?.specializedGroupType ??
    inheritedSpecializedGroupType(records, form.parentGroupId);
  return {
    id,
    accountCode: existing?.accountCode ?? accountCode,
    accountName: form.groupName.trim(),
    alias: existing?.alias ?? "",
    accountType,
    nodeLevel: "account_group",
    parentAccountId: form.parentGroupId,
    parentAccount: parentName,
    description: form.description.trim(),
    status: form.status,
    usedIn: existing?.usedIn ?? [],
    isSystem: false,
    openingBalance: 0,
    balanceType: parent?.balanceType ?? existing?.balanceType ?? "Debit",
    gstApplicable: false,
    tdsApplicable: specializedGroupType === "tds_payable" || specializedGroupType === "tds_receivable",
    costCenterApplicable: false,
    bankAccountFlag: false,
    specializedGroupType,
    createdBy: existing?.createdBy ?? ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
}

export function validateGroupForm(
  form: GroupFormValues,
  records: ChartOfAccount[],
  editingId?: number,
): string | null {
  if (!form.groupName.trim()) return "Sub-group name is required.";
  if (!form.parentGroupId) return "Please select a Parent Group.";
  const parent = records.find((r) => r.id === form.parentGroupId);
  if (!parent) return "Please select a valid Parent Group.";
  if (!canAddSubGroupUnder(parent, records)) {
    if (getCoaHierarchyLevel(records, parent.id) >= 3) {
      return COA_MAX_HIERARCHY_MESSAGE;
    }
    return "Sub-groups can only be created under a primary head or account group.";
  }
  if (parent.nodeLevel === "ledger") {
    return "Sub-groups cannot be created under a ledger.";
  }
  const dup = records.find(
    (r) =>
      r.id !== editingId &&
      r.nodeLevel === "account_group" &&
      r.parentAccountId === form.parentGroupId &&
      r.accountName.toLowerCase() === form.groupName.trim().toLowerCase(),
  );
  if (dup) return "A sub-group with this name already exists under this parent.";
  return null;
}

export function canEditGroup(record: ChartOfAccount): boolean {
  return canUserEditGroup(record);
}

export function canDeleteGroup(record: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  const list = records ?? loadChartOfAccounts();
  return canUserDeleteGroup(record, list);
}

export function ledgerToForm(record: ChartOfAccount): LedgerFormValues {
  return {
    ledgerName: record.accountName,
    alias: record.alias ?? "",
    description: record.description ?? "",
    parentGroupId: record.parentAccountId,
    openingBalance: String(record.openingBalance),
    balanceType: record.balanceType,
    gstApplicable: record.gstApplicable,
    tdsApplicable: record.tdsApplicable,
    costCenterApplicable: record.costCenterApplicable ?? false,
    bankAccountFlag: record.bankAccountFlag ?? false,
    status: record.status,
  };
}

export function formToLedger(
  form: LedgerFormValues,
  id: number,
  accountCode: string,
  records: ChartOfAccount[],
  existing?: ChartOfAccount,
): ChartOfAccount {
  const parent = records.find((r) => r.id === form.parentGroupId);
  const parentName = parent?.accountName ?? "";
  const opening = Number(form.openingBalance) || 0;
  return {
    id,
    accountCode: existing?.accountCode ?? accountCode,
    accountName: form.ledgerName.trim(),
    alias: form.alias.trim(),
    accountType:
      form.parentGroupId != null
        ? resolveInheritedAccountType(records, form.parentGroupId)
        : existing?.accountType ?? "Asset",
    nodeLevel: "ledger",
    parentAccountId: form.parentGroupId,
    parentAccount: parentName,
    description: form.description.trim() || existing?.description || "",
    status: form.status,
    usedIn: existing?.usedIn ?? [],
    isSystem: false,
    openingBalance: opening,
    balanceType: form.balanceType,
    gstApplicable: form.gstApplicable,
    tdsApplicable: form.tdsApplicable,
    costCenterApplicable: form.costCenterApplicable,
    bankAccountFlag: form.bankAccountFlag,
    createdBy: existing?.createdBy ?? ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
}

export function validateLedgerForm(
  form: LedgerFormValues,
  records: ChartOfAccount[],
  editingId?: number,
): string | null {
  if (!form.ledgerName.trim()) return "Ledger name is required.";
  if (!form.parentGroupId) return "Please select a Parent Group.";
  const parent = records.find((r) => r.id === form.parentGroupId);
  if (!parent) return "Please select a valid Parent Group.";
  if (!canAddLedgerUnder(parent, records)) {
    if (getCoaHierarchyLevel(records, parent.id) >= COA_MAX_HIERARCHY_LEVEL) {
      return COA_MAX_HIERARCHY_MESSAGE;
    }
    if (parent.nodeLevel === "ledger") {
      return LEDGER_UNDER_LEDGER_ERROR;
    }
    return "Ledgers must be created under a sub-group or leaf account group.";
  }
  if (isSundryDebtorsGroup(parent, records)) {
    return "Customer ledgers under Sundry Debtors must be created with the Customer form.";
  }
  if (isTdsGroupContext(parent, records)) {
    return "TDS section ledgers must be created with the TDS ledger form.";
  }
  const addPolicy = resolveCoaAddLedgerPolicy(parent, records);
  if (addPolicy.blocked) {
    return addPolicy.reason ?? "Manual ledger creation is not allowed under this group.";
  }
  const dup = records.find(
    (r) =>
      r.id !== editingId &&
      r.nodeLevel === "ledger" &&
      r.parentAccountId === form.parentGroupId &&
      r.accountName.toLowerCase() === form.ledgerName.trim().toLowerCase(),
  );
  if (dup) return "A ledger with this name already exists under this parent.";
  return null;
}

export function ledgerHasVoucherPostings(ledgerId: number): boolean {
  return voucherLedgerHasPostings(ledgerId);
}

export function canDeleteLedger(record: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  const list = records ?? loadChartOfAccounts();
  if (isGstCoaLedger(record) || isTdsCoaLedger(record)) return false;
  if (isMasterLinkedLedger(record)) return false;
  if (!canUserDeleteNode(record, list)) return false;
  if (ledgerHasChildLedgers(record.id, list)) return false;
  if (ledgerHasVoucherPostings(record.id)) return false;
  return true;
}

export function canEditLedger(record: ChartOfAccount): boolean {
  if (isGstCoaLedger(record) || isTdsCoaLedger(record)) return false;
  if (isMasterLinkedLedger(record)) return false;
  return canUserEditNode(record);
}

export function isStructuralNode(record: ChartOfAccount): boolean {
  return hierarchyIsStructural(record);
}

export function canCreateCoaNodeAtLevel(level: CoaNodeLevel): boolean {
  return canUserCreateAtLevel(level);
}

export function getAllExpandableIds(records: ChartOfAccount[]): number[] {
  return records
    .filter(
      (r) =>
        !r.bankGroupFlag &&
        (r.nodeLevel !== "ledger" || ledgerHasChildLedgers(r.id, records)),
    )
    .map((r) => r.id);
}

export function countLedgersUnder(records: ChartOfAccount[], nodeId: number): number {
  return getDirectChildren(records, nodeId).reduce(
    (sum, c) =>
      sum + (c.nodeLevel === "ledger" ? 1 : countLedgersUnder(records, c.id)),
    0,
  );
}

export function defaultBalanceTypeForParent(
  records: ChartOfAccount[],
  parentId: number | null,
): "Debit" | "Credit" {
  const parent = parentId ? records.find((r) => r.id === parentId) : null;
  if (!parent) return "Debit";
  if (parent.accountType === "Liability" || parent.accountType === "Income") return "Credit";
  return "Debit";
}

export function nodeMatchesSearch(
  records: ChartOfAccount[],
  node: ChartOfAccount,
  query: string,
): boolean {
  const q = query.toLowerCase();
  if (node.accountName.toLowerCase().includes(q)) return true;
  if (node.accountCode.toLowerCase().includes(q)) return true;
  if (node.alias?.toLowerCase().includes(q)) return true;
  return getAncestorPath(records, node.id).some((a) =>
    a.accountName.toLowerCase().includes(q),
  );
}

/** All COA nodes that match the search query (global, same dataset as tree search). */
export function getSearchMatchingNodes(
  records: ChartOfAccount[],
  query: string,
): ChartOfAccount[] {
  const q = query.trim();
  if (!q) return [];

  return records
    .filter((n) => nodeMatchesSearch(records, n, q))
    .sort((a, b) => {
      const pathA = getAncestorPath(records, a.id)
        .map((n) => n.accountCode)
        .join("/");
      const pathB = getAncestorPath(records, b.id)
        .map((n) => n.accountCode)
        .join("/");
      const cmp = pathA.localeCompare(pathB);
      if (cmp !== 0) return cmp;
      return a.accountName.localeCompare(b.accountName);
    });
}

/** Parent node to focus in the tree when search results span a branch. */
export function resolveSearchFocusNode(
  records: ChartOfAccount[],
  matching: ChartOfAccount[],
): ChartOfAccount | null {
  if (matching.length === 0) return null;

  const ledgers = matching.filter((n) => n.nodeLevel === "ledger");
  if (ledgers.length > 0) {
    const parentIds = new Set(
      ledgers.map((l) => l.parentAccountId).filter((id): id is number => id != null),
    );
    if (parentIds.size === 1) {
      const parentId = [...parentIds][0]!;
      return records.find((r) => r.id === parentId) ?? ledgers[0];
    }
    const first = ledgers[0];
    const parent = first.parentAccountId
      ? records.find((r) => r.id === first.parentAccountId)
      : null;
    return parent ?? first;
  }

  return matching.reduce((deepest, node) => {
    const depth = getAncestorPath(records, node.id).length;
    const deepestDepth = deepest ? getAncestorPath(records, deepest.id).length : 0;
    return depth >= deepestDepth ? node : deepest;
  }, matching[0]);
}

export function formatCoaHierarchyPath(
  records: ChartOfAccount[],
  nodeId: number,
): string {
  return getAncestorPath(records, nodeId)
    .map((n) => n.accountName)
    .join(" → ");
}

export function getSearchVisibleIds(
  records: ChartOfAccount[],
  query: string,
): Set<number> {
  const visible = new Set<number>();
  if (!query.trim()) return visible;

  const matching = getSearchMatchingNodes(records, query);
  for (const node of matching) {
    getCoaDisplayPath(records, node.id).forEach((a) => visible.add(a.id));
    const collectDesc = (id: number) => {
      getCoaTreeChildren(records, id).forEach((c) => {
        visible.add(c.id);
        if (c.nodeLevel !== "ledger" || ledgerHasChildLedgers(c.id, records)) {
          collectDesc(c.id);
        }
      });
    };
    collectDesc(node.id);
  }
  return visible;
}

/** Full COA tree children for parent-group picker (groups + ledgers; ledgers are display-only). */
export function getParentGroupTreeChildren(
  records: ChartOfAccount[],
  parentId: number,
): ChartOfAccount[] {
  return getCoaTreeChildren(records, parentId);
}

export function parentGroupNodeHasChildren(
  records: ChartOfAccount[],
  parentId: number,
): boolean {
  const parent = records.find((r) => r.id === parentId);
  if (!parent) return false;
  return getParentGroupTreeChildren(records, parentId).length > 0;
}

/** Search visibility for parent-group tree — same as COA sidebar (includes ledgers). */
export function getParentGroupSearchVisibleIds(
  records: ChartOfAccount[],
  query: string,
): Set<number> {
  return getSearchVisibleIds(records, query);
}
