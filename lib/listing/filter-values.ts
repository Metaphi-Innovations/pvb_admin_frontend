/**
 * Shared helpers so multi-select column filters reach APIs as string | string[].
 * Backend dynamicFilter already maps string arrays to `{ in: [...] }`.
 */

/** Normalize a filter cell to a clean string list. */
export function toFilterStringList(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter(Boolean);
  }
  if (typeof value === "object") return [];
  const single = String(value).trim();
  return single ? [single] : [];
}

/**
 * Value to send in API filter payloads.
 * - empty → undefined
 * - one selection → string (backward compatible)
 * - many → string[]
 */
export function toApiFilterValue(value: unknown): string | string[] | undefined {
  const list = toFilterStringList(value);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  return list;
}

/** @deprecated Prefer toApiFilterValue for multi-select support. */
export function firstFilterValue(value: unknown): string {
  return toFilterStringList(value)[0] || "";
}
