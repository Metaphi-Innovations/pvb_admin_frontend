"use client";

import { useEffect, useState } from "react";
import { ACCOUNTS_SECTION_SEEDED_EVENT } from "./accounts-section-seed";
import { COA_CHANGED_EVENT } from "./coa-events";
import {
  ACCOUNTS_DATA_CHANGED_EVENT,
  accountsDataScopeMatches,
  type AccountsDataScope,
} from "./accounts-data-events";

/** Bump when async section demo seed finishes — use in data useMemos to re-read localStorage. */
export function useAccountsSectionRefresh(scope: AccountsDataScope | AccountsDataScope[] = "*"): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const onDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: AccountsDataScope }>).detail;
      if (accountsDataScopeMatches(scope, detail?.scope ?? "*")) bump();
    };
    window.addEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, bump);
    window.addEventListener(COA_CHANGED_EVENT, bump);
    window.addEventListener(ACCOUNTS_DATA_CHANGED_EVENT, onDataChanged);
    bump();
    return () => {
      window.removeEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, bump);
      window.removeEventListener(COA_CHANGED_EVENT, bump);
      window.removeEventListener(ACCOUNTS_DATA_CHANGED_EVENT, onDataChanged);
    };
  }, [scope]);

  return tick;
}
