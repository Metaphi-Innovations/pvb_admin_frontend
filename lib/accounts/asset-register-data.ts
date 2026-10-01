/**
 * Fixed Asset Register — reference master for COA fixed-asset ledgers.
 * Assets are seeded/synced from existing COA ledgers (non-destructive).
 */

import {
  loadChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";

export interface AssetRegisterRecord {
  id: number;
  assetCode: string;
  assetName: string;
  category: string;
  coaLedgerId: number;
  acquisitionDate: string;
  status: "active" | "inactive";
}

const STORAGE_KEY = "ds_asset_register_v1";

function isFixedAssetLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (resolveLedgerType(ledger, records) === "Fixed Asset") return true;
  const path = getAncestorPath(records, ledger.id)
    .map((p) => p.accountName.toLowerCase())
    .join(" ");
  return (
    path.includes("fixed assets") ||
    path.includes("plant & machinery") ||
    path.includes("vehicles") ||
    path.includes("land & building") ||
    path.includes("furniture & fixtures")
  );
}

function readAll(): AssetRegisterRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AssetRegisterRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: AssetRegisterRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function loadAssetRegister(): AssetRegisterRecord[] {
  return readAll();
}

export function findAssetByLedgerId(ledgerId: number): AssetRegisterRecord | undefined {
  return readAll().find((a) => a.coaLedgerId === ledgerId);
}

export function findAssetById(id: number): AssetRegisterRecord | undefined {
  return readAll().find((a) => a.id === id);
}

/** Create asset register rows for fixed-asset COA ledgers that lack a register entry. */
export function ensureAssetRegisterFromCoa(): AssetRegisterRecord[] {
  const records = loadChartOfAccounts();
  const existing = readAll();
  const byLedger = new Map(existing.map((a) => [a.coaLedgerId, a]));
  let nextId = existing.reduce((m, a) => Math.max(m, a.id), 0) + 1;
  let changed = false;

  for (const ledger of records) {
    if (ledger.nodeLevel !== "ledger") continue;
    if (!isFixedAssetLedger(ledger, records)) continue;
    if (byLedger.has(ledger.id)) continue;

    const path = getAncestorPath(records, ledger.id);
    const subGroup = path.length > 1 ? path[path.length - 2]?.accountName : "Fixed Assets";

    const row: AssetRegisterRecord = {
      id: nextId++,
      assetCode: ledger.accountCode,
      assetName: ledger.accountName,
      category: subGroup,
      coaLedgerId: ledger.id,
      acquisitionDate: "2024-04-01",
      status: ledger.status,
    };
    existing.push(row);
    byLedger.set(ledger.id, row);
    changed = true;
  }

  if (changed) writeAll(existing);
  return existing;
}
