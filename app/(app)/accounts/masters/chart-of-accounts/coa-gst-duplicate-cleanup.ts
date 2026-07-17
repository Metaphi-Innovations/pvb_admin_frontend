/**
 * Removes misplaced duplicate GST ledgers from stored COA.
 * Statutory input GST belongs under Assets → Current Assets → Duties & Taxes;
 * output GST / TDS / TCS under Liabilities → Current Liabilities → Duties & Taxes.
 * Rate-suffixed ledgers (e.g. Input CGST (GST 5%)) from legacy GST Master sync are removed.
 */

import type { ChartOfAccount } from "../../data";
import {
  DUTIES_DIRECT_STATUTORY_LEDGER_NAMES,
  GST_INPUT_LEDGER_NAMES,
  GST_OUTPUT_LEDGER_NAMES,
  isRateSpecificGstLedgerName,
  LEGACY_GST_LEDGER_NAMES,
} from "./coa-statutory-ledgers";

function ancestorNames(records: ChartOfAccount[], nodeId: number): string[] {
  const names: string[] = [];
  let current = records.find((r) => r.id === nodeId);
  while (current?.parentAccountId != null) {
    const parent = records.find((r) => r.id === current!.parentAccountId);
    if (!parent) break;
    names.unshift(parent.accountName);
    current = parent;
  }
  return names;
}

function isUnderGroup(pathNames: string[], groupName: string): boolean {
  return pathNames.includes(groupName);
}

function isUnderGstInput(pathNames: string[]): boolean {
  return (
    pathNames.includes("Duties & Taxes") ||
    pathNames.includes("GST Input") ||
    pathNames.includes("GST Input Credit")
  );
}

function isUnderGstOutput(pathNames: string[]): boolean {
  return (
    pathNames.includes("Duties & Taxes") ||
    pathNames.includes("GST Output") ||
    pathNames.includes("GST Payable")
  );
}

/** Drop GST ledgers sitting under the wrong COA groups (e.g. demo bundle duplicates). */
export function stripMisplacedGstLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  return records.filter((r) => {
    if (r.nodeLevel !== "ledger") return true;

    if (r.isSystem && r.isSystemGenerated) return true;

    if (r.erpSourceModule === "gst_master") return false;

    const pathNames = ancestorNames(records, r.id);
    const nameLower = r.accountName.trim().toLowerCase();

    if (isRateSpecificGstLedgerName(r.accountName)) {
      const parent = r.parentAccountId != null ? records.find((p) => p.id === r.parentAccountId) : null;
      const parentName = parent?.accountName.trim().toLowerCase() ?? "";
      if (GST_INPUT_LEDGER_NAMES.has(parentName) || GST_OUTPUT_LEDGER_NAMES.has(parentName)) {
        return true;
      }
      return false;
    }

    if (GST_INPUT_LEDGER_NAMES.has(nameLower)) {
      return isUnderGstInput(pathNames);
    }

    if (GST_OUTPUT_LEDGER_NAMES.has(nameLower)) {
      return isUnderGstOutput(pathNames);
    }

    if (DUTIES_DIRECT_STATUTORY_LEDGER_NAMES.has(nameLower)) {
      return (
        isUnderGroup(pathNames, "Duties & Taxes") ||
        isUnderGroup(pathNames, "Duties & Taxes Payable")
      );
    }

    if (LEGACY_GST_LEDGER_NAMES.has(nameLower)) {
      if (isUnderGroup(pathNames, "GST Payable")) return false;
      if (isUnderGroup(pathNames, "GST Output")) return false;
      if (isUnderGstInput(pathNames)) return false;
      if (isUnderGroup(pathNames, "Duties & Taxes Payable")) return false;
      return true;
    }

    return true;
  });
}
