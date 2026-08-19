"use client";

import { useEffect, useState } from "react";
import { ACCOUNTS_SECTION_SEEDED_EVENT, ACCOUNTS_VOUCHERS_UPDATED_EVENT } from "./accounts-section-seed";
import { COA_CHANGED_EVENT } from "./coa-events";
import {
  ACCOUNTS_DATA_CHANGED_EVENT,
  accountsDataScopeMatches,
  type AccountsDataScope,
} from "./accounts-data-events";

export type AccountsSectionRefreshOptions = {
  /**
   * Backend API listings should not refetch on demo seed / mount.
   * They still refresh when `ACCOUNTS_DATA_CHANGED_EVENT` matches the scope.
   */
  apiListing?: boolean;
};

/** Bump when async section demo seed finishes — use in data useMemos to re-read localStorage. */
export function useAccountsSectionRefresh(
  scope: AccountsDataScope | AccountsDataScope[] = "*",
  options?: AccountsSectionRefreshOptions,
): number {
  const [tick, setTick] = useState(0);
  const apiListing = Boolean(options?.apiListing);

  // Callers commonly pass a fresh array literal each render. Depending on the
  // array reference would re-run the effect (and its initial bump()) on every
  // render, causing an infinite update loop. Derive a stable string key so the
  // effect only re-subscribes when the scope contents actually change.
  const scopeKey = Array.isArray(scope) ? scope.join("|") : scope;

  useEffect(() => {
    const scopes: AccountsDataScope[] = scopeKey.split("|") as AccountsDataScope[];
    const bump = () => setTick((t) => t + 1);
    const onDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: AccountsDataScope }>).detail;
      if (accountsDataScopeMatches(scopes, detail?.scope ?? "*")) bump();
    };
    window.addEventListener(ACCOUNTS_DATA_CHANGED_EVENT, onDataChanged);
    if (!apiListing) {
      window.addEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, bump);
      window.addEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, bump);
      window.addEventListener(COA_CHANGED_EVENT, bump);
      // Re-read localStorage after subscribe in case seed finished during first paint.
      bump();
    }
    return () => {
      window.removeEventListener(ACCOUNTS_DATA_CHANGED_EVENT, onDataChanged);
      if (!apiListing) {
        window.removeEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, bump);
        window.removeEventListener(ACCOUNTS_VOUCHERS_UPDATED_EVENT, bump);
        window.removeEventListener(COA_CHANGED_EVENT, bump);
      }
    };
  }, [scopeKey, apiListing]);

  return tick;
}
