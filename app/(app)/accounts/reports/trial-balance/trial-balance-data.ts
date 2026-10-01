import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  filterValidTrialBalanceLedgerRows,
  isValidTrialBalanceLedgerRow,
} from "./trial-balance-validation";
import {
  computeTrialBalanceLedgerRows,
  computeTrialBalanceLedgerVoucherLines,
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
  type TrialBalanceLedgerVoucherLine,
} from "@/lib/accounts/trial-balance-compute";

export type {
  TrialBalanceFilters,
  TrialBalanceAmountColumns,
  ComputedTrialBalanceLedgerRow,
  TrialBalanceVoucherException,
  TrialBalanceLedgerVoucherLine,
};
export {
  findTrialBalanceExceptions,
  getTrialBalanceBranchOptions,
  getTrialBalanceLedgerGroupOptions,
  getTrialBalanceLedgerOptions,
  getTrialBalanceWarehouseOptions,
  computeTrialBalanceLedgerVoucherLines,
};

export type TrialBalanceTab = "normal" | "detailed";

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
  /** @deprecated Use closingDifference */
  difference: number;
  openingDifference: number;
  periodDifference: number;
  closingDifference: number;
  totalLedgers: number;
  totalGroups: number;
  isBalanced: boolean;
}

export function computeTrialBalanceBalanceCheck(
  totals: TrialBalanceAmountColumns,
  hasUnbalancedVouchers = false,
): Pick<
  TrialBalanceSummary,
  | "openingDifference"
  | "periodDifference"
  | "closingDifference"
  | "difference"
  | "isBalanced"
> {
  const openingDifference = roundMoney(totals.openingDebit - totals.openingCredit);
  const periodDifference = roundMoney(totals.debit - totals.credit);
  const closingDifference = roundMoney(totals.closingDebit - totals.closingCredit);
  const isBalanced =
    openingDifference === 0 &&
    periodDifference === 0 &&
    closingDifference === 0 &&
    !hasUnbalancedVouchers;
  return {
    openingDifference,
    periodDifference,
    closingDifference,
    difference: closingDifference,
    isBalanced,
  };
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
  subgroupKey: string;
  subgroupId: number;
  subgroupName: string;
  /** @deprecated Use subgroupName */
  standardGroup: string;
  groupSortOrder: number;
  subgroupSortOrder: number;
  primaryHead: string;
  primaryHeadId: number;
  primaryHeadSort: number;
}

export interface TrialBalanceDetailedSubGroup extends TrialBalanceAmountColumns {
  subgroupKey: string;
  subgroupId: number;
  subgroupName: string;
  sortOrder: number;
  ledgers: TrialBalanceDetailedLedgerRow[];
}

