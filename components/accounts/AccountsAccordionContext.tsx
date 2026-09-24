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

/** API-backed registers/reports. Do not inject section demo vouchers while these pages are open. */
function skipsAccountsSectionDemoSeed(pathname: string): boolean {
  const path = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  return (
    path === "/accounts/reports/day-book" ||
    path.startsWith("/accounts/reports/day-book/") ||
    path === "/accounts/reports/general-ledger" ||
    path.startsWith("/accounts/reports/general-ledger/") ||
    path === "/accounts/reports/ledger" ||
    path.startsWith("/accounts/reports/ledger/") ||
    path === "/accounts/reports/purchase-register" ||
    path.startsWith("/accounts/reports/purchase-register/") ||
    path === "/accounts/reports/sales-register" ||
    path.startsWith("/accounts/reports/sales-register/") ||
    path === "/accounts/reports/gst-summary" ||
    path.startsWith("/accounts/reports/gst-summary/") ||
    path === "/accounts/reports/gst" ||
    path.startsWith("/accounts/reports/gst/")
  );
}

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
    if (skipsAccountsSectionDemoSeed(pathname)) return;
    // Defer seed work until after route paint so navigation stays responsive.
    const timer = window.setTimeout(() => {
      scheduleAccountsSectionSeed(activeAccountsSection);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [activeAccountsSection, pathname]);

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
