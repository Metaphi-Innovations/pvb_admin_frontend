import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  computeTrialBalanceLedgerRows,
  findTrialBalanceExceptions,
  getTrialBalanceBranchOptions,
  getTrialBalanceLedgerGroupOptions,
  getTrialBalanceLedgerOptions,
  getTrialBalanceWarehouseOptions,
  sumTrialBalanceColumns,
  type ComputedTrialBalanceLedgerRow,
  type TrialBalanceAmountColumns,
  type TrialBalanceFilters,
  type TrialBalanceVoucherException,
} from "@/lib/accounts/trial-balance-compute";

export type {
  TrialBalanceFilters,
  TrialBalanceAmountColumns,
  ComputedTrialBalanceLedgerRow,
  TrialBalanceVoucherException,
};
export {
  findTrialBalanceExceptions,
  getTrialBalanceBranchOptions,
  getTrialBalanceLedgerGroupOptions,
  getTrialBalanceLedgerOptions,
  getTrialBalanceWarehouseOptions,
};

export type TrialBalanceTab = "summary" | "detailed";

export interface TrialBalanceFilterParams {
  search?: string;
}

export interface TrialBalanceSummary {
  totalDebit: number;
  totalCredit: number;
  periodDebit: number;
  periodCredit: number;
  openingDebit: number;
  openingCredit: number;
  closingDebit: number;
  closingCredit: number;
  difference: number;
  totalLedgers: number;
  totalGroups: number;
  isBalanced: boolean;
}

/** Group-wise row — account group level */
export interface TrialBalanceSummaryGroupRow extends TrialBalanceAmountColumns {
  groupId: number;
  particular: string;
  primaryHead: string;
  sortOrder: number;
}

/** Detailed ledger row */
export interface TrialBalanceDetailedLedgerRow extends TrialBalanceAmountColumns {
  ledgerId: number;
  ledgerCode: string;
  ledgerName: string;
  groupKey: string;
  groupName: string;
  groupSortOrder: number;
  primaryHead: string;
  primaryHeadId: number;
  primaryHeadSort: number;
}

export interface TrialBalanceDetailedGroup extends TrialBalanceAmountColumns {
  groupKey: string;
  groupName: string;
  sortOrder: number;
  primaryHead: string;
  primaryHeadId: number;
  primaryHeadSort: number;
  ledgers: TrialBalanceDetailedLedgerRow[];
}

export interface TrialBalancePrimaryHeadSection extends TrialBalanceAmountColumns {
  primaryHeadId: number;
  primaryHead: string;
  sortOrder: number;
  groups: TrialBalanceDetailedGroup[];
}

export type TrialBalanceSummarySortKey =
  | "particular"
  | "openingDebit"
  | "debit"
  | "closingDebit";
export type TrialBalanceDetailedSortKey =
  | "particular"
  | "openingDebit"
  | "debit"
  | "credit"
  | "closingDebit";


function buildSummaryFromLedgers(
  rows: ComputedTrialBalanceLedgerRow[],
): TrialBalanceSummaryGroupRow[] {
  const groupMap = new Map<number, TrialBalanceSummaryGroupRow>();

  for (const row of rows) {
    const existing = groupMap.get(row.accountGroupId) ?? {
      groupId: row.accountGroupId,
      particular: row.accountGroup,
      primaryHead: row.primaryHead,
      sortOrder: row.accountGroupSort,
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
    };
    existing.openingDebit = roundMoney(existing.openingDebit + row.openingDebit);
    existing.openingCredit = roundMoney(existing.openingCredit + row.openingCredit);
    existing.debit = roundMoney(existing.debit + row.debit);
    existing.credit = roundMoney(existing.credit + row.credit);
    existing.closingDebit = roundMoney(existing.closingDebit + row.closingDebit);
    existing.closingCredit = roundMoney(existing.closingCredit + row.closingCredit);
    groupMap.set(row.accountGroupId, existing);
  }

  return [...groupMap.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.particular.localeCompare(b.particular),
  );
}

function mapLedgerRow(row: ComputedTrialBalanceLedgerRow): TrialBalanceDetailedLedgerRow {
  return {
    ledgerId: row.ledgerId,
    ledgerCode: row.ledgerCode,
    ledgerName: row.ledgerName,
    groupKey: String(row.accountGroupId),
    groupName: row.accountGroup,
    groupSortOrder: row.accountGroupSort,
    primaryHead: row.primaryHead,
    primaryHeadId: row.primaryHeadId,
    primaryHeadSort: row.primaryHeadSort,
    openingDebit: row.openingDebit,
    openingCredit: row.openingCredit,
    debit: row.debit,
    credit: row.credit,
    closingDebit: row.closingDebit,
    closingCredit: row.closingCredit,
  };
}

