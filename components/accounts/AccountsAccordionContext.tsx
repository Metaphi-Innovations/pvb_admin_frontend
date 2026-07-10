"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  resolveAccountsNavGroupId,
  type AccountsNavGroupId,
} from "@/lib/accounts/accounts-nav";
import { scheduleAccountsSectionSeed } from "@/lib/accounts/accounts-section-seed";

type AccountsSectionContextValue = {
  /** Active Accounts section from the current route (top navbar decides; sidebar mirrors it). */
  activeAccountsSection: AccountsNavGroupId;
};

const AccountsSectionContext = createContext<AccountsSectionContextValue | null>(null);

/**
 * Tracks the active Accounts nav section from the URL and lazily seeds that section’s demo data.
 * No accordion state — left sidebar always shows only this section.
 */
export function AccountsAccordionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeAccountsSection = useMemo(
    () => resolveAccountsNavGroupId(pathname),
    [pathname],
  );

  useEffect(() => {
    scheduleAccountsSectionSeed(activeAccountsSection);
  }, [activeAccountsSection]);

  const value = useMemo(
    () => ({ activeAccountsSection }),
    [activeAccountsSection],
  );

  return (
    <AccountsSectionContext.Provider value={value}>{children}</AccountsSectionContext.Provider>
  );
}

export function useAccountsAccordion(): AccountsSectionContextValue {
  const ctx = useContext(AccountsSectionContext);
  if (!ctx) {
    throw new Error("useAccountsAccordion must be used within AccountsAccordionProvider");
  }
  return ctx;
}
