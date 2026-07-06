"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  resolveAccountsNavGroupId,
  type AccountsNavGroupId,
} from "@/lib/accounts/accounts-nav";
import { scheduleAccountsSectionSeed } from "@/lib/accounts/accounts-section-seed";

type AccountsAccordionContextValue = {
  activeAccountsSection: AccountsNavGroupId | null;
  toggleAccountsSection: (sectionId: AccountsNavGroupId) => void;
};

const AccountsAccordionContext = createContext<AccountsAccordionContextValue | null>(null);

/** Accordion state lives above CoaNavigationProvider so COA tree updates cannot reset it. */
export function AccountsAccordionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [activeAccountsSection, setActiveAccountsSection] = useState<AccountsNavGroupId | null>(
    () => resolveAccountsNavGroupId(pathname),
  );

  // Sync accordion + seed only on route navigation — never on manual toggle.
  useEffect(() => {
    const sectionId = resolveAccountsNavGroupId(pathname);
    setActiveAccountsSection((prev) => (prev === sectionId ? prev : sectionId));
    scheduleAccountsSectionSeed(sectionId);
  }, [pathname]);

  const toggleAccountsSection = useCallback((sectionId: AccountsNavGroupId) => {
    setActiveAccountsSection((prev) => (prev === sectionId ? null : sectionId));
  }, []);

  const value = useMemo(
    () => ({ activeAccountsSection, toggleAccountsSection }),
    [activeAccountsSection, toggleAccountsSection],
  );

  return (
    <AccountsAccordionContext.Provider value={value}>{children}</AccountsAccordionContext.Provider>
  );
}

export function useAccountsAccordion(): AccountsAccordionContextValue {
  const ctx = useContext(AccountsAccordionContext);
  if (!ctx) {
    throw new Error("useAccountsAccordion must be used within AccountsAccordionProvider");
  }
  return ctx;
}
