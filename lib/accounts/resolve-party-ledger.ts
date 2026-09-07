import { loadChartOfAccounts } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { canShowBillWiseOutstanding } from "@/lib/accounts/bill-wise-outstanding";
import { mapCoaApiTreeToRecords } from "@/lib/accounts/coa-api-mapper";
import {
  isCustomerPartyLedger,
  isVendorPartyLedger,
} from "@/lib/accounts/voucher-ledger-groups";
import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";
import { LedgerService } from "@/services/ledger.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export type ResolvedBillWisePartyKind = "customer" | "supplier";

export interface ResolvedBillWiseLedgerContext {
  kind: ResolvedBillWisePartyKind;
  /** Backend AccountLedger UUID — used by receivables BWO API. */
  partyLedgerId: string;
  /** Supplier master UUID — used by payables bills API. */
  supplierId?: string;
  partyName: string;
  partyCode: string;
  /** Local COA numeric id when known (for cross-nav). */
  coaLedgerId?: number;
}

function findCoaLedger(
  ledgerKey: string,
  records: ChartOfAccount[],
): ChartOfAccount | null {
  const numericId = Number(ledgerKey);
  if (Number.isFinite(numericId) && String(numericId) === String(ledgerKey).trim()) {
    const byId = records.find(
      (r) => r.id === numericId && r.nodeLevel === "ledger",
    );
    if (byId) return byId;
  }
  if (isUuid(ledgerKey)) {
    const byApi = records.find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.apiNodeId &&
        String(r.apiNodeId).toLowerCase() === ledgerKey.toLowerCase(),
    );
    if (byApi) return byApi;
  }
  // Hashed local ids may be passed as strings that still Number() fine but
  // differ from "strict numeric string" when scientific notation etc. — try again.
  if (Number.isFinite(numericId)) {
    const byId = records.find(
      (r) => r.id === numericId && r.nodeLevel === "ledger",
    );
    if (byId) return byId;
  }
  return null;
}

function kindFromCoa(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): ResolvedBillWisePartyKind | null {
  if (isCustomerPartyLedger(ledger, records)) return "customer";
  if (isVendorPartyLedger(ledger, records)) return "supplier";
  if (canShowBillWiseOutstanding(ledger, records)) {
    if (
      ledger.erpSourceModule === "customer_master" ||
      ledger.masterType === "customer"
    ) {
      return "customer";
    }
    if (
      ledger.erpSourceModule === "vendor_master" ||
      ledger.masterType === "vendor"
    ) {
      return "supplier";
    }
    return "customer";
  }
  return null;
}

function kindFromApiSource(
  sourceType?: string | null,
  sourceEntityType?: string | null,
): ResolvedBillWisePartyKind | null {
  const st = String(sourceType ?? "").toUpperCase();
  const et = String(sourceEntityType ?? "").toLowerCase();
  if (st === "CUSTOMER" || et === "customer") return "customer";
  if (st === "SUPPLIER" || et === "supplier") return "supplier";
  return null;
}

async function loadApiCoaRecords(): Promise<ChartOfAccount[]> {
  try {
    const tree = await ChartOfAccountsService.getTree({ includeLedgers: true });
    return mapCoaApiTreeToRecords(tree);
  } catch {
    return [];
  }
}

/**
 * Resolve a COA route key (numeric local id OR backend ledger UUID) into the
 * identifiers required by Bill-wise Outstanding APIs.
 *
 * Prefer live API COA records (with apiNodeId). localStorage alone is often
 * missing synced UUIDs and will fail to resolve customer ledgers.
 */
export async function resolveBillWiseLedgerContext(
  ledgerKey: string,
  liveRecords?: ChartOfAccount[] | null,
): Promise<ResolvedBillWiseLedgerContext | null> {
  const key = String(ledgerKey ?? "").trim();
  if (!key) return null;

  let records =
    liveRecords && liveRecords.length > 0
      ? liveRecords
      : loadChartOfAccounts();
  let coa = findCoaLedger(key, records);

  // API tree is source of truth for party ledger UUIDs on COA screens.
  if (!coa?.apiNodeId || !isUuid(coa.apiNodeId)) {
    if (!(coa && isUuid(key))) {
      const apiRecords = await loadApiCoaRecords();
      if (apiRecords.length > 0) {
        records = apiRecords;
        coa = findCoaLedger(key, records) ?? coa;
      }
    }
  }

  let partyLedgerId: string | null =
    coa?.apiNodeId && isUuid(coa.apiNodeId) ? coa.apiNodeId : null;
  if (!partyLedgerId && isUuid(key)) {
    partyLedgerId = key;
  }

  // Sync from customer/supplier master when we only know the master id
  if (!partyLedgerId && coa) {
    const masterId = coa.masterId ?? coa.erpSourceId;
    if (masterId != null && isUuid(String(masterId))) {
      try {
        const kindHint = kindFromCoa(coa, records);
        if (kindHint === "supplier") {
          const synced = await LedgerService.syncSupplierLedger(String(masterId));
          partyLedgerId = synced.ledgerId || null;
        } else {
          const synced = await LedgerService.syncCustomerLedger(String(masterId));
          partyLedgerId = synced.ledgerId || null;
        }
      } catch {
        // continue
      }
    }
  }

  if (!partyLedgerId) {
    return null;
  }

  // Reject group / non-ledger nodes that somehow got a UUID (primary heads etc.)
  if (coa && coa.nodeLevel !== "ledger") {
    return null;
  }

  let detail: Awaited<ReturnType<typeof LedgerService.view>> | null = null;
  try {
    detail = await LedgerService.view(partyLedgerId);
  } catch {
    detail = null;
  }

  const kind =
    kindFromApiSource(detail?.sourceType, detail?.sourceEntityType) ??
    (coa ? kindFromCoa(coa, records) : null) ??
    "customer";

  const supplierId =
    kind === "supplier"
      ? detail?.sourceEntityId && isUuid(detail.sourceEntityId)
        ? detail.sourceEntityId
        : coa?.masterId != null || coa?.erpSourceId != null
          ? String(coa.masterId ?? coa.erpSourceId)
          : undefined
      : undefined;

  return {
    kind,
    partyLedgerId,
    supplierId,
    partyName: detail?.ledgerName || coa?.accountName || "Ledger",
    partyCode: detail?.ledgerCode || coa?.accountCode || "",
    coaLedgerId: coa?.id,
  };
}

