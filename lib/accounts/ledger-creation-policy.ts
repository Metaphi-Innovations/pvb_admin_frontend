import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  canAddLedgerUnder,
  getAncestorPath,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { isBankAccountsSubGroup, isBankGroupNode } from "@/lib/accounts/bank-coa-utils";

/** Sub-groups whose ledgers are owned by other ERP masters — not manually created in COA/Ledgers. */
export function isMasterOwnedSubGroup(node: ChartOfAccount): boolean {
  if (isBankAccountsSubGroup(node) || isBankGroupNode(node)) return true;
  if (node.nodeLevel !== "sub_group") return false;
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
  if (node.nodeLevel !== "sub_group") return false;
  const name = node.accountName.toLowerCase();
  return name.includes("gst payable") || name.includes("duties & taxes");
}

function isExpenseLedgerParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const path = getAncestorPath(records, node.id);
  return path.some((p) => p.accountType === "Expense" || p.accountName === "Expenses");
}

/** Chart of Accounts is view-only — no ledger creation from COA UI. */
export function canAddLedgerFromCoa(_node: ChartOfAccount, _records: ChartOfAccount[]): boolean {
  return false;
}

/** Ledgers page is view-only in demo — balances from ERP masters and postings. */
export function canAddLedgerFromLedgersPage(_node: ChartOfAccount, _records: ChartOfAccount[]): boolean {
  return false;
}

export const LEDGER_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "customer", label: "Customer" },
  { id: "vendor", label: "Vendor" },
  { id: "bank", label: "Bank" },
  { id: "cash", label: "Cash" },
  { id: "expense", label: "Expense" },
  { id: "gst", label: "GST" },
  { id: "employee", label: "Employee Payable" },
  { id: "loan", label: "Loan" },
  { id: "fixed_asset", label: "Fixed Asset" },
] as const;
