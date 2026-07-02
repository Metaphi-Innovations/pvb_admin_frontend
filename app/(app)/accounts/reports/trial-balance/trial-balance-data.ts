import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";
import {
  computeTrialBalanceRows,
  type TrialBalanceRow,
} from "@/lib/accounts/ledger-reports";
import {
  roundMoney,
  type BalanceSide,
} from "@/lib/accounts/money-format";

export type TrialBalanceTab = "summary" | "detailed";

export interface TrialBalanceDisplayRow {
  ledgerId: number;
  ledgerCode: string;
  ledgerName: string;
  ledgerGroup: string;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceSummary {
  totalDebit: number;
  totalCredit: number;
  periodDebit: number;
  periodCredit: number;
  difference: number;
  totalLedgers: number;
  totalGroups: number;
  isBalanced: boolean;
}

export interface TrialBalanceFilterParams {
  search?: string;
}

/** Summary tab — one row per account group (leaf standard group) */
export interface TrialBalanceSummaryGroupRow {
  groupId: number;
  particular: string;
  debit: number;
  credit: number;
  sortOrder: number;
}

/** Detailed tab — ledger row with full trial balance columns */
export interface TrialBalanceDetailedLedgerRow {
  ledgerId: number;
  ledgerCode: string;
  ledgerName: string;
  groupKey: string;
  groupName: string;
  groupSortOrder: number;
  openingAmount: number;
  openingBalanceType: BalanceSide;
  debit: number;
  credit: number;
  closingAmount: number;
  closingBalanceType: BalanceSide;
}

export interface TrialBalanceDetailedGroup {
  groupKey: string;
  groupName: string;
  sortOrder: number;
  ledgers: TrialBalanceDetailedLedgerRow[];
}

export type TrialBalanceSummarySortKey = "particular" | "debit" | "credit";
export type TrialBalanceDetailedSortKey =
  | "particular"
  | "opening"
  | "debit"
  | "credit"
  | "closing"
  | "balanceType";

function resolveLedgerGroup(row: TrialBalanceRow): string {
  return row.subGroup !== "—" ? row.subGroup : row.accountGroup;
}

function closingDebitCredit(row: TrialBalanceRow): { debit: number; credit: number } {
  const amount = roundMoney(row.closing.amount);
  const isZero = amount === 0;
  const isDebit = row.closing.balanceType === "Debit";
  return {
    debit: isDebit && !isZero ? amount : 0,
    credit: !isDebit && !isZero ? amount : 0,
  };
}

function mapToDisplayRow(
  row: TrialBalanceRow,
  codeMap: Map<number, string>,
): TrialBalanceDisplayRow {
  const { debit, credit } = closingDebitCredit(row);
  return {
    ledgerId: row.ledgerId,
    ledgerCode: codeMap.get(row.ledgerId) ?? "",
    ledgerName: row.ledger,
    ledgerGroup: resolveLedgerGroup(row),
    closingDebit: debit,
    closingCredit: credit,
  };
}

function buildCodeMap(): Map<number, string> {
  return new Map(
    loadChartOfAccounts()
      .filter((r) => r.nodeLevel === "ledger")
      .map((r) => [r.id, r.accountCode]),
  );
}

function resolveSummaryGroup(
  row: TrialBalanceRow,
  records: ReturnType<typeof loadChartOfAccounts>,
): { id: number; name: string; sortOrder: number } | null {
  const hierarchy = resolveHierarchyPath(records, row.ledgerId);
  const group =
    hierarchy.standardGroup ?? hierarchy.accountGroup ?? hierarchy.primaryHead;
  if (!group) return null;
  return { id: group.id, name: group.accountName, sortOrder: group.id };
}

function resolveDetailedGroup(
  row: TrialBalanceRow,
  records: ReturnType<typeof loadChartOfAccounts>,
): { key: string; name: string; sortOrder: number } {
  const hierarchy = resolveHierarchyPath(records, row.ledgerId);
  const group = hierarchy.accountGroup ?? hierarchy.primaryHead;
  if (!group) {
    return { key: "ungrouped", name: "—", sortOrder: 999_999 };
  }
  return { key: String(group.id), name: group.accountName, sortOrder: group.id };
}

export function buildTrialBalanceDisplayRows(): TrialBalanceDisplayRow[] {
  const raw = computeTrialBalanceRows();
  const codeMap = buildCodeMap();
  return raw.map((row) => mapToDisplayRow(row, codeMap));
}

export function buildTrialBalanceSummaryRows(): TrialBalanceSummaryGroupRow[] {
  const records = loadChartOfAccounts();
  const raw = computeTrialBalanceRows();
  const groupMap = new Map<number, TrialBalanceSummaryGroupRow>();

  for (const row of raw) {
    const group = resolveSummaryGroup(row, records);
    if (!group) continue;

    const { debit, credit } = closingDebitCredit(row);
    const existing = groupMap.get(group.id) ?? {
      groupId: group.id,
      particular: group.name,
      debit: 0,
      credit: 0,
      sortOrder: group.sortOrder,
    };

    existing.debit = roundMoney(existing.debit + debit);
    existing.credit = roundMoney(existing.credit + credit);
    groupMap.set(group.id, existing);
  }

  return [...groupMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildTrialBalanceDetailedGroups(): TrialBalanceDetailedGroup[] {
  const records = loadChartOfAccounts();
  const raw = computeTrialBalanceRows();
  const codeMap = buildCodeMap();
  const groupMap = new Map<string, TrialBalanceDetailedGroup>();

  for (const row of raw) {
    const group = resolveDetailedGroup(row, records);
    const ledgerRow: TrialBalanceDetailedLedgerRow = {
      ledgerId: row.ledgerId,
      ledgerCode: codeMap.get(row.ledgerId) ?? "",
      ledgerName: row.ledger,
      groupKey: group.key,
      groupName: group.name,
      groupSortOrder: group.sortOrder,
      openingAmount: roundMoney(row.opening),
      openingBalanceType: row.openingBalanceType,
      debit: roundMoney(row.debit),
      credit: roundMoney(row.credit),
      closingAmount: roundMoney(row.closing.amount),
      closingBalanceType: row.closing.balanceType,
    };

    const existing = groupMap.get(group.key) ?? {
      groupKey: group.key,
      groupName: group.name,
      sortOrder: group.sortOrder,
      ledgers: [],
    };
    existing.ledgers.push(ledgerRow);
    groupMap.set(group.key, existing);
  }

  return [...groupMap.values()]
    .map((g) => ({
      ...g,
      ledgers: g.ledgers.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName)),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function filterTrialBalanceRows(
  rows: TrialBalanceDisplayRow[],
  filters: TrialBalanceFilterParams,
): TrialBalanceDisplayRow[] {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (row) =>
      row.ledgerName.toLowerCase().includes(q) ||
      row.ledgerCode.toLowerCase().includes(q) ||
      row.ledgerGroup.toLowerCase().includes(q),
  );
}

export function filterTrialBalanceSummaryRows(
  rows: TrialBalanceSummaryGroupRow[],
  filters: TrialBalanceFilterParams,
  allLedgers: TrialBalanceDisplayRow[],
): TrialBalanceSummaryGroupRow[] {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return rows;

  const matchingGroupNames = new Set(
    allLedgers
      .filter(
        (l) =>
          l.ledgerName.toLowerCase().includes(q) ||
          l.ledgerCode.toLowerCase().includes(q) ||
          l.ledgerGroup.toLowerCase().includes(q),
      )
      .map((l) => l.ledgerGroup.toLowerCase()),
  );

  return rows.filter(
    (row) =>
      row.particular.toLowerCase().includes(q) ||
      matchingGroupNames.has(row.particular.toLowerCase()),
  );
}

export function filterTrialBalanceDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
  filters: TrialBalanceFilterParams,
): TrialBalanceDetailedGroup[] {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return groups;

  return groups
    .map((group) => {
      const groupMatches = group.groupName.toLowerCase().includes(q);
      const ledgers = groupMatches
        ? group.ledgers
        : group.ledgers.filter(
            (l) =>
              l.ledgerName.toLowerCase().includes(q) ||
              l.ledgerCode.toLowerCase().includes(q),
          );
      if (!groupMatches && ledgers.length === 0) return null;
      return { ...group, ledgers };
    })
    .filter((g): g is TrialBalanceDetailedGroup => g != null);
}

export function computeTrialBalanceSummaryFromDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
): TrialBalanceSummary {
  let totalDebit = 0;
  let totalCredit = 0;
  let periodDebit = 0;
  let periodCredit = 0;
  let totalLedgers = 0;

  for (const group of groups) {
    for (const l of group.ledgers) {
      totalLedgers += 1;
      periodDebit += l.debit;
      periodCredit += l.credit;
      if (l.closingBalanceType === "Debit" && l.closingAmount !== 0) {
        totalDebit += l.closingAmount;
      } else if (l.closingBalanceType === "Credit" && l.closingAmount !== 0) {
        totalCredit += l.closingAmount;
      }
    }
  }

  totalDebit = roundMoney(totalDebit);
  totalCredit = roundMoney(totalCredit);
  periodDebit = roundMoney(periodDebit);
  periodCredit = roundMoney(periodCredit);
  const difference = roundMoney(totalDebit - totalCredit);

  return {
    totalDebit,
    totalCredit,
    periodDebit,
    periodCredit,
    difference,
    totalLedgers,
    totalGroups: groups.length,
    isBalanced: difference === 0,
  };
}

export function computeTrialBalanceSummary(
  rows: TrialBalanceDisplayRow[],
  groupCount?: number,
): TrialBalanceSummary {
  const totalDebit = roundMoney(rows.reduce((s, r) => s + r.closingDebit, 0));
  const totalCredit = roundMoney(rows.reduce((s, r) => s + r.closingCredit, 0));
  const difference = roundMoney(totalDebit - totalCredit);

  return {
    totalDebit,
    totalCredit,
    periodDebit: totalDebit,
    periodCredit: totalCredit,
    difference,
    totalLedgers: rows.length,
    totalGroups: groupCount ?? 0,
    isBalanced: difference === 0,
  };
}

export function computeTrialBalanceSummaryFromGroups(
  rows: TrialBalanceSummaryGroupRow[],
  ledgerRows: TrialBalanceDisplayRow[],
): TrialBalanceSummary {
  const totalDebit = roundMoney(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = roundMoney(rows.reduce((s, r) => s + r.credit, 0));
  const difference = roundMoney(totalDebit - totalCredit);

  return {
    totalDebit,
    totalCredit,
    periodDebit: totalDebit,
    periodCredit: totalCredit,
    difference,
    totalLedgers: ledgerRows.length,
    totalGroups: rows.length,
    isBalanced: difference === 0,
  };
}

export function sortTrialBalanceSummaryRows(
  rows: TrialBalanceSummaryGroupRow[],
  sortKey: TrialBalanceSummarySortKey,
  sortDir: "asc" | "desc",
): TrialBalanceSummaryGroupRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === "particular") {
      return a.particular.localeCompare(b.particular) * dir;
    }
    return (a[sortKey] - b[sortKey]) * dir;
  });
}

