import type { ChartOfAccount } from "../../data";

import {
  formatCoaHierarchyPath,
  getDirectChildren,
  getSearchMatchingNodes,
  resolveParentName,
  countChildGroups,
  countLedgersUnder,
  getAncestorPath,
} from "./chart-of-accounts-data";

import { ledgerHasChildLedgers } from "@/lib/accounts/coa-hierarchy";
import { collectDescendantLedgers } from "@/lib/accounts/coa-accounting-view";
import { isGstCoaLedger } from "@/lib/accounts/gst-coa-sync";
import { isTdsCoaLedger, tdsLedgerKindAlias } from "@/lib/accounts/tds-coa-sync";
import { parseTdsSectionCode } from "@/lib/accounts/tds-coa-utils";
import { loadTDSMasters, formatTdsRateDisplay, formatApplicableToLabels, getTdsSectionCode } from "@/app/(app)/masters/tds/tds-data";

import {
  computePeriodClosingBalance,
  ledgerMovementMapForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";

import { fromSignedBalance, openingSignedBalance, toSignedBalance } from "@/lib/accounts/running-balance";
import { computeLedgerCurrentBalance } from "../ledgers/ledgers-utils";
import { buildBundledCoaDemoLedgers } from "./coa-demo-bundle";
import { getBundledDemoTransactions } from "./coa-demo-transactions";

export type CoaLedgerSourceLabel =
  | "Manual"
  | "Customer Master"
  | "Supplier Master"
  | "Bank Master"
  | "GST Master"
  | "TDS Master"
  | "Employee Master"
  | "System";

export interface CoaLedgerListingRow {
  ledger: ChartOfAccount;
  parentGroupName: string;
  source: CoaLedgerSourceLabel;
  openingAmount: number;
  openingSide: "Debit" | "Credit";
  currentAmount: number;
  currentSide: "Debit" | "Credit";
  /** Populated for TDS section ledgers */
  tdsSection?: string;
  tdsRate?: string;
  tdsKind?: "Payable" | "Receivable";
  tdsDeductee?: string;
}

export interface TdsLedgerUsageInfo {
  section: string;
  rate: string;
  kind: "Payable" | "Receivable";
  deductee: string;
  linkedMaster: string;
}

export function resolveTdsLedgerUsageInfo(ledger: ChartOfAccount): TdsLedgerUsageInfo | null {
  if (!isTdsCoaLedger(ledger)) return null;

  const master =
    ledger.erpSourceId != null
      ? loadTDSMasters().find((m) => m.id === ledger.erpSourceId)
      : undefined;
  const section =
    master != null
      ? getTdsSectionCode(master)
      : parseTdsSectionCode(ledger.accountName) ?? "—";
  const kind: "Payable" | "Receivable" =
    ledger.alias === tdsLedgerKindAlias("receivable") ? "Receivable" : "Payable";

  return {
    section,
    rate: master ? formatTdsRateDisplay(master.tdsRate) : "—",
    kind,
    deductee: master ? formatApplicableToLabels(master.applicableTo) : "—",
    linkedMaster: master ? `${getTdsSectionCode(master)} — ${master.sectionName}` : "TDS Master",
  };
}

/** Resolve user-facing source label for a COA ledger row. */
export function resolveCoaLedgerSource(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): CoaLedgerSourceLabel {
  if (isGstCoaLedger(ledger, records)) return "GST Master";
  if (isTdsCoaLedger(ledger)) return "TDS Master";

  switch (ledger.erpSourceModule) {
    case "customer_master":
      return "Customer Master";
    case "vendor_master":
      return "Supplier Master";
    case "bank_master":
      return "Bank Master";
    case "employee_master":
      return "Employee Master";
    default:
      break;
  }

  if (ledger.isSystemGenerated || ledger.isSystem) return "System";
  return "Manual";
}

function ledgerListingMatchesSearch(
  row: CoaLedgerListingRow,
  query: string,
): boolean {
  const q = query.toLowerCase();
  return (
    row.ledger.accountName.toLowerCase().includes(q) ||
    row.ledger.accountCode.toLowerCase().includes(q) ||
    row.parentGroupName.toLowerCase().includes(q) ||
    row.source.toLowerCase().includes(q) ||
    (row.tdsSection?.toLowerCase().includes(q) ?? false)
  );
}

/** Flat ledger rows for a Level-3 accounting group (all descendant ledgers). */
export function buildCoaLedgerListingRows(
  records: ChartOfAccount[],
  accountingGroupId: number,
  options: { search?: string } = {},
): CoaLedgerListingRow[] {
  const search = options.search?.trim() ?? "";
  const ledgers = collectDescendantLedgers(records, accountingGroupId)
    .filter((l) => !l.bankGroupFlag)
    .sort((a, b) => a.accountName.localeCompare(b.accountName));

  let rows = ledgers.map((ledger) => {
    const current = computeLedgerCurrentBalance(ledger);
    const tds = resolveTdsLedgerUsageInfo(ledger);
    return {
      ledger,
      parentGroupName: ledger.parentAccountId
        ? resolveParentName(records, ledger.parentAccountId)
        : "",
      source: resolveCoaLedgerSource(ledger, records),
      openingAmount: ledger.openingBalance,
      openingSide: ledger.balanceType,
      currentAmount: current.amount,
      currentSide: current.balanceType,
      ...(tds
        ? {
            tdsSection: tds.section,
            tdsRate: tds.rate,
            tdsKind: tds.kind,
            tdsDeductee: tds.deductee,
          }
        : {}),
    };
  });

  if (search) {
    rows = rows.filter((row) => ledgerListingMatchesSearch(row, search));
  }

  return rows;
}

function sumLedgerListingBalances(rows: CoaLedgerListingRow[]) {
  let openingSigned = 0;
  let currentSigned = 0;

  for (const row of rows) {
    openingSigned += toSignedBalance(row.openingAmount, row.openingSide);
    currentSigned += toSignedBalance(row.currentAmount, row.currentSide);
  }

  const opening = fromSignedBalance(openingSigned);
  const current = fromSignedBalance(currentSigned);
  return {
    openingAmount: opening.amount,
    openingSide: opening.balanceType,
    currentAmount: current.amount,
    currentSide: current.balanceType,
  };
}

export interface CoaLedgerListingSummary {
  totalLedgers: number;
  openingAmount: number;
  openingSide: "Debit" | "Credit";
  currentAmount: number;
  currentSide: "Debit" | "Credit";
}

export function computeCoaLedgerListingSummary(
  rows: CoaLedgerListingRow[],
): CoaLedgerListingSummary {
  return {
    totalLedgers: rows.length,
    ...sumLedgerListingBalances(rows),
  };
}

function coaListingMovementMapForRange(
  from: string,
  to: string,
): Map<number, { totalDebit: number; totalCredit: number }> {
  const map = ledgerMovementMapForRange(from, to);

  for (const ledger of buildBundledCoaDemoLedgers()) {
    const rows = getBundledDemoTransactions(ledger.id);
    let totalDebit = 0;
    let totalCredit = 0;
    for (const row of rows) {
      if (row.date < from || row.date > to) continue;
      totalDebit += row.debit;
      totalCredit += row.credit;
    }
    if (totalDebit === 0 && totalCredit === 0) continue;
    const cur = map.get(ledger.id) ?? { totalDebit: 0, totalCredit: 0 };
    map.set(ledger.id, {
      totalDebit: cur.totalDebit + totalDebit,
      totalCredit: cur.totalCredit + totalCredit,
    });
  }

  return map;
}

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
  const movementMap = coaListingMovementMapForRange(dateFrom, dateTo);
  const balances =
    hasSearch || showRoot || !selectedNode
      ? sumRowBalances(rows)
      : balancesForNode(records, selectedNode, movementMap);

  return {
    totalAccounts: rows.length,
    ...balances,
  };
}

export interface CoaGroupDetailSummary {
  group: ChartOfAccount;
  parentGroupName: string;
  childGroupCount: number;
  ledgerCount: number;
  closingAmount: number;
  closingSide: "Debit" | "Credit";
}

/** Metadata and aggregated balance for an account group drill-down header. */
export function computeCoaGroupDetailSummary(
  records: ChartOfAccount[],
  groupId: number,
  dateFrom: string,
  dateTo: string,
): CoaGroupDetailSummary | null {
  const group = records.find((r) => r.id === groupId);
  if (!group || group.nodeLevel !== "account_group") return null;

  const path = getAncestorPath(records, groupId);
  const parent = path.length >= 2 ? path[path.length - 2] : null;
  const movementMap = coaListingMovementMapForRange(dateFrom, dateTo);
  const balances = balancesForNode(records, group, movementMap);

  return {
    group,
    parentGroupName: parent?.accountName ?? "—",
    childGroupCount: countChildGroups(records, groupId),
    ledgerCount: countLedgersUnder(records, groupId),
    closingAmount: balances.closingAmount,
    closingSide: balances.closingSide,
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
  const movementMap = coaListingMovementMapForRange(dateFrom, dateTo);

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

