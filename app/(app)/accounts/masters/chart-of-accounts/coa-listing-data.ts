import type { ChartOfAccount } from "../../data";

import {
  formatCoaHierarchyPath,
  getDirectChildren,
  getSearchMatchingNodes,
} from "./chart-of-accounts-data";

import { ledgerHasChildLedgers } from "@/lib/accounts/coa-hierarchy";

import {

  computePeriodClosingBalance,

  ledgerMovementMapForRange,

} from "@/lib/accounts/ledger-transaction-date-filter";

import { fromSignedBalance, openingSignedBalance, toSignedBalance } from "@/lib/accounts/running-balance";



export interface CoaListingRow {
  node: ChartOfAccount;
  parentGroupName: string;
  hierarchyPath: string;
  openingAmount: number;

  openingSide: "Debit" | "Credit";

  periodDebit: number;

  periodCredit: number;

  closingAmount: number;

  closingSide: "Debit" | "Credit";

  hasChildren: boolean;

}



function collectDescendantPostingLedgers(

  records: ChartOfAccount[],

  nodeId: number,

): ChartOfAccount[] {

  const ids = new Set<number>();

  const queue = [nodeId];

  while (queue.length) {

    const id = queue.shift()!;

    for (const c of records.filter((r) => r.parentAccountId === id)) {

      if (c.nodeLevel === "ledger") {

        if (!c.bankGroupFlag) ids.add(c.id);

        if (ledgerHasChildLedgers(c.id, records)) queue.push(c.id);

      } else {

        queue.push(c.id);

      }

    }

  }

  return records.filter((r) => ids.has(r.id));

}



function ledgerPeriodBalances(

  ledger: ChartOfAccount,

  movement: { totalDebit: number; totalCredit: number },

) {

  const openingSigned = openingSignedBalance(ledger);

  const opening = fromSignedBalance(openingSigned);

  const closing = computePeriodClosingBalance(

    ledger,

    movement.totalDebit,

    movement.totalCredit,

  );

  return {

    openingAmount: opening.amount,

    openingSide: opening.balanceType,

    periodDebit: movement.totalDebit,

    periodCredit: movement.totalCredit,

    closingAmount: closing.amount,

    closingSide: closing.balanceType,

  };

}



function aggregateSigned(

  ledgers: ChartOfAccount[],

  movementMap: Map<number, { totalDebit: number; totalCredit: number }>,

) {

  let openingSigned = 0;

  let debit = 0;

  let credit = 0;

  let closingSigned = 0;



  for (const ledger of ledgers) {

    const movement = movementMap.get(ledger.id) ?? { totalDebit: 0, totalCredit: 0 };

    const bal = ledgerPeriodBalances(ledger, movement);

    openingSigned += toSignedBalance(bal.openingAmount, bal.openingSide);

    debit += bal.periodDebit;

    credit += bal.periodCredit;

    closingSigned += toSignedBalance(bal.closingAmount, bal.closingSide);

  }



  const opening = fromSignedBalance(openingSigned);

  const closing = fromSignedBalance(closingSigned);

  return {

    openingAmount: opening.amount,

    openingSide: opening.balanceType,

    periodDebit: debit,

    periodCredit: credit,

    closingAmount: closing.amount,

    closingSide: closing.balanceType,

  };

}



function balancesForNode(

  records: ChartOfAccount[],

  node: ChartOfAccount,

  movementMap: Map<number, { totalDebit: number; totalCredit: number }>,

) {

  const ledgers =

    node.nodeLevel === "ledger" && !node.bankGroupFlag

      ? [node]

      : collectDescendantPostingLedgers(records, node.id);

  return aggregateSigned(ledgers, movementMap);

}