export function sortTrialBalanceDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
  sortKey: TrialBalanceDetailedSortKey,
  sortDir: "asc" | "desc",
): TrialBalanceDetailedGroup[] {
  const dir = sortDir === "asc" ? 1 : -1;

  const compareLedgers = (
    a: TrialBalanceDetailedLedgerRow,
    b: TrialBalanceDetailedLedgerRow,
  ) => {
    switch (sortKey) {
      case "particular":
        return a.ledgerName.localeCompare(b.ledgerName) * dir;
      case "opening":
        return (a.openingAmount - b.openingAmount) * dir;
      case "debit":
        return (a.debit - b.debit) * dir;
      case "credit":
        return (a.credit - b.credit) * dir;
      case "closing":
        return (a.closingAmount - b.closingAmount) * dir;
      case "balanceType":
        return a.closingBalanceType.localeCompare(b.closingBalanceType) * dir;
      default:
        return 0;
    }
  };

  if (sortKey === "particular") {
    return [...groups]
      .sort((a, b) => a.groupName.localeCompare(b.groupName) * dir)
      .map((g) => ({
        ...g,
        ledgers: [...g.ledgers].sort(compareLedgers),
      }));
  }

  const groupSortValue = (group: TrialBalanceDetailedGroup): number | string => {
    switch (sortKey) {
      case "balanceType":
        return group.ledgers[0]?.closingBalanceType ?? "";
      case "opening":
        return group.ledgers.reduce((s, l) => s + l.openingAmount, 0);
      case "debit":
        return group.ledgers.reduce((s, l) => s + l.debit, 0);
      case "credit":
        return group.ledgers.reduce((s, l) => s + l.credit, 0);
      case "closing":
        return group.ledgers.reduce((s, l) => s + l.closingAmount, 0);
      default:
        return 0;
    }
  };

  return [...groups]
    .map((g) => ({
      ...g,
      ledgers: [...g.ledgers].sort(compareLedgers),
    }))
    .sort((a, b) => {
      const aVal = groupSortValue(a);
      const bVal = groupSortValue(b);
      if (typeof aVal === "string") {
        return aVal.localeCompare(String(bVal)) * dir;
      }
      return (aVal - (bVal as number)) * dir;
    });
}

/** Flat rows for detailed tab pagination */
export type TrialBalanceDetailedFlatRow =
  | { type: "group"; groupKey: string; groupName: string; ledgerCount: number }
  | { type: "ledger"; ledger: TrialBalanceDetailedLedgerRow };

export function flattenTrialBalanceDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
  expandedIds: Set<string>,
): TrialBalanceDetailedFlatRow[] {
  const flat: TrialBalanceDetailedFlatRow[] = [];
  for (const group of groups) {
    flat.push({
      type: "group",
      groupKey: group.groupKey,
      groupName: group.groupName,
      ledgerCount: group.ledgers.length,
    });
    if (expandedIds.has(group.groupKey)) {
      for (const ledger of group.ledgers) {
        flat.push({ type: "ledger", ledger });
      }
    }
  }
  return flat;
}

export function collectAllDetailedGroupKeys(groups: TrialBalanceDetailedGroup[]): Set<string> {
  return new Set(groups.map((g) => g.groupKey));
}