export interface TrialBalanceDetailedGroup extends TrialBalanceAmountColumns {
  groupKey: string;
  groupId: number;
  groupName: string;
  sortOrder: number;
  primaryHead: string;
  primaryHeadId: number;
  primaryHeadSort: number;
  subgroups: TrialBalanceDetailedSubGroup[];
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

function mapLedgerRow(row: ComputedTrialBalanceLedgerRow): TrialBalanceDetailedLedgerRow | null {
  if (!isValidTrialBalanceLedgerRow(row)) return null;
  return {
    ledgerId: row.ledgerId,
    ledgerCode: row.ledgerCode,
    ledgerName: row.ledgerName,
    groupKey: String(row.accountGroupId),
    groupName: row.accountGroup,
    subgroupKey: String(row.subGroupId),
    subgroupId: row.subGroupId,
    subgroupName: row.subGroup,
    standardGroup: row.subGroup,
    groupSortOrder: row.accountGroupSort,
    subgroupSortOrder: row.subGroupSort,
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

export function getLedgerRowsFromDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
): TrialBalanceDetailedLedgerRow[] {
  return groups.flatMap((g) => g.subgroups.flatMap((sg) => sg.ledgers));
}

function sumAmountColumns(
  rows: Pick<TrialBalanceAmountColumns, keyof TrialBalanceAmountColumns>[],
): TrialBalanceAmountColumns {
  return sumTrialBalanceColumns(rows);
}

function rebuildSubGroupFromLedgers(
  subgroup: TrialBalanceDetailedSubGroup,
): TrialBalanceDetailedSubGroup {
  const totals = sumAmountColumns(subgroup.ledgers);
  return { ...subgroup, ...totals };
}

function rebuildGroupFromSubgroups(
  group: TrialBalanceDetailedGroup,
): TrialBalanceDetailedGroup {
  const subgroups = group.subgroups
    .map(rebuildSubGroupFromLedgers)
    .filter((sg) => sg.ledgers.length > 0)
    .sort(
      (a, b) => a.sortOrder - b.sortOrder || a.subgroupName.localeCompare(b.subgroupName),
    );
  const totals = sumAmountColumns(subgroups);
  return { ...group, subgroups, ...totals };
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

function rebuildGroupFromLedgers(
  group: TrialBalanceDetailedGroup,
): TrialBalanceDetailedGroup {
  return rebuildGroupFromSubgroups(group);
}

export function buildTrialBalanceDetailedGroups(
  filters: TrialBalanceFilters,
): TrialBalanceDetailedGroup[] {
  const rows = computeTrialBalanceLedgerRows(filters);
  const groupMap = new Map<string, TrialBalanceDetailedGroup>();

  for (const row of rows) {
    const mapped = mapLedgerRow(row);
    if (!mapped) continue;

    const groupKey = String(row.accountGroupId);
    const subgroupKey = String(row.subGroupId);

    const existingGroup = groupMap.get(groupKey) ?? {
      groupKey,
      groupId: row.accountGroupId,
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
      subgroups: [],
    };

    let subgroup = existingGroup.subgroups.find((sg) => sg.subgroupKey === subgroupKey);
    if (!subgroup) {
      subgroup = {
        subgroupKey,
        subgroupId: row.subGroupId,
        subgroupName: row.subGroup,
        sortOrder: row.subGroupSort,
        openingDebit: 0,
        openingCredit: 0,
        debit: 0,
        credit: 0,
        closingDebit: 0,
        closingCredit: 0,
        ledgers: [],
      };
      existingGroup.subgroups.push(subgroup);
    }

    subgroup.ledgers.push(mapped);
    groupMap.set(groupKey, existingGroup);
  }

  return [...groupMap.values()]
    .map((g) =>
      rebuildGroupFromSubgroups({
        ...g,
        subgroups: g.subgroups.map((sg) => ({
          ...sg,
          ledgers: sg.ledgers.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName)),
        })),
      }),
    )
    .filter((g) => g.subgroups.length > 0)
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

  const withValidHierarchy = groups
    .map((group) => {
      const subgroups = group.subgroups
        .map((sg) => {
          const ledgers = filterValidTrialBalanceLedgerRows(sg.ledgers);
          if (ledgers.length === 0) return null;
          return rebuildSubGroupFromLedgers({ ...sg, ledgers });
        })
        .filter((sg): sg is TrialBalanceDetailedSubGroup => sg != null);
      if (subgroups.length === 0) return null;
      return rebuildGroupFromSubgroups({ ...group, subgroups });
    })
    .filter((g): g is TrialBalanceDetailedGroup => g != null);

  if (!q) return withValidHierarchy;

  return withValidHierarchy
    .map((group) => {
      const groupMatches =
        group.groupName.toLowerCase().includes(q) ||
        group.primaryHead.toLowerCase().includes(q);

      const subgroups = group.subgroups
        .map((sg) => {
          const subgroupMatches =
            groupMatches || sg.subgroupName.toLowerCase().includes(q);
          const ledgers = subgroupMatches
            ? filterValidTrialBalanceLedgerRows(sg.ledgers)
            : filterValidTrialBalanceLedgerRows(
                sg.ledgers.filter(
                  (l) =>
                    l.ledgerName.toLowerCase().includes(q) ||
                    l.ledgerCode.toLowerCase().includes(q),
                ),
              );
          if (ledgers.length === 0) return null;
          return rebuildSubGroupFromLedgers({ ...sg, ledgers });
        })
        .filter((sg): sg is TrialBalanceDetailedSubGroup => sg != null);

      if (subgroups.length === 0) return null;
      return rebuildGroupFromSubgroups({ ...group, subgroups });
    })
    .filter((g): g is TrialBalanceDetailedGroup => g != null);
}

export function computeTrialBalanceSummaryFromDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
  hasUnbalancedVouchers = false,
): TrialBalanceSummary {
  const ledgerRows = getLedgerRowsFromDetailedGroups(groups);
  const totals = sumTrialBalanceColumns(ledgerRows);
  const balance = computeTrialBalanceBalanceCheck(totals, hasUnbalancedVouchers);

  return {
    totalDebit: totals.closingDebit,
    totalCredit: totals.closingCredit,
    periodDebit: totals.debit,
    periodCredit: totals.credit,
    openingDebit: totals.openingDebit,
    openingCredit: totals.openingCredit,
    closingDebit: totals.closingDebit,
    closingCredit: totals.closingCredit,
    ...balance,
    totalLedgers: ledgerRows.length,
    totalGroups: groups.length,
  };
}

