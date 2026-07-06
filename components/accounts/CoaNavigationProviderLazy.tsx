"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import { useAccountsAccordion } from "./AccountsAccordionContext";

const CoaNavigationProvider = dynamic(
  () => import("./CoaNavigationContext").then((m) => ({ default: m.CoaNavigationProvider })),
  { ssr: false },
);

function routeNeedsCoaData(pathname: string): boolean {
  return (
    pathname.startsWith(CHART_OF_ACCOUNTS_HREF) ||
    pathname.startsWith(GENERAL_LEDGER_HREF) ||
    pathname.startsWith("/accounts/masters/") ||
    pathname.startsWith("/accounts/settings")
  );
}

/**
 * Loads COA navigation context only on COA routes or when the COA sidebar section is open.
 * Keeps banking/reports navigation from downloading or running COA logic.
 */
export function CoaNavigationProviderLazy({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeAccountsSection } = useAccountsAccordion();
  const needsFullCoa = routeNeedsCoaData(pathname);
  const needsTreeCoa = activeAccountsSection === "coa";

  if (!needsFullCoa && !needsTreeCoa) return <>{children}</>;

  return (
    <CoaNavigationProvider initMode={needsFullCoa ? "full" : "tree-only"}>
      {children}
    </CoaNavigationProvider>
  );
}
