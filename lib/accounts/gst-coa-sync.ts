/**
 * GST ledger helpers for Chart of Accounts (Accounts module).
 *
 * Statutory COA uses flat ledgers (Input CGST, Output IGST, etc.) — not one ledger per
 * GST Master rate. GST percentages and rules live in ERP GST Master; transaction posting
 * will target these statutory ledgers when integrated.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  GST_STATUTORY_LEDGER_BY_KIND,
  isRateSpecificGstLedgerName,
} from "@/app/(app)/accounts/masters/chart-of-accounts/coa-statutory-ledgers";

export const GST_ERP_SOURCE = "gst_master";
export const GST_INPUT_GROUP = "GST Input";
/** @deprecated Legacy asset subgroup — use GST_INPUT_GROUP */
export const GST_INPUT_CREDIT_GROUP = "GST Input Credit";
export const GST_DUTIES_SUBGROUP = "Duties & Taxes Payable";

export type GstLedgerKind =
  | "input_cgst"
  | "input_sgst"
  | "input_igst"
  | "output_cgst"
  | "output_sgst"
  | "output_igst";

const GST_SYNC_META_KEY = "ds_gst_coa_sync_v2";

/** Generic pre-sync ledgers superseded by statutory chart */
const LEGACY_GENERIC_GST_LEDGER_NAMES = new Set([
  "cgst payable",
  "sgst payable",
  "igst payable",
  "cgst receivable",
  "sgst receivable",
  "igst receivable",
  "gst input credit (cgst)",
  "gst input credit (sgst)",
  "gst input credit (igst)",
  "output cgst payable",
  "output sgst payable",
  "output igst payable",
  "custom duty payable",
]);

export { isRateSpecificGstLedgerName };

export function formatGstPctLabel(pct: number): string {
  if (Number.isInteger(pct)) return String(pct);
  return pct.toFixed(2).replace(/\.?0+$/, "");
}

export function gstLedgerKindAlias(kind: GstLedgerKind): string {
  return `gst:${kind}`;
}

/** @deprecated Rate-specific naming — retained for parsing legacy ledger names */
export function formatGstLedgerName(kind: GstLedgerKind, gstRatePct: number): string {
  const prefix = kind.startsWith("input") ? "Input" : "Output";
  const component = kind.includes("cgst") ? "CGST" : kind.includes("sgst") ? "SGST" : "IGST";
  return `${prefix} ${component} (GST ${formatGstPctLabel(gstRatePct)}%)`;
}

/** Parse total GST rate from legacy rate-specific ledger names */
export function parseGstRateFromLedgerName(name: string): number | null {
  const bracketed = name.match(/(?:Input|Output)\s+(?:CGST|SGST|IGST)\s+\(GST\s+([\d.]+)%\)/i);
  if (bracketed) return Number(bracketed[1]);

  const legacyComponent = name.match(/(?:Input|Output)\s+(?:CGST|SGST|IGST)\s+([\d.]+)%/i);
  if (legacyComponent) {
    const component = Number(legacyComponent[1]);
    const componentType = name.match(/(CGST|SGST|IGST)/i)?.[1]?.toUpperCase();
    if (componentType === "IGST") return component;
    return Math.round(component * 2 * 100) / 100;
  }

  return null;
}

export function isGstCoaLedger(ledger: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  if (ledger.erpSourceModule === GST_ERP_SOURCE) return true;
  if (ledger.nodeLevel !== "ledger") return false;

  const name = ledger.accountName.trim();
  if (isRateSpecificGstLedgerName(name)) return true;
  if (/^(Input|Output)\s+(CGST|SGST|IGST)\s+[\d.]+%$/i.test(name)) return true;

  const list = records ?? loadChartOfAccounts();
  const pathNames = getAncestorPath(list, ledger.id).map((p) => p.accountName);
  const underGstGroups =
    pathNames.includes(GST_INPUT_GROUP) ||
    pathNames.includes(GST_INPUT_CREDIT_GROUP) ||
    pathNames.includes(GST_DUTIES_SUBGROUP);

  if (underGstGroups && LEGACY_GENERIC_GST_LEDGER_NAMES.has(name.toLowerCase())) {
    return true;
  }

  return false;
}

/** No-op — rate-specific GST Master → COA sync is disabled (statutory flat ledgers). */
export function applyGstCoaSyncOnLoad(records: ChartOfAccount[]): ChartOfAccount[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GST_SYNC_META_KEY);
  }
  return records;
}

/** No-op — returns false (no ledgers created). */
export function syncGstCoaFromMaster(): boolean {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GST_SYNC_META_KEY);
  }
  return false;
}

export function mappingKeyToGstKind(mappingKey: string): GstLedgerKind | null {
  switch (mappingKey) {
    case "purchase_cgst":
      return "input_cgst";
    case "purchase_sgst":
      return "input_sgst";
    case "purchase_igst":
      return "input_igst";
    case "sales_cgst":
      return "output_cgst";
    case "sales_sgst":
      return "output_sgst";
    case "sales_igst":
      return "output_igst";
    default:
      return null;
  }
}

/** Resolve flat statutory GST ledger for voucher posting (rate is on the transaction, not the ledger). */
export function resolveGstRateLedger(
  mappingKey: string,
  _gstRatePct: number,
): ChartOfAccount | null {
  const kind = mappingKeyToGstKind(mappingKey);
  if (!kind) return null;

  const targetName = GST_STATUTORY_LEDGER_BY_KIND[kind];
  const records = loadChartOfAccounts();
  return (
    records.find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.status === "active" &&
        r.accountName.toLowerCase() === targetName.toLowerCase(),
    ) ?? null
  );
}
