/**
 * Stable resolution for approved system ledgers used by the posting engine.
 * Identity order: system alias → seeded ledger ID → account code → isSystem + hierarchy + name.
 * Never creates ledgers. Never treats display-name lookalikes as system identity.
 * Alias backfill is empty-only; never overwrites a non-empty alias during posting.
 */

import {
  loadChartOfAccounts,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { SYSTEM_COA_NODES } from "@/app/(app)/accounts/masters/coa-seed-nodes";
import {
  APPROVED_SYSTEM_LEDGER_KEYS,
  MANDATORY_SYSTEM_LEDGERS,
  systemLedgerAlias,
  type ApprovedSystemLedgerKey,
} from "@/app/(app)/accounts/masters/chart-of-accounts/coa-statutory-ledgers";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";

export type PostingSystemLedgerKey = Extract<
  ApprovedSystemLedgerKey,
  "PRODUCT_SALES" | "STOCK_IN_HAND"
>;

/** Mapping keys that must resolve approved system ledgers (no find-or-create). */
export type SystemControlledMappingKey =
  | "sales_revenue"
  | "purchase_inventory"
  | "stock_inventory";

interface SystemLedgerSpec {
  key: PostingSystemLedgerKey;
  name: string;
  code: string;
  /** Ancestor group names (lowercased) that must appear in the path. */
  requiredGroupNames: string[];
  requiredPrimaryHead: string;
}

const SPECS: Record<PostingSystemLedgerKey, SystemLedgerSpec> = {
  PRODUCT_SALES: {
    key: APPROVED_SYSTEM_LEDGER_KEYS.PRODUCT_SALES,
    name: MANDATORY_SYSTEM_LEDGERS.productSales.name,
    code: MANDATORY_SYSTEM_LEDGERS.productSales.code,
    requiredGroupNames: ["sales"],
    requiredPrimaryHead: "Income",
  },
  STOCK_IN_HAND: {
    key: APPROVED_SYSTEM_LEDGER_KEYS.STOCK_IN_HAND,
    name: MANDATORY_SYSTEM_LEDGERS.stockInHand.name,
    code: MANDATORY_SYSTEM_LEDGERS.stockInHand.code,
    requiredGroupNames: ["inventory", "inventory / stock-in-hand"],
    requiredPrimaryHead: "Assets",
  },
};

/** Mapping keys that must resolve approved system ledgers (no find-or-create). */
export const SYSTEM_CONTROLLED_MAPPING_KEYS: Record<
  SystemControlledMappingKey,
  PostingSystemLedgerKey
> = {
  sales_revenue: "PRODUCT_SALES",
  purchase_inventory: "STOCK_IN_HAND",
  stock_inventory: "STOCK_IN_HAND",
};

export function systemLedgerKeyForMapping(
  mappingKey: string,
): PostingSystemLedgerKey | null {
  if (mappingKey in SYSTEM_CONTROLLED_MAPPING_KEYS) {
    return SYSTEM_CONTROLLED_MAPPING_KEYS[mappingKey as SystemControlledMappingKey];
  }
  return null;
}

export function isSystemControlledMappingKey(mappingKey: string): boolean {
  return systemLedgerKeyForMapping(mappingKey) != null;
}

export function missingSystemLedgerError(key: PostingSystemLedgerKey): string {
  return `Required system ledger ${key} is missing or invalid.`;
}

/** Legacy display names that must NOT be treated as approved system ledgers. */
export const LEGACY_SHADOW_LEDGER_NAMES = [
  "General",
  "General Sales",
  "Inventory / Stock-in-Hand",
  "Stock-in-Hand",
  "Inventory / Stock in Hand",
] as const;

export interface ResolveApprovedSystemLedgerResult {
  ledger: ChartOfAccount | null;
  /** Non-empty alias on the approved winner that is not the expected sys:* key. */
  aliasMetadataConflict?: string;
  /** True only when an empty alias was stamped and persisted. */
  wroteAlias: boolean;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function matchesSystemAlias(ledger: ChartOfAccount, key: PostingSystemLedgerKey): boolean {
  return normalize(ledger.alias ?? "") === normalize(systemLedgerAlias(key));
}

/** Permanent seeded ID for the approved system ledger (contract identity). */
function seededSystemLedgerId(key: PostingSystemLedgerKey): number | null {
  const spec = SPECS[key];
  const seed = SYSTEM_COA_NODES.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.isSystem === true &&
      r.accountCode?.trim() === spec.code &&
      normalize(r.accountName) === normalize(spec.name),
  );
  return seed?.id ?? null;
}

function hasApprovedHierarchy(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
  spec: SystemLedgerSpec,
): boolean {
  const path = resolveHierarchyPath(records, ledger.id);
  const primary = path.primaryHead?.accountName?.trim();
  if (primary && normalize(primary) !== normalize(spec.requiredPrimaryHead)) {
    return false;
  }
  const groupNames = path.path
    .filter((n) => n.nodeLevel === "account_group")
    .map((n) => normalize(n.accountName));
  return spec.requiredGroupNames.some((g) => groupNames.includes(g));
}

function isSystemIdentityCandidate(ledger: ChartOfAccount): boolean {
  return (
    ledger.nodeLevel === "ledger" &&
    (ledger.isSystem === true ||
      ledger.ledgerKind === "SYSTEM" ||
      ledger.isSystemGenerated === true)
  );
}

function scoreCandidate(
  ledger: ChartOfAccount,
  key: PostingSystemLedgerKey,
  spec: SystemLedgerSpec,
  seedId: number | null,
): number {
  let score = 0;
  // 1. Exact approved sys:* identity
  if (matchesSystemAlias(ledger, key)) score += 1000;
  // 2. Permanent seeded ledger ID
  if (seedId != null && ledger.id === seedId) score += 500;
  // 3. Stable account code
  if (ledger.accountCode?.trim() === spec.code) score += 100;
  // 4. isSystem + approved name (hierarchy filtered separately)
  if (ledger.isSystem) score += 20;
  if (ledger.ledgerKind === "SYSTEM") score += 10;
  if (normalize(ledger.accountName) === normalize(spec.name)) score += 5;
  if (ledger.status === "active") score += 2;
  return score;
}

/**
 * Empty-only alias stamp. Never overwrites a non-empty alias.
 * Returns whether a write is required and any metadata conflict diagnostic.
 */
export function planSystemAliasBackfill(
  winner: ChartOfAccount,
  key: PostingSystemLedgerKey,
): { shouldWrite: boolean; nextAlias?: string; conflict?: string } {
  if (matchesSystemAlias(winner, key)) {
    return { shouldWrite: false };
  }
  const currentAlias = (winner.alias ?? "").trim();
  const expected = systemLedgerAlias(key);
  if (currentAlias !== "") {
    return {
      shouldWrite: false,
      conflict: `Approved system ledger ${key} (id=${winner.id}) has alias "${currentAlias}" instead of "${expected}"; left unchanged.`,
    };
  }
  return { shouldWrite: true, nextAlias: expected };
}

/**
 * Resolve the approved system ledger with diagnostics.
 * Never creates. Never overwrites a non-empty alias.
 */
export function resolveApprovedSystemLedgerDetailed(
  key: PostingSystemLedgerKey,
  recordsInput?: ChartOfAccount[],
  options?: { backfillAlias?: boolean },
): ResolveApprovedSystemLedgerResult {
  const spec = SPECS[key];
  const records = recordsInput ?? loadChartOfAccounts();
  const ledgers = records.filter((r) => r.nodeLevel === "ledger");
  const seedId = seededSystemLedgerId(key);

  const byAlias = ledgers.find((l) => matchesSystemAlias(l, key));
  const bySeed = seedId != null ? ledgers.find((l) => l.id === seedId) : undefined;
  const byCode = ledgers.filter((l) => l.accountCode?.trim() === spec.code);
  const bySystemName = ledgers.filter(
    (l) =>
      isSystemIdentityCandidate(l) &&
      normalize(l.accountName) === normalize(spec.name),
  );

  const pool = new Map<number, ChartOfAccount>();
  if (byAlias) pool.set(byAlias.id, byAlias);
  if (bySeed) pool.set(bySeed.id, bySeed);
  for (const l of byCode) pool.set(l.id, l);
  for (const l of bySystemName) pool.set(l.id, l);

  const valid = Array.from(pool.values())
    .filter((l) => hasApprovedHierarchy(l, records, spec))
    .filter((l) => l.status !== "inactive")
    .sort(
      (a, b) =>
        scoreCandidate(b, key, spec, seedId) - scoreCandidate(a, key, spec, seedId),
    );

  if (valid.length === 0) {
    return { ledger: null, wroteAlias: false };
  }

  // Fail closed when top candidates are tied (ambiguous identity).
  if (
    valid.length > 1 &&
    scoreCandidate(valid[0], key, spec, seedId) ===
      scoreCandidate(valid[1], key, spec, seedId) &&
    valid[0].id !== valid[1].id
  ) {
    return { ledger: null, wroteAlias: false };
  }

  const winner = valid[0];
  const plan = planSystemAliasBackfill(winner, key);

  // Persist only when alias is genuinely empty and we are on live COA storage.
  if (
    plan.shouldWrite &&
    plan.nextAlias &&
    options?.backfillAlias !== false &&
    typeof window !== "undefined" &&
    !recordsInput
  ) {
    const idx = records.findIndex((r) => r.id === winner.id);
    if (idx >= 0 && (records[idx].alias ?? "").trim() === "") {
      records[idx] = { ...records[idx], alias: plan.nextAlias };
      saveChartOfAccounts(records);
      return {
        ledger: records[idx],
        wroteAlias: true,
      };
    }
  }

  return {
    ledger: winner,
    wroteAlias: false,
    aliasMetadataConflict: plan.conflict,
  };
}

/**
 * Resolve the approved system ledger. Never creates. Never matches legacy shadow names
 * unless they carry the approved system code / alias / isSystem identity.
 */
export function resolveApprovedSystemLedger(
  key: PostingSystemLedgerKey,
  recordsInput?: ChartOfAccount[],
  options?: { backfillAlias?: boolean },
): ChartOfAccount | null {
  return resolveApprovedSystemLedgerDetailed(key, recordsInput, options).ledger;
}

export function requireApprovedSystemLedger(
  key: PostingSystemLedgerKey,
  records?: ChartOfAccount[],
): { ledger: ChartOfAccount } | { error: string } {
  const { ledger } = resolveApprovedSystemLedgerDetailed(key, records);
  if (!ledger) return { error: missingSystemLedgerError(key) };
  return { ledger };
}

/** Report legacy similarly named ledgers (diagnostic only — no merge/delete). */
export function findLegacyShadowSystemLedgers(
  recordsInput?: ChartOfAccount[],
): Array<{ id: number; accountName: string; accountCode: string; reason: string }> {
  const records = recordsInput ?? loadChartOfAccounts();
  const approvedIds = new Set<number>();
  for (const key of Object.keys(SPECS) as PostingSystemLedgerKey[]) {
    const approved = resolveApprovedSystemLedger(key, records, { backfillAlias: false });
    if (approved) approvedIds.add(approved.id);
  }

  const shadowNames = new Set(LEGACY_SHADOW_LEDGER_NAMES.map((n) => normalize(n)));
  const out: Array<{ id: number; accountName: string; accountCode: string; reason: string }> =
    [];

  for (const r of records) {
    if (r.nodeLevel !== "ledger") continue;
    if (approvedIds.has(r.id)) continue;
    const name = normalize(r.accountName);
    if (shadowNames.has(name)) {
      out.push({
        id: r.id,
        accountName: r.accountName,
        accountCode: r.accountCode,
        reason: "Legacy similarly named ledger — not used for new system postings",
      });
      continue;
    }
    if (
      (name.includes("inventory") || name === "stock in hand" || name === "product sales") &&
      !r.isSystem
    ) {
      out.push({
        id: r.id,
        accountName: r.accountName,
        accountCode: r.accountCode,
        reason: "User/legacy inventory or sales-named ledger — not approved system identity",
      });
    }
  }
  return out;
}