/** Resolve backend AccountLedger UUID from a local COA numeric node id. */
export function resolvePartyLedgerUuidFromCoaId(
  coaLedgerId: number,
  liveRecords?: ChartOfAccount[] | null,
): string | null {
  const records =
    liveRecords && liveRecords.length > 0
      ? liveRecords
      : loadChartOfAccounts();
  const ledger = records.find(
    (r) => r.id === coaLedgerId && r.nodeLevel === "ledger",
  );
  if (!ledger) return null;
  if (ledger.apiNodeId && isUuid(ledger.apiNodeId)) return ledger.apiNodeId;
  return null;
}

/**
 * Resolve customer → party ledger UUID.
 * Prefer COA link (apiNodeId); fall back to sync-ledger integration (idempotent).
 */
export async function resolveCustomerPartyLedgerId(
  customerId: string,
): Promise<string | null> {
  if (!customerId) return null;

  const fromCoa = loadChartOfAccounts().find((r) => {
    if (r.nodeLevel !== "ledger") return false;
    const sourceId = r.masterId ?? r.erpSourceId;
    return (
      String(sourceId) === String(customerId) &&
      (r.erpSourceModule === "customer_master" ||
        r.masterType === "customer" ||
        r.apiNodeId != null)
    );
  });
  if (fromCoa?.apiNodeId && isUuid(fromCoa.apiNodeId)) {
    return fromCoa.apiNodeId;
  }

  // Try live API tree (customer ledgers often absent from localStorage).
  try {
    const apiRecords = await loadApiCoaRecords();
    const hit = apiRecords.find((r) => {
      if (r.nodeLevel !== "ledger") return false;
      const sourceId = r.masterId ?? r.erpSourceId;
      return String(sourceId) === String(customerId);
    });
    if (hit?.apiNodeId && isUuid(hit.apiNodeId)) return hit.apiNodeId;
  } catch {
    // continue to sync
  }

  try {
    const synced = await LedgerService.syncCustomerLedger(customerId);
    return synced.ledgerId || null;
  } catch {
    return null;
  }
}

/**
 * Resolve supplier → party ledger UUID from COA when available.
 * Payables bill APIs use supplierId (not ledger id).
 */
export function resolveSupplierIdFromCoaLedger(
  coaLedgerId: number,
  liveRecords?: ChartOfAccount[] | null,
): string | null {
  const records =
    liveRecords && liveRecords.length > 0
      ? liveRecords
      : loadChartOfAccounts();
  const ledger = records.find(
    (r) => r.id === coaLedgerId && r.nodeLevel === "ledger",
  );
  if (!ledger) return null;
  const sourceId = ledger.masterId ?? ledger.erpSourceId;
  if (sourceId == null) return null;
  return String(sourceId);
}

export async function resolveSupplierPartyLedgerId(
  supplierId: string,
): Promise<string | null> {
  if (!supplierId) return null;
  const fromCoa = loadChartOfAccounts().find((r) => {
    if (r.nodeLevel !== "ledger") return false;
    const sourceId = r.masterId ?? r.erpSourceId;
    return (
      String(sourceId) === String(supplierId) &&
      (r.erpSourceModule === "vendor_master" || r.masterType === "vendor")
    );
  });
  if (fromCoa?.apiNodeId && isUuid(fromCoa.apiNodeId)) {
    return fromCoa.apiNodeId;
  }
  try {
    const apiRecords = await loadApiCoaRecords();
    const hit = apiRecords.find((r) => {
      if (r.nodeLevel !== "ledger") return false;
      const sourceId = r.masterId ?? r.erpSourceId;
      return String(sourceId) === String(supplierId);
    });
    if (hit?.apiNodeId && isUuid(hit.apiNodeId)) return hit.apiNodeId;
  } catch {
    // continue
  }
  try {
    const synced = await LedgerService.syncSupplierLedger(supplierId);
    return synced.ledgerId || null;
  } catch {
    return null;
  }
}
