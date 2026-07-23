import { roundMoney } from "@/lib/accounts/money-format";
import type { BalanceSide } from "@/lib/accounts/money-format";
import {
  getLedgerRowsFromDetailedGroups,
  type TrialBalanceAmountColumns,
  type TrialBalanceDetailedGroup,
  type TrialBalanceDetailedLedgerRow,
  type TrialBalancePrimaryHeadSection,
} from "./trial-balance-data";
import { filterValidTrialBalanceLedgerRows } from "./trial-balance-validation";

/**
 * Net trial-balance amount + Dr/Cr from separate debit/credit column totals.
 * Works for ledger rows (one side populated) and parent rows (both sides aggregated).
 */
export function netBalanceFromSplit(
  debit: number,
  credit: number,
): { amount: number; side: BalanceSide | null } {
  const d = roundMoney(debit);
  const c = roundMoney(credit);
  if (d === 0 && c === 0) return { amount: 0, side: null };
  const net = roundMoney(d - c);
  if (net > 0) return { amount: net, side: "Debit" };
  if (net < 0) return { amount: Math.abs(net), side: "Credit" };
  return { amount: 0, side: null };
}

export function balanceSideAbbrev(side: BalanceSide | null): string {
  if (side === "Debit") return "Dr";
  if (side === "Credit") return "Cr";
  return "—";
}

export type TrialBalanceNormalFlatRow =
  | {
      type: "primary";
      primaryHeadId: number;
      primaryHead: string;
      debit: number;
      credit: number;
    }
  | {
      type: "group";
      groupKey: string;
      groupName: string;
      debit: number;
      credit: number;
    }
  | {
      type: "subgroup";
      subgroupKey: string;
      subgroupName: string;
      debit: number;
      credit: number;
    }
  | { type: "ledger"; ledger: TrialBalanceDetailedLedgerRow };

function sumClosingAmounts(
  rows: Pick<TrialBalanceAmountColumns, "closingDebit" | "closingCredit">[],
): { debit: number; credit: number } {
  return rows.reduce(
    (acc, r) => ({
      debit: roundMoney(acc.debit + r.closingDebit),
      credit: roundMoney(acc.credit + r.closingCredit),
    }),
    { debit: 0, credit: 0 },
  );
}

function buildPrimarySections(
  groups: TrialBalanceDetailedGroup[],
): TrialBalancePrimaryHeadSection[] {
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

/**
 * Detailed export hierarchy: Primary Head → Account Group → Sub Group → Ledger.
 */
export function flattenTrialBalanceNormalRows(
  groups: TrialBalanceDetailedGroup[],
): TrialBalanceNormalFlatRow[] {
  const flat: TrialBalanceNormalFlatRow[] = [];
  const sections = buildPrimarySections(groups);

  for (const section of sections) {
    const sectionClosing = sumClosingAmounts([section]);
    flat.push({
      type: "primary",
      primaryHeadId: section.primaryHeadId,
      primaryHead: section.primaryHead,
      debit: sectionClosing.debit,
      credit: sectionClosing.credit,
    });

    for (const group of section.groups) {
      const groupClosing = sumClosingAmounts([group]);
      flat.push({
        type: "group",
        groupKey: group.groupKey,
        groupName: group.groupName,
        debit: groupClosing.debit,
        credit: groupClosing.credit,
      });

      for (const subgroup of group.subgroups) {
        const subClosing = sumClosingAmounts([subgroup]);
        flat.push({
          type: "subgroup",
          subgroupKey: subgroup.subgroupKey,
          subgroupName: subgroup.subgroupName,
          debit: subClosing.debit,
          credit: subClosing.credit,
        });

        for (const ledger of subgroup.ledgers.sort((a, b) =>
          a.ledgerName.localeCompare(b.ledgerName),
        )) {
          flat.push({ type: "ledger", ledger });
        }
      }
    }
  }

  return flat;
}

/** Normal view — flat ledger row only (used by legacy export helpers). */
export type TrialBalanceNormalLedgerRow = Extract<
  TrialBalanceNormalFlatRow,
  { type: "ledger" }
>;

/** Normal view — primary account heads only (Particular | Debit | Credit). */
export type TrialBalanceNormalPrimaryHeadRow = Extract<
  TrialBalanceNormalFlatRow,
  { type: "primary" }
>;

/** Normal view — main account heads (primary heads) with closing Debit / Credit. */
export function flattenTrialBalanceNormalPrimaryHeadRows(
  groups: TrialBalanceDetailedGroup[],
): TrialBalanceNormalPrimaryHeadRow[] {
  return buildPrimarySections(groups).map((section) => {
    const closing = sumClosingAmounts([section]);
    return {
      type: "primary" as const,
      primaryHeadId: section.primaryHeadId,
      primaryHead: section.primaryHead,
      debit: closing.debit,
      credit: closing.credit,
    };
  });
}

/** @deprecated Prefer flattenTrialBalanceNormalPrimaryHeadRows for Normal Report UI. */
export function flattenTrialBalanceNormalLedgerRows(
  groups: TrialBalanceDetailedGroup[],
): TrialBalanceNormalLedgerRow[] {
  return filterValidTrialBalanceLedgerRows(getLedgerRowsFromDetailedGroups(groups))
    .sort((a, b) => a.ledgerName.localeCompare(b.ledgerName))
    .map((ledger) => ({ type: "ledger" as const, ledger }));
}

import { ACCOUNTS_COA_HIERARCHY_INDENT } from "@/lib/accounts/accounts-coa-hierarchy-ui";

export const TB_NORMAL_INDENT = {
  ledger: "pl-3",
} as const;

// Detailed view nests via tree-guide rails inside the label, so cells use a
// small uniform left padding. Voucher rows render custom content (no rails),
// so they keep an explicit deeper indent to sit under the ledger row.
export const TB_DETAILED_INDENT = {
  primary: "pl-2",
  group: "pl-2",
  subgroup: "pl-2",
  ledger: "pl-2",
  voucher: ACCOUNTS_COA_HIERARCHY_INDENT.voucher,
} as const;
