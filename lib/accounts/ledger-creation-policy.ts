import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  canAddLedgerUnder,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";

/** Sub-groups whose party/product ledgers are owned by ERP Masters — not created as COA rows. */
export function isMasterOwnedSubGroup(node: ChartOfAccount): boolean {
  // Bank accounts still use Banking master for bank ledgers; COA Add Ledger stays generic.
  void node;
  return false;
}

export function isGstLedgerParent(node: ChartOfAccount): boolean {
  if (node.nodeLevel !== "account_group") return false;
  const name = node.accountName.toLowerCase();
  return name.includes("duties & taxes") || name.includes("gst");
}

export function isTdsLedgerParent(node: ChartOfAccount, _records: ChartOfAccount[]): boolean {
  if (node.nodeLevel !== "account_group") return false;
  return node.accountName.toLowerCase().includes("tds");
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
