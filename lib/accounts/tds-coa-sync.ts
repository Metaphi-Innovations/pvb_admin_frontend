/**
 * TDS Master → Chart of Accounts synchronization (Accounts module only).
 * Reads TDS Master from localStorage; creates / updates / deactivates section-specific TDS ledgers.
 *
 * Assets → Current Assets → TDS Receivable → Sec {code} - {name}
 * Liabilities → Current Liabilities → Duties & Taxes Payable → TDS Payable → Sec {code} - {name}
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
} from "@/app/(app)/accounts/data";
import {
  getTdsSectionCode,
  loadTDSMasters,
  type TDSMaster,
} from "@/app/(app)/masters/tds/tds-data";
import { ledgerHasVoucherPostings } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { dispatchCoaChanged } from "@/lib/accounts/coa-events";
import { parseTdsSectionCode } from "@/lib/accounts/tds-coa-utils";

export const TDS_ERP_SOURCE = "tds_master";
export const TDS_RECEIVABLE_GROUP = "TDS Receivable";
export const TDS_PAYABLE_GROUP = "TDS Payable";
export const TDS_DUTIES_GROUP = "Duties & Taxes Payable";

export type TdsLedgerKind = "payable" | "receivable";

const TDS_KINDS: TdsLedgerKind[] = ["payable", "receivable"];

const TDS_SYNC_META_KEY = "ds_tds_coa_sync_v2";

export function tdsLedgerKindAlias(kind: TdsLedgerKind): string {
  return `tds:${kind}`;
}

/** Standard section ledger name: Sec 194C - Contractor Payment */
export function formatTdsSectionLedgerName(sectionCode: string, sectionName: string): string {
  const code = sectionCode.trim().toUpperCase();
  const name = sectionName.trim();
  return name ? `Sec ${code} - ${name}` : `Sec ${code}`;
}

/** @deprecated Use formatTdsSectionLedgerName */
export function formatTdsLedgerName(_kind: TdsLedgerKind, sectionCode: string): string {
  return `Sec ${sectionCode.toUpperCase()}`;
}

export function isTdsCoaLedger(ledger: ChartOfAccount): boolean {
  if (ledger.erpSourceModule === TDS_ERP_SOURCE) return true;
  if (!ledger.isSystemGenerated) return false;
  if (/^Sec \d+/i.test(ledger.accountName.trim()) && parseTdsSectionCode(ledger.accountName)) {
    return true;
  }
  return /TDS (Payable|Receivable) - Sec \d+/i.test(ledger.accountName.trim());
}

function findAccountGroup(records: ChartOfAccount[], name: string): ChartOfAccount | undefined {
  return records.find((r) => r.nodeLevel === "account_group" && r.accountName === name);
}

function findTdsLedgerByMaster(
  records: ChartOfAccount[],
  masterId: number,
  kind: TdsLedgerKind,
): ChartOfAccount | undefined {
  return records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.erpSourceModule === TDS_ERP_SOURCE &&
      r.erpSourceId === masterId &&
      r.alias === tdsLedgerKindAlias(kind),
  );
}

function findTdsLedgerByName(records: ChartOfAccount[], name: string): ChartOfAccount | undefined {
  return records.find(
    (r) => r.nodeLevel === "ledger" && r.accountName.toLowerCase() === name.toLowerCase(),
  );
}

function ledgerUnderGroupNamed(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
  groupName: string,
): boolean {
  const target = groupName.toLowerCase();
  return getAncestorPath(records, ledger.id).some(
    (n) => n.accountName.toLowerCase() === target,
  );
}

function findLegacyTdsLedgerBySection(
  records: ChartOfAccount[],
  sectionCode: string,
  kind: TdsLedgerKind,
): ChartOfAccount | undefined {
  const code = sectionCode.toUpperCase();
  const parentGroup = kind === "receivable" ? TDS_RECEIVABLE_GROUP : TDS_PAYABLE_GROUP;

  return records.find((r) => {
    if (r.nodeLevel !== "ledger") return false;
    const parsed = parseTdsSectionCode(r.accountName);
    if (parsed !== code) return false;

    if (r.erpSourceModule === TDS_ERP_SOURCE && r.alias === tdsLedgerKindAlias(kind)) {
      return true;
    }

    if (ledgerUnderGroupNamed(r, records, parentGroup)) return true;

    const lower = r.accountName.toLowerCase();
    const legacyPrefix = kind === "receivable" ? "tds receivable" : "tds payable";
    return lower.includes(legacyPrefix) || lower.startsWith(`sec ${code.toLowerCase()}`);
  });
}

