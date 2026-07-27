import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { resolveCoaLedgerBehavior } from "@/lib/accounts/coa-ledger-behavior";
import {
  isGstDutiesContext,
  isTdsGroupContext,
  isTdsPayableContext,
  isTdsReceivableContext,
} from "@/lib/accounts/coa-specialized-groups";
import {
  isStatutoryTaxPayableParent,
  isStatutoryTaxSectionProjection,
  isTcsPayableParentNode,
  isTdsPayableParentNode,
} from "@/lib/accounts/coa-statutory-tax-display";
import { isInventoryCoaGroup } from "@/lib/accounts/coa-stock-in-hand";
import { isLockedSystemLedger } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-statutory-ledgers";

export {
  isGstDutiesContext,
  isTdsGroupContext,
  isTdsPayableContext,
  isTdsReceivableContext,
} from "@/lib/accounts/coa-specialized-groups";

/** Compact UI / save-layer message for statutory containers. */
export const STATUTORY_NO_MANUAL_LEDGER_REASON =
  "System-managed statutory group. Manual ledger creation is not allowed.";

/** Stable account codes for Duties & Taxes (Assets + Liabilities). */
export const STATUTORY_DUTIES_TAXES_CODES = new Set(["1220", "2311"]);

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

/** L3 group for customer / party receivable ledgers (Indian COA). */
export const SUNDRY_DEBTORS_GROUP_NAME = "Sundry Debtors";
export const SUNDRY_DEBTORS_ADD_LEDGER_HREF =
  "/accounts/masters/chart-of-accounts/sundry-debtors/new";

/** L3 group for vendor / party payable ledgers (Indian COA). */
export const SUNDRY_CREDITORS_GROUP_NAME = "Sundry Creditors";
export const SUNDRY_CREDITORS_ADD_LEDGER_HREF =
  "/accounts/masters/chart-of-accounts/sundry-creditors/new";

export const LAND_BUILDING_GROUP_NAME = "Land & Building";
export const LAND_BUILDING_ADD_WAREHOUSE_HREF =
  "/accounts/masters/chart-of-accounts/land-building/new";

export const TDS_ADD_LEDGER_HREF = "/accounts/masters/chart-of-accounts/tds/new";

/** True when the node is (or sits under) Sundry Debtors. */
export function isSundryDebtorsGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return resolveCoaLedgerBehavior(node, records).kind === "customer";
}

/** True when the node is (or sits under) Sundry Creditors. */
export function isSundryCreditorsGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return resolveCoaLedgerBehavior(node, records).kind === "vendor";
}

/** True when the node is (or sits under) Land & Building. */
export function isLandBuildingGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return resolveCoaLedgerBehavior(node, records).kind === "warehouse";
}

/** True when the node is (or sits under) a TDS Payable or TDS Receivable group. */
export function isTdsSpecializedGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return resolveCoaLedgerBehavior(node, records).kind === "tds";
}

