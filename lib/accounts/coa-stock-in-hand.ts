/**
 * Chart of Accounts — Stock in Hand / Inventory classification helpers.
 * Balances come from the ledger balances API (same as every other ledger).
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { MANDATORY_SYSTEM_LEDGERS } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-statutory-ledgers";

const STOCK_IN_HAND_NAME = MANDATORY_SYSTEM_LEDGERS.stockInHand.name.toLowerCase();

export function isStockInHandLedger(
  node: Pick<ChartOfAccount, "nodeLevel" | "accountName">,
): boolean {
  if (node.nodeLevel != null && node.nodeLevel !== "ledger") return false;
  return (node.accountName ?? "").trim().toLowerCase() === STOCK_IN_HAND_NAME;
}

/** Assets → Current Assets → Inventory (system-controlled; no user-created children). */
export function isInventoryCoaGroup(
  node: Pick<ChartOfAccount, "nodeLevel" | "accountName" | "specializedGroupType">,
): boolean {
  if (node.nodeLevel !== "account_group") return false;
  if (node.specializedGroupType === "inventory") return true;
  const name = (node.accountName ?? "").trim().toLowerCase();
  return name === "inventory" || name === "inventory / stock-in-hand";
}
