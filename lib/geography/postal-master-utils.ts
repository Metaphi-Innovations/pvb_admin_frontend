/**
 * Safe helpers for large postal master datasets.
 */

import type { PostalMasterRecord } from "./postal-master-store";

/** localStorage payloads above this size are never parsed (use postal-master.json instead). */
export const LOCAL_STORAGE_MAX_BYTES = 250_000;

export function maxRecordId(records: Pick<PostalMasterRecord, "id">[]): number {
  let max = 0;
  for (const r of records) {
    if (r.id > max) max = r.id;
  }
  return max;
}

export function purgeOversizedPostalStorage(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("ds_pincode_master_v3");
  if (!stored || stored.length <= LOCAL_STORAGE_MAX_BYTES) return false;
  localStorage.removeItem("ds_pincode_master_v3");
  localStorage.setItem("ds_pincode_master_source", "file");
  return true;
}
