import {
  canUserCreateAtLevel,
  canUserDeleteNode,
  canUserEditNode,
  isGroupingLedger,
  isPostingLedger,
  isStructuralNode as hierarchyIsStructural,
  ledgerHasChildLedgers,
} from "@/lib/accounts/coa-hierarchy";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import { isMasterLinkedLedger } from "@/lib/accounts/coa-master-link";
import {
  type AccountType,
  type ChartOfAccount,
  type CoaNodeLevel,
  type ErpUsageModule,
  loadChartOfAccounts,
  saveChartOfAccounts,
} from "../../data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { loadVouchers } from "../../vouchers/voucher-data";

export type { ChartOfAccount, AccountType, CoaNodeLevel, ErpUsageModule };
export { loadChartOfAccounts, saveChartOfAccounts };

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
  const path: ChartOfAccount[] = [];
  let current = records.find((r) => r.id === nodeId);
  while (current) {
    path.unshift(current);
    current = current.parentAccountId
      ? records.find((r) => r.id === current!.parentAccountId)
      : undefined;
  }
  return path;
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

export function canAddLedgerUnder(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (isAddLedgerBlocked(node, records)) return false;
  if (node.nodeLevel === "account_group") {
    return !hasChildAccountGroups(records, node.id);
  }
  if (node.nodeLevel === "ledger") {
    if (isGroupingLedger(node, records)) return true;
    if (isPostingLedger(node, records) && !ledgerHasVoucherPostings(node.id)) return true;
    return false;
  }
  return false;
}

export function countChildGroups(records: ChartOfAccount[], nodeId: number): number {
  return getChildGroups(records, nodeId).length;
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
    accountType: parent?.accountType ?? existing?.accountType ?? "Asset",
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
  if (!form.parentGroupId) return "Parent group or ledger is required.";
  const parent = records.find((r) => r.id === form.parentGroupId);
  if (!parent || !canAddLedgerUnder(parent, records)) {
    return "Ledgers must be created under a valid Standard Group or grouping ledger. Posting ledgers with transactions cannot hold child ledgers.";
  }
  const dup = records.find(
    (r) =>
      r.id !== editingId &&
      r.nodeLevel === "ledger" &&
      r.parentAccountId === form.parentGroupId &&
      r.accountName.toLowerCase() === form.ledgerName.trim().toLowerCase(),
  );
  if (dup) return "A ledger with this name already exists under this parent.";
  if (
    editingId &&
    parent.nodeLevel === "ledger" &&
    isPostingLedger(parent, records) &&
    ledgerHasVoucherPostings(parent.id)
  ) {
    return "Cannot add child ledgers under a posting ledger that already has transactions.";
  }
  return null;
}

export function ledgerHasVoucherPostings(ledgerId: number): boolean {
  return loadVouchers().some((v) =>
    v.lines.some((line) => line.ledgerId === ledgerId),
  );
}

export function canDeleteLedger(record: ChartOfAccount): boolean {
  if (!canUserDeleteNode(record)) return false;
  if (ledgerHasChildLedgers(record.id, loadChartOfAccounts())) return false;
  if (ledgerHasVoucherPostings(record.id)) return false;
  return true;
}

export function canEditLedger(record: ChartOfAccount): boolean {
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
    .filter((r) => r.nodeLevel !== "ledger" || ledgerHasChildLedgers(r.id, records))
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

export function getSearchVisibleIds(
  records: ChartOfAccount[],
  query: string,
): Set<number> {
  const visible = new Set<number>();
  if (!query.trim()) return visible;

  const matching = records.filter((n) => nodeMatchesSearch(records, n, query));
  for (const node of matching) {
    getAncestorPath(records, node.id).forEach((a) => visible.add(a.id));
    const collectDesc = (id: number) => {
      getDirectChildren(records, id).forEach((c) => {
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