function parentGroupForKind(
  records: ChartOfAccount[],
  kind: TdsLedgerKind,
): ChartOfAccount | undefined {
  if (kind === "receivable") {
    return findAccountGroup(records, TDS_RECEIVABLE_GROUP);
  }
  return findAccountGroup(records, TDS_PAYABLE_GROUP);
}

function ensureTdsPayableGroupStructure(records: ChartOfAccount[]): ChartOfAccount[] {
  const duties = findAccountGroup(records, TDS_DUTIES_GROUP);
  const tdsPayable = findAccountGroup(records, TDS_PAYABLE_GROUP);
  if (!duties || !tdsPayable || tdsPayable.parentAccountId === duties.id) {
    return records;
  }
  return records.map((r) =>
    r.id === tdsPayable.id
      ? {
          ...r,
          parentAccountId: duties.id,
          parentAccount: duties.accountName,
          updatedBy: ACCOUNTS_CURRENT_USER,
        }
      : r,
  );
}

function ledgerSpecForKind(
  master: TDSMaster,
  kind: TdsLedgerKind,
  records: ChartOfAccount[],
): {
  parent: ChartOfAccount;
  name: string;
  accountType: ChartOfAccount["accountType"];
  balanceType: ChartOfAccount["balanceType"];
  sectionCode: string;
} | null {
  const parent = parentGroupForKind(records, kind);
  const sectionCode = getTdsSectionCode(master).toUpperCase();
  if (!parent || !sectionCode) return null;
  return {
    parent,
    name: formatTdsSectionLedgerName(sectionCode, master.sectionName),
    accountType: kind === "receivable" ? "Asset" : "Liability",
    balanceType: kind === "receivable" ? "Debit" : "Credit",
    sectionCode,
  };
}