export function tdsAddLedgerHref(parentGroupId?: number | null): string {
  if (parentGroupId != null && Number.isFinite(parentGroupId)) {
    return `${TDS_ADD_LEDGER_HREF}?parent=${parentGroupId}`;
  }
  return TDS_ADD_LEDGER_HREF;
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
  // Cash-in-Hand only — keep shared label for every other group.
  if (resolveCoaLedgerBehavior(node, records).kind === "cash") {
    return "Add Cash Ledger";
  }
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

/**
 * True for statutory / system-controlled COA containers that must never accept
 * user-created Generic (or specialized) ledgers:
 * - Duties & Taxes (Assets Input GST + Liabilities Output GST)
 * - TDS Payable / TCS Payable
 * - Master-projected TDS/TCS section nodes
 *
 * Detection prefers stable codes + specializedGroupType / behavior rules,
 * with name/alias fallbacks for older saved charts.
 */
export function isStatutoryNoManualLedgerParent(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (isStatutoryTaxPayableParent(node) || isStatutoryTaxSectionProjection(node)) {
    return true;
  }
  if (isTdsPayableParentNode(node) || isTcsPayableParentNode(node)) {
    return true;
  }
  if (STATUTORY_DUTIES_TAXES_CODES.has(node.accountCode)) {
    return true;
  }
  const gstTypes = new Set([
    "gst_input",
    "gst_output",
    "gst_payable",
    "gst_receivable",
    "gst_duties",
  ]);
  if (node.specializedGroupType && gstTypes.has(node.specializedGroupType)) {
    return true;
  }
  // Ancestor / alias resolution (covers children of Duties & Taxes if ever groups)
  if (resolveCoaLedgerBehavior(node, records).kind === "gst") {
    return true;
  }
  if (isGstDutiesContext(node, records)) {
    return true;
  }
  return false;
}

/**
 * Users may create Level-4 ledgers under any eligible Level-3 subgroup.
 * Customers, suppliers, products, warehouses, GST rates, and TDS/TCS sections are
 * not created as separate COA ledgers — they stay in ERP Masters.
 * Inventory is system-controlled (Stock in Hand only) — no manual inventory ledgers.
 * Statutory Duties & Taxes / TDS / TCS containers reject all manual children.
 */
export function resolveCoaAddLedgerPolicy(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaAddLedgerPolicy {
  if (isStatutoryTaxSectionProjection(node) || isStatutoryTaxPayableParent(node)) {
    return {
      blocked: true,
      reason: STATUTORY_NO_MANUAL_LEDGER_REASON,
      alternatives: [],
    };
  }
  if (isStatutoryNoManualLedgerParent(node, records)) {
    return {
      blocked: true,
      reason: STATUTORY_NO_MANUAL_LEDGER_REASON,
      alternatives: [],
    };
  }
  if (isInventoryCoaGroup(node)) {
    return {
      blocked: true,
      reason:
        "Inventory is system-controlled. Stock in Hand reflects total inventory value from Warehouse — do not create inventory ledgers here.",
      alternatives: [],
    };
  }
  return { blocked: false, alternatives: [] };
}

export function isAddLedgerBlocked(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveCoaAddLedgerPolicy(node, records).blocked;
}

/** Approved statutory GST / TDS / TCS ledger under Duties & Taxes (system seed). */
function isApprovedStatutoryChildLedger(ledger: ChartOfAccount): boolean {
  if (isLockedSystemLedger(ledger)) return true;
  if (isStatutoryTaxSectionProjection(ledger)) return true;
  if (isStatutoryTaxPayableParent(ledger)) return true;
  return false;
}

export interface InvalidManualStatutoryChild {
  id: number;
  accountName: string;
  accountCode: string;
  parentGroupId: number | null;
  parentGroupName: string;
  isSystem: boolean;
  isSystemGenerated: boolean;
  erpSourceModule: string | null | undefined;
  ledgerKind: string | null | undefined;
  hasTransactionUsage: boolean | null;
}

/**
 * Report-only: list non-approved ledgers currently parented under statutory groups.
 * Does not delete or move anything.
 */
export function findInvalidManualStatutoryChildren(
  records: ChartOfAccount[],
  options?: {
    ledgerHasTransactions?: (ledgerId: number) => boolean;
  },
): InvalidManualStatutoryChild[] {
  const result: InvalidManualStatutoryChild[] = [];
  for (const ledger of records) {
    if (ledger.nodeLevel !== "ledger") continue;
    if (isApprovedStatutoryChildLedger(ledger)) continue;
    const parentId = ledger.parentAccountId;
    if (parentId == null) continue;
    const parent = records.find((r) => r.id === parentId);
    if (!parent) continue;
    if (!isStatutoryNoManualLedgerParent(parent, records)) continue;
    result.push({
      id: ledger.id,
      accountName: ledger.accountName,
      accountCode: ledger.accountCode,
      parentGroupId: parentId,
      parentGroupName: parent.accountName,
      isSystem: Boolean(ledger.isSystem),
      isSystemGenerated: Boolean(ledger.isSystemGenerated),
      erpSourceModule: ledger.erpSourceModule,
      ledgerKind: ledger.ledgerKind ?? null,
      hasTransactionUsage:
        options?.ledgerHasTransactions != null
          ? options.ledgerHasTransactions(ledger.id)
          : null,
    });
  }
  return result;
}
