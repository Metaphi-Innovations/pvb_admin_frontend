/**
 * Stable ERP party ↔ COA ledger links (Customer / Vendor / Product / GST).
 */

export type ErpSourceModule =
  | "customer_master"
  | "vendor_master"
  | "product_master"
  | "gst_master"
  | "bank_master"
  | "employee_master"
  | "fixed_asset_master"
  | "warehouse_master";

export interface ErpPartyLedgerLink {
  ledgerId: number;
  erpSourceModule: ErpSourceModule;
  erpSourceId: number;
  partyCode: string;
  partyName: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_erp_party_ledger_links_v1";

function readAll(): ErpPartyLedgerLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ErpPartyLedgerLink[]) : [];
  } catch {
    return [];
  }
}

function writeAll(links: ErpPartyLedgerLink[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function findErpPartyLink(
  module: ErpSourceModule,
  sourceId: number,
): ErpPartyLedgerLink | undefined {
  return readAll().find((l) => l.erpSourceModule === module && l.erpSourceId === sourceId);
}

export function findErpPartyLinkByLedgerId(ledgerId: number): ErpPartyLedgerLink | undefined {
  return readAll().find((l) => l.ledgerId === ledgerId);
}

export function upsertErpPartyLink(link: Omit<ErpPartyLedgerLink, "createdAt" | "updatedAt"> & { createdAt?: string }) {
  const all = readAll();
  const now = new Date().toISOString();
  const idx = all.findIndex(
    (l) => l.erpSourceModule === link.erpSourceModule && l.erpSourceId === link.erpSourceId,
  );
  const next: ErpPartyLedgerLink = {
    ...link,
    createdAt: idx >= 0 ? all[idx].createdAt : link.createdAt ?? now,
    updatedAt: now,
  };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  writeAll(all);
  return next;
}

export function removeErpPartyLink(module: ErpSourceModule, sourceId: number) {
  writeAll(readAll().filter((l) => !(l.erpSourceModule === module && l.erpSourceId === sourceId)));
}
