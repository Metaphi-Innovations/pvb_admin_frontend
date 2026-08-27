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
import { computeLedgerCurrentBalance, resolveOpeningSide } from "../ledgers/ledgers-utils";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  isStockInHandLedger,
  resolveStockInHandDisplayBalance,
} from "@/lib/accounts/coa-stock-in-hand";

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
  /** True when opening/current came from posted voucher API balances. */
  balanceFromApi?: boolean;
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

export function isTdsReceivableLedger(ledger: ChartOfAccount): boolean {
  const alias = (ledger.alias ?? "").trim().toLowerCase();
  if (alias === tdsLedgerKindAlias("receivable") || alias === "sys:tds_receivable") {
    return true;
  }
  return ledger.accountName.trim().toLowerCase() === "tds receivable";
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
  const kind: "Payable" | "Receivable" = isTdsReceivableLedger(ledger)
    ? "Receivable"
    : "Payable";

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
  accountingGroupId: import("../../data").CoaNodeId,
  options: { search?: string } = {},
): CoaLedgerListingRow[] {
  const search = options.search?.trim() ?? "";
  const ledgers = collectDescendantLedgers(records, accountingGroupId)
    .filter((l) => !l.bankGroupFlag)
    .sort((a, b) => a.accountName.localeCompare(b.accountName));

  let rows = ledgers.map((ledger) => {
    const current = isStockInHandLedger(ledger)
      ? resolveStockInHandDisplayBalance()
      : computeLedgerCurrentBalance(ledger);
    const tds = resolveTdsLedgerUsageInfo(ledger);
    // Use the accounting-nature-aware side so opening/current always agree
    const openingSide = resolveOpeningSide(ledger);
    return {
      ledger,
      parentGroupName: ledger.parentAccountId
        ? resolveParentName(records, ledger.parentAccountId)
        : "",
      source: resolveCoaLedgerSource(ledger, records),
      openingAmount: ledger.openingBalance,
      openingSide,
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
  balanceFromApi?: boolean;
}

export function computeCoaLedgerListingSummary(
  rows: CoaLedgerListingRow[],
): CoaLedgerListingSummary {
  return {
    totalLedgers: rows.length,
    ...sumLedgerListingBalances(rows),
    balanceFromApi: rows.some((row) => row.balanceFromApi),
  };
}

function coaListingMovementMapForRange(
  from: string,
  to: string,
): Map<import("../../data").CoaNodeId, { totalDebit: number; totalCredit: number }> {
  return ledgerMovementMapForRange(from, to);
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

  /** True when opening/closing came from posted voucher API balances. */
  balanceFromApi?: boolean;

}



function collectDescendantPostingLedgers(

  records: ChartOfAccount[],

  nodeId: import("../../data").CoaNodeId,

): ChartOfAccount[] {

  const ids = new Set<import("../../data").CoaNodeId>();

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
  /** Stock in Hand current/closing balance = ERP total inventory value (COA display). */
  if (isStockInHandLedger(ledger)) {
    const display = resolveStockInHandDisplayBalance();
    // Use corrected opening side (same as computeLedgerCurrentBalance)
    const openingSide = resolveOpeningSide(ledger);
    const openingSigned = toSignedBalance(roundMoney(ledger.openingBalance), openingSide);
    const opening = fromSignedBalance(openingSigned);
    return {
      openingAmount: opening.amount,
      openingSide: opening.balanceType,
      periodDebit: movement.totalDebit,
      periodCredit: movement.totalCredit,
      closingAmount: display.amount,
      closingSide: display.balanceType,
    };
  }

  // Use resolveOpeningSide so the sign convention matches computeLedgerCurrentBalance
  const openingSide = resolveOpeningSide(ledger);
  const openingSigned = toSignedBalance(roundMoney(ledger.openingBalance), openingSide);
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

  movementMap: Map<import("../../data").CoaNodeId, { totalDebit: number; totalCredit: number }>,

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

  movementMap: Map<import("../../data").CoaNodeId, { totalDebit: number; totalCredit: number }>,

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
  balanceFromApi?: boolean;
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
  /** True when total balance came from posted voucher API balances. */
  balanceFromApi?: boolean;
}

/** Metadata and aggregated balance for an account group drill-down header. */
export function computeCoaGroupDetailSummary(
  records: ChartOfAccount[],
  groupId: import("../../data").CoaNodeId,
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

export interface CoaApiLedgerBalance {
  ledgerId: string;
  openingAmount: number;
  openingSide: "Debit" | "Credit";
  currentAmount: number;
  currentSide: "Debit" | "Credit";
  periodDebit: number;
  periodCredit: number;
}

function apiBalanceSide(raw: string | null | undefined, fallback: "Debit" | "Credit" = "Debit"): "Debit" | "Credit" {
  const value = String(raw ?? fallback).toUpperCase();
  return value === "CREDIT" || value === "CR" ? "Credit" : "Debit";
}

export function toCoaApiLedgerBalance(row: {
  ledgerId: string;
  openingAmount: number;
  openingBalanceType?: string;
  currentBalance: number;
  balanceType?: string;
  totalDebit?: number;
  totalCredit?: number;
}): CoaApiLedgerBalance {
  return {
    ledgerId: row.ledgerId,
    openingAmount: Number(row.openingAmount) || 0,
    openingSide: apiBalanceSide(row.openingBalanceType),
    currentAmount: Number(row.currentBalance) || 0,
    currentSide: apiBalanceSide(row.balanceType, apiBalanceSide(row.openingBalanceType)),
    periodDebit: Number(row.totalDebit) || 0,
    periodCredit: Number(row.totalCredit) || 0,
  };
}

function aggregateApiLedgerBalances(balances: CoaApiLedgerBalance[]) {
  let openingSigned = 0;
  let currentSigned = 0;
  let debit = 0;
  let credit = 0;

  for (const balance of balances) {
    openingSigned += toSignedBalance(balance.openingAmount, balance.openingSide);
    currentSigned += toSignedBalance(balance.currentAmount, balance.currentSide);
    debit += balance.periodDebit;
    credit += balance.periodCredit;
  }

  const opening = fromSignedBalance(openingSigned);
  const current = fromSignedBalance(currentSigned);
  return {
    openingAmount: opening.amount,
    openingSide: opening.balanceType,
    currentAmount: current.amount,
    currentSide: current.balanceType,
    periodDebit: debit,
    periodCredit: credit,
  };
}

function descendantLedgersForNode(
  records: ChartOfAccount[],
  node: ChartOfAccount,
): ChartOfAccount[] {
  if (node.nodeLevel === "ledger") {
    return node.bankGroupFlag ? [] : [node];
  }
  return collectDescendantLedgers(records, node.id).filter((ledger) => !ledger.bankGroupFlag);
}

function matchedApiBalancesForNode(
  records: ChartOfAccount[],
  node: ChartOfAccount,
  balances: Map<string, CoaApiLedgerBalance>,
): CoaApiLedgerBalance[] {
  const matched: CoaApiLedgerBalance[] = [];
  for (const ledger of descendantLedgersForNode(records, node)) {
    const id = ledger.apiNodeId ? String(ledger.apiNodeId) : "";
    const balance = id ? balances.get(id) : undefined;
    if (balance) matched.push(balance);
  }
  return matched;
}

/** Replace locally computed ledger-listing amounts with posted API balances. */
export function overlayApiBalancesOnLedgerRows(
  rows: CoaLedgerListingRow[],
  balances: Map<string, CoaApiLedgerBalance>,
): CoaLedgerListingRow[] {
  if (balances.size === 0) return rows;
  return rows.map((row) => {
    const id = row.ledger.apiNodeId ? String(row.ledger.apiNodeId) : "";
    const balance = id ? balances.get(id) : undefined;
    if (!balance) return row;
    return {
      ...row,
      openingAmount: balance.openingAmount,
      openingSide: balance.openingSide,
      currentAmount: balance.currentAmount,
      currentSide: balance.currentSide,
      balanceFromApi: true,
    };
  });
}

/** Replace locally computed hierarchy-listing amounts with posted API balances. */
export function overlayApiBalancesOnListingRows(
  records: ChartOfAccount[],
  rows: CoaListingRow[],
  balances: Map<string, CoaApiLedgerBalance>,
): CoaListingRow[] {
  if (balances.size === 0) return rows;
  return rows.map((row) => {
    const matched = matchedApiBalancesForNode(records, row.node, balances);
    if (!matched.length) return row;
    const aggregated = aggregateApiLedgerBalances(matched);
    return {
      ...row,
      openingAmount: aggregated.openingAmount,
      openingSide: aggregated.openingSide,
      periodDebit: aggregated.periodDebit,
      periodCredit: aggregated.periodCredit,
      closingAmount: aggregated.currentAmount,
      closingSide: aggregated.currentSide,
      balanceFromApi: true,
    };
  });
}

/** Replace group-header total with aggregated posted API balances. */
export function overlayApiBalancesOnGroupSummary(
  summary: CoaGroupDetailSummary,
  records: ChartOfAccount[],
  balances: Map<string, CoaApiLedgerBalance>,
): CoaGroupDetailSummary {
  if (balances.size === 0) return summary;
  const matched = matchedApiBalancesForNode(records, summary.group, balances);
  if (!matched.length) return summary;
  const aggregated = aggregateApiLedgerBalances(matched);
  return {
    ...summary,
    closingAmount: aggregated.currentAmount,
    closingSide: aggregated.currentSide,
    balanceFromApi: true,
  };
}

export function computeCoaListingSummaryFromRows(rows: CoaListingRow[]): CoaListingSummary {
  return {
    totalAccounts: rows.length,
    ...sumRowBalances(rows),
    balanceFromApi: rows.some((row) => row.balanceFromApi),
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
  parentNodeId: import("../../data").CoaNodeId | null,
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

