import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  canAddLedgerUnder,
  getAncestorPath,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import { isTdsGroupContext } from "@/lib/accounts/coa-specialized-groups";
import { isBankAccountsSubGroup, isBankGroupNode } from "@/lib/accounts/bank-coa-utils";

/** Sub-groups whose ledgers are owned by other ERP masters — not manually created in COA/Ledgers. */
export function isMasterOwnedSubGroup(node: ChartOfAccount): boolean {
  if (isBankAccountsSubGroup(node) || isBankGroupNode(node)) return true;
  if (node.nodeLevel !== "account_group") return false;
  const name = node.accountName.toLowerCase();
  return (
    name.includes("trade receivables") ||
    name.includes("sundry debtors") ||
    name.includes("trade payables") ||
    name.includes("sundry creditors") ||
    name.includes("inventory") ||
    name.includes("stock-in-hand")
  );
}

export function isGstLedgerParent(node: ChartOfAccount): boolean {
  if (node.nodeLevel !== "account_group") return false;
  const name = node.accountName.toLowerCase();
  return name.includes("gst payable") || name.includes("gst output") || name.includes("duties & taxes");
}

export function isTdsLedgerParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (node.nodeLevel !== "account_group") return false;
  return isTdsGroupContext(node, records);
}

function isExpenseLedgerParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const path = getAncestorPath(records, node.id);
  return path.some((p) => p.accountType === "Expense" || p.accountName === "Expenses");
}

/** True when ledger creation is allowed under this COA node (structure remains fixed). */
export function canAddLedgerFromCoa(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (!canAddLedgerUnder(node, records)) return false;
  if (isAddLedgerBlocked(node, records)) return false;
  return true;
}

/** Same eligibility rules as COA — used by quick-create modals. */
export function canAddLedgerFromLedgersPage(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return canAddLedgerFromCoa(node, records);
}

export const LEDGER_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "customer", label: "Customer" },
  { id: "vendor", label: "Supplier" },
  { id: "bank", label: "Bank" },
  { id: "cash", label: "Cash" },
  { id: "expense", label: "Expense" },
  { id: "gst", label: "GST" },
  { id: "tds", label: "TDS" },
  { id: "employee", label: "Employee Payable" },
  { id: "loan", label: "Loan" },
  { id: "fixed_asset", label: "Fixed Asset" },
] as const;
