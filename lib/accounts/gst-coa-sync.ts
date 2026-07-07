/**
 * GST Master → Chart of Accounts synchronization (Accounts module only).
 * Reads GST Master from localStorage; creates / updates / deactivates rate-specific GST ledgers.
 *
 * Ledger naming: Input CGST (GST 18%), Output SGST (GST 5%), etc.
 * The bracketed rate is the total GST Master percentage, not the component split.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  loadChartOfAccounts,
  loadChartOfAccountsCore,
  nextId,
  saveChartOfAccounts,
} from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { loadGSTMasters, type GSTMaster } from "@/app/(app)/masters/gst/gst-data";
import { ledgerHasVoucherPostings } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export const GST_ERP_SOURCE = "gst_master";
export const GST_INPUT_CREDIT_GROUP = "GST Input Credit";
export const GST_DUTIES_SUBGROUP = "Duties & Taxes Payable";

export type GstLedgerKind =
  | "input_cgst"
  | "input_sgst"
  | "input_igst"
  | "output_cgst"
  | "output_sgst"
  | "output_igst";

const GST_KINDS: GstLedgerKind[] = [
  "input_cgst",
  "input_sgst",
  "input_igst",
  "output_cgst",
  "output_sgst",
  "output_igst",
];

const GST_SYNC_META_KEY = "ds_gst_coa_sync_v2";

export function formatGstPctLabel(pct: number): string {
  if (Number.isInteger(pct)) return String(pct);
  return pct.toFixed(2).replace(/\.?0+$/, "");
}

/** Generic pre-sync ledgers — deactivated when rate-specific ledgers exist (if no postings). */
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

export function gstLedgerKindAlias(kind: GstLedgerKind): string {
  return `gst:${kind}`;
}

/** e.g. Input CGST (GST 18%), Output IGST (GST 5%) */
export function formatGstLedgerName(kind: GstLedgerKind, gstRatePct: number): string {
  const prefix = kind.startsWith("input") ? "Input" : "Output";
  const component = kind.includes("cgst") ? "CGST" : kind.includes("sgst") ? "SGST" : "IGST";
  return `${prefix} ${component} (GST ${formatGstPctLabel(gstRatePct)}%)`;
}

/** Parse total GST rate from ledger name — supports new and legacy component-percent formats. */
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

export function isRateSpecificGstLedgerName(name: string): boolean {
  return /^(Input|Output)\s+(CGST|SGST|IGST)\s+\(GST\s+[\d.]+%\)$/i.test(name.trim());
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
    pathNames.includes(GST_INPUT_CREDIT_GROUP) || pathNames.includes(GST_DUTIES_SUBGROUP);

  if (underGstGroups && LEGACY_GENERIC_GST_LEDGER_NAMES.has(name.toLowerCase())) {
    return true;
  }

  return false;
}

function findAccountGroup(records: ChartOfAccount[], name: string): ChartOfAccount | undefined {
  return records.find((r) => r.nodeLevel === "account_group" && r.accountName === name);
}

function findGstLedgerByMaster(
  records: ChartOfAccount[],
  masterId: number,
  kind: GstLedgerKind,
): ChartOfAccount | undefined {
  return records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.erpSourceModule === GST_ERP_SOURCE &&
      r.erpSourceId === masterId &&
      r.alias === gstLedgerKindAlias(kind),
  );
}

function findGstLedgerByName(records: ChartOfAccount[], name: string): ChartOfAccount | undefined {
  return records.find(
    (r) => r.nodeLevel === "ledger" && r.accountName.toLowerCase() === name.toLowerCase(),
  );
}

function parentGroupForKind(
  records: ChartOfAccount[],
  kind: GstLedgerKind,
): ChartOfAccount | undefined {
  if (kind.startsWith("input")) {
    return findAccountGroup(records, GST_INPUT_CREDIT_GROUP);
  }
  return findAccountGroup(records, GST_DUTIES_SUBGROUP);
}

function ledgerSpecForKind(
  master: GSTMaster,
  kind: GstLedgerKind,
  records: ChartOfAccount[],
): {
  parent: ChartOfAccount;
  name: string;
  accountType: ChartOfAccount["accountType"];
  balanceType: ChartOfAccount["balanceType"];
  gstRatePct: number;
} | null {
  const parent = parentGroupForKind(records, kind);
  if (!parent) return null;
  return {
    parent,
    name: formatGstLedgerName(kind, master.gstPercentage),
    accountType: kind.startsWith("input") ? "Asset" : "Liability",
    balanceType: kind.startsWith("input") ? "Debit" : "Credit",
    gstRatePct: master.gstPercentage,
  };
}

