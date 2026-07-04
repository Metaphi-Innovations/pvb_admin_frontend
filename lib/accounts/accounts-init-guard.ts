/** Session-scoped guard — COA backfills run once per browser tab, not on every accounts route. */
const COA_BACKFILL_SESSION_KEY = "ds_accounts_coa_backfill_v1";

export function hasAccountsCoaBackfillRun(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(COA_BACKFILL_SESSION_KEY) === "1";
}

export function markAccountsCoaBackfillRun(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(COA_BACKFILL_SESSION_KEY, "1");
}