export function buildTrialBalanceLedgerRows(
  filters: TrialBalanceFilters,
): ComputedTrialBalanceLedgerRow[] {
  return computeTrialBalanceLedgerRows(filters);
}

export function buildTrialBalanceSummaryRows(
  filters: TrialBalanceFilters,
): TrialBalanceSummaryGroupRow[] {
  return buildSummaryFromLedgers(computeTrialBalanceLedgerRows(filters));
}

export function buildTrialBalanceDetailedGroups(
  filters: TrialBalanceFilters,
): TrialBalanceDetailedGroup[] {
  const rows = computeTrialBalanceLedgerRows(filters);
  const groupMap = new Map<string, TrialBalanceDetailedGroup>();

  for (const row of rows) {
    const key = String(row.accountGroupId);
    const existing = groupMap.get(key) ?? {
      groupKey: key,
      groupName: row.accountGroup,
      sortOrder: row.accountGroupSort,
      primaryHead: row.primaryHead,
      primaryHeadId: row.primaryHeadId,
      primaryHeadSort: row.primaryHeadSort,
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
      ledgers: [],
    };
    existing.ledgers.push(mapLedgerRow(row));
    existing.openingDebit = roundMoney(existing.openingDebit + row.openingDebit);
    existing.openingCredit = roundMoney(existing.openingCredit + row.openingCredit);
    existing.debit = roundMoney(existing.debit + row.debit);
    existing.credit = roundMoney(existing.credit + row.credit);
    existing.closingDebit = roundMoney(existing.closingDebit + row.closingDebit);
    existing.closingCredit = roundMoney(existing.closingCredit + row.closingCredit);
    groupMap.set(key, existing);
  }

  return [...groupMap.values()]
    .map((g) => ({
      ...g,
      ledgers: g.ledgers.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName)),
    }))
    .sort(
      (a, b) =>
        a.primaryHeadSort - b.primaryHeadSort ||
        a.sortOrder - b.sortOrder ||
        a.groupName.localeCompare(b.groupName),
    );
}

