import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { resolveCoaLedgerBehavior } from "@/lib/accounts/coa-ledger-behavior";
import {
  isGstDutiesContext,
  isTdsGroupContext,
  isTdsPayableContext,
  isTdsReceivableContext,
} from "@/lib/accounts/coa-specialized-groups";

export {
  isGstDutiesContext,
  isTdsGroupContext,
  isTdsPayableContext,
  isTdsReceivableContext,
} from "@/lib/accounts/coa-specialized-groups";

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
  _node: ChartOfAccount,
  _records: ChartOfAccount[],
): string {
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
 * Users may create Level-4 ledgers under any eligible Level-3 subgroup.
 * Customers, suppliers, products, warehouses, GST rates, and TDS sections are
 * not created as separate COA ledgers — they stay in ERP Masters.
 */
export function resolveCoaAddLedgerPolicy(
  _node: ChartOfAccount,
  _records: ChartOfAccount[],
): CoaAddLedgerPolicy {
  return { blocked: false, alternatives: [] };
}

export function isAddLedgerBlocked(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveCoaAddLedgerPolicy(node, records).blocked;
}
