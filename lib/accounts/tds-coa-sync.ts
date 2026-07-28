/**
 * TDS Master → Chart of Accounts synchronization.
 *
 * Section rates and applicability remain in ERP TDS Master. Chart of Accounts
 * exposes only one system-managed posting ledger per accounting side.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  loadChartOfAccounts,
  saveChartOfAccounts,
} from "@/app/(app)/accounts/data";
import { dispatchCoaChanged } from "@/lib/accounts/coa-events";
import { parseTdsSectionCode } from "@/lib/accounts/tds-coa-utils";

export const TDS_ERP_SOURCE = "tds_master";
export const TDS_RECEIVABLE_GROUP = "TDS Receivable";
export const TDS_PAYABLE_GROUP = "TDS Payable";
export const TDS_DUTIES_GROUP = "Duties & Taxes";

export type TdsLedgerKind = "payable" | "receivable";

const TDS_SYNC_META_KEY = "ds_tds_coa_sync_v3";

export function tdsLedgerKindAlias(kind: TdsLedgerKind): string {
  return `tds:${kind}`;
}

/** Legacy section-ledger label retained only for old record recognition. */
export function formatTdsSectionLedgerName(sectionCode: string, sectionName: string): string {
  const code = sectionCode.trim().toUpperCase();
  const name = sectionName.trim();
  return name ? `Sec ${code} - ${name}` : `Sec ${code}`;
}

/** @deprecated TDS sections no longer create Chart of Accounts ledgers. */
export function formatTdsLedgerName(_kind: TdsLedgerKind, sectionCode: string): string {
  return `Sec ${sectionCode.toUpperCase()}`;
}

export function isTdsCoaLedger(ledger: ChartOfAccount): boolean {
  if (ledger.nodeLevel !== "ledger") return false;
  if (ledger.accountName === TDS_PAYABLE_GROUP || ledger.accountName === TDS_RECEIVABLE_GROUP) {
    return true;
  }
  if (ledger.erpSourceModule === TDS_ERP_SOURCE) return true;
  if (!ledger.isSystemGenerated) return false;
  if (/^Sec \d+/i.test(ledger.accountName.trim()) && parseTdsSectionCode(ledger.accountName)) {
    return true;
  }
  return /TDS (Payable|Receivable) - Sec \d+/i.test(ledger.accountName.trim());
}

function isCanonicalTdsLedger(record: ChartOfAccount): boolean {
  return (
    record.nodeLevel === "ledger" &&
    (record.accountName === TDS_PAYABLE_GROUP ||
      record.accountName === TDS_RECEIVABLE_GROUP) &&
    (record.alias === tdsLedgerKindAlias("payable") ||
      record.alias === tdsLedgerKindAlias("receivable"))
  );
}

/**
 * Removes legacy per-section TDS COA records. ERP TDS Master remains the source
 * for section-wise rates and reporting configuration.
 */
function removeLegacySectionLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  return records.filter((record) => !isTdsCoaLedger(record) || isCanonicalTdsLedger(record));
}

function migrateLegacyTdsVoucherLines(records: ChartOfAccount[]): boolean {
  const payable = records.find(
    (record) =>
      isCanonicalTdsLedger(record) &&
      record.alias === tdsLedgerKindAlias("payable"),
  );
  const receivable = records.find(
    (record) =>
      isCanonicalTdsLedger(record) &&
      record.alias === tdsLedgerKindAlias("receivable"),
  );
  if (!payable || !receivable) return false;

  const replacements = new Map<number, ChartOfAccount>();
  for (const record of records) {
    if (!isTdsCoaLedger(record) || isCanonicalTdsLedger(record)) continue;
    const receivableKind =
      record.alias === tdsLedgerKindAlias("receivable") ||
      record.accountType === "Asset" ||
      record.accountName.toLowerCase().includes("receivable");
    replacements.set(record.id, receivableKind ? receivable : payable);
  }
  if (replacements.size === 0) return false;

  try {
    const { loadVouchers, saveVouchers } =
      require("@/app/(app)/accounts/vouchers/voucher-data") as typeof import("@/app/(app)/accounts/vouchers/voucher-data");
    const vouchers = loadVouchers();
    let changed = false;
    const migrated = vouchers.map((voucher) => ({
      ...voucher,
      lines: voucher.lines.map((line) => {
        if (line.ledgerId == null) return line;
        const replacement = replacements.get(line.ledgerId);
        if (!replacement) return line;
        changed = true;
        return {
          ...line,
          ledgerId: replacement.id,
          ledgerName: replacement.accountName,
        };
      }),
    }));
    if (changed) saveVouchers(migrated);
    return changed;
  } catch {
    return false;
  }
}

/**
 * Ensures the canonical system ledgers are the only TDS nodes in the COA.
 * System hierarchy merging recreates the two canonical ledgers when required.
 */
export function syncTdsCoaFromMaster(): boolean {
  if (typeof window === "undefined") return false;

  const records = loadChartOfAccounts();
  const vouchersChanged = migrateLegacyTdsVoucherLines(records);
  const cleaned = removeLegacySectionLedgers(records);
  const changed = cleaned.length !== records.length;

  if (changed) {
    saveChartOfAccounts(cleaned);
    localStorage.setItem(TDS_SYNC_META_KEY, new Date().toISOString());
    dispatchCoaChanged();
  }

  return changed || vouchersChanged;
}