export function buildTrialBalancePrimaryHeadSections(
  filters: TrialBalanceFilters,
): TrialBalancePrimaryHeadSection[] {
  const groups = buildTrialBalanceDetailedGroups(filters);
  const sectionMap = new Map<number, TrialBalancePrimaryHeadSection>();

  for (const group of groups) {
    const existing = sectionMap.get(group.primaryHeadId) ?? {
      primaryHeadId: group.primaryHeadId,
      primaryHead: group.primaryHead,
      sortOrder: group.primaryHeadSort,
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
      groups: [],
    };
    existing.groups.push(group);
    existing.openingDebit = roundMoney(existing.openingDebit + group.openingDebit);
    existing.openingCredit = roundMoney(existing.openingCredit + group.openingCredit);
    existing.debit = roundMoney(existing.debit + group.debit);
    existing.credit = roundMoney(existing.credit + group.credit);
    existing.closingDebit = roundMoney(existing.closingDebit + group.closingDebit);
    existing.closingCredit = roundMoney(existing.closingCredit + group.closingCredit);
    sectionMap.set(group.primaryHeadId, existing);
  }

  return [...sectionMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** @deprecated Use buildTrialBalanceLedgerRows(filters) */
export function buildTrialBalanceDisplayRows() {
  return buildTrialBalanceLedgerRows({
    financialYearId: "all",
    dateFrom: "",
    dateTo: new Date().toISOString().slice(0, 10),
    branch: "all",
    warehouse: "all",
    ledgerGroupId: "all",
    ledgerId: "all",
    showZeroBalance: true,
  }).map((r) => ({
    ledgerId: r.ledgerId,
    ledgerCode: r.ledgerCode,
    ledgerName: r.ledgerName,
    ledgerGroup: r.accountGroup,
    closingDebit: r.closingDebit,
    closingCredit: r.closingCredit,
  }));
}

export function filterTrialBalanceSummaryRows(
  rows: TrialBalanceSummaryGroupRow[],
  filters: TrialBalanceFilterParams,
): TrialBalanceSummaryGroupRow[] {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (row) =>
      row.particular.toLowerCase().includes(q) ||
      row.primaryHead.toLowerCase().includes(q),
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
      const groupMatches =
        group.groupName.toLowerCase().includes(q) ||
        group.primaryHead.toLowerCase().includes(q);
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
  const ledgerRows = groups.flatMap((g) => g.ledgers);
  const totals = sumTrialBalanceColumns(ledgerRows);

  const difference = roundMoney(totals.closingDebit - totals.closingCredit);
  const periodDiff = roundMoney(totals.debit - totals.credit);

  return {
    totalDebit: totals.closingDebit,
    totalCredit: totals.closingCredit,
    periodDebit: totals.debit,
    periodCredit: totals.credit,
    openingDebit: totals.openingDebit,
    openingCredit: totals.openingCredit,
    closingDebit: totals.closingDebit,
    closingCredit: totals.closingCredit,
    difference,
    totalLedgers: ledgerRows.length,
    totalGroups: groups.length,
    isBalanced: difference === 0 && periodDiff === 0,
  };
}

export function computeTrialBalanceSummaryFromGroups(
  rows: TrialBalanceSummaryGroupRow[],
): TrialBalanceSummary {
  const totals = sumTrialBalanceColumns(rows);
  const difference = roundMoney(totals.closingDebit - totals.closingCredit);
  const periodDiff = roundMoney(totals.debit - totals.credit);

  return {
    totalDebit: totals.closingDebit,
    totalCredit: totals.closingCredit,
    periodDebit: totals.debit,
    periodCredit: totals.credit,
    openingDebit: totals.openingDebit,
    openingCredit: totals.openingCredit,
    closingDebit: totals.closingDebit,
    closingCredit: totals.closingCredit,
    difference,
    totalLedgers: 0,
    totalGroups: rows.length,
    isBalanced: difference === 0 && periodDiff === 0,
  };
}

export type TrialBalanceDetailedFlatRow =
  | {
      type: "primary";
      primaryHeadId: number;
      primaryHead: string;
      amounts: TrialBalanceAmountColumns;
    }
  | {
      type: "group";
      groupKey: string;
      groupName: string;
      primaryHead: string;
      ledgerCount: number;
      amounts: TrialBalanceAmountColumns;
    }
  | { type: "ledger"; ledger: TrialBalanceDetailedLedgerRow };

export function flattenTrialBalanceDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
  expandedPrimaryIds: Set<number>,
  expandedGroupIds: Set<string>,
): TrialBalanceDetailedFlatRow[] {
  const flat: TrialBalanceDetailedFlatRow[] = [];
  const sections = new Map<number, TrialBalancePrimaryHeadSection>();

  for (const group of groups) {
    const section = sections.get(group.primaryHeadId) ?? {
      primaryHeadId: group.primaryHeadId,
      primaryHead: group.primaryHead,
      sortOrder: group.primaryHeadSort,
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
      groups: [],
    };
    section.groups.push(group);
    section.openingDebit = roundMoney(section.openingDebit + group.openingDebit);
    section.openingCredit = roundMoney(section.openingCredit + group.openingCredit);
    section.debit = roundMoney(section.debit + group.debit);
    section.credit = roundMoney(section.credit + group.credit);
    section.closingDebit = roundMoney(section.closingDebit + group.closingDebit);
    section.closingCredit = roundMoney(section.closingCredit + group.closingCredit);
    sections.set(group.primaryHeadId, section);
  }

  for (const section of [...sections.values()].sort((a, b) => a.sortOrder - b.sortOrder)) {
    flat.push({
      type: "primary",
      primaryHeadId: section.primaryHeadId,
      primaryHead: section.primaryHead,
      amounts: {
        openingDebit: section.openingDebit,
        openingCredit: section.openingCredit,
        debit: section.debit,
        credit: section.credit,
        closingDebit: section.closingDebit,
        closingCredit: section.closingCredit,
      },
    });

    if (!expandedPrimaryIds.has(section.primaryHeadId)) continue;

    for (const group of section.groups) {
      flat.push({
        type: "group",
        groupKey: group.groupKey,
        groupName: group.groupName,
        primaryHead: group.primaryHead,
        ledgerCount: group.ledgers.length,
        amounts: {
          openingDebit: group.openingDebit,
          openingCredit: group.openingCredit,
          debit: group.debit,
          credit: group.credit,
          closingDebit: group.closingDebit,
          closingCredit: group.closingCredit,
        },
      });

      if (!expandedGroupIds.has(group.groupKey)) continue;

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

export function collectAllPrimaryHeadKeys(groups: TrialBalanceDetailedGroup[]): Set<number> {
  return new Set(groups.map((g) => g.primaryHeadId));
}

export { buildGeneralLedgerHref };