export function computeTrialBalanceSummaryFromGroups(
  rows: TrialBalanceSummaryGroupRow[],
  hasUnbalancedVouchers = false,
): TrialBalanceSummary {
  const totals = sumTrialBalanceColumns(rows);
  const balance = computeTrialBalanceBalanceCheck(totals, hasUnbalancedVouchers);

  return {
    totalDebit: totals.closingDebit,
    totalCredit: totals.closingCredit,
    periodDebit: totals.debit,
    periodCredit: totals.credit,
    openingDebit: totals.openingDebit,
    openingCredit: totals.openingCredit,
    closingDebit: totals.closingDebit,
    closingCredit: totals.closingCredit,
    ...balance,
    totalLedgers: 0,
    totalGroups: rows.length,
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
      groupId: number;
      groupKey: string;
      groupName: string;
      primaryHead: string;
      ledgerCount: number;
      amounts: TrialBalanceAmountColumns;
    }
  | {
      type: "subgroup";
      subgroupId: number;
      subgroupKey: string;
      subgroupName: string;
      groupKey: string;
      ledgerCount: number;
      amounts: TrialBalanceAmountColumns;
    }
  | { type: "ledger"; ledger: TrialBalanceDetailedLedgerRow }
  | { type: "voucher"; ledgerId: number; voucher: TrialBalanceLedgerVoucherLine };

export function flattenTrialBalanceDetailedGroups(
  groups: TrialBalanceDetailedGroup[],
  expandedPrimaryIds: Set<number>,
  expandedGroupIds: Set<string>,
  expandedSubgroupIds: Set<string> = new Set(),
  options?: {
    expandedLedgerIds?: Set<number>;
    voucherLinesByLedgerId?: Map<number, TrialBalanceLedgerVoucherLine[]>;
  },
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
      const ledgerCount = group.subgroups.reduce((n, sg) => n + sg.ledgers.length, 0);
      flat.push({
        type: "group",
        groupId: group.groupId,
        groupKey: group.groupKey,
        groupName: group.groupName,
        primaryHead: group.primaryHead,
        ledgerCount,
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

      for (const subgroup of group.subgroups) {
        flat.push({
          type: "subgroup",
          subgroupId: subgroup.subgroupId,
          subgroupKey: subgroup.subgroupKey,
          subgroupName: subgroup.subgroupName,
          groupKey: group.groupKey,
          ledgerCount: subgroup.ledgers.length,
          amounts: {
            openingDebit: subgroup.openingDebit,
            openingCredit: subgroup.openingCredit,
            debit: subgroup.debit,
            credit: subgroup.credit,
            closingDebit: subgroup.closingDebit,
            closingCredit: subgroup.closingCredit,
          },
        });

        if (!expandedSubgroupIds.has(subgroup.subgroupKey)) continue;

        for (const ledger of subgroup.ledgers) {
          flat.push({ type: "ledger", ledger });
          if (
            options?.expandedLedgerIds?.has(ledger.ledgerId) &&
            options.voucherLinesByLedgerId
          ) {
            const vouchers = options.voucherLinesByLedgerId.get(ledger.ledgerId) ?? [];
            for (const voucher of vouchers) {
              flat.push({ type: "voucher", ledgerId: ledger.ledgerId, voucher });
            }
          }
        }
      }
    }
  }

  return flat;
}

export function collectAllDetailedSubgroupKeys(
  groups: TrialBalanceDetailedGroup[],
): Set<string> {
  const keys = new Set<string>();
  for (const group of groups) {
    for (const subgroup of group.subgroups) {
      keys.add(subgroup.subgroupKey);
    }
  }
  return keys;
}

export function collectAllDetailedGroupKeys(groups: TrialBalanceDetailedGroup[]): Set<string> {
  return new Set(groups.map((g) => g.groupKey));
}

export function collectAllPrimaryHeadKeys(groups: TrialBalanceDetailedGroup[]): Set<number> {
  return new Set(groups.map((g) => g.primaryHeadId));
}

export { buildGeneralLedgerHref };

export function buildTrialBalanceLedgerHref(
  ledgerId: number,
  filters: Pick<TrialBalanceFilters, "dateFrom" | "dateTo" | "branch" | "warehouse" | "financialYearId">,
  options?: { groupId?: number; groupName?: string },
): string {
  const branch = Array.isArray(filters.branch) ? filters.branch[0] : filters.branch;
  const warehouse = Array.isArray(filters.warehouse) ? filters.warehouse[0] : filters.warehouse;
  return buildGeneralLedgerHref({
    ledgerId,
    fromDate: filters.dateFrom,
    toDate: filters.dateTo,
    source: "trial-balance",
    branch: branch && branch !== "all" ? branch : undefined,
    warehouse: warehouse && warehouse !== "all" ? warehouse : undefined,
    financialYearId: filters.financialYearId,
    groupId: options?.groupId,
    groupName: options?.groupName,
  });
}

export function buildTrialBalanceGroupHref(
  groupId: number,
  groupName: string,
  filters: Pick<TrialBalanceFilters, "dateFrom" | "dateTo" | "branch" | "warehouse" | "financialYearId">,
): string {
  const branch = Array.isArray(filters.branch) ? filters.branch[0] : filters.branch;
  const warehouse = Array.isArray(filters.warehouse) ? filters.warehouse[0] : filters.warehouse;
  return buildGeneralLedgerHref({
    groupId,
    groupName,
    fromDate: filters.dateFrom,
    toDate: filters.dateTo,
    source: "trial-balance",
    branch: branch && branch !== "all" ? branch : undefined,
    warehouse: warehouse && warehouse !== "all" ? warehouse : undefined,
    financialYearId: filters.financialYearId,
  });
}
