/**
 * Removes misplaced duplicate GST ledgers from stored COA.
 * Input GST belongs only under GST Input Credit; output GST only under Duties & Taxes Payable.
 */

import type { ChartOfAccount } from "../../data";

const GST_INPUT_CREDIT_LEDGER_NAMES = new Set([
  "gst input credit (cgst)",
  "gst input credit (sgst)",
  "gst input credit (igst)",
]);

const GST_OUTPUT_COMPONENT_NAMES = new Set([
  "output cgst payable",
  "output sgst payable",
  "output igst payable",
  "cgst payable",
  "sgst payable",
  "igst payable",
]);

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

/** Drop GST ledgers sitting under the wrong COA groups (e.g. demo bundle duplicates). */
export function stripMisplacedGstLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  return records.filter((r) => {
    if (r.nodeLevel !== "ledger") return true;
    if (r.erpSourceModule === "gst_master") return true;

    const pathNames = ancestorNames(records, r.id);
    const nameLower = r.accountName.trim().toLowerCase();

    if (GST_INPUT_CREDIT_LEDGER_NAMES.has(nameLower)) {
      return isUnderGroup(pathNames, "GST Input Credit");
    }

    if (GST_OUTPUT_COMPONENT_NAMES.has(nameLower)) {
      if (isUnderGroup(pathNames, "GST Payable")) return false;
      if (isUnderGroup(pathNames, "Duties & Taxes Payable")) return true;
      return false;
    }

    return true;
  });
}
