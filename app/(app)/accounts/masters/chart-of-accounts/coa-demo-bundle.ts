/**
 * Legacy COA demo-bundle helpers.
 * Demo ledger injection is permanently disabled — API tree is the source of truth.
 */

import type { ChartOfAccount } from "../../data";

export const COA_DEMO_SOURCE_MODULE = "coa_demo_bundle";

export function isBundledCoaDemoLedger(record: ChartOfAccount): boolean {
  return record.erpSourceModule === COA_DEMO_SOURCE_MODULE;
}

/** @deprecated Demo merge disabled — returns records unchanged. */
export function mergeBundledCoaDemoLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  return records;
}