function createTdsLedger(
  records: ChartOfAccount[],
  master: TDSMaster,
  kind: TdsLedgerKind,
  spec: NonNullable<ReturnType<typeof ledgerSpecForKind>>,
): ChartOfAccount[] {
  const id = nextId(records);
  const ledger: ChartOfAccount = {
    id,
    accountCode: `LED-${String(id).padStart(4, "0")}`,
    accountName: spec.name,
    alias: tdsLedgerKindAlias(kind),
    accountType: spec.accountType,
    nodeLevel: "ledger",
    parentAccountId: spec.parent.id,
    parentAccount: spec.parent.accountName,
    description: `TDS Section ${spec.sectionCode} — ${master.sectionName} (auto-synced from TDS Master)`,
    status: master.status,
    usedIn: kind === "receivable" ? ["payments", "journal"] : ["procurement", "payments", "journal"],
    isSystem: false,
    isSystemGenerated: true,
    erpSourceModule: TDS_ERP_SOURCE,
    erpSourceId: master.id,
    openingBalance: 0,
    balanceType: spec.balanceType,
    gstApplicable: false,
    tdsApplicable: true,
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

function adoptLegacyLedger(
  records: ChartOfAccount[],
  ledger: ChartOfAccount,
  master: TDSMaster,
  kind: TdsLedgerKind,
  spec: NonNullable<ReturnType<typeof ledgerSpecForKind>>,
): ChartOfAccount[] {
  return patchLedger(records, ledger.id, {
    alias: tdsLedgerKindAlias(kind),
    erpSourceModule: TDS_ERP_SOURCE,
    erpSourceId: master.id,
    isSystemGenerated: true,
    status: master.status,
    accountName: spec.name,
    parentAccountId: spec.parent.id,
    parentAccount: spec.parent.accountName,
    accountType: spec.accountType,
    balanceType: spec.balanceType,
    tdsApplicable: true,
    description: `TDS Section ${spec.sectionCode} — ${master.sectionName} (auto-synced from TDS Master)`,
  });
}

function syncMasterLedgers(records: ChartOfAccount[], master: TDSMaster): ChartOfAccount[] {
  let next = records;
  const sectionCode = getTdsSectionCode(master).toUpperCase();
  if (!sectionCode) return next;

  const targetStatus = master.status;

  for (const kind of TDS_KINDS) {
    const spec = ledgerSpecForKind(master, kind, next);
    if (!spec) continue;

    let existing =
      findTdsLedgerByMaster(next, master.id, kind) ??
      findLegacyTdsLedgerBySection(next, sectionCode, kind);

    if (!existing) {
      const byName = findTdsLedgerByName(next, spec.name);
      if (byName) {
        existing = byName;
        next = adoptLegacyLedger(next, byName, master, kind, spec);
      }
    } else if (existing.erpSourceModule !== TDS_ERP_SOURCE || existing.accountName !== spec.name) {
      next = adoptLegacyLedger(next, existing, master, kind, spec);
    }

    if (!existing) {
      next = createTdsLedger(next, master, kind, spec);
      continue;
    }

    existing = findTdsLedgerByMaster(next, master.id, kind) ?? existing;
    const nameSection = parseTdsSectionCode(existing.accountName);
    const sectionChanged = nameSection != null && nameSection !== spec.sectionCode;

    if (sectionChanged || existing.accountName !== spec.name) {
      if (ledgerHasVoucherPostings(existing.id)) {
        if (existing.status === "active") {
          next = patchLedger(next, existing.id, { status: "inactive" });
        }
        const replacement = findTdsLedgerByName(next, spec.name);
        if (!replacement) {
          next = createTdsLedger(next, master, kind, spec);
        } else if (replacement.status !== targetStatus) {
          next = patchLedger(next, replacement.id, { status: targetStatus });
        }
      } else {
        next = patchLedger(next, existing.id, {
          accountName: spec.name,
          parentAccountId: spec.parent.id,
          parentAccount: spec.parent.accountName,
          accountType: spec.accountType,
          balanceType: spec.balanceType,
          status: targetStatus,
          description: `TDS Section ${spec.sectionCode} — ${master.sectionName} (auto-synced from TDS Master)`,
        });
      }
      continue;
    }

    if (existing.parentAccountId !== spec.parent.id && !ledgerHasVoucherPostings(existing.id)) {
      next = patchLedger(next, existing.id, {
        parentAccountId: spec.parent.id,
        parentAccount: spec.parent.accountName,
        accountType: spec.accountType,
        balanceType: spec.balanceType,
      });
    }

    if (existing.status !== targetStatus) {
      next = patchLedger(next, existing.id, { status: targetStatus });
    }
  }

  return next;
}

/** Sync all TDS Master sections to COA ledgers under TDS Receivable & TDS Payable. */
export function syncTdsCoaFromMaster(): boolean {
  if (typeof window === "undefined") return false;

  let records = loadChartOfAccounts();
  records = ensureTdsPayableGroupStructure(records);

  const receivableGroup = findAccountGroup(records, TDS_RECEIVABLE_GROUP);
  const payableGroup = findAccountGroup(records, TDS_PAYABLE_GROUP);
  if (!receivableGroup || !payableGroup) return false;

  const masters = loadTDSMasters();
  const before = JSON.stringify(
    records
      .filter((r) => r.erpSourceModule === TDS_ERP_SOURCE || isTdsCoaLedger(r))
      .map((r) => ({ id: r.id, name: r.accountName, status: r.status, parent: r.parentAccountId })),
  );

  for (const master of masters) {
    records = syncMasterLedgers(records, master);
  }

  const after = JSON.stringify(
    records
      .filter((r) => r.erpSourceModule === TDS_ERP_SOURCE || isTdsCoaLedger(r))
      .map((r) => ({ id: r.id, name: r.accountName, status: r.status, parent: r.parentAccountId })),
  );

  if (before !== after) {
    saveChartOfAccounts(records);
    localStorage.setItem(TDS_SYNC_META_KEY, new Date().toISOString());
    dispatchCoaChanged();
    return true;
  }

  return false;
}
