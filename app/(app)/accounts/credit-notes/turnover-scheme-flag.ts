/**
 * Temporary feature flag for Turnover Discount on Credit Notes.
 * Driven by NEXT_PUBLIC_ENABLE_TURNOVER_SCHEME (true / 1 / yes).
 * Default false so live stays hidden unless explicitly enabled.
 */
export function isTurnoverSchemeEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_TURNOVER_SCHEME?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "true" || raw === "1" || raw === "yes";
}
