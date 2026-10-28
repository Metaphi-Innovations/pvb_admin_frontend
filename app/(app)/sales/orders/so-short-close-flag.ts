/**
 * Feature flag for Sales Order Short Close.
 * Driven by NEXT_PUBLIC_ENABLE_SO_SHORT_CLOSE (true / 1 / yes).
 * Default false so live stays hidden unless explicitly enabled.
 */
export function isSalesOrderShortCloseEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_SO_SHORT_CLOSE?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "true" || raw === "1" || raw === "yes";
}
