/**
 * GST ledger helpers for Chart of Accounts (Accounts module).
 *
 * Statutory COA uses flat ledgers (Input CGST, Output IGST, etc.) — not one ledger per
 * GST Master rate. GST percentages and rules live in ERP GST Master; transaction posting
 * will target these statutory ledgers when integrated.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { loadGSTMasters } from "@/app/(app)/masters/gst/gst-data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { isPostableNode } from "@/lib/accounts/coa-hierarchy";
import {
  GST_STATUTORY_LEDGER_BY_KIND,
  isRateSpecificGstLedgerName,
} from "@/app/(app)/accounts/masters/chart-of-accounts/coa-statutory-ledgers";

export const GST_ERP_SOURCE = "gst_master";
export const GST_INPUT_GROUP = "GST Input Credit";
export const GST_INPUT_CREDIT_GROUP = GST_INPUT_GROUP;
export const GST_DUTIES_SUBGROUP = "Duties & Taxes";

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
    pathNames.includes(GST_DUTIES_SUBGROUP) ||
    pathNames.includes("GST Payable");

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

function gstComponentLabel(kind: GstLedgerKind): string {
  if (kind.includes("cgst")) return "CGST";
  if (kind.includes("sgst")) return "SGST";
  return "IGST";
}

/** CGST/SGST use half the line GST rate; IGST uses the full line rate. */
export function gstComponentRate(kind: GstLedgerKind, totalGstRatePct: number): number {
  if (kind.includes("igst")) return totalGstRatePct;
  return Math.round((totalGstRatePct / 2) * 100) / 100;
}

/** Human-readable label for configuration errors, e.g. "Input SGST 9%". */
export function formatGstPostingLedgerDisplayName(
  mappingKey: string,
  totalGstRatePct: number,
): string {
  const kind = mappingKeyToGstKind(mappingKey);
  if (!kind) return mappingKey;
  const prefix = kind.startsWith("input") ? "Input" : "Output";
  const component = gstComponentLabel(kind);
  const pct = gstComponentRate(kind, totalGstRatePct);
  return `${prefix} ${component} ${formatGstPctLabel(pct)}%`;
}

function ledgerMatchesKind(ledger: ChartOfAccount, kind: GstLedgerKind): boolean {
  const name = ledger.accountName.trim();
  const component = gstComponentLabel(kind);
  const prefix = kind.startsWith("input") ? "Input" : "Output";
  if (name.toLowerCase() === GST_STATUTORY_LEDGER_BY_KIND[kind].toLowerCase()) return true;
  return new RegExp(`^${prefix}\\s+${component}\\b`, "i").test(name);
}

function ledgerNameMatchesGstRate(
  ledgerName: string,
  kind: GstLedgerKind,
  totalGstRatePct: number,
): boolean {
  const n = ledgerName.trim();
  const component = gstComponentLabel(kind);
  const prefix = kind.startsWith("input") ? "Input" : "Output";
  const expectedComponentPct = gstComponentRate(kind, totalGstRatePct);

  const bareMatch = n.match(/^(Input|Output)\s+(CGST|SGST|IGST)\s+([\d.]+)%$/i);
  if (bareMatch) {
    const type = bareMatch[2].toUpperCase();
    if (type !== component) return false;
    const pct = Number(bareMatch[3]);
    return Math.abs(pct - expectedComponentPct) < 0.001;
  }

  const parsedTotal = parseGstRateFromLedgerName(n);
  if (parsedTotal != null) {
    if (!new RegExp(`^${prefix}\\s+${component}`, "i").test(n)) return false;
    return Math.abs(parsedTotal - totalGstRatePct) < 0.001;
  }

  const bracketExpected = formatGstLedgerName(kind, totalGstRatePct);
  if (n.toLowerCase() === bracketExpected.toLowerCase()) return true;

  return false;
}

function collectDescendantLedgers(parentId: number, records: ChartOfAccount[]): ChartOfAccount[] {
  const out: ChartOfAccount[] = [];
  const queue = [parentId];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    for (const r of records) {
      if (r.nodeLevel === "ledger" && r.parentAccountId === pid) {
        out.push(r);
        queue.push(r.id);
      }
    }
  }
  return out;
}

function resolveFromGstMaster(
  kind: GstLedgerKind,
  totalGstRatePct: number,
  records: ChartOfAccount[],
): ChartOfAccount | null {
  const masters = loadGSTMasters().filter(
    (g) => g.status === "active" && Math.abs(g.gstPercentage - totalGstRatePct) < 0.001,
  );

  for (const g of masters) {
    let ledgerId: number | null | undefined = null;
    switch (kind) {
      case "input_cgst":
        ledgerId = g.inputCgstLedgerId;
        break;
      case "input_sgst":
        ledgerId = g.inputSgstLedgerId;
        break;
      case "input_igst":
        ledgerId = g.inputIgstLedgerId;
        break;
      case "output_cgst":
        ledgerId = g.outputCgstLedgerId;
        break;
      case "output_sgst":
        ledgerId = g.outputSgstLedgerId;
        break;
      case "output_igst":
        ledgerId = g.outputIgstLedgerId;
        break;
    }
    if (ledgerId == null) continue;
    const ledger = records.find((r) => r.id === ledgerId);
    if (ledger && isPostableNode(ledger, records)) return ledger;
  }

  return null;
}

function findMatchingPostableLedger(
  candidates: ChartOfAccount[],
  kind: GstLedgerKind,
  totalGstRatePct: number,
  records: ChartOfAccount[],
): ChartOfAccount | null {
  const matches = candidates
    .filter(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.status === "active" &&
        isPostableNode(r, records) &&
        ledgerMatchesKind(r, kind) &&
        ledgerNameMatchesGstRate(r.accountName, kind, totalGstRatePct),
    )
    .sort((a, b) => a.id - b.id);
  return matches[0] ?? null;
}

/**
 * Resolve an active posting leaf for a GST component and line rate.
 * Never returns a grouping ledger that has sub-ledgers.
 */
export function resolveGstRateLedger(
  mappingKey: string,
  gstRatePct: number,
): ChartOfAccount | null {
  const kind = mappingKeyToGstKind(mappingKey);
  if (!kind || gstRatePct <= 0) return null;

  const records = loadChartOfAccounts();
  const statutoryName = GST_STATUTORY_LEDGER_BY_KIND[kind];
  const parent = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.status === "active" &&
      r.accountName.toLowerCase() === statutoryName.toLowerCase(),
  );

  const fromMaster = resolveFromGstMaster(kind, gstRatePct, records);
  if (fromMaster) return fromMaster;

  if (parent) {
    const descendants = collectDescendantLedgers(parent.id, records);
    const underParent = findMatchingPostableLedger(descendants, kind, gstRatePct, records);
    if (underParent) return underParent;

    if (isPostableNode(parent, records)) {
      return parent;
    }
  }

  const globalCandidates = records.filter(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.status === "active" &&
      isPostableNode(r, records) &&
      ledgerMatchesKind(r, kind) &&
      isGstCoaLedger(r, records) &&
      (isRateSpecificGstLedgerName(r.accountName) ||
        /^(Input|Output)\s+(CGST|SGST|IGST)\s+[\d.]+%$/i.test(r.accountName.trim())),
  );

  return findMatchingPostableLedger(globalCandidates, kind, gstRatePct, records);
}
