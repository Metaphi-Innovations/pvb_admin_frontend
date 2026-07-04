export type MasterStatus = "active" | "inactive";

export interface BaseMasterRecord {
  id: number;
  status: MasterStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const MASTER_CURRENT_USER = "Admin";

export function masterToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadMasterRecords<T>(storageKey: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

export function saveMasterRecords<T>(storageKey: string, list: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(list));
  if (storageKey === "ds_master_scheme_v5") {
    try {
      const { invalidateConsolidatedSchemeRecordsCache } =
        require("@/app/(app)/masters/scheme/product-discount-scheme") as typeof import("@/app/(app)/masters/scheme/product-discount-scheme");
      const { invalidateModuleDataCache, MODULE_CACHE_KEYS } =
        require("@/lib/accounts/module-data-cache") as typeof import("@/lib/accounts/module-data-cache");
      invalidateConsolidatedSchemeRecordsCache();
      invalidateModuleDataCache(MODULE_CACHE_KEYS.schemeRecordsNearExpiry);
    } catch {
      /* cache invalidation is best-effort */
    }
  }
}

export function nextMasterCode(prefix: string, existingCodes: string[]): string {
  const nums = existingCodes
    .map((c) => {
      const m = c.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}
