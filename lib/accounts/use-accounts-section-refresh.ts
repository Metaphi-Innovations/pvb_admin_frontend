"use client";

import { useEffect, useState } from "react";
import { ACCOUNTS_SECTION_SEEDED_EVENT } from "./accounts-section-seed";

/** Bump when async section demo seed finishes — use in data useMemos to re-read localStorage. */
export function useAccountsSectionRefresh(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, bump);
    bump();
    return () => window.removeEventListener(ACCOUNTS_SECTION_SEEDED_EVENT, bump);
  }, []);

  return tick;
}
