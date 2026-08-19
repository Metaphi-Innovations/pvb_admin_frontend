/** Created/Updated cells show name + date; sort/filter always use the date. */

const CREATED_SORT_KEYS = new Set(["createdBy", "createdAt", "createdDate"]);
const UPDATED_SORT_KEYS = new Set(["updatedBy", "updatedAt", "updatedDate"]);

export function isMasterAuditSortKey(key: string): boolean {
  return CREATED_SORT_KEYS.has(key) || UPDATED_SORT_KEYS.has(key);
}

export function masterAuditOrderingField(key: string): string | undefined {
  if (CREATED_SORT_KEYS.has(key)) return "created_at";
  if (UPDATED_SORT_KEYS.has(key)) return "updated_at";
  return undefined;
}

export function masterAuditSortValue(row: Record<string, unknown>, key: string): string {
  if (CREATED_SORT_KEYS.has(key)) {
    return String(row.createdAt ?? row.createdDate ?? "");
  }
  if (UPDATED_SORT_KEYS.has(key)) {
    return String(row.updatedAt ?? row.updatedDate ?? "");
  }
  return String(row[key] ?? "");
}
