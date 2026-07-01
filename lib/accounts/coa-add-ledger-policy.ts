import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

export interface CoaAddLedgerAlternative {
  label: string;
  href: string;
  variant?: "primary" | "outline";
}

export interface CoaAddLedgerPolicy {
  blocked: boolean;
  reason?: string;
  alternatives: CoaAddLedgerAlternative[];
}

const MASTER_OWNED_SUB_GROUPS = new Set([
  "Trade Receivables / Sundry Debtors",
  "Trade Payables / Sundry Creditors",
  "Bank Accounts",
  "Inventory / Stock-in-Hand",
]);

const FIXED_ASSET_SUB_GROUPS = new Set([
  "Land & Building",
  "Plant & Machinery",
  "Furniture & Fixtures",
  "Office Equipment",
  "Computers & IT Equipment",
  "Vehicles",
  "Intangible Assets",
]);

function pathNames(records: ChartOfAccount[], nodeId: number): string[] {
  return getAncestorPath(records, nodeId).map((p) => p.accountName);
}

function matchesAny(names: string[], targets: Set<string>): boolean {
  return names.some((n) => targets.has(n));
}

export function resolveCoaAddLedgerPolicy(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaAddLedgerPolicy {
  const names = [...pathNames(records, node.id), node.accountName];

  if (names.includes("TDS Payable")) {
    return {
      blocked: true,
      reason: "TDS section ledgers are provisioned from TDS Master configuration.",
      alternatives: [
        { label: "TDS Settings", href: "/masters/tds", variant: "primary" },
        { label: "TDS Party-wise Report", href: "/accounts/reports/tds-party-wise" },
      ],
    };
  }

  if (names.includes("Trade Receivables / Sundry Debtors")) {
    return {
      blocked: true,
      reason: "Customer ledgers are created from Customer Master.",
      alternatives: [
        { label: "Add Customer", href: "/masters/customers/new", variant: "primary" },
        { label: "View Customers", href: "/masters/customers" },
      ],
    };
  }

  if (names.includes("Trade Payables / Sundry Creditors")) {
    return {
      blocked: true,
      reason: "Supplier ledgers are created from Supplier Master.",
      alternatives: [
        { label: "Add Supplier", href: "/masters/vendors/new", variant: "primary" },
        { label: "View Suppliers", href: "/masters/vendors" },
      ],
    };
  }

  if (names.includes("Bank Accounts")) {
    return {
      blocked: true,
      reason: "Bank ledgers are managed in the Banking module.",
      alternatives: [
        { label: "Add Bank Account", href: "/accounts/banking/bank-accounts/new", variant: "primary" },
        { label: "View Bank Accounts", href: "/accounts/banking/bank-accounts" },
      ],
    };
  }

  if (names.includes("Inventory / Stock-in-Hand")) {
    return {
      blocked: true,
      reason: "Stock ledgers are linked to Product Master.",
      alternatives: [
        { label: "Open Product Master", href: "/masters/products", variant: "primary" },
        { label: "Open Stock Valuation", href: "/accounts/reports/stock-valuation" },
      ],
    };
  }

  if (matchesAny(names, FIXED_ASSET_SUB_GROUPS) || names.includes("Fixed Assets")) {
    return {
      blocked: true,
      reason: "Fixed asset ledgers are created from Asset Register.",
      alternatives: [
        { label: "Add Asset", href: "/accounts/fixed-assets/new", variant: "primary" },
        { label: "Open Asset Register", href: "/accounts/fixed-assets" },
      ],
    };
  }

  if (names.includes("Salary Payable")) {
    return {
      blocked: true,
      reason: "Salary payable ledgers are linked to Employee Master / Payroll.",
      alternatives: [
        { label: "Open Employee Master", href: "/masters/hr/employees", variant: "primary" },
        { label: "Open Payroll", href: "/accounts/payroll" },
      ],
    };
  }

  return { blocked: false, alternatives: [] };
}

export function isAddLedgerBlocked(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveCoaAddLedgerPolicy(node, records).blocked;
}
