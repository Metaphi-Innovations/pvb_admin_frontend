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

export const SUNDRY_DEBTORS_GROUP_NAME = "Trade Receivables / Sundry Debtors";
export const SUNDRY_DEBTORS_ADD_LEDGER_HREF =
  "/accounts/masters/chart-of-accounts/sundry-debtors/new";

export const SUNDRY_CREDITORS_GROUP_NAME = "Trade Payables / Sundry Creditors";
export const SUNDRY_CREDITORS_ADD_LEDGER_HREF =
  "/accounts/masters/chart-of-accounts/sundry-creditors/new";

export const LAND_BUILDING_GROUP_NAME = "Land & Building";
export const LAND_BUILDING_ADD_WAREHOUSE_HREF =
  "/accounts/masters/chart-of-accounts/land-building/new";

export const TDS_ADD_LEDGER_HREF = "/accounts/masters/chart-of-accounts/tds/new";

/** True when the node is (or sits under) Trade Receivables / Sundry Debtors. */
export function isSundryDebtorsGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return resolveCoaLedgerBehavior(node, records).kind === "customer";
}

/** True when the node is (or sits under) Trade Payables / Sundry Creditors. */
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
  const behavior = resolveCoaLedgerBehavior(node, records);
  return behavior.kind === "generic" ? "Add Ledger" : `Add ${behavior.label}`;
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
  const behavior = resolveCoaLedgerBehavior(node, records);
  if (behavior.kind === "gst" || behavior.kind === "tds") {
    return {
      blocked: true,
      reason: "System Generated - Managed from ERP Masters",
      alternatives: [],
    };
  }
  return { blocked: false, alternatives: [] };
}

export function isAddLedgerBlocked(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveCoaAddLedgerPolicy(node, records).blocked;
}
