/**
 * Chart of Accounts — Stock in Hand (Inventory) helpers.
 * Warehouse remains the operational source of truth; COA only shows financial inventory value.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { MANDATORY_SYSTEM_LEDGERS } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-statutory-ledgers";
import { getInventoryDashboardMetrics } from "@/lib/accounts/inventory-accounting-data";
import type { LedgerBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";

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

/**
 * Display balance for Stock in Hand in COA — ERP total inventory value (Debit).
 * Does not alter voucher posting or Trial Balance / Balance Sheet engines.
 */
export function resolveStockInHandDisplayBalance(asOnDate?: string): LedgerBalance {
  const value = getInventoryDashboardMetrics(asOnDate).totalInventoryValue;
  const amount = Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;
  return { amount, balanceType: "Debit" };
}