function sumRowBalances(rows: CoaListingRow[]) {
  let openingSigned = 0;
  let debit = 0;
  let credit = 0;
  let closingSigned = 0;

  for (const row of rows) {
    openingSigned += toSignedBalance(row.openingAmount, row.openingSide);
    debit += row.periodDebit;
    credit += row.periodCredit;
    closingSigned += toSignedBalance(row.closingAmount, row.closingSide);
  }

  const opening = fromSignedBalance(openingSigned);
  const closing = fromSignedBalance(closingSigned);
  return {
    openingAmount: opening.amount,
    openingSide: opening.balanceType,
    periodDebit: debit,
    periodCredit: credit,
    closingAmount: closing.amount,
    closingSide: closing.balanceType,
  };
}

export interface CoaListingSummary {
  totalAccounts: number;
  openingAmount: number;
  openingSide: "Debit" | "Credit";
  periodDebit: number;
  periodCredit: number;
  closingAmount: number;
  closingSide: "Debit" | "Credit";
}

/** Summary totals for the current listing context (selected node or root view). */
export function computeCoaListingSummary(
  records: ChartOfAccount[],
  rows: CoaListingRow[],
  selectedNode: ChartOfAccount | null,
  showRoot: boolean,
  dateFrom: string,
  dateTo: string,
  hasSearch: boolean,
): CoaListingSummary {
  const movementMap = ledgerMovementMapForRange(dateFrom, dateTo);
  const balances =
    hasSearch || showRoot || !selectedNode
      ? sumRowBalances(rows)
      : balancesForNode(records, selectedNode, movementMap);

  return {
    totalAccounts: rows.length,
    ...balances,
  };
}

/**

 * Build flat listing rows for immediate children of the given parent.

 * Pass `null` for parentNodeId to list primary heads (Assets, Liabilities, etc.).

 */

function listingMetaForNode(
  records: ChartOfAccount[],
  node: ChartOfAccount,
): Pick<CoaListingRow, "parentGroupName" | "hierarchyPath"> {
  const parent = node.parentAccountId
    ? records.find((r) => r.id === node.parentAccountId)
    : null;
  return {
    parentGroupName: parent?.accountName ?? "",
    hierarchyPath: formatCoaHierarchyPath(records, node.id),
  };
}

export function buildCoaListingRows(
  records: ChartOfAccount[],
  parentNodeId: number | null,
  dateFrom: string,
  dateTo: string,
  options: { search?: string } = {},
): CoaListingRow[] {
  const search = options.search?.trim() ?? "";
  const movementMap = ledgerMovementMapForRange(dateFrom, dateTo);

  if (search) {
    return getSearchMatchingNodes(records, search).map((node) => {
      const childCount = getDirectChildren(records, node.id).length;
      return {
        node,
        ...listingMetaForNode(records, node),
        ...balancesForNode(records, node, movementMap),
        hasChildren: childCount > 0,
      };
    });
  }

  const children =
    parentNodeId == null
      ? records
          .filter((r) => r.nodeLevel === "primary_head")
          .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
      : getDirectChildren(records, parentNodeId);

  return children.map((node) => {
    const childCount = getDirectChildren(records, node.id).length;
    return {
      node,
      ...listingMetaForNode(records, node),
      ...balancesForNode(records, node, movementMap),
      hasChildren: childCount > 0,
    };
  });
}



export function exportCoaListingCsv(rows: CoaListingRow[]): string {

  const header =

    "Ledger Code,Ledger Name,Opening Balance,Debit,Credit,Closing Balance\n";

  const body = rows

    .map((r) => {

      const opening =

        r.openingAmount > 0 ? `${r.openingAmount} ${r.openingSide}` : "—";

      const closing =

        r.closingAmount > 0 ? `${r.closingAmount} ${r.closingSide}` : "—";

      return [

        `"${r.node.accountCode}"`,

        `"${r.node.accountName}"`,

        `"${opening}"`,

        `"${r.periodDebit || "—"}"`,

        `"${r.periodCredit || "—"}"`,

        `"${closing}"`,

      ].join(",");

    })

    .join("\n");

  return header + body;

}