function createGstLedger(
  records: ChartOfAccount[],
  master: GSTMaster,
  kind: GstLedgerKind,
  spec: NonNullable<ReturnType<typeof ledgerSpecForKind>>,
): ChartOfAccount[] {
  const id = nextId(records);
  const ledger: ChartOfAccount = {
    id,
    accountCode: `LED-${String(id).padStart(4, "0")}`,
    accountName: spec.name,
    alias: gstLedgerKindAlias(kind),
    accountType: spec.accountType,
    nodeLevel: "ledger",
    parentAccountId: spec.parent.id,
    parentAccount: spec.parent.accountName,
    description: `GST @ ${master.gstPercentage}% — auto-synced from GST Master`,
    status: master.status,
    usedIn: kind.startsWith("input") ? ["procurement", "journal"] : ["sales", "journal"],
    isSystem: false,
    isSystemGenerated: true,
    erpSourceModule: GST_ERP_SOURCE,
    erpSourceId: master.id,
    openingBalance: 0,
    balanceType: spec.balanceType,
    gstApplicable: true,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: false,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  return [...records, ledger];
}

function patchLedger(
  records: ChartOfAccount[],
  ledgerId: number,
  patch: Partial<ChartOfAccount>,
): ChartOfAccount[] {
  return records.map((r) =>
    r.id === ledgerId ? { ...r, ...patch, updatedBy: ACCOUNTS_CURRENT_USER } : r,
  );
}

function applyLedgerSpec(
  records: ChartOfAccount[],
  ledgerId: number,
  spec: NonNullable<ReturnType<typeof ledgerSpecForKind>>,
  status: ChartOfAccount["status"],
): ChartOfAccount[] {
  return patchLedger(records, ledgerId, {
    accountName: spec.name,
    parentAccountId: spec.parent.id,
    parentAccount: spec.parent.accountName,
    accountType: spec.accountType,
    balanceType: spec.balanceType,
    status,
    isSystemGenerated: true,
  });
}

function syncMasterLedgers(records: ChartOfAccount[], master: GSTMaster): ChartOfAccount[] {
  let next = records;

  if (master.gstPercentage <= 0) {
    for (const kind of GST_KINDS) {
      const existing = findGstLedgerByMaster(next, master.id, kind);
      if (existing && existing.status === "active") {
        next = patchLedger(next, existing.id, { status: "inactive" });
      }
    }
    return next;
  }

  for (const kind of GST_KINDS) {
    const spec = ledgerSpecForKind(master, kind, next);
    if (!spec) continue;

    let existing = findGstLedgerByMaster(next, master.id, kind);

    if (!existing) {
      const byName = findGstLedgerByName(next, spec.name);
      if (byName) {
        existing = byName;
        next = patchLedger(next, byName.id, {
          alias: gstLedgerKindAlias(kind),
          erpSourceModule: GST_ERP_SOURCE,
          erpSourceId: master.id,
          isSystemGenerated: true,
          status: master.status,
        });
      }
    }

    if (!existing) {
      next = createGstLedger(next, master, kind, spec);
      continue;
    }

    const currentRate =
      parseGstRateFromLedgerName(existing.accountName) ?? master.gstPercentage;
    const targetStatus = master.status;
    const nameMatches = existing.accountName === spec.name;
    const rateMatches = Math.abs(currentRate - master.gstPercentage) < 0.001;

    if (!rateMatches || !nameMatches) {
      if (ledgerHasVoucherPostings(existing.id)) {
        next = patchLedger(next, existing.id, { status: "inactive" });
        if (!findGstLedgerByName(next, spec.name)) {
          next = createGstLedger(next, master, kind, spec);
        } else {
          const named = findGstLedgerByName(next, spec.name)!;
          next = patchLedger(next, named.id, {
            alias: gstLedgerKindAlias(kind),
            erpSourceModule: GST_ERP_SOURCE,
            erpSourceId: master.id,
            isSystemGenerated: true,
            status: targetStatus,
          });
        }
      } else {
        next = applyLedgerSpec(next, existing.id, spec, targetStatus);
        next = patchLedger(next, existing.id, {
          alias: gstLedgerKindAlias(kind),
          erpSourceModule: GST_ERP_SOURCE,
          erpSourceId: master.id,
        });
      }
      continue;
    }

    if (existing.status !== targetStatus) {
      next = patchLedger(next, existing.id, { status: targetStatus });
    }

    if (existing.parentAccountId !== spec.parent.id) {
      next = patchLedger(next, existing.id, {
        parentAccountId: spec.parent.id,
        parentAccount: spec.parent.accountName,
        accountType: spec.accountType,
        balanceType: spec.balanceType,
      });
    }
  }

  return next;
}

/** Deactivate generic GST ledgers superseded by rate-specific ones (preserves ledgers with postings). */
function deactivateLegacyGenericGstLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  const hasRateSpecific = records.some(
    (r) => r.nodeLevel === "ledger" && isRateSpecificGstLedgerName(r.accountName),
  );
  if (!hasRateSpecific) return records;

  let next = records;

  for (const ledger of records) {
    if (ledger.nodeLevel !== "ledger") continue;
    if (ledger.erpSourceModule === GST_ERP_SOURCE) continue;
    if (ledger.status !== "active") continue;

    const nameLower = ledger.accountName.trim().toLowerCase();
    if (!LEGACY_GENERIC_GST_LEDGER_NAMES.has(nameLower)) continue;

    const pathNames = getAncestorPath(records, ledger.id).map((p) => p.accountName);
    const underGst =
      pathNames.includes(GST_INPUT_CREDIT_GROUP) ||
      pathNames.includes(GST_DUTIES_SUBGROUP);
    if (!underGst) continue;

    if (ledgerHasVoucherPostings(ledger.id)) continue;

    next = patchLedger(next, ledger.id, {
      status: "inactive",
      description: ledger.description || "Superseded by rate-specific GST ledgers from GST Master",
    });
  }

  return next;
}

