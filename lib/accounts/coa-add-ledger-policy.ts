import type { ChartOfAccount } from "@/app/(app)/accounts/data";

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

export const SUNDRY_DEBTORS_GROUP_NAME = "Trade Receivables / Sundry Debtors";
export const SUNDRY_DEBTORS_ADD_LEDGER_HREF =
  "/accounts/masters/chart-of-accounts/sundry-debtors/new";

export const SUNDRY_CREDITORS_GROUP_NAME = "Trade Payables / Sundry Creditors";
export const SUNDRY_CREDITORS_ADD_LEDGER_HREF =
  "/accounts/masters/chart-of-accounts/sundry-creditors/new";

export const LAND_BUILDING_GROUP_NAME = "Land & Building";
export const LAND_BUILDING_ADD_WAREHOUSE_HREF =
  "/accounts/masters/chart-of-accounts/land-building/new";

const FIXED_ASSET_SUB_GROUPS = new Set([
  "Plant & Machinery",
  "Furniture & Fixtures",
  "Office Equipment",
  "Computers & IT Equipment",
  "Vehicles",
  "Intangible Assets",
]);

/** Inline ancestor walk — avoids circular import with chart-of-accounts-data. */
function pathNames(records: ChartOfAccount[], nodeId: number): string[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const names: string[] = [];
  let current = byId.get(nodeId);
  while (current) {
    names.unshift(current.accountName);
    current =
      current.parentAccountId != null ? byId.get(current.parentAccountId) : undefined;
  }
  return names;
}

function matchesAny(names: string[], targets: Set<string>): boolean {
  return names.some((n) => targets.has(n));
}

function isSundryDebtorsName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === "trade receivables / sundry debtors" ||
    n === "sundry debtors" ||
    n.includes("sundry debtors")
  );
}

/** True when the node is (or sits under) Trade Receivables / Sundry Debtors. */
export function isSundryDebtorsGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (isSundryDebtorsName(node.accountName)) return true;
  return pathNames(records, node.id).some(isSundryDebtorsName);
}

function isSundryCreditorsName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === "trade payables / sundry creditors" ||
    n === "sundry creditors" ||
    n.includes("sundry creditors")
  );
}

/** True when the node is (or sits under) Trade Payables / Sundry Creditors. */
export function isSundryCreditorsGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (isSundryCreditorsName(node.accountName)) return true;
  return pathNames(records, node.id).some(isSundryCreditorsName);
}

function isLandBuildingName(name: string): boolean {
  return name.trim().toLowerCase() === "land & building";
}

/** True when the node is (or sits under) Land & Building. */
export function isLandBuildingGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (isLandBuildingName(node.accountName)) return true;
  return pathNames(records, node.id).some(isLandBuildingName);
}

export function landBuildingAddWarehouseHref(parentGroupId?: number | null): string {
  if (parentGroupId != null && Number.isFinite(parentGroupId)) {
    return `${LAND_BUILDING_ADD_WAREHOUSE_HREF}?parent=${parentGroupId}`;
  }
  return LAND_BUILDING_ADD_WAREHOUSE_HREF;
}

/** Primary add action label for COA toolbar / node detail. */
export function resolveCoaAddActionLabel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): string {
  if (isLandBuildingGroup(node, records)) return "Add Warehouse";
  if (isSundryDebtorsGroup(node, records)) return "Add Customer";
  if (isSundryCreditorsGroup(node, records)) return "Add Supplier";
  return "Add Ledger";
}

export function sundryCreditorsAddLedgerHref(parentGroupId?: number | null): string {
  if (parentGroupId != null && Number.isFinite(parentGroupId)) {
    return `${SUNDRY_CREDITORS_ADD_LEDGER_HREF}?parent=${parentGroupId}`;
  }
  return SUNDRY_CREDITORS_ADD_LEDGER_HREF;
}

export function sundryDebtorsAddLedgerHref(parentGroupId?: number | null): string {
  if (parentGroupId != null && Number.isFinite(parentGroupId)) {
    return `${SUNDRY_DEBTORS_ADD_LEDGER_HREF}?parent=${parentGroupId}`;
  }
  return SUNDRY_DEBTORS_ADD_LEDGER_HREF;
}

export function resolveCoaAddLedgerPolicy(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaAddLedgerPolicy {
  const names = [...pathNames(records, node.id), node.accountName];

  if (names.includes("TDS Receivable")) {
    return {
      blocked: true,
      reason: "TDS receivable ledgers are maintained from ERP TDS Master (integrated later).",
      alternatives: [
        { label: "TDS Settings", href: "/masters/tds", variant: "primary" },
        { label: "TDS Summary", href: "/accounts/reports/tds-party-wise" },
      ],
    };
  }

  if (
    names.includes("Duties & Taxes Payable") ||
    names.includes("GST Output") ||
    names.includes("GST Payable")
  ) {
    return {
      blocked: true,
      reason: "GST tax ledgers are auto-created from GST Master configuration.",
      alternatives: [
        { label: "GST Master", href: "/masters/gst", variant: "primary" },
        { label: "GST Summary", href: "/accounts/reports/gst" },
      ],
    };
  }

  if (names.includes("GST Input Credit")) {
    return {
      blocked: true,
      reason: "GST input credit ledgers are auto-created from GST Master configuration.",
      alternatives: [
        { label: "GST Master", href: "/masters/gst", variant: "primary" },
        { label: "GST Summary", href: "/accounts/reports/gst" },
      ],
    };
  }

  // Sundry Debtors: not blocked — Add Ledger opens Accounts Customer form
  // (see CoaAddLedgerHost / ChartOfAccountsPageClient).

  // Sundry Creditors: not blocked — Add Ledger opens Accounts Supplier form
  // (see CoaAddLedgerHost / ChartOfAccountsPageClient).

  // Land & Building: not blocked — Add Warehouse opens ERP Warehouse Master form
  // (see CoaAddLedgerHost / ChartOfAccountsPageClient).
  if (isLandBuildingGroup(node, records)) {
    return { blocked: false, alternatives: [] };
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
