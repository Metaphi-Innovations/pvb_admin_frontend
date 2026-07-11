import type { ChartOfAccount, CoaSpecializedGroupType } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  TDS_PAYABLE_GROUP,
  TDS_RECEIVABLE_GROUP,
} from "@/lib/accounts/tds-coa-sync";

export type TdsLedgerKind = "payable" | "receivable";

const GST_DUTIES_NAMES = new Set([
  "duties & taxes payable",
  "gst output",
  "gst input",
  "gst input credit",
  "gst payable",
]);

function matchesTdsPayableName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "tds payable" || n.includes("tds payable");
}

function matchesTdsReceivableName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "tds receivable" || n.includes("tds receivable");
}

function inferFromPathNames(names: string[]): CoaSpecializedGroupType | null {
  if (names.some(matchesTdsPayableName)) return "tds_payable";
  if (names.some(matchesTdsReceivableName)) return "tds_receivable";
  if (names.some((n) => GST_DUTIES_NAMES.has(n.toLowerCase()))) return "gst_duties";
  if (names.some((n) => n.includes("sundry debtors") || n.includes("trade receivables"))) {
    return "sundry_debtors";
  }
  if (names.some((n) => n.includes("sundry creditors") || n.includes("trade payables"))) {
    return "sundry_creditors";
  }
  if (names.some((n) => n === "bank accounts" || n.includes("bank account"))) {
    return "bank_accounts";
  }
  if (names.some((n) => n.includes("cash-in-hand") || n.includes("cash in hand"))) {
    return "cash_in_hand";
  }
  if (names.some((n) => n.includes("inventory") || n.includes("stock-in-hand"))) {
    return "inventory";
  }
  if (names.some((n) => n === "land & building")) return "warehouse";
  return null;
}

/** Resolve inherited specialization from explicit metadata or ancestor chain. */
export function resolveSpecializedGroupType(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaSpecializedGroupType | null {
  const path = getAncestorPath(records, node.id);
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const ancestor = path[i];
    if (ancestor.specializedGroupType) return ancestor.specializedGroupType;
  }
  if (node.specializedGroupType) return node.specializedGroupType;

  const names = path.map((p) => p.accountName);
  return inferFromPathNames(names);
}

export function isTdsPayableContext(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveSpecializedGroupType(node, records) === "tds_payable";
}

export function isTdsReceivableContext(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveSpecializedGroupType(node, records) === "tds_receivable";
}

/** True under TDS Payable, TDS Receivable, or any inherited TDS sub-group. */
export function isTdsGroupContext(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const type = resolveSpecializedGroupType(node, records);
  return type === "tds_payable" || type === "tds_receivable";
}

export function isGstDutiesContext(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const type = resolveSpecializedGroupType(node, records);
  return (
    type === "gst_duties" ||
    type === "gst_input" ||
    type === "gst_output" ||
    type === "gst_payable" ||
    type === "gst_receivable"
  );
}

export function inferTdsLedgerKind(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): TdsLedgerKind {
  if (isTdsReceivableContext(node, records)) return "receivable";
  return "payable";
}

export function inheritedSpecializedGroupType(
  records: ChartOfAccount[],
  parentGroupId: number | null,
): CoaSpecializedGroupType | undefined {
  if (parentGroupId == null) return undefined;
  const parent = records.find((r) => r.id === parentGroupId);
  if (!parent) return undefined;
  const type = resolveSpecializedGroupType(parent, records);
  return type ?? undefined;
}

export function isTdsPayableGroupNode(node: ChartOfAccount): boolean {
  return node.nodeLevel === "account_group" && node.accountName === TDS_PAYABLE_GROUP;
}

export function isTdsReceivableGroupNode(node: ChartOfAccount): boolean {
  return node.nodeLevel === "account_group" && node.accountName === TDS_RECEIVABLE_GROUP;
}