function fingerprintGstLedgers(records: ChartOfAccount[]): string {
  return JSON.stringify(
    records
      .filter(
        (r) =>
          r.nodeLevel === "ledger" &&
          (r.erpSourceModule === GST_ERP_SOURCE || isGstCoaLedger(r, records)),
      )
      .map((r) => ({ id: r.id, name: r.accountName, status: r.status }))
      .sort((a, b) => a.id - b.id),
  );
}

function runGstCoaSync(records: ChartOfAccount[]): ChartOfAccount[] {
  const inputGroup = findAccountGroup(records, GST_INPUT_CREDIT_GROUP);
  const outputGroup = findAccountGroup(records, GST_DUTIES_SUBGROUP);
  if (!inputGroup || !outputGroup) return records;

  const masters = loadGSTMasters();
  let next = records;

  for (const master of masters) {
    next = syncMasterLedgers(next, master);
  }

  return deactivateLegacyGenericGstLedgers(next);
}

function gstSyncCacheKey(records: ChartOfAccount[]): string {
  const masters = loadGSTMasters();
  return JSON.stringify({
    masters: masters.map((m) => ({
      id: m.id,
      pct: m.gstPercentage,
      status: m.status,
    })),
    gstLedgers: fingerprintGstLedgers(records),
  });
}

/** Apply GST Master → COA sync during load; persists when ledgers change. */
export function applyGstCoaSyncOnLoad(records: ChartOfAccount[]): ChartOfAccount[] {
  if (typeof window === "undefined") return records;

  const cacheKey = gstSyncCacheKey(records);
  if (localStorage.getItem(GST_SYNC_META_KEY) === cacheKey) {
    return records;
  }

  const before = fingerprintGstLedgers(records);
  const synced = runGstCoaSync(records);
  const after = fingerprintGstLedgers(synced);

  if (before !== after) {
    saveChartOfAccounts(synced);
  }

  localStorage.setItem(GST_SYNC_META_KEY, gstSyncCacheKey(synced));
  return synced;
}

/** Sync all GST Master rates to COA ledgers under GST Input Credit & Duties & Taxes Payable. */
export function syncGstCoaFromMaster(): boolean {
  if (typeof window === "undefined") return false;

  const core = loadChartOfAccountsCore();
  const before = fingerprintGstLedgers(core);
  const synced = applyGstCoaSyncOnLoad(core);
  return fingerprintGstLedgers(synced) !== before;
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

/** Resolve a rate-specific GST ledger for voucher posting (e.g. 18% → Output CGST (GST 18%)). */
export function resolveGstRateLedger(
  mappingKey: string,
  gstRatePct: number,
): ChartOfAccount | null {
  if (gstRatePct <= 0) return null;
  syncGstCoaFromMaster();

  const kind = mappingKeyToGstKind(mappingKey);
  if (!kind) return null;

  const masters = loadGSTMasters();
  const master =
    masters.find((m) => m.gstPercentage === gstRatePct) ??
    masters.find((m) => Math.abs(m.gstPercentage - gstRatePct) < 0.001);
  if (!master || master.status !== "active") return null;

  const spec = ledgerSpecForKind(master, kind, loadChartOfAccounts());
  if (!spec) return null;

  const records = loadChartOfAccounts();
  const linked = findGstLedgerByMaster(records, master.id, kind);
  if (linked?.status === "active") return linked;

  return (
    findGstLedgerByName(records, spec.name) ??
    records.find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountName === spec.name &&
        r.status === "active",
    ) ??
    null
  );
}
