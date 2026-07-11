import { roundMoney } from "@/lib/accounts/money-format";
import type { BalanceSide } from "@/lib/accounts/money-format";
import type {
  TrialBalanceAmountColumns,
  TrialBalanceDetailedGroup,
  TrialBalanceDetailedLedgerRow,
  TrialBalancePrimaryHeadSection,
} from "./trial-balance-data";

/** Net balance from split debit/credit columns — display only, no calculation change. */
export function netBalanceFromSplit(
  debit: number,
  credit: number,
): { amount: number; side: BalanceSide | null } {
  if (debit > 0) return { amount: roundMoney(debit), side: "Debit" };
  if (credit > 0) return { amount: roundMoney(credit), side: "Credit" };
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

function subgroupKey(groupKey: string, subgroupName: string): string {
  return `${groupKey}::${subgroupName}`;
}

/**
 * Normal view hierarchy: Primary Head → Group → Sub Group (when nested) → Ledger.
 * Uses closing debit/credit for the two amount columns.
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

      const bySubGroup = new Map<string, TrialBalanceDetailedLedgerRow[]>();
      for (const ledger of group.ledgers) {
        const hasSubGroup =
          ledger.standardGroup.trim().length > 0 &&
          ledger.standardGroup !== group.groupName;
        const key = hasSubGroup ? ledger.standardGroup : "__direct__";
        const list = bySubGroup.get(key) ?? [];
        list.push(ledger);
        bySubGroup.set(key, list);
      }

      const subGroupEntries = [...bySubGroup.entries()].sort(([a], [b]) => {
        if (a === "__direct__") return 1;
        if (b === "__direct__") return -1;
        return a.localeCompare(b);
      });

      for (const [subKey, ledgers] of subGroupEntries) {
        if (subKey !== "__direct__") {
          const subClosing = sumClosingAmounts(ledgers);
          flat.push({
            type: "subgroup",
            subgroupKey: subgroupKey(group.groupKey, subKey),
            subgroupName: subKey,
            debit: subClosing.debit,
            credit: subClosing.credit,
          });
        }
        for (const ledger of ledgers.sort((a, b) =>
          a.ledgerName.localeCompare(b.ledgerName),
        )) {
          flat.push({ type: "ledger", ledger });
        }
      }
    }
  }

  return flat;
}

export const TB_NORMAL_INDENT = {
  primary: "pl-3",
  group: "pl-6",
  subgroup: "pl-9",
  ledger: "pl-12",
} as const;

export const TB_DETAILED_INDENT = {
  primary: "pl-3",
  group: "pl-6",
  subgroup: "pl-9",
  ledger: "pl-12",
} as const;
