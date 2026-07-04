/**
 * Lightweight in-memory read-through cache for localStorage loaders.
 * Invalidated on save — same data, fewer JSON.parse cycles on the main thread.
 */

const store = new Map<string, unknown>();

export const MODULE_CACHE_KEYS = {
  invoices: "mod:invoices",
  customers: "mod:customers",
  creditNotes: "mod:creditNotes",
  schemeRecordsDiscount: "mod:schemeRecordsDiscount",
  schemeRecordsNearExpiry: "mod:schemeRecordsNearExpiry",
  schemePendingAll: "mod:schemePendingAll",
  pendingCreditNotes: "mod:pendingCreditNotes",
} as const;

export type ModuleCacheKey = (typeof MODULE_CACHE_KEYS)[keyof typeof MODULE_CACHE_KEYS];

/** Return cached value or run loader once and cache (client only). */
export function readThroughModuleCache<T>(key: ModuleCacheKey, loader: () => T): T {
  if (typeof window === "undefined") return loader();
  if (store.has(key)) return store.get(key) as T;
  const value = loader();
  store.set(key, value);
  return value;
}

export function invalidateModuleDataCache(key: ModuleCacheKey | ModuleCacheKey[]): void {
  const keys = Array.isArray(key) ? key : [key];
  for (const k of keys) store.delete(k);
}

/** Clears caches that affect pending credit note / scheme settlement lists. */
export function invalidateCreditNotePendingCaches(): void {
  invalidateModuleDataCache([
    MODULE_CACHE_KEYS.invoices,
    MODULE_CACHE_KEYS.creditNotes,
    MODULE_CACHE_KEYS.schemeRecordsDiscount,
    MODULE_CACHE_KEYS.schemeRecordsNearExpiry,
    MODULE_CACHE_KEYS.schemePendingAll,
    MODULE_CACHE_KEYS.pendingCreditNotes,
  ]);
}
